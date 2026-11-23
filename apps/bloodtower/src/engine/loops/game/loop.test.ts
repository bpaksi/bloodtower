import { afterEach, describe, expect, it } from "vitest";
import type { EngineEffect } from "../../effects.ts";
import {
  advanceLoops,
  emptyLoopRuntime,
  type LoopRuntimeState,
  startRootLoop,
} from "../../loop/runtime.ts";
import type { LoopDefinition, LoopRegistry } from "../../loop/types.ts";
import { type ChapterPlan, configureChapters, ensureChapters } from "../chapter/chapters.ts";
import { type ChapterLocal, chapterLoop, handleChapterPress } from "../chapter/loop.ts";
import { initPlayState, type PlayState } from "../chapter/playState.ts";
import { passChapterBeats } from "../chapter/testBeats.ts";
import {
  checkChapter,
  ensureClock,
  markQuestWon,
  recordBuildingDrop,
  setBuildingSkulls,
} from "../day/clock.ts";
import type { DayResult } from "../day/loop.ts";
import { skullRecordPromptId } from "../day/skull.ts";
import { ensureQuests } from "../quest/store.ts";
import type { ShellEffect } from "../session/effects.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { bindShellState, clearShellState } from "../session/shellRef.ts";
import { initialShellState, type ShellState } from "../session/state.ts";
import { CHAPTER_3_WIN_COPY, gameEndFrom, type LossWay, lossSceneId, pickWinLine } from "./end.ts";
import { type GameResult, gameLoop } from "./loop.ts";

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
  seals: [{ id: "seal-a", name: "Seal A", glyph: "glyph-a", boon: "boon-a" }],
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
    { id: "ch-3", index: 3, kingdoms: ["S"], quests: [{ id: "c3-a", spaceId: spaceIn("S", 0) }] },
  ],
};

/** What the stand-in day does on a day number: finish quests, fall buildings, set the supply. */
type DayScript = {
  done?: string[];
  supply?: number;
  /** Space ids that fall (4 skulls) on this day. */
  fall?: string[];
  /** A third corruption loses the game on this day (DEC-676). */
  corruption?: boolean;
  /** Skull counts set before the night's drops (D1). */
  skulls?: Record<string, number>;
  /** The buildings the night's skulls land on, in order, through the real clock (D1). */
  drops?: string[];
};
let script: Record<number, DayScript> = {};
const holder: { play: PlayState } = { play: undefined as unknown as PlayState };

/* A stand-in for the day loop that asks the real clock check for its result (MEC-033 .11). */
const standInDay: LoopDefinition<{ n: number }, DayResult> = {
  id: "day",
  enter: () => {
    holder.play.dayNumber += 1;
    return { n: holder.play.dayNumber };
  },
  body: (local, ctx) => {
    const play = holder.play;
    const step = script[local.n];
    if (!step) {
      ctx.offerPrompt(`day-${local.n}-wait`, "continue");
      return { local, passComplete: false };
    }
    for (const id of step.done ?? []) {
      ensureQuests(play).done.push(id);
      markQuestWon(play);
    }
    for (const space of step.fall ?? []) setBuildingSkulls(play, space, 4);
    for (const [space, count] of Object.entries(step.skulls ?? {})) {
      setBuildingSkulls(play, space, count);
    }
    const clock = ensureClock(play);
    if (step.supply !== undefined) clock.supply = step.supply;
    // The night's skulls go through the real clock; a lost game refuses the ones after it (D1).
    for (const space of step.drops ?? []) {
      const kingdom = play.content.board.spaceById.get(space)?.kingdom;
      if (kingdom) recordBuildingDrop(play, space, kingdom);
    }
    if (step.corruption) clock.outcome = { lost: true, reason: "corruption" };
    else if (!clock.outcome?.lost) clock.outcome = checkChapter(clock);
    return { local, passComplete: true };
  },
  exit: () => true,
  resultUp: () => {
    const outcome = ensureClock(holder.play).outcome;
    return {
      dayNumber: holder.play.dayNumber,
      lost: outcome?.lost ? { reason: outcome.reason } : null,
    } as DayResult;
  },
};

