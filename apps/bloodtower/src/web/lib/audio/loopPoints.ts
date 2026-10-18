/**
 * Loop points for the seamless loops (delivery note: shell-audio-and-covers, "Loop points").
 * Each loop is encoded with a hidden 12 s pre-roll and an MP4 edit list. Browsers differ in
 * whether they apply the edit list, so the decoded length says which case we are in.
 * The frame counts below are at 48 kHz. `decodeAudioData` resamples to the context's rate
 * (often 44.1 kHz), so the check scales them to the rate the buffer was decoded at.
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
 * Picks the loop points for a loop of `loopFrames` (N, at 48 kHz) decoded to `decodedFrames`
 * at `decodedRate`. Returns null when the decoded length is neither case, so the caller plays
 * the loop without looping rather than guessing at a seam.
 */
export const loopPointsFor = (
  decodedFrames: number,
  loopFrames: number,
  decodedRate: number = SAMPLE_RATE,
): LoopPoints | null => {
  const scale = decodedRate / SAMPLE_RATE;
  const loop = loopFrames * scale;
  const tolerance = PADDING_TOLERANCE_FRAMES * scale;
  const loopSeconds = loopFrames / SAMPLE_RATE;
  const withEditList = decodedFrames >= loop - 1 && decodedFrames - loop <= tolerance;
  if (withEditList) {
    return { loopStart: 0, loopEnd: loopSeconds, startAt: 0 };
  }
  const ignoredLength = (loopFrames + IGNORED_EDIT_LIST_FRAMES) * scale;
  if (Math.abs(decodedFrames - ignoredLength) <= tolerance) {
    const loopStart = PRE_ROLL_FRAMES / SAMPLE_RATE;
    return { loopStart, loopEnd: loopStart + loopSeconds, startAt: loopStart };
  }
  return null;
};
