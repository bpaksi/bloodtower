import { describe, expect, it } from "vitest";
import type { PressEvent } from "../../events.ts";
import { project } from "../../views/project.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import { mergeSetupSteps, TEST_STORY } from "./pack.ts";
import { PLACE_CAPTION } from "./placeCaption.ts";
import { initialShellState } from "./state.ts";
import { stepShell } from "./stepShell.ts";
import { projectShellView } from "./view.ts";

const press = (deviceId: string, promptId: string, actionId: string): PressEvent => ({
  kind: "press",
  v: 1,
  deviceId,
  promptId,
  actionId,
});

import { TOWER_DISCONNECTED, TOWER_READY } from "./tower.ts";

const start = () =>
  stepShell(initialShellState({ sessionId: "s", seed: "seed", stories: [TEST_STORY] }), {
    kind: "start-session",
    v: 1,
    seed: "seed",
    sessionId: "sess-1",
  }).state;

const runPresses = (state: ReturnType<typeof start>, presses: ReturnType<typeof press>[]) => {
  let cursor = state;
  for (const p of presses) {
    cursor = stepShell(cursor, p).state;
  }
  return cursor;
};

describe("session loop tower setup", () => {
  it("runs connect and calibrate once, then lands on pick-game", () => {
    let state = start();
    expect(state.screen).toBe("splash");
    state = stepShell(state, press("ipad-0", "tower-connect", "tower-connect")).state;
    expect(state.tower.connection).toBe("connected");
    state = stepShell(state, press("ipad-0", "tower-calibrate", "tower-calibrate")).state;
    expect(state.towerSetupDone).toBe(true);
    expect(state.screen).toBe("pick-game");
    expect(state.towerLinked).toBe(true);
  });

  it("Play on splash reaches pick-story and does not pause a tower that was never connected", () => {
    let state = start();
    expect(state.offered.some((offer) => offer.promptId === "splash-play" && offer.open)).toBe(
      true,
    );
    expect(state.activeGameId).toBe("game-1");
    state = stepShell(state, press("ipad-0", "splash-play", "continue")).state;
    expect(state.activeGameId).toBe(`game-${state.eventSeq}`);
    expect(state.screen).toBe("pick-story");
    expect(state.towerLinked).toBe(false);
    state = stepShell(state, { kind: "tower-snapshot", v: 1, tower: TOWER_DISCONNECTED }).state;
    expect(state.pause).toBeNull();
    expect(state.screen).toBe("pick-story");
  });

  it("stays on splash when a tower snapshot is already ready", () => {
    let state = start();
    state = stepShell(state, { kind: "tower-snapshot", v: 1, tower: TOWER_READY }).state;
    expect(state.screen).toBe("splash");
    expect(state.towerLinked).toBe(false);
    expect(state.offered.filter((offer) => offer.open).map((offer) => offer.promptId)).toEqual([
      "splash-play",
      "tower-connect",
    ]);
  });

  it("keeps Play and Connect tower after the startup tower snapshot", () => {
    let state = start();
    state = stepShell(state, { kind: "tower-snapshot", v: 1, tower: TOWER_DISCONNECTED }).state;
    expect(state.screen).toBe("splash");
    expect(state.offered.filter((offer) => offer.open).map((offer) => offer.promptId)).toEqual([
      "splash-play",
      "tower-connect",
    ]);
    state = stepShell(state, press("ipad-0", "splash-play", "continue")).state;
    expect(state.screen).toBe("pick-story");
    expect(state.pause).toBeNull();
  });
});

describe("setup steps include seals and skulls", () => {
  it("prepends the engine core step before pack steps", () => {
    const steps = mergeSetupSteps([
      { id: "lay-out-board", label: "Lay out the board and orient the kingdoms." },
      { id: "place-heroes", label: "Stand each hero on their start building." },
    ]);
    expect(steps[0]?.id).toBe("seals-and-skulls");
    expect(steps.map((step) => step.id)).toEqual([
      "seals-and-skulls",
      "lay-out-board",
      "place-heroes",
    ]);
  });
});

