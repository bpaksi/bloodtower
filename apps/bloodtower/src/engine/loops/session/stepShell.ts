import type { EngineEffect } from "../../effects.ts";
import { advanceLoops, resumeAfterPrompt, startRootLoop } from "../../loop/runtime.ts";
import type { LoopFrame } from "../../loop/types.ts";
import { bindPlayState, initPlayState } from "../chapter/playState.ts";
import type { EncounterLocal } from "../encounter/loop.ts";
import type { GameLocal } from "../game/loop.ts";
import { handleGamePress, handleSessionHubPress } from "../game/loop.ts";
import { allHeroesHeld } from "../game/setupFlow.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import { updatePlayFrameOnPress } from "../play/presses.ts";
import type { ShellEffect } from "./effects.ts";
import { type ShellEvent, shellEventSchema } from "./events.ts";
import type { SessionLocal } from "./loop.ts";
import { TEST_STORY } from "./pack.ts";
import { SESSION_ROOT_LOOP_ID } from "./registry.ts";
import {
  bindShellState,
  clearShellState,
  ensurePauseOffers,
  ensurePlayMenuOffers,
  matchOffer,
  requestCheckpoint,
  takePendingCheckpoint,
  takePendingTowerCommands,
} from "./shellRef.ts";
import { initialShellState, type ShellState } from "./state.ts";
import { TOWER_READY, towerReady } from "./tower.ts";

export type ShellStepResult = {
  state: ShellState;
  effects: Array<EngineEffect | ShellEffect>;
};

const withEffects = (state: ShellState, effects: ShellStepResult["effects"]): ShellStepResult => ({
  state,
  effects,
});

const updateTopLocal = (state: ShellState, local: SessionLocal | GameLocal): void => {
  const frame = state.loops.stack.at(-1);
  if (!frame) return;
  frame.local = local;
};

const resetGameAwaitingPress = (state: ShellState): void => {
  const frame = state.loops.stack.find((f) => f.loopId === "game");
  if (!frame) return;
  const local = frame.local as GameLocal;
  frame.local = { ...local, awaitingPress: false };
};

const updateSessionLocal = (state: ShellState, local: SessionLocal): void => {
  const frame = state.loops.stack.find((f) => f.loopId === "session");
  if (frame) frame.local = local;
};

const ensureSessionHubOffers = (state: ShellState): void => {
  if (state.screen !== "session") return;
  if (state.loops.stack.some((frame) => frame.loopId === "game")) return;
  const hasNew = state.offered.some((offer) => offer.promptId === "session-new-game" && offer.open);
  if (!hasNew) {
    state.offered.push(
      { promptId: "session-new-game", actionId: "new-game", open: true },
      { promptId: "session-done-tonight", actionId: "done-for-tonight", open: true },
    );
  }
};

const collapsePlayLoopsOnQuit = (state: ShellState): void => {
  const gameIndex = state.loops.stack.findIndex((frame) => frame.loopId === "game");
  if (gameIndex < 0) return;
  state.loops.stack = state.loops.stack.slice(0, gameIndex + 1);
  state.loops.prompt = null;
  state.loops.childStartRequested = null;
};

const resumeLoopsOrPauseOffers = (
  next: ShellState,
  eventSeq: number,
  effects: ShellStepResult["effects"],
): void => {
  if (next.pause && next.screen === "pause") {
    ensurePauseOffers(next);
    return;
  }
  bindPlayState(next.play);
  resumeAfterPrompt(next.registry, next.seed, eventSeq, next.loops, effects as EngineEffect[]);
  const checkpoint = takePendingCheckpoint();
  if (checkpoint) {
    effects.push({
      kind: "checkpoint-write",
      v: 1,
      gameId: checkpoint.gameId,
      day: checkpoint.day,
    });
  }
  for (const command of takePendingTowerCommands()) {
    effects.push({
      kind: "tower-command",
      v: 1,
      capabilityId: command.capabilityId,
      params: command.params,
    });
  }
  if (next.pause) ensurePauseOffers(next);
  else ensurePlayMenuOffers(next);
};

