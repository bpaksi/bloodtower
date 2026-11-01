import type { GearPanelId } from "../../../protocols/v2/views.ts";
import type { LoopRuntimeState, PromptSlot } from "../../loop/runtime.ts";
import { emptyLoopRuntime } from "../../loop/runtime.ts";
import type { LoopRegistry } from "../../loop/types.ts";
import type { PlayContent, PlayState } from "../chapter/playState.ts";
import type { ShellStory } from "./pack.ts";
import { PROVING_GROUNDS_PLAY } from "./playContent.ts";
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
  /**
   * True after this session pressed connect. A drop pauses only then (DEC-155 slice).
   * A session that never connected stays in play, including after Continue.
   */
  towerLinked: boolean;
  screen: ShellScreen;
  setupAt: number;
  setupSteps: { id: string; label: string }[];
  /**
   * Opening moment index after Begin. `-1` before Begin, `OPENING_MOMENTS.length` once
   * Continue has left the last moment. A checkpoint keeps this so Continue can resume it.
   */
  openingIndex: number;
  stage: "lobby" | "playing" | "paused" | "ended";
  pause: { cause: PauseCause } | null;
  pauseSerial: number;
  autosave: AutosaveSnapshot | null;
  activeGameId: string | null;
  /** True after the player chose Continue on pick-game and passed the tower check. */
  resumedFromAutosave: boolean;
  sessionEnded: boolean;
  /**
   * Goodbye card tower line (DEC-219). `no-tower` when this session never connected.
   * `unavailable` when the link is down or the idle command failed. `idle` after
   * `lighting.all-off` is taken. `null` until Done for tonight, or while that command
   * is still in flight.
   */
  goodbyeTower: "idle" | "no-tower" | "unavailable" | null;
  /** Every action offered in the latest advance; the runtime keeps only one prompt slot. */
  offered: PromptSlot[];
  playContent: PlayContent | null;
  play: PlayState | null;
  /** Tower volume 0, 1, or 2. Kept across a panel close and a restart. */
  towerVolume: 0 | 1 | 2;
  /** C2 never splits the party. The label stays "Split party". */
  partySplit: boolean;
  /** Ephemeral. A restart clears these even if a checkpoint captured them. */
  gearPanel: GearPanelId | null;
  gearOwner: string | null;
  gearPaused: boolean;
  gearPicked: string | null;
  gearCard: string | null;
  gearPreviewVolume: 0 | 1 | 2 | null;
  gearFirstHero: string | null;
  gearSecondHero: string | null;
  gearPieceChecks: number;
  gearOpens: number;
};

export const initialHoldings = (story: ShellStory): Record<string, string | null> =>
  Object.fromEntries(story.heroes.map((hero) => [hero.id, null]));

export const initialShellState = (input: {
  sessionId: string;
  seed: string;
  stories?: ShellStory[];
}): ShellState => {
  const stories = input.stories ?? [];
  const boundStory = stories.find((story) => story.card.playable) ?? stories[0];
  const bound = boundStory?.card.id ?? "test";
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
    holdings: boundStory ? initialHoldings(boundStory) : {},
    tower: TOWER_DISCONNECTED,
    towerSetupDone: false,
    towerLinked: false,
    screen: "splash",
    setupAt: 0,
    setupSteps: [],
    openingIndex: -1,
    stage: "lobby",
    pause: null,
    pauseSerial: 0,
    autosave: null,
    activeGameId: null,
    resumedFromAutosave: false,
    sessionEnded: false,
    goodbyeTower: null,
    offered: [],
    playContent: PROVING_GROUNDS_PLAY,
    play: null,
    towerVolume: 1,
    partySplit: false,
    gearPanel: null,
    gearOwner: null,
    gearPaused: false,
    gearPicked: null,
    gearCard: null,
    gearPreviewVolume: null,
    gearFirstHero: null,
    gearSecondHero: null,
    gearPieceChecks: 0,
    gearOpens: 0,
  };
};
