import { randomBytes } from "node:crypto";
import {
  BEGIN_BACK_ID,
  type ControlAction,
  type ControlLock,
  type DeviceState,
  deviceStatePayloadSchema,
  type FlowScreen,
  GAME_SETTINGS_BACK_ID,
  GAME_SETTINGS_CONTINUE_ID,
  type GameSettings,
  KEEPER_LINE_COUNT,
  KEEPER_MOMENT_ID,
  PARTY_JOIN_BACK_ID,
  PARTY_JOIN_CONTINUE_ID,
  type Pack,
  type PauseCause,
  PICK_STORY_PROMPT_PREFIX,
  SET_PROMPT_PREFIX,
  SETUP_BACK_PREFIX,
  SETUP_DONE_PREFIX,
  type StartupSummary,
  type Stories,
  type StoryboardState,
  type StoryCard,
  storyboardStatePayloadSchema,
  TOWER_CONNECT_BACK_ID,
  TOWER_CONNECT_CONTINUE_ID,
  type TowerChoice,
  type TowerMode,
  type TowerSnapshot,
  VOLUME_ANSWER_PROMPT_ID,
  VOLUME_PLAY_PROMPT_PREFIX,
  VOLUME_TEST_BACK_ID,
  VOLUME_TEST_CONTINUE_ID,
  type VolumeAnswer,
  type VolumeTest,
  volumeAnswerSchema,
} from "bloodtower-protocols";
import { lockPresses, type PressInput, type PressLog } from "../control/lock.ts";
import type { RosterSnapshot } from "../db/store.ts";
import type { StoryEntry } from "../pack/load.ts";
import type { TimingLog } from "../timing/log.ts";
import type { StatLog } from "../timing/stats.ts";
import { type Beat, beatsForNight, privateText } from "./beats.ts";

export interface JoinOk {
  ok: true;
  deviceId: string;
  token: string;
}
export interface Fail {
  ok: false;
  code: "bad-code" | "bad-token" | "unknown-device" | "invalid-state";
}
export interface PressOk {
  ok: true;
  winner: boolean;
  lock: ControlLock;
  action: ControlAction;
}

interface DeviceRow {
  deviceId: string;
  formFactor: "ipad" | "phone";
  token: string;
  connected: boolean;
}

interface PauseRow {
  cause: PauseCause;
  hunter: string | null;
  subject: string;
}

export interface SessionEngine {
  sessionId: string;
  join: (input: { joinCode: string; formFactor: "ipad" | "phone" }) => JoinOk | Fail;
  rejoin: (token: string) => { ok: true; deviceId: string; held: string[] } | Fail;
  disconnect: (deviceId: string) => void;
  hold: (deviceId: string, hunter: string, action: "take" | "release") => { ok: true } | Fail;
  /**
   * `option` is required for a `pick`, a `set` or a `volume-answer` and refused for any other
   * action. `setting` is required for a `set` and refused for any other action. `note` is the
   * write-in text of a `volume-answer`: required with the write-in option, refused otherwise.
   */
  press: (
    deviceId: string,
    promptId: string,
    action: ControlAction,
    option?: string,
    setting?: string,
    note?: string,
  ) => PressOk | Fail;
  pressAll: (presses: readonly (PressInput & { deviceId: string })[]) => Array<PressOk | Fail>;
  /**
   * The story board finished Keeper line `line` (D7 exception). Acts only when the scene is on
   * that line and `momentId` is the Keeper. Returns false for anything else, so late or
   * duplicate messages do nothing.
   */
  keeperLineEnded: (momentId: string, line: number) => boolean;
  /** The option a pick moment was resolved with, or null if it has not been picked. */
  pickedOption: (momentId: string) => string | null;
  /**
   * The chosen story's game settings, setting id to option id, or null before a story is chosen.
   * They change only on Game settings, so they are locked once Begin wins (R-WIZ-12).
   */
  chosenSettings: () => Record<string, string> | null;
  projectStoryboard: (
    tower: TowerSnapshot,
    join: { url: string; reachable: boolean } | null,
  ) => StoryboardState;
  projectDevice: (deviceId: string) => DeviceState;
  /** The hunters of the story the session is bound to: id and name only. */
  hunterRoster: () => { id: string; name: string; portrait?: string }[];
  /** The id of the pack the session is bound to. */
  packId: () => string;
  /**
   * The tower volume test, for the host to run after a winning `volume-play` press. Returns the
   * run to play once (null when no run is waiting), so a repeated call starts nothing twice.
   */
  takeVolumeRun: () => VolumeRun | null;
  /** Progress from the run. Ignored once the run is stale (Back, a newer run). */
  volumeProgress: (run: number, phase: VolumeTest["phase"], level: 0 | 1 | 2 | null) => void;
  /** The run's tower sound did not play. It ends the run; nothing is retried. */
  volumeFailed: (run: number) => void;
  /** True while `run` is the current run and the flow is still on the volume test. */
  volumeRunLive: (run: number) => boolean;
  /**
   * Moves the highlight on Pick Story. Not a press: no lock, no screen change. Refused off
   * Pick Story, from a device that is not connected, and for a story that is not in the list.
   */
  focusStory: (deviceId: string, storyId: string) => { ok: true } | Fail;
  lockFor: (promptId: string) => ControlLock | null;
  /** Prompt id for a host pause, or null when play is not running. */
  pausePromptId: () => string | null;
  /** The screen the server holds right now. */
  screen: () => FlowScreen;
  /**
   * Leaves the splash screen for Pick Story once the pack and the socket host are ready. Not a
   * press. Connect Tower comes later, after Game settings.
   */
  finishSplash: () => void;
  roster: () => RosterSnapshot;
  /** Clears the grace timers. Call it when the host closes. */
  close: () => void;
}

/** How long a dropped device's hunters stay claimed before they become unclaimed (R2-104, §3.4). */
export const GRACE_MS = 60_000;

/** One start of the tower volume test. The first run also does the balance check. */
export interface VolumeRun {
  run: number;
  withBalance: boolean;
}

