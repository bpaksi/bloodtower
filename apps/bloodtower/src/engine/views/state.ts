import type { ViewScreen } from "../../protocols/v2/common.ts";
import type { GearView, HintView } from "../../protocols/v2/views.ts";
import type { CompassSlot } from "../loops/chapter/board.ts";
import type { HeroCardData } from "../loops/session/pack.ts";

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
  /** Board only, at Pick (CU/08). Never copied to a device view. */
  card?: HeroCardData;
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
} & ({ open: true; slot?: CompassSlot } | { open: false; reason: string; slot?: CompassSlot });

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
  fallen?: boolean;
};

/** Story-board status band. Health and purse stay unavailable until a pack supplies them. */
export type DayPhaseView = "regroup" | "roll" | "turn" | "skull" | "skull-sim" | "effects";

export type DayRollView = {
  groupId: string;
  name: string;
  rolled: number;
  virtue: number;
  terrain: number;
  corruption: number;
  /** The per-split-group shift (PT-06). Omitted when the party is not split. */
  split?: number;
  total: number;
};

/** The groups card on a day whose start applied a queued change (PT-18, Q4.1). */
export type GroupsCardView = {
  day: number;
  /** How long the board shows it, from `AUTO_ADVANCE_MS` (Q4.4). */
  holdMs: number;
  groups: { groupId: string; heroNames: string[] }[];
};

export type DaySkullView = {
  kingdomLabel: string | null;
  buildings: { spaceId: string; name: string; skulls: number; fallen: boolean }[];
  fell: string[];
  /** One "A skull falls on <building>." per skull of the night, in drop order (PT-07). */
  lines?: string[];
};

export type HeroCorruptionView = {
  heroId: string;
  heroName: string;
  /** The group lead whose panel shows this hero (UI-030). */
  panelHeroId: string;
  count: number;
};

/**
 * The turn-start virtue panel (CU/14, UI-037). Lines are the group's virtues that apply now. A
 * virtue that asks a choice has `choice`, with one option per button; `heroIds` is the acting
 * group, so only an iPad holding one of them is offered the buttons. `picked` mirrors the answers.
 */
export type VirtueChoiceView = {
  virtueId: string;
  prompt: string;
  options: { promptId: string; label: string; enabled: boolean }[];
};

export type VirtuePanelView = {
  title: string;
  heroIds: string[];
  lines: { id: string; text: string }[];
  choice: VirtueChoiceView | null;
  picked: { virtueId: string; name: string; label: string }[];
};

/** The event scene on the table (C3/12, UI-041). The board words it; the engine sends structure. */
export type EventSceneView = {
  groupId: string;
  heroIds: string[];
  type: "quiet" | "windfall" | "hazard" | "foes" | "disaster" | "people";
  hazard: "plague" | "lost" | "storm" | "trick" | null;
  offer: "rumour" | "trick" | null;
  stage: "choose" | "result";
  options: {
    promptId: string;
    optionId: "hit-points" | "lose-turn" | "go-around" | "pay-off" | "fight";
    enabled: boolean;
  }[];
  result:
    | { kind: "quiet" }
    | { kind: "windfall"; gold: number }
    | { kind: "saved"; counterHeroId: string; counterName: string }
    | { kind: "rumour" }
    | { kind: "hit-points"; amount: number }
    | { kind: "lose-turn" }
    | { kind: "went-around"; amount: number }
    | { kind: "paid"; gold: number }
    | null;
  line: string | null;
  heroes: {
    heroId: string;
    name: string;
    hp: { hp: number; max: number } | null;
    gold: number | null;
  }[];
  purse: number | null;
};

/**
 * The building menu (C3/13, UI-043). `prompt` is the iPad's line for the step; `result` is the
 * board's line for a finished pick (SCR-014). Each option is one button, offered by `promptId`;
 * `detail` is its cost line, and a disabled option says why. A step with no Next (`auto`) ends by
 * itself after `holdMs` or when its narration ends.
 */
export type BuildingOptionView = {
  promptId: string;
  label: string;
  detail: string | null;
  enabled: boolean;
  reason: string | null;
};

export type BuildingResultView = {
  pick: string;
  line: string;
  /** The hero the pick helped and the corruption that went, named for the table. */
  detail: string | null;
  badge: string | null;
  auto: boolean;
};

/** The quest scene on the building panel (C3/14, UI-042); the board words it from the Copy table. */
export type QuestSceneView = {
  questId: string;
  phase: "choose" | "hero" | "rewards" | "end";
  track: { done: number; total: number };
  optionId: string | null;
  options: {
    promptId: string;
    optionId: string;
    needsItem: string | null;
    held: boolean;
    cost: {
      kind: "gold" | "hp" | "corruption" | "toll";
      amount: number;
      hitPoints: number;
      purse: number | null;
    } | null;
    gains: ({ kind: "gold"; amount: number } | { kind: "item"; item: string })[];
  }[];
  pending: "corruption" | "item" | null;
  reveal: string | null;
  rewards: {
    gold: number;
    questGold: number;
    items: string[];
    presentHeroes: number;
    tollShort: boolean;
  } | null;
};

export type BuildingPanelView = {
  title: string;
  step:
    | "menu"
    | "who"
    | "corruption"
    | "rest-moves"
    | "give-back"
    | "quest"
    | "quest-hero"
    | "result";
  heroIds: string[];
  prompt: string | null;
  options: BuildingOptionView[];
  result: BuildingResultView | null;
  holdMs: number;
  /** Skulls on this building now, for the board (EV-04). */
  skulls: number;
  /** Moves the group has left (EV-08). Null when not known. */
  movesLeft: number | null;
  /** The quest scene, only while the group is inside a quest (C3/14). */
  quest?: QuestSceneView | null;
};

export type TableBand = {
  chapter: string;
  day: number;
  /** Nights the supply still covers (DEC-686). Null when not known. */
  daysLeft?: number | null;
  /** The coming night's drop only (Q-C3-19). */
  threat?: number | null;
  phase?: DayPhaseView | null;
  rolls?: DayRollView[];
  effects?: string[];
  skull?: DaySkullView | null;
  corruptions?: HeroCorruptionView[];
  groupsCard?: GroupsCardView | null;
  /** The turn-start virtue panel, only while it shows (CU/14). */
  virtue?: VirtuePanelView | null;
  /** The event scene after a group's turn, only while it shows (C3/12). */
  event?: EventSceneView | null;
  /** The building menu while a group is inside a building (C3/13). */
  building?: BuildingPanelView | null;
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

/**
 * The game of chance on the Story board (CU/15, UI-045): the starting-purse step. `amount` is null
 * before the spin and "unavailable" when a purse is set but not a usable number (never zero).
 * `line` is the copy the board paints once there is a result. `cue` counts the spins that ask the
 * board to play the coin sound (no tower, Q7.4); the board plays it when the count goes up.
 */
export type ChanceView = {
  title: string;
  amount: number | "unavailable" | null;
  line: string | null;
  cue: number;
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
  /** The first-time hint on the board now (CU/09). Story board only. */
  hint?: HintView | null;
  /**
   * While a hint shows, the iPads keep the screen before it (CU/09): this table and these
   * actions replace `table` and `actions` for a device. The Story board ignores it.
   */
  deviceHold?: { table: TableBand | null; actions: ViewAction[] } | null;
  /** Gear panel snapshot. Omitted on fixtures that predate the toolbar. */
  gear?: GearView;
  /** The starting-purse step's board panel. Story board only; null elsewhere. */
  chance?: ChanceView | null;
};

export type Audience = { kind: "board" } | { kind: "device"; deviceId: string };
