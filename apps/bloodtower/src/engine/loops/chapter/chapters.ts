import type { KingdomId } from "./board.ts";
import type { PlayState } from "./playState.ts";

/*
 * MEC-033: a chapter's enter, start, days and close. The plan comes from the story pack and
 * the tuning file; the engine holds no numbers of its own (DEC-703).
 */

export type ChapterQuest = { id: string; spaceId: string };

export type ChapterDef = {
  id: string;
  index: number;
  /** Kingdoms this chapter opens on top of the earlier ones (DEC-134, DEC-146). */
  kingdoms: KingdomId[];
  quests: ChapterQuest[];
};

/**
 * A seal and the boon its glyph gives when it breaks (DEC-303, Q-C3-17). `name` is the locked
 * story name the Set the table row shows (C3/15 Copy `table.row.seal`).
 */
export type SealDef = { id: string; name: string; glyph: string; boon: string };

export type ChapterPlan = {
  chapters: ChapterDef[];
  seals: SealDef[];
  /** `c3_end_after_chapter_1` (Q-C3-01). */
  c3EndAfterChapter1: boolean;
  /**
   * `c4_end_after_chapter_3` (Q-C4-01): winning chapter 3 ends the game won. Absent reads as off
   * until the story loader passes the switch on.
   */
  c4EndAfterChapter3?: boolean;
  /** `skulls.seal_break.min`; the top is the skulls held in the tower. */
  sealBreakMin: number;
  /** `foe_level_by_chapter` (DEC-185). */
  foeLevel: { chapter1: number; perChapter: number };
};

/**
 * Where a chapter frame is (C3/15). The chapter card, the won stamp, the close Scroll and the
 * seal Reveal each wait for a host `wait-end`; Set the table waits for Done (PT-21).
 */
export type ChapterStage = "card" | "reveal" | "table" | "place" | "days" | "stamp" | "close";

/** An auto-advance wait, named as data like the day's (C3/20). The host runs it. */
export type ChapterWait = { id: string; maxMs: number; lineId: string | null };

/** The rows of Set the table (PT-21, DEC-929). Structured: the boards word them. */
export type TableRows = {
  chapter: number;
  /** The seal that broke, or null with no tower or no seal left (DEC-306). */
  seal: SealDef | null;
  /** Freed skulls to place after Done; 0 means no row (DEC-409). */
  skulls: number;
  /** The chapter's quest token ids, in pack order. */
  quests: string[];
};

export type ChapterOutput =
  | { kind: "cue"; chapter: number; cue: "CUE-004" | "CUE-005" }
  | { kind: "narration"; chapter: number; copy: string }
  | {
      kind: "card";
      chapter: number;
      questsDone: number;
      questsTotal: number;
      kingdoms: KingdomId[];
    };

export type ChapterStore = {
  plan: ChapterPlan;
  /** The chapter the next enter opens, or the one now running. */
  current: number;
  /** Chapters whose enter has run, in order. */
  entered: number[];
  /** MEC-033 nodes, in the order they ran. */
  nodes: string[];
  outputs: ChapterOutput[];
  /** Space id → quest id for the tokens placed so far (DEC-083). */
  tokens: Record<string, string>;
  bounds: KingdomId[];
  foeLevel: number;
  brokenSeals: string[];
  boons: string[];
  /** Seals fell away because the tower was not in play (DEC-306). */
  sealsDroppedOut: boolean;
  /** Freed skulls still to be placed on the board (DEC-409). */
  skullsToPlace: number;
  /** Where the running chapter frame is; absent in an older save: its days (C3/15). */
  stage?: ChapterStage;
  /** The open auto-advance wait, if any, and whether the host has ended it. */
  wait?: ChapterWait | null;
  waitDone?: boolean;
  /**
   * Set when a chapter was won and another follows: the next chapter's card is followed by the
   * seal Reveal (with a seal) and Set the table (PT-21). `seal` is null with no tower (DEC-306).
   * `from` is the won chapter, which a freed-skull loss names (DEC-938).
   */
  pending?: { from: number; seal: SealDef | null } | null;
  /** The Set the table step while it shows, else null. */
  table?: TableRows | null;
  /** The finale chapter (DEC-656): set by the Tower, which is C5. */
  towerUnlocked: boolean;
  towerWon: boolean;
  /** Set by `restoreChapters`; the next chapter loop skips its enter and start (DEC-675). */
  resumed: boolean;
};

