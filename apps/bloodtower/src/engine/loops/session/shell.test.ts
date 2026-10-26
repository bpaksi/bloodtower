import { describe, expect, it } from "vitest";
import { OPENING_MOMENTS, openingPromptId } from "../../../protocols/opening.ts";
import type { PressEvent } from "../../events.ts";
import { project } from "../../views/project.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import { mergeSetupSteps, type ShellStory, TEST_STORY } from "./pack.ts";
import { PLACE_CAPTION } from "./placeCaption.ts";
import { initialShellState } from "./state.ts";
import { refreshOffersAfterRestore, stepShell } from "./stepShell.ts";
import { TOWER_DISCONNECTED, TOWER_READY } from "./tower.ts";
import { projectShellView } from "./view.ts";

const press = (deviceId: string, promptId: string, actionId: string): PressEvent => ({
  kind: "press",
  v: 1,
  deviceId,
  promptId,
  actionId,
});

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
    expect(state.openingIndex).toBe(0);
    expect(state.offered.some((offer) => offer.actionId === "walk")).toBe(false);
    expect(projectShellView(state).narration?.lineId).toBe("grey-stair.01");
    for (const momentId of OPENING_MOMENTS) {
      expect(state.offered.some((offer) => offer.promptId === openingPromptId(momentId))).toBe(
        true,
      );
      expect(state.offered.some((offer) => offer.actionId === "walk")).toBe(false);
      state = runPresses(state, [press("ipad-0", openingPromptId(momentId), "continue")]);
    }
    expect(state.openingIndex).toBe(OPENING_MOMENTS.length);
    expect(state.offered.some((offer) => offer.promptId.includes("roll-done"))).toBe(true);
    expect(state.offered.some((offer) => offer.actionId === "walk")).toBe(false);
    expect(state.play?.groups.every((group) => group.heroIds.length === 1)).toBe(true);
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

/** `momentCount` is how many opening Continues to press. `0` sits on grey-stair.01. */
const throughOpening = (momentCount: number) => {
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
  state = runPresses(state, [press("ipad-0", "continue-begin", "continue")]);
  for (let index = 0; index < momentCount; index += 1) {
    const momentId = OPENING_MOMENTS[index];
    if (!momentId) break;
    state = runPresses(state, [press("ipad-0", openingPromptId(momentId), "continue")]);
  }
  return state;
};

const playWithoutTower = () => throughOpening(OPENING_MOMENTS.length);

