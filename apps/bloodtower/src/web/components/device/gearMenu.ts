/** Loremaster help lines (C2 feature 04 screen spec, 2026-10-31). */
export const HELP_LINES: Record<string, string> = {
  join: "Scan the code with each iPad to join the table.",
  claim: "Tap Pick for the hero this iPad speaks for at the table.",
  waiting: "The table is getting ready. This iPad will move on by itself.",
  "base-board-setup":
    "Lay out the board and pieces as shown. Tap Board is set up when the table is ready.",
  "tower-choice": "Tap Connect Tower to play with the tower, or Play without Tower for tonight.",
  connecting: "The app is reaching the tower. Keep it switched on and close by.",
  "tower-failed":
    "The tower didn't answer. Check it's on, then tap Connect Tower or Play without Tower.",
  "enable-sound": "Tap Enable sound so this iPad can play the story's voice and sound.",
  volume: "Set how loud the tower is. Press a volume to hear it, then tap Keep.",
  "pick-story": "Tap the story you want to play tonight.",
  "story-settings": "Choose the game length and options for tonight's story.",
  play: "The game is on. Follow the prompts on this iPad and the Story board.",
  paused: "The game is paused and nothing moves. Tap Resume to play on.",
  "tower-lost": "The tower stopped answering and the game waits. Tap Reconnect, or Go on without.",
  "piece-check": "Set the pieces back where the saved game had them. Tap Done after each step.",
  "glyphs-facing": "Tell the app which glyphs you can see on the tower.",
  "session-screen": "Your saved games are here. Tap Continue for the last one, or New game.",
  "game-stats": "Here's how tonight went. Rate it if you like, then tap Play again.",
  "session-over": "The game is over and saved. You can close the app for tonight.",
  "day-on-the-board": "A new day begins. Move your heroes, then choose where to go.",
  "event-scene":
    "Something happened on the road. Make a choice if one is shown; the scene moves on by itself.",
  "building-menu": "Choose what to do in this building, or Leave.",
  "quest-scene": "A quest is in front of you. Pick one of its options.",
  "chapter-card": "This is your chapter goal. Finish it before the days run out.",
  "outcome-scene": "The chapter is over. See how it ended; the game stats come next.",
};

export const MENU_VERSION = "v0.0.0";

const ONLY_IN_GAME = "Only in a game.";
const C3 = "C3+";
const TOWER_CONNECTED = "The tower is connected.";
const OPEN_ELSEWHERE = "Open on another iPad.";

export type MenuContext = {
  inGame: boolean;
  beforeBegin: boolean;
  sessionScreen: boolean;
  towerConnected: boolean;
  partySplit: boolean;
  blockedItem: string | null;
};

export type GearGroup = "Look up" | "Table" | "Leave";

export type GearRow = {
  id: string;
  group: GearGroup;
  label: string;
  enabled: boolean;
  reason: string | null;
  panel: boolean;
};

const row = (
  ctx: MenuContext,
  id: string,
  group: GearGroup,
  label: string,
  enabled: boolean,
  reason: string | null,
  panel: boolean,
): GearRow => {
  if (ctx.blockedItem === id && enabled) {
    return { id, group, label, enabled: false, reason: OPEN_ELSEWHERE, panel };
  }
  return { id, group, label, enabled, reason: enabled ? null : reason, panel };
};

/** The gear list in DEC-229 order. Disabled rows stay visible. */
export const gearRows = (ctx: MenuContext): GearRow[] => {
  const lookEnabled = ctx.inGame || ctx.beforeBegin;
  const splitLabel = ctx.partySplit ? "Rejoin party" : "Split party";
  return [
    row(ctx, "current-party", "Look up", "Current party", ctx.inGame, ONLY_IN_GAME, true),
    row(ctx, "look-up", "Look up", "Look up", lookEnabled, ONLY_IN_GAME, true),
    row(ctx, "game-board-setup", "Table", "Game board setup", true, null, true),
    row(ctx, "volume", "Table", "Volume", true, null, true),
    row(ctx, "split-party", "Table", splitLabel, false, C3, false),
    row(ctx, "use-potion", "Table", "Use a potion or item", false, C3, false),
    row(ctx, "change-who-holds-whom", "Table", "Change who holds whom", true, null, true),
    row(ctx, "join-another-ipad", "Table", "Join another iPad", true, null, true),
    row(ctx, "tower", "Table", "Tower", !ctx.towerConnected, TOWER_CONNECTED, false),
    row(ctx, "pause-resume", "Table", "Pause/Resume", ctx.inGame, ONLY_IN_GAME, false),
    row(ctx, "save-and-quit", "Leave", "Save and quit", ctx.inGame, ONLY_IN_GAME, false),
  ];
};

export const menuContextFromOffers = (quit: boolean, connect: boolean): MenuContext => ({
  inGame: quit,
  beforeBegin: false,
  sessionScreen: !quit,
  towerConnected: !connect,
  partySplit: false,
  blockedItem: null,
});
