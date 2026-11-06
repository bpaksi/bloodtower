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

/** A seal and the boon its glyph gives when it breaks (DEC-303, Q-C3-17). */
export type SealDef = { id: string; glyph: string; boon: string };

export type ChapterPlan = {
  chapters: ChapterDef[];
  seals: SealDef[];
  /** `c3_end_after_chapter_1` (Q-C3-01). */
  c3EndAfterChapter1: boolean;
  /** `skulls.seal_break.min`; the top is the skulls held in the tower. */
  sealBreakMin: number;
  /** `foe_level_by_chapter` (DEC-185). */
  foeLevel: { chapter1: number; perChapter: number };
};

export type ChapterOutput =
  | { kind: "cue"; chapter: number }
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

/** In C3 clearing chapter 1 is the last act of the game (Q-C3-01). */
export const endsGame = (store: ChapterStore, index: number): boolean =>
  store.plan.c3EndAfterChapter1 && index === 1;

/** Saved with the autosave; Continue restores it whole (DEC-151, DEC-303). */
export const snapshotChapters = (play: PlayState): string => JSON.stringify(ensureChapters(play));

export const restoreChapters = (play: PlayState, saved: string): ChapterStore => {
  const restored = JSON.parse(saved) as ChapterStore;
  restored.resumed = true;
  stores.set(play, restored);
  return restored;
};
