import { describe, expect, it } from "vitest";
import { BASE_PURSE_WHEEL } from "../../rules/purse/index.ts";
import { project } from "../../views/project.ts";
import { enterWithoutEvents } from "./enterKit.ts";
import { TEST_STORY } from "./pack.ts";
import { initialShellState, type ShellState } from "./state.ts";
import { stepShell } from "./stepShell.ts";
import { TOWER_READY } from "./tower.ts";
import { projectShellView } from "./view.ts";

/** CU/15: the starting-purse step, its Spin, the seeded result and the tower command on the press. */

const press = (promptId: string, actionId: string, deviceId = "ipad-0") =>
  ({ kind: "press", v: 1, deviceId, promptId, actionId }) as const;

type Effects = ReturnType<typeof stepShell>["effects"];

const run = (state: ShellState, ...events: Parameters<typeof stepShell>[1][]) => {
  let cursor = state;
  const effects: Effects = [];
  for (const event of events) {
    const result = stepShell(cursor, event);
    cursor = result.state;
    effects.push(...result.effects);
  }
  return { state: cursor, effects };
};

const towerCommands = (effects: Effects) =>
  effects.filter((effect) => effect.kind === "tower-command");

/** Pick story to the starting-purse step; `linked` puts a ready tower on the table first. */
const reachPurse = (seed: string, linked = false) => {
  let state = stepShell(initialShellState({ sessionId: "s", seed, stories: [TEST_STORY] }), {
    kind: "start-session",
    v: 1,
    seed,
    sessionId: "sess-1",
  }).state;
  state = run(state, ...enterWithoutEvents()).state;
  if (linked) {
    state = { ...state, towerLinked: true, towerChoice: "connect", tower: TOWER_READY };
  }
  state = run(
    state,
    press("continue-pick-story-test", "continue"),
    press("continue-game-settings", "continue"),
  ).state;
  for (const [index, hero] of TEST_STORY.heroes.slice(0, 4).entries()) {
    const deviceId = `ipad-${index}`;
    state = run(
      state,
      { kind: "device-join", v: 1, deviceId },
      { kind: "hero-hold", v: 1, deviceId, heroId: hero.id, action: "take" },
    ).state;
  }
  state = run(state, press("continue-claim-heroes", "continue")).state;
  const before: Effects = [];
  while (state.setupSteps[state.setupAt]?.id !== "starting-purse") {
    const id = state.setupSteps[state.setupAt]?.id;
    if (!id) throw new Error("The purse step was never reached.");
    const next = run(state, press(`continue-setup-${id}`, "continue"));
    state = next.state;
    before.push(...next.effects);
  }
  return { state, before };
};

const offeredIds = (state: ShellState) => state.offered.map((offer) => offer.promptId);
const chance = (state: ShellState) => project(projectShellView(state), { kind: "board" }).chance;

