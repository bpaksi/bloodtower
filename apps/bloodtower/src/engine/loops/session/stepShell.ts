import { openingActiveIndex, openingFinishedIndex } from "../../../protocols/opening.ts";
import type { EngineEffect } from "../../effects.ts";
import { HINTS_OFF, HINTS_ON, HINTS_SETTING_ID, rulesPage } from "../../hints/copy.ts";
import { applyHints, endHint, hintsOn } from "../../hints/flow.ts";
import { HINT_IDS, HINTS_AFTER_SETUP, RULES_PAGE_MISSING } from "../../hints/registry.ts";
import { advanceLoops, resumeAfterPrompt, startRootLoop } from "../../loop/runtime.ts";
import type { LoopFrame } from "../../loop/types.ts";
import { isPurseAmount } from "../../rules/purse/index.ts";
import {
  applyTestSeed,
  bindPlayState,
  initPlayState,
  seatAtCitadels,
} from "../chapter/playState.ts";
import { type DayLocal, parseEventChoicePrompt } from "../day/loop.ts";
import { eventPressRefusal } from "../day/press.ts";
import { type EncounterLocal, endBuildingWait, takeBuildingRefusal } from "../encounter/loop.ts";
import { seedHeroSheets } from "../event/index.ts";
import type { GameLocal } from "../game/loop.ts";
import { handleGamePress } from "../game/loop.ts";
import { allHeroesHeld, heldCount, partySize } from "../game/setupFlow.ts";
import { type GroupTurnLocal, isVirtuePrompt, virtuePressRefusal } from "../group-turn/loop.ts";
import { updatePlayFrameOnPress } from "../play/presses.ts";
import { applyQuestTestSeed } from "../quest/testSeed.ts";
import { type ShellEffect, USE_ITEM_REFUSED } from "./effects.ts";
import {
  applyTowerResult,
  BOARD_SET_UP_PROMPT,
  finishEnter,
  firstDeviceJoined,
  PLAY_WITHOUT_TOWER_PROMPT,
  TOWER_CALIBRATE_PROMPT,
  TOWER_CONNECT_PROMPT,
} from "./enter.ts";
import { type ShellEvent, shellEventSchema } from "./events.ts";
import {
  applyFixPosition,
  applyGear,
  applyUseItem,
  FIX_POSITION_ITEM,
  isUseItemAct,
} from "./gear.ts";
import {
  applyHubPress,
  gameRecordEffect,
  hubOffers,
  isHubPrompt,
  RATING_SETTING,
  rateOpenGame,
  recordGame,
} from "./hub.ts";
import type { SessionLocal } from "./loop.ts";
import { TEST_STORY } from "./pack.ts";
import {
  applyTowerPick,
  cancelMenuReconnect,
  goOnWithout,
  pauseReturnOf,
  RECONNECT_CANCEL_PROMPT,
  startReconnect,
} from "./reconnect.ts";
import { SESSION_ROOT_LOOP_ID } from "./registry.ts";
import {
  bindShellState,
  clearShellState,
  ensurePauseOffers,
  ensurePlayMenuOffers,
  ensureReconnectOffers,
  matchOffer,
  requestCheckpoint,
  takePendingCheckpoint,
  takePendingTowerCommands,
} from "./shellRef.ts";
import { answerVolume, applyVolumeResult, pressVolume, VOLUME_TEST_SOUND } from "./sound.ts";
import { type HintHold, initialShellState, type ShellState } from "./state.ts";
import { configureStoryPlay } from "./storyPlay.ts";
import { towerReady } from "./tower.ts";
import { captureHintHold, heroName } from "./view.ts";

export type ShellStepResult = {
  state: ShellState;
  effects: Array<EngineEffect | ShellEffect>;
  /** Lines the host writes to its log for an event the step accepted and expected (never errors). */
  logs?: ShellLogLine[];
};

/** A `debug` line an event step asks the host to write (the engine has no logger of its own). */
export type ShellLogLine = { level: "debug"; code: string; message: string };

/** The code of the one debug line an old `sound-unlock` event writes (DEC-903). */
export const OLD_SOUND_UNLOCK_LOG = "old-event-ignored";

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

