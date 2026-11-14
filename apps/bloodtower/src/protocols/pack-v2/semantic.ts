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

/** Quest lint (C3-19): a quest without `quest_type` names a scene; one quest per space. */
export const questShapeIssues = (story: StoryPack): PackV2Issue[] => {
  const issues: PackV2Issue[] = [];
  const bySpace = new Map<string, string>();
  for (const [ci, chapter] of story.chapters.entries()) {
    for (const [qi, quest] of chapter.quests.entries()) {
      const path = `chapters.${ci}.quests.${qi}`;
      if (quest.quest_type === undefined && quest.scene === undefined) {
        issues.push({
          rule: "P2-1",
          path,
          message: `P2-1: quest ${quest.id} has no quest_type and no scene; a quest omits its type only when it names a scene.`,
        });
      }
      const space = quest.place?.space;
      if (space === undefined) continue;
      const other = bySpace.get(space);
      if (other !== undefined) {
        issues.push({
          rule: "P2-1",
          path: `${path}.place.space`,
          message: `P2-1: quests ${other} and ${quest.id} share space ${space}; a space holds one quest marker.`,
        });
      } else {
        bySpace.set(space, quest.id);
      }
    }
  }
  return issues;
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

  for (const scene of story.scenes ?? []) {
    for (const option of scene.options) {
      for (const effect of option.effects) {
        if (effect.kind === "flag") flagWrites.add(effect.flag);
      }
    }
  }
  for (const [wi, line] of (story.endings?.win ?? []).entries()) {
    if (!line.when) continue;
    for (const flag of flagReadsInCondition(line.when)) {
      flagReads.push({ flag, path: `endings.win.${wi}.when` });
    }
  }

  const issues: PackV2Issue[] = questShapeIssues(story);
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
