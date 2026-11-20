import { type ChapterPlan, configureChapters } from "../chapter/chapters.ts";
import type { PlayState } from "../chapter/playState.ts";
import { configureQuestsFromPack, type QuestPackData } from "../quest/store.ts";

/**
 * What a loaded story pack gives a real game (F1/03, DEC-949): its quests and scenes, and the
 * chapter plan. `chapters` is null when the base pack has no tuning; quests still load.
 */
export type StoryPlayData = { quests: QuestPackData; chapters: ChapterPlan | null };

/** At the start of a new play: chapter 1's quests are open and the chapter loop has its plan. */
export const configureStoryPlay = (play: PlayState, data: StoryPlayData | undefined): void => {
  if (!data) return;
  configureQuestsFromPack(play, data.quests, 1);
  if (data.chapters) configureChapters(play, data.chapters);
};
