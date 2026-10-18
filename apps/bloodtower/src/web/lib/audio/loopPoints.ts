/**
 * Loop points for the seamless loops (delivery note: shell-audio-and-covers, "Loop points").
 * Each loop is encoded with a hidden 12 s pre-roll and an MP4 edit list. Browsers differ in
 * whether they apply the edit list, so the decoded length says which case we are in.
 */

export const SAMPLE_RATE = 48_000;

/** The hidden pre-roll: 577,024 frames (12.021333 s). */
export const PRE_ROLL_FRAMES = 577_024;

/** The decoded length when the decoder ignored the edit list: the loop, the pre-roll and some padding. */
export const IGNORED_EDIT_LIST_FRAMES = 582_000;

/** Slack for the few hundred padding frames a decoder may add. */
export const PADDING_TOLERANCE_FRAMES = 8_192;

export interface LoopPoints {
  /** Seconds into the buffer where the loop starts and ends. */
  loopStart: number;
  loopEnd: number;
  /** Where playback starts (0 when the edit list was applied, the pre-roll end when it was not). */
  startAt: number;
}

/**
 * Picks the loop points for a decoded loop of `loopFrames` (N) frames.
 * Returns null when the decoded length is neither case, so the caller plays the loop without
 * looping rather than guessing at a seam.
 */
export const loopPointsFor = (decodedFrames: number, loopFrames: number): LoopPoints | null => {
  const loopSeconds = loopFrames / SAMPLE_RATE;
  const withEditList =
    decodedFrames >= loopFrames && decodedFrames - loopFrames <= PADDING_TOLERANCE_FRAMES;
  if (withEditList) {
    return { loopStart: 0, loopEnd: loopSeconds, startAt: 0 };
  }
  const ignoredLength = loopFrames + IGNORED_EDIT_LIST_FRAMES;
  if (Math.abs(decodedFrames - ignoredLength) <= PADDING_TOLERANCE_FRAMES) {
    const loopStart = PRE_ROLL_FRAMES / SAMPLE_RATE;
    return { loopStart, loopEnd: loopStart + loopSeconds, startAt: loopStart };
  }
  return null;
};
