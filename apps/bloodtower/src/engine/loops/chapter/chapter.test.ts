import { afterEach, describe, expect, it } from "vitest";
import type { EngineEffect } from "../../effects.ts";
import {
  advanceLoops,
  emptyLoopRuntime,
  type LoopRuntimeState,
  startRootLoop,
} from "../../loop/runtime.ts";
import type { LoopDefinition, LoopRegistry } from "../../loop/types.ts";
import { checkChapter, ensureClock, markQuestWon, setBuildingSkulls } from "../day/clock.ts";
import type { DayResult } from "../day/loop.ts";
import { skullRecordPromptId } from "../day/skull.ts";
import { openMenu } from "../encounter/picks.ts";
import { groupTurnLoop } from "../group-turn/loop.ts";
import { openQuestAt } from "../quest/quest.ts";
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
import {
  type ChapterLocal,
  type ChapterResult,
  chapterLoop,
  handleChapterPress,
  TABLE_DONE_ACTION,
  tableDonePromptId,
} from "./loop.ts";
import { initPlayState, type PlayState } from "./playState.ts";
import { passChapterBeats } from "./testBeats.ts";

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
    { id: "seal-a", name: "Seal A", glyph: "glyph-a", boon: "boon-a" },
    { id: "seal-b", name: "Seal B", glyph: "glyph-b", boon: "boon-b" },
    { id: "seal-c", name: "Seal C", glyph: "glyph-c", boon: "boon-c" },
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

const advance = (run: Run): void => advanceLoops(registry, run.seed, 0, run.runtime, run.effects);

/** Runs the loops on, ending each chapter beat as the host does (C3/15). */
const resume = (run: Run, options: { stopAtTable?: boolean } = {}): void => {
  advance(run);
  passChapterBeats(run.runtime, run.play, () => advance(run), options);
};

const start = (run: Run, options: { stopAtTable?: boolean } = {}): void => {
  startRootLoop(registry, run.seed, 0, run.runtime, run.effects, "chapter");
  passChapterBeats(run.runtime, run.play, () => advance(run), options);
};

/** The next chapter's frame on the same game, as the game loop opens it after a won chapter. */
const nextChapter = (run: Run, options: { stopAtTable?: boolean } = {}): Run => {
  const next: Run = { ...run, runtime: emptyLoopRuntime(), effects: [] };
  start(next, options);
  return next;
};