const registry: LoopRegistry = {
  game: gameLoop as LoopRegistry[string],
  chapter: chapterLoop as LoopRegistry[string],
  day: standInDay as LoopRegistry[string],
};

type Run = {
  shell: ShellState;
  play: PlayState;
  runtime: LoopRuntimeState;
  effects: EngineEffect[];
};

const setup = (options: { c3End: boolean; c4End?: boolean }): Run => {
  script = {};
  const shell = initialShellState({ sessionId: "t", seed: "game-loop" });
  shell.screen = "play";
  shell.stage = "playing";
  shell.activeGameId = "game-1";
  shell.openingIndex = -1;
  const play = initPlayState("game-loop", PROVING_GROUNDS_PLAY);
  shell.play = play;
  shell.autosave = { gameId: "game-1", packId: "test", seed: "game-loop", day: 1 };
  holder.play = play;
  bindShellState(shell);
  configureChapters(play, {
    ...PLAN,
    c3EndAfterChapter1: options.c3End,
    c4EndAfterChapter3: options.c4End ?? false,
  });
  return { shell, play, runtime: emptyLoopRuntime(), effects: [] };
};

const advance = (run: Run): void =>
  advanceLoops(registry, "game-loop", 0, run.runtime, run.effects);

/** Starts the game, ending each chapter beat as the host does (C3/15). */
const start = (run: Run, options: { stopAtTable?: boolean } = {}): void => {
  startRootLoop(registry, "game-loop", 0, run.runtime, run.effects, "game");
  passChapterBeats(run.runtime, run.play, () => advance(run), options);
};

const gameResult = (run: Run): GameResult | undefined => {
  const end = run.effects.find((e) => e.kind === "loop-end" && e.loopId === "game");
  return end && "result" in end ? (end.result as GameResult) : undefined;
};

const records = (run: Run) =>
  (run.effects as unknown as ShellEffect[]).filter((e) => e.kind === "game-record");

afterEach(() => {
  clearShellState();
});

