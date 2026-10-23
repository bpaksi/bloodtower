import { z } from "zod";
import { soundIndexSchema } from "./inventory.ts";

// The sound feel record (M6, spec D25): how each tower sound came across when Bob played it. A
// person's account, saved by the service; nothing here reaches the tower.

/** The game design's words (game-workbench plan, step 7). Its card lint checks the same lists. */
export const SOUND_MOODS = [
  "dread",
  "tension",
  "wonder",
  "triumph",
  "loss",
  "calm",
  "comic",
  "mystery",
  "menace",
] as const;
export const SOUND_READS_AS = [
  "threat",
  "alert",
  "reward",
  "failure",
  "arrival",
  "magic",
  "voice",
  "transition",
] as const;
export const SOUND_STRENGTHS = ["soft", "medium", "strong"] as const;

export const soundMoodSchema = z.enum(SOUND_MOODS);
export const soundReadsAsSchema = z.enum(SOUND_READS_AS);
export const soundStrengthSchema = z.enum(SOUND_STRENGTHS);

/** A measured length: a whole number of milliseconds, no longer than a minute. */
export const SOUND_LENGTH_MAX_MS = 60_000;
export const soundLengthSchema = z.int().min(1).max(SOUND_LENGTH_MAX_MS);

/** The most a note may hold: a few words of Bob's own. */
export const SOUND_NOTE_MAX = 500;

/**
 * Payload of `soundFeel.record`. A field left out keeps its saved value; `null` clears it.
 * `lengthMs` runs from the Play press and `answerLengthMs` from the tower's answer, each to the
 * Stopped press, both from one play (Bob, 2026-10-21).
 */
export const soundFeelRecordPayloadSchema = z.strictObject({
  index: soundIndexSchema,
  mood: soundMoodSchema.nullable().optional(),
  readsAs: soundReadsAsSchema.nullable().optional(),
  strength: soundStrengthSchema.nullable().optional(),
  lengthMs: soundLengthSchema.nullable().optional(),
  answerLengthMs: soundLengthSchema.nullable().optional(),
  note: z.string().max(SOUND_NOTE_MAX).nullable().optional(),
});
export type SoundFeelRecordPayload = z.infer<typeof soundFeelRecordPayloadSchema>;

/** The feel fields a record may set, in the order the export writes them. */
export const SOUND_FEEL_FIELDS = [
  "lengthMs",
  "answerLengthMs",
  "mood",
  "readsAs",
  "strength",
  "note",
] as const;

/** One row of the `sound_feel` table, as the service sends it. A field never recorded is null. */
export const soundFeelRowSchema = z.strictObject({
  index: soundIndexSchema,
  mood: soundMoodSchema.nullable(),
  readsAs: soundReadsAsSchema.nullable(),
  strength: soundStrengthSchema.nullable(),
  lengthMs: soundLengthSchema.nullable(),
  answerLengthMs: soundLengthSchema.nullable(),
  note: z.string().max(SOUND_NOTE_MAX).nullable(),
  /** Milliseconds since the epoch. */
  updatedAt: z.int().nonnegative(),
  /** The recording client's `hello` label. */
  client: z.string().min(1).max(64),
});
export type SoundFeelRow = z.infer<typeof soundFeelRowSchema>;

/** Payload of `soundFeel.changed`, sent to every client when a feel is saved. */
export const soundFeelChangedPayloadSchema = z.strictObject({ row: soundFeelRowSchema });

/** One sound in `sound-feel.json`. A field never recorded is left out, never 0 or "". */
export const soundFeelExportEntrySchema = z.strictObject({
  /** `SND-` and the tower index in three digits, the game design's card ID. */
  id: z.string().regex(/^SND-\d{3}$/),
  index: soundIndexSchema,
  lengthMs: soundLengthSchema.optional(),
  answerLengthMs: soundLengthSchema.optional(),
  mood: soundMoodSchema.optional(),
  readsAs: soundReadsAsSchema.optional(),
  strength: soundStrengthSchema.optional(),
  note: z.string().min(1).max(SOUND_NOTE_MAX).optional(),
});

/** `GET /api/sound-feel.json` (spec §3.3). */
export const soundFeelExportSchema = z.strictObject({
  version: z.literal(1),
  sounds: z.array(soundFeelExportEntrySchema),
});
export type SoundFeelExport = z.infer<typeof soundFeelExportSchema>;

/** The game design's card ID for a tower sound: `SND-` and the index in three digits. */
export const soundCardId = (index: number) => `SND-${String(index).padStart(3, "0")}`;

/** The export of the saved rows, by index. A row with nothing recorded is left out. */
export const buildSoundFeelExport = (rows: readonly SoundFeelRow[]): SoundFeelExport => ({
  version: 1,
  sounds: [...rows]
    .sort((a, b) => a.index - b.index)
    .map((row) => {
      const entry: Record<string, unknown> = { id: soundCardId(row.index), index: row.index };
      for (const field of SOUND_FEEL_FIELDS) {
        const value = row[field];
        if (value !== null && value !== "") entry[field] = value;
      }
      return soundFeelExportEntrySchema.parse(entry);
    })
    .filter((entry) => SOUND_FEEL_FIELDS.some((field) => entry[field] !== undefined)),
});