// The loop may not have run again after a press; the session screen must still offer its presses.
const ensureSessionHubOffers = (state: ShellState): void => {
  if (state.screen !== "session") return;
  if (state.loops.stack.some((frame) => frame.loopId === "game")) return;
  const wanted = hubOffers(state);
  const missing = wanted.some(
    (want) =>
      !state.offered.some(
        (offer) =>
          offer.promptId === want.promptId && offer.actionId === want.actionId && offer.open,
      ),
  );
  if (!missing) return;
  state.offered = wanted.map((want) => ({ ...want, open: true }));
};

const collapsePlayLoopsOnQuit = (state: ShellState): void => {
  const gameIndex = state.loops.stack.findIndex((frame) => frame.loopId === "game");
  if (gameIndex < 0) return;
  state.loops.stack = state.loops.stack.slice(0, gameIndex + 1);
  state.loops.prompt = null;
  state.loops.childStartRequested = null;
};

/** One quit record and one autosave write. The autosave stays (DEC-208, DEC-218). */
const pushQuitRecord = (state: ShellState, effects: ShellStepResult["effects"]): void => {
  if (state.stage !== "ended") return;
  if (state.activeGameId) {
    recordGame(state, state.activeGameId, "quit");
    effects.push(gameRecordEffect(state, state.activeGameId, "quit"));
  }
  if (state.autosave) {
    effects.push({ kind: "autosave-write", v: 1, gameId: state.autosave.gameId });
  }
};

/**
 * Only an iPad that holds a present hero may pick at an event (DEC-019). A press from any other
 * device is refused with words, never dropped quietly. Null when the press is not an event pick.
 * The core session asks before it logs a press, so a replay never depends on who holds a hero.
 */
export const eventPressDeviceRefusal = (
  state: ShellState,
  deviceId: string,
  promptId: string,
  actionId: string,
): string | null => {
  const press = parseEventChoicePrompt(promptId);
  if (!press || actionId !== "choose" || !state.play) return null;
  const group = state.play.groups.find((row) => row.id === press.groupId);
  const present = group?.heroIds.some((heroId) => state.holdings[heroId] === deviceId) ?? false;
  return present ? null : "Only the heroes at the event can choose.";
};