const stores = new WeakMap<PlayState, ChapterStore>();

export const tryChapters = (play: PlayState): ChapterStore | null => stores.get(play) ?? null;

export const ensureChapters = (play: PlayState): ChapterStore => {
  const store = stores.get(play);
  if (!store) throw new Error("Chapters are not configured for this game.");
  return store;
};

export const configureChapters = (
  play: PlayState,
  plan: ChapterPlan,
  options: { startChapter?: number } = {},
): ChapterStore => {
  if (plan.chapters.length < 1) throw new Error("A story has at least one chapter.");
  const created: ChapterStore = {
    plan,
    current: options.startChapter ?? 1,
    entered: [],
    nodes: [],
    outputs: [],
    tokens: {},
    bounds: [],
    foeLevel: plan.foeLevel.chapter1,
    brokenSeals: [],
    boons: [],
    sealsDroppedOut: false,
    skullsToPlace: 0,
    pending: null,
    table: null,
    stage: "card",
    wait: null,
    waitDone: false,
    towerUnlocked: false,
    towerWon: false,
    resumed: false,
  };
  stores.set(play, created);
  return created;
};

export const chapterDef = (store: ChapterStore, index: number): ChapterDef => {
  const def = store.plan.chapters.find((c) => c.index === index);
  if (!def) throw new Error(`The story has no chapter ${index}.`);
  return def;
};

/** The last chapter in the story: the finale (DEC-656). */
export const isFinale = (store: ChapterStore, index: number): boolean =>
  index === Math.max(...store.plan.chapters.map((c) => c.index));

/** The chapter the C4 end rule stops at (Q-C4-01). */
export const C4_END_CHAPTER = 3;

/**
 * Clearing chapter 1 ends the game in C3 (Q-C3-01); clearing chapter 3 ends it in C4 (Q-C4-01).
 * Each is its own tuning switch, and C5 turns both off.
 */
export const endsGame = (store: ChapterStore, index: number): boolean =>
  (store.plan.c3EndAfterChapter1 && index === 1) || endsAtC4Chapter(store, index);

/** The C4 switch is what ends the game at this chapter. */
export const endsAtC4Chapter = (store: ChapterStore, index: number): boolean =>
  store.plan.c4EndAfterChapter3 === true && index === C4_END_CHAPTER;

/** Saved with the autosave; Continue restores it whole (DEC-151, DEC-303). */
export const snapshotChapters = (play: PlayState): string => JSON.stringify(ensureChapters(play));

export const restoreChapters = (play: PlayState, saved: string): ChapterStore => {
  const restored = JSON.parse(saved) as ChapterStore;
  restored.resumed = true;
  stores.set(play, restored);
  return restored;
};

/**
 * The chapter wait the host should run now, or null (C3/15, like the day's in C3/20). Only while
 * the chapter frame is on top: its card, stamp, close and Reveal have no child loop running.
 */
export const openChapterWait = (
  stack: readonly { loopId: string }[],
  play: PlayState | null | undefined,
): ChapterWait | null => {
  if (!play || stack.at(-1)?.loopId !== "chapter") return null;
  const store = tryChapters(play);
  if (!store?.wait || store.waitDone) return null;
  return store.wait;
};

/** Marks the open chapter wait done when `waitId` names it. False means none was open for it. */
export const endChapterWait = (
  stack: readonly { loopId: string }[],
  play: PlayState | null | undefined,
  waitId: string,
): boolean => {
  const wait = openChapterWait(stack, play);
  if (!wait || wait.id !== waitId || !play) return false;
  ensureChapters(play).waitDone = true;
  return true;
};
