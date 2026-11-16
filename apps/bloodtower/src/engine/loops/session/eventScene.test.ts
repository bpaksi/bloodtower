import { describe, expect, it } from "vitest";
import { OPENING_MOMENTS, openingPromptId } from "../../../protocols/opening.ts";
import type { PressEvent } from "../../events.ts";
import { project } from "../../views/project.ts";
import { ensureClock, heroSheet } from "../day/clock.ts";
import { openDayWait } from "../day/wait.ts";
import { eventState } from "../event/index.ts";
import { enterWithoutEvents } from "./enterKit.ts";
import type { ShellEvent } from "./events.ts";
import { TEST_STORY } from "./pack.ts";
import { initialShellState, type ShellState } from "./state.ts";
import { eventPressDeviceRefusal, stepShell } from "./stepShell.ts";
import { projectShellView } from "./view.ts";

/** C3/12 PR 1: the event scene in the day loop, driven through the shell like the host does. */

const press = (promptId: string, actionId: string, deviceId = "ipad-0"): PressEvent => ({
  kind: "press",
  v: 1,
  deviceId,
  promptId,
  actionId,
});

type Result = ReturnType<typeof stepShell>;
const step = (state: ShellState, ...events: ShellEvent[]): ShellState =>
  events.reduce((cursor, event) => stepShell(cursor, event).state, state);
const stepFull = (state: ShellState, event: ShellEvent): Result => stepShell(state, event);

const reachPlay = (): ShellState => {
  let state = stepShell(
    initialShellState({ sessionId: "s", seed: "seed", stories: [TEST_STORY] }),
    { kind: "start-session", v: 1, seed: "seed", sessionId: "sess-1" },
  ).state;
  state = step(state, ...enterWithoutEvents());
  state = step(
    state,
    press("continue-pick-story-test", "continue"),
    press("continue-game-settings", "continue"),
  );
  for (const [index, hero] of TEST_STORY.heroes.slice(0, 4).entries()) {
    const deviceId = `ipad-${index}`;
    state = step(
      state,
      { kind: "device-join", v: 1, deviceId },
      { kind: "hero-hold", v: 1, deviceId, heroId: hero.id, action: "take" },
    );
  }
  state = step(state, press("continue-claim-heroes", "continue"));
  for (const setup of state.setupSteps) {
    if (setup.id === "starting-purse") state = step(state, press(`spin-setup-${setup.id}`, "spin"));
    state = step(state, press(`continue-setup-${setup.id}`, "continue"));
  }
  state = step(state, press("continue-begin", "continue"));
  for (const momentId of OPENING_MOMENTS)
    state = step(state, press(openingPromptId(momentId), "continue"));
  return state;
};

const ALL = ["hero-a", "hero-b", "hero-c", "hero-d"];
/** A marker giving every seated hero the same value (the acting group is not known before the draw). */
const all = (marker: string, value: string) =>
  `${marker}${ALL.map((id) => `${id}=${value}`).join(",")}`;
const HP = all("~test-hp:", "9/9");

const open = (state: ShellState) => state.offered.filter((offer) => offer.open);

/** Rolls the day, seeds the markers, and ends the first group's turn: its event opens. */
const toEvent = (markers: string): ShellState => {
  let state = reachPlay();
  const roll = open(state).find((offer) => offer.promptId.endsWith("-roll-done"));
  if (!roll) throw new Error("No move roll to take.");
  state = step(state, press(roll.promptId, roll.actionId));
  const play = state.play;
  if (!play) throw new Error("No play state.");
  // Every building has a skull, so a group that ends its turn there draws (DEC-017, DEC-080).
  const skulls = play.content.board.spaces
    .filter((space) => space.building)
    .map((space) => `${space.id}=1`)
    .join(",");
  state = step(state, {
    kind: "test-seed",
    v: 1,
    markers: `~test-skulls:${skulls}${markers}`,
  });
  const end = open(state).find((offer) => offer.actionId === "end-turn");
  if (!end) throw new Error("The first group cannot end its turn.");
  return step(state, press(end.promptId, end.actionId));
};

const eventOf = (state: ShellState) => {
  const table = projectShellView(state).table;
  return table?.event ?? null;
};

/** The iPad that holds a hero of the event's group. */
const holderOf = (state: ShellState): string => {
  const scene = eventOf(state);
  const lead = scene?.heroIds[0];
  const holder = lead ? state.holdings[lead] : null;
  if (!holder) throw new Error("No iPad holds the event's heroes.");
  return holder;
};

const sheetOf = (state: ShellState, heroId: string) => {
  if (!state.play) throw new Error("No play state.");
  return heroSheet(ensureClock(state.play), heroId);
};

const endWait = (state: ShellState): ShellState => {
  const wait = openDayWait(state.loops.stack);
  if (!wait) throw new Error("No wait is open.");
  return step(state, { kind: "wait-end", v: 1, waitId: wait.id, cause: "timeout" });
};

