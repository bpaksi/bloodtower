import type { Story } from "../../lib/stories/types.ts";
import { dracula } from "./dracula/index.ts";

/** Registry of all stories. Add new stories here. */
export const STORIES: Story[] = [dracula];

export function findStory(id: string): Story | undefined {
  return STORIES.find((s) => s.id === id);
}
