import { randomBytes } from "node:crypto";
import type { ControlPress } from "bloodtower-protocols";
import { openChapterWait } from "../../engine/loops/chapter/chapters.ts";
import type { PlayContent } from "../../engine/loops/chapter/playState.ts";
import { openDayWait } from "../../engine/loops/day/wait.ts";
import type { GameLocal } from "../../engine/loops/game/loop.ts";
import { seatOnContinue } from "../../engine/loops/session/continueSeats.ts";
import { type ShellEffect, shellEffectSchema } from "../../engine/loops/session/effects.ts";
import type { ShellEvent } from "../../engine/loops/session/events.ts";
import type { ShellStory } from "../../engine/loops/session/pack.ts";
import {
  DRUM_ORDER,
  type DrumSideIndex,
  dropTowerStepsFromPieceCheck,
  ensurePieceCheckOffers,
} from "../../engine/loops/session/pieceCheck.ts";
import {
  initialShellState,
  SHELL_ENGINE_VERSION,
  type ShellState,
} from "../../engine/loops/session/state.ts";
import {
  eventPressDeviceRefusal,
  refreshOffersAfterRestore,
  stepShell,
} from "../../engine/loops/session/stepShell.ts";
import { towerReady } from "../../engine/loops/session/tower.ts";
import { projectShellView } from "../../engine/loops/session/view.ts";
import { project } from "../../engine/views/project.ts";
import type { BoardView, DeviceView, ErrorCode, PackedLine } from "../../protocols/v2/index.ts";
import { AUTO_ADVANCE_MS } from "../../protocols/v2/views.ts";
import { type PressKind, parseHostPayload } from "../events/kinds.ts";
import type { EventStore } from "../events/store.ts";
import type { HostLogger } from "../log/hostLog.ts";
import type { Clock } from "../timing/clock.ts";
import type { BloodtowerTower } from "../tower/host.ts";
import {
  DEMO_GLOW,
  DEMO_LINE_ENV,
  DEMO_PAINTING,
  DEMO_PROMPT_ID,
  demoLineFromEnv,
  demoNarrateEffect,
  isDemoAction,
  packMediaFor,
} from "./demoLine.ts";
import { runShellEffects } from "./effects.ts";
import { runNarrate } from "./narrate.ts";
import { shellCheckpointFromState } from "./shellCheckpoint.ts";
import {
  continueShellFromCheckpoint,
  LOBBY_RESUME,
  readSessionResume,
  SaveUnreadableError,
} from "./shellContinue.ts";

export const GRACE_MS = 60_000;

type DeviceRecord = {
  id: string;
  token: string;
  formFactor: "ipad" | "phone";
  grace?: ReturnType<typeof setTimeout>;
};

export type CoreSessionOptions = {
  sessionId: string;
  seed: string;
  stories: ShellStory[];
  playContent: PlayContent | null;
  packVersion: string;
  store: EventStore;
  tower: BloodtowerTower;
  clock: Clock;
  log: HostLogger;
  onChange: () => void;
  /** Holding grace after a socket drop. Tests pass a short value. */
  graceMs?: number;
  /** A tower command the pressing iPad asked for failed. The hub shows it on that iPad. */
  onDeviceError?: (deviceId: string, code: ErrorCode, message: string) => void;
  /**
   * The line the demo entry plays (A1-8b-2, D49), or null when the entry is off. Omitted, it is
   * read from `BLOODTOWER_DEMO_LINE`.
   */
  demoLine?: string | null;
  /**
   * How the effects wait's 4 s are timed (C3/20). Omitted, `setTimeout`. A test passes its own
   * so it can move the time; the engine never sees a clock. Returns a function that cancels.
   */
  waitTimer?: (fire: () => void, ms: number) => () => void;
  /**
   * TEST ONLY (C3/20): lets `applyTestSeed` change the running game. Production never sets it,
   * and no protocol message reaches it.
   */
  allowTestSeed?: boolean;
};

export type CoreSession = {
  state: () => ShellState;
  join: (input: {
    joinCode: string;
    formFactor: "ipad" | "phone";
  }) => { ok: true; deviceId: string; token: string } | { ok: false };
  rejoin: (token: string) => { ok: true; deviceId: string } | { ok: false };
  disconnect: (deviceId: string) => void;
  act: (
    deviceId: string,
    promptId: string,
    actionId: string,
    args: Record<string, unknown>,
  ) => void;
  projectBoard: (join: { code: string; url: string; reachable: boolean }) => BoardView;
  projectDevice: (deviceId: string) => DeviceView;
  channelsFor: (deviceId: string) => string[];
  roster: () => { devices: { id: string; token: string; formFactor: "ipad" | "phone" }[] };
  restoreDevices: (
    rows: readonly { deviceId: string; token: string; formFactor: "ipad" | "phone" }[],
  ) => void;
  resumeAutosave: () => boolean;
  /**
   * Call once the host is built. After a restart that came after the Enter, the session resumes
   * with tonight's tower choice and no Enter (Bob 2026-10-31); otherwise the Enter starts at the join.
   * It sends no tower command.
   */
  resumeSession: () => Promise<boolean>;
  /** DEC-208: keep the autosave row visible for Continue without resuming play yet. */
  rememberAutosave: (row: { gameId: string; packId: string; day: number }) => void;
  syncTowerSnapshot: () => void;
  /**
   * The board says the narration line `lineId` ended. It ends the effects wait only when that line
   * is the wait's own; any other id is ignored with a debug line.
   */
  narrationEnded: (lineId: string) => void;
  /**
   * TEST ONLY: set the test-seed markers on the running game (skulls, kingdom, sheets, ...).
   * Refused, logged as an error and thrown, unless the host was built with `allowTestSeed`.
   */
  applyTestSeed: (markers: string) => Promise<void>;
  /** Wait until queued shell applies and effects have finished. */
  whenIdle: () => Promise<void>;
  /** Cancel holding-grace timers so shutdown does not record a drop on the saved game. */
  cancelDisconnects: () => Promise<void>;
  /** Active game id for the event log, when the session has started. */
  currentGameId: () => string | null;
};

