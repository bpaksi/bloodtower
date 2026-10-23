import type { LoopRuntimeState, PromptSlot } from "../../loop/runtime.ts";
import { emptyLoopRuntime } from "../../loop/runtime.ts";
import type { LoopRegistry } from "../../loop/types.ts";
import type { ShellStory } from "./pack.ts";
import { createShellRegistry } from "./registry.ts";
import type { ShellScreen } from "./screens.ts";
import type { TowerSnapshot } from "./tower.ts";
import { TOWER_DISCONNECTED } from "./tower.ts";

export const SHELL_ENGINE_VERSION = "0.0.0-step6";

export type PauseCause = "disconnect" | "tower-lost";

export type AutosaveSnapshot = {
  gameId: string;
  packId: string;
  /** Internal seed; never shown in the UI (DEC-217). */
  seed: string;
  day: number;
};

export type ShellState = {
  version: typeof SHELL_ENGINE_VERSION;
  sessionId: string;
  seed: string;
  eventSeq: number;
  loops: LoopRuntimeState;
  registry: LoopRegistry;
  stories: ShellStory[];
  focusStoryId: string;
  boundStoryId: string;
  chosenStoryId: string | null;
  settingValues: Record<string, string>;
  setSerial: number;
  devices: Set<string>;
  /** hero id → device id holding them, or null when unclaimed. */
  holdings: Record<string, string | null>;
  tower: TowerSnapshot;
  towerSetupDone: boolean;
  screen: ShellScreen;
  setupAt: number;
  setupSteps: { id: string; label: string }[];
  stage: "lobby" | "playing" | "paused" | "ended";
  pause: { cause: PauseCause } | null;
  pauseSerial: number;
  autosave: AutosaveSnapshot | null;
  activeGameId: string | null;
  /** True after the player chose Continue on pick-game and passed the tower check. */
  resumedFromAutosave: boolean;
  sessionEnded: boolean;
  /** Every action offered in the latest advance; the runtime keeps only one prompt slot. */
  offered: PromptSlot[];
};

export const initialHoldings = (story: ShellStory): Record<string, string | null> =>
  Object.fromEntries(story.heroes.map((hero) => [hero.id, null]));

export const initialShellState = (input: {
  sessionId: string;
  seed: string;
  stories?: ShellStory[];
}): ShellState => {
  const stories = input.stories ?? [];
  const bound = stories[0]?.card.id ?? "test";
  return {
    version: SHELL_ENGINE_VERSION,
    sessionId: input.sessionId,
    seed: input.seed,
    eventSeq: 0,
    loops: emptyLoopRuntime(),
    registry: createShellRegistry(),
    stories,
    focusStoryId: bound,
    boundStoryId: bound,
    chosenStoryId: null,
    settingValues: {},
    setSerial: 0,
    devices: new Set(),
    holdings: stories[0] ? initialHoldings(stories[0]) : {},
    tower: TOWER_DISCONNECTED,
    towerSetupDone: false,
    screen: "tower-connect",
    setupAt: 0,
    setupSteps: [],
    stage: "lobby",
    pause: null,
    pauseSerial: 0,
    autosave: null,
    activeGameId: null,
    resumedFromAutosave: false,
    sessionEnded: false,
    offered: [],
  };
};