const resumeLoopsOrPauseOffers = (
  next: ShellState,
  eventSeq: number,
  effects: ShellStepResult["effects"],
): void => {
  if (next.reconnect) {
    ensureReconnectOffers(next);
    return;
  }
  if (next.pause?.cause === "tower-lost") {
    // The stopped loops' open prompt is stale; they offer again when play goes on.
    next.loops.prompt = null;
  }
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

/** Adds one press to the active game's counts: a walk, an Enter, a day's skull drop (SCR-019 slice). */
const countPress = (
  state: ShellState,
  actionId: string,
  moved: boolean,
  skullRecorded: boolean,
): void => {
  const tally = state.tally;
  if (actionId === "walk" && moved && tally.moves !== null) tally.moves += 1;
  if (actionId === "enter" && moved && tally.buildings !== null) tally.buildings += 1;
  const day = state.play?.dayNumber ?? null;
  if (actionId === "record" && skullRecorded && day !== tally.skullDay) {
    tally.skulls = (tally.skulls ?? 0) + 1;
    tally.skullDay = day;
  }
};

const playFingerprint = (state: ShellState): string =>
  state.play?.groups
    .map((group) => `${group.id}:${group.spaceId}:${group.insideBuilding ? 1 : 0}`)
    .join("|") ?? "";

const sessionFrame = (state: ShellState) =>
  state.loops.stack.find((frame) => frame.loopId === "session");

export const pauseIfNeeded = (state: ShellState): void => {
  // Piece setup is part of a started game (DEC-711): only a lost tower pauses it.
  const pieceSetup =
    state.stage === "lobby" && (state.screen === "setup" || state.screen === "begin");
  if (state.stage !== "playing" && state.stage !== "paused" && !pieceSetup) return;
  // A Reconnect in progress owns the screen until it ends.
  if (state.reconnect) return;
  const story = state.stories.find((s) => s.card.id === state.boundStoryId);
  if (!story) return;
  if (!pieceSetup) {
    // Before the opening ends, the table is not built yet. Watch the seated count.
    // An unpicked pool hero is not a missing seat.
    const unheld = state.play
      ? state.play.groups
          .flatMap((group) => group.heroIds)
          .some((heroId) => state.holdings[heroId] == null)
      : heldCount(state) < partySize(state);
    if (unheld) {
      if (state.pause?.cause !== "disconnect") {
        state.pauseSerial += 1;
      }
      state.stage = "paused";
      state.pause = { cause: "disconnect" };
      state.screen = "pause";
      return;
    }
  }
  if (state.towerLinked && !state.towerWithout && state.tower.connection !== "connected") {
    if (state.pause?.cause !== "tower-lost") {
      state.pauseSerial += 1;
    }
    state.stage = "paused";
    state.pause = {
      cause: "tower-lost",
      returnTo: state.pause?.returnTo ?? pauseReturnOf(state) ?? "play",
    };
    state.screen = "pause";
  }
};

const stepShellCore = (state: ShellState, event: ShellEvent): ShellStepResult => {
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
    // Binding clears the offers, so a setup screen must offer its presses again (Continue, Choose).
    resetGameAwaitingPress(next);
    bindShellState(next);
    resumeLoopsOrPauseOffers(next, eventSeq, effects);
    clearShellState();
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  if (e.kind === "device-join") {
    const next = { ...state, devices: new Set(state.devices), eventSeq: eventSeq + 1 };
    // After Done for tonight nobody is joined; a late rejoin does not seat a device again.
    if (!next.sessionEnded) next.devices.add(e.deviceId);
    if (firstDeviceJoined(next)) {
      bindShellState(next);
      resumeLoopsOrPauseOffers(next, eventSeq, effects);
      clearShellState();
    }
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  if (e.kind === "tower-result") {
    const next: ShellState = { ...state, eventSeq: eventSeq + 1 };
    bindShellState(next);
    applyTowerResult(next, e.capabilityId, e.ok, effects);
    resumeLoopsOrPauseOffers(next, eventSeq, effects);
    clearShellState();
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
      if (next.holdings[e.heroId] != null || heldCount(next) >= partySize(next)) {
        return withEffects(state, effects);
      }
      // The disconnect pause picks for the seated party only: an unseated hero is not offered
      // there and a hold on one is refused (CU/16 EV-04).
      if (
        next.stage === "paused" &&
        next.pause?.cause === "disconnect" &&
        next.play &&
        !next.play.groups.some((group) => group.heroIds.includes(e.heroId))
      ) {
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
    const known = state.stories.some((story) => story.card.id === e.storyId);
    if (state.screen !== "pick-story" || !known) {
      return withEffects({ ...state, eventSeq: eventSeq + 1 }, effects);
    }
    const next = { ...state, focusStoryId: e.storyId, eventSeq: eventSeq + 1 };
    resetGameAwaitingPress(next);
    bindShellState(next);
    resumeLoopsOrPauseOffers(next, eventSeq, effects);
    clearShellState();
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  if (e.kind === "hint-end") {
    const next = endHint(state, e.hintId);
    if (next === state) return withEffects(state, effects);
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects({ ...next, eventSeq: eventSeq + 1 }, effects);
  }

  if (e.kind === "test-seed") {
    // TEST ONLY: a host built for tests set markers on the running game (C3/20).
    if (!state.play) throw new Error("There is no running game to seed.");
    applyTestSeed(state.play, e.markers);
    applyQuestTestSeed(state.play, e.markers);
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects({ ...state, eventSeq: eventSeq + 1 }, effects);
  }

  if (e.kind === "wait-end") {
    // The effects wait, or an event's result wait (C3/12), is over (C3/20). A late or repeated end, or one for another wait, changes
    // nothing: an expected race, not an error, so one debug line.
    const dayFrame = state.loops.stack.find((frame) => frame.loopId === "day");
    const local = dayFrame?.local as DayLocal | undefined;
    const waiting = local?.phase === "effects" || (local?.phase === "event" && !local.waitDone);
    const dayWaits = Boolean(dayFrame && local && waiting && local.wait?.id === e.waitId);
    if (!dayWaits) {
      // A building result's wait (C3/13) ends the same way, through its own frame.
      const next: ShellState = { ...state, eventSeq: eventSeq + 1 };
      if (endBuildingWait(next.loops.stack, e.waitId)) {
        bindShellState(next);
        resumeLoopsOrPauseOffers(next, eventSeq, effects);
        clearShellState();
        effects.push({ kind: "view-refresh", v: 1 });
        return withEffects(next, effects);
      }
    }
    if (!dayFrame || !local || !waiting || local.wait?.id !== e.waitId) {
      return {
        state: { ...state, eventSeq: eventSeq + 1 },
        effects,
        logs: [
          {
            level: "debug",
            code: "wait-end-ignored",
            message: `Ignored a wait-end for "${e.waitId}" (${e.cause}): that wait is not open.`,
          },
        ],
      };
    }
    const next: ShellState = { ...state, eventSeq: eventSeq + 1 };
    const frame = next.loops.stack.find((row) => row.loopId === "day");
    if (frame) frame.local = { ...local, waitDone: true };
    bindShellState(next);
    resumeLoopsOrPauseOffers(next, eventSeq, effects);
    clearShellState();
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  if (e.kind === "set-setting" && e.settingId === HINTS_SETTING_ID) {
    // Hints is set at setup only (DEC-571). A late action is refused and the value stays.
    if (state.screen !== "game-settings" || !state.chosenStoryId) {
      effects.push({
        kind: "press-error",
        v: 1,
        code: HINTS_AFTER_SETUP,
        message: "Hints can only be changed on Game settings, before the story begins.",
        deviceId: e.deviceId,
      });
      return withEffects(state, effects);
    }
    if (e.optionId !== HINTS_ON && e.optionId !== HINTS_OFF) return withEffects(state, effects);
    if ((state.settingValues[HINTS_SETTING_ID] ?? HINTS_ON) === e.optionId) {
      return withEffects(state, effects);
    }
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(
      {
        ...state,
        settingValues: { ...state.settingValues, [HINTS_SETTING_ID]: e.optionId },
        setSerial: state.setSerial + 1,
        eventSeq: eventSeq + 1,
      },
      effects,
    );
  }

  if (e.kind === "set-setting") {
    // The fun rating on a game's stats; it changes nothing else (SCR-019).
    if (state.screen === "session" && state.statsGame !== null && e.settingId === RATING_SETTING) {
      const next = { ...state, eventSeq: eventSeq + 1 };
      rateOpenGame(next, e.optionId, effects);
      effects.push({ kind: "view-refresh", v: 1 });
      return withEffects(next, effects);
    }
    const story = state.chosenStoryId
      ? state.stories.find((s) => s.card.id === state.chosenStoryId)
      : null;
    if (!story) return withEffects(state, effects);
    const setting = story.settings.find((s) => s.id === e.settingId);
    if (!setting?.options.some((o) => o.id === e.optionId)) {
      return withEffects(state, effects);
    }
    const current = state.settingValues[e.settingId] ?? setting.default;
    if (current === e.optionId) return withEffects(state, effects);
    const next = {
      ...state,
      settingValues: { ...state.settingValues, [e.settingId]: e.optionId },
      setSerial: state.setSerial + 1,
      eventSeq: eventSeq + 1,
    };
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  if (e.kind === "sound-unlock") {
    // Retired by DEC-903: an old saved log still holds it. Accepted and ignored on purpose, with
    // one debug line. An expected, fully recovered case, so not an error and not the unknown path.
    return {
      state: { ...state, eventSeq: eventSeq + 1 },
      effects,
      logs: [
        {
          level: "debug",
          code: OLD_SOUND_UNLOCK_LOG,
          message: `Ignored the retired "sound-unlock" event from ${e.deviceId} (no iPad plays sound).`,
        },
      ],
    };
  }

  if (e.kind === "volume-play" || e.kind === "volume-result" || e.kind === "volume-answer") {
    const next: ShellState = { ...state, eventSeq: eventSeq + 1 };
    if (e.kind === "volume-result") applyVolumeResult(next, e.deviceId, e.level, e.ok);
    else if (e.kind === "volume-answer") answerVolume(next, e.deviceId, e.answer);
    else if (pressVolume(next, e.deviceId, e.level)) {
      effects.push({
        kind: "tower-command",
        v: 1,
        capabilityId: "sound.play-stateful",
        params: { soundIndex: VOLUME_TEST_SOUND, volume: e.level },
      });
    }
    // The story's Choose press must be offered again, as after a focus change.
    resetGameAwaitingPress(next);
    bindShellState(next);
    resumeLoopsOrPauseOffers(next, eventSeq, effects);
    clearShellState();
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  if (e.kind === "gear" && e.action === "pick" && e.item === FIX_POSITION_ITEM) {
    // Fix my position (CU/05, Q5.3): one pick moves a group's recorded space. A refusal changes
    // nothing and is logged, toasted and shown with its code (EV-08, EV-30).
    const fixed = applyFixPosition(state, e);
    const next = fixed.state;
    if (fixed.error) {
      effects.push({
        kind: "press-error",
        v: 1,
        code: fixed.error.code,
        message: fixed.error.message,
        deviceId: e.deviceId,
      });
    } else if (fixed.moved) {
      // The move map offers again from the new space (the offers are rebuilt by the loop).
      bindShellState(next);
      resumeLoopsOrPauseOffers(next, eventSeq, effects);
      clearShellState();
    }
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  if (e.kind === "gear" && isUseItemAct(e)) {
    // The gear's use-item flow and the host's own action are this one path (Q7.2, EV-17).
    const used = applyUseItem(state, e, (heroId) => heroName(state, heroId));
    if (used.error) {
      effects.push({
        kind: "press-error",
        v: 1,
        code: USE_ITEM_REFUSED,
        message: used.error,
        deviceId: e.deviceId,
      });
    }
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(used.state, effects);
  }

  if (e.kind === "gear") {
    const next = applyGear(state, e);
    // The Tower panel's Done carries the pick the iPad confirmed (the host adds it before logging).
    if (e.action === "done" && e.item === "tower" && e.pick) {
      next.eventSeq = eventSeq + 1;
      bindShellState(next);
      applyTowerPick(next, e.pick, effects);
      resumeLoopsOrPauseOffers(next, eventSeq, effects);
      clearShellState();
    }
    effects.push({ kind: "view-refresh", v: 1 });
    return withEffects(next, effects);
  }

  if (e.kind === "press") {
    // A lost tower stops play: only the pause's own presses (and a running Reconnect) count.
    if (
      state.pause?.cause === "tower-lost" &&
      !state.reconnect &&
      !e.promptId.startsWith("pause-")
    ) {
      return withEffects({ ...state, eventSeq: eventSeq + 1 }, effects);
    }
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

    if (e.promptId === BOARD_SET_UP_PROMPT && next.enter?.step === "board") {
      next.enter = { step: "choice", failed: false };
    } else if (
      e.promptId === TOWER_CONNECT_PROMPT &&
      e.actionId === "tower-connect" &&
      next.enter?.step === "choice"
    ) {
      next.enter = { step: "connecting", failed: false };
      next.towerLinked = true;
      effects.push({ kind: "tower-command", v: 1, capabilityId: "tower.connect", params: {} });
    } else if (
      e.promptId === TOWER_CALIBRATE_PROMPT &&
      e.actionId === "tower-calibrate" &&
      next.enter?.step === "calibrate"
    ) {
      next.enter = { step: "calibrating", failed: false };
      effects.push({ kind: "tower-command", v: 1, capabilityId: "tower.calibrate", params: {} });
    } else if (
      e.promptId === PLAY_WITHOUT_TOWER_PROMPT &&
      e.actionId === "play-without-tower" &&
      next.enter?.step === "choice"
    ) {
      next.towerChoice = "without";
      next.towerLinked = false;
      finishEnter(next, effects);
    } else if (
      e.promptId === TOWER_CALIBRATE_PROMPT &&
      e.actionId === "tower-calibrate" &&
      next.reconnect?.step === "calibrate"
    ) {
      next.reconnect = { ...next.reconnect, step: "calibrating" };
      effects.push({ kind: "tower-command", v: 1, capabilityId: "tower.calibrate", params: {} });
    } else if (
      e.promptId === RECONNECT_CANCEL_PROMPT &&
      e.actionId === "reconnect-cancel" &&
      next.reconnect?.origin === "menu"
    ) {
      cancelMenuReconnect(next, e.deviceId);
    } else if (
      e.actionId === "quit-story" &&
      (e.promptId === "menu-quit" || (next.pause && e.promptId.startsWith("pause-")))
    ) {
      const gameFrame = next.loops.stack.find((frame) => frame.loopId === "game");
      if (gameFrame) {
        gameFrame.local = handleGamePress(gameFrame.local as GameLocal, e.promptId, e.actionId);
        if ((gameFrame.local as GameLocal).phase === "done") {
          collapsePlayLoopsOnQuit(next);
          pushQuitRecord(next, effects);
        }
      }
    } else if (
      next.pause?.cause === "tower-lost" &&
      e.actionId === "reconnect" &&
      e.promptId.startsWith("pause-")
    ) {
      startReconnect(next, "pause", effects);
    } else if (
      next.pause?.cause === "tower-lost" &&
      e.actionId === "go-on-without" &&
      e.promptId.startsWith("pause-")
    ) {
      goOnWithout(next);
    } else if (isHubPrompt(e.promptId)) {
      applyHubPress(next, e.promptId, effects);
      // Continue from Pick story: the game loop moves on to the saved game as the Pick Game press did.
      const gameFrame = next.loops.stack.find((frame) => frame.loopId === "game");
      if (gameFrame && next.screen === "play") {
        gameFrame.local = {
          ...(gameFrame.local as GameLocal),
          phase: "play",
          awaitingPress: false,
          playStarted: false,
        };
      }
      if (next.screen === "play" && next.towerLinked && !towerReady(next.tower)) {
        next.stage = "paused";
        next.pause = { cause: "tower-lost" };
        next.pauseSerial += 1;
        next.screen = "pause";
      }
    } else if (top?.loopId === "game") {
      const before = top.local as GameLocal;
      const beforeOpening = next.openingIndex;
      const local = handleGamePress(before, e.promptId, e.actionId);
      updateTopLocal(next, local);
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
      if (
        openingFinishedIndex(next.openingIndex) &&
        !next.play &&
        next.playContent &&
        !next.resumedFromAutosave
      ) {
        const story = next.stories.find((entry) => entry.card.id === next.boundStoryId);
        const seated = (story?.heroes ?? [])
          .map((hero) => hero.id)
          .filter((heroId) => next.holdings[heroId] != null)
          .slice(0, partySize(next));
        next.play = initPlayState(next.seed, {
          ...next.playContent,
          start: {
            ...next.playContent.start,
            assignments: seatAtCitadels(next.playContent.start.assignments, seated),
          },
        });
        // C3/12: each seated hero's hit points from the hero card, and the starting purse split
        // across the party. A value the card or the purse does not give stays unknown.
        seedHeroSheets(
          next.play,
          seated.map((heroId) => {
            const hitPoints = story?.heroes.find((hero) => hero.id === heroId)?.card?.hitPoints;
            return { id: heroId, ...(hitPoints !== undefined ? { hitPoints } : {}) };
          }),
          isPurseAmount(next.startingPurse) ? next.startingPurse : null,
        );
        // F1/03 (DEC-949): the pack's quests and chapter plan, before the test marker below.
        configureStoryPlay(next.play, story?.play);
        // TEST ONLY (F1/02): `~test-quest:` opens a fixture quest at a space; no marker, no change.
        applyQuestTestSeed(next.play, next.seed);
      }
      if (
        next.openingIndex !== beforeOpening &&
        openingActiveIndex(next.openingIndex) &&
        next.activeGameId
      ) {
        requestCheckpoint(next.activeGameId, 1);
      }
      if (local.phase === "done" && next.stage === "ended") {
        collapsePlayLoopsOnQuit(next);
        pushQuitRecord(next, effects);
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
    } else {
      const before = playFingerprint(next);
      const skullBefore = next.play?.lastSkull;
      updatePlayFrameOnPress(next.loops.stack, e.promptId, e.actionId);
      if (parseEventChoicePrompt(e.promptId)) {
        // C3/12: a pick the scene did not take is an error to log, never a silent no-op.
        const top = next.loops.stack.at(-1);
        const refusal =
          top?.loopId === "day"
            ? eventPressRefusal(top.local as DayLocal, e.promptId, e.actionId)
            : "An event pick arrived when no day was open, so nothing changed.";
        if (refusal) {
          effects.push({ kind: "press-error", v: 1, code: "invalid-state", message: refusal });
        }
      }
      if (isVirtuePrompt(e.promptId)) {
        // CU/14: a virtue's pick the turn did not take is an error to log, never a silent no-op.
        const top = next.loops.stack.at(-1);
        const refusal =
          top?.loopId === "group-turn"
            ? virtuePressRefusal(top.local as GroupTurnLocal, e.promptId, e.actionId)
            : "A virtue pick arrived when no group turn was open, so nothing changed.";
        if (refusal) {
          effects.push({ kind: "press-error", v: 1, code: "invalid-state", message: refusal });
        } else if (next.play && next.activeGameId) {
          // The pick changed skulls and the turn's picks, so a Continue must see it.
          requestCheckpoint(next.activeGameId, next.play.dayNumber);
        }
      }
      if (e.actionId === "build") {
        // C3/13: a building press the encounter did not take is an error to log, never a silent
        // no-op. A press it took changed gold, hit points, moves or tiles, so a Continue must see it.
        const refusal = takeBuildingRefusal(next.loops.stack);
        if (refusal) {
          effects.push({ kind: "press-error", v: 1, code: "invalid-state", message: refusal });
        } else if (next.play && next.activeGameId) {
          requestCheckpoint(next.activeGameId, next.play.dayNumber);
        }
      }
      countPress(
        next,
        e.actionId,
        playFingerprint(next) !== before,
        next.play?.lastSkull !== skullBefore,
      );
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
      frame.local = { ...local, awaitingLeave: false, awaitingPress: false };
    } else if (frame.loopId === "game" && openingActiveIndex(state.openingIndex)) {
      const local = frame.local as GameLocal;
      frame.local = { ...local, awaitingPress: false, playStarted: false };
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

/**
 * One step of the shell. Hints (CU/09) and Rules pages ride on top of the core step: a loop the step
 * entered earns its hint once per game; a Look up pick with no page is an error, never silent.
 */
const mayStartHint = (state: ShellState): boolean =>
  state.screen === "play" &&
  state.hint === null &&
  hintsOn(state) &&
  HINT_IDS.some((id) => !state.hintsShown.includes(id));

export const stepShell = (state: ShellState, event: ShellEvent): ShellStepResult => {
  // The loop runtime changes its stack in place, so the screen the iPads show must be read before
  // the step runs. It is only needed while a hint can still start.
  const held: HintHold | null = mayStartHint(state) ? captureHintHold(state) : null;
  const result = stepShellCore(state, event);
  const { state: kept, extra } = applyHints(result.state, result.effects);
  let next = kept;
  // A hint is the loop's first beat: the iPads keep the screen they had before the step, greyed,
  // until the hint ends. The Story board shows the hint; it is never held back.
  if (next.hint === null) {
    if (next.hintHold) next = { ...next, hintHold: null };
  } else if (next.hintHold === null) {
    next = { ...next, hintHold: held ?? { table: null, actions: [] } };
  }
  if (next.gearPanel === "look-up" && next.gearCard && !rulesPage(next.gearCard)) {
    extra.push({
      kind: "press-error",
      v: 1,
      code: RULES_PAGE_MISSING,
      message: `Look up has no page for "${next.gearCard}".`,
      ...(event.kind === "gear" ? { deviceId: event.deviceId } : {}),
    });
    next = { ...next, gearCard: null };
  }
  if (next === result.state && extra.length === 0) return result;
  return { ...result, state: next, effects: [...result.effects, ...extra] };
};
