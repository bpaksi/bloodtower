// Review feel on the Sounds page (M6 step 6.2, spec D25): timing a sound with Bob's presses, and
// which sounds he has reviewed. Pure functions, so they can be tested without a socket or React.
import {
  type CommandLifecyclePayload,
  SOUND_FEEL_FIELDS,
  SOUND_LENGTH_MAX_MS,
  type SoundFeelRow,
} from "@dark-tower/tower";

/**
 * One play being timed. `pressedAt` is Bob's Play press; `answeredAt` is when this page received
 * the play's `confirmed`, the tower's answer as the sound starts. Both are this page's clock.
 */
export interface PlayTiming {
  index: number;
  commandId: string;
  pressedAt: number;
  answeredAt?: number;
}

/** Stages after which no sound played: the service refused the play, or it failed. */
const NO_SOUND = new Set<string>(["rejected", "failed"]);

/**
 * Follows a timed play's lifecycle: notes when the tower answered, and ends the timing (undefined)
 * when no sound played. A play that ends `indeterminate` may have sounded, so it stays timed.
 */
export const followPlay = (
  timing: PlayTiming | undefined,
  stages: readonly CommandLifecyclePayload[] | undefined,
  now: number,
): PlayTiming | undefined => {
  if (!timing || !stages) return timing;
  if (stages.some((stage) => NO_SOUND.has(stage.stage))) return undefined;
  if (timing.answeredAt === undefined && stages.some((stage) => stage.stage === "confirmed")) {
    return { ...timing, answeredAt: now };
  }
  return timing;
};

export type Measured =
  | { ok: true; lengthMs: number; answerLengthMs: number | null }
  | { ok: false; reason: string };

/** The two lengths of one Stopped press, both from the same play (Bob, 2026-10-21). */
export const measure = (timing: PlayTiming, stoppedAt: number): Measured => {
  const lengthMs = Math.round(stoppedAt - timing.pressedAt);
  if (lengthMs > SOUND_LENGTH_MAX_MS) {
    return { ok: false, reason: "Longer than a minute, so it was not recorded. Play it again." };
  }
  const fromAnswer =
    timing.answeredAt === undefined ? null : Math.round(stoppedAt - timing.answeredAt);
  // A press within a millisecond of the start counts as 1 ms; a length is never 0.
  return {
    ok: true,
    lengthMs: Math.max(1, lengthMs),
    // No answer before the press: only the length from Play is known, and an older one is cleared.
    answerLengthMs: fromAnswer === null ? null : Math.max(1, fromAnswer),
  };
};

/** Whether a sound has any feel recorded. */
export const hasFeel = (row: SoundFeelRow | undefined) =>
  row !== undefined && SOUND_FEEL_FIELDS.some((field) => row[field] !== null);

/** The saved rows by sound index. */
export const feelByIndex = (rows: readonly SoundFeelRow[] | undefined) =>
  new Map((rows ?? []).map((row) => [row.index, row]));

/**
 * The sounds to list. With "not yet reviewed" on, a sound with a feel is left out, except the one
 * being reviewed now, so it does not vanish after its first pick while Bob makes the others.
 */
export const reviewFilter = <T extends { index: number }>(
  sounds: readonly T[],
  feel: Map<number, SoundFeelRow>,
  onlyUnreviewed: boolean,
  current: number | undefined,
) =>
  onlyUnreviewed
    ? sounds.filter((sound) => sound.index === current || !hasFeel(feel.get(sound.index)))
    : [...sounds];

/**
 * "2.3 s" for a measured length, "40 ms" under a second so a short one never reads as 0; undefined
 * when it was not measured.
 */
export const lengthLabel = (ms: number | null | undefined) => {
  if (ms === null || ms === undefined) return undefined;
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
};