/**
 * Play and pause log on the autosave game. A restarted lobby still has that row
 * so Continue can find it, and its own splash must not be appended onto the saved log.
 */
const gameIdOf = (state: ShellState) => {
  const inSavedGame =
    state.screen === "play" ||
    state.screen === "pause" ||
    state.screen === "piece-check" ||
    state.resumedFromAutosave;
  if (inSavedGame && state.autosave) return state.autosave.gameId;
  return state.activeGameId;
};

export const createCoreSession = (options: CoreSessionOptions): CoreSession => {
  const graceMs = options.graceMs ?? GRACE_MS;
  let state = initialShellState({
    sessionId: options.sessionId,
    seed: options.seed,
    stories: options.stories,
  });
  if (options.playContent) state = { ...state, playContent: options.playContent };

  const devices = new Map<string, DeviceRecord>();

  // The controlled once-only demo entry (A1-8b-2). Held here, not in the engine state: it is no
  // gameplay event, so no checkpoint or replay carries it and a restore never plays it again.
  let demoLineId: string | null;
  if (options.demoLine !== undefined) demoLineId = options.demoLine;
  else {
    const fromEnv = demoLineFromEnv(process.env);
    if (fromEnv.error) options.log.error("demo-line-env", fromEnv.error);
    demoLineId = fromEnv.lineId;
  }
  let packedLine: PackedLine | null = null;
  let demoPlays = 0;

  const meta = {
    seed: options.seed,
    packVersion: options.packVersion,
    engineVersion: SHELL_ENGINE_VERSION,
  };

  const adoptLobby = (lobby: ShellState, live: ShellState): ShellState => ({
    ...lobby,
    stories: live.stories,
    playContent: live.playContent ?? lobby.playContent,
    sessionId: live.sessionId,
    tower: live.tower,
    towerLinked: lobby.towerLinked,
  });

  const lobbySignature = (current: ShellState) =>
    JSON.stringify({
      screen: current.screen,
      holdings: current.holdings,
      settingValues: current.settingValues,
      chosenStoryId: current.chosenStoryId,
      setupAt: current.setupAt,
      boundStoryId: current.boundStoryId,
      // The spin changes nothing else: without it the purse would never reach a checkpoint (CU/15).
      startingPurse: current.startingPurse,
    });

  let savedLobbySignature = "";

  const persistLobbyCheckpoint = () => {
    if (state.autosave) return;
    const screen = state.screen;
    if (
      screen !== "pick-story" &&
      screen !== "game-settings" &&
      screen !== "claim-heroes" &&
      screen !== "setup" &&
      screen !== "begin"
    ) {
      return;
    }
    const gameId = state.activeGameId;
    if (!gameId) return;
    const signature = lobbySignature(state);
    if (signature === savedLobbySignature) return;
    const afterSeq = options.store.nextSeq(gameId) - 1;
    options.store.writeCheckpoint({
      gameId,
      day: 0,
      afterEventSeq: Math.max(0, afterSeq),
      stateJson: JSON.stringify(shellCheckpointFromState(state)),
      atMonoMs: options.clock.monoMs(),
      atWall: options.clock.wall(),
      seed: state.seed,
      packVersion: meta.packVersion,
      engineVersion: meta.engineVersion,
    });
    savedLobbySignature = signature;
  };

  let savedMarker = "";

  const writeStateCheckpoint = () => {
    const gameId = state.activeGameId;
    if (!gameId) return;
    const afterSeq = options.store.nextSeq(gameId) - 1;
    options.store.writeCheckpoint({
      gameId,
      day: 0,
      afterEventSeq: Math.max(0, afterSeq),
      stateJson: JSON.stringify(shellCheckpointFromState(state)),
      atMonoMs: options.clock.monoMs(),
      atWall: options.clock.wall(),
      seed: state.seed,
      packVersion: meta.packVersion,
      engineVersion: meta.engineVersion,
    });
  };

  /**
   * Marks that the Enter finished, where the evening stands (the session screen or not, how many
   * games tonight, the focused Pick story door), and that the evening ended. A host restart
   * reads the latest checkpoint: after the Enter it resumes without one, after Done for tonight
   * it starts a new one.
   */
  const persistSessionMarker = () => {
    const marker = state.sessionEnded
      ? "ended"
      : state.enter === null && state.towerChoice !== "undecided"
        ? `entered-${state.towerChoice}-${state.games.length}-${state.games.map((game) => game.rating ?? "-").join("")}-${state.screen === "session" ? "session" : "game"}-${state.focusStoryId}`
        : "";
    if (marker === "" || marker === savedMarker) return;
    writeStateCheckpoint();
    savedMarker = marker;
  };

  const effectsCtx = () => ({
    store: options.store,
    tower: options.tower,
    log: options.log,
    sessionId: options.sessionId,
    clock: options.clock,
    meta,
    onViewRefresh: options.onChange,
  });

  const appendShell = (event: ShellEvent, deviceId: string | null) => {
    const gameId = gameIdOf(state);
    if (!gameId) return;
    options.store.append({
      gameId,
      kind: "shell",
      payload: { v: 1, event },
      atMonoMs: options.clock.monoMs(),
      atWall: options.clock.wall(),
      deviceId,
      ...meta,
    });
  };

  const logPress = (press: ControlPress, kind: PressKind, day: number) => {
    const gameId = gameIdOf(state);
    if (!gameId) return;
    options.store.append({
      gameId,
      kind: "control-press",
      // The kind and the day let the tap counts come from the log alone (PT-10).
      payload: { v: 1, press, kind, day },
      atMonoMs: options.clock.monoMs(),
      atWall: options.clock.wall(),
      deviceId: press.deviceId,
      ...meta,
    });
  };

  // The game clock: it runs while the game is played and stops for a pause, a quit or the end.
  // Each change is a logged row, so the active length survives a restart (DEC-107, PT-10).
  const clockLogged = new Map<string, boolean>();
  const playClockRunning = (): boolean => state.screen === "play" && state.stage === "playing";
  const syncPlayClock = () => {
    const gameId = gameIdOf(state);
    if (!gameId) return;
    // The log is the truth; the map only saves reading it on every event.
    let logged = clockLogged.get(gameId);
    if (logged === undefined) {
      logged = false;
      for (const row of options.store.listEvents(gameId)) {
        if (row.kind === "play-clock") logged = parseHostPayload("play-clock", row.payload).running;
      }
    }
    const running = playClockRunning();
    clockLogged.set(gameId, running);
    if (running === logged) return;
    options.store.append({
      gameId,
      kind: "play-clock",
      payload: { v: 1, running },
      atMonoMs: options.clock.monoMs(),
      atWall: options.clock.wall(),
      deviceId: null,
      ...meta,
    });
  };

  const apply = async (raw: ShellEvent, deviceId: string | null) => {
    const before = state;
    let event = raw;
    // The Tower panel's Done carries the pick its owner confirmed, so the log (and a replay) holds it.
    if (
      event.kind === "gear" &&
      event.action === "done" &&
      before.gearPanel === "tower" &&
      before.gearOwner === event.deviceId &&
      before.gearPicked
    ) {
      event = { ...event, item: "tower", pick: before.gearPicked };
    }
    const result = stepShell(state, event);
    state = result.state;
    for (const line of result.logs ?? []) options.log.debug(line.code, line.message);
    let logged: ShellEvent = event;
    if (event.kind === "gear" && event.action === "done") {
      logged = {
        ...event,
        ...(before.gearFirstHero ? { heroId: before.gearFirstHero } : {}),
        ...(before.gearSecondHero ? { otherHeroId: before.gearSecondHero } : {}),
      };
    }
    if (event.kind === "gear" && event.action === "keep-volume") {
      const volume = event.volume ?? before.gearPreviewVolume ?? before.towerVolume;
      logged = { ...event, volume };
    }
    const continued = state.continueRequested && state.autosave !== null;
    let pieceCheckStartEvent: ShellEvent | null = null;
    if (continued && state.autosave) {
      const live = { ...state, continueRequested: false };
      let resumed: ReturnType<typeof continueShellFromCheckpoint> | null = null;
      try {
        resumed = continueShellFromCheckpoint(options.store, {
          gameId: state.autosave.gameId,
          packVersion: meta.packVersion,
          engineVersion: meta.engineVersion,
          meta,
          atMonoMs: options.clock.monoMs(),
          atWall: options.clock.wall(),
          log: options.log,
        });
      } catch (error) {
        // DEC-895: an unreadable save is refused (already logged with its code). The table
        // stays where it was with no saved game offered, so it starts a new one.
        if (!(error instanceof SaveUnreadableError)) throw error;
        state = { ...before, autosave: null, continueRequested: false };
      }
      if (resumed) {
        state = {
          ...resumed.state,
          tower: options.tower.snapshot(),
        };
        // A game that went on without the tower stays without it, tower or not (DEC-301).
        // Play without Tower on Continue's tower block is that choice too (DEC-711): the saved
        // link must not come back, or seating opens a tower-lost pause that still offers the
        // play button (C2/06 EV-08).
        const playWithout =
          state.towerWithout ||
          (state.towerLinked && live.towerChoice === "without" && !live.towerLinked);
        const hadTowerPause = state.pause?.cause === "tower-lost";
        if (hadTowerPause && (towerReady(state.tower) || playWithout)) {
          state = {
            ...state,
            pause: null,
            stage: "playing",
            screen: state.pieceCheck ? "piece-check" : "play",
          };
        }
        state = {
          ...state,
          resumedFromAutosave: true,
          continueRequested: false,
          // The Enter, the tower choice and tonight's games are tonight's, not the saved game's.
          enter: null,
          enterThen: null,
          confirm: null,
          sessionEnded: false,
          towerLinked: playWithout ? false : live.towerLinked || state.towerLinked,
          towerChoice: playWithout ? "without" : live.towerChoice,
          towerWithout: playWithout,
          games: live.games,
        };
        const hadPieceCheck = state.pieceCheck !== null;
        if (playWithout && state.pieceCheck) {
          const hadTowerPieceCheck = state.pieceCheck.towerInPlay;
          state = {
            ...state,
            pieceCheck: {
              ...state.pieceCheck,
              steps: [...state.pieceCheck.steps],
              confirmed: [...state.pieceCheck.confirmed],
              skipped: [...state.pieceCheck.skipped],
            },
          };
          dropTowerStepsFromPieceCheck(state);
          // Persist the Play-without-Tower transition on an existing mid-check save so replay
          // keeps towerWithout/towerLinked, clears tower-lost, and drops tower steps across
          // subsequent tower snapshots, quits, and host restarts.
          if (hadTowerPieceCheck || hadTowerPause || !resumed.state.towerWithout) {
            pieceCheckStartEvent = { kind: "piece-check-start", v: 1, towerInPlay: false };
          }
        }
        // The saved party sits on the iPads joined now: a hold stays only for one of them (DEC-952).
        state = seatOnContinue(state, live);
        // C2-11: run Continue's piece check between the tower block and the resumed chapter
        // whenever the save has reached play and a check is not already mid-progress.
        if (state.play !== null && !hadPieceCheck && !state.pieceCheck) {
          const towerInPlay =
            state.towerLinked && !state.towerWithout && state.towerChoice !== "without";
          const startEvent: ShellEvent = { kind: "piece-check-start", v: 1, towerInPlay };
          state = stepShell(state, startEvent).state;
          // Only persist piece-check-start once the check actually opens on screen (not while
          // Continue is still waiting in a hero re-pick or tower-lost pause, CU/16 EV-11).
          if (state.screen === "piece-check" && !state.pause) {
            pieceCheckStartEvent = startEvent;
          }
        }
      }
    }
    if (
      !pieceCheckStartEvent &&
      (before.screen === "pause" || before.screen === "tower-wake") &&
      state.screen === "piece-check" &&
      state.pieceCheck &&
      state.pieceCheck.confirmed.length === 0 &&
      state.pieceCheck.skipped.length === 0
    ) {
      pieceCheckStartEvent = {
        kind: "piece-check-start",
        v: 1,
        towerInPlay: state.pieceCheck.towerInPlay,
      };
    }
    // Finishing a piece check after a mid-check host restart seats heroes on currently joined
    // iPads (CU/16): returning tokens keep their heroes; dead pre-restart holders clear and pause.
    if (before.pieceCheck !== null && state.pieceCheck === null && state.screen === "play") {
      state = seatOnContinue(state, state);
    }
    // A Split party pick changes the play state (the queue, PT-18), and a use-item pick changes
    // a hero's items and hit points (CU/13), so a replay must see both.
    const persistGear =
      event.kind !== "gear" ||
      event.action === "keep-volume" ||
      event.action === "done" ||
      (event.action === "pick" &&
        (event.item === "split" || event.item === "items" || event.item === "fix-position"));
    if (persistGear) appendShell(logged, deviceId);
    if (pieceCheckStartEvent) appendShell(pieceCheckStartEvent, null);
    if (event.kind === "press") {
      const open =
        before.offered.find(
          (offer) =>
            offer.promptId === event.promptId && offer.actionId === event.actionId && offer.open,
        ) != null;
      logPress(
        {
          deviceId: event.deviceId,
          promptId: event.promptId,
          action: event.actionId as ControlPress["action"],
          atMonoMs: options.clock.monoMs(),
          atWall: options.clock.wall(),
          winner: open,
          screen: before.screen,
          nextScreen: open && before.screen !== state.screen ? state.screen : null,
        },
        event.promptId.startsWith("menu-") ? "menu" : "flow-button",
        before.play?.dayNumber ?? 0,
      );
    } else if (event.kind === "gear" && event.action === "open" && event.item) {
      // Opening the Menu or the help panel is an iPad control-press too (PT-10).
      logPress(
        {
          deviceId: event.deviceId,
          promptId: `gear-open-${event.item}`.slice(0, 64),
          action: "pick",
          atMonoMs: options.clock.monoMs(),
          atWall: options.clock.wall(),
          winner: before.gearPanel === null,
          screen: before.screen,
          nextScreen: null,
        },
        event.item === "look-up" ? "help" : "menu",
        before.play?.dayNumber ?? 0,
      );
    }
    syncPlayClock();
    const shellEffects: ShellEffect[] = [];
    for (const effect of result.effects) {
      const parsed = shellEffectSchema.safeParse(effect);
      if (parsed.success) shellEffects.push(parsed.data);
    }
    if (continued && (state.screen === "play" || state.screen === "pause")) {
      for (const effect of refreshOffersAfterRestore(state)) {
        const parsed = shellEffectSchema.safeParse(effect);
        if (parsed.success) shellEffects.push(parsed.data);
      }
    } else if (continued && state.screen === "piece-check") {
      ensurePieceCheckOffers(state);
    }
    const outcomes = await runShellEffects(state, shellEffects, effectsCtx());
    const tellDevice = (
      message: string,
      code: ErrorCode = "tower-command-failed",
      target: string | null = deviceId,
    ) => {
      if (!target) return;
      // After the result: the iPad changes screen when the choice comes back, and a change of
      // screen clears its banner. The message must land on the screen that asks again.
      applyQueue = applyQueue
        .then(() => options.onDeviceError?.(target, code, message))
        .catch((error: unknown) => {
          const detail = error instanceof Error ? error.message : String(error);
          options.log.error(
            "core-apply",
            detail.trim() === "" ? "The iPad error could not be sent." : detail,
          );
        });
    };
    for (const effect of shellEffects) {
      if (effect.kind !== "press-error") continue;
      // A press that could not be honoured: the log line toasts the board, the pressing iPad
      // shows the message with its code.
      // A queued Split or Rejoin is told to the iPad that queued it, not the one that pressed.
      const target = effect.deviceId ?? deviceId;
      options.log.error(effect.code, effect.message, { device: target });
      // The iPad's error codes are a fixed set; a code of the engine's own rides in the text.
      if (effect.code === "invalid-state") tellDevice(effect.message, effect.code, target);
      else tellDevice(`${effect.message} (${effect.code})`, "invalid-state", target);
    }
    for (const outcome of outcomes) {
      const ok = outcome.result === "ok";
      if (outcome.capabilityId === "sound.play-stateful" && event.kind === "volume-play") {
        // Only the volume step waits on this sound; Keep opens once the tower has played it.
        enqueue(
          { kind: "volume-result", v: 1, deviceId: event.deviceId, level: event.level, ok },
          null,
        );
        if (!ok) tellDevice("The tower did not play that volume. Nothing was retried.");
        continue;
      }
      if (outcome.capabilityId === "lighting.sequence") {
        // The starting purse's Spin (CU/15): the purse is set whatever the lights did, but the
        // iPad that pressed must hear that the chase did not run (decision 0003).
        if (!ok)
          tellDevice(
            "The tower did not run the light chase. The purse is set. Nothing was retried.",
          );
        continue;
      }
      if (outcome.capabilityId === "mechanics.rotate-drum") {
        const rawIndex = outcome.params.drumIndex;
        const rawPos = outcome.params.position;
        const drumIndex = rawIndex === 0 || rawIndex === 1 || rawIndex === 2 ? rawIndex : 0;
        const position: DrumSideIndex =
          rawPos === 0 || rawPos === 1 || rawPos === 2 || rawPos === 3 ? rawPos : 0;
        const pressingDevice =
          event.kind === "piece-check-drum-result" ? (event.deviceId ?? deviceId) : deviceId;
        if (!ok) {
          const level = DRUM_ORDER.find((row) => row.index === drumIndex)?.level ?? "top";
          tellDevice(
            `The tower did not turn the ${level} drum. Nothing was retried.`,
            "tower-command-failed",
            pressingDevice,
          );
        }
        enqueue(
          {
            kind: "piece-check-drum-result",
            v: 1,
            drumIndex,
            position,
            ok,
            ...(pressingDevice ? { deviceId: pressingDevice } : {}),
          },
          pressingDevice,
        );
        continue;
      }
      if (outcome.capabilityId !== "tower.connect" && outcome.capabilityId !== "tower.calibrate") {
        continue;
      }
      // Only the Enter and a Reconnect wait on these.
      if (!state.enter && !state.reconnect) continue;
      enqueue({ kind: "tower-result", v: 1, capabilityId: outcome.capabilityId, ok }, null);
      if (!ok) {
        tellDevice(
          outcome.capabilityId === "tower.connect"
            ? "The tower did not answer. Nothing was retried."
            : "The tower did not calibrate. Nothing was retried.",
        );
      }
    }
    options.onChange();
    persistLobbyCheckpoint();
    persistSessionMarker();
    scheduleHintEnd();
    scheduleEffectsWait();
  };

  // The day loop's effects wait (C3/20). The engine names it; this runs it. With a narration line
  // the wait ends on the line's audio end only. With none it ends after `maxMs`. A paused game
  // does not count down; the full time runs again when play goes on. The end is an event, so a
  // replay or a restart sees the same game.
  let waitCancel: (() => void) | undefined;
  let waitTimerFor: string | null = null;
  const startWaitTimer =
    options.waitTimer ??
    ((fire: () => void, ms: number) => {
      const handle = setTimeout(fire, ms);
      return () => clearTimeout(handle);
    });
  const scheduleEffectsWait = (): void => {
    const wait = openDayWait(state.loops.stack) ?? openChapterWait(state.loops.stack, state.play);
    const running =
      wait !== null &&
      wait.lineId === null &&
      state.screen === "play" &&
      state.stage === "playing" &&
      state.pause === null &&
      !state.gearPaused;
    const key = running && wait ? wait.id : null;
    if (key === waitTimerFor) return;
    waitCancel?.();
    waitCancel = undefined;
    waitTimerFor = key;
    if (!key || !wait) return;
    waitCancel = startWaitTimer(() => {
      waitCancel = undefined;
      enqueue({ kind: "wait-end", v: 1, waitId: key, cause: "timeout" }, null);
    }, wait.maxMs);
  };

  // A first-time hint ends after the engine's one auto-advance time (CU/09). The timer only asks:
  // the end is an event, so a replay or a restart sees the same game.
  let hintTimer: ReturnType<typeof setTimeout> | undefined;
  let hintTimerFor: string | null = null;
  const scheduleHintEnd = (): void => {
    if (state.hint === hintTimerFor) return;
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = undefined;
    hintTimerFor = state.hint;
    const hintId = state.hint;
    if (!hintId) return;
    hintTimer = setTimeout(() => {
      hintTimer = undefined;
      enqueue({ kind: "hint-end", v: 1, hintId }, null);
    }, AUTO_ADVANCE_MS);
  };

  let applyQueue: Promise<void> = Promise.resolve();
  const enqueue = (event: ShellEvent, deviceId: string | null): void => {
    applyQueue = applyQueue
      .then(() => apply(event, deviceId))
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        options.log.error(
          "core-apply",
          detail.trim() === "" ? "Core session apply failed." : detail,
        );
      });
  };

  const playDemoLine = (deviceId: string, actionId: string) => {
    if (!isDemoAction(actionId)) {
      options.log.error("demo-line-act", `Unknown demo action "${actionId}".`, {
        device: deviceId,
      });
      return;
    }
    if (demoLineId === null) {
      options.log.warn(
        "demo-line-off",
        `The demo entry is off. Start the host with ${DEMO_LINE_ENV}=<line id> to use it.`,
        { device: deviceId },
      );
      return;
    }
    if (actionId === "play" && demoPlays > 0) {
      options.log.warn(
        "demo-line-once",
        `${demoLineId} has played once. The explicit replay is action "replay".`,
        { device: deviceId },
      );
      return;
    }
    if (actionId === "replay" && demoPlays === 0) {
      options.log.warn("demo-line-replay", `${demoLineId} has not played yet; nothing to replay.`, {
        device: deviceId,
      });
      return;
    }
    const story = options.stories.find((entry) => entry.card.id === state.boundStoryId);
    const media = story ? packMediaFor(story) : undefined;
    const effect = media ? demoNarrateEffect(media, demoLineId) : undefined;
    if (!media || !effect) {
      options.log.error(
        "demo-line-missing",
        `Story ${state.boundStoryId} has no line asset ${demoLineId} with a speaker and text.`,
        { device: deviceId },
      );
      return;
    }
    const result = runNarrate(effect, media, {
      play: demoPlays + 1,
      painting: DEMO_PAINTING,
      glow: DEMO_GLOW,
    });
    if (!result.ok) {
      options.log.error("demo-line-narrate", result.message, { device: deviceId });
      return;
    }
    if (result.line.audio === null) {
      // Caption only: the line's file is not packed or not on disk. Unavailable, not a failure.
      options.log.warn(
        "demo-line-audio",
        `${demoLineId} has no packed audio on this host; the board shows the caption only.`,
        { device: deviceId },
      );
    }
    demoPlays += 1;
    packedLine = result.line;
    options.log.info(
      "demo-line",
      `${actionId === "play" ? "Played" : "Replayed"} ${demoLineId} (play ${demoPlays}).${
        result.unavailable.length > 0 ? ` Not packed: ${result.unavailable.join(", ")}.` : ""
      }`,
      { device: deviceId },
    );
    options.onChange();
  };

  const queueDemoLine = (deviceId: string, actionId: string) => {
    applyQueue = applyQueue
      .then(() => playDemoLine(deviceId, actionId))
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        options.log.error("demo-line", detail.trim() === "" ? "The demo line failed." : detail, {
          device: deviceId,
        });
      });
  };

  enqueue({ kind: "start-session", v: 1, sessionId: options.sessionId, seed: options.seed }, null);
  enqueue({ kind: "tower-snapshot", v: 1, tower: options.tower.snapshot() }, null);

  const heldHeroes = (deviceId: string) =>
    Object.entries(state.holdings)
      .filter(([, holder]) => holder === deviceId)
      .map(([heroId]) => heroId);

  return {
    state: () => state,
    join: ({ formFactor }) => {
      const deviceId = `device-${randomBytes(4).toString("hex")}`;
      const token = randomBytes(16).toString("base64url");
      devices.set(deviceId, { id: deviceId, token, formFactor });
      enqueue({ kind: "device-join", v: 1, deviceId }, deviceId);
      return { ok: true, deviceId, token };
    },
    rejoin: (token) => {
      const device = [...devices.values()].find((entry) => entry.token === token);
      if (!device) return { ok: false };
      // A socket that came back inside the grace keeps its seat; the earlier drop must not fire.
      if (device.grace) {
        clearTimeout(device.grace);
        device.grace = undefined;
      }
      enqueue({ kind: "device-join", v: 1, deviceId: device.id }, device.id);
      return { ok: true, deviceId: device.id };
    },
    disconnect: (deviceId) => {
      const record = devices.get(deviceId);
      if (!record) return;
      if (record.grace) clearTimeout(record.grace);
      record.grace = setTimeout(() => {
        enqueue({ kind: "device-drop", v: 1, deviceId }, deviceId);
      }, graceMs);
      record.grace.unref?.();
    },
    act: (deviceId, promptId, actionId, args) => {
      // C3/12, DEC-019: only an iPad holding a present hero may pick at an event. The refusal is
      // asked before the press is logged, so a Continue replays only presses that were taken.
      const eventRefusal = eventPressDeviceRefusal(state, deviceId, promptId, actionId);
      if (eventRefusal) {
        options.log.error("event-press-refused", eventRefusal);
        options.onDeviceError?.(deviceId, "invalid-state", eventRefusal);
        return;
      }
      if (promptId === "hero-hold" && (actionId === "take" || actionId === "release")) {
        const heroId = args.heroId;
        if (typeof heroId !== "string") return;
        enqueue({ kind: "hero-hold", v: 1, deviceId, heroId, action: actionId }, deviceId);
        return;
      }
      if (promptId === "focus-story" && actionId === "focus") {
        const storyId = args.storyId;
        if (typeof storyId !== "string") return;
        enqueue({ kind: "focus-story", v: 1, deviceId, storyId }, deviceId);
        return;
      }
      if (actionId === "volume-play" && /^volume-[012]$/.test(promptId)) {
        const level = Number(promptId.slice("volume-".length));
        enqueue({ kind: "volume-play", v: 1, deviceId, level }, deviceId);
        return;
      }
      if (promptId === "volume-keep" && actionId === "volume-keep") {
        enqueue({ kind: "volume-answer", v: 1, deviceId, answer: "keep" }, deviceId);
        return;
      }
      if (promptId === "volume-again" && actionId === "volume-again") {
        enqueue({ kind: "volume-answer", v: 1, deviceId, answer: "again" }, deviceId);
        return;
      }
      if (promptId === "set-setting" && actionId === "set") {
        const settingId = args.settingId;
        const optionId = args.optionId;
        if (typeof settingId !== "string" || typeof optionId !== "string") return;
        enqueue({ kind: "set-setting", v: 1, deviceId, settingId, optionId }, deviceId);
        return;
      }
      if (promptId === DEMO_PROMPT_ID) {
        queueDemoLine(deviceId, actionId);
        return;
      }
      if (promptId === "gear") {
        const action = actionId;
        if (
          action !== "open" &&
          action !== "pick" &&
          action !== "done" &&
          action !== "keep-volume" &&
          action !== "try-another" &&
          action !== "step-back"
        ) {
          options.log.error("gear-act", `Unknown gear action "${action}".`);
          return;
        }
        const item = typeof args.item === "string" ? args.item : undefined;
        const pick = typeof args.pick === "string" ? args.pick : undefined;
        const heroId = typeof args.heroId === "string" ? args.heroId : undefined;
        const otherHeroId = typeof args.otherHeroId === "string" ? args.otherHeroId : undefined;
        const volume = typeof args.volume === "number" ? args.volume : undefined;
        enqueue(
          {
            kind: "gear",
            v: 1,
            deviceId,
            action,
            ...(item ? { item } : {}),
            ...(pick ? { pick } : {}),
            ...(heroId ? { heroId } : {}),
            ...(otherHeroId ? { otherHeroId } : {}),
            ...(volume === 0 || volume === 1 || volume === 2 ? { volume } : {}),
          },
          deviceId,
        );
        return;
      }
      enqueue({ kind: "press", v: 1, deviceId, promptId, actionId }, deviceId);
    },
    projectBoard: (join) => {
      const view = projectShellView(state);
      const board = project(view, { kind: "board" });
      return {
        ...board,
        ...(board.gear ? { gear: { ...board.gear, joinUrl: join.url } } : {}),
        ...(packedLine ? { packedLine } : {}),
        levels: [
          {
            id: "join",
            label: "Join",
            shows: `Code ${join.code} — ${join.url}${join.reachable ? "" : " (unreachable)"}`,
          },
          ...board.levels,
        ],
      };
    },
    projectDevice: (deviceId) => project(projectShellView(state), { kind: "device", deviceId }),
    channelsFor: (deviceId) => heldHeroes(deviceId).map((hero) => `ipad:${hero}`),
    roster: () => ({
      devices: [...devices.values()].map((device) => ({
        id: device.id,
        token: device.token,
        formFactor: device.formFactor,
      })),
    }),
    restoreDevices: (rows) => {
      for (const row of rows) {
        devices.set(row.deviceId, {
          id: row.deviceId,
          token: row.token,
          formFactor: row.formFactor,
        });
      }
    },
    resumeSession: async () => {
      await applyQueue;
      let saved: ShellState | null = null;
      try {
        saved = readSessionResume(options.store);
      } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error);
        options.log.error(
          "session-resume",
          detail.trim() === "" ? "The last session could not be read." : detail,
        );
      }
      if (!saved) {
        // A restart during this Enter starts it again; this row says the last Enter was not finished.
        writeStateCheckpoint();
        savedMarker = "";
        return false;
      }
      const resumed = saved;
      applyQueue = applyQueue.then(async () => {
        // C2-11 (EV-12, EV-24): if the autosave has an unfinished piece check in its event log,
        // resume directly on that step with earlier confirmations intact.
        const savedRow = options.store.getAutosave();
        let midCheck: ShellState | null = null;
        if (savedRow && options.store.lastCheckpoint(savedRow.gameId)) {
          try {
            const rebuilt = continueShellFromCheckpoint(options.store, {
              gameId: savedRow.gameId,
              packVersion: meta.packVersion,
              engineVersion: meta.engineVersion,
              meta,
              atMonoMs: options.clock.monoMs(),
              atWall: options.clock.wall(),
              log: options.log,
            });
            if (rebuilt.state.pieceCheck && rebuilt.state.screen === "piece-check") {
              midCheck = rebuilt.state;
            }
          } catch (error) {
            if (!(error instanceof SaveUnreadableError)) {
              options.log.error(
                "piece-check-resume",
                error instanceof Error ? error.message : String(error),
              );
            }
          }
        }
        const lobby = LOBBY_RESUME.has(resumed.screen) && !resumed.autosave && !state.autosave;
        if (midCheck && savedRow && midCheck.pieceCheck) {
          const playWithout =
            midCheck.towerWithout ||
            midCheck.pieceCheck.towerInPlay === false ||
            resumed.towerChoice === "without";
          const candidate: ShellState = {
            ...midCheck,
            devices: new Set(state.devices),
            stories: state.stories,
            playContent: state.playContent ?? midCheck.playContent,
            sessionId: state.sessionId,
            tower: options.tower.snapshot(),
            enter: null,
            enterThen: null,
            confirm: null,
            sessionEnded: false,
            resumedFromAutosave: true,
            continueRequested: false,
            pause: null,
            screen: "piece-check",
            stage: "playing",
            towerLinked: playWithout ? false : midCheck.towerLinked,
            towerWithout: playWithout ? midCheck.towerWithout || midCheck.towerLinked : false,
            towerChoice: playWithout ? "without" : resumed.towerChoice,
            games: resumed.games,
            pieceCheck: {
              ...midCheck.pieceCheck,
              steps: [...midCheck.pieceCheck.steps],
              confirmed: [...midCheck.pieceCheck.confirmed],
              skipped: [...midCheck.pieceCheck.skipped],
              drumsTurning: false,
              drumsTurned: midCheck.pieceCheck.drumsTurning
                ? false
                : midCheck.pieceCheck.drumsTurned,
            },
            autosave: {
              gameId: savedRow.gameId,
              packId: savedRow.packId,
              seed: midCheck.seed,
              day: midCheck.play?.dayNumber ?? 1,
            },
          };
          if (playWithout && candidate.pieceCheck?.towerInPlay) {
            dropTowerStepsFromPieceCheck(candidate);
          }
          // Only resume directly into an active piece check. If dropping tower steps finished
          // the check, fall through to the normal pick-story/session restore so iPads join and
          // Continue runs seatOnContinue (never booting into play with dead holdings).
          if (candidate.pieceCheck && candidate.screen === "piece-check") {
            state = candidate;
            ensurePieceCheckOffers(state);
            options.onChange();
            persistSessionMarker();
            return;
          }
        }
        if (lobby) {
          state = { ...adoptLobby(resumed, state), devices: new Set(), towerLinked: false };
          for (const frame of state.loops.stack) {
            if (frame.loopId !== "game") continue;
            const local = frame.local as GameLocal;
            frame.local = { ...local, awaitingPress: false };
          }
          state = { ...state, offered: [] };
          savedLobbySignature = lobbySignature(state);
        } else {
          const frame = state.loops.stack.find((row) => row.loopId === "session");
          if (frame)
            frame.local = { ...(frame.local as object), phase: "hub", awaitingPress: false };
          // Back to the session screen if that is where the evening stood, else Pick story.
          state = {
            ...state,
            enter: null,
            towerChoice: resumed.towerChoice,
            games: resumed.games,
            screen: resumed.screen === "session" ? "session" : "pick-story",
            // The focused door comes back if that story is still loaded, else the default.
            focusStoryId: state.stories.some((story) => story.card.id === resumed.focusStoryId)
              ? resumed.focusStoryId
              : state.focusStoryId,
          };
        }
        const shellEffects: ShellEffect[] = [];
        for (const effect of refreshOffersAfterRestore(state)) {
          const parsed = shellEffectSchema.safeParse(effect);
          if (parsed.success) shellEffects.push(parsed.data);
        }
        await runShellEffects(state, shellEffects, effectsCtx());
        options.onChange();
        persistSessionMarker();
      });
      await applyQueue;
      return true;
    },
    syncTowerSnapshot: () => {
      enqueue({ kind: "tower-snapshot", v: 1, tower: options.tower.snapshot() }, null);
    },
    rememberAutosave: (row) => {
      state = {
        ...state,
        autosave: {
          gameId: row.gameId,
          packId: row.packId,
          // The game's own seed: Play again gives a game one that differs from the session's.
          seed: options.store.lastCheckpoint(row.gameId)?.seed ?? options.seed,
          day: row.day,
        },
      };
      options.onChange();
    },
    resumeAutosave: () => {
      const row = options.store.getAutosave();
      if (!row || row.sessionId !== options.sessionId) return false;
      try {
        const resumed = continueShellFromCheckpoint(options.store, {
          gameId: row.gameId,
          packVersion: meta.packVersion,
          engineVersion: meta.engineVersion,
          meta,
          atMonoMs: options.clock.monoMs(),
          atWall: options.clock.wall(),
          log: options.log,
        });
        state = seatOnContinue(resumed.state, state);
        options.onChange();
        return true;
      } catch (error) {
        // The refusal is already logged with its code by Continue; any other failure is logged here.
        if (!(error instanceof SaveUnreadableError)) {
          options.log.error(
            "resume-autosave",
            error instanceof Error ? error.message : String(error),
          );
        }
        return false;
      }
    },
    narrationEnded: (lineId) => {
      applyQueue = applyQueue
        .then(async () => {
          if (state.screen !== "play") {
            options.log.debug(
              "narration-ended-ignored",
              `Ignored the end of "${lineId}": screen is "${state.screen}", not play.`,
            );
            return;
          }
          const wait =
            openDayWait(state.loops.stack) ?? openChapterWait(state.loops.stack, state.play);
          if (!wait || wait.lineId !== lineId) {
            options.log.debug(
              "narration-ended-ignored",
              `Ignored the end of "${lineId}": no open wait is waiting on that line.`,
            );
            return;
          }
          await apply({ kind: "wait-end", v: 1, waitId: wait.id, cause: "audio-end" }, null);
        })
        .catch((error: unknown) => {
          const detail = error instanceof Error ? error.message : String(error);
          options.log.error(
            "core-apply",
            detail.trim() === "" ? "Core session apply failed." : detail,
          );
        });
    },
    applyTestSeed: async (markers) => {
      if (!options.allowTestSeed) {
        const message = "The test seed is off on this host. It is for tests only.";
        options.log.error("test-seed-refused", message);
        throw new Error(message);
      }
      let failure: unknown = null;
      // The event is logged, so a replay (Continue) sets the same seed once.
      applyQueue = applyQueue.then(async () => {
        try {
          await apply({ kind: "test-seed", v: 1, markers }, null);
        } catch (error) {
          failure = error;
          const detail = error instanceof Error ? error.message : String(error);
          options.log.error("test-seed-failed", detail.trim() === "" ? "The seed failed." : detail);
        }
      });
      await applyQueue;
      if (failure) throw failure;
    },
    whenIdle: async () => {
      while (true) {
        const current = applyQueue;
        await current;
        if (applyQueue === current) return;
      }
    },
    cancelDisconnects: () => {
      waitCancel?.();
      waitCancel = undefined;
      waitTimerFor = null;
      if (hintTimer) clearTimeout(hintTimer);
      hintTimer = undefined;
      for (const record of devices.values()) {
        if (!record.grace) continue;
        clearTimeout(record.grace);
        record.grace = undefined;
      }
      return applyQueue;
    },
    currentGameId: () => gameIdOf(state),
  };
};
