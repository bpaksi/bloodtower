import { parseSections as parseSectionsWith, type Section } from "@dark-tower/workbench";
import { GAME_IDS } from "./ids.ts";

export type { Section };

/** Markdown headings outside fenced code, with their line ranges and the IDs inside them. */
export function parseSections(markdown: string): Section[] {
  return parseSectionsWith(markdown, GAME_IDS);
}