/** Set the table's Done, pressed on the chapter frame (PT-21). */
const pressTableDone = (run: Run): void => {
  const frame = chapterFrame(run);
  if (!frame) throw new Error("no chapter frame");
  const local = frame.local as ChapterLocal;
  frame.local = handleChapterPress(local, tableDonePromptId(local.chapter), TABLE_DONE_ACTION);
  resume(run);
};

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

  it("EV-04: with the tower a won chapter breaks a seal; its skulls go back after Set the table", () => {
    const run = setup({ c3End: false, tower: true });
    ensureClock(run.play).held = 2;
    script = { 1: { done: ["herald", "ambush"] } };
    start(run);
    const store = ensureChapters(run.play);
    expect(store.brokenSeals).toHaveLength(1);
    const sealed = PLAN.seals.find((s) => s.id === store.brokenSeals[0]);
    expect(store.boons).toEqual([sealed?.boon]);
    expect(store.skullsToPlace).toBe(2);
    // C3/15 (PT-21): the story first. Chapter 1 closes won, and no skull prompt shows yet.
    expect(chapterResult(run)).toMatchObject({ outcome: "won", chapter: 1, last: false });
    expect(store.entered).toEqual([1]);
    const order = ["stamp:1", "close:1"].map((n) => store.nodes.indexOf(n));
    expect(order.every((at, k) => at >= 0 && (k === 0 || at > (order[k - 1] ?? 0)))).toBe(true);

    // Chapter 2's card, the seal's Reveal, then Set the table, which waits for Done.
    const two = nextChapter(run, { stopAtTable: true });
    expect(store.entered).toEqual([1, 2]);
    const beats = ["card:2", "reveal:2", "table.shown:2"].map((n) => store.nodes.indexOf(n));
    expect(beats.every((at, k) => at >= 0 && (k === 0 || at > (beats[k - 1] ?? 0)))).toBe(true);
    expect(store.table).toEqual({ chapter: 2, seal: sealed, skulls: 2, quests: ["c2-a"] });
    expect(two.runtime.prompt?.promptId).toBe("table-done--2");

    // Only after Done: the two freed-skull prompts (DEC-409).
    pressTableDone(two);
    expect(store.table).toBeNull();
    expect(two.runtime.prompt?.promptId).toContain("skull-record--");
    const supplyBefore = ensureClock(run.play).supply;
    const building = spaceIn("N", 0);
    for (let i = 0; i < 2; i++) {
      const frame = chapterFrame(two);
      if (!frame) throw new Error("no chapter frame");
      const prompt = skullRecordPromptId(run.play.dayNumber, building);
      frame.local = handleChapterPress(frame.local as ChapterLocal, prompt);
      resume(two);
    }
    expect(store.skullsToPlace).toBe(0);
    expect(ensureClock(run.play).skulls[building]).toBe(2);
    // The freed skulls came back from the tower; the supply is spent once, not twice.
    expect(ensureClock(run.play).supply).toBe(supplyBefore - 2);
    // Then chapter 2's first day.
    expect(two.runtime.stack.map((f) => f.loopId)).toEqual(["chapter", "day"]);
    expect(store.pending).toBeNull();
  });

  it("EV-04b: a freed skull that stayed inside is consumed like a placement", () => {
    const run = setup({ c3End: false, tower: true });
    ensureClock(run.play).held = 2;
    script = { 1: { done: ["herald", "ambush"] } };
    start(run);
    const store = ensureChapters(run.play);
    expect(store.skullsToPlace).toBe(2);
    const two = nextChapter(run);
    for (let i = 0; i < 2; i++) {
      const frame = chapterFrame(two);
      if (!frame) throw new Error("no chapter frame");
      const inside = skullRecordPromptId(run.play.dayNumber, "inside");
      const next = handleChapterPress(frame.local as ChapterLocal, inside);
      expect(next.awaitingPress).toBe(false);
      expect(store.skullsToPlace).toBe(1 - i);
      frame.local = next;
      resume(two);
    }
    expect(store.skullsToPlace).toBe(0);
    expect(two.runtime.stack.map((f) => f.loopId)).toEqual(["chapter", "day"]);
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
    // The start is not replayed; the only output is the win's stamp cue (C3/15).
    expect(store.outputs).toEqual([{ kind: "cue", chapter: 2, cue: "CUE-005" }]);
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

  it("EV-12: Continue mid-placement resumes the placement, then chapter 2's days play", () => {
    const run = setup({ c3End: false, tower: true });
    ensureClock(run.play).held = 2;
    script = { 1: { done: ["herald", "ambush"] } };
    start(run);
    const two = nextChapter(run);
    const building = spaceIn("N", 0);
    const frame = chapterFrame(two);
    if (!frame) throw new Error("no chapter frame");
    frame.local = handleChapterPress(
      frame.local as ChapterLocal,
      skullRecordPromptId(run.play.dayNumber, building),
    );
    resume(two);
    const saved = snapshotChapters(run.play);
    const savedDay = run.play.dayNumber;
    expect(ensureChapters(run.play).skullsToPlace).toBe(1);

    // A new process: the store comes from the save, then the loop starts again.
    const again = setup({ c3End: false, tower: true });
    again.play.dayNumber = savedDay;
    const store = restoreChapters(again.play, saved);
    script = { 2: { done: ["c2-a"] } };
    start(again);
    // Still placing the last freed skull: no day ran, no card or table again, no second enter.
    expect(again.play.dayNumber).toBe(savedDay);
    expect(store.entered).toEqual([1, 2]);
    expect(store.nodes.filter((n) => n === "table.done:2")).toHaveLength(1);
    expect(again.runtime.prompt?.promptId).toContain("skull-record--");
    expect(chapterResult(again)).toBeUndefined();

    const resumedFrame = chapterFrame(again);
    if (!resumedFrame) throw new Error("no chapter frame");
    resumedFrame.local = handleChapterPress(
      resumedFrame.local as ChapterLocal,
      skullRecordPromptId(again.play.dayNumber, building),
    );
    resume(again);
    expect(store.skullsToPlace).toBe(0);
    // Chapter 2 entered once, and its day plays on to a win.
    expect(store.nodes.filter((n) => n === "enter:2")).toHaveLength(1);
    expect(again.play.dayNumber).toBe(savedDay + 1);
    expect(store.bounds).toEqual(["N", "E"]);
    expect(chapterResult(again)).toMatchObject({ outcome: "won", chapter: 2 });
  });
});

/*
 * D1 / 01-skull-loss-dispatch: a freed skull that fells the fourth building loses the game at once
 * (DEC-905 as amended by DEC-933, DEC-938). The C3/09 EV-04 fixture: tower, held 2, the break frees 2.
 */
