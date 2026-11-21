import { afterEach, describe, expect, it } from "vitest";
import { initPlayState, type PlayState } from "../chapter/playState.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import {
  bindShellState,
  clearShellState,
  takePendingCheckpoint,
  takePendingTowerCommands,
} from "../session/shellRef.ts";
import { initialShellState, type ShellState } from "../session/state.ts";
import { projectShellView } from "../session/view.ts";
import { captureClock, ensureClock, markQuestWon, restoreClock } from "./clock.ts";
import { type DayLocal, type DayResult, dayLoop } from "./loop.ts";
import { handleDayPress } from "./press.ts";
import { BASE_TUNING, daysLeft, dropsThisNight } from "./rules.ts";

/*
 * D6 / 01-drop-counter-and-free-pick, EV-01 to EV-05 and EV-13a: one counter N of counted nights
 * (DEC-912, DEC-947). A won-quest night leaves N alone; any other night adds 1, then drops by N.
 */

type Status = "prompt" | "child" | "done" | "wait";
type Offer = { promptId: string; actionId: string };

type Harness = {
  play: PlayState;
  shell: ShellState;
  local: DayLocal;
  offers: Offer[];
  child: string | null;
  parent: { groupId?: string } | undefined;
  effects: unknown[];
};

const idleLocal = (): DayLocal => ({
  phase: "regroup",
  groupIndex: 0,
  awaitingPress: false,
  awaitingChild: false,
  skullPlaced: false,
  skullsLeft: 0,
});

const HEROES = ["a", "b", "c", "d"];

const boot = (seed: string, count: number, tower: boolean): Harness => {
  const kingdoms = ["N", "E", "S", "W"] as const;
  const play = initPlayState(seed, {
    ...PROVING_GROUNDS_PLAY,
    start: {
      mode: "one-per-kingdom-citadel",
      assignments: HEROES.slice(0, count).map((hero, index) => ({
        hero,
        kingdom: kingdoms[index] ?? "N",
      })),
    },
  });
  const shell = initialShellState({ sessionId: "d6", seed, stories: [] });
  shell.play = play;
  shell.seed = seed;
  shell.towerLinked = tower;
  bindShellState(shell);
  return {
    play,
    shell,
    local: idleLocal(),
    offers: [],
    child: null,
    parent: undefined,
    effects: [],
  };
};

const closeHarness = (): void => {
  takePendingTowerCommands();
  takePendingCheckpoint();
  clearShellState();
};

const dayCtx = (h: Harness) => ({
  loopId: "day",
  seed: h.shell.seed,
  eventSeq: 1,
  effects: h.effects as never[],
  tracePhase: () => {},
  recordEnd: () => {},
  offerPrompt: (promptId: string, actionId: string) => {
    h.offers.push({ promptId, actionId });
  },
  startChild: () => {
    const input = h.play.childInput;
    h.child = input && input.kind === "group-turn" ? input.groupId : null;
  },
  setParentResult: () => {},
  getParentResult: () => h.parent,
});

const pump = (h: Harness): Status => {
  h.offers = [];
  h.child = null;
  const result = dayLoop.body(h.local, dayCtx(h));
  h.local = result.local;
  if (result.passComplete) return "done";
  if (h.child) return "child";
  if (h.offers.length > 0) return "prompt";
  return "wait";
};

const pressOffer = (h: Harness, offer: Offer): Status => {
  h.local = handleDayPress(h.local, offer.promptId, offer.actionId);
  return pump(h);
};

const findOffer = (h: Harness, test: (offer: Offer) => boolean, what: string): Offer => {
  const found = h.offers.find(test);
  if (!found) throw new Error(`No ${what} offer: ${h.offers.map((o) => o.promptId).join(", ")}`);
  return found;
};

