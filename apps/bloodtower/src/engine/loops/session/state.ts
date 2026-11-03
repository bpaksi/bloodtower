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

export const SHELL_ENGINE_VERSION = "0.0.0-c2-08";

/** Checkpoints written by these engines still load (EV-18). Their missing Enter state reads as "not entered". */
export const SUPPORTED_CHECKPOINT_VERSIONS: readonly string[] = [
  "0.0.0-step6",
  "0.0.0-c2-05",
  "0.0.0-c2-06",
  "0.0.0-c2-07",
  SHELL_ENGINE_VERSION,
];

export type PauseCause = "disconnect" | "tower-lost";

/** The screen a tower-lost pause came from: Reconnect and Go on without return to it (DEC-711). */
export type PauseReturn = "play" | "setup" | "begin";

/**
 * A Reconnect running after a tower was lost mid-game (DEC-301): the connect, then the tower check
 * (MEC-018, as C1 built it). `origin` is where a failure returns to: the pause, or the play it came from.
 */
export type ReconnectState = {
  step: "connecting" | "calibrate" | "calibrating";
  origin: "pause" | "menu";
};

/** Where the session Enter is (MEC-039). `null` on the state once the Enter has finished. */
export type EnterStep = "join" | "board" | "choice" | "connecting" | "calibrate" | "calibrating";

export type EnterState = {
  step: EnterStep;
  /** The last connect or calibrate failed; the choice shows "Tower not found". */
  failed: boolean;
};

/** Tonight's tower choice. It lasts the session (DEC-152). */
export type TowerChoice = "undecided" | "connect" | "without";

// One iPad's sound step on Pick story (Bob 2026-10-31): `levels` after its Enable sound tap,
// `done` after Keep. An iPad with no entry has not tapped yet. `played` is the volume whose
// sound has played (the tower's answer on the connect track); `pending` waits for that answer.
export type DeviceSound = {
  phase: "levels" | "done";
  played: number | null;
  pending: number | null;
};

export type AutosaveSnapshot = {
  gameId: string;
  packId: string;
  /** Internal seed; never shown in the UI (DEC-217). */
  seed: string;
  day: number;
};

/**
 * What this game's presses have added up to (SCR-019 slice). A null count is not known:
 * a game saved before C2/07 has no counts, and no skull is known until the first is recorded.
 */
export type GameTally = {
  moves: number | null;
  buildings: number | null;
  /** Days on which a skull drop was recorded. A day that drops two skulls counts once. */
  skulls: number | null;
  /** The last day a drop was recorded on, so a second skull that day is not counted again. */
  skullDay: number | null;
};

export const emptyTally = (): GameTally => ({
  moves: 0,
  buildings: 0,
  skulls: null,
  skullDay: null,
});

/** One game tonight, for the session screen's list and its stats (SCR-021, SCR-019). */
export type TonightGame = {
  gameId: string;
  outcome: "quit" | "won" | "lost";
  /** The story, settings and held heroes Play again starts from (DEC-708). */
  storyId: string;
  settingValues: Record<string, string>;
  /** hero id → the iPad that held them when the game ended. */
  holdings: Record<string, string>;
  /** The day the game ended on, or null before the first day began. */
  day: number | null;
  moves: number | null;
  buildings: number | null;
  skulls: number | null;
  /** The optional 1 to 5 fun rating; never blocks anything. */
  rating: number | null;
};

/** What the session screen is asking "Are you sure?" about (DEC-709, DEC-713). */
export type SessionConfirm = "new-game" | "done" | "play-again";

/** Where the tower block leads when the session screen ran it again (DEC-711). */
export type EnterThen = "new-game" | "continue" | "play-again";

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
  /** `null` once the Enter has finished. A checkpoint from before C2/05 has none. */
  enter: EnterState | null;
  /** Set when the session screen ran the tower block again; the Enter's end goes there. */
  enterThen: EnterThen | null;
  towerChoice: TowerChoice;
  /** Per iPad, by device id. Browser audio is lost on a reload, so a restart clears it. */
  sound: Record<string, DeviceSound>;
  /** The volume an iPad kept on Pick story, or null until one does. The move-roll cue uses it. */
  keptVolume: number | null;
  /**
   * True after this session pressed connect. A drop pauses only then (DEC-155 slice).
   * A session that never connected stays in play, including after Continue.
   */
  towerLinked: boolean;
  /**
   * True once this game went on without the tower (DEC-301, Go on without). A Continue of the
   * game keeps it: the tower is not asked for again and the skull drop stays simulated.
   */
  towerWithout: boolean;
  /** A Reconnect in progress, or null. It is not kept across a restart. */
  reconnect: ReconnectState | null;
  screen: ShellScreen;
  setupAt: number;
  setupSteps: { id: string; label: string }[];
  /**
   * Opening moment index after Begin. `-1` before Begin, `OPENING_MOMENTS.length` once
   * Continue has left the last moment. A checkpoint keeps this so Continue can resume it.
   */
  openingIndex: number;
  stage: "lobby" | "playing" | "paused" | "ended";
  pause: { cause: PauseCause; returnTo?: PauseReturn } | null;
  pauseSerial: number;
  autosave: AutosaveSnapshot | null;
  activeGameId: string | null;
  /** True after the player chose Continue and the saved game was loaded. */
  resumedFromAutosave: boolean;
  /** Set for one step when Continue wants the saved game loaded; the host reads and clears it. */
  continueRequested: boolean;
  sessionEnded: boolean;
  /** Tonight's games, oldest first (SCR-021). A host restart keeps them with the checkpoint. */
  games: TonightGame[];
  /** The session screen's "Are you sure?", or null. */
  confirm: SessionConfirm | null;
  /** The game (its place in `games`, from 1) whose stats the session screen shows, or null. */
  statsGame: number | null;
  /** The active game began from Play again: its claims come prefilled and Pick story is skipped. */
  playAgain: boolean;
  /** The active game's counts. A restart keeps them with the checkpoint. */
  tally: GameTally;
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
    enter: { step: "join", failed: false },
    enterThen: null,
    towerChoice: "undecided",
    sound: {},
    keptVolume: null,
    towerLinked: false,
    towerWithout: false,
    reconnect: null,
    screen: "table-join",
    setupAt: 0,
    setupSteps: [],
    openingIndex: -1,
    stage: "lobby",
    pause: null,
    pauseSerial: 0,
    autosave: null,
    activeGameId: null,
    resumedFromAutosave: false,
    continueRequested: false,
    sessionEnded: false,
    games: [],
    confirm: null,
    statsGame: null,
    playAgain: false,
    tally: emptyTally(),
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