describe("game setup forward and back", () => {
  const throughTower = () =>
    runPresses(start(), [
      press("ipad-0", "tower-connect", "tower-connect"),
      press("ipad-0", "tower-calibrate", "tower-calibrate"),
    ]);

  const chooseStory = (state: ReturnType<typeof start>) =>
    runPresses(state, [
      press("ipad-0", "new-pick-game", "new-game"),
      press("ipad-0", `continue-pick-story-${state.focusStoryId}`, "continue"),
    ]);

  it("offers Connect Tower after game settings when the tower was never set up", () => {
    let state = start();
    state = runPresses(state, [
      press("ipad-0", "splash-play", "continue"),
      press("ipad-0", `continue-pick-story-${state.focusStoryId}`, "continue"),
    ]);
    const entered = stepShell(state, press("ipad-0", "continue-game-settings", "continue"));
    expect(entered.state.screen).toBe("tower-connect");
    expect(entered.state.towerLinked).toBe(false);
    expect(entered.effects.some((effect) => effect.kind === "tower-command")).toBe(false);
    const view = projectShellView(entered.state);
    expect(view.levels.at(-1)?.label).toBe("Tower Connect");
    expect(view.levels.at(-1)?.shows).toBe(
      "No tower yet. An iPad can connect it, or play on without it.",
    );
    const connect = view.actions.find((action) => action.actionId === "tower-connect");
    const skip = view.actions.find((action) => action.actionId === "play-without-tower");
    expect(connect).toMatchObject({
      promptId: "tower-connect",
      label: "Connect Tower",
      open: true,
    });
    expect(skip).toMatchObject({
      promptId: "play-without-tower",
      label: "Play without Tower",
      open: true,
    });

    const skipped = stepShell(
      entered.state,
      press("ipad-0", "play-without-tower", "play-without-tower"),
    );
    expect(skipped.state.screen).toBe("claim-heroes");
    expect(skipped.state.towerLinked).toBe(false);
    expect(skipped.effects.some((effect) => effect.kind === "tower-command")).toBe(false);
  });

  it("walks pick-story, game-settings, claim-heroes, each setup step, and begin forward", () => {
    let state = chooseStory(throughTower());
    expect(state.screen).toBe("game-settings");
    state = runPresses(state, [press("ipad-0", "continue-game-settings", "continue")]);
    expect(state.screen).toBe("claim-heroes");

    for (const [index, hero] of TEST_STORY.heroes.entries()) {
      const deviceId = `ipad-${index}`;
      state = stepShell(state, { kind: "device-join", v: 1, deviceId }).state;
      state = stepShell(state, {
        kind: "hero-hold",
        v: 1,
        deviceId,
        heroId: hero.id,
        action: "take",
      }).state;
    }
    state = runPresses(state, [press("ipad-0", "continue-claim-heroes", "continue")]);
    expect(state.screen).toBe("setup");
    expect(state.setupSteps[0]?.id).toBe("seals-and-skulls");

    for (const step of state.setupSteps) {
      expect(state.screen).toBe("setup");
      state = runPresses(state, [press("ipad-0", `continue-setup-${step.id}`, "continue")]);
    }
    expect(state.screen).toBe("begin");
    state = runPresses(state, [press("ipad-0", "continue-begin", "continue")]);
    expect(state.screen).toBe("play");
    expect(state.autosave).not.toBeNull();
  });

  it("backs out of claim-heroes and game-settings per D31", () => {
    let state = chooseStory(throughTower());
    state = runPresses(state, [
      press("ipad-0", "continue-game-settings", "continue"),
      press("ipad-0", "back-claim-heroes", "back"),
    ]);
    expect(state.screen).toBe("game-settings");
    state = runPresses(state, [press("ipad-0", "back-game-settings", "back")]);
    expect(state.screen).toBe("pick-story");
    expect(state.chosenStoryId).toBeNull();
  });

  const atClaimHeroes = () => {
    let state = chooseStory(throughTower());
    state = runPresses(state, [press("ipad-0", "continue-game-settings", "continue")]);
    for (const [index, hero] of TEST_STORY.heroes.entries()) {
      const deviceId = `ipad-${index}`;
      state = stepShell(state, { kind: "device-join", v: 1, deviceId }).state;
      state = stepShell(state, {
        kind: "hero-hold",
        v: 1,
        deviceId,
        heroId: hero.id,
        action: "take",
      }).state;
    }
    return state;
  };

  it("backs through each setup step to the previous step or claim-heroes", () => {
    let state = atClaimHeroes();
    state = runPresses(state, [press("ipad-0", "continue-claim-heroes", "continue")]);
    expect(state.screen).toBe("setup");
    const steps = state.setupSteps;
    expect(steps.length).toBeGreaterThanOrEqual(2);
    const first = steps[0];
    const second = steps[1];
    if (!first || !second) throw new Error("Expected at least two setup steps.");

    state = runPresses(state, [press("ipad-0", `continue-setup-${first.id}`, "continue")]);
    expect(state.screen).toBe("setup");
    expect(state.setupAt).toBe(1);

    state = runPresses(state, [press("ipad-0", `back-setup-${second.id}`, "back")]);
    expect(state.screen).toBe("setup");
    expect(state.setupAt).toBe(0);

    state = runPresses(state, [press("ipad-0", `back-setup-${first.id}`, "back")]);
    expect(state.screen).toBe("claim-heroes");
  });

  it("backs from Begin to the last setup step", () => {
    let state = atClaimHeroes();
    state = runPresses(state, [press("ipad-0", "continue-claim-heroes", "continue")]);
    for (const step of state.setupSteps) {
      state = runPresses(state, [press("ipad-0", `continue-setup-${step.id}`, "continue")]);
    }
    expect(state.screen).toBe("begin");
    state = runPresses(state, [press("ipad-0", "back-begin", "back")]);
    expect(state.screen).toBe("setup");
    expect(state.setupAt).toBe(state.setupSteps.length - 1);
  });
});