/** One whole day. `prompts` counts the tower's skull placement presses. */
const runDay = (
  h: Harness,
  opts?: { questWin?: boolean; prompts?: { count: number } },
): DayResult => {
  h.local = dayLoop.enter(dayCtx(h));
  let status = pump(h);
  let won = opts?.questWin ?? false;
  for (let guard = 0; guard < 48 && status !== "done"; guard++) {
    if (status === "child") {
      const groupId = h.child;
      if (!groupId) throw new Error("Group turn started without a group.");
      if (won) {
        markQuestWon(h.play);
        won = false;
      }
      h.parent = { groupId };
      status = pump(h);
      continue;
    }
    if (status === "wait" && (h.local.phase === "effects" || h.local.phase === "event")) {
      h.local = { ...h.local, waitDone: true };
      status = pump(h);
      continue;
    }
    if (status !== "prompt") throw new Error(`Day stuck in ${h.local.phase} (${status}).`);
    const eventChoice = h.offers.find((offer) => offer.actionId === "choose");
    if (eventChoice) {
      status = pressOffer(h, eventChoice);
      continue;
    }
    if (h.offers.some((offer) => offer.promptId.includes("roll-done"))) {
      status = pressOffer(
        h,
        findOffer(h, (o) => o.promptId.includes("roll-done"), "roll"),
      );
      continue;
    }
    if (h.offers.some((offer) => offer.promptId.startsWith("skull-drop"))) {
      status = pressOffer(
        h,
        findOffer(h, (o) => o.promptId.startsWith("skull-drop"), "drop"),
      );
      continue;
    }
    const simulated = h.offers.find((offer) => offer.promptId.startsWith("skull-sim-day-"));
    if (simulated) {
      status = pressOffer(h, simulated);
      continue;
    }
    if (h.offers.some((offer) => offer.actionId === "record")) {
      if (opts?.prompts) opts.prompts.count += 1;
      status = pressOffer(
        h,
        findOffer(h, (o) => o.actionId === "record" && !o.promptId.endsWith("--inside"), "record"),
      );
      continue;
    }
    throw new Error(`Unhandled offers: ${h.offers.map((o) => o.promptId).join(", ")}`);
  }
  if (status !== "done") throw new Error(`Day did not finish (${h.local.phase}).`);
  return dayLoop.resultUp(h.local, dayCtx(h));
};

const counter = (h: Harness): number =>
  (ensureClock(h.play) as unknown as { nightsCounted: number }).nightsCounted;

const bandDaysLeft = (h: Harness): number | null | undefined => {
  h.shell.screen = "play";
  return projectShellView(h.shell).table?.daysLeft;
};

/** Nights 1..count: the skulls each night took and N after it. */
const nights = (
  seed: string,
  heroes: number,
  wonOnDay: number | null,
  count = 6,
): { drops: number[]; counted: number[] } => {
  const h = boot(seed, heroes, false);
  try {
    const drops: number[] = [];
    const counted: number[] = [];
    for (let day = 1; day <= count; day++) {
      const before = ensureClock(h.play).supply;
      runDay(h, { questWin: day === wonOnDay });
      drops.push(before - ensureClock(h.play).supply);
      counted.push(counter(h));
    }
    return { drops, counted };
  } finally {
    closeHarness();
  }
};

afterEach(() => {
  closeHarness();
});