const playFingerprint = (state: ShellState): string =>
  state.play?.groups
    .map((group) => `${group.id}:${group.spaceId}:${group.insideBuilding ? 1 : 0}`)
    .join("|") ?? "";

const sessionFrame = (state: ShellState) =>
  state.loops.stack.find((frame) => frame.loopId === "session");

const pauseIfNeeded = (state: ShellState): void => {
  if (state.stage !== "playing" && state.stage !== "paused") return;
  const story = state.stories.find((s) => s.card.id === state.boundStoryId);
  if (!story) return;
  const unheld = story.heroes.some((hero) => state.holdings[hero.id] == null);
  if (unheld) {
    if (state.pause?.cause !== "disconnect") {
      state.pauseSerial += 1;
    }
    state.stage = "paused";
    state.pause = { cause: "disconnect" };
    state.screen = "pause";
    return;
  }
  if (state.towerLinked && state.tower.connection !== "connected") {
    if (state.pause?.cause !== "tower-lost") {
      state.pauseSerial += 1;
    }
    state.stage = "paused";
    state.pause = { cause: "tower-lost" };
    state.screen = "pause";
  }
};

export const stepShell = (state: ShellState, event: ShellEvent): ShellStepResult => {
  const parsed = shellEventSchema.safeParse(event);
  if (!parsed.success) {
    throw new Error(`Invalid shell event: ${parsed.error.message}`);
  }
  const e = parsed.data;
  const effects: ShellStepResult["effects"] = [];
  const eventSeq = state.eventSeq;

  if (e.kind === "start-session") {
    const next = initialShellState({
      sessionId: e.sessionId,
      seed: e.seed,
      stories: state.stories.length > 0 ? state.stories : [TEST_STORY],
    });
    if (state.playContent) next.playContent = state.playContent;
    next.eventSeq = eventSeq + 1;
    next.activeGameId = `game-${next.eventSeq}`;
    bindShellState(next);
    startRootLoop(
      next.registry,
      e.seed,
      eventSeq,
      next.loops,
      effects as EngineEffect[],
      SESSION_ROOT_LOOP_ID,
    );
    clearShellState();
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  if (e.kind === "tower-snapshot") {
    const next = { ...state, tower: e.tower, eventSeq: eventSeq + 1 };
    pauseIfNeeded(next);
    bindShellState(next);
    resumeLoopsOrPauseOffers(next, eventSeq, effects);
    clearShellState();
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  if (e.kind === "device-join") {
    const next = { ...state, devices: new Set(state.devices), eventSeq: eventSeq + 1 };
    next.devices.add(e.deviceId);
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  if (e.kind === "device-drop") {
    const next: ShellState = {
      ...state,
      devices: new Set(state.devices),
      holdings: { ...state.holdings },
      eventSeq: eventSeq + 1,
    };
    next.devices.delete(e.deviceId);
    for (const heroId of Object.keys(next.holdings)) {
      if (next.holdings[heroId] === e.deviceId) {
        next.holdings[heroId] = null;
      }
    }
    pauseIfNeeded(next);
    resetGameAwaitingPress(next);
    bindShellState(next);
    resumeLoopsOrPauseOffers(next, eventSeq, effects);
    clearShellState();
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  if (e.kind === "hero-hold") {
    const next: ShellState = {
      ...state,
      holdings: { ...state.holdings },
      eventSeq: eventSeq + 1,
    };
    const story = next.stories.find((s) => s.card.id === next.boundStoryId);
    if (!story?.heroes.some((hero) => hero.id === e.heroId)) {
      return withEffects(state, effects);
    }
    if (e.action === "take") {
      if (next.holdings[e.heroId] != null) {
        return withEffects(state, effects);
      }
      next.holdings[e.heroId] = e.deviceId;
    } else {
      if (next.holdings[e.heroId] === e.deviceId) {
        next.holdings[e.heroId] = null;
      }
    }
    if (next.stage === "paused" && next.pause?.cause === "disconnect" && allHeroesHeld(next)) {
      next.pause = null;
      next.stage = "playing";
      next.screen = "play";
      pauseIfNeeded(next);
    }
    resetGameAwaitingPress(next);
    bindShellState(next);
    resumeLoopsOrPauseOffers(next, eventSeq, effects);
    clearShellState();
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  if (e.kind === "focus-story") {
    if (!state.stories.some((story) => story.card.id === e.storyId)) {
      return withEffects({ ...state, eventSeq: eventSeq + 1 }, effects);
    }
    const next = { ...state, focusStoryId: e.storyId, eventSeq: eventSeq + 1 };
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  if (e.kind === "set-setting") {
    const story = state.chosenStoryId
      ? state.stories.find((s) => s.card.id === state.chosenStoryId)
      : null;
    if (!story) return withEffects(state, effects);
    const setting = story.settings.find((s) => s.id === e.settingId);
    if (!setting?.options.some((o) => o.id === e.optionId)) {
      return withEffects(state, effects);
    }
    const next = {
      ...state,
      settingValues: { ...state.settingValues, [e.settingId]: e.optionId },
      setSerial: state.setSerial + 1,
      eventSeq: eventSeq + 1,
    };
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  if (e.kind === "press") {
    const prompt = matchOffer(state, e.promptId, e.actionId) ?? state.loops.prompt;
    if (
      !prompt ||
      prompt.promptId !== e.promptId ||
      prompt.actionId !== e.actionId ||
      !prompt.open
    ) {
      return withEffects({ ...state, eventSeq: eventSeq + 1 }, effects);
    }

    const next: ShellState = {
      ...state,
      eventSeq: eventSeq + 1,
      offered: state.offered.map((offer) =>
        offer.promptId === e.promptId && offer.actionId === e.actionId
          ? { ...offer, open: false }
          : offer,
      ),
      loops: {
        ...state.loops,
        prompt: state.loops.prompt
          ? { ...state.loops.prompt, open: false }
          : { ...prompt, open: false },
      },
    };

    bindShellState(next);
    const top = next.loops.stack.at(-1) as LoopFrame | undefined;

    if (e.promptId === "splash-play" && e.actionId === "continue") {
      const session = sessionFrame(next);
      if (session) {
        const local = session.local as SessionLocal;
        next.screen = next.autosave ? "pick-game" : "pick-story";
        session.local = {
          ...local,
          phase: "hub",
          towerStep: "done",
          awaitingPress: false,
          fromSessionScreen: false,
        };
      }
    } else if (
      (e.promptId === "tower-connect" || e.promptId === "menu-connect") &&
      e.actionId === "tower-connect"
    ) {
      next.towerLinked = true;
      next.tower = {
        connection: "connected",
        calibrated: { state: "known", calibrated: false },
      };
      effects.push({
        kind: "tower-command",
        v: 1,
        capabilityId: "tower.connect",
        params: {},
      });
      if (e.promptId === "tower-connect") {
        const session = sessionFrame(next);
        if (session && (session.local as SessionLocal).phase === "splash") {
          const local = session.local as SessionLocal;
          session.local = {
            ...local,
            phase: "tower",
            towerStep: "calibrate",
            awaitingPress: false,
          };
        }
      }
    } else if (e.promptId === "tower-calibrate" && e.actionId === "tower-calibrate") {
      next.towerLinked = true;
      next.tower = TOWER_READY;
      effects.push({
        kind: "tower-command",
        v: 1,
        capabilityId: "tower.calibrate",
        params: {},
      });
    } else if (
      e.actionId === "quit-story" &&
      (e.promptId === "menu-quit" || (next.pause && e.promptId.startsWith("pause-")))
    ) {
      const gameFrame = next.loops.stack.find((frame) => frame.loopId === "game");
      if (gameFrame) {
        gameFrame.local = handleGamePress(gameFrame.local as GameLocal, e.promptId, e.actionId);
        if ((gameFrame.local as GameLocal).phase === "done") {
          collapsePlayLoopsOnQuit(next);
        }
      }
    } else if (next.pause && e.actionId === "reconnect" && e.promptId.startsWith("pause-")) {
      const gameFrame = next.loops.stack.find((frame) => frame.loopId === "game");
      if (gameFrame) {
        gameFrame.local = handleGamePress(gameFrame.local as GameLocal, e.promptId, e.actionId);
      }
    } else if (top?.loopId === "game") {
      const before = top.local as GameLocal;
      const local = handleGamePress(before, e.promptId, e.actionId);
      updateTopLocal(next, local);
      if (local.phase === "play" && before.phase === "begin" && next.playContent && !next.play) {
        next.play = initPlayState(next.seed, next.playContent);
      }
      if (local.phase === "play" && before.phase === "begin" && !next.resumedFromAutosave) {
        const gameId = next.activeGameId ?? `game-${next.eventSeq}`;
        next.activeGameId = gameId;
        next.autosave = {
          gameId,
          packId: next.boundStoryId,
          seed: next.seed,
          day: 1,
        };
        effects.push({ kind: "autosave-write", v: 1, gameId });
      }
      if (local.phase === "done" && next.stage === "ended") {
        collapsePlayLoopsOnQuit(next);
        if (next.activeGameId) {
          effects.push({
            kind: "game-record",
            v: 1,
            gameId: next.activeGameId,
            outcome: "quit",
          });
        }
        if (next.autosave) {
          effects.push({ kind: "autosave-write", v: 1, gameId: next.autosave.gameId });
        }
      }
      if (
        local.phase === "play" &&
        next.resumedFromAutosave &&
        next.towerLinked &&
        !towerReady(next.tower)
      ) {
        next.stage = "paused";
        next.pause = { cause: "tower-lost" };
        next.pauseSerial += 1;
        next.screen = "pause";
      }
    } else if (top?.loopId === "session") {
      const local = handleSessionHubPress(top.local as SessionLocal, e.promptId, e.actionId);
      updateSessionLocal(next, local);
    } else {
      const before = playFingerprint(next);
      updatePlayFrameOnPress(next.loops.stack, e.promptId, e.actionId);
      if (
        (e.actionId === "walk" || e.actionId === "enter" || e.actionId === "leave") &&
        next.play &&
        next.activeGameId &&
        playFingerprint(next) !== before
      ) {
        requestCheckpoint(next.activeGameId, next.play.dayNumber);
      }
    }

    resumeLoopsOrPauseOffers(next, eventSeq, effects);
    clearShellState();
    ensureSessionHubOffers(next);
    if (e.promptId === "session-done-tonight" && e.actionId === "done-for-tonight") {
      next.screen = "goodbye";
      next.sessionEnded = true;
      updateSessionLocal(next, {
        phase: "goodbye",
        towerStep: "done",
        awaitingPress: false,
        fromSessionScreen: false,
        childOpen: false,
      });
    }
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  return withEffects(state, effects);
};

/** After loading a checkpoint, rebuild offered actions from the restored loop stack. */
export const refreshOffersAfterRestore = (state: ShellState): ShellEffect[] => {
  const effects: ShellEffect[] = [];
  for (const frame of state.loops.stack) {
    if (frame.loopId === "group-turn") {
      const local = frame.local as GroupTurnLocal;
      frame.local = { ...local, awaitingPress: false };
    } else if (frame.loopId === "encounter") {
      const local = frame.local as EncounterLocal;
      frame.local = { ...local, awaitingLeave: false };
    }
  }
  bindShellState(state);
  resumeLoopsOrPauseOffers(state, state.eventSeq, effects);
  clearShellState();
  effects.push({ kind: "view-refresh", v: 1 });
  return effects;
};

export const runShellEvents = (events: ShellEvent[]) => {
  let state = initialShellState({ sessionId: "test", seed: "seed", stories: [TEST_STORY] });
  const effects: ShellStepResult["effects"] = [];
  for (const event of events) {
    const result = stepShell(state, event);
    state = result.state;
    effects.push(...result.effects);
  }
  return { state, effects };
};
