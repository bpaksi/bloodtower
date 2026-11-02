import { requestTowerCommand, shellState } from "../session/shellRef.ts";
import { DEFAULT_TOWER_VOLUME } from "../session/sound.ts";

/** CUE-006 / DEC-108: one short sound when the day's move rolls are applied. Index TBD on Bob's sound feel notes. */
export const MOVE_ROLL_CUE_SOUND_INDEX = 1;

/** The move-roll cue plays at the volume an iPad kept on Pick story (EV-09). */
export const requestMoveRollCue = (): void => {
  const shell = shellState();
  if (!shell.towerLinked) return;
  requestTowerCommand("sound.play-stateful", {
    soundIndex: MOVE_ROLL_CUE_SOUND_INDEX,
    volume: shell.keptVolume ?? DEFAULT_TOWER_VOLUME,
  });
};
