import { z } from "zod";
import { VOLUME_NOTE_MAX, volumeAnswerSchema } from "./control.ts";
import { utcTimestampSchema } from "./devices.ts";

export const VOLUME_PHASES = [
  "idle",
  "levels",
  "balance-bed",
  "balance-tower",
  "asking",
  "answered",
] as const;

export const volumeTestSchema = z
  .strictObject({
    mode: z.enum(["tower", "room"]),
    phase: z.enum(VOLUME_PHASES),
    level: z.number().int().min(0).max(2).nullable(),
    runs: z.number().int().min(0).max(99),
    failed: z.boolean(),
    answer: volumeAnswerSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    if ((value.level !== null) !== (value.phase === "levels")) {
      ctx.addIssue({ code: "custom", message: "A level is set only while the levels play." });
    }
    if ((value.answer !== null) !== (value.phase === "answered")) {
      ctx.addIssue({ code: "custom", message: "An answer is set only once answered." });
    }
  });
export type VolumeTest = z.infer<typeof volumeTestSchema>;

/** What the stat holds, for the board's debug overlay only. */
export const volumeTestLoggedSchema = z.strictObject({
  answer: volumeAnswerSchema,
  note: z.string().max(VOLUME_NOTE_MAX).nullable(),
  firmware: z.string().min(1).max(200).nullable(),
  at: utcTimestampSchema,
});