/** The pack stat the test records (Proving Ground section 14). */
export const VOLUME_TEST_STAT = "tower-volume-test";

export interface SessionOptions {
  /** Claim hold after a device drops. Defaults to GRACE_MS. */
  graceMs?: number;
  /** Called when a grace timer releases hunters, so the host can publish the change. */
  onChange?: () => void;
  sessionId?: string;
  joinCode: string;
  /** Hunters absent when the night starts. Presence then stays fixed (E15). */
  absent?: readonly string[];
  /**
   * The doors on Pick Story. `storyId` names the entry whose pack is the one passed to
   * `createSession`, the story the session starts bound to. Without this the list is that
   * one pack, preselected.
   */
  stories?: readonly StoryEntry[];
  storyId?: string;
  tokens?: () => string;
  timing: TimingLog;
  presses: PressLog;
  saveRoster: (snapshot: RosterSnapshot) => void;
  startedWall: string;
  /**
   * Live tower reading. A connect lock is kept only while this reading is
   * `connecting` or `connected`. Any other reading releases it, including when
   * a failed attempt ends on the same word it started on. Calibrate is legal
   * only while the reading is `connected`.
   */
  tower?: () => TowerSnapshot;
  /** Where event stats are recorded. Without it the answer is kept in memory and not stored. */
  stats?: StatLog;
}

const newToken = () => randomBytes(16).toString("base64url");

/**
 * Each step before play moves to the next screen. Play, quit and splash are handled apart. Game
 * settings goes to "Not playable yet" instead when the chosen pack is `playable: false`, and
 * straight to Claim Hunters when its `tower` is `none` (R3-UI-23). Connect Tower goes to the tower
 * volume test, which goes to Claim Hunters. Claim Hunters goes to the pack's setup steps, one
 * dialog each, and the last one to Begin; with no steps it goes straight to Begin (R3-UI-22).
 */
const NEXT_BEFORE_PLAY: Partial<Record<FlowScreen, FlowScreen>> = {
  "pick-story": "game-settings",
  "game-settings": "tower-connect",
  "tower-connect": "tower-volume-test",
  "tower-volume-test": "party-join",
  "party-join": "begin",
};

/**
 * Back from a start-up screen (R3-UI-37). Back from Connect Tower never disconnects it. Claim
 * Hunters, the setup steps and Begin are decided in `screenAfter`, since they depend on the pack.
 */
const BACK_BEFORE_PLAY: Partial<Record<FlowScreen, FlowScreen>> = {
  "game-settings": "pick-story",
  "not-playable": "game-settings",
  "tower-connect": "game-settings",
  "tower-volume-test": "tower-connect",
};

/** The tower is connected and its calibration is known to be done. Unknown is not ready. */
const towerReady = (tower: TowerSnapshot) =>
  tower.connection === "connected" &&
  tower.calibrated.state === "known" &&
  tower.calibrated.calibrated;

const NOT_PLAYABLE_BACK_ID = "back-not-playable";

const holdingKey = (deviceId: string, hunter: string) => `${deviceId}\0${hunter}`;

/** The pack-bound parts of a session. They change only when Pick Story binds another story. */
interface Binding {
  pack: Pack;
  hunters: { id: string; name: string; portrait?: string }[];
  hunterIds: Set<string>;
  phase: { id: string };
  beats: Beat[];
}

const bindPack = (pack: Pack, absent: ReadonlySet<string>): Binding => {
  const hunters = pack.hunters.map((hunter) => ({
    id: hunter.id,
    name: hunter.name,
    portrait: hunter.portrait,
  }));
  const hunterIds = new Set(hunters.map((hunter) => hunter.id));
  for (const id of absent) {
    if (!hunterIds.has(id)) throw new Error(`${id} is not a hunter in this pack.`);
  }
  const phase = pack.nights[0]?.phases[0];
  if (!phase) throw new Error("The pack has no night.");
  return { pack, hunters, hunterIds, phase, beats: beatsForNight(pack, absent) };
};

