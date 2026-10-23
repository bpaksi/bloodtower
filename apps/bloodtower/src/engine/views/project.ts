import type { PromptSlot } from "../loop/runtime.ts";
import type { LoopPhase } from "../loop/types.ts";
import type { EngineState } from "../state.ts";

/**
 * Setup screens this projection covers (spec §3.1). Same ids as `protocols/v2`.
 * The session screen, Goodbye and the day slice are later steps.
 */
export const SETUP_SCREENS = [
  "splash",
  "landing",
  "sound",
  "tower-connect",
  "volume-test",
  "pick-game",
  "pick-story",
  "game-settings",
  "claim-heroes",
  "seals-and-skulls",
] as const;
export type SetupScreen = (typeof SETUP_SCREENS)[number];

export type LevelView = {
  loopId: string;
  phase: LoopPhase;
  /** Public text for this level. A private id is omitted, not shown as blank. */
  shows: string;
};

export type PrivateLine = {
  id: string;
  heroId: string;
  text: string;
};

export type ShownHero = {
  id: string;
  name: string;
  /** Device that holds this hero, or null when nobody holds them. */
  deviceId: string | null;
  privateLines: readonly PrivateLine[];
};

export type PublicNarration = {
  id: string;
  text: string;
};

/**
 * An action the engine has already judged. `deviceIds` empty means every device.
 * The board never receives actions.
 */
export type OfferedAction = {
  promptId: string;
  actionId: string;
  label: string;
  deviceIds: readonly string[];
} & ({ open: true } | { open: false; reason: string });

export type ViewState = {
  screen: SetupScreen;
  levels: readonly LevelView[];
  heroes: readonly ShownHero[];
  narration: PublicNarration | null;
  actions: readonly OfferedAction[];
};

export type Audience = { kind: "board" } | { kind: "device"; deviceId: string };

export type PublicHero = {
  id: string;
  name: string;
  held: boolean;
};

export type BoardView = {
  screen: SetupScreen;
  levels: LevelView[];
  heroes: PublicHero[];
  narration: PublicNarration | null;
};

export type WireAction =
  | { promptId: string; actionId: string; label: string; open: true }
  | { promptId: string; actionId: string; label: string; open: false; reason: string };

export type DeviceHero = {
  id: string;
  name: string;
  privateLines: { id: string; text: string }[];
};

export type DeviceView = {
  screen: SetupScreen;
  deviceId: string;
  levels: LevelView[];
  roster: PublicHero[];
  heroes: DeviceHero[];
  narration: PublicNarration | null;
  actions: WireAction[];
};

const forbiddenText = (value: string): boolean =>
  value.includes(".private.") || value.includes("ipad:");

const publicText = (value: string): string | null => (forbiddenText(value) ? null : value);

const publicLevels = (levels: readonly LevelView[]): LevelView[] =>
  levels.flatMap((level) => {
    const loopId = publicText(level.loopId);
    const shows = publicText(level.shows);
    if (loopId === null || shows === null || forbiddenText(level.phase)) return [];
    return [{ loopId, phase: level.phase, shows }];
  });

const publicHeroes = (heroes: readonly ShownHero[]): PublicHero[] =>
  heroes.flatMap((hero) => {
    const id = publicText(hero.id);
    const name = publicText(hero.name);
    if (id === null || name === null) return [];
    return [{ id, name, held: hero.deviceId !== null }];
  });

const publicNarration = (narration: PublicNarration | null): PublicNarration | null => {
  if (!narration) return null;
  const id = publicText(narration.id);
  const text = publicText(narration.text);
  if (id === null || text === null) return null;
  return { id, text };
};

const ownHeroes = (heroes: readonly ShownHero[], deviceId: string): DeviceHero[] =>
  heroes
    .filter((hero) => hero.deviceId === deviceId)
    .map((hero) => ({
      id: hero.id,
      name: hero.name,
      privateLines: hero.privateLines
        .filter((line) => line.heroId === hero.id)
        .map((line) => ({ id: line.id, text: line.text })),
    }));

const wireAction = (action: OfferedAction): WireAction => {
  if (action.promptId.length === 0 || action.actionId.length === 0 || action.label.length === 0) {
    throw new Error("An offered action needs a prompt id, an action id and a label.");
  }
  if (action.open) {
    return {
      promptId: action.promptId,
      actionId: action.actionId,
      label: action.label,
      open: true,
    };
  }
  if (action.reason.length === 0) throw new Error("A closed action needs a reason.");
  return {
    promptId: action.promptId,
    actionId: action.actionId,
    label: action.label,
    open: false,
    reason: action.reason,
  };
};

const offeredTo = (actions: readonly OfferedAction[], deviceId: string): WireAction[] =>
  actions
    .filter((action) => action.deviceIds.length === 0 || action.deviceIds.includes(deviceId))
    .map(wireAction);

/**
 * One view for one audience. Private lines stay on the device that holds that hero.
 * Offered actions are copied. This function does not decide which action is legal.
 */
export function project(state: ViewState, audience: { kind: "board" }): BoardView;
export function project(
  state: ViewState,
  audience: { kind: "device"; deviceId: string },
): DeviceView;
export function project(state: ViewState, audience: Audience): BoardView | DeviceView {
  const levels = publicLevels(state.levels);
  const heroes = publicHeroes(state.heroes);
  const narration = publicNarration(state.narration);
  if (audience.kind === "board") {
    return { screen: state.screen, levels, heroes, narration };
  }
  return {
    screen: state.screen,
    deviceId: audience.deviceId,
    levels,
    roster: heroes,
    heroes: ownHeroes(state.heroes, audience.deviceId),
    narration,
    actions: offeredTo(state.actions, audience.deviceId),
  };
}

/** Public levels from the running loop stack. `shows` is the loop id until a loop names its own line. */
export const levelsFromEngine = (engine: EngineState): LevelView[] =>
  engine.loops.stack.map((frame) => ({
    loopId: frame.loopId,
    phase: frame.phase,
    shows: frame.loopId,
  }));

/**
 * The step-3 prompt slot has no label. The caller supplies the label and, when the slot is
 * closed, the reason. Open or closed comes from the slot.
 */
export const actionFromPrompt = (
  prompt: PromptSlot | null,
  label: string,
  closedReason: string,
): OfferedAction[] => {
  if (!prompt) return [];
  if (label.length === 0) throw new Error("An offered action needs a label.");
  if (prompt.open) {
    return [
      {
        promptId: prompt.promptId,
        actionId: prompt.actionId,
        label,
        open: true,
        deviceIds: [],
      },
    ];
  }
  if (closedReason.length === 0) throw new Error("A closed action needs a reason.");
  return [
    {
      promptId: prompt.promptId,
      actionId: prompt.actionId,
      label,
      open: false,
      reason: closedReason,
      deviceIds: [],
    },
  ];
};
