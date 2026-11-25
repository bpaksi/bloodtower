import type { EngineEffect } from "../effects.ts";
import type { DayLocal } from "../loops/day/loop.ts";
import type { GameLocal } from "../loops/game/loop.ts";
import type { ShellEffect } from "../loops/session/effects.ts";
import type { ShellState } from "../loops/session/state.ts";
import { HINT_TEXT, HINTS_OFF, HINTS_SETTING_ID } from "./copy.ts";
import { HINT_TEXT_MISSING, hintsForLoops } from "./registry.ts";

/** Hints are on unless the table switched them off at setup. An old checkpoint has no value: on. */
export const hintsOn = (state: Pick<ShellState, "settingValues">): boolean =>
  state.settingValues[HINTS_SETTING_ID] !== HINTS_OFF;

/** A new game shows each hint once again. The Hints choice itself lives in `settingValues`. */
export const resetHints = (state: ShellState): void => {
  state.hintsShown = [];
  state.hint = null;
  state.hintQueue = [];
};

const SKULL_PHASES = new Set(["skull-prompt", "skull-place", "skull-sim"]);

const dayPhase = (state: ShellState): string | null => {
  const frame = state.loops.stack.find((row) => row.loopId === "day");
  return frame ? ((frame.local as DayLocal | undefined)?.phase ?? null) : null;
};

/** The game loop is on the outcome scene (SCR-018): no tutorial hint may cover it. */
const onOutcome = (state: ShellState): boolean => {
  const frame = state.loops.stack.find((row) => row.loopId === "game");
  const local = frame?.local as GameLocal | undefined;
  return local?.phase === "outcome" && Boolean(local.outcome);
};

/** The day loop is in its night steps (a skull is being placed or shown). */
export const inNightPhase = (state: ShellState): boolean => {
  const phase = dayPhase(state);
  return phase !== null && SKULL_PHASES.has(phase);
};

/**
 * The hint loops this step entered, in order. `encounter` is the building visit; the skull drop
 * is the day loop reaching its night phases; the day ends when the day loop does.
 */
export const loopsEntered = (
  after: ShellState,
  effects: ReadonlyArray<EngineEffect | ShellEffect>,
): string[] => {
  if (onOutcome(after)) return [];
  const out: string[] = [];
  for (const effect of effects) {
    if (effect.kind === "loop-trace" && effect.phase === "enter" && effect.loopId === "encounter") {
      out.push("building");
    }
  }
  // The loop runtime mutates the stack in place, so a before/after compare sees no change. The
  // night phases are asked about directly; a hint already shown is dropped by the registry.
  const now = dayPhase(after);
  if (now && SKULL_PHASES.has(now)) out.push("skull-drop");
  for (const effect of effects) {
    if (effect.kind === "loop-end" && effect.loopId === "day") out.push("day-end");
  }
  return out;
};

/**
 * Record the hints a step earned: shown once per game, queued behind a hint still on the board.
 * Returns the state to keep and any error effects; nothing here reaches the tower.
 */
export const applyHints = (
  after: ShellState,
  effects: Array<EngineEffect | ShellEffect>,
  texts: Readonly<Record<string, string>> = HINT_TEXT,
): { state: ShellState; extra: ShellEffect[] } => {
  // Entering the outcome scene (win or loss) clears any lingering hint and suppresses day-end
  // hints so the outcome painting and caption are never hidden behind a tutorial scroll (C3/16).
  if (onOutcome(after)) {
    if (after.hint === null && after.hintQueue.length === 0) return { state: after, extra: [] };
    return { state: { ...after, hint: null, hintQueue: [] }, extra: [] };
  }
  const entered = loopsEntered(after, effects);
  if (entered.length === 0) return { state: after, extra: [] };
  const earned = hintsForLoops({ on: hintsOn(after), shown: after.hintsShown }, entered, texts);
  if (earned.length === 0) return { state: after, extra: [] };
  const next: ShellState = {
    ...after,
    hintsShown: [...after.hintsShown],
    hintQueue: [...after.hintQueue],
  };
  const extra: ShellEffect[] = [];
  for (const hint of earned) {
    next.hintsShown.push(hint.hintId);
    if (hint.text.trim() === "") {
      extra.push({
        kind: "press-error",
        v: 1,
        code: HINT_TEXT_MISSING,
        message: `The hint ${hint.hintId} has no text, so none was shown.`,
      });
      continue;
    }
    if (next.hint === null) next.hint = hint.hintId;
    else next.hintQueue.push(hint.hintId);
  }
  return { state: next, extra };
};

/** The 4 s are up (the host's timer): the next queued hint shows, or the loop's first step does. */
export const endHint = (state: ShellState, hintId: string): ShellState => {
  if (state.hint !== hintId) return state;
  const [next, ...rest] = state.hintQueue;
  return { ...state, hint: (next as ShellState["hint"]) ?? null, hintQueue: rest };
};
