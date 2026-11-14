import type { PackPlainScene } from "../../../protocols/pack-v2/scenes.ts";
import type { PlayState } from "../chapter/playState.ts";
import { type PlainScene, sceneFromPack } from "../scene/scene.ts";

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

/** The parts of a loaded story pack the quest store reads (C3-18). */
export type QuestPackData = {
  chapters: Array<{
    index: number;
    quests: Array<{
      id: string;
      scene?: string | undefined;
      place?: { space: string } | undefined;
    }>;
  }>;
  scenes?: PackPlainScene[] | undefined;
};

/**
 * The quest defs and markers a loaded pack declares: each quest with a plain scene, in its
 * chapter, and each placed quest's space. A quest with no plain scene (a Tomb) has no def until
 * its game exists (C4). Lint has already refused a scene id that is not declared; one that gets
 * here anyway throws, so a broken pack is never played as if the quest were missing.
 */
export const questsFromPack = (
  story: QuestPackData,
): { defs: QuestDef[]; bySpace: Record<string, string> } => {
  const scenes = new Map((story.scenes ?? []).map((scene) => [scene.id, scene]));
  const defs: QuestDef[] = [];
  const bySpace: Record<string, string> = {};
  for (const chapter of story.chapters) {
    for (const quest of chapter.quests) {
      if (quest.place) bySpace[quest.place.space] = quest.id;
      if (quest.scene === undefined) continue;
      const scene = scenes.get(quest.scene);
      if (!scene) {
        throw new Error(`quest ${quest.id} names scene ${quest.scene}, which the pack lacks`);
      }
      defs.push({ id: quest.id, chapter: chapter.index, scene: sceneFromPack(scene) });
    }
  }
  return { defs, bySpace };
};

/** Loads the pack's quests into the store; tuning stays as configured. */
export const configureQuestsFromPack = (play: PlayState, story: QuestPackData): QuestStore =>
  configureQuests(play, questsFromPack(story));

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
