import { requestTowerCommand, shellState } from "../session/shellRef.ts";

/** CUE-006 / DEC-108: one short sound when the day's move rolls are applied. Index TBD on Bob's sound feel notes. */
export const MOVE_ROLL_CUE_SOUND_INDEX = 1;

/** Default play volume tier until GAP-HW-003 is settled (matches balance tier in volume test). */
export const MOVE_ROLL_CUE_VOLUME = 2;

export const requestMoveRollCue = (): void => {
  if (!shellState().towerLinked) return;
  requestTowerCommand("sound.play-stateful", {
    soundIndex: MOVE_ROLL_CUE_SOUND_INDEX,
    volume: MOVE_ROLL_CUE_VOLUME,
  });
};