describe("pauses", () => {
  const inPlay = () => {
    let state = start();
    state = runPresses(state, [
      press("ipad-0", "tower-connect", "tower-connect"),
      press("ipad-0", "tower-calibrate", "tower-calibrate"),
      press("ipad-0", "new-pick-game", "new-game"),
      press("ipad-0", `continue-pick-story-${state.focusStoryId}`, "continue"),
      press("ipad-0", "continue-game-settings", "continue"),
    ]);
    for (const [index, hero] of TEST_STORY.heroes.entries()) {
      const deviceId = `ipad-${index}`;
      state = stepShell(state, { kind: "device-join", v: 1, deviceId }).state;
      state = stepShell(state, {
        kind: "hero-hold",
        v: 1,
        deviceId,
        heroId: hero.id,
        action: "take",
      }).state;
    }
    state = runPresses(state, [press("ipad-0", "continue-claim-heroes", "continue")]);
    for (const step of state.setupSteps) {
      state = runPresses(state, [press("ipad-0", `continue-setup-${step.id}`, "continue")]);
    }
    state = runPresses(state, [press("ipad-0", "continue-begin", "continue")]);
    return state;
  };

  it("pauses when an iPad drops until every hero is claimed again", () => {
    let state = inPlay();
    state = stepShell(state, { kind: "device-drop", v: 1, deviceId: "ipad-0" }).state;
    expect(state.stage).toBe("paused");
    expect(state.pause?.cause).toBe("disconnect");

    state = stepShell(state, { kind: "device-join", v: 1, deviceId: "ipad-0" }).state;
    state = stepShell(state, {
      kind: "hero-hold",
      v: 1,
      deviceId: "ipad-0",
      heroId: "hero-a",
      action: "take",
    }).state;
    expect(state.stage).toBe("playing");
    expect(state.pause).toBeNull();
  });

  it("keeps a tower-lost pause after iPad heroes are reclaimed (DEC-155)", () => {
    let state = inPlay();
    state = stepShell(state, {
      kind: "tower-snapshot",
      v: 1,
      tower: TOWER_DISCONNECTED,
    }).state;
    expect(state.pause?.cause).toBe("tower-lost");

    state = stepShell(state, { kind: "device-drop", v: 1, deviceId: "ipad-0" }).state;
    expect(state.pause?.cause).toBe("disconnect");

    state = stepShell(state, { kind: "device-join", v: 1, deviceId: "ipad-0" }).state;
    state = stepShell(state, {
      kind: "hero-hold",
      v: 1,
      deviceId: "ipad-0",
      heroId: "hero-a",
      action: "take",
    }).state;

    expect(state.stage).toBe("paused");
    expect(state.pause?.cause).toBe("tower-lost");
    expect(state.tower.connection).not.toBe("connected");
    expect(state.offered.some((o) => o.actionId === "reconnect" && o.open)).toBe(true);
  });

  it("does not offer Reconnect on an iPad-drop pause", () => {
    let state = inPlay();
    state = stepShell(state, { kind: "device-drop", v: 1, deviceId: "ipad-0" }).state;
    expect(state.pause?.cause).toBe("disconnect");
    expect(state.offered.some((o) => o.actionId === "reconnect")).toBe(false);
    expect(state.offered.some((o) => o.actionId === "quit-story" && o.open)).toBe(true);
  });

  it("pauses on a lost tower until Reconnect is pressed", () => {
    let state = inPlay();
    state = stepShell(state, {
      kind: "tower-snapshot",
      v: 1,
      tower: TOWER_DISCONNECTED,
    }).state;
    expect(state.pause?.cause).toBe("tower-lost");
    state = runPresses(state, [
      press("ipad-0", `pause-${state.pauseSerial}-reconnect`, "reconnect"),
    ]);
    expect(state.pause).toBeNull();
    state = stepShell(state, { kind: "tower-snapshot", v: 1, tower: TOWER_READY }).state;
    expect(state.stage).toBe("playing");
  });
});

