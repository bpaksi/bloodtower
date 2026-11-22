import { describe, expect, it } from "vitest";
import { OPENING_MOMENTS, openingPromptId } from "../../../protocols/opening.ts";
import type { PressEvent } from "../../events.ts";
import { project } from "../../views/project.ts";
import { seatOnContinue } from "./continueSeats.ts";
import { enterConnectEvents, enterWithoutEvents } from "./enterKit.ts";
import type { ShellEvent } from "./events.ts";
import { TEST_STORY } from "./pack.ts";
import { initialShellState, type ShellState } from "./state.ts";
import { stepShell } from "./stepShell.ts";
import { TOWER_DISCONNECTED } from "./tower.ts";
import { projectShellView } from "./view.ts";

const press = (deviceId: string, promptId: string, actionId: string): PressEvent => ({
  kind: "press",
  v: 1,
  deviceId,
  promptId,
  actionId,
});

const run = (state: ShellState, events: ShellEvent[]): ShellState => {
  let cursor = state;
  for (const event of events) cursor = stepShell(cursor, event).state;
  return cursor;
};

const joined = (deviceId: string): ShellEvent => ({ kind: "device-join", v: 1, deviceId });
const take = (deviceId: string, heroId: string): ShellEvent => ({
  kind: "hero-hold",
  v: 1,
  deviceId,
  heroId,
  action: "take",
});

/** A started game, party size 2: device-1 holds A, device-2 holds B, play. */
const savedGame = (tower: "without" | "connect" = "without"): ShellState => {
  let state = stepShell(
    initialShellState({ sessionId: "s", seed: "seed", stories: [TEST_STORY] }),
    {
      kind: "start-session",
      v: 1,
      seed: "seed",
      sessionId: "sess-1",
    },
  ).state;
  state = run(state, tower === "without" ? enterWithoutEvents() : enterConnectEvents());
  state = run(state, [
    press("device-1", `continue-pick-story-${state.focusStoryId}`, "continue"),
    {
      kind: "set-setting",
      v: 1,
      deviceId: "device-1",
      settingId: "party-size",
      optionId: "n-2",
    },
    press("device-1", "continue-game-settings", "continue"),
    joined("device-1"),
    joined("device-2"),
    take("device-1", "hero-a"),
    take("device-2", "hero-b"),
    press("device-1", "continue-claim-heroes", "continue"),
  ]);
  for (const step of state.setupSteps) {
    if (step.id === "starting-purse") {
      state = run(state, [press("device-1", `spin-setup-${step.id}`, "spin")]);
    }
    state = run(state, [press("device-1", `continue-setup-${step.id}`, "continue")]);
  }
  state = run(state, [press("device-1", "continue-begin", "continue")]);
  return run(
    state,
    OPENING_MOMENTS.map((moment) => press("device-1", openingPromptId(moment), "continue")),
  );
};

/** The live state at Continue: the joined set only. */
const liveWith = (saved: ShellState, ...ids: string[]): ShellState => ({
  ...saved,
  devices: new Set(ids),
  holdings: {},
});

const seatedIds = (state: ShellState): string[] =>
  state.play?.groups.flatMap((group) => group.heroIds) ?? [];

