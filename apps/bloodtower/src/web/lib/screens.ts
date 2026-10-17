import type { FlowScreen, StoryboardState } from "bloodtower-protocols";

/** The one story this build loads. Copy only; the pack id stays on the server. */
export const TABLE_STORY = {
  id: "test",
  title: "Proving ground",
  blurb: "A long-lived proving ground for new ideas.",
  players: "1–4 hunters",
} as const;

export const SCREEN_TITLE: Record<FlowScreen, string> = {
  splash: "Loading",
  "tower-connect": "Tower Connect",
  "pick-story": "Pick Story",
  "party-join": "Party Join",
  begin: "Begin Story",
  play: "Play",
  quit: "Quit",
};

/** What the table is waiting for. Shown on the board and as iPad "what happens next". */
export const SCREEN_NEXT: Record<FlowScreen, string> = {
  splash: "Next: connect the tower",
  "tower-connect": "Next: pick a story",
  "pick-story": "Next: gather the party",
  "party-join": "Next: set up the story",
  begin: "Next: begin the story",
  play: "The night is underway.",
  quit: "The table is closed.",
};

export const FORTUNE_LINE = "The night is gathering. The tower is not yet awake.";

/** R2-01 tower words. Unknown stays "no tower", never a fake connected state. */
export const towerStripState = (connection: StoryboardState["tower"]["connection"]): string => {
  if (connection === "connected") return "connected";
  if (connection === "connecting") return "connecting";
  if (connection === "disconnected") return "lost";
  return "no tower";
};

export const joinedDeviceIds = (hunters: StoryboardState["hunters"]): string[] => [
  ...new Set(hunters.flatMap((hunter) => hunter.holders)),
];

export const claimedCount = (hunters: StoryboardState["hunters"]): number =>
  hunters.filter((hunter) => hunter.holders.length > 0).length;

export const partyJoinNextReason = (
  unheld: readonly string[],
  names: ReadonlyMap<string, string>,
) => {
  const first = unheld[0];
  if (!first) return null;
  return `Claim ${names.get(first) ?? first} first`;
};
