import { flagReadsInCondition, type PackCondition } from "./conditions.ts";
import type { PackEffect } from "./effects.ts";
import type { StoryPack } from "./story.ts";

export interface PackV2Issue {
  rule: string;
  path: string;
  message: string;
}

const walkEntry = (
  effects: PackEffect[],
  when: PackCondition | undefined,
  path: string,
  flagReads: Array<{ flag: string; path: string }>,
  flagWrites: Set<string>,
) => {
  if (when) {
    for (const flag of flagReadsInCondition(when)) {
      flagReads.push({ flag, path: `${path}.when` });
    }
  }
  for (const effect of effects) {
    if (effect.kind === "set-flag") flagWrites.add(effect.flag);
    if (effect.kind === "clear-flag") flagWrites.add(effect.flag);
  }
};

/** Semantic lint: flags read in conditions must be set or cleared somewhere in the story. */
export const flagCoverageIssues = (story: StoryPack): PackV2Issue[] => {
  const flagReads: Array<{ flag: string; path: string }> = [];
  const flagWrites = new Set<string>();

  if (story.game.start) {
    walkEntry(story.game.start.effects, story.game.start.when, "game.start", flagReads, flagWrites);
  }
  if (story.game.end) {
    walkEntry(story.game.end.effects, story.game.end.when, "game.end", flagReads, flagWrites);
  }
  for (const [ci, chapter] of story.chapters.entries()) {
    const base = `chapters.${ci}`;
    if (chapter.start) {
      walkEntry(chapter.start.effects, chapter.start.when, `${base}.start`, flagReads, flagWrites);
    }
    if (chapter.end) {
      walkEntry(chapter.end.effects, chapter.end.when, `${base}.end`, flagReads, flagWrites);
    }
    for (const [bi, beat] of chapter.timed_beats.entries()) {
      walkEntry(beat.effects, beat.when, `${base}.timed_beats.${bi}`, flagReads, flagWrites);
    }
    for (const [qi, quest] of chapter.quests.entries()) {
      if (quest.when) {
        for (const flag of flagReadsInCondition(quest.when)) {
          flagReads.push({ flag, path: `${base}.quests.${qi}.when` });
        }
      }
    }
  }

  const issues: PackV2Issue[] = [];
  for (const read of flagReads) {
    if (!flagWrites.has(read.flag)) {
      issues.push({
        rule: "P2-3",
        path: read.path,
        message: `P2-3: flag ${read.flag} is read but never set or cleared in this story.`,
      });
    }
  }
  return issues;
};
