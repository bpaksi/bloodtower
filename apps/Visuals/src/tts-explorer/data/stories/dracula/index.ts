import type { Story } from "../../../lib/stories/types.ts";
import { characters, narrator } from "./characters.ts";
import { scenarios } from "./scenarios.ts";

export const dracula: Story = {
  id: "dracula",
  title: "The Count of Vellmoor (Dracula, Halloween one-shot)",
  summary:
    "Four hunters answer a dead priest's letter on All Hallows' Eve and have six nights to find the Count's true coffin before his ritual completes.",
  narrator,
  characters,
  scenarios,
};