const reachPlay = (linked: boolean) => {
  if (!linked) return playWithoutTower();
  let state = start();
  const storyId = state.focusStoryId;
  state = runPresses(state, [
    press("ipad-0", "tower-connect", "tower-connect"),
    press("ipad-0", "tower-calibrate", "tower-calibrate"),
    press("ipad-0", "new-pick-game", "new-game"),
    press("ipad-0", `continue-pick-story-${storyId}`, "continue"),
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
  for (const momentId of OPENING_MOMENTS) {
    state = runPresses(state, [press("ipad-0", openingPromptId(momentId), "continue")]);
  }
  return state;
};

describe("W8 quit, goodbye, and new game", () => {
  it("menu quit keeps the autosave, records quit once, and offers only New game and Done for tonight", () => {
    const playing = reachPlay(false);
    const autosave = playing.autosave;
    const quit = stepShell(playing, press("ipad-0", "menu-quit", "quit-story"));
    expect(quit.state.screen).toBe("session");
    expect(quit.state.autosave).toEqual(autosave);
    expect(quit.effects.filter((effect) => effect.kind === "game-record")).toEqual([
      { kind: "game-record", v: 1, gameId: playing.activeGameId, outcome: "quit" },
    ]);
    expect(quit.effects.filter((effect) => effect.kind === "tower-command")).toHaveLength(0);
    const open = quit.state.offered.filter((offer) => offer.open);
    expect(open.map((offer) => offer.actionId)).toEqual(["new-game", "done-for-tonight"]);
    const view = projectShellView(quit.state);
    expect(view.actions.filter((action) => action.open).map((action) => action.label)).toEqual([
      "New game",
      "Done for tonight",
    ]);
    expect(view.actions.some((action) => action.label === "Play again")).toBe(false);
    expect(view.actions.some((action) => action.label === "Quit game")).toBe(false);
  });

  it("idles a connected tower once on Done for tonight and not on a second press", () => {
    const playing = reachPlay(true);
    expect(playing.towerLinked).toBe(true);
    expect(playing.tower.connection).toBe("connected");
    const quit = stepShell(playing, press("ipad-0", "menu-quit", "quit-story"));
    const done = stepShell(quit.state, press("ipad-0", "session-done-tonight", "done-for-tonight"));
    expect(done.state.screen).toBe("goodbye");
    expect(done.state.sessionEnded).toBe(true);
    expect(done.effects.filter((effect) => effect.kind === "tower-command")).toEqual([
      { kind: "tower-command", v: 1, capabilityId: "lighting.all-off", params: {} },
    ]);
    const again = stepShell(
      done.state,
      press("ipad-0", "session-done-tonight", "done-for-tonight"),
    );
    expect(again.effects.filter((effect) => effect.kind === "tower-command")).toHaveLength(0);
    expect(again.state.screen).toBe("goodbye");
  });

  it("sends no idle when the tower was never connected and shows no tower", () => {
    const quit = stepShell(reachPlay(false), press("ipad-0", "menu-quit", "quit-story"));
    const done = stepShell(quit.state, press("ipad-0", "session-done-tonight", "done-for-tonight"));
    expect(done.effects.filter((effect) => effect.kind === "tower-command")).toHaveLength(0);
    expect(done.state.goodbyeTower).toBe("no-tower");
    expect(done.state.pause).toBeNull();
    const shows = projectShellView(done.state).levels.find((level) => level.id === "goodbye");
    expect(shows?.shows).toBe("no tower");
    expect(projectShellView(done.state).actions.filter((action) => action.open)).toEqual([]);
  });

  it("quit on grey-stair.01 still shows no tower, not the opening line", () => {
    const playing = throughOpening(0);
    expect(playing.screen).toBe("play");
    expect(playing.openingIndex).toBe(0);
    expect(projectShellView(playing).narration?.lineId).toBe("grey-stair.01");
    const quit = stepShell(playing, press("ipad-0", "menu-quit", "quit-story"));
    expect(quit.state.screen).toBe("session");
    expect(quit.state.openingIndex).toBe(0);
    expect(projectShellView(quit.state).narration).toBeNull();
    expect(projectShellView(quit.state).levels.find((level) => level.id === "session")?.shows).toBe(
      "The session",
    );
    const done = stepShell(quit.state, press("ipad-0", "session-done-tonight", "done-for-tonight"));
    expect(done.effects.filter((effect) => effect.kind === "tower-command")).toHaveLength(0);
    expect(done.state.screen).toBe("goodbye");
    expect(done.state.goodbyeTower).toBe("no-tower");
    expect(done.state.openingIndex).toBe(0);
    const view = projectShellView(done.state);
    expect(view.narration).toBeNull();
    expect(view.levels.find((level) => level.id === "goodbye")?.shows).toBe("no tower");
  });

  it("sends no idle when the link has dropped and shows unavailable", () => {
    let playing = reachPlay(true);
    playing = stepShell(playing, {
      kind: "tower-snapshot",
      v: 1,
      tower: TOWER_DISCONNECTED,
    }).state;
    expect(playing.screen).toBe("pause");
    const quit = stepShell(
      playing,
      press("ipad-0", `pause-${playing.pauseSerial}-quit`, "quit-story"),
    );
    const done = stepShell(quit.state, press("ipad-0", "session-done-tonight", "done-for-tonight"));
    expect(done.effects.filter((effect) => effect.kind === "tower-command")).toHaveLength(0);
    expect(done.state.goodbyeTower).toBe("unavailable");
    expect(done.state.screen).toBe("goodbye");
    expect(done.state.pause).toBeNull();
  });

  it("new game clears the autosave, opens pick-story, and sends no idle", () => {
    const quit = stepShell(reachPlay(true), press("ipad-0", "menu-quit", "quit-story"));
    expect(quit.state.autosave).not.toBeNull();
    const started = stepShell(quit.state, press("ipad-0", "session-new-game", "new-game"));
    expect(started.state.screen).toBe("pick-story");
    expect(started.state.autosave).toBeNull();
    expect(started.effects.some((effect) => effect.kind === "autosave-clear")).toBe(true);
    expect(started.effects.filter((effect) => effect.kind === "tower-command")).toHaveLength(0);
  });
});

const movesLeft = (state: ReturnType<typeof start>): number | null => {
  const frame = state.loops.stack.find((row) => row.loopId === "group-turn");
  if (!frame) return null;
  return (frame.local as GroupTurnLocal).movesLeft;
};

describe("opening restore", () => {
  it("re-offers the current opening continue and does not offer a walk", () => {
    const state = throughOpening(1);
    expect(state.openingIndex).toBe(1);
    expect(projectShellView(state).narration?.lineId).toBe("grey-stair.02");
    refreshOffersAfterRestore(state);
    expect(
      state.offered.some(
        (offer) => offer.promptId === openingPromptId("grey-stair.02") && offer.open,
      ),
    ).toBe(true);
    expect(state.offered.some((offer) => offer.actionId === "walk")).toBe(false);
    expect(projectShellView(state).narration?.lineId).toBe("grey-stair.02");
    expect(state.play).toBeNull();
  });
});

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

  it("drops the waiting line when the move choice closes and nobody is choosing", () => {
    let state = playWithoutTower();
    const roll = state.offered.find((offer) => offer.promptId.includes("roll-done"));
    expect(roll?.open).toBe(true);
    state = stepShell(state, press("ipad-0", roll?.promptId ?? "", "continue")).state;
    expect(projectShellView(state).table?.waitingFor).toMatch(/is choosing/);
    const quiet = {
      ...state,
      loops: {
        ...state.loops,
        stack: state.loops.stack.map((frame) => {
          if (frame.loopId !== "group-turn") return frame;
          const local = frame.local as GroupTurnLocal;
          return { ...frame, local: { ...local, awaitingPress: false } };
        }),
      },
    };
    const view = projectShellView(quiet);
    expect(view.screen).toBe("play");
    expect(view.table?.waitingFor).toBeNull();
    expect(view.table?.chapter).toBe(TEST_STORY.card.title);
    expect(view.table?.actingGroup).toBeTruthy();
    expect(view.place).toBeNull();
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

describe("metadata-only Pick Story door", () => {
  const count: ShellStory = {
    card: {
      id: "dracula",
      title: "The Count of Vellmoor",
      tagline: "The Count has taken Lenka. Bring her home before she's his.",
      playable: false,
      players: null,
      cover: "/packs/dracula/assets/cover.png",
    },
    settings: [],
    setup: [],
    heroes: [],
  };

  const open = () => {
    const state = stepShell(
      initialShellState({ sessionId: "s", seed: "seed", stories: [count, TEST_STORY] }),
      { kind: "start-session", v: 1, seed: "seed", sessionId: "sess-1" },
    ).state;
    return stepShell(state, press("ipad-0", "splash-play", "continue")).state;
  };

  it("keeps Proving Grounds bound and stops Choose on not-playable", () => {
    let state = open();
    expect(state.screen).toBe("pick-story");
    expect(state.focusStoryId).toBe("test");
    expect(state.boundStoryId).toBe("test");
    expect(state.chosenStoryId).toBeNull();
    expect(state.holdings).toEqual({
      "hero-a": null,
      "hero-b": null,
      "hero-c": null,
      "hero-d": null,
      "hero-e": null,
      "hero-f": null,
    });
    expect(
      state.offered.some((offer) => offer.promptId === "continue-pick-story-test" && offer.open),
    ).toBe(true);

    const focused = stepShell(state, {
      kind: "focus-story",
      v: 1,
      deviceId: "ipad-0",
      storyId: "dracula",
    });
    expect(focused.effects.some((effect) => effect.kind === "tower-command")).toBe(false);
    state = focused.state;
    expect(state.screen).toBe("pick-story");
    expect(state.focusStoryId).toBe("dracula");
    expect(state.boundStoryId).toBe("test");
    expect(
      state.offered.some((offer) => offer.promptId === "continue-pick-story-dracula" && offer.open),
    ).toBe(true);

    const view = projectShellView(state);
    const device = project(view, { kind: "device", deviceId: "ipad-0" });
    expect(device.doors).toEqual([
      { id: "dracula", title: "The Count of Vellmoor", focus: true },
      { id: "test", title: "Proving Grounds", focus: false },
    ]);
    const choose = device.actions.find((action) => action.actionId === "continue");
    expect(choose?.label).toBe("Choose The Count of Vellmoor");
    const door = view.levels.find((level) => level.id === "door-dracula");
    expect(door?.shows.split("\n")[2]).toBe("");
    expect(door?.shows).toContain("/packs/dracula/assets/cover.png");

    const chosen = stepShell(state, press("ipad-0", "continue-pick-story-dracula", "continue"));
    expect(
      chosen.effects.some(
        (effect) => effect.kind === "tower-command" || effect.kind === "autosave-write",
      ),
    ).toBe(false);
    state = chosen.state;
    expect(state.screen).toBe("not-playable");
    expect(state.boundStoryId).toBe("test");
    expect(state.chosenStoryId).toBeNull();
    expect(state.focusStoryId).toBe("dracula");
    expect(state.offered.filter((offer) => offer.open).map((offer) => offer.promptId)).toEqual([
      "back-not-playable",
    ]);
    expect(projectShellView(state).levels.at(-1)?.shows).toBe("The Count of Vellmoor");

    state = stepShell(state, press("ipad-0", "back-not-playable", "back")).state;
    expect(state.screen).toBe("pick-story");
    expect(state.focusStoryId).toBe("dracula");
    expect(state.boundStoryId).toBe("test");

    state = stepShell(state, {
      kind: "focus-story",
      v: 1,
      deviceId: "ipad-0",
      storyId: "test",
    }).state;
    state = stepShell(state, press("ipad-0", "continue-pick-story-test", "continue")).state;
    expect(state.screen).toBe("game-settings");
    expect(state.chosenStoryId).toBe("test");
    expect(state.boundStoryId).toBe("test");
  });

  it("does not move focus for an unknown story", () => {
    const state = open();
    const next = stepShell(state, {
      kind: "focus-story",
      v: 1,
      deviceId: "ipad-0",
      storyId: "missing",
    }).state;
    expect(next.focusStoryId).toBe("test");
    expect(
      next.offered.some((offer) => offer.promptId === "continue-pick-story-test" && offer.open),
    ).toBe(true);
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
