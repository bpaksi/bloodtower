import { z } from "zod";
import { assetIdSchema, idSchema } from "./ids.ts";

/** Fixed story effects (D34, DEC-139). */
export const EFFECT_KINDS = [
  "narrate",
  "place-token",
  "remove-token",
  "open-lead",
  "set-flag",
  "clear-flag",
  "add-counter",
] as const;

export const effectKindSchema = z.enum(EFFECT_KINDS);

const narrateLineSchema = z.strictObject({
  speaker: idSchema,
  text: z.string().min(1).max(2000),
  voice: assetIdSchema.optional(),
});

export const narrateEffectSchema = z.strictObject({
  kind: z.literal("narrate"),
  target: z.enum(["storyboard", "ipad:all"]).default("storyboard"),
  cue: idSchema.optional(),
  lines: z.array(narrateLineSchema).min(1).max(8),
});

export const placeTokenEffectSchema = z.strictObject({
  kind: z.literal("place-token"),
  token: idSchema,
  space: idSchema.optional(),
});

export const removeTokenEffectSchema = z.strictObject({
  kind: z.literal("remove-token"),
  token: idSchema,
});

export const openLeadEffectSchema = z.strictObject({
  kind: z.literal("open-lead"),
  lead: idSchema,
});

export const setFlagEffectSchema = z.strictObject({
  kind: z.literal("set-flag"),
  flag: idSchema,
});

export const clearFlagEffectSchema = z.strictObject({
  kind: z.literal("clear-flag"),
  flag: idSchema,
});

export const addCounterEffectSchema = z.strictObject({
  kind: z.literal("add-counter"),
  counter: idSchema,
  amount: z.number().int(),
});

export const effectSchema = z.discriminatedUnion("kind", [
  narrateEffectSchema,
  placeTokenEffectSchema,
  removeTokenEffectSchema,
  openLeadEffectSchema,
  setFlagEffectSchema,
  clearFlagEffectSchema,
  addCounterEffectSchema,
]);

export type PackEffect = z.infer<typeof effectSchema>;
