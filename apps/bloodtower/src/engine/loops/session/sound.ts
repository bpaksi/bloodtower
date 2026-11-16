import type { ViewAction } from "../../views/state.ts";
import type { DeviceSound, ShellState } from "./state.ts";

/** Dungeon Complete (#58): the one sound the volume step plays (SCR-006, SND-058). */
export const VOLUME_TEST_SOUND = 58;
/** The volume a move-roll cue uses until an iPad keeps one (GAP-HW-003). */
export const DEFAULT_TOWER_VOLUME = 2;

export const VOLUME_KEEP_PROMPT = "volume-keep";
export const VOLUME_AGAIN_PROMPT = "volume-again";
export const volumePrompt = (level: number): string => `volume-${level}`;

export const VOLUME_LEVELS = [0, 1, 2] as const;

/** The volume line the Story board shows on Pick story (SCR-006, Bob 2026-10-31). */
export const VOLUME_LINE = "How loud should the tower be? Press one to hear it.";

/** The tower plays the sound only on the connect track, and only while the link is up. */
export const towerPlaysVolume = (state: ShellState): boolean =>
  state.towerChoice === "connect" && state.towerLinked;

/**
 * The volume step runs on Pick story on the connect track only (DEC-903). Play without Tower has
 * no volume step and no volume line, and no iPad plays sound.
 */
export const volumeStepOn = (state: ShellState): boolean =>
  state.screen === "pick-story" && state.towerChoice === "connect";

/** True while Pick story still shows the volume step on the board: nobody has kept a volume. */
export const soundStepOnBoard = (state: ShellState): boolean =>
  volumeStepOn(state) && state.keptVolume === null;

/** An iPad with no entry is at the start of its volume step. */
const ownSound = (state: ShellState, deviceId: string): DeviceSound =>
  state.sound[deviceId] ?? { phase: "levels", played: null, pending: null };

/**
 * A volume press. Returns true when the tower must play Dungeon Complete at it. If the link is
 * down no sound can play, so the press counts as played right away. No iPad plays sound.
 */
export const pressVolume = (state: ShellState, deviceId: string, level: number): boolean => {
  const own = ownSound(state, deviceId);
  if (!volumeStepOn(state) || own.phase !== "levels" || own.pending !== null) return false;
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
  const own = ownSound(state, deviceId);
  if (own.phase !== "levels" || own.pending !== level) return;
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
  const own = ownSound(state, deviceId);
  if (!volumeStepOn(state) || own.phase !== "levels" || own.pending !== null) return;
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
  if (!volumeStepOn(state)) return [];
  const actions: ViewAction[] = [];
  for (const deviceId of state.devices) {
    const own = ownSound(state, deviceId);
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