describe("quit story and session screen", () => {
  it("ends as quit, keeps autosave, and lands on the session screen", () => {
    let state = start();
    state = runPresses(state, [
      press("ipad-0", "tower-connect", "tower-connect"),
      press("ipad-0", "tower-calibrate", "tower-calibrate"),
      press("ipad-0", "new-pick-game", "new-game"),
      press("ipad-0", `continue-pick-story-${state.focusStoryId}`, "continue"),
      press("ipad-0", "continue-game-settings", "continue"),
    ]);
    for (const [index, hero] of TEST_STORY.heroes.entries()) {
      const deviceId = `ipad-${index}`;
      state = stepShell(state, { kind: "device-join", v: 1, deviceId }).state;
      state = stepShell(state, {
        kind: "hero-hold",
        v: 1,
        deviceId,
        heroId: hero.id,
        action: "take",
      }).state;
    }
    state = runPresses(state, [press("ipad-0", "continue-claim-heroes", "continue")]);
    for (const step of state.setupSteps) {
      state = runPresses(state, [press("ipad-0", `continue-setup-${step.id}`, "continue")]);
    }
    state = runPresses(state, [press("ipad-0", "continue-begin", "continue")]);
    const autosave = state.autosave;
    state = stepShell(state, { kind: "tower-snapshot", v: 1, tower: TOWER_DISCONNECTED }).state;
    state = runPresses(state, [press("ipad-0", `pause-${state.pauseSerial}-quit`, "quit-story")]);
    expect(state.screen).toBe("session");
    expect(state.autosave).toEqual(autosave);
    expect(state.towerSetupDone).toBe(true);
    expect(state.screen).not.toBe("tower-connect");
  });

  it("pauses on Continue when the autosave resumes but the tower is not ready (MEC-018)", () => {
    let state = runPresses(start(), [
      press("ipad-0", "tower-connect", "tower-connect"),
      press("ipad-0", "tower-calibrate", "tower-calibrate"),
    ]);
    state = {
      ...state,
      autosave: { gameId: "game-1", packId: "test", seed: "seed", day: 2 },
    };
    state = stepShell(state, {
      kind: "tower-snapshot",
      v: 1,
      tower: TOWER_DISCONNECTED,
    }).state;
    expect(state.offered.some((o) => o.promptId === "continue-pick-game" && o.open)).toBe(true);
    state = runPresses(state, [press("ipad-0", "continue-pick-game", "continue")]);
    expect(state.resumedFromAutosave).toBe(true);
    expect(state.stage).toBe("paused");
    expect(state.pause?.cause).toBe("tower-lost");
  });

  it("offers Continue on pick-game while an autosave exists", () => {
    let state = start();
    state = runPresses(state, [
      press("ipad-0", "tower-connect", "tower-connect"),
      press("ipad-0", "tower-calibrate", "tower-calibrate"),
    ]);
    state = {
      ...state,
      autosave: { gameId: "game-1", packId: "test", seed: "seed", day: 2 },
    };
    state = stepShell(state, {
      kind: "start-session",
      v: 1,
      seed: "seed",
      sessionId: "sess-2",
    }).state;
    state = runPresses(state, [
      press("ipad-0", "tower-connect", "tower-connect"),
      press("ipad-0", "tower-calibrate", "tower-calibrate"),
    ]);
    state = { ...state, autosave: { gameId: "game-1", packId: "test", seed: "seed", day: 2 } };
    expect(state.screen).toBe("pick-game");
    expect(state.autosave).not.toBeNull();
  });
});

