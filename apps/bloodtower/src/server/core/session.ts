import { randomBytes } from "node:crypto";
import type { ControlPress } from "bloodtower-protocols";
import type { PlayContent } from "../../engine/loops/chapter/playState.ts";
import type { GameLocal } from "../../engine/loops/game/loop.ts";
import { type ShellEffect, shellEffectSchema } from "../../engine/loops/session/effects.ts";
import type { ShellEvent } from "../../engine/loops/session/events.ts";
import type { ShellStory } from "../../engine/loops/session/pack.ts";
import {
  initialShellState,
  SHELL_ENGINE_VERSION,
  type ShellState,
} from "../../engine/loops/session/state.ts";
import { refreshOffersAfterRestore, stepShell } from "../../engine/loops/session/stepShell.ts";
import { towerReady } from "../../engine/loops/session/tower.ts";
import { projectShellView } from "../../engine/loops/session/view.ts";
import { project } from "../../engine/views/project.ts";
import type { BoardView, DeviceView } from "../../protocols/v2/index.ts";
import type { EventStore } from "../events/store.ts";
import type { HostLogger } from "../log/hostLog.ts";
import type { Clock } from "../timing/clock.ts";
import type { BloodtowerTower } from "../tower/host.ts";
import { runShellEffects } from "./effects.ts";
import { shellCheckpointFromState } from "./shellCheckpoint.ts";
import { continueShellFromCheckpoint, readLobbyCheckpoint } from "./shellContinue.ts";

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
  /** DEC-208: keep the autosave row visible on pick-game without resuming play yet. */
  rememberAutosave: (row: { gameId: string; packId: string; day: number }) => void;
  syncTowerSnapshot: () => void;
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
    state.screen === "play" || state.screen === "pause" || state.resumedFromAutosave;
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

  const logPress = (press: ControlPress) => {
    const gameId = gameIdOf(state);
    if (!gameId) return;
    options.store.append({
      gameId,
      kind: "control-press",
      payload: { v: 1, press },
      atMonoMs: options.clock.monoMs(),
      atWall: options.clock.wall(),
      deviceId: press.deviceId,
      ...meta,
    });
  };

  const apply = async (event: ShellEvent, deviceId: string | null) => {
    if (
      event.kind === "press" &&
      event.promptId === "splash-play" &&
      event.actionId === "continue" &&
      !state.autosave
    ) {
      const lobby = readLobbyCheckpoint(options.store);
      if (lobby) {
        state = adoptLobby(lobby, state);
        for (const frame of state.loops.stack) {
          if (frame.loopId !== "game") continue;
          const local = frame.local as GameLocal;
          frame.local = { ...local, awaitingPress: false };
        }
        state = { ...state, offered: [] };
        savedLobbySignature = lobbySignature(state);
        const shellEffects: ShellEffect[] = [];
        for (const effect of refreshOffersAfterRestore(state)) {
          const parsed = shellEffectSchema.safeParse(effect);
          if (parsed.success) shellEffects.push(parsed.data);
        }
        await runShellEffects(state, shellEffects, effectsCtx());
        options.onChange();
        return;
      }
    }
    const before = state;
    const result = stepShell(state, event);
    state = result.state;
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
    if (
      event.kind === "press" &&
      event.promptId === "continue-pick-game" &&
      event.actionId === "continue" &&
      before.autosave &&
      state.screen === "play"
    ) {
      const resumed = continueShellFromCheckpoint(options.store, {
        gameId: before.autosave.gameId,
        packVersion: meta.packVersion,
        engineVersion: meta.engineVersion,
        meta,
        atMonoMs: options.clock.monoMs(),
        atWall: options.clock.wall(),
      });
      state = {
        ...resumed.state,
        tower: options.tower.snapshot(),
      };
      if (towerReady(state.tower) && state.pause?.cause === "tower-lost") {
        state = { ...state, pause: null, stage: "playing", screen: "play" };
      }
      state = { ...state, resumedFromAutosave: true };
    }
    const persistGear =
      event.kind !== "gear" || event.action === "keep-volume" || event.action === "done";
    if (persistGear) appendShell(logged, deviceId);
    if (event.kind === "press") {
      const open =
        before.offered.find(
          (offer) =>
            offer.promptId === event.promptId && offer.actionId === event.actionId && offer.open,
        ) != null;
      logPress({
        deviceId: event.deviceId,
        promptId: event.promptId,
        action: event.actionId as ControlPress["action"],
        atMonoMs: options.clock.monoMs(),
        atWall: options.clock.wall(),
        winner: open,
        screen: before.screen,
        nextScreen: open && before.screen !== state.screen ? state.screen : null,
      });
    }
    const shellEffects: ShellEffect[] = [];
    for (const effect of result.effects) {
      const parsed = shellEffectSchema.safeParse(effect);
      if (parsed.success) shellEffects.push(parsed.data);
    }
    if (
      event.kind === "press" &&
      event.promptId === "continue-pick-game" &&
      event.actionId === "continue" &&
      state.screen === "play"
    ) {
      for (const effect of refreshOffersAfterRestore(state)) {
        const parsed = shellEffectSchema.safeParse(effect);
        if (parsed.success) shellEffects.push(parsed.data);
      }
    }
    await runShellEffects(state, shellEffects, effectsCtx());
    options.onChange();
    persistLobbyCheckpoint();
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
      if (promptId === "set-setting" && actionId === "set") {
        const settingId = args.settingId;
        const optionId = args.optionId;
        if (typeof settingId !== "string" || typeof optionId !== "string") return;
        enqueue({ kind: "set-setting", v: 1, deviceId, settingId, optionId }, deviceId);
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
    syncTowerSnapshot: () => {
      enqueue({ kind: "tower-snapshot", v: 1, tower: options.tower.snapshot() }, null);
    },
    rememberAutosave: (row) => {
      state = {
        ...state,
        autosave: {
          gameId: row.gameId,
          packId: row.packId,
          seed: options.seed,
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
        });
        state = resumed.state;
        options.onChange();
        return true;
      } catch {
        return false;
      }
    },
    whenIdle: () => applyQueue,
    cancelDisconnects: () => {
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
