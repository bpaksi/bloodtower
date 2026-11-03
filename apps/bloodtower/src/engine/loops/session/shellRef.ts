import type { PromptSlot } from "../../loop/runtime.ts";
import { bindPlayState } from "../chapter/playState.ts";
import type { ShellState } from "./state.ts";

/** The shell state the loop bodies read during `advanceLoops`. Set only for the duration of a step. */
let active: ShellState | null = null;

export const bindShellState = (state: ShellState): void => {
  active = state;
  state.offered = [];
  bindPlayState(state.play);
};

export const recordOffer = (promptId: string, actionId: string): void => {
  if (!active) return;
  active.offered.push({ promptId, actionId, open: true });
};

export const matchOffer = (
  state: ShellState,
  promptId: string,
  actionId: string,
): PromptSlot | null => {
  const hit = state.offered.find(
    (offer) => offer.promptId === promptId && offer.actionId === actionId && offer.open,
  );
  return hit ?? null;
};

export const clearShellState = (): void => {
  active = null;
};

export const shellState = (): ShellState => {
  if (!active) throw new Error("Shell state is not bound for loop execution.");
  return active;
};

let pendingCheckpoint: { gameId: string; day: number } | null = null;

export const requestCheckpoint = (gameId: string, day: number): void => {
  pendingCheckpoint = { gameId, day };
};

export const takePendingCheckpoint = (): { gameId: string; day: number } | null => {
  const row = pendingCheckpoint;
  pendingCheckpoint = null;
  return row;
};

type PendingTowerCommand = {
  capabilityId: string;
  params: Record<string, unknown>;
};

let pendingTowerCommands: PendingTowerCommand[] = [];

export const requestTowerCommand = (
  capabilityId: string,
  params: Record<string, unknown>,
): void => {
  pendingTowerCommands.push({ capabilityId, params });
};

export const takePendingTowerCommands = (): PendingTowerCommand[] => {
  const row = pendingTowerCommands;
  pendingTowerCommands = [];
  return row;
};

/** Pause prompts must show even when a play loop is the stack top (chapter / day / group turn). */
export const ensurePauseOffers = (state: ShellState): void => {
  if (state.stage !== "paused" || !state.pause) return;
  const serial = state.pauseSerial;
  const offer = (promptId: string, actionId: string) => {
    if (!state.offered.some((o) => o.promptId === promptId && o.actionId === actionId)) {
      state.offered.push({ promptId, actionId, open: true });
    }
  };
  // Reconnect, Go on without, Quit: the order the iPad shows them (DEC-301).
  if (state.pause.cause === "tower-lost") {
    offer(`pause-${serial}-reconnect`, "reconnect");
    offer(`pause-${serial}-go-without`, "go-on-without");
  }
  offer(`pause-${serial}-quit`, "quit-story");
};

/** The tower check a Reconnect runs asks for one press: Calibrate (MEC-018, as C1 built it). */
export const ensureReconnectOffers = (state: ShellState): void => {
  const running = state.reconnect;
  if (!running) return;
  const offer = (promptId: string, actionId: string) => {
    if (!state.offered.some((o) => o.promptId === promptId && o.actionId === actionId)) {
      state.offered.push({ promptId, actionId, open: true });
    }
  };
  if (running.step === "calibrate") offer("tower-calibrate", "tower-calibrate");
  // Only the Menu's Reconnect can be cancelled; the pause's has no body button (EV-13).
  if (running.origin === "menu" && running.step !== "calibrating") {
    offer("reconnect-cancel", "reconnect-cancel");
  }
};

/** Quit story lives in the iPad menu. Reconnect is the Tower item there (DEC-301, DEC-229). */
export const ensurePlayMenuOffers = (state: ShellState): void => {
  if (state.screen !== "play" || state.pause || state.stage !== "playing") return;
  if (!state.offered.some((offer) => offer.promptId === "menu-quit")) {
    state.offered.push({ promptId: "menu-quit", actionId: "quit-story", open: true });
  }
};
