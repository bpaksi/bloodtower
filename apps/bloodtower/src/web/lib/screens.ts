import type { FlowScreen, Stories, StoryboardState, StoryCard } from "bloodtower-protocols";

/** The card for the story the session is bound to, or null before the server has sent the list. */
export const currentStory = (stories: Stories | undefined): StoryCard | null =>
  stories?.cards.find((card) => card.id === stories.current) ?? null;

/** The highlighted door on Pick Story, or null before the server has sent the list. */
export const focusedStory = (stories: Stories | undefined): StoryCard | null =>
  stories?.cards.find((card) => card.id === stories.focus) ?? null;

/** The card `step` places from the highlight, wrapping at both ends. Null with fewer than two. */
export const neighborStory = (stories: Stories | undefined, step: 1 | -1): StoryCard | null => {
  if (!stories || stories.cards.length < 2) return null;
  const at = stories.cards.findIndex((card) => card.id === stories.focus);
  const count = stories.cards.length;
  return stories.cards[(at + step + count) % count] ?? null;
};

/** "1–4 hunters", or the single number when min equals max. Null when the pack did not load. */
export const playersText = (players: StoryCard["players"]): string | null => {
  if (!players) return null;
  const range = players.min === players.max ? `${players.min}` : `${players.min}–${players.max}`;
  return `${range} ${players.max === 1 ? "hunter" : "hunters"}`;
};

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
export const towerStripState = (tower: StoryboardState["tower"]): string => {
  if (
    tower.connection === "connected" &&
    tower.calibrated.state === "known" &&
    !tower.calibrated.calibrated
  ) {
    return "calibrating";
  }
  if (tower.connection === "connected") return "connected";
  if (tower.connection === "connecting") return "connecting";
  if (tower.connection === "disconnected") return "lost";
  return "no tower";
};

/** Connect + calibrate are done; Tower Connect may offer Next. */
export const towerReady = (tower: StoryboardState["tower"]): boolean =>
  tower.connection === "connected" &&
  tower.calibrated.state === "known" &&
  tower.calibrated.calibrated;

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
