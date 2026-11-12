import type { LoopDefinition } from "../../loop/types.ts";
import { ensureClock, noteNode } from "../day/clock.ts";
import type { DayResult } from "../day/loop.ts";
import { applySkullRecord, offerSkullPlacement, parseSkullRecordPrompt } from "../day/skull.ts";
import { ensureQuests } from "../quest/store.ts";
import { shellState } from "../session/shellRef.ts";
import {
  type ChapterStore,
  chapterDef,
  endsGame,
  ensureChapters,
  isFinale,
  tryChapters,
} from "./chapters.ts";
import { nextPlayRng, type PlayState, playState } from "./playState.ts";

export type ChapterPhase = "days" | "place" | "done";

export type ChapterLocal = {
  awaitingDayResult: boolean;
  lastFinishedDay: number;
  /** The chapter this frame runs; 0 for a game with no chapter plan. */
  chapter: number;
  phase: ChapterPhase;
  /** Continue resumed this chapter: enter and start were skipped (DEC-675). */
  resumed: boolean;
  outcome: ChapterOutcome | null;
  awaitingPress: boolean;
};

export type ChapterOutcome = { kind: "won" | "lost"; reason?: "skulls" | "buildings" };

export type ChapterResult = {
  chapterId: string;
  chapter?: number;
  outcome?: "won" | "lost";
  reason?: "skulls" | "buildings";
  /** Won and last: the game ends (C3 chapter 1, or the finale). */
  last?: boolean;
};

const blankLocal = (): ChapterLocal => ({
  awaitingDayResult: false,
  lastFinishedDay: 0,
  chapter: 0,
  phase: "days",
  resumed: false,
  outcome: null,
  awaitingPress: false,
});

const note = (store: ChapterStore, node: string): void => {
  store.nodes.push(node);
};

/** MEC-033 enter: the challenge step, the board bounds, the quest tokens (DEC-133, 134, 146). */
const enterChapter = (play: PlayState, store: ChapterStore, chapter: number): void => {
  const def = chapterDef(store, chapter);
  note(store, `enter:${chapter}`);
  note(store, "challenge-step");
  store.entered.push(chapter);
  const bounds = new Set<string>();
  for (const c of store.plan.chapters) {
    if (c.index <= chapter) for (const k of c.kingdoms) bounds.add(k);
  }
  store.bounds = [...bounds] as ChapterStore["bounds"];
  // DEC-185: the foe level steps up each chapter.
  store.foeLevel = store.plan.foeLevel.chapter1 + (chapter - 1) * store.plan.foeLevel.perChapter;
  const quests = ensureQuests(play);
  for (const quest of def.quests) {
    store.tokens[quest.spaceId] = quest.id;
    quests.bySpace[quest.spaceId] = quest.id;
  }
};

/** MEC-033 start: the cue, the narration hook and the chapter card, once each, in order. */
const startChapter = (play: PlayState, store: ChapterStore, chapter: number): void => {
  const def = chapterDef(store, chapter);
  const quests = ensureQuests(play);
  const done = def.quests.filter((q) => quests.done.includes(q.id)).length;
  note(store, `start:${chapter}`);
  store.outputs.push({ kind: "cue", chapter });
  store.outputs.push({ kind: "narration", chapter, copy: `[COPY: chapter-${chapter}-start]` });
  store.outputs.push({
    kind: "card",
    chapter,
    questsDone: done,
    questsTotal: def.quests.length,
    kingdoms: [...store.bounds],
  });
};

const questsAllDone = (play: PlayState, store: ChapterStore, chapter: number): boolean => {
  const done = ensureQuests(play).done;
  return chapterDef(store, chapter).quests.every((q) => done.includes(q.id));
};

/**
 * MEC-033 close, with the tower: one seal breaks, its glyph's boon takes effect and the
 * skulls it frees go back on the board (DEC-303, DEC-409). The app picks the seal (Q-C3-17).
 */
const breakSeal = (play: PlayState, store: ChapterStore, seed: string): number => {
  const clock = ensureClock(play);
  const open = store.plan.seals.filter((s) => !store.brokenSeals.includes(s.id));
  const seal = open.length > 0 ? nextPlayRng(seed, play).pick(open) : null;
  if (!seal) return 0;
  note(store, "seal-break");
  store.brokenSeals.push(seal.id);
  store.boons.push(seal.boon);
  const min = Math.min(store.plan.sealBreakMin, clock.held);
  const freed = nextPlayRng(seed, play).int(min, clock.held);
  // A held skull already left the supply; placing it again must not spend it twice.
  clock.held -= freed;
  clock.supply += freed;
  store.skullsToPlace = freed;
  return freed;
};

type BodyCtx = { offerPrompt: (promptId: string, actionId: string) => void };