describe("game loop end (MEC-032)", () => {
  it("EV-01: a lost chapter 2 ends the game lost; chapter 3 never opens", () => {
    const run = setup({ c3End: false });
    script = { 1: { done: ["herald", "ambush"] }, 2: { supply: 0 } };
    start(run);
    expect(gameResult(run)).toMatchObject({ outcome: "lost", reason: "skulls" });
    expect(gameResult(run)?.sceneId).toBe(lossSceneId("skulls"));
    expect(ensureChapters(run.play).entered).toEqual([1, 2]);
    expect(records(run)).toHaveLength(1);
    expect(records(run)[0]).toMatchObject({ gameId: "game-1", outcome: "lost", how: "skulls" });
  });

  it("EV-01: a chapter 1 win with more chapters opens chapter 2, and the game goes on", () => {
    const run = setup({ c3End: false });
    script = { 1: { done: ["herald", "ambush"] } };
    start(run);
    expect(gameResult(run)).toBeUndefined();
    expect(ensureChapters(run.play).entered).toEqual([1, 2]);
    expect(records(run)).toHaveLength(0);
  });

  it("EV-07: in C3 clearing chapter 1 wins the game; no chapter 2", () => {
    const run = setup({ c3End: true });
    script = { 1: { done: ["herald", "ambush"] } };
    start(run);
    expect(gameResult(run)).toMatchObject({ outcome: "won", sceneId: "win" });
    expect(ensureChapters(run.play).entered).toEqual([1]);
    expect(records(run)).toHaveLength(1);
    expect(records(run)[0]).toMatchObject({ outcome: "won", how: "won", sceneId: "win" });
  });

  it("C4-01 EV-02: with the C4 switches, a chapter 1 win opens chapter 2 and ends nothing", () => {
    const run = setup({ c3End: false, c4End: true });
    script = { 1: { done: ["herald", "ambush"] } };
    start(run);
    expect(gameResult(run)).toBeUndefined();
    expect(ensureChapters(run.play).entered).toEqual([1, 2]);
    expect(records(run)).toHaveLength(0);
  });

  it("C4-01 EV-03: chapter 3 won ends the C4 game won, with end chapter_3 and no chapter 4", () => {
    const run = setup({ c3End: false, c4End: true });
    script = {
      1: { done: ["herald", "ambush"] },
      2: { done: ["c2-a"] },
      3: { done: ["c3-a"] },
    };
    start(run);
    expect(gameResult(run)).toMatchObject({ outcome: "won", sceneId: "win" });
    expect(ensureChapters(run.play).entered).toEqual([1, 2, 3]);
    expect(
      gameEndFrom({ chapterId: "ch-3", chapter: 3, outcome: "won", last: true, end: "chapter_3" }),
    ).toEqual({
      outcome: "won",
      sceneId: "win",
      chapter: 3,
      end: "chapter_3",
    });
    expect(CHAPTER_3_WIN_COPY).toBe(
      '[COPY: chapter 3 win, Loremaster = "The Lock is turned and the last stand held. The Warden\'s door is open, for now."]',
    );
    expect(records(run)).toHaveLength(1);
    expect(records(run)[0]).toMatchObject({ outcome: "won", how: "won", sceneId: "win" });
  });

  it("C4-01 EV-03: with the C4 switch off, chapter 3 won does not end the game", () => {
    const run = setup({ c3End: false, c4End: false });
    script = {
      1: { done: ["herald", "ambush"] },
      2: { done: ["c2-a"] },
      3: { done: ["c3-a"] },
    };
    start(run);
    expect(ensureChapters(run.play).entered).toEqual([1, 2, 3]);
  });

  it("EV-08: a finished game clears the autosave in the shell", () => {
    const run = setup({ c3End: true });
    script = { 1: { done: ["herald", "ambush"] } };
    start(run);
    expect(run.shell.autosave).toBeNull();
  });

  it("EV-02: each way to lose picks its own scene id", () => {
    const seen = new Map<LossWay, string | undefined>();
    const ways: Array<[LossWay, DayScript]> = [
      ["skulls", { supply: 0 }],
      ["corruption", { corruption: true }],
      [
        "buildings",
        { fall: [0, 1, 2, 3].map((n) => spaceIn(["N", "E", "S", "W"][n] as string, 0)) },
      ],
    ];
    for (const [way, day] of ways) {
      const run = setup({ c3End: false });
      script = { 1: day };
      start(run);
      expect(gameResult(run)).toMatchObject({ outcome: "lost", reason: way });
      seen.set(way, gameResult(run)?.sceneId);
      clearShellState();
    }
    expect([...seen.values()]).toEqual(["loss-skulls", "loss-corruption", "loss-buildings"]);
    expect(new Set(seen.values()).size).toBe(3);
  });

  it("EV-10: four fallen buildings anywhere lose the game, in one kingdom or four", () => {
    const four = (kingdoms: string[]): string[] => {
      const used = new Map<string, number>();
      return kingdoms.map((k) => {
        const n = used.get(k) ?? 0;
        used.set(k, n + 1);
        return spaceIn(k, n);
      });
    };
    // (a) one in each of four kingdoms; (b) two and two across two kingdoms.
    for (const kingdoms of [
      ["N", "E", "S", "W"],
      ["N", "N", "E", "E"],
    ]) {
      const run = setup({ c3End: false });
      script = { 1: { fall: four(kingdoms) } };
      start(run);
      expect(gameResult(run)).toMatchObject({ outcome: "lost", reason: "buildings" });
      expect(gameResult(run)?.sceneId).toBe("loss-buildings");
      clearShellState();
    }
    // (c) three fallen in three kingdoms, supply above 0: the game goes on.
    const run = setup({ c3End: false });
    script = { 1: { fall: four(["N", "E", "S"]), supply: 5 } };
    start(run);
    expect(gameResult(run)).toBeUndefined();
    expect(records(run)).toHaveLength(0);
  });
});

