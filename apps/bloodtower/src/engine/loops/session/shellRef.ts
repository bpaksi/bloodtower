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
  const quitId = `pause-${serial}-quit`;
  if (!state.offered.some((o) => o.promptId === quitId && o.actionId === "quit-story")) {
    state.offered.push({ promptId: quitId, actionId: "quit-story", open: true });
  }
  if (state.pause.cause === "tower-lost") {
    const reconnectId = `pause-${serial}-reconnect`;
    if (!state.offered.some((o) => o.promptId === reconnectId && o.actionId === "reconnect")) {
      state.offered.push({ promptId: reconnectId, actionId: "reconnect", open: true });
    }
  }
};
