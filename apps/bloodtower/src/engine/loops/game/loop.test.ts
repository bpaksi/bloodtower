import { afterEach, describe, expect, it } from "vitest";
import type { EngineEffect } from "../../effects.ts";
import { emptyLoopRuntime, type LoopRuntimeState, startRootLoop } from "../../loop/runtime.ts";
import type { LoopDefinition, LoopRegistry } from "../../loop/types.ts";
import { type ChapterPlan, configureChapters, ensureChapters } from "../chapter/chapters.ts";
import { chapterLoop } from "../chapter/loop.ts";
import { initPlayState, type PlayState } from "../chapter/playState.ts";
import { checkChapter, ensureClock, markQuestWon, setBuildingSkulls } from "../day/clock.ts";
import type { DayResult } from "../day/loop.ts";
import { ensureQuests } from "../quest/store.ts";
import type { ShellEffect } from "../session/effects.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { bindShellState, clearShellState } from "../session/shellRef.ts";
import { initialShellState, type ShellState } from "../session/state.ts";
import { type LossWay, lossSceneId, pickWinLine } from "./end.ts";
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
  seals: [{ id: "seal-a", glyph: "glyph-a", boon: "boon-a" }],
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
    const clock = ensureClock(play);
    if (step.supply !== undefined) clock.supply = step.supply;
    clock.outcome = step.corruption ? { lost: true, reason: "corruption" } : checkChapter(clock);
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

const setup = (options: { c3End: boolean }): Run => {
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
  configureChapters(play, { ...PLAN, c3EndAfterChapter1: options.c3End });
  return { shell, play, runtime: emptyLoopRuntime(), effects: [] };
};

const start = (run: Run): void =>
  startRootLoop(registry, "game-loop", 0, run.runtime, run.effects, "game");

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