/*
 * D1 / 01-skull-loss-dispatch EV-07: a game lost at a skull closes once, with the reason, and
 * nothing after it starts. The stand-in day sends the night's skulls through the real clock.
 */
describe("D1 EV-07 the game end runs once with the reason", () => {
  const closes = (run: Run) =>
    run.effects.filter((e) => e.kind === "loop-end" && e.loopId === "game");

  const expectOneLoss = (run: Run, reason: "skulls" | "buildings", scene: string) => {
    expect(closes(run)).toHaveLength(1);
    expect(gameResult(run)).toMatchObject({ outcome: "lost", reason, sceneId: scene });
    expect(records(run)).toHaveLength(1);
    expect(records(run)[0]).toMatchObject({ outcome: "lost", how: reason, sceneId: scene });
    expect(records(run).filter((r) => r.outcome === "won")).toEqual([]);
    expect(run.play.dayNumber).toBe(1);
  };

  it("a simulated night: the second skull after a fallen fourth building is refused", () => {
    const run = setup({ c3End: false });
    const east = [0, 1, 2, 3].map((n) => spaceIn("E", n));
    script = {
      1: {
        supply: 10,
        skulls: {
          [east[0] as string]: 4,
          [east[1] as string]: 4,
          [east[2] as string]: 4,
          [east[3] as string]: 3,
        },
        drops: [east[3] as string, spaceIn("N", 2)],
      },
    };
    start(run);
    expectOneLoss(run, "buildings", "loss-buildings");
    expect(ensureChapters(run.play).entered).toEqual([1]);
    expect(ensureClock(run.play).supply).toBe(9);
    expect(ensureClock(run.play).nightDrops).toHaveLength(1);
  });

  it("the last skull from the supply: the next is refused", () => {
    const run = setup({ c3End: false });
    script = { 1: { supply: 1, drops: [spaceIn("N", 2), spaceIn("N", 3)] } };
    start(run);
    expectOneLoss(run, "skulls", "loss-skulls");
    expect(ensureChapters(run.play).entered).toEqual([1]);
    expect(ensureClock(run.play).supply).toBe(0);
    expect(ensureClock(run.play).nightDrops).toHaveLength(1);
  });

  it("a freed skull that fells the fourth building: chapter 1 is named, chapter 2's days never start", () => {
    const run = setup({ c3End: false });
    run.shell.towerLinked = true;
    ensureClock(run.play).held = 2;
    for (const id of [spaceIn("S", 0), spaceIn("S", 1), spaceIn("W", 0)]) {
      setBuildingSkulls(run.play, id, 4);
    }
    const fatal = spaceIn("W", 1);
    setBuildingSkulls(run.play, fatal, 3);
    script = { 1: { done: ["herald", "ambush"] } };
    start(run);
    expect(gameResult(run)).toBeUndefined();
    const frame = run.runtime.stack.find((f) => f.loopId === "chapter");
    if (!frame) throw new Error("no chapter frame");
    frame.local = handleChapterPress(
      frame.local as ChapterLocal,
      skullRecordPromptId(run.play.dayNumber, fatal),
    );
    advance(run);
    expectOneLoss(run, "buildings", "loss-buildings");
    // PT-21: chapter 2's card (its enter) and Set the table came before the freed skulls.
    expect(ensureChapters(run.play).entered).toEqual([1, 2]);
    expect(run.play.dayNumber).toBe(1);
    expect(run.shell.autosave).toBeNull();
  });
});

describe("the win line follows the last choice (EV-03, DEC-664)", () => {
  const lines = [
    { id: "win-break", when: { type: "flag" as const, flag: "ending-break", value: true } },
    { id: "win-oath", when: { type: "flag" as const, flag: "ending-oath", value: true } },
  ];
  it("each flag plays its own closing line id", () => {
    expect(pickWinLine(lines, new Set(["ending-break"]))).toBe("win-break");
    expect(pickWinLine(lines, new Set(["ending-oath"]))).toBe("win-oath");
  });
  it("no flag plays no line, never a wrong one", () => {
    expect(pickWinLine(lines, new Set())).toBeNull();
  });
});