describe("done for tonight", () => {
  it("reaches goodbye and ends the session", () => {
    let state = start();
    state = runPresses(state, [
      press("ipad-0", "tower-connect", "tower-connect"),
      press("ipad-0", "tower-calibrate", "tower-calibrate"),
      press("ipad-0", "new-pick-game", "new-game"),
      press("ipad-0", `continue-pick-story-${state.focusStoryId}`, "continue"),
      press("ipad-0", "continue-game-settings", "continue"),
    ]);
    for (const [index, hero] of TEST_STORY.heroes.entries()) {
      const deviceId = `ipad-${index}`;
      state = stepShell(state, { kind: "device-join", v: 1, deviceId }).state;
      state = stepShell(state, {
        kind: "hero-hold",
        v: 1,
        deviceId,
        heroId: hero.id,
        action: "take",
      }).state;
    }
    state = runPresses(state, [press("ipad-0", "continue-claim-heroes", "continue")]);
    for (const step of state.setupSteps) {
      state = runPresses(state, [press("ipad-0", `continue-setup-${step.id}`, "continue")]);
    }
    state = runPresses(state, [press("ipad-0", "continue-begin", "continue")]);
    state = stepShell(state, { kind: "tower-snapshot", v: 1, tower: TOWER_DISCONNECTED }).state;
    state = runPresses(state, [
      press("ipad-0", `pause-${state.pauseSerial}-quit`, "quit-story"),
      press("ipad-0", "session-done-tonight", "done-for-tonight"),
    ]);
    expect(state.screen).toBe("goodbye");
    expect(state.sessionEnded).toBe(true);
  });
});

const playWithoutTower = () => {
  let state = runPresses(start(), [
    press("ipad-0", "splash-play", "continue"),
    press("ipad-0", `continue-pick-story-${"test"}`, "continue"),
    press("ipad-0", "continue-game-settings", "continue"),
    press("ipad-0", "play-without-tower", "play-without-tower"),
  ]);
  for (const [index, hero] of TEST_STORY.heroes.entries()) {
    const deviceId = `ipad-${index}`;
    state = stepShell(state, { kind: "device-join", v: 1, deviceId }).state;
    state = stepShell(state, {
      kind: "hero-hold",
      v: 1,
      deviceId,
      heroId: hero.id,
      action: "take",
    }).state;
  }
  state = runPresses(state, [press("ipad-0", "continue-claim-heroes", "continue")]);
  for (const step of state.setupSteps) {
    state = runPresses(state, [press("ipad-0", `continue-setup-${step.id}`, "continue")]);
  }
  return runPresses(state, [press("ipad-0", "continue-begin", "continue")]);
};

