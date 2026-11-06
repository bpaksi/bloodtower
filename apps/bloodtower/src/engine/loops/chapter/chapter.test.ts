import { afterEach, describe, expect, it } from "vitest";
import type { EngineEffect } from "../../effects.ts";
import {
  advanceLoops,
  emptyLoopRuntime,
  type LoopRuntimeState,
  startRootLoop,
} from "../../loop/runtime.ts";
import type { LoopDefinition, LoopRegistry } from "../../loop/types.ts";
import { checkChapter, ensureClock, markQuestWon } from "../day/clock.ts";
import type { DayResult } from "../day/loop.ts";
import { skullRecordPromptId } from "../day/skull.ts";
import { ensureQuests } from "../quest/store.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { bindShellState, clearShellState } from "../session/shellRef.ts";
import { initialShellState } from "../session/state.ts";
import {
  type ChapterPlan,
  configureChapters,
  ensureChapters,
  restoreChapters,
  snapshotChapters,
} from "./chapters.ts";
import { type ChapterLocal, type ChapterResult, chapterLoop, handleChapterPress } from "./loop.ts";
import { initPlayState, type PlayState } from "./playState.ts";

const spaceIn = (kingdom: string, n: number): string => {
  const rows = PROVING_GROUNDS_PLAY.board.spaces.filter((s) => s.kingdom === kingdom && s.building);
  const row = rows[n];
  if (!row) throw new Error(`no building ${n} in ${kingdom}`);
  return row.id;
};

const PLAN: ChapterPlan = {
  c3EndAfterChapter1: true,
  sealBreakMin: 2,
  foeLevel: { chapter1: 1, perChapter: 1 },
  seals: [
    { id: "seal-a", glyph: "glyph-a", boon: "boon-a" },
    { id: "seal-b", glyph: "glyph-b", boon: "boon-b" },
    { id: "seal-c", glyph: "glyph-c", boon: "boon-c" },
  ],
  chapters: [
    {
      id: "ch-1",
      index: 1,
      kingdoms: ["N"],
      quests: [
        { id: "herald", spaceId: spaceIn("N", 0) },
        { id: "ambush", spaceId: spaceIn("N", 1) },
      ],
    },
    { id: "ch-2", index: 2, kingdoms: ["E"], quests: [{ id: "c2-a", spaceId: spaceIn("E", 0) }] },
    {
      id: "ch-3",
      index: 3,
      kingdoms: ["S", "W"],
      quests: [
        { id: "lock", spaceId: spaceIn("S", 0) },
        { id: "last-stand", spaceId: spaceIn("W", 0) },
      ],
    },
  ],
};

/** Quests the stand-in day finishes, per day number. Past the script the day waits on a prompt. */
type DayScript = { done?: string[]; supply?: number };
let script: Record<number, DayScript> = {};

/*
 * A stand-in for the day loop: it marks quests and sets the supply from the script, then asks the
 * real clock check for the result, as the real day does at MEC-033 .11.
 */
const standInDay: LoopDefinition<{ n: number }, DayResult> = {
  id: "day",
  enter: () => {
    const play = playHolder.current;
    play.dayNumber += 1;
    return { n: play.dayNumber };
  },
  body: (local, ctx) => {
    const play = playHolder.current;
    const step = script[local.n];
    if (!step) {
      ctx.offerPrompt(`day-${local.n}-wait`, "continue");
      return { local, passComplete: false };
    }
    for (const id of step.done ?? []) {
      ensureQuests(play).done.push(id);
      markQuestWon(play);
    }
    const clock = ensureClock(play);
    if (step.supply !== undefined) clock.supply = step.supply;
    clock.outcome = checkChapter(clock);
    return { local, passComplete: true };
  },
  exit: () => true,
  resultUp: () => {
    const play = playHolder.current;
    const outcome = ensureClock(play).outcome;
    return {
      dayNumber: play.dayNumber,
      lost: outcome?.lost ? { reason: outcome.reason } : null,
    };
  },
};

const playHolder: { current: PlayState } = { current: undefined as unknown as PlayState };

const registry: LoopRegistry = {
  chapter: chapterLoop as LoopRegistry[string],
  day: standInDay as LoopRegistry[string],
};

type Run = {
  play: PlayState;
  runtime: LoopRuntimeState;
  effects: EngineEffect[];
  seed: string;
};

const setup = (options: { c3End: boolean; tower: boolean; startChapter?: number }): Run => {
  script = {};
  const seed = "chapter-test";
  const shell = initialShellState({ sessionId: "t", seed });
  shell.towerLinked = options.tower;
  const play = initPlayState(seed, PROVING_GROUNDS_PLAY);
  shell.play = play;
  playHolder.current = play;
  bindShellState(shell);
  const store = configureChapters(
    play,
    { ...PLAN, c3EndAfterChapter1: options.c3End },
    { startChapter: options.startChapter ?? 1 },
  );
  expect(store.current).toBe(options.startChapter ?? 1);
  return { play, runtime: emptyLoopRuntime(), effects: [], seed };
};

