import { AUTO_ADVANCE_MS } from "../../../protocols/v2/views.ts";
import type { LoopDefinition } from "../../loop/types.ts";
import { ensureClock, isGameLost, noteNode } from "../day/clock.ts";
import type { DayResult } from "../day/loop.ts";
import { applySkullRecord, offerSkullPlacement, parseSkullRecordPrompt } from "../day/skull.ts";
import { ensureQuests } from "../quest/store.ts";
import { recordOffer, requestCheckpoint, shellState } from "../session/shellRef.ts";
import {
  type ChapterStage,
  type ChapterStore,
  chapterDef,
  endsAtC4Chapter,
  endsGame,
  ensureChapters,
  isFinale,
  type SealDef,
  tryChapters,
} from "./chapters.ts";
import {
  markerBody,
  nextPlayRng,
  type PlayState,
  playState,
  TEST_CHAPTER_LINE,
  TEST_SEALS,
} from "./playState.ts";

export type ChapterPhase = ChapterStage | "done";

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

export type ChapterOutcome = {
  kind: "won" | "lost";
  reason?: "skulls" | "buildings" | "corruption";
};

export type ChapterResult = {
  chapterId: string;
  chapter?: number;
  outcome?: "won" | "lost";
  reason?: "skulls" | "buildings" | "corruption";
  /** Won and last: the game ends (C3 chapter 1, or the finale). */
  last?: boolean;
  /** Set when the C4 switch ended the game at chapter 3 (Q-C4-01): the record's `end`. */
  end?: "chapter_3";
};

/** Set the table's one Done (PT-21, DEC-929): `table-done--<chapter>`, action `done`. */
export const tableDonePromptId = (chapter: number): string => `table-done--${chapter}`;
export const TABLE_DONE_ACTION = "done";

const parseTableDone = (promptId: string): number | null => {
  const match = /^table-done--(\d+)$/.exec(promptId);
  return match ? Number(match[1]) : null;
};

/** TEST ONLY: the three locked seals (`~test-seals`), until C4/13 loads them from the pack. */
const TEST_SEAL_DEFS: SealDef[] = [
  { id: "road-seal", name: "The Road Seal", glyph: "road", boon: "+1 to a roll" },
  { id: "keep-seal", name: "The Keep Seal", glyph: "keep", boon: "+1 to a roll" },
  { id: "warden-seal", name: "The Warden's Seal", glyph: "warden", boon: "+1 to a roll" },
];

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

/** The checkpoint after each chapter beat, so a restart resumes the same beat (EV-13, EV-23). */
const checkpoint = (play: PlayState): void => {
  const gameId = shellState().activeGameId;
  if (gameId) requestCheckpoint(gameId, play.dayNumber);
};

/** Opens one auto-advance wait (EV-11, EV-12): the host ends it on audio end, or after 4 s. */
const openWait = (store: ChapterStore, stage: ChapterStage, chapter: number): void => {
  const line = markerBody(shellState().seed, TEST_CHAPTER_LINE, /^[\w.-]*/);
  store.stage = stage;
  store.wait = { id: `chapter-${stage}-${chapter}`, maxMs: AUTO_ADVANCE_MS, lineId: line || null };
  store.waitDone = false;
};

