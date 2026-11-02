import type { EngineEffect } from "../../effects.ts";
import type { DayLocal } from "../day/loop.ts";
import type { EncounterLocal } from "../encounter/loop.ts";
import type { GameLocal } from "../game/loop.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import type { ShellEffect } from "./effects.ts";
import type { PauseReturn, ShellState } from "./state.ts";

type Effects = Array<EngineEffect | ShellEffect>;

/** The pause's three presses, in the order the iPad shows them (DEC-301). */
export const pauseReconnectPrompt = (serial: number): string => `pause-${serial}-reconnect`;
export const pauseGoWithoutPrompt = (serial: number): string => `pause-${serial}-go-without`;
export const pauseQuitPrompt = (serial: number): string => `pause-${serial}-quit`;

/** The gear Tower panel's two picks (Bob 2026-10-31, DEC-229). The pick text is what the board mirrors. */
export const TOWER_PICK_RECONNECT = "Reconnect";
export const TOWER_PICK_WITHOUT = "Play without";

/** The screen a tower-lost pause came from, or null when a game is not in a state that pauses. */
export const pauseReturnOf = (state: ShellState): PauseReturn | null => {
  if (state.screen === "play" || state.screen === "setup" || state.screen === "begin") {
    return state.screen;
  }
  return null;
};

/**
 * Pause stopped the loops, so the offers they made are gone. Every waiting loop offers again
 * once play goes on; nothing is pressed for the table.
 */
export const reofferPlayPrompts = (state: ShellState): void => {
  for (const frame of state.loops.stack) {
    if (frame.loopId === "game") {
      frame.local = { ...(frame.local as GameLocal), awaitingPress: false };
    } else if (frame.loopId === "group-turn") {
      frame.local = { ...(frame.local as GroupTurnLocal), awaitingPress: false };
    } else if (frame.loopId === "encounter") {
      frame.local = { ...(frame.local as EncounterLocal), awaitingLeave: false };
    } else if (frame.loopId === "day") {
      const local = frame.local as DayLocal;
      if (local.phase !== "groups" && local.phase !== "done" && local.phase !== "check") {
        frame.local = { ...local, awaitingPress: false };
      }
    }
  }
};

/** Ends a tower-lost pause: the game goes back to the node it paused at. */
export const resumeAfterTowerPause = (state: ShellState): void => {
  const back = state.pause?.returnTo ?? "play";
  state.pause = null;
  state.reconnect = null;
  state.screen = back;
  state.stage = back === "play" ? "playing" : "lobby";
  reofferPlayPrompts(state);
};

/**
 * Go on without the tower, confirmed (DEC-301, DEC-305). The rest of the game uses the stand-ins.
 * Tonight's choice reads "without", so the session screen's tower line does too.
 */
export const goOnWithout = (state: ShellState): void => {
  state.towerWithout = true;
  state.towerLinked = false;
  state.towerChoice = "without";
  if (state.pause?.cause === "tower-lost") resumeAfterTowerPause(state);
};

/** Reconnect, on a press only: connect the tower, then the tower check (MEC-018) before play goes on. */
export const startReconnect = (
  state: ShellState,
  origin: "pause" | "menu",
  effects: Effects,
): void => {
  if (state.reconnect) return;
  if (!state.pause) {
    state.pause = { cause: "tower-lost", returnTo: pauseReturnOf(state) ?? "play" };
    state.pauseSerial += 1;
  }
  state.stage = "paused";
  state.towerLinked = true;
  state.reconnect = { step: "connecting", origin };
  state.screen = "tower-wake";
  effects.push({ kind: "tower-command", v: 1, capabilityId: "tower.connect", params: {} });
};

/** The connect or the tower check ended. Success goes on; failure goes back to where it began. */
export const endReconnect = (state: ShellState, ok: boolean): void => {
  const running = state.reconnect;
  if (!running) return;
  if (ok) {
    state.towerWithout = false;
    state.towerLinked = true;
    state.towerChoice = "connect";
    resumeAfterTowerPause(state);
    return;
  }
  state.reconnect = null;
  if (running.origin === "pause") {
    state.screen = "pause";
    return;
  }
  // The game was playing without the tower and still is.
  state.towerLinked = false;
  resumeAfterTowerPause(state);
};

/** The Menu's Tower panel: Yes on Reconnect, or Done on Play without. */
export const applyTowerPick = (state: ShellState, pick: string, effects: Effects): void => {
  if (pick === TOWER_PICK_RECONNECT) {
    if (state.pause?.cause === "tower-lost") startReconnect(state, "pause", effects);
    else if (state.screen === "play" && state.stage === "playing") {
      startReconnect(state, "menu", effects);
    } else {
      effects.push({
        kind: "press-error",
        v: 1,
        code: "invalid-state",
        message: "The tower can only be reconnected in a game.",
      });
    }
    return;
  }
  if (pick === TOWER_PICK_WITHOUT) goOnWithout(state);
};
