import type { BoardView, ViewScreen } from "bloodtower-protocols";

/** Screens that use the centred startup dialog. Play and pause keep the table band. */
export const STARTUP_SCREENS = new Set<ViewScreen>([
  "splash",
  "tower-connect",
  "pick-story",
  "game-settings",
  "claim-heroes",
  "setup",
  "begin",
  "pick-game",
  "session",
  "goodbye",
]);

export const isStartupScreen = (screen: ViewScreen): boolean => STARTUP_SCREENS.has(screen);

const STEP_NAME: Record<ViewScreen, string> = {
  splash: "Splash",
  "tower-connect": "Tower Connect",
  "pick-story": "Pick Story",
  "game-settings": "Game settings",
  "claim-heroes": "Party Join",
  setup: "Setup",
  begin: "Begin",
  "pick-game": "Pick a game",
  play: "Play",
  pause: "Paused",
  session: "Session",
  goodbye: "Goodbye",
};

export type StoryDoor = {
  id: string;
  title: string;
  tagline: string;
  players: string;
  playable: boolean;
  focused: boolean;
};

export type StartupStatus = {
  tower: string;
  devices: string;
  step: string;
};

const protocolDump = (shows: string) => shows.startsWith("Screen ");

const screenLevel = (view: BoardView) =>
  view.levels.find((level) => level.id === view.screen) ?? view.levels.at(-1);

/** Join code and URL from the host's join level. The raw line is not shown. */
export const joinFromBoard = (view: BoardView): { code: string; url: string } | null => {
  const join = view.levels.find((level) => level.id === "join");
  if (!join) return null;
  const match = /^Code (\d{6}) — (\S+?)(?: \(unreachable\))?$/.exec(join.shows);
  if (!match?.[1] || !match[2]) return null;
  return { code: match[1], url: match[2] };
};

export const storyDoors = (view: BoardView): StoryDoor[] => {
  const parsed = view.levels.flatMap((level): StoryDoor[] => {
    if (!level.id.startsWith("door-")) return [];
    const id = level.id.slice("door-".length);
    const [mark, tagline, players, ready] = level.shows.split("\n");
    if (!tagline || !players || !ready) {
      return [
        {
          id,
          title: level.label,
          tagline: level.shows,
          players: "",
          playable: true,
          focused: false,
        },
      ];
    }
    return [
      {
        id,
        title: level.label,
        tagline,
        players,
        playable: ready !== "Not playable yet",
        focused: mark === "In focus",
      },
    ];
  });
  if (parsed.length > 0) {
    if (parsed.some((door) => door.focused)) return parsed;
    return parsed.map((door, index) => (index === 0 ? { ...door, focused: true } : door));
  }
  if (view.screen !== "pick-story") return [];
  const title = screenLevel(view)?.shows;
  if (!title || protocolDump(title)) return [];
  return [
    {
      id: "story",
      title,
      tagline: "A story door.",
      players: "",
      playable: true,
      focused: true,
    },
  ];
};

export const doorFrame = (doors: readonly StoryDoor[]) => {
  const focusIndex = Math.max(
    0,
    doors.findIndex((door) => door.focused),
  );
  const focus = doors[focusIndex] ?? null;
  if (!focus) return { focus: null, previous: null, next: null };
  const others = doors.filter((_, index) => index !== focusIndex);
  return {
    focus,
    previous: others.length > 1 ? (others[0] ?? null) : null,
    next: others.length === 1 ? (others[0] ?? null) : (others[1] ?? null),
  };
};

export type SettingRow = { id: string; label: string; value: string };

export const settingRows = (view: BoardView): SettingRow[] =>
  view.levels.flatMap((level) => {
    if (!level.id.startsWith("setting-")) return [];
    return [{ id: level.id.slice("setting-".length), label: level.label, value: level.shows }];
  });

/** R2-01 strip. Missing fields stay unavailable, never a guessed zero. */
export const startupStatus = (view: BoardView): StartupStatus => {
  const level = view.levels.find((row) => row.id === "table-status");
  const match = level
    ? /^tower: (connected|calibrating|lost|no tower)\ndevices: (\d+)\nstep: (.+)$/.exec(level.shows)
    : null;
  return {
    tower: match?.[1] ?? "unavailable",
    devices: match?.[2] ?? "unavailable",
    step: match?.[3] ?? STEP_NAME[view.screen],
  };
};

export const setupProgress = (view: BoardView): { label: string; instruction: string } => {
  const level = screenLevel(view);
  const label = level?.label ?? "";
  const shows = level?.shows ?? "";
  return {
    label: /^Step \d+ of \d+$/.test(label) ? label : "Board setup",
    instruction:
      !shows || protocolDump(shows)
        ? "Lay the board out on the table and face each kingdom."
        : shows,
  };
};

export const publicLine = (view: BoardView): string => {
  const shows = screenLevel(view)?.shows ?? "";
  return protocolDump(shows) ? "" : shows;
};

export const claimCount = (view: BoardView): string => {
  const held = view.heroes.filter((hero) => hero.held).length;
  return `${held} of ${view.heroes.length} claimed`;
};

export const hallOpening = (view: BoardView): boolean =>
  view.screen === "pick-game" && view.levels.some((level) => level.id === "wait");

/** R2-115: what the table is waiting for. Not a control. */
export const waitingFor = (view: BoardView): string => {
  switch (view.screen) {
    case "splash":
      return joinFromBoard(view)
        ? "Waiting for an iPad to press Play."
        : "Waiting for the hall to open.";
    case "tower-connect":
      return "Waiting for an iPad to connect the tower, or to play without it.";
    case "pick-story":
      return "Waiting for an iPad to choose a story.";
    case "game-settings":
      return "Waiting for an iPad to confirm these settings.";
    case "claim-heroes": {
      const open = view.heroes.filter((hero) => !hero.held).map((hero) => hero.name);
      if (open.length === 0) return "Waiting for an iPad to set up the board.";
      return `Waiting for ${open.join(", ")} to be claimed.`;
    }
    case "setup":
      return "Waiting for an iPad to mark this step done.";
    case "begin":
      return "Waiting for an iPad to begin the story.";
    case "pick-game":
      return hallOpening(view)
        ? "Waiting for the hall to open."
        : "Waiting for an iPad to start or continue a game.";
    case "session":
      return "Waiting for an iPad to start a new game, or to be done for tonight.";
    case "goodbye":
      return "The evening is closing.";
    default:
      return "Waiting.";
  }
};