const goTo = (store: ChapterStore, stage: ChapterStage): void => {
  store.stage = stage;
  store.wait = null;
  store.waitDone = false;
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

/**
 * MEC-033 start: the cue, the narration hook and the chapter card, once each, in order. CUE-004
 * plays with the card (C3/15 EV-06); the card then waits like any Next-only step (EV-11).
 */
const startChapter = (play: PlayState, store: ChapterStore, chapter: number): void => {
  const def = chapterDef(store, chapter);
  const quests = ensureQuests(play);
  const done = def.quests.filter((q) => quests.done.includes(q.id)).length;
  note(store, `start:${chapter}`);
  store.outputs.push({ kind: "cue", chapter, cue: "CUE-004" });
  note(store, `cue:CUE-004:${chapter}`);
  store.outputs.push({ kind: "narration", chapter, copy: `[COPY: chapter-${chapter}-start]` });
  store.outputs.push({
    kind: "card",
    chapter,
    questsDone: done,
    questsTotal: def.quests.length,
    kingdoms: [...store.bounds],
  });
  openWait(store, "card", chapter);
  note(store, `card:${chapter}`);
  checkpoint(play);
};

const questsAllDone = (play: PlayState, store: ChapterStore, chapter: number): boolean => {
  const done = ensureQuests(play).done;
  return chapterDef(store, chapter).quests.every((q) => done.includes(q.id));
};

/**
 * MEC-033 close, with the tower: one seal breaks, its glyph's boon takes effect and the
 * skulls it frees go back on the board after Set the table (DEC-303, DEC-409, PT-21). The app
 * picks the seal (Q-C3-17).
 */
const breakSeal = (play: PlayState, store: ChapterStore, seed: string): SealDef | null => {
  const clock = ensureClock(play);
  const seals =
    store.plan.seals.length === 0 && seed.includes(TEST_SEALS) ? TEST_SEAL_DEFS : store.plan.seals;
  const open = seals.filter((s) => !store.brokenSeals.includes(s.id));
  const seal = open.length > 0 ? nextPlayRng(seed, play).pick(open) : null;
  if (!seal) return null;
  note(store, "seal-break");
  store.brokenSeals.push(seal.id);
  store.boons.push(seal.boon);
  const min = Math.min(store.plan.sealBreakMin, clock.held);
  const freed = nextPlayRng(seed, play).int(min, clock.held);
  // A held skull already left the supply; placing it again must not spend it twice.
  clock.held -= freed;
  clock.supply += freed;
  store.skullsToPlace = freed;
  return seal;
};

type BodyCtx = { offerPrompt: (promptId: string, actionId: string) => void };
type Step = { local: ChapterLocal; passComplete: boolean };

const waiting = (local: ChapterLocal): Step => ({ local, passComplete: false });

/** MEC-033 .25 to .29: freed skulls go back on the board, one prompt at a time (DEC-409). */
const placeStep = (
  local: ChapterLocal,
  store: ChapterStore,
  play: PlayState,
  ctx: BodyCtx,
): Step | null => {
  // DEC-905, DEC-933, DEC-938: a freed skull that lost the game ends the game at once. The skulls
  // left are never asked, and the record names the chapter that closed, not this one.
  const loss = ensureClock(play).outcome;
  if (loss?.lost === true) {
    note(store, "lost");
    const closed = store.pending?.from ?? local.chapter;
    store.pending = null;
    return {
      local: {
        ...local,
        chapter: closed,
        phase: "done",
        awaitingPress: false,
        outcome: { kind: "lost", reason: loss.reason },
      },
      passComplete: true,
    };
  }
  if (store.skullsToPlace < 1) {
    store.pending = null;
    goTo(store, "days");
    checkpoint(play);
    return null;
  }
  if (local.awaitingPress) return waiting(local);
  note(store, ".25");
  offerSkullPlacement(play.dayNumber, ctx);
  return waiting({ ...local, awaitingPress: true });
};

/** Set the table (PT-21, DEC-929): the next chapter's chores as rows, then one Done (EV-17). */
const showTable = (play: PlayState, store: ChapterStore, chapter: number): void => {
  goTo(store, "table");
  store.table = {
    chapter,
    seal: store.pending?.seal ?? null,
    skulls: store.skullsToPlace,
    quests: chapterDef(store, chapter).quests.map((q) => q.id),
  };
  note(store, `table.shown:${chapter}`);
  checkpoint(play);
};

/** The won chapter's close is over: the game ends, or the next chapter's frame takes over. */
const closeChapter = (local: ChapterLocal, store: ChapterStore, play: PlayState): Step => {
  const outcome: ChapterOutcome = { kind: "won" };
  const finale = isFinale(store, local.chapter) && !endsAtC4Chapter(store, local.chapter);
  store.wait = null;
  store.waitDone = false;
  if (endsGame(store, local.chapter) || finale) {
    store.stage = "close";
    return { local: { ...local, phase: "done", outcome }, passComplete: true };
  }
  const shell = shellState();
  let seal: SealDef | null = null;
  if (shell.towerLinked) {
    seal = breakSeal(play, store, shell.seed);
  } else {
    // DEC-306: no tower, the seals drop out; no boon, no skulls.
    store.sealsDroppedOut = true;
  }
  store.pending = { from: local.chapter, seal };
  store.current = local.chapter + 1;
  // The next frame's enter sets its card; nothing can save between the two (one step).
  store.stage = "card";
  return { local: { ...local, phase: "done", outcome }, passComplete: true };
};

/** One pass of the chapter's beats before and after its days. Null hands over to the days. */
const beatStep = (
  local: ChapterLocal,
  store: ChapterStore,
  play: PlayState,
  ctx: BodyCtx,
): Step | null => {
  const stage = store.stage ?? "days";
  const chapter = local.chapter;
  if (stage === "card" || stage === "reveal" || stage === "stamp" || stage === "close") {
    // A save from before the wait opened has none: open it, so the beat still ends (EV-13).
    if (!store.wait) openWait(store, stage, chapter);
    if (!store.waitDone) return waiting({ ...local, phase: stage });
    if (stage === "card") {
      if (!store.pending) {
        goTo(store, "days");
        checkpoint(play);
        return null;
      }
      if (store.pending.seal) {
        // The glyph's Reveal comes right after the seal break, as a story beat (EV-02).
        openWait(store, "reveal", chapter);
        note(store, `reveal:${chapter}`);
        checkpoint(play);
        return waiting({ ...local, phase: "reveal" });
      }
      showTable(play, store, chapter);
      return beatStep({ ...local, phase: "table" }, store, play, ctx);
    }
    if (stage === "reveal") {
      showTable(play, store, chapter);
      return beatStep({ ...local, phase: "table" }, store, play, ctx);
    }
    if (stage === "stamp") {
      openWait(store, "close", chapter);
      note(store, `close:${chapter}`);
      checkpoint(play);
      return waiting({ ...local, phase: "close" });
    }
    return closeChapter(local, store, play);
  }
  if (stage === "table") {
    // Set the table waits for Done and never on a timer (EV-19).
    if (local.awaitingPress) return waiting({ ...local, phase: "table" });
    const promptId = tableDonePromptId(chapter);
    ctx.offerPrompt(promptId, TABLE_DONE_ACTION);
    recordOffer(promptId, TABLE_DONE_ACTION);
    return waiting({ ...local, phase: "table", awaitingPress: true });
  }
  if (stage === "place") return placeStep({ ...local, phase: "place" }, store, play, ctx);
  return null;
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
      // The saved beat resumes; a chapter card already over does not play again (DEC-675).
      const stage = store.stage ?? "days";
      const won = stage === "stamp" || stage === "close";
      return {
        ...local,
        phase: stage,
        resumed: true,
        ...(won ? { outcome: { kind: "won" } } : {}),
      };
    }
    enterChapter(play, store, store.current);
    return { ...local, phase: "card" };
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

    if (store) {
      const beat = beatStep(local, store, play, ctx);
      if (beat) return beat;
      local = { ...local, phase: "days" };
    }

    if (local.awaitingDayResult) {
      const finished = ctx.getParentResult() as Partial<DayResult> | undefined;
      if (!finished?.dayNumber || finished.dayNumber <= local.lastFinishedDay) {
        return { local, passComplete: false };
      }
      local = { ...local, awaitingDayResult: false, lastFinishedDay: finished.dayNumber };

      if (store) {
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
        // The C4 end rule stops at chapter 3 before any Tower exists (Q-C4-01).
        const finale = isFinale(store, local.chapter) && !endsAtC4Chapter(store, local.chapter);
        if (finale && questsAllDone(play, store, local.chapter)) store.towerUnlocked = true;
        const won = finale ? store.towerWon : questsAllDone(play, store, local.chapter);
        if (won) {
          note(store, "won");
          // UI-020 stamped won, with CUE-005 (EV-05, EV-06); then the close Scroll.
          openWait(store, "stamp", local.chapter);
          store.outputs.push({ kind: "cue", chapter: local.chapter, cue: "CUE-005" });
          note(store, `cue:CUE-005:${local.chapter}`);
          note(store, `stamp:${local.chapter}`);
          checkpoint(play);
          return waiting({ ...local, phase: "stamp", outcome: { kind: "won" } });
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
    if (result.last && endsAtC4Chapter(store, local.chapter)) result.end = "chapter_3";
    return result;
  },
};

/**
 * A chapter press (routed by the press router with the chapter frame's local): Set the table's
 * Done (PT-21), or a freed skull placed (MEC-033 .25 to .29). Returns the new local.
 */
export const handleChapterPress = (
  local: ChapterLocal,
  promptId: string,
  actionId = "record",
): ChapterLocal => {
  const play = playState();
  const store = ensureChapters(play);
  const tableFor = parseTableDone(promptId);
  if (tableFor !== null) {
    // One Done ends the step; a late or repeated Done changes nothing (EV-17, EV-24).
    if (actionId !== TABLE_DONE_ACTION || store.stage !== "table" || tableFor !== local.chapter) {
      return local;
    }
    note(store, `table.done:${local.chapter}`);
    store.table = null;
    if (store.skullsToPlace > 0) {
      goTo(store, "place");
    } else {
      store.pending = null;
      goTo(store, "days");
    }
    checkpoint(play);
    return { ...local, awaitingPress: false };
  }
  const record = parseSkullRecordPrompt(promptId);
  if (local.phase !== "place" || !record) return local;
  // A freed skull after the loss is never asked for; a late press changes nothing (DEC-905).
  if (isGameLost(play)) return local;
  if (!applySkullRecord(record.day, record.target)) return local;
  store.skullsToPlace -= 1;
  noteNode(play, ".29");
  note(store, ".29");
  return { ...local, awaitingPress: false };
};