describe("CU/16 seatOnContinue", () => {
  it("EV-01 Continue clears the hold of an iPad that is not joined", () => {
    const saved = savedGame();
    expect(saved.holdings["hero-a"]).toBe("device-1");
    expect(saved.holdings["hero-b"]).toBe("device-2");
    const next = seatOnContinue(saved, liveWith(saved, "device-3"));
    expect(next.holdings["hero-a"]).toBeNull();
    expect(next.holdings["hero-b"]).toBeNull();
    expect([...next.devices]).toEqual(["device-3"]);
    expect(next.stage).toBe("paused");
    expect(next.screen).toBe("pause");
    expect(next.pause?.cause).toBe("disconnect");
  });

  it("EV-02 a joined iPad keeps its hold; a full table is not paused", () => {
    const saved = savedGame();
    const half = seatOnContinue(saved, liveWith(saved, "device-1", "device-3"));
    expect(half.holdings["hero-a"]).toBe("device-1");
    expect(half.holdings["hero-b"]).toBeNull();
    expect(half.stage).toBe("paused");
    expect(half.pause?.cause).toBe("disconnect");

    const full = seatOnContinue(saved, liveWith(saved, "device-1", "device-2"));
    expect(full.holdings["hero-a"]).toBe("device-1");
    expect(full.holdings["hero-b"]).toBe("device-2");
    expect(full.stage).toBe("playing");
    expect(full.pause).toBeNull();
    expect(full.screen).toBe(saved.screen);
    expect(full.screen).toBe("play");
  });

  it("EV-03 nothing but the holds, the joined set and the pause changes", () => {
    const saved = savedGame();
    const plain = (state: ShellState) =>
      JSON.parse(JSON.stringify({ ...state, devices: [...state.devices] })) as Record<
        string,
        unknown
      >;
    const before = plain(saved);
    const next = seatOnContinue(saved, liveWith(saved, "device-3"));
    const after = plain(next);
    const skip = ["holdings", "devices", "stage", "screen", "pause", "pauseSerial", "offered"];
    for (const key of Object.keys(before) as Array<keyof typeof before>) {
      if (skip.includes(key)) continue;
      expect(after[key], `field ${key}`).toEqual(before[key]);
    }
    expect(saved.holdings["hero-a"]).toBe("device-1");
    expect(seatedIds(next)).toEqual(seatedIds(saved));
    expect(next.play?.dayNumber).toBe(saved.play?.dayNumber);
  });

  it("EV-04 the pause counts the seated heroes, not the roster", () => {
    const saved = savedGame();
    expect(TEST_STORY.heroes.length).toBe(6);
    let state = seatOnContinue(saved, liveWith(saved, "device-3"));
    expect(seatedIds(state)).toEqual(["hero-a", "hero-b"]);

    const board = project(projectShellView(state), { kind: "board" });
    expect(board.levels.at(-1)?.shows).toBe("0 of 2 picked");
    let device = project(projectShellView(state), { kind: "device", deviceId: "device-3" });
    expect(device.heroes.map((hero) => hero.id)).toEqual(["hero-a", "hero-b"]);
    expect(device.heroes.map((hero) => hero.claim)).toEqual(["open", "open"]);

    // A hero outside the party cannot be picked in the pause.
    const refused = stepShell(state, take("device-3", "hero-c")).state;
    expect(refused.holdings["hero-c"] ?? null).toBeNull();

    state = stepShell(state, take("device-3", "hero-a")).state;
    expect(project(projectShellView(state), { kind: "board" }).levels.at(-1)?.shows).toBe(
      "1 of 2 picked",
    );
    device = project(projectShellView(state), { kind: "device", deviceId: "device-3" });
    expect(device.heroes.map((hero) => [hero.id, hero.claim])).toEqual([
      ["hero-a", "yours"],
      ["hero-b", "open"],
    ]);
  });

  it("EV-05a play goes on at the last pick, with no extra press", () => {
    const saved = savedGame();
    let state = seatOnContinue(saved, liveWith(saved, "device-3", "device-4"));
    state = run(state, [take("device-3", "hero-a")]);
    expect(state.stage).toBe("paused");
    state = run(state, [take("device-4", "hero-b")]);
    expect(state.stage).toBe("playing");
    expect(state.pause).toBeNull();
    expect(state.screen).toBe(saved.screen);
  });

  it("EV-05b a lost tower still pauses after the last pick, and offers its three buttons", () => {
    const saved = savedGame("connect");
    expect(saved.towerLinked).toBe(true);
    const live = liveWith(saved, "device-3", "device-4");
    let state = seatOnContinue(saved, live);
    state = run(state, [{ kind: "tower-snapshot", v: 1, tower: TOWER_DISCONNECTED }]);
    expect(state.pause?.cause).toBe("disconnect");
    state = run(state, [take("device-3", "hero-a"), take("device-4", "hero-b")]);
    expect(state.stage).toBe("paused");
    expect(state.pause?.cause).toBe("tower-lost");
    const open = state.offered.filter((offer) => offer.open).map((offer) => offer.actionId);
    expect(open).toContain("reconnect");
    expect(open).toContain("go-on-without");
    expect(open).toContain("quit-story");
  });
});