const start = (run: Run): void =>
  startRootLoop(registry, run.seed, 0, run.runtime, run.effects, "chapter");

const resume = (run: Run): void => advanceLoops(registry, run.seed, 0, run.runtime, run.effects);

const chapterResult = (run: Run): ChapterResult | undefined => {
  const end = run.effects.find((e) => e.kind === "loop-end" && e.loopId === "chapter");
  return end && "result" in end ? (end.result as ChapterResult) : undefined;
};

const chapterFrame = (run: Run) => run.runtime.stack.find((f) => f.loopId === "chapter");

afterEach(() => {
  clearShellState();
});

describe("chapter loop (MEC-033)", () => {
  it("EV-01: won at the .11 of the day the last quest is done", () => {
    const run = setup({ c3End: false, tower: false });
    script = { 1: { done: ["herald"] }, 2: { done: ["ambush"] } };
    start(run);
    expect(chapterResult(run)).toMatchObject({ outcome: "won", chapter: 1, last: false });
    expect(run.play.dayNumber).toBe(2);
  });

  it("EV-01: not won after one quest", () => {
    const run = setup({ c3End: false, tower: false });
    script = { 1: { done: ["herald"] } };
    start(run);
    expect(chapterResult(run)).toBeUndefined();
    expect(ensureChapters(run.play).nodes).not.toContain("won");
    expect(run.play.dayNumber).toBe(2);
  });

  it("EV-02: a loss on the day of the last finish is a loss", () => {
    const run = setup({ c3End: false, tower: false });
    script = { 1: { done: ["herald", "ambush"], supply: 0 } };
    start(run);
    expect(chapterResult(run)).toMatchObject({ outcome: "lost", reason: "skulls" });
    expect(chapterResult(run)?.last).toBe(false);
  });

  it("EV-03: board bounds and foe level step per chapter", () => {
    const seen: Record<number, { bounds: string[]; foe: number }> = {};
    for (const chapter of [2, 3]) {
      const run = setup({ c3End: false, tower: false, startChapter: chapter });
      start(run);
      const store = ensureChapters(run.play);
      seen[chapter] = { bounds: store.bounds, foe: store.foeLevel };
    }
    // Brynthia (E) opens in chapter 2, and not before.
    expect(seen[2]?.bounds).toEqual(["N", "E"]);
    // The whole board in chapter 3.
    expect(seen[3]?.bounds).toEqual(["N", "E", "S", "W"]);
    expect(seen[2]?.foe).toBe(2);
    expect(seen[3]?.foe).toBe(3);
  });

  it("EV-04: with the tower a won chapter breaks a seal and places the freed skulls", () => {
    const run = setup({ c3End: false, tower: true });
    ensureClock(run.play).held = 2;
    script = { 1: { done: ["herald", "ambush"] } };
    start(run);
    const store = ensureChapters(run.play);
    expect(store.brokenSeals).toHaveLength(1);
    const sealed = PLAN.seals.find((s) => s.id === store.brokenSeals[0]);
    expect(store.boons).toEqual([sealed?.boon]);
    expect(store.skullsToPlace).toBe(2);
    // Two placement prompts, and chapter 2 has not entered.
    expect(run.runtime.prompt?.promptId).toContain("skull-record--");
    expect(store.entered).toEqual([1]);
    expect(chapterResult(run)).toBeUndefined();

    const supplyBefore = ensureClock(run.play).supply;
    const building = spaceIn("N", 0);
    for (let i = 0; i < 2; i++) {
      const frame = chapterFrame(run);
      if (!frame) throw new Error("no chapter frame");
      const prompt = skullRecordPromptId(run.play.dayNumber, building);
      // The tower keeps nothing back: "stayed inside" is not a place for a freed skull.
      const inside = skullRecordPromptId(run.play.dayNumber, "inside");
      expect(handleChapterPress(frame.local as ChapterLocal, inside)).toBe(frame.local);
      frame.local = handleChapterPress(frame.local as ChapterLocal, prompt);
      resume(run);
    }
    expect(store.skullsToPlace).toBe(0);
    expect(ensureClock(run.play).skulls[building]).toBe(2);
    // The freed skulls came back from the tower; the supply is spent once, not twice.
    expect(ensureClock(run.play).supply).toBe(supplyBefore - 2);
    expect(chapterResult(run)).toMatchObject({ outcome: "won", chapter: 1, last: false });
    expect(store.entered).toEqual([1]);

    // Then chapter 2's enter runs.
    const next = emptyLoopRuntime();
    startRootLoop(registry, run.seed, 0, next, [], "chapter");
    expect(store.entered).toEqual([1, 2]);
  });

  it("EV-05: without the tower the seals drop out", () => {
    const run = setup({ c3End: false, tower: false });
    script = { 1: { done: ["herald", "ambush"] } };
    start(run);
    const store = ensureChapters(run.play);
    expect(chapterResult(run)).toMatchObject({ outcome: "won", last: false });
    expect(store.brokenSeals).toEqual([]);
    expect(store.boons).toEqual([]);
    expect(store.skullsToPlace).toBe(0);
    expect(store.sealsDroppedOut).toBe(true);
    expect(store.nodes).not.toContain("seal-break");
    expect(run.runtime.prompt).toBeNull();
  });

  it("EV-06: the finale chapter does not win on its quests", () => {
    const run = setup({ c3End: false, tower: true, startChapter: 3 });
    script = { 1: { done: ["lock", "last-stand"] } };
    start(run);
    const store = ensureChapters(run.play);
    expect(chapterResult(run)).toBeUndefined();
    expect(store.towerUnlocked).toBe(true);
    expect(store.nodes).not.toContain("won");
    // The chapter keeps running days.
    expect(run.runtime.stack.map((f) => f.loopId)).toEqual(["chapter", "day"]);
    expect(run.play.dayNumber).toBe(2);
  });

  for (const tower of [true, false]) {
    it(`EV-07: in C3 clearing chapter 1 is the win (tower ${tower})`, () => {
      const run = setup({ c3End: true, tower });
      ensureClock(run.play).held = 2;
      script = { 1: { done: ["herald"] }, 2: { done: ["ambush"] } };
      start(run);
      const store = ensureChapters(run.play);
      expect(chapterResult(run)).toMatchObject({ outcome: "won", chapter: 1, last: true });
      expect(store.nodes).not.toContain("seal-break");
      expect(store.brokenSeals).toEqual([]);
      expect(store.skullsToPlace).toBe(0);
      expect(store.entered).toEqual([1]);
      expect(store.current).toBe(1);
      expect(run.runtime.stack).toEqual([]);
      expect(run.play.dayNumber).toBe(2);
    });
  }

  it("EV-08: the enter runs the challenge step and places chapter 1's tokens only", () => {
    const run = setup({ c3End: true, tower: false });
    start(run);
    const store = ensureChapters(run.play);
    expect(store.nodes.filter((n) => n === "challenge-step")).toHaveLength(1);
    expect(store.tokens).toEqual({
      [spaceIn("N", 0)]: "herald",
      [spaceIn("N", 1)]: "ambush",
    });
    expect(ensureQuests(run.play).bySpace).toEqual(store.tokens);
    expect(store.bounds).toEqual(["N"]);
    expect(store.entered).toEqual([1]);
  });

  it("EV-09: the start emits cue, narration and card, once each and in order", () => {
    const run = setup({ c3End: true, tower: false });
    start(run);
    const store = ensureChapters(run.play);
    expect(store.outputs.map((o) => o.kind)).toEqual(["cue", "narration", "card"]);
    const narration = store.outputs[1];
    expect(narration?.kind === "narration" && narration.copy).toMatch(/^\[COPY: .+\]$/);
    // All of it happens before day 1's Regroup, which is the first day to run.
    expect(store.nodes.indexOf("start:1")).toBeGreaterThan(store.nodes.indexOf("enter:1"));
    expect(run.play.dayNumber).toBe(1);
    const trace = run.effects.filter((e) => e.kind === "loop-trace").map((e) => e.loopId);
    expect(trace.indexOf("day")).toBeGreaterThan(-1);
  });

  it("EV-10: Continue skips the enter and start, and the saved day resumes", () => {
    const first = setup({ c3End: false, tower: false, startChapter: 2 });
    start(first);
    const saved = snapshotChapters(first.play);
    const savedDay = first.play.dayNumber;
    expect(ensureChapters(first.play).outputs).toHaveLength(3);

    // A new process: fresh store from the save, then the loop starts again.
    const again = setup({ c3End: false, tower: false, startChapter: 2 });
    again.play.dayNumber = savedDay - 1;
    const store = restoreChapters(again.play, saved);
    store.outputs = [];
    store.nodes = [];
    store.entered = [...store.entered];
    script = { [savedDay]: { done: ["c2-a"] } };
    start(again);
    expect(store.outputs).toEqual([]);
    expect(store.nodes).not.toContain("challenge-step");
    expect(store.nodes).not.toContain("enter:2");
    expect(store.entered).toEqual([2]);
    // The saved day ran, and the chapter closed on it.
    expect(again.play.dayNumber).toBe(savedDay);
    expect(chapterResult(again)).toMatchObject({ outcome: "won", chapter: 2 });
  });

  it("EV-11: a broken seal and its boon survive Continue", () => {
    const run = setup({ c3End: false, tower: true });
    ensureClock(run.play).held = 2;
    script = { 1: { done: ["herald", "ambush"] } };
    start(run);
    const before = ensureChapters(run.play);
    const broken = [...before.brokenSeals];
    const boons = [...before.boons];
    expect(broken).toHaveLength(1);
    const saved = snapshotChapters(run.play);

    const again = setup({ c3End: false, tower: true });
    const restored = restoreChapters(again.play, saved);
    expect(restored.brokenSeals).toEqual(broken);
    expect(restored.boons).toEqual(boons);
    expect(restored.resumed).toBe(true);
  });
});
