import type { PlayState } from "../chapter/playState.ts";
import type { PlainScene } from "../scene/scene.ts";

export type QuestProgress = {
  /** The option the group took; null until it chooses. */
  optionId: string | null;
  /** The corruption cost is paid (or there is none). */
  costPaid: boolean;
  /** Index of the next effect to apply. */
  next: number;
};

export type QuestDef = {
  id: string;
  chapter: number;
  scene: PlainScene;
};

export type QuestTuning = { tollGold: number; tollHitPoints: number; questGold: number };

export const BASE_QUEST_TUNING: QuestTuning = { tollGold: 10, tollHitPoints: 2, questGold: 5 };

export type QuestStore = {
  tuning: QuestTuning;
  defs: QuestDef[];
  /** Space id → quest id for each quest marker (DEC-083). */
  bySpace: Record<string, string>;
  done: string[];
  progress: Record<string, QuestProgress>;
  /** Hero id → story items held (DEC-653). */
  items: Record<string, string[]>;
  flags: string[];
  /** Applied effects in order, as `kind:detail`. */
  log: string[];
};

const stores = new WeakMap<PlayState, QuestStore>();

export const ensureQuests = (play: PlayState): QuestStore => {
  const existing = stores.get(play);
  if (existing) return existing;
  const created: QuestStore = {
    tuning: BASE_QUEST_TUNING,
    defs: [],
    bySpace: {},
    done: [],
    progress: {},
    items: {},
    flags: [],
    log: [],
  };
  stores.set(play, created);
  return created;
};

export const configureQuests = (
  play: PlayState,
  options: { defs?: QuestDef[]; bySpace?: Record<string, string>; tuning?: Partial<QuestTuning> },
): QuestStore => {
  const store = ensureQuests(play);
  if (options.defs) store.defs = options.defs;
  if (options.bySpace) store.bySpace = options.bySpace;
  if (options.tuning) store.tuning = { ...store.tuning, ...options.tuning };
  return store;
};

/** Done quests against the chapter's quests (DEC-041). */
export const chapterProgress = (
  play: PlayState,
  chapter: number,
): { done: number; total: number } => {
  const store = ensureQuests(play);
  const ids = store.defs.filter((d) => d.chapter === chapter).map((d) => d.id);
  return { done: ids.filter((id) => store.done.includes(id)).length, total: ids.length };
};

export const heroItems = (play: PlayState, heroId: string): string[] =>
  ensureQuests(play).items[heroId] ?? [];

/** Saved with the autosave; Continue restores it whole (DEC-151). */
export const snapshotQuests = (play: PlayState): string => JSON.stringify(ensureQuests(play));

export const restoreQuests = (play: PlayState, saved: string): QuestStore => {
  const restored = JSON.parse(saved) as QuestStore;
  stores.set(play, restored);
  return restored;
};
