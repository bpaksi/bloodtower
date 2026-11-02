import type { EngineEffect } from "../../effects.ts";
import type { LoopContext } from "../../loop/types.ts";
import type { ShellEffect } from "./effects.ts";
import { beginContinue, beginNewGame, beginPlayAgain, toPickStory } from "./hub.ts";
import { endReconnect } from "./reconnect.ts";
import { recordOffer } from "./shellRef.ts";
import type { EnterStep, ShellState } from "./state.ts";

/** Prompt ids the Enter offers. One press each, from any joined iPad (DEC-278). */
export const BOARD_SET_UP_PROMPT = "base-board-done";
export const TOWER_CONNECT_PROMPT = "tower-connect";
export const TOWER_CALIBRATE_PROMPT = "tower-calibrate";
export const PLAY_WITHOUT_TOWER_PROMPT = "play-without-tower";

type Offer = (promptId: string, actionId: string) => void;

const offerer =
  (ctx: Pick<LoopContext<unknown>, "offerPrompt">): Offer =>
  (promptId, actionId) => {
    ctx.offerPrompt(promptId, actionId);
    recordOffer(promptId, actionId);
  };

const SCREEN: Record<EnterStep, ShellState["screen"]> = {
  join: "table-join",
  board: "base-board",
  choice: "tower-choice",
  connecting: "tower-wake",
  calibrate: "tower-wake",
  calibrating: "tower-wake",
};

/**
 * Sets the screen for the Enter step and offers its presses. The Enter is driven by
 * `state.enter`; this only reads it. Nothing physical is offered except by a press (SCR-005).
 */
export const renderEnter = (
  state: ShellState,
  ctx: Pick<LoopContext<unknown>, "offerPrompt">,
): void => {
  const enter = state.enter;
  if (!enter) return;
  const offer = offerer(ctx);
  state.screen = SCREEN[enter.step];
  state.stage = "lobby";
  if (enter.step === "board") offer(BOARD_SET_UP_PROMPT, "board-set-up");
  if (enter.step === "choice") {
    offer(TOWER_CONNECT_PROMPT, "tower-connect");
    offer(PLAY_WITHOUT_TOWER_PROMPT, "play-without-tower");
  }
  if (enter.step === "calibrate") offer(TOWER_CALIBRATE_PROMPT, "tower-calibrate");
};

/** The first device to join moves the session on; later iPads may still join (DEC-274). */
export const firstDeviceJoined = (state: ShellState): boolean => {
  if (state.enter?.step !== "join" || state.devices.size === 0) return false;
  state.enter = { step: "board", failed: false };
  return true;
};

/**
 * The Enter is done. Pick story follows, with Continue above the stories while an autosave waits.
 * When the session screen ran the tower block again, the New game or Continue it came from goes on.
 */
export const finishEnter = (
  state: ShellState,
  effects: Array<EngineEffect | ShellEffect>,
): void => {
  const then = state.enterThen;
  state.enter = null;
  state.enterThen = null;
  if (then === "continue") {
    beginContinue(state);
    return;
  }
  if (then === "play-again") beginPlayAgain(state, effects);
  else if (then === "new-game") beginNewGame(state);
  else toPickStory(state);
};

/** A connect or calibrate the Enter sent has ended. */
export const applyTowerResult = (
  state: ShellState,
  capabilityId: "tower.connect" | "tower.calibrate",
  ok: boolean,
  effects: Array<EngineEffect | ShellEffect>,
): void => {
  // A Reconnect after a tower was lost mid-game: the connect, then the tower check (DEC-301).
  const running = state.reconnect;
  if (running) {
    if (capabilityId === "tower.connect" && running.step === "connecting") {
      if (ok) state.reconnect = { ...running, step: "calibrate" };
      else endReconnect(state, false);
    } else if (capabilityId === "tower.calibrate" && running.step === "calibrating") {
      endReconnect(state, ok);
    }
    return;
  }
  const step = state.enter?.step;
  if (capabilityId === "tower.connect" && step === "connecting") {
    state.enter = ok ? { step: "calibrate", failed: false } : { step: "choice", failed: true };
  } else if (capabilityId === "tower.calibrate" && step === "calibrating") {
    if (ok) {
      state.towerChoice = "connect";
      finishEnter(state, effects);
      return;
    }
    state.enter = { step: "choice", failed: true };
  } else {
    return;
  }
  // A failed attempt leaves the session unlinked, so a lost link cannot pause play later.
  if (!ok) state.towerLinked = false;
};