export const createSession = (initialPack: Pack, options: SessionOptions): SessionEngine => {
  let { pack, hunters, hunterIds, phase, beats } = bindPack(
    initialPack,
    new Set(options.absent ?? []),
  );
  const initialId = options.storyId ?? initialPack.pack_id;
  const entries: readonly StoryEntry[] = options.stories ?? [
    {
      card: {
        id: initialId,
        title: initialPack.title,
        blurb: initialPack.tone ?? null,
        tagline: initialPack.tagline ?? null,
        cover: null,
        players: initialPack.players,
        playable: true,
        loadable: true,
        tower: initialPack.tower,
      },
      pack: initialPack,
      settings: initialPack.settings,
      issues: [],
      assets: null,
    },
  ];
  if (!entries.some((entry) => entry.card.id === initialId && entry.pack)) {
    throw new Error(`${initialId} is not a loadable story in the list.`);
  }
  let currentStory = initialId;
  /** The highlighted door on Pick Story. It starts on the bound story. */
  let focusedStory = initialId;
  const storyEntry = (id: string) => entries.find((entry) => entry.card.id === id);
  /**
   * The card chosen on Pick Story and its game settings, setting id to option id. Null until a
   * Choose press wins, and again after Back from Game settings. A `playable: false` card can be
   * chosen; it is never bound, so this can differ from `currentStory`.
   */
  let chosen: { story: string; values: Map<string, string> } | null = null;
  /** Moves on with each winning setting change, so every change is a fresh lock. */
  let setSerial = 0;
  const setPromptId = () => `${SET_PROMPT_PREFIX}${setSerial}`;
  const chosenPlayable = () =>
    chosen ? (storyEntry(chosen.story)?.card.playable ?? false) : false;
  const settingsOf = (storyId: string) => storyEntry(storyId)?.settings ?? [];
  /** The chosen pack's `tower` field. Only a loaded card can be chosen, so it is never null. */
  const chosenTower = (): TowerMode =>
    (chosen ? storyEntry(chosen.story)?.card.tower : null) ?? "optional";
  const sessionId = options.sessionId ?? `session-${randomBytes(8).toString("hex")}`;
  /**
   * The setup step on screen, and the number done: steps before it are done, it and the rest are
   * not (R-WIZ-6). Begin holds it at the step count. Back lowers it, so Back undoes a step.
   */
  let setupAt = 0;
  /** The setup step whose timing mark is open, or null. */
  let openSetupStep: string | null = null;
  /** How Connect Tower was left, for the summary. Null until it is, and again after Back. */
  let towerChoice: TowerChoice | null = null;

  const devices = new Map<string, DeviceRow>();
  const held = new Set<string>();
  const graceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const graceMs = options.graceMs ?? GRACE_MS;
  const locks: Record<string, ControlLock> = {};
  let seq = 0;
  let tokenSeq = 0;
  const tokens = options.tokens ?? newToken;
  /** `lobby` covers every screen before play. `ended` is set by Quit. */
  let stage: "lobby" | "playing" | "paused" | "ended" = "lobby";
  let screen: FlowScreen = "splash";
  let beatIndex = 0;
  let finished = false;
  let pause: PauseRow | null = null;
  let pauseSerial = 0;
  let openMoment: string | null = null;
  let openCue: string | null = null;
  let openPhase: string | null = null;
  /** The Keeper line on screen, or null outside the Keeper scene. */
  let keeperLine: number | null = null;
  /** Pick moment id to the option the winning iPad chose. */
  const picked = new Map<string, string>();
  const storiesState = (): Stories => ({
    cards: entries.map((entry): StoryCard => entry.card),
    focus: focusedStory,
    current: currentStory,
  });
  const readTower =
    options.tower ??
    ((): TowerSnapshot => ({
      connection: "unavailable",
      battery: { state: "unavailable" },
      calibrated: { state: "unavailable" },
    }));
  /** True while `pressAll` is deciding one batch, so the first press keeps the lock. */
  let inBatch = false;

  /**
   * The tower volume test (Proving Ground section 6a). Fresh on each visit to the screen. `run`
   * names the current start, so progress from a run that Back left behind is ignored. `serial`
   * makes each Play press a fresh lock, so "Play again" can win.
   */
  const freshVolume = () => ({
    phase: "idle" as VolumeTest["phase"],
    level: null as 0 | 1 | 2 | null,
    runs: 0,
    failed: false,
    answer: null as VolumeAnswer | null,
    /** The balance check has played once this visit. "Play again" repeats the levels only. */
    balanceDone: false,
  });
  let volume = freshVolume();
  let volumeRun = 0;
  let volumeSerial = 0;
  /** Set by a winning Play press and taken once by the host. */
  let volumeQueued: VolumeRun | null = null;
  let volumeLogged: {
    answer: VolumeAnswer;
    note: string | null;
    firmware: string | null;
    at: string;
  } | null = null;
  const volumePlayId = () => `${VOLUME_PLAY_PROMPT_PREFIX}${volumeSerial}`;
  /** A tower is connected: the level test can run. Otherwise only the room-sound check shows. */
  const volumeMode = (): VolumeTest["mode"] =>
    readTower().connection === "connected" ? "tower" : "room";
  const volumePlaying = () =>
    volume.phase === "levels" || volume.phase === "balance-bed" || volume.phase === "balance-tower";
  const volumePlayLegal = () =>
    screen === "tower-volume-test" &&
    volumeMode() === "tower" &&
    (volume.phase === "idle" || volume.phase === "asking");

  const reconcileTowerLocks = () => {
    if (inBatch) return;
    const connection = readTower().connection;
    if (locks["tower-connect"] && connection !== "connected" && connection !== "connecting") {
      delete locks["tower-connect"];
    }
    if (locks["tower-calibrate"] && connection !== "connected") delete locks["tower-calibrate"];
  };

  const heldBy = (deviceId: string) =>
    hunters
      .filter((hunter) => held.has(holdingKey(deviceId, hunter.id)))
      .map((hunter) => hunter.id);

  const holdersOf = (hunter: string) =>
    [...devices.values()]
      .filter((device) => held.has(holdingKey(device.deviceId, hunter)))
      .map((device) => device.deviceId);

  const connectedHolders = (hunter: string) =>
    holdersOf(hunter).filter((deviceId) => devices.get(deviceId)?.connected === true);

  const blockedHunters = () => hunters.filter((hunter) => connectedHolders(hunter.id).length === 0);

  const unheldHunters = () => hunters.filter((hunter) => holdersOf(hunter.id).length === 0);

  const roster = (): RosterSnapshot => ({
    sessionId,
    packId: pack.pack_id,
    packVersion: pack.version,
    startedWall: options.startedWall,
    joinCode: options.joinCode,
    devices: [...devices.values()].map((device) => ({
      deviceId: device.deviceId,
      formFactor: device.formFactor,
      token: device.token,
      connected: device.connected,
    })),
    holdings: [...held].map((key) => {
      const [deviceId, hunter] = key.split("\0");
      return { deviceId: deviceId ?? "", hunter: hunter ?? "" };
    }),
  });

  const persist = () => options.saveRoster(roster());

  const cancelGrace = (deviceId: string) => {
    const timer = graceTimers.get(deviceId);
    if (!timer) return;
    clearTimeout(timer);
    graceTimers.delete(deviceId);
  };

  /** A device still gone after the grace period: its hunters become unclaimed. */
  const releaseDropped = (deviceId: string) => {
    graceTimers.delete(deviceId);
    const device = devices.get(deviceId);
    if (!device || device.connected) return;
    for (const hunter of heldBy(deviceId)) held.delete(holdingKey(deviceId, hunter));
    refreshPause("unheld-hunter");
    persist();
    options.onChange?.();
  };

  const startGrace = (deviceId: string) => {
    cancelGrace(deviceId);
    const timer = setTimeout(() => releaseDropped(deviceId), graceMs);
    timer.unref?.();
    graceTimers.set(deviceId, timer);
  };

  const currentBeat = (): Beat | undefined => beats[beatIndex];

  const setupSteps = () => pack.setup;
  const currentSetupStep = () => (screen === "setup" ? setupSteps()[setupAt] : undefined);

  /** Each setup step visit is one timing mark: opened on show, closed by Done or Back (R-WIZ-6). */
  const openSetupMark = () => {
    const step = currentSetupStep();
    if (!step) return;
    options.timing.open({
      kind: "setup-step",
      subject: step.id,
      deviceId: null,
      cause: null,
      hunter: null,
    });
    openSetupStep = step.id;
  };

  const closeSetupMark = () => {
    if (!openSetupStep) return;
    options.timing.close("setup-step", openSetupStep);
    openSetupStep = null;
  };

  /** The step the iPads may press next, or null. Quit has its own prompt (`quitPromptId`). */
  const gameplayPrompt = (): { id: string; action: ControlAction; label: string } | null => {
    if (screen === "splash" || screen === "quit") return null;
    if (screen === "tower-connect") {
      // A required tower holds Continue until it is connected and calibrated (R3-UI-23).
      if (chosenTower() === "required" && !towerReady(readTower())) return null;
      return {
        id: TOWER_CONNECT_CONTINUE_ID,
        action: "continue",
        label: "Next: tower volume test",
      };
    }
    if (screen === "tower-volume-test") {
      // Continue waits while the tower plays, so no sound is cut off by leaving.
      if (volumePlaying()) return null;
      return { id: VOLUME_TEST_CONTINUE_ID, action: "continue", label: "Next: gather the party" };
    }
    if (screen === "game-settings") {
      return { id: GAME_SETTINGS_CONTINUE_ID, action: "continue", label: "Continue" };
    }
    if (screen === "not-playable") {
      return { id: NOT_PLAYABLE_BACK_ID, action: "back", label: "Back" };
    }
    if (screen === "pick-story") {
      // The prompt names the story, so a press made on a stale highlight is refused (R2 §3.3).
      const card = storyEntry(focusedStory)?.card;
      if (!card?.loadable) return null;
      return {
        id: `${PICK_STORY_PROMPT_PREFIX}${card.id}`,
        action: "continue",
        label: `Choose ${card.title}`,
      };
    }
    if (screen === "party-join") {
      if (unheldHunters().length > 0) return null;
      return {
        id: PARTY_JOIN_CONTINUE_ID,
        action: "continue",
        label: setupSteps().length > 0 ? "Next: set up the story" : "Next: begin the story",
      };
    }
    if (screen === "setup") {
      const step = currentSetupStep();
      if (!step) return null;
      return { id: `${SETUP_DONE_PREFIX}${step.id}`, action: "continue", label: "Done" };
    }
    if (screen === "begin") {
      // Every hunter held and every setup step done (R2-30, R2-52).
      if (unheldHunters().length > 0 || setupAt < setupSteps().length) return null;
      return { id: "begin", action: "begin", label: "Begin" };
    }
    if (stage === "paused") {
      if (pause?.cause === "host-pause" && blockedHunters().length === 0) {
        return { id: `resume-${pauseSerial}`, action: "resume", label: "Resume" };
      }
      return null;
    }
    if (finished) return null;
    const beat = currentBeat();
    if (!beat) return null;
    if (beat.pick) return { id: `pick-${beatIndex}`, action: "pick", label: beat.pick.prompt };
    // Each Keeper line has its own prompt, so each Continue is a fresh lock.
    if (keeperLine !== null) {
      return { id: `continue-${beatIndex}-${keeperLine}`, action: "continue", label: "Continue" };
    }
    return { id: `continue-${beatIndex}`, action: "continue", label: "Continue" };
  };

  const openBeat = (beat: Beat) => {
    keeperLine = beat.storyboard?.id === KEEPER_MOMENT_ID ? 0 : null;
    options.timing.open({
      kind: "moment",
      subject: beat.momentSubject,
      deviceId: null,
      cause: null,
      hunter: null,
    });
    openMoment = beat.momentSubject;
    if (beat.cue) {
      options.timing.open({
        kind: "cue",
        subject: beat.cue,
        deviceId: null,
        cause: null,
        hunter: null,
      });
      openCue = beat.cue;
    }
  };

  const closeBeat = () => {
    keeperLine = null;
    if (openCue) {
      options.timing.close("cue", openCue);
      openCue = null;
    }
    if (openMoment) {
      options.timing.close("moment", openMoment);
      openMoment = null;
    }
  };

  const openPause = (
    cause: PauseCause,
    hunter: string | null,
    subject: string,
    deviceId: string | null,
  ) => {
    options.timing.open({
      kind: "pause",
      subject,
      deviceId,
      cause,
      hunter,
      result: null,
    });
    pause = { cause, hunter, subject };
    stage = "paused";
  };

  const closePause = () => {
    if (!pause) return;
    options.timing.close("pause", pause.subject);
    pause = null;
    stage = "playing";
  };

  /**
   * A hunter with no connected holder pauses play. Host pause is replaced by that,
   * so the banner names the hunter. Rejoin or a new holder ends that pause.
   * A host pause stays until Resume, and Resume is refused while a hunter is blocked.
   */
  const refreshPause = (trigger: "disconnect" | "unheld-hunter") => {
    if (stage === "lobby" || stage === "ended") return;
    const blocked = blockedHunters();
    if (blocked.length > 0) {
      const hunter = blocked[0]?.id ?? null;
      const subject = `${trigger}:${hunter ?? "hunter"}`;
      if (stage === "playing") {
        openPause(trigger, hunter, subject, null);
        return;
      }
      if (pause?.cause === "host-pause") {
        closePause();
        openPause(trigger, hunter, subject, null);
        return;
      }
      if (
        pause &&
        hunter &&
        pause.hunter !== hunter &&
        !blocked.some((item) => item.id === pause?.hunter)
      ) {
        closePause();
        openPause(trigger, hunter, subject, null);
      }
      return;
    }
    if (stage === "paused" && pause && pause.cause !== "host-pause") closePause();
  };

  /** The screen a winning press of this action moves the flow to. */
  const screenAfter = (action: ControlAction): FlowScreen => {
    if (action === "begin") return "play";
    if (action === "quit") return "quit";
    if (action === "back") {
      if (screen === "party-join") {
        return chosenTower() === "none" ? "game-settings" : "tower-volume-test";
      }
      if (screen === "setup") return setupAt > 0 ? "setup" : "party-join";
      if (screen === "begin") return setupSteps().length > 0 ? "setup" : "party-join";
      return BACK_BEFORE_PLAY[screen] ?? screen;
    }
    // A `playable: false` pack is chosen but never bound: its stop is "Not playable yet".
    if (action === "continue" && screen === "game-settings" && !chosenPlayable()) {
      return "not-playable";
    }
    if (action === "continue" && screen === "game-settings" && chosenTower() === "none") {
      return "party-join";
    }
    if (action === "continue" && screen === "party-join" && setupSteps().length > 0) {
      return "setup";
    }
    if (action === "continue" && screen === "setup") {
      return setupAt + 1 < setupSteps().length ? "setup" : "begin";
    }
    if (action === "continue" && screen !== "play") {
      return NEXT_BEFORE_PLAY[screen] ?? screen;
    }
    return screen;
  };

  /** Moves to the next beat. The Keeper's last line ends the scene the same way. */
  const advanceBeat = () => {
    closeBeat();
    beatIndex += 1;
    const beat = currentBeat();
    if (!beat) {
      finished = true;
      if (openPhase) {
        options.timing.close("phase", openPhase);
        openPhase = null;
      }
      return;
    }
    openBeat(beat);
  };

  /** Binds the focused story. A different story starts with no holdings: its hunters differ. */
  const bindFocusedStory = () => {
    if (focusedStory === currentStory) return;
    const next = storyEntry(focusedStory)?.pack;
    if (!next) return;
    ({ pack, hunters, hunterIds, phase, beats } = bindPack(next, new Set()));
    currentStory = focusedStory;
    beatIndex = 0;
    setupAt = 0;
    held.clear();
  };

  /**
   * First press wins once per visit. A screen that Back can re-enter drops the locks of the
   * screen it re-opens, so its prompts can be pressed again. The lock of the press that just
   * won stays, so a late press of it still loses.
   */
  const releaseRevisitLocks = (entered: FlowScreen) => {
    for (const id of Object.keys(locks)) {
      if (entered === "pick-story" && id.startsWith(PICK_STORY_PROMPT_PREFIX)) delete locks[id];
      if (entered === "not-playable" && id === NOT_PLAYABLE_BACK_ID) delete locks[id];
      if (
        entered === "tower-connect" &&
        (id === TOWER_CONNECT_CONTINUE_ID || id === TOWER_CONNECT_BACK_ID)
      ) {
        delete locks[id];
      }
      if (
        entered === "game-settings" &&
        (id === GAME_SETTINGS_CONTINUE_ID || id === GAME_SETTINGS_BACK_ID)
      ) {
        delete locks[id];
      }
      if (
        entered === "party-join" &&
        (id === PARTY_JOIN_CONTINUE_ID || id === PARTY_JOIN_BACK_ID)
      ) {
        delete locks[id];
      }
      const step = currentSetupStep();
      if (
        entered === "setup" &&
        step &&
        (id === `${SETUP_DONE_PREFIX}${step.id}` || id === `${SETUP_BACK_PREFIX}${step.id}`)
      ) {
        delete locks[id];
      }
      if (entered === "begin" && id === BEGIN_BACK_ID) delete locks[id];
      if (
        entered === "tower-volume-test" &&
        (id === VOLUME_TEST_CONTINUE_ID ||
          id === VOLUME_TEST_BACK_ID ||
          id === VOLUME_ANSWER_PROMPT_ID)
      ) {
        delete locks[id];
      }
    }
  };

  /** Chooses the highlighted card: its settings start at each default (R3-UI-22, §2.9). */
  const chooseFocusedStory = () => {
    const values = new Map(settingsOf(focusedStory).map((item) => [item.id, item.default]));
    chosen = { story: focusedStory, values };
  };

  /** Settings lock at Begin (R-WIZ-12). The timing log keeps one mark per chosen value. */
  const recordSettings = () => {
    if (!chosen) return;
    for (const [setting, option] of chosen.values) {
      const subject = `${setting}:${option}`;
      options.timing.open({ kind: "setting", subject, deviceId: null, cause: null, hunter: null });
      options.timing.close("setting", subject);
    }
  };

  const volumeState = (): VolumeTest => ({
    mode: volumeMode(),
    phase: volume.phase,
    level: volume.level,
    runs: volume.runs,
    failed: volume.failed,
    answer: volume.answer,
  });

  const gameSettingsState = (): GameSettings | null => {
    if (!chosen) return null;
    return {
      story: chosen.story,
      settings: settingsOf(chosen.story).map((item) => ({
        id: item.id,
        label: item.label,
        options: item.options.map((option) => ({ id: option.id, label: option.label })),
      })),
      chosen: Object.fromEntries(chosen.values),
    };
  };

  /**
   * The summary items a winning press makes or undoes (R3-UI-25). Runs before the screen moves.
   * Back clears the item of the screen it returns to: the game and its settings on Pick Story,
   * the tower on Connect Tower, a setup step on that step.
   */
  const applyStartupItems = (action: ControlAction, next: FlowScreen) => {
    if (action === "continue") {
      if (screen === "tower-connect")
        towerChoice = towerReady(readTower()) ? "connected" : "without";
      if (screen === "game-settings" && next === "party-join") towerChoice = "not-used";
      if (screen === "setup") {
        closeSetupMark();
        setupAt += 1;
      }
      return;
    }
    if (action !== "back") return;
    if (screen === "game-settings") {
      chosen = null;
      towerChoice = null;
      setupAt = 0;
    }
    if (screen === "tower-volume-test") towerChoice = null;
    if (screen === "party-join" && chosenTower() === "none") towerChoice = null;
    if (screen === "setup") {
      closeSetupMark();
      setupAt = Math.max(0, setupAt - 1);
    }
    if (screen === "begin") setupAt = Math.max(0, setupSteps().length - 1);
  };

  /** The stat is recorded only when the bound pack declares it (stats.yaml). */
  const recordVolumeAnswer = (deviceId: string, answer: VolumeAnswer, note: string | null) => {
    const reading = readTower().firmware;
    const firmware = reading?.state === "known" ? reading.version : null;
    volume.answer = answer;
    volume.phase = "answered";
    if (!pack.stats.custom.some((stat) => stat.id === VOLUME_TEST_STAT)) return;
    const event = options.stats?.record({
      statId: VOLUME_TEST_STAT,
      deviceId,
      data: { answer, note, firmware },
    });
    if (event) volumeLogged = { answer, note, firmware, at: event.atWall };
  };

  const applyWin = (
    action: ControlAction,
    deviceId: string,
    option?: string,
    setting?: string,
    note?: string,
  ) => {
    if (action === "set") {
      if (chosen && setting && option) chosen.values.set(setting, option);
      setSerial += 1;
      return;
    }
    if (action === "volume-play") {
      volumeSerial += 1;
      volumeRun += 1;
      // The first start that gets there also runs the balance check; "Play again" does not.
      volumeQueued = { run: volumeRun, withBalance: !volume.balanceDone };
      volume = { ...volume, phase: "levels", level: 0, runs: volume.runs + 1, failed: false };
      return;
    }
    if (action === "volume-answer") {
      if (option) recordVolumeAnswer(deviceId, volumeAnswerSchema.parse(option), note ?? null);
      return;
    }
    if (action === "continue" && screen === "pick-story") {
      bindFocusedStory();
      chooseFocusedStory();
    }
    const left = screen;
    const next = screenAfter(action);
    applyStartupItems(action, next);
    screen = next;
    // A setup step moves to another step on the same screen, so it re-opens its locks too.
    if (screen !== left || screen === "setup") releaseRevisitLocks(screen);
    if (screen === "setup") openSetupMark();
    if (left === "tower-volume-test" && screen !== left) {
      // Leaving ends the run: a late progress report from it is ignored.
      volumeRun += 1;
      volumeQueued = null;
    }
    if (screen === "tower-volume-test" && left !== screen) {
      volume = freshVolume();
      volumeLogged = null;
    }
    if (action === "quit") {
      closeBeat();
      if (pause) closePause();
      if (openPhase) {
        options.timing.close("phase", openPhase);
        openPhase = null;
      }
      stage = "ended";
      finished = true;
      return;
    }
    if (action === "begin") {
      stage = "playing";
      recordSettings();
      options.timing.open({
        kind: "phase",
        subject: phase.id,
        deviceId: null,
        cause: null,
        hunter: null,
      });
      openPhase = phase.id;
      const beat = currentBeat();
      if (beat) openBeat(beat);
      else finished = true;
      refreshPause("disconnect");
      return;
    }
    // A step before play only moves the screen. Story beats start at Begin.
    if (action === "continue" && screen !== "play") return;
    if (action === "continue") {
      // A Keeper line moves on one line; the last line's Continue skips the scene.
      if (keeperLine !== null && keeperLine < KEEPER_LINE_COUNT - 1) {
        keeperLine += 1;
        return;
      }
      advanceBeat();
      return;
    }
    if (action === "pick") {
      const beat = currentBeat();
      if (beat?.pick && option) picked.set(beat.pick.momentId, option);
      advanceBeat();
      return;
    }
    if (action === "pause") {
      pauseSerial += 1;
      openPause("host-pause", null, `host-pause:${pauseSerial}`, deviceId);
      return;
    }
    if (action === "resume") closePause();
  };

  const legal = (promptId: string, action: ControlAction) => {
    if (action === "tower-connect") {
      if (promptId !== "tower-connect") return false;
      const connection = readTower().connection;
      return connection !== "connected" && connection !== "connecting";
    }
    if (action === "tower-calibrate") {
      return promptId === "tower-calibrate" && readTower().connection === "connected";
    }
    if (action === "pause") {
      return stage === "playing" && !finished && promptId === `pause-${pauseSerial + 1}`;
    }
    if (action === "quit") return promptId === "quit" && screen === "play";
    if (screen === "game-settings") {
      if (action === "set") return promptId === setPromptId();
      if (action === "back") return promptId === GAME_SETTINGS_BACK_ID;
    }
    if (action === "back") {
      if (screen === "tower-connect") return promptId === TOWER_CONNECT_BACK_ID;
      if (screen === "tower-volume-test") return promptId === VOLUME_TEST_BACK_ID;
      if (screen === "party-join") return promptId === PARTY_JOIN_BACK_ID;
      if (screen === "setup") return promptId === setupBackId();
      if (screen === "begin") return promptId === BEGIN_BACK_ID;
    }
    if (action === "volume-play") return promptId === volumePlayId() && volumePlayLegal();
    if (action === "volume-answer") {
      return (
        screen === "tower-volume-test" &&
        promptId === VOLUME_ANSWER_PROMPT_ID &&
        volume.phase === "asking"
      );
    }
    const prompt = gameplayPrompt();
    return prompt !== null && prompt.id === promptId && prompt.action === action;
  };

  /** Back on the setup step on screen, or null off the setup screen. */
  const setupBackId = () => {
    const step = currentSetupStep();
    return step ? `${SETUP_BACK_PREFIX}${step.id}` : null;
  };

  /** Back beside Continue on the screens that have both, or null. */
  const ownBackId = (): string | null => {
    if (screen === "game-settings") return GAME_SETTINGS_BACK_ID;
    if (screen === "tower-connect") return TOWER_CONNECT_BACK_ID;
    if (screen === "tower-volume-test") return VOLUME_TEST_BACK_ID;
    if (screen === "party-join") return PARTY_JOIN_BACK_ID;
    if (screen === "setup") return setupBackId();
    if (screen === "begin") return BEGIN_BACK_ID;
    return null;
  };

  /** The setup step dialog on screen, text only, or null off the setup screen. */
  const setupStepState = () => {
    const step = currentSetupStep();
    if (!step) return null;
    return { id: step.id, label: step.label, index: setupAt, count: setupSteps().length };
  };

  /**
   * The step's illustration, only once its file has landed: a declared placeholder has no file,
   * so the dialog shows no image until it does.
   */
  const setupIllustration = (): string | null => {
    const id = currentSetupStep()?.illustration;
    if (!id) return null;
    return storyEntry(currentStory)?.assets?.byId.has(id) ? id : null;
  };

  /** The running summary beside each start-up dialog (R3-UI-25), or null outside start-up. */
  const summaryState = (): StartupSummary | null => {
    if (stage !== "lobby" || screen === "splash") return null;
    const card = chosen ? storyEntry(chosen.story)?.card : undefined;
    // Hunters and setup steps belong to the bound pack, so they show once a playable story is.
    const bound = card?.playable === true && card.id === currentStory;
    return {
      game: card ? { id: card.id, title: card.title, cover: card.cover } : null,
      settings: chosen
        ? settingsOf(chosen.story).map((item) => {
            const value = chosen?.values.get(item.id);
            return {
              id: item.id,
              label: item.label,
              value: item.options.find((option) => option.id === value)?.label ?? null,
            };
          })
        : null,
      tower: towerChoice,
      hunters: bound
        ? hunters.map((hunter) => ({
            id: hunter.id,
            name: hunter.name,
            holders: holdersOf(hunter.id),
          }))
        : null,
      setup: bound
        ? setupSteps().map((step, index) => ({
            id: step.id,
            label: step.label,
            done: index < setupAt,
          }))
        : [],
    };
  };

  /** True when `setting` is one of the chosen story's settings and `option` one of its options. */
  const setOptionOk = (setting: string | undefined, option: string | undefined) =>
    !!chosen &&
    !!option &&
    settingsOf(chosen.story).some(
      (item) => item.id === setting && item.options.some((choice) => choice.id === option),
    );

  /** One of the volume answers; the write-in answer carries text and no other answer does. */
  const volumeAnswerOk = (option: string | undefined, note: string | undefined) => {
    const parsed = volumeAnswerSchema.safeParse(option);
    if (!parsed.success) return false;
    if (parsed.data === "write-in") return note !== undefined && note.trim() !== "";
    return note === undefined;
  };

  /** True when `option` is one of the current pick's options. */
  const pickOptionOk = (option: string | undefined) => {
    const beat = currentBeat();
    return !!option && (beat?.pick?.options.some((item) => item.id === option) ?? false);
  };

  const connectedDevice = (deviceId: string) => {
    const device = devices.get(deviceId);
    if (!device?.connected) return undefined;
    return device;
  };

  persist();

  const engine: SessionEngine = {
    sessionId,

    join: ({ joinCode, formFactor }) => {
      if (joinCode !== options.joinCode) return { ok: false, code: "bad-code" };
      seq += 1;
      let token = tokens();
      tokenSeq += 1;
      if ([...devices.values()].some((device) => device.token === token)) {
        token = `${token}-${tokenSeq}`;
      }
      const deviceId = `device-${seq}`;
      devices.set(deviceId, { deviceId, formFactor, token, connected: true });
      persist();
      return { ok: true, deviceId, token };
    },

    rejoin: (token) => {
      const device = [...devices.values()].find((item) => item.token === token);
      if (!device) return { ok: false, code: "bad-token" };
      device.connected = true;
      cancelGrace(device.deviceId);
      refreshPause("disconnect");
      persist();
      return { ok: true, deviceId: device.deviceId, held: heldBy(device.deviceId) };
    },

    disconnect: (deviceId) => {
      const device = devices.get(deviceId);
      if (!device?.connected) return;
      device.connected = false;
      if (heldBy(deviceId).length > 0) startGrace(deviceId);
      refreshPause("disconnect");
      persist();
    },

    hold: (deviceId, hunter, action) => {
      if (!connectedDevice(deviceId)) return { ok: false, code: "unknown-device" };
      if (!hunterIds.has(hunter)) return { ok: false, code: "invalid-state" };
      const key = holdingKey(deviceId, hunter);
      if (action === "take") held.add(key);
      else held.delete(key);
      refreshPause("unheld-hunter");
      persist();
      return { ok: true };
    },

    press: (deviceId, promptId, action, option, setting, note) => {
      if (!connectedDevice(deviceId)) return { ok: false, code: "unknown-device" };
      reconcileTowerLocks();
      // Logged with the screen it was made on. A win also logs the screen it moved to, before
      // applyWin opens any mark, so a winning press always precedes the marks it opened.
      const pressedOn = screen;
      const existing = locks[promptId];
      if (existing) {
        options.presses.record({
          promptId,
          action,
          deviceId,
          winner: false,
          screen: pressedOn,
          nextScreen: null,
        });
        return { ok: true, winner: false, lock: existing, action: existing.action };
      }
      if (!legal(promptId, action)) return { ok: false, code: "invalid-state" };
      if (action === "pick" && !pickOptionOk(option)) return { ok: false, code: "invalid-state" };
      if (action === "set" && !setOptionOk(setting, option)) {
        return { ok: false, code: "invalid-state" };
      }
      if (action === "volume-answer" && !volumeAnswerOk(option, note)) {
        return { ok: false, code: "invalid-state" };
      }
      const decided = lockPresses(locks, [{ promptId, action, deviceId }]);
      const winner = decided.winners[0] === true;
      Object.assign(locks, decided.locks);
      const movedTo = winner ? screenAfter(action) : pressedOn;
      options.presses.record({
        promptId,
        action,
        deviceId,
        winner,
        screen: pressedOn,
        nextScreen: movedTo === pressedOn ? null : movedTo,
      });
      const lock = locks[promptId];
      if (!lock) return { ok: false, code: "invalid-state" };
      if (winner) applyWin(action, deviceId, option, setting, note);
      persist();
      return { ok: true, winner, lock, action };
    },

    keeperLineEnded: (momentId, line) => {
      const beat = currentBeat();
      if (stage !== "playing" || finished || keeperLine === null) return false;
      if (momentId !== KEEPER_MOMENT_ID || beat?.storyboard?.id !== momentId) return false;
      if (line !== keeperLine) return false;
      if (keeperLine < KEEPER_LINE_COUNT - 1) keeperLine += 1;
      else advanceBeat();
      return true;
    },

    pickedOption: (momentId) => picked.get(momentId) ?? null,

    chosenSettings: () => (chosen ? Object.fromEntries(chosen.values) : null),

    pressAll: (batch) => {
      const results: Array<PressOk | Fail> = [];
      // Once, before the batch: a lock the reading has already dropped must not decide it.
      reconcileTowerLocks();
      inBatch = true;
      try {
        for (const press of batch)
          results.push(engine.press(press.deviceId, press.promptId, press.action));
      } finally {
        inBatch = false;
      }
      return results;
    },

    projectStoryboard: (tower, join) => {
      reconcileTowerLocks();
      const beat = stage === "lobby" || finished ? undefined : currentBeat();
      const prompt = gameplayPrompt();
      const promptLock = prompt ? (locks[prompt.id] ?? null) : null;
      const unheld = unheldHunters().map((hunter) => hunter.id);
      const setupStep = setupStepState();
      return storyboardStatePayloadSchema.parse({
        screen,
        stage,
        hunters: hunters.map((hunter) => {
          const holders = holdersOf(hunter.id);
          return {
            id: hunter.id,
            name: hunter.name,
            portrait: hunter.portrait,
            holders,
            disconnected: holders.length > 0 && connectedHolders(hunter.id).length === 0,
          };
        }),
        packId: pack.pack_id,
        join: join ? { code: options.joinCode, url: join.url, reachable: join.reachable } : null,
        prompt: prompt ? { id: prompt.id, label: prompt.label } : null,
        moment: beat?.storyboard ?? null,
        keeperLine,
        stories: storiesState(),
        gameSettings: gameSettingsState(),
        summary: summaryState(),
        setupStep: setupStep ? { step: setupStep, illustration: setupIllustration() } : null,
        volumeTest:
          screen === "tower-volume-test" ? { ...volumeState(), logged: volumeLogged } : null,
        pause: pause ? { cause: pause.cause, hunter: pause.hunter } : null,
        tower,
        gate: { canBegin: unheld.length === 0, unheld },
        lock: promptLock,
      });
    },

    projectDevice: (deviceId) => {
      reconcileTowerLocks();
      const prompt = gameplayPrompt();
      const promptLock = prompt ? (locks[prompt.id] ?? null) : null;
      const mine = heldBy(deviceId);
      const onSettings = screen === "game-settings";
      // The start-up screens with Continue name their own Back beside it.
      const ownBack = ownBackId();
      const beat = stage === "lobby" || finished ? undefined : currentBeat();
      return deviceStatePayloadSchema.parse({
        screen,
        quitPromptId: screen === "play" ? "quit" : null,
        heldHunters: mine,
        views: mine.map((hunter) => {
          const moment = beat?.privates.get(hunter);
          const text = moment ? privateText(moment) : null;
          return {
            hunter,
            name: hunters.find((item) => item.id === hunter)?.name ?? hunter,
            privateMoment:
              moment && text ? { momentId: moment.id, text, still: moment.asset ?? null } : null,
          };
        }),
        prompt: prompt ? { id: prompt.id, label: prompt.label } : null,
        stories: storiesState(),
        lock: promptLock,
        won: promptLock ? promptLock.winnerDeviceId === deviceId : null,
        pick:
          prompt?.action === "pick" && beat?.pick && devices.get(deviceId)?.formFactor === "ipad"
            ? { momentId: beat.pick.momentId, prompt: beat.pick.prompt, options: beat.pick.options }
            : null,
        gameSettings: gameSettingsState(),
        setPromptId: onSettings ? setPromptId() : null,
        setupStep: setupStepState(),
        backPromptId: ownBack,
        backLock: ownBack ? (locks[ownBack] ?? null) : null,
        // Never the write-in text: only the board's debug overlay sees what was logged.
        volumeTest: screen === "tower-volume-test" ? volumeState() : null,
        volumePlayPromptId: volumePlayLegal() ? volumePlayId() : null,
        volumeAnswerPromptId:
          screen === "tower-volume-test" && volume.phase === "asking"
            ? VOLUME_ANSWER_PROMPT_ID
            : null,
      });
    },

    hunterRoster: () => hunters.map((hunter) => ({ ...hunter })),

    packId: () => pack.pack_id,

    takeVolumeRun: () => {
      const queued = volumeQueued;
      volumeQueued = null;
      return queued;
    },

    volumeRunLive: (run) => run === volumeRun && screen === "tower-volume-test",

    volumeProgress: (run, phase, level) => {
      if (run !== volumeRun || screen !== "tower-volume-test") return;
      volume = {
        ...volume,
        phase,
        level: phase === "levels" ? level : null,
        balanceDone: volume.balanceDone || phase === "balance-tower",
      };
    },

    volumeFailed: (run) => {
      if (run !== volumeRun || screen !== "tower-volume-test") return;
      // A balance sound that did not play leaves the balance check still to do.
      const balanceDone = volume.phase === "balance-tower" ? false : volume.balanceDone;
      volume = { ...volume, phase: "idle", level: null, failed: true, balanceDone };
    },

    focusStory: (deviceId, storyId) => {
      if (!connectedDevice(deviceId)) return { ok: false, code: "unknown-device" };
      if (screen !== "pick-story" || !storyEntry(storyId)) {
        return { ok: false, code: "invalid-state" };
      }
      focusedStory = storyId;
      return { ok: true };
    },

    lockFor: (promptId) => {
      reconcileTowerLocks();
      return locks[promptId] ?? null;
    },

    pausePromptId: () => (stage === "playing" && !finished ? `pause-${pauseSerial + 1}` : null),

    screen: () => screen,

    finishSplash: () => {
      if (screen === "splash") screen = "pick-story";
    },

    roster,

    close: () => {
      for (const deviceId of [...graceTimers.keys()]) cancelGrace(deviceId);
    },
  };

  return engine;
};
