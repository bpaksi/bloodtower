import type { ViewAction } from "../../views/state.ts";
import type { ShellState } from "./state.ts";

/** Dungeon Complete (#58): the one sound the volume step plays (SCR-006, SND-058). */
export const VOLUME_TEST_SOUND = 58;
/** The volume a move-roll cue uses until an iPad keeps one (GAP-HW-003). */
export const DEFAULT_TOWER_VOLUME = 2;

export const SOUND_ENABLE_PROMPT = "sound-enable";
export const VOLUME_KEEP_PROMPT = "volume-keep";
export const VOLUME_AGAIN_PROMPT = "volume-again";
export const volumePrompt = (level: number): string => `volume-${level}`;

export const VOLUME_LEVELS = [0, 1, 2] as const;

/** The volume line the Story board shows on Pick story (SCR-006, Bob 2026-10-31). */
export const VOLUME_LINE = "How loud should the tower be? Press one to hear it.";

/** The tower plays the sound only on the connect track, and only while the link is up. */
export const towerPlaysVolume = (state: ShellState): boolean =>
  state.towerChoice === "connect" && state.towerLinked;

/** True while Pick story still shows the sound step on the board: nobody has kept a volume. */
export const soundStepOnBoard = (state: ShellState): boolean =>
  state.screen === "pick-story" && state.keptVolume === null;

/** Greyed until the first iPad has tapped Enable sound (Bob 2026-10-31 6:15 PM ET). */
export const volumeLineLive = (state: ShellState): boolean => Object.keys(state.sound).length > 0;

/** An iPad's tap on Enable sound. Only Pick story has the step. */
export const unlockSound = (state: ShellState, deviceId: string): void => {
  if (state.screen !== "pick-story" || state.sound[deviceId]) return;
  state.sound = { ...state.sound, [deviceId]: { phase: "levels", played: null, pending: null } };
};

/**
 * A volume press. Returns true when the tower must play Dungeon Complete at it. Without the
 * tower the iPad has already played it, so the press counts as played right away.
 */
export const pressVolume = (state: ShellState, deviceId: string, level: number): boolean => {
  const own = state.sound[deviceId];
  if (state.screen !== "pick-story" || own?.phase !== "levels" || own.pending !== null) {
    return false;
  }
  if (towerPlaysVolume(state)) {
    state.sound = { ...state.sound, [deviceId]: { ...own, played: null, pending: level } };
    return true;
  }
  state.sound = { ...state.sound, [deviceId]: { ...own, played: level, pending: null } };
  return false;
};

/** The tower's answer to a volume press. A failed sound leaves Keep disabled. */
export const applyVolumeResult = (
  state: ShellState,
  deviceId: string,
  level: number,
  ok: boolean,
): void => {
  const own = state.sound[deviceId];
  if (own?.phase !== "levels" || own.pending !== level) return;
  state.sound = {
    ...state.sound,
    [deviceId]: { ...own, played: ok ? level : null, pending: null },
  };
};

/** Keep stores the played volume; Try another clears it so Keep waits for the next one. */
export const answerVolume = (
  state: ShellState,
  deviceId: string,
  answer: "keep" | "again",
): void => {
  const own = state.sound[deviceId];
  if (state.screen !== "pick-story" || own?.phase !== "levels" || own.pending !== null) return;
  if (answer === "again") {
    state.sound = { ...state.sound, [deviceId]: { ...own, played: null } };
    return;
  }
  if (own.played === null) return;
  state.keptVolume = own.played;
  state.sound = { ...state.sound, [deviceId]: { ...own, phase: "done" } };
};

/** The sound step's buttons for one iPad. A finished iPad gets none and sees the story list. */
export const soundActions = (state: ShellState): ViewAction[] => {
  if (state.screen !== "pick-story") return [];
  const actions: ViewAction[] = [];
  for (const deviceId of state.devices) {
    const own = state.sound[deviceId];
    if (!own) {
      actions.push({
        promptId: SOUND_ENABLE_PROMPT,
        actionId: "enable-sound",
        label: "Enable sound",
        deviceId,
        open: true,
      });
      continue;
    }
    if (own.phase === "done") continue;
    for (const level of VOLUME_LEVELS) {
      actions.push({
        promptId: volumePrompt(level),
        actionId: "volume-play",
        label: `Volume ${level}`,
        deviceId,
        open: true,
      });
    }
    const ready = own.played !== null;
    actions.push(
      ready
        ? {
            promptId: VOLUME_KEEP_PROMPT,
            actionId: "volume-keep",
            label: "Keep",
            deviceId,
            open: true,
          }
        : {
            promptId: VOLUME_KEEP_PROMPT,
            actionId: "volume-keep",
            label: "Keep",
            deviceId,
            open: false,
            reason: "Play a volume first.",
          },
      {
        promptId: VOLUME_AGAIN_PROMPT,
        actionId: "volume-again",
        label: "Try another",
        deviceId,
        open: true,
      },
    );
  }
  return actions;
};
