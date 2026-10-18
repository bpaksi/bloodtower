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

/**
 * "4 hunters": the party size. Every hunter in the pack is always in play (the card reads the
 * maximum), so the minimum is not shown. Null when the pack did not load.
 */
export const playersText = (players: StoryCard["players"]): string | null => {
  if (!players) return null;
  return `${players.max} ${players.max === 1 ? "hunter" : "hunters"}`;
};

export const SCREEN_TITLE: Record<FlowScreen, string> = {
  splash: "Loading",
  "tower-connect": "Tower Connect",
  "pick-story": "Pick Story",
  "game-settings": "Game settings",
  "not-playable": "Not playable yet",
  "party-join": "Party Join",
  begin: "Begin Story",
  play: "Play",
  quit: "Quit",
};

/** What the table is waiting for. Shown on the board and as iPad "what happens next". */
export const SCREEN_NEXT: Record<FlowScreen, string> = {
  splash: "Next: pick a story",
  "tower-connect": "Next: gather the party",
  "pick-story": "Next: game settings",
  "game-settings": "Next: connect the tower",
  "not-playable": "This story is listed, but it cannot be played yet.",
  "party-join": "Next: set up the story",
  begin: "Next: begin the story",
  play: "The night is underway.",
  quit: "The table is closed.",
};

/** The card chosen on Pick Story (Game settings and on), or null before one is chosen. */
export const chosenStory = (
  stories: Stories | undefined,
  settings: StoryboardState["gameSettings"],
): StoryCard | null =>
  settings ? (stories?.cards.find((card) => card.id === settings.story) ?? null) : null;

/** The label of the option chosen for each setting, such as "Standard". Unknown stays null. */
export const chosenLabel = (
  settings: NonNullable<StoryboardState["gameSettings"]>,
  settingId: string,
): string | null => {
  const setting = settings.settings.find((item) => item.id === settingId);
  const chosen = settings.chosen[settingId];
  return setting?.options.find((option) => option.id === chosen)?.label ?? null;
};

/**
 * What follows Game settings for the chosen card: Connect Tower, or the party when the story
 * does not use the tower (`tower: none`).
 */
export const gameSettingsNext = (card: StoryCard | null): string =>
  card?.tower === "none" ? "Next: gather the party" : SCREEN_NEXT["game-settings"];

/** Why Continue waits on Connect Tower for a story that needs the tower (R3-UI-23). */
export const TOWER_REQUIRED_REASON = "Connect and calibrate the tower first";

/**
 * The reason Continue is held on Connect Tower, or null when it is not: the chosen story needs
 * the tower and the tower is not yet connected and calibrated.
 */
export const towerRequiredReason = (
  card: StoryCard | null,
  tower: StoryboardState["tower"],
): string | null =>
  card?.tower === "required" && !towerReady(tower) ? TOWER_REQUIRED_REASON : null;

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
