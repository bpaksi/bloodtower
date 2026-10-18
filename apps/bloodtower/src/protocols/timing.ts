import { z } from "zod";
import { deviceIdSchema, hunterIdSchema, utcTimestampSchema } from "./devices.ts";

/**
 * PRD-41 timing rows, the same shape the funeral POC records, so one report can compare both.
 * Monotonic time is milliseconds from session start. Wall time is UTC, for display.
 * An open row has a null end. Unknown is null, never zero.
 * Pauses are excluded from active time.
 * `setting` is Bloodtower's own kind, not PRD-41: one closed mark per game setting chosen,
 * written at Begin when the settings lock (R-WIZ-12). The subject is `<setting>:<option>`.
 */

export const TIMING_KINDS = [
  "phase",
  "moment",
  "pick",
  "table-talk",
  "battle-screen",
  "cue",
  "pause",
  "setting",
] as const;
export const timingKindSchema = z.enum(TIMING_KINDS);
export type TimingKind = z.infer<typeof timingKindSchema>;

/** PRD-41 pause causes: unheld hunter, host pause, disconnect. */
export const PAUSE_CAUSES = ["unheld-hunter", "host-pause", "disconnect"] as const;
export const pauseCauseSchema = z.enum(PAUSE_CAUSES);
export type PauseCause = z.infer<typeof pauseCauseSchema>;

export const BATTLE_RESULTS = ["won", "lost"] as const;
export const battleResultSchema = z.enum(BATTLE_RESULTS);

const monoMs = z.number().refine((value) => Number.isFinite(value) && value >= 0, {
  message: "Expected a finite monotonic millisecond offset.",
});

const issue = (ctx: z.RefinementCtx, message: string) => {
  ctx.addIssue({ code: "custom", message });
};

export const timingMarkSchema = z
  .strictObject({
    sessionId: z.string().min(1).max(64),
    kind: timingKindSchema,
    subject: z.string().min(1).max(120),
    startMonoMs: monoMs,
    endMonoMs: monoMs.nullable(),
    startWall: utcTimestampSchema,
    endWall: utcTimestampSchema.nullable(),
    deviceId: deviceIdSchema.nullable(),
    cause: pauseCauseSchema.nullable(),
    hunter: hunterIdSchema.nullable(),
    result: battleResultSchema.nullable(),
  })
  .superRefine((mark, ctx) => {
    const closed = mark.endMonoMs !== null;
    if (closed !== (mark.endWall !== null)) {
      issue(ctx, "A mark closes its monotonic and wall ends together.");
    }
    if (mark.endMonoMs !== null && mark.endMonoMs < mark.startMonoMs) {
      issue(ctx, "A mark does not end before it starts.");
    }

    if (mark.kind === "pause") {
      if (!mark.cause) issue(ctx, "A pause mark names its cause.");
      if (mark.result) issue(ctx, "A pause mark has no battle result.");
      if (mark.cause === "host-pause" && mark.hunter) {
        issue(ctx, "A host pause does not name a hunter.");
      }
      if ((mark.cause === "unheld-hunter" || mark.cause === "disconnect") && !mark.hunter) {
        issue(ctx, "An unheld or disconnect pause names the hunter.");
      }
      return;
    }

    if (mark.cause) issue(ctx, "Only a pause mark has a cause.");
    if (mark.kind === "pick") {
      if (!mark.hunter) issue(ctx, "A pick mark names the hunter.");
      if (mark.result) issue(ctx, "A pick mark has no battle result.");
      return;
    }
    if (mark.hunter) issue(ctx, "Only a pick or a pause names a hunter.");
    if (mark.kind === "battle-screen") {
      if (closed && !mark.result) issue(ctx, "A closed battle screen names won or lost.");
      if (!closed && mark.result) issue(ctx, "An open battle screen has no result yet.");
      return;
    }
    if (mark.result) issue(ctx, "Only a battle screen has a result.");
  });
export type TimingMark = z.infer<typeof timingMarkSchema>;

/** Closed length, or null while the mark is still open. */
export const spanMillis = (mark: TimingMark): number | null =>
  mark.endMonoMs === null ? null : mark.endMonoMs - mark.startMonoMs;

/**
 * Merged pause length. Overlapping pauses count once.
 * Null when any pause is still open: the paused total is unknown, not zero.
 */
export const pausedMillis = (marks: readonly TimingMark[]): number | null => {
  const pauses = marks.filter((mark) => mark.kind === "pause");
  if (pauses.some((mark) => mark.endMonoMs === null)) return null;
  const intervals = pauses
    .map((mark) => [mark.startMonoMs, mark.endMonoMs ?? mark.startMonoMs] as const)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let coveredUntil = 0;
  let started = false;
  for (const [start, end] of intervals) {
    if (!started) {
      total += end - start;
      coveredUntil = end;
      started = true;
      continue;
    }
    if (end <= coveredUntil) continue;
    total += end - Math.max(start, coveredUntil);
    coveredUntil = end;
  }
  return total;
};

/**
 * Active time is total session time minus merged pauses.
 * Null when a pause is open, or when the total is shorter than the pauses
 * (the rows disagree, so the figure is unknown rather than clamped to zero).
 */
export const activeMillis = (totalMillis: number, marks: readonly TimingMark[]): number | null => {
  if (!Number.isFinite(totalMillis) || totalMillis < 0) return null;
  const paused = pausedMillis(marks);
  if (paused === null || totalMillis < paused) return null;
  return totalMillis - paused;
};