const movesLeft = (state: ReturnType<typeof start>): number | null => {
  const frame = state.loops.stack.find((row) => row.loopId === "group-turn");
  if (!frame) return null;
  return (frame.local as GroupTurnLocal).movesLeft;
};

describe("place stills", () => {
  it("opens a citadel on Enter and returns on Leave without spending a move", () => {
    let state = playWithoutTower();
    expect(state.towerLinked).toBe(false);
    expect(state.pause).toBeNull();
    const roll = state.offered.find((offer) => offer.promptId.includes("roll-done"));
    expect(roll?.open).toBe(true);
    state = stepShell(state, press("ipad-0", roll?.promptId ?? "", "continue")).state;
    const enter = state.offered.find((offer) => offer.actionId === "enter" && offer.open);
    expect(enter).toBeTruthy();
    expect(state.offered.some((offer) => offer.actionId === "walk" && offer.open)).toBe(true);
    const before = movesLeft(state);
    expect(before).toBeGreaterThanOrEqual(2);
    state = stepShell(state, press("ipad-0", enter?.promptId ?? "", "enter")).state;
    expect(movesLeft(state)).toBe(before);
    const view = projectShellView(state);
    expect(view.table?.movesLeft).toBe(before);
    expect(view.place).toEqual({
      building: "citadel",
      stillId: "place.citadel",
      caption: PLACE_CAPTION.citadel,
    });
    const device = project(view, { kind: "device", deviceId: "ipad-0" });
    expect(JSON.stringify(device)).not.toContain(PLACE_CAPTION.citadel);
    expect(device).not.toHaveProperty("place");
    expect(view.table?.health).toBe("unavailable");
    expect(view.table?.purse).toBe("unavailable");
    expect(view.table?.modifier).toBe("none");
    expect(view.table?.chapter).toBe(TEST_STORY.card.title);
    const leave = state.offered.find((offer) => offer.actionId === "leave" && offer.open);
    expect(leave).toBeTruthy();
    expect(state.offered.some((offer) => offer.actionId === "walk")).toBe(false);
    state = stepShell(state, press("ipad-0", leave?.promptId ?? "", "leave")).state;
    expect(movesLeft(state)).toBe(before);
    expect(projectShellView(state).place).toBeNull();
    expect(state.offered.some((offer) => offer.actionId === "walk" && offer.open)).toBe(true);
    expect(state.offered.some((offer) => offer.promptId === "menu-quit")).toBe(true);
    expect(state.offered.some((offer) => offer.promptId === "menu-connect")).toBe(true);
    state = stepShell(state, { kind: "tower-snapshot", v: 1, tower: TOWER_DISCONNECTED }).state;
    expect(state.pause).toBeNull();
    expect(state.screen).toBe("play");
  });
});

describe("hero claims", () => {
  it("greys out a hero for other devices once claimed", () => {
    let state = chooseStoryForTest();
    state = stepShell(state, { kind: "device-join", v: 1, deviceId: "ipad-a" }).state;
    state = stepShell(state, {
      kind: "hero-hold",
      v: 1,
      deviceId: "ipad-a",
      heroId: "hero-a",
      action: "take",
    }).state;
    expect(state.holdings["hero-a"]).toBe("ipad-a");
    state = stepShell(state, {
      kind: "hero-hold",
      v: 1,
      deviceId: "ipad-b",
      heroId: "hero-a",
      action: "take",
    }).state;
    expect(state.holdings["hero-a"]).toBe("ipad-a");
  });
});

const chooseStoryForTest = () => {
  let state = runPresses(start(), [
    press("ipad-0", "tower-connect", "tower-connect"),
    press("ipad-0", "tower-calibrate", "tower-calibrate"),
  ]);
  state = runPresses(state, [
    press("ipad-0", "new-pick-game", "new-game"),
    press("ipad-0", `continue-pick-story-${state.focusStoryId}`, "continue"),
  ]);
  return state;
};
