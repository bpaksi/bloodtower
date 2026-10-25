import type { ViewScreen } from "../../protocols/v2/common.ts";

export type PrivateLine = {
  id: string;
  text: string;
};

/** A hero at the table. `deviceId` is null until an iPad claims them. */
export type SeatedHero = {
  id: string;
  name: string;
  deviceId: string | null;
  lines: PrivateLine[];
};

export type LoopLevel = {
  id: string;
  label: string;
  /** Public text this level shows. The same string is safe on the board. */
  shows: string;
};

/**
 * An action the engine offers. `deviceId` null means every joined device.
 * The wire view drops `deviceId`: the client sees prompt, action, label, and open or a reason.
 */
export type ViewAction = {
  promptId: string;
  actionId: string;
  label: string;
  deviceId: string | null;
} & ({ open: true } | { open: false; reason: string });

export type PlaceStill = {
  building: "village" | "bazaar" | "citadel" | "sanctuary";
  stillId: string;
  caption: string;
};

export type TableGroup = {
  heroId: string;
  heroName: string;
  kingdom: "N" | "E" | "S" | "W";
  kingdomLabel: string;
  spaceId: string;
  spaceName: string;
  building: string | null;
  inside: boolean;
  alone: boolean;
};

/** Story-board status band. Health and purse stay unavailable until a pack supplies them. */
export type TableBand = {
  chapter: string;
  day: number;
  health: "unavailable";
  purse: "unavailable";
  actingGroup: string | null;
  actingHeroId: string | null;
  movesLeft: number | null;
  moveRoll: number | null;
  modifier: "none";
  waitingFor: string | null;
  groups: TableGroup[];
};

/**
 * What `project` reads. Session and game loops fill this in later steps.
 * It is not the reducer state: step 5 does not change `step`.
 */
export type ViewSetting = {
  id: string;
  label: string;
  optionId: string;
  options: { id: string; label: string }[];
};

export type ViewState = {
  screen: ViewScreen;
  levels: LoopLevel[];
  heroes: SeatedHero[];
  actions: ViewAction[];
  narration: { lineId: string; text: string } | null;
  /** Game settings only. The iPad paints one button per option. */
  settings?: ViewSetting[];
  /** Present during play. Omitted on setup fixtures. */
  table?: TableBand | null;
  /** Story board only. Null when nobody is inside a place. */
  place?: PlaceStill | null;
};

export type Audience = { kind: "board" } | { kind: "device"; deviceId: string };