describe("D1 a freed skull that loses the game", () => {
  /** Three buildings fallen (south and west) and one at 3, then the won chapter breaks a seal. */
  const toBreak = (): { run: Run; fatal: string } => {
    const run = setup({ c3End: false, tower: true });
    ensureClock(run.play).held = 2;
    for (const id of [spaceIn("S", 0), spaceIn("S", 1), spaceIn("W", 0)]) {
      setBuildingSkulls(run.play, id, 4);
    }
    const fatal = spaceIn("W", 1);
    setBuildingSkulls(run.play, fatal, 3);
    script = { 1: { done: ["herald", "ambush"] } };
    start(run);
    // C3/15 (PT-21): the freed skulls are asked after chapter 2's card and Set the table's Done.
    return { run: nextChapter(run), fatal };
  };

  const pressFreed = (run: Run, target: string): void => {
    const frame = chapterFrame(run);
    if (!frame) throw new Error("no chapter frame");
    frame.local = handleChapterPress(
      frame.local as ChapterLocal,
      skullRecordPromptId(run.play.dayNumber, target),
    );
    // Clear the open prompt, so a prompt offered after this press is the only one left to see.
    run.runtime.prompt = null;
    resume(run);
  };

  const expectLostAtFirstFreedSkull = (run: Run, dayBefore: number): void => {
    const store = ensureChapters(run.play);
    expect(ensureClock(run.play).outcome).toEqual({ lost: true, reason: "buildings" });
    // The second freed skull is never asked and never counted.
    expect(store.skullsToPlace).toBe(1);
    expect(run.runtime.prompt).toBeNull();
    // The record names the chapter that closed (DEC-938), not the one whose card showed.
    expect(chapterResult(run)).toMatchObject({
      outcome: "lost",
      reason: "buildings",
      chapter: 1,
      last: false,
    });
    // PT-21 put chapter 2's card (its enter) before the freed skulls; its days never start.
    expect(store.entered).toEqual([1, 2]);
    expect(store.pending).toBeNull();
    expect(run.play.dayNumber).toBe(dayBefore);
    expect(run.runtime.stack).toEqual([]);
  };

  it("EV-05: the first freed skull fells the fourth building; the rest are never asked", () => {
    const { run, fatal } = toBreak();
    const store = ensureChapters(run.play);
    const day = run.play.dayNumber;
    expect(store.skullsToPlace).toBe(2);
    expect(run.runtime.prompt?.promptId).toContain("skull-record--");
    pressFreed(run, fatal);
    expectLostAtFirstFreedSkull(run, day);
    // A second press on any standing building changes nothing.
    const before = { ...ensureClock(run.play).skulls };
    const frame = chapterFrame(run);
    const other = spaceIn("N", 2);
    if (frame) {
      handleChapterPress(
        frame.local as ChapterLocal,
        skullRecordPromptId(run.play.dayNumber, other),
      );
    }
    expect(ensureClock(run.play).skulls).toEqual(before);
    expect(store.skullsToPlace).toBe(1);
  });

  it("EV-11: Continue mid freed-skull placement, then the fatal skull loses the same way", () => {
    const first = toBreak();
    const saved = snapshotChapters(first.run.play);
    const savedDay = first.run.play.dayNumber;
    expect(ensureChapters(first.run.play).skullsToPlace).toBe(2);

    // A new process: the store comes from the save; the board's skulls come back too.
    const again = setup({ c3End: false, tower: true });
    again.play.dayNumber = savedDay;
    for (const id of [spaceIn("S", 0), spaceIn("S", 1), spaceIn("W", 0)]) {
      setBuildingSkulls(again.play, id, 4);
    }
    setBuildingSkulls(again.play, first.fatal, 3);
    const store = restoreChapters(again.play, saved);
    script = { 2: { done: ["c2-a"] } };
    start(again);
    // Still placing: no seal broke again, no skulls freed again, chapter 2 not entered twice.
    expect(store.brokenSeals).toHaveLength(1);
    expect(store.skullsToPlace).toBe(2);
    expect(store.entered).toEqual([1, 2]);
    expect(again.runtime.prompt?.promptId).toContain("skull-record--");

    pressFreed(again, first.fatal);
    expectLostAtFirstFreedSkull(again, savedDay);
  });
});

describe("D4 a later chapter's quest on a fallen building", () => {
  it("EV-08: chapter 2's quest is placed on the fallen building and works the same (DEC-942)", () => {
    const run = setup({ c3End: false, tower: false });
    const fallen = spaceIn("E", 0);
    setBuildingSkulls(run.play, fallen, 4);
    script = { 1: { done: ["herald", "ambush"] } };
    start(run);
    expect(chapterResult(run)).toMatchObject({ outcome: "won", chapter: 1, last: false });
    // Chapter 2 enters on the next run of the chapter loop.
    startRootLoop(registry, run.seed, 0, emptyLoopRuntime(), [], "chapter");
    expect(ensureChapters(run.play).entered).toEqual([1, 2]);
    expect(openQuestAt(run.play, fallen)).toBe("c2-a");
    const holders = Object.entries(ensureQuests(run.play).bySpace).filter(
      ([, id]) => id === "c2-a",
    );
    expect(holders).toEqual([[fallen, "c2-a"]]);

    const group = run.play.groups[0];
    if (!group) throw new Error("no group");
    group.spaceId = fallen;
    group.insideBuilding = false;
    const offers: string[] = [];
    groupTurnLoop.body(
      {
        groupId: group.id,
        movesLeft: 2,
        awaitingPress: false,
        encounterPending: false,
        landedOnBuildingWithNoMoves: false,
      },
      {
        loopId: "group-turn",
        seed: run.seed,
        eventSeq: 1,
        effects: [],
        tracePhase: () => {},
        recordEnd: () => {},
        offerPrompt: (promptId) => offers.push(promptId),
        startChild: () => {},
        setParentResult: () => {},
        getParentResult: () => undefined,
      },
    );
    expect(offers).toContain(`enter--${group.id}--${fallen}`);
    const opened = openMenu(run.play, group.id);
    expect(opened.ok && opened.entries.map((entry) => entry.label)).toEqual(["Quest", "Leave"]);
  });
});
