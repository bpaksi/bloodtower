/**
 * Every player-facing word of CU/09 (hints, the Hints toggle, the Rules group in Look up).
 * The text is the Copy table in plans/briefs/CU/09-hints-and-rules/plan.md, verbatim; a test
 * reads that table and fails on any drift.
 */

export const HINT_TEXT = {
  "hint.first-battle":
    "A battle runs in rounds. Choose Fight or Retreat, then each hero picks one action.",
  "hint.first-building": "Entering a building is free. Each choice inside costs one move.",
  "hint.first-event": "Something happens where you stand. Hear it out, then choose how to answer.",
  "hint.first-skull-drop":
    "Each skull that falls shrinks a building's menu, and the fourth destroys it.",
  "hint.first-day-end":
    "The day ends when every turn is done. Night brings skulls, and the days left count down.",
} as const;

export type HintId = keyof typeof HINT_TEXT;

export const HINTS_SETTING_ID = "hints";
export const HINTS_ON = "on";
export const HINTS_OFF = "off";

export const HINTS_COPY = {
  label: "Hints",
  on: "On",
  off: "Off",
} as const;

export const RULES_GROUP = "Rules";

/** One Rules page per hint loop, in the order Look up lists them. */
export const RULES_PAGES = [
  {
    id: "rules-battle",
    title: "Battle",
    page: "A battle runs in rounds. Choose Fight or Retreat, then each hero picks Attack, Cast a spell, Spend an Advantage, Drink a potion or Guard. A foe you flee from stays and grows. A hero who falls to 0 hit points takes a corruption. A third corruption ends the game.",
  },
  {
    id: "rules-building",
    title: "Building visit",
    page: "Entering a building is free, and so is leaving. Each choice inside costs one move. Each skull shrinks a building's menu, and the fourth destroys it. Cleanse takes a skull off.",
  },
  {
    id: "rules-event",
    title: "Event",
    page: "An event stops you where you stand. Hear what happens, then choose how to answer. A hazard costs hit points.",
  },
  {
    id: "rules-skull-drop",
    title: "Skull drop",
    page: "At night a skull may fall on a building. Each skull shrinks its menu, and the fourth destroys it. Four fallen buildings lose the game. Cleanse takes a skull off a building.",
  },
  {
    id: "rules-day-end",
    title: "Day's end",
    page: "The day ends when every group has had its turn. Night effects play and a skull may fall. Each skull is a day: when the skulls run out, the game is lost. Cleanse buys a day back.",
  },
] as const;

export const rulesPage = (id: string | null | undefined) =>
  RULES_PAGES.find((row) => row.id === id) ?? null;
