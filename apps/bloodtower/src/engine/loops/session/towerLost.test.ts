import { afterEach, describe, expect, it, vi } from "vitest";
import { OPENING_MOMENTS, openingPromptId } from "../../../protocols/opening.ts";
import type { PressEvent } from "../../events.ts";
import { project } from "../../views/project.ts";
import { enterConnectEvents, enterWithoutEvents } from "./enterKit.ts";
import { TEST_STORY } from "./pack.ts";
import { initialShellState, type ShellState } from "./state.ts";
import { stepShell } from "./stepShell.ts";
import { TOWER_DISCONNECTED } from "./tower.ts";
import { projectShellView } from "./view.ts";

afterEach(() => vi.restoreAllMocks());

type Event = Parameters<typeof stepShell>[1];

const press = (promptId: string, actionId: string, deviceId = "ipad-0"): PressEvent => ({
  kind: "press",
  v: 1,
  deviceId,
  promptId,
  actionId,
});

const step = (state: ShellState, ...events: Event[]) => {
  let cursor = state;
  for (const event of events) cursor = stepShell(cursor, event).state;
  return cursor;
};

const start = (seed: string) =>
  stepShell(initialShellState({ sessionId: "s", seed, stories: [TEST_STORY] }), {
    kind: "start-session",
    v: 1,
    seed,
    sessionId: "sess-1",
  }).state;

const claimAll = (state: ShellState) => {
  let cursor = state;
  for (const [index, hero] of TEST_STORY.heroes.slice(0, 4).entries()) {
    const deviceId = `ipad-${index}`;
    cursor = step(
      cursor,
      { kind: "device-join", v: 1, deviceId },
      { kind: "hero-hold", v: 1, deviceId, heroId: hero.id, action: "take" },
    );
  }
  return cursor;
};

/** Pick story to Claim heroes done, ready for the first setup step. */
const toSetup = (seed: string, track: "connect" | "without") => {
  let state = start(seed);
  state = step(state, ...(track === "connect" ? enterConnectEvents() : enterWithoutEvents()));
  state = step(
    state,
    press("continue-pick-story-test", "continue"),
    press("continue-game-settings", "continue"),
  );
  state = claimAll(state);
  return step(state, press("continue-claim-heroes", "continue"));
};

const toPlay = (seed: string, track: "connect" | "without") => {
  let state = toSetup(seed, track);
  for (const setup of state.setupSteps) {
    state = step(state, press(`continue-setup-${setup.id}`, "continue"));
  }
  state = step(state, press("continue-begin", "continue"));
  for (const momentId of OPENING_MOMENTS) {
    state = step(state, press(openingPromptId(momentId), "continue"));
  }
  return state;
};

const open = (state: ShellState) => state.offered.filter((offer) => offer.open);
const labels = (state: ShellState) =>
  projectShellView(state)
    .actions.filter((action) => action.open)
    .map((action) => action.label);

/** Plays by the first sensible press and notes where each simulated skull landed. */
const landings = (seed: string, drops: number): string[] => {
  let state = toPlay(seed, "without");
  const landed: string[] = [];
  for (let guard = 0; guard < 2000 && landed.length < drops; guard += 1) {
    const pick = ["continue", "record", "done", "leave", "end-turn"]
      .map((actionId) => open(state).find((offer) => offer.actionId === actionId))
      .find((offer) => offer !== undefined);
    if (!pick) break;
    if (pick.promptId.startsWith("skull-sim-day-")) {
      const spot = state.play?.lastSkull?.spaceId;
      if (spot) landed.push(spot);
    }
    state = step(state, press(pick.promptId, pick.actionId));
  }
  return landed;
};