describe("D6 01 drop counter", () => {
  it("EV-01 the due drop by party size, by N", () => {
    const row = (heroes: number) =>
      [1, 2, 3, 4, 5, 6, 7, 8].map((n) => dropsThisNight(heroes, n, BASE_TUNING));
    expect(row(1)).toEqual([1, 0, 1, 0, 1, 0, 1, 0]);
    expect(row(2)).toEqual([1, 1, 1, 0, 1, 1, 1, 0]);
    expect(row(3)).toEqual([1, 2, 1, 2, 1, 2, 1, 2]);
    expect(row(4)).toEqual([1, 2, 1, 2, 1, 2, 1, 2]);
  });

  it("EV-02 a won-quest night drops nothing and does not move N", () => {
    const one = nights("d6-ev02-1", 1, 2);
    const two = nights("d6-ev02-2", 2, 2);
    const three = nights("d6-ev02-3", 3, 2);
    expect(one.drops).toEqual([1, 0, 0, 1, 0, 1]);
    expect(two.drops).toEqual([1, 0, 1, 1, 0, 1]);
    expect(three.drops).toEqual([1, 0, 2, 1, 2, 1]);
    for (const run of [one, two, three]) expect(run.counted).toEqual([1, 1, 2, 3, 4, 5]);
  });

  it("EV-02 night 2's effects hold +1 day", () => {
    const h = boot("d6-ev02-fx", 2, false);
    runDay(h);
    runDay(h, { questWin: true });
    expect(ensureClock(h.play).effects).toEqual(["+1 day"]);
  });

  it("EV-03 the tower and the simulated drop take the same count", () => {
    // (a) 3 heroes, N = 1 so far: the due count is 2, linked or not.
    const linked = boot("d6-ev03a-linked", 3, true);
    const prompts = { count: 0 };
    ensureClock(linked.play).nightsCounted = 1;
    runDay(linked, { prompts });
    expect(prompts.count).toBe(2);
    expect(counter(linked)).toBe(2);
    closeHarness();

    const sim = boot("d6-ev03a-sim", 3, false);
    ensureClock(sim.play).nightsCounted = 1;
    runDay(sim);
    expect(ensureClock(sim.play).supply).toBe(24 - 2);
    expect(ensureClock(sim.play).nightDrops).toHaveLength(2);
    closeHarness();

    // (b) 2 heroes, N = 3 so far: a no-drop night either way.
    for (const tower of [true, false]) {
      const h = boot(`d6-ev03b-${tower}`, 2, tower);
      const count = { count: 0 };
      ensureClock(h.play).nightsCounted = 3;
      runDay(h, { prompts: count });
      expect(count.count).toBe(0);
      expect(ensureClock(h.play).nightDrops).toEqual([]);
      expect(ensureClock(h.play).supply).toBe(24);
      expect(counter(h)).toBe(4);
      closeHarness();
    }
  });

  it("EV-04 days left counts every night, a no-drop night included", () => {
    const left = (supply: number, heroes: number, from: number) =>
      daysLeft(supply, heroes, from, BASE_TUNING);
    expect([
      left(12, 1, 1),
      left(12, 2, 1),
      left(12, 3, 1),
      left(12, 4, 1),
      left(23, 2, 2),
      left(1, 1, 2),
      left(0, 2, 1),
    ]).toEqual([23, 15, 8, 8, 30, 2, 0]);
  });

  it("EV-05 the band reads the counted nights, plus tonight after a won quest", () => {
    const h = boot("d6-ev05", 2, false);
    expect(bandDaysLeft(h)).toBe(31);
    runDay(h);
    expect(bandDaysLeft(h)).toBe(30);
    // Day 2 again, a quest is won that day.
    h.local = dayLoop.enter(dayCtx(h));
    markQuestWon(h.play);
    expect(bandDaysLeft(h)).toBe(31);
    ensureClock(h.play).tuning = { ...ensureClock(h.play).tuning, questSkips: false };
    expect(bandDaysLeft(h)).toBe(30);
  });

  it("EV-13a Continue keeps N: drops and band match an uninterrupted run", () => {
    const run = (saveAfter: number | null) => {
      const h = boot("d6-ev13a", 2, false);
      let live = h;
      const trace: Array<{ drop: number; n: number; band: number | null | undefined }> = [];
      for (let day = 1; day <= 6; day++) {
        if (saveAfter !== null && day === saveAfter + 1) {
          const saved = captureClock(live.play);
          if (!saved) throw new Error("No clock to save.");
          const fresh = boot("d6-ev13a", 2, false);
          fresh.play.dayNumber = live.play.dayNumber;
          restoreClock(fresh.play, saved);
          live = fresh;
        }
        const before = ensureClock(live.play).supply;
        runDay(live, { questWin: day === 2 });
        trace.push({
          drop: before - ensureClock(live.play).supply,
          n: counter(live),
          band: bandDaysLeft(live),
        });
      }
      closeHarness();
      return trace;
    };
    const straight = run(null);
    expect(run(2)).toEqual(straight);
    expect(run(4)).toEqual(straight);
  });
});
