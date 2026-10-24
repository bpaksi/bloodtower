import { z } from "zod";
import { optionIdSchema } from "./control.ts";
import { towerModeSchema } from "./pack.ts";

const coverUrlSchema = z
  .string()
  .max(300)
  .regex(/^\/packs\/[^/]+\/assets\/[^/]+$/)
  .nullable();

/**
 * One card in the Pick Game carousel. `loadable` means the card can be chosen.
 * `playable` is false for a `playable: false` pack: it can be chosen and stops at "Not playable yet".
 */
export const storyCardSchema = z.strictObject({
  id: optionIdSchema,
  title: z.string().min(1).max(120),
  blurb: z.string().min(1).max(200).nullable(),
  tagline: z.string().min(1).max(200).nullable(),
  cover: coverUrlSchema,
  players: z
    .strictObject({ min: z.number().int().min(1), max: z.number().int().min(1) })
    .nullable(),
  playable: z.boolean(),
  loadable: z.boolean(),
  /** The pack's `tower` field. Null only on a card whose manifest did not load. */
  tower: towerModeSchema.nullable(),
});
export type StoryCard = z.infer<typeof storyCardSchema>;