describe("C2/08 the simulated skull drop (DEC-305)", () => {
  it("EV-04 simulated skull drop is seeded", () => {
    // A drop that reached for ambient randomness would throw here (the engine check bans the
    // literal name in engine files, so the global is reached through globalThis).
    vi.spyOn(globalThis.Math, "random").mockImplementation(() => {
      throw new Error("Ambient randomness is not the seeded stream.");
    });
    const a = landings("seed-a", 20);
    const again = landings("seed-a", 20);
    const other = landings("seed-b", 20);
    expect(a.length).toBeGreaterThanOrEqual(10);
    expect(again).toEqual(a);
    expect(other.length).toBeGreaterThanOrEqual(10);
    // The game ends before day 20, so compare every day both seeds reached.
    const days = Math.min(a.length, other.length);
    expect(a.slice(0, days).some((spot, day) => spot !== other[day])).toBe(true);
  });

  it("EV-05 a game without the tower never pauses, asks nothing and sends no command", () => {
    let state = toPlay("seed-c", "without");
    const commands: string[] = [];
    let skullDays = 0;
    for (let guard = 0; guard < 2000 && skullDays < 2; guard += 1) {
      const pick = ["continue", "record", "done", "leave", "end-turn"]
        .map((actionId) => open(state).find((offer) => offer.actionId === actionId))
        .find((offer) => offer !== undefined);
      if (!pick) break;
      expect(pick.actionId).not.toBe("record");
      if (pick.promptId.startsWith("skull-sim-day-")) {
        skullDays += 1;
        const view = projectShellView(state);
        expect(view.table?.waitingFor).toMatch(/^A skull falls on /);
      }
      const result = stepShell(state, press(pick.promptId, pick.actionId));
      for (const effect of result.effects) {
        if (effect.kind === "tower-command") commands.push(effect.capabilityId);
      }
      state = result.state;
      expect(state.pause).toBeNull();
    }
    expect(skullDays).toBe(2);
    expect(commands).toEqual([]);
  });
});

describe("C2/08 the pause (DEC-301, DEC-711)", () => {
  it("EV-02 a drop during piece setup pauses, and Reconnect returns to the same step", () => {
    let state = toSetup("seed-d", "connect");
    expect(state.screen).toBe("setup");
    const stepBefore = state.setupAt;
    state = step(state, { kind: "tower-snapshot", v: 1, tower: TOWER_DISCONNECTED });
    expect(state.screen).toBe("pause");
    expect(state.pause?.cause).toBe("tower-lost");
    expect(labels(state)).toEqual(["Reconnect", "Go on without", "Quit"]);
    const reconnect = open(state).find((offer) => offer.actionId === "reconnect");
    state = step(
      state,
      press(reconnect?.promptId ?? "", "reconnect"),
      { kind: "tower-result", v: 1, capabilityId: "tower.connect", ok: true },
      press("tower-calibrate", "tower-calibrate"),
      { kind: "tower-result", v: 1, capabilityId: "tower.calibrate", ok: true },
    );
    expect(state.screen).toBe("setup");
    expect(state.setupAt).toBe(stepBefore);
    expect(state.stage).toBe("lobby");
    expect(labels(state)).toContain("Done");
  });

  it("EV-13 the pause names the lost tower and the reconnect shows no button", () => {
    let state = toPlay("seed-e", "connect");
    state = step(state, { kind: "tower-snapshot", v: 1, tower: TOWER_DISCONNECTED });
    const view = projectShellView(state);
    expect(view.levels.at(-1)?.shows).toBe("Tower lost");
    const board = project(view, { kind: "board" });
    expect(board.screen).toBe("pause");
    const reconnect = open(state).find((offer) => offer.actionId === "reconnect");
    state = step(state, press(reconnect?.promptId ?? "", "reconnect"));
    const during = projectShellView(state);
    expect(during.screen).toBe("tower-wake");
    expect(during.levels.at(-1)?.shows).toBe("Calling the tower back...");
    expect(during.actions.filter((action) => action.open)).toEqual([]);
  });

  it("EV-08 Quit from the pause lands on the session screen with Tower lost", () => {
    let state = toPlay("seed-f", "connect");
    state = step(state, { kind: "tower-snapshot", v: 1, tower: TOWER_DISCONNECTED });
    const quit = open(state).find((offer) => offer.actionId === "quit-story");
    state = step(state, press(quit?.promptId ?? "", "quit-story"));
    expect(state.screen).toBe("session");
    expect(state.autosave).not.toBeNull();
    const view = projectShellView(state);
    expect(view.levels.at(-1)?.shows).toBe("Tower lost");
  });

  it("EV-08 after Go on without a quit reads without the tower", () => {
    let state = toPlay("seed-g", "connect");
    state = step(state, { kind: "tower-snapshot", v: 1, tower: TOWER_DISCONNECTED });
    const without = open(state).find((offer) => offer.actionId === "go-on-without");
    state = step(state, press(without?.promptId ?? "", "go-on-without"));
    state = step(state, press("menu-quit", "quit-story"));
    expect(projectShellView(state).levels.at(-1)?.shows).toBe("without the tower");
  });
});

