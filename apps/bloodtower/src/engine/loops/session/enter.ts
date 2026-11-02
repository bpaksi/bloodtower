import type { LoopContext } from "../../loop/types.ts";
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

/** The Enter is done: the first Pick story (or Pick Game while an autosave waits) follows. */
export const finishEnter = (state: ShellState): void => {
  state.enter = null;
  if (!state.autosave) state.activeGameId = `game-${state.eventSeq}`;
  state.screen = state.autosave ? "pick-game" : "pick-story";
  state.stage = "lobby";
};

/** A connect or calibrate the Enter sent has ended. */
export const applyTowerResult = (
  state: ShellState,
  capabilityId: "tower.connect" | "tower.calibrate",
  ok: boolean,
): void => {
  const step = state.enter?.step;
  if (capabilityId === "tower.connect" && step === "connecting") {
    state.enter = ok ? { step: "calibrate", failed: false } : { step: "choice", failed: true };
  } else if (capabilityId === "tower.calibrate" && step === "calibrating") {
    if (ok) {
      state.towerChoice = "connect";
      finishEnter(state);
      return;
    }
    state.enter = { step: "choice", failed: true };
  } else {
    return;
  }
  // A failed attempt leaves the session unlinked, so a lost link cannot pause play later.
  if (!ok) state.towerLinked = false;
};
