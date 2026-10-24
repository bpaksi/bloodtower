import { describe, expect, it } from "vitest";
import type { PressEvent } from "../../events.ts";
import { ENGINE_SETUP_STEPS, mergeSetupSteps, TEST_STORY } from "./pack.ts";
import { initialShellState } from "./state.ts";
import { stepShell } from "./stepShell.ts";

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
    expect(state.screen).toBe("tower-connect");
    state = stepShell(state, press("ipad-0", "tower-connect", "tower-connect")).state;
    expect(state.tower.connection).toBe("connected");
    state = stepShell(state, press("ipad-0", "tower-calibrate", "tower-calibrate")).state;
    expect(state.towerSetupDone).toBe(true);
    expect(state.screen).toBe("pick-game");
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