describe("C2/08 review round 1", () => {
  it("a stale play press during the tower-lost pause is rejected and play resumes at the same node", () => {
    let state = toPlay("seed-p", "connect");
    const stale = open(state).find((offer) => !offer.promptId.startsWith("pause-"));
    expect(stale).toBeDefined();
    const before = open(state).map((offer) => offer.actionId);
    state = step(state, { kind: "tower-snapshot", v: 1, tower: TOWER_DISCONNECTED });
    expect(state.pause?.cause).toBe("tower-lost");
    expect(state.loops.prompt).toBeNull();
    const playBefore = JSON.stringify(state.play);
    const stackBefore = JSON.stringify(state.loops.stack);
    const result = stepShell(state, press(stale?.promptId ?? "", stale?.actionId ?? ""));
    expect(result.effects.filter((effect) => effect.kind !== "view-refresh")).toEqual([]);
    expect(JSON.stringify(result.state.play)).toBe(playBefore);
    expect(JSON.stringify(result.state.loops.stack)).toBe(stackBefore);
    expect(result.state.pause?.cause).toBe("tower-lost");
    const without = open(result.state).find((offer) => offer.actionId === "go-on-without");
    const resumed = step(result.state, press(without?.promptId ?? "", "go-on-without"));
    expect(resumed.screen).toBe("play");
    expect(open(resumed).map((offer) => offer.actionId)).toEqual(expect.arrayContaining(before));
  });

  it("the Tower panel's Play without is refused before the Enter", () => {
    const state = start("seed-g");
    const result = stepShell(state, {
      kind: "gear",
      v: 1,
      deviceId: "ipad-0",
      action: "done",
      item: "tower",
      pick: "Play without",
    });
    expect(result.state.towerWithout).toBe(false);
    expect(result.effects).toContainEqual(
      expect.objectContaining({ kind: "press-error", code: "invalid-state" }),
    );
  });
});

describe("C2/08 the Menu's Tower item (DEC-229, UI-033)", () => {
  const goneWithout = () => {
    let state = toPlay("seed-h", "connect");
    state = step(state, { kind: "tower-snapshot", v: 1, tower: TOWER_DISCONNECTED });
    const without = open(state).find((offer) => offer.actionId === "go-on-without");
    return step(state, press(without?.promptId ?? "", "go-on-without"));
  };

  it("EV-07 the Tower panel offers Reconnect and Play without, then reconnects on Yes", () => {
    let state = goneWithout();
    const gear = projectShellView(state).gear;
    expect(gear?.towerConnected).toBe(false);
    state = step(state, { kind: "gear", v: 1, deviceId: "ipad-0", action: "open", item: "tower" });
    expect(projectShellView(state).gear?.panel).toBe("tower");
    state = step(state, {
      kind: "gear",
      v: 1,
      deviceId: "ipad-0",
      action: "pick",
      pick: "Reconnect",
    });
    expect(projectShellView(state).gear?.picked).toBe("Reconnect");
    const done = stepShell(state, {
      kind: "gear",
      v: 1,
      deviceId: "ipad-0",
      action: "done",
      item: "tower",
      pick: "Reconnect",
    });
    expect(done.effects).toContainEqual({
      kind: "tower-command",
      v: 1,
      capabilityId: "tower.connect",
      params: {},
    });
    state = done.state;
    expect(state.screen).toBe("tower-wake");
    state = step(
      state,
      { kind: "tower-result", v: 1, capabilityId: "tower.connect", ok: true },
      press("tower-calibrate", "tower-calibrate"),
      { kind: "tower-result", v: 1, capabilityId: "tower.calibrate", ok: true },
    );
    expect(state.screen).toBe("play");
    expect(state.towerWithout).toBe(false);
    expect(state.towerLinked).toBe(true);
    expect(state.towerChoice).toBe("connect");
  });

  it("EV-07 a failed menu Reconnect leaves the game playing without the tower", () => {
    let state = goneWithout();
    state = step(
      state,
      { kind: "gear", v: 1, deviceId: "ipad-0", action: "open", item: "tower" },
      { kind: "gear", v: 1, deviceId: "ipad-0", action: "done", item: "tower", pick: "Reconnect" },
      { kind: "tower-result", v: 1, capabilityId: "tower.connect", ok: false },
    );
    expect(state.screen).toBe("play");
    expect(state.pause).toBeNull();
    expect(state.towerLinked).toBe(false);
    expect(state.towerWithout).toBe(true);
  });
});
