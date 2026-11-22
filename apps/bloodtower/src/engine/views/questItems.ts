/** Names of the story items quests hand over (pack `items`, Loremaster Copy, C3/14). One source. */
export const QUEST_ITEM_NAMES: Record<string, string> = {
  "tomas-map": "Tomas's Map",
  signet: "The Warden's Signet",
  "oath-blade": "The Warden's oath-blade",
};

/** An item the table has no name for reads "unavailable", never the raw id (root CLAUDE.md). */
export const questItemName = (id: string): string => QUEST_ITEM_NAMES[id] ?? "unavailable";