describe("C3/12 the event scene (engine and wire)", () => {
  it("a hazard offers two costs; nothing moves on or applies until one is pressed", () => {
    const state = toEvent(`~test-event:hazard-storm${HP}`);
    const scene = eventOf(state);
    expect(scene?.type).toBe("hazard");
    expect(scene?.stage).toBe("choose");
    expect(scene?.options.map((o) => o.optionId)).toEqual(["hit-points", "lose-turn"]);
    expect(openDayWait(state.loops.stack)).toBeNull();
    const lead = scene?.heroIds[0] ?? "";
    const before = sheetOf(state, lead).hp?.hp;
    expect(before).toBeDefined();
    expect(sheetOf(state, lead).hp?.hp).toBe(before);
  });

  it("pressing the hit-point cost takes 2 from each present hero once, then the result waits", () => {
    let state = toEvent(`~test-event:hazard-storm${HP}`);
    const scene = eventOf(state);
    const lead = scene?.heroIds[0] ?? "";
    const before = sheetOf(state, lead).hp?.hp ?? 0;
    const pick = scene?.options.find((o) => o.optionId === "hit-points");
    if (!pick) throw new Error("No hit-point cost.");
    state = step(state, press(pick.promptId, "choose", holderOf(state)));
    expect(sheetOf(state, lead).hp?.hp).toBe(before - 2);
    expect(eventOf(state)?.stage).toBe("result");
    expect(eventOf(state)?.result).toEqual({ kind: "hit-points", amount: -2 });
    expect(openDayWait(state.loops.stack)).not.toBeNull();
    // A second press on the other cost changes nothing (first press wins, DEC-019).
    const other = scene?.options.find((o) => o.optionId === "lose-turn");
    if (!other) throw new Error("No lose-turn cost.");
    state = step(state, press(other.promptId, "choose", holderOf(state)));
    expect(sheetOf(state, lead).hp?.hp).toBe(before - 2);
    expect(eventState(state.play as never).lostTurns).toEqual([]);
    state = endWait(state);
    expect(eventOf(state)).toBeNull();
    expect(sheetOf(state, lead).hp?.hp).toBe(before - 2);
  });

  it("an iPad that holds no present hero sees no choice and its press is refused with words", () => {
    const state = toEvent(`~test-event:hazard-storm${HP}`);
    const pick = eventOf(state)?.options[0];
    if (!pick) throw new Error("No option.");
    const holder = holderOf(state);
    const other = [...state.devices].find((id) => id !== holder) ?? "ipad-x";
    expect(eventPressDeviceRefusal(state, other, pick.promptId, "choose")).toMatch(/heroes/);
    expect(eventPressDeviceRefusal(state, holder, pick.promptId, "choose")).toBeNull();
    const mine = projectShellView(state);
    const forHolder = project(mine, { kind: "device", deviceId: holder });
    const forOther = project(mine, { kind: "device", deviceId: other });
    expect(forHolder.actions.some((a) => a.promptId.startsWith("event-choice--"))).toBe(true);
    expect(forOther.actions.some((a) => a.promptId.startsWith("event-choice--"))).toBe(false);
  });

  it("foes offer Go around and Pay them off, never Fight; Pay is off at 4 gold and on at 5", () => {
    const pay = (s: ShellState) => eventOf(s)?.options.find((o) => o.optionId === "pay-off");
    const poor = toEvent(`~test-event:foes${all("~test-gold:", "4")}`);
    expect(eventOf(poor)?.options.map((o) => o.optionId)).toEqual(["go-around", "pay-off"]);
    expect(pay(poor)?.enabled).toBe(false);
    const rich = toEvent(`~test-event:foes${all("~test-gold:", "5")}`);
    expect(pay(rich)?.enabled).toBe(true);
    expect(eventOf(rich)?.options.some((o) => o.optionId === "fight")).toBe(false);
  });

  it("a windfall settles at once: +5 gold, no buttons, a wait", () => {
    const state = toEvent("~test-event:windfall");
    const scene = eventOf(state);
    expect(scene?.stage).toBe("result");
    expect(scene?.options).toEqual([]);
    expect(scene?.result).toEqual({ kind: "windfall", gold: 5 });
    expect(openDayWait(state.loops.stack)?.maxMs).toBe(4000);
  });

  it("a quiet road settles with no cost", () => {
    const state = toEvent("~test-event:quiet");
    expect(eventOf(state)?.result).toEqual({ kind: "quiet" });
    expect(eventOf(state)?.options).toEqual([]);
  });

  it("a wait-end for another wait changes nothing; the right one moves the day on", () => {
    let state = toEvent("~test-event:quiet");
    const stale = stepFull(state, {
      kind: "wait-end",
      v: 1,
      waitId: "event-day-9-x",
      cause: "timeout",
    });
    expect(eventOf(stale.state)?.stage).toBe("result");
    state = endWait(state);
    expect(eventOf(state)).toBeNull();
    // A repeated end is the same expected race.
    const wait = "event-day-1-" + (eventState(state.play as never).open?.groupId ?? "");
    const again = stepFull(state, { kind: "wait-end", v: 1, waitId: wait, cause: "timeout" });
    expect(eventOf(again.state)).toBeNull();
  });

  it("an event line makes the wait end on the line, not the timer", () => {
    const state = toEvent("~test-event:quiet~test-event-line:event.quiet.1");
    expect(openDayWait(state.loops.stack)?.lineId).toBe("event.quiet.1");
    expect(eventOf(state)?.line).toBe("event.quiet.1");
  });

  it("seeds each seated hero's hit points and the starting purse at the start of play", () => {
    const state = reachPlay();
    const purse = state.startingPurse;
    expect(purse).not.toBeNull();
    const heroes = (state.play?.groups ?? []).flatMap((group) => group.heroIds);
    const gold = heroes.map((id) => sheetOf(state, id).gold);
    expect(gold.every((g) => g !== undefined)).toBe(true);
    expect(gold.reduce((sum: number, g) => sum + (g ?? 0), 0)).toBe(purse);
  });
});