/** MEC-033 .25 to .29: freed skulls go back on the board, one prompt at a time (DEC-409). */
const placeStep = (
  local: ChapterLocal,
  store: ChapterStore,
  play: PlayState,
  ctx: BodyCtx,
): { local: ChapterLocal; passComplete: boolean } => {
  if (store.skullsToPlace < 1) {
    store.placing = null;
    return { local: { ...local, phase: "done" }, passComplete: true };
  }
  if (local.awaitingPress) return { local, passComplete: false };
  note(store, ".25");
  offerSkullPlacement(play.dayNumber, ctx);
  return { local: { ...local, awaitingPress: true }, passComplete: false };
};

export const chapterLoop: LoopDefinition<ChapterLocal, ChapterResult> = {
  id: "chapter",
  enter: () => {
    const play = playState();
    const store = tryChapters(play);
    if (!store) return blankLocal();
    const local: ChapterLocal = { ...blankLocal(), chapter: store.current };
    if (store.resumed) {
      store.resumed = false;
      // Saved mid-placement: the won chapter's frame is still open; `current` is the next one.
      if (store.placing)
        return {
          ...local,
          chapter: store.placing,
          phase: "place",
          outcome: { kind: "won" },
          resumed: true,
        };
      return { ...local, resumed: true };
    }
    enterChapter(play, store, store.current);
    return local;
  },
  startPoint: (local) => {
    const play = playState();
    const store = tryChapters(play);
    if (!store || local.resumed) return;
    startChapter(play, store, local.chapter);
  },
  body: (local, ctx) => {
    const play = playState();
    const store = tryChapters(play);

    if (store && local.phase === "place") return placeStep(local, store, play, ctx);

    if (local.awaitingDayResult) {
      const finished = ctx.getParentResult() as Partial<DayResult> | undefined;
      if (!finished?.dayNumber || finished.dayNumber <= local.lastFinishedDay) {
        return { local, passComplete: false };
      }
      local = { ...local, awaitingDayResult: false, lastFinishedDay: finished.dayNumber };

      if (store) {
        const seed = shellState().seed;
        // MEC-033 .11: a loss on the day of a finish is a loss (DEC-086).
        if (finished.lost) {
          note(store, "lost");
          return {
            local: {
              ...local,
              phase: "done",
              outcome: { kind: "lost", reason: finished.lost.reason },
            },
            passComplete: true,
          };
        }
        const finale = isFinale(store, local.chapter);
        if (finale && questsAllDone(play, store, local.chapter)) store.towerUnlocked = true;
        const won = finale ? store.towerWon : questsAllDone(play, store, local.chapter);
        if (won) {
          note(store, "won");
          const outcome: ChapterOutcome = { kind: "won" };
          if (endsGame(store, local.chapter) || finale) {
            return { local: { ...local, phase: "done", outcome }, passComplete: true };
          }
          store.current = local.chapter + 1;
          if (shellState().towerLinked) {
            store.placing = local.chapter;
            breakSeal(play, store, seed);
            return placeStep({ ...local, phase: "place", outcome }, store, play, ctx);
          }
          // DEC-306: no tower, the seals drop out; no boon, no skulls.
          store.sealsDroppedOut = true;
          return { local: { ...local, phase: "done", outcome }, passComplete: true };
        }
      }
    }

    play.childInput = null;
    ctx.startChild("day");
    return { local: { ...local, awaitingDayResult: true }, passComplete: false };
  },
  exit: (local) => {
    const store = tryChapters(playState());
    return store ? local.phase === "done" : false;
  },
  resultUp: (local) => {
    const play = playState();
    const store = tryChapters(play);
    if (!store) return { chapterId: "proving-grounds" };
    const def = chapterDef(store, local.chapter);
    const won = local.outcome?.kind === "won";
    const result: ChapterResult = {
      chapterId: def.id,
      chapter: local.chapter,
      outcome: local.outcome?.kind ?? "lost",
      last: won && (endsGame(store, local.chapter) || isFinale(store, local.chapter)),
    };
    if (local.outcome?.reason) result.reason = local.outcome.reason;
    return result;
  },
};

/**
 * A freed skull was placed (MEC-033 .25 to .29). Called by the press router with the chapter
 * frame's local; returns the new local.
 */
export const handleChapterPress = (local: ChapterLocal, promptId: string): ChapterLocal => {
  const play = playState();
  const store = ensureChapters(play);
  const record = parseSkullRecordPrompt(promptId);
  if (local.phase !== "place" || !record) return local;
  if (!applySkullRecord(record.day, record.target)) return local;
  store.skullsToPlace -= 1;
  noteNode(play, ".29");
  note(store, ".29");
  return { ...local, awaitingPress: false };
};
