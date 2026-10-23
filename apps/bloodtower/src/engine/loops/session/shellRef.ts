import type { PromptSlot } from "../../loop/runtime.ts";
import type { ShellState } from "./state.ts";

/** The shell state the loop bodies read during `advanceLoops`. Set only for the duration of a step. */
let active: ShellState | null = null;

export const bindShellState = (state: ShellState): void => {
  active = state;
  state.offered = [];
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