describe("CU/15 the starting purse step", () => {
  it("sits after the heroes are placed, and offers Spin before Continue (UI-045, SCR-016)", () => {
    const { state } = reachPurse("seed-a");
    expect(state.setupSteps.map((step) => step.id)).toEqual([
      "seals-and-skulls",
      "place-heroes",
      "starting-purse",
    ]);
    expect(offeredIds(state)).toContain("spin-setup-starting-purse");
    expect(offeredIds(state)).not.toContain("continue-setup-starting-purse");
    expect(chance(state)).toMatchObject({ title: "Starting purse", amount: null, line: null });
    // A stale Continue cannot step past an unset purse.
    const stale = run(state, press("continue-setup-starting-purse", "continue")).state;
    expect(stale.screen).toBe("setup");
    expect(stale.setupAt).toBe(state.setupAt);
  });

  it("EV-08: with the tower, nothing is sent until the press, then exactly one command", () => {
    const { state, before } = reachPurse("seed-b", true);
    expect(towerCommands(before)).toEqual([]);
    expect(state.startingPurse).toBeNull();
    const spun = run(state, press("spin-setup-starting-purse", "spin"));
    const commands = towerCommands(spun.effects);
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({ kind: "tower-command", capabilityId: "lighting.sequence" });
    // Raw bytes never travel: the params are plain values.
    expect(JSON.stringify(commands[0]?.params)).not.toMatch(/bytes|raw/i);
    // The tower plays the sound: the board plays no separate coin cue.
    expect(spun.state.purseCue).toBe(0);
    expect(chance(spun.state)?.line).toBe(`The lights stop on ${spun.state.startingPurse} gold.`);
  });

  it("EV-10: with no tower the result is at once, the board plays one coin cue, no command", () => {
    const { state } = reachPurse("seed-c");
    const spun = run(state, press("spin-setup-starting-purse", "spin"));
    expect(towerCommands(spun.effects)).toEqual([]);
    expect(spun.state.purseCue).toBe(1);
    const view = chance(spun.state);
    expect(view?.line).toBe(`The wheel stops on ${spun.state.startingPurse} gold.`);
    expect(view?.cue).toBe(1);
    expect(view?.line ?? "").not.toMatch(/tower|lights/i);
    expect(offeredIds(spun.state)).toContain("continue-setup-starting-purse");
    expect(offeredIds(spun.state)).not.toContain("spin-setup-starting-purse");
  });

  it("EV-11: a second Spin cannot overwrite the purse or play a second cue", () => {
    const { state } = reachPurse("seed-d");
    const first = run(state, press("spin-setup-starting-purse", "spin"));
    const again = run(
      first.state,
      press("spin-setup-starting-purse", "spin", "ipad-1"),
      press("spin-setup-starting-purse", "spin", "ipad-0"),
    );
    expect(again.state.startingPurse).toBe(first.state.startingPurse);
    expect(again.state.purseCue).toBe(1);
    expect(towerCommands(again.effects)).toEqual([]);
  });

  it("EV-09: the draw is seeded, never below the floor, and Back keeps the set purse", () => {
    const amounts = ["seed-a", "seed-a", "seed-z"].map((seed) => {
      const { state } = reachPurse(seed);
      return run(state, press("spin-setup-starting-purse", "spin")).state.startingPurse;
    });
    expect(amounts[0]).toBe(amounts[1]);
    for (const amount of amounts) {
      expect(amount).toBeGreaterThanOrEqual(BASE_PURSE_WHEEL.floor);
      expect(BASE_PURSE_WHEEL.sides).toContain(amount);
    }
    const { state } = reachPurse("seed-a");
    const spun = run(state, press("spin-setup-starting-purse", "spin")).state;
    const back = run(spun, press("back-setup-starting-purse", "back")).state;
    const forward = run(back, press("continue-setup-place-heroes", "continue")).state;
    expect(forward.startingPurse).toBe(spun.startingPurse);
    expect(offeredIds(forward)).toContain("continue-setup-starting-purse");
  });

  it("EV-13: a purse that is not a usable amount reads unavailable, never zero", () => {
    const { state } = reachPurse("seed-e");
    for (const broken of [-3, 2.5, Number.NaN]) {
      const view = chance({ ...state, startingPurse: broken });
      expect(view?.amount).toBe("unavailable");
      expect(view?.line).toBeNull();
    }
  });

  it("EV-14/15: a purse already set keeps its place and a restore plays nothing", () => {
    const { state } = reachPurse("seed-f");
    const spun = run(state, press("spin-setup-starting-purse", "spin")).state;
    // A restart reloads the checkpoint: the cue count is cleared and the purse stays.
    const restored = { ...spun, purseCue: 0 };
    const view = chance(restored);
    expect(view?.cue).toBe(0);
    expect(view?.amount).toBe(spun.startingPurse);
    expect(offeredIds(restored)).not.toContain("spin-setup-starting-purse");
  });
});
