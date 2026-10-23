import { z } from "zod";
import { conditionSchema } from "./conditions.ts";
import { effectSchema } from "./effects.ts";
import {
  assetIdSchema,
  idSchema,
  kingdomIdSchema,
  questTypeIdSchema,
  semverSchema,
} from "./ids.ts";

const entryPointSchema = z.strictObject({
  when: conditionSchema.optional(),
  effects: z.array(effectSchema).min(1),
});

const timedBeatSchema = z.strictObject({
  id: idSchema,
  when: conditionSchema,
  effects: z.array(effectSchema).min(1),
});

const questSchema = z.strictObject({
  id: idSchema,
  quest_type: questTypeIdSchema,
  label: z.string().min(1).max(120).optional(),
  when: conditionSchema.optional(),
});

const chapterSchema = z.strictObject({
  id: idSchema,
  index: z.number().int().positive(),
  kingdoms: z.array(kingdomIdSchema).min(1),
  timed_beats: z.array(timedBeatSchema).default([]),
  start: entryPointSchema.optional(),
  end: entryPointSchema.optional(),
  quests: z.array(questSchema).default([]),
});

const settingOptionSchema = z.strictObject({
  id: idSchema,
  label: z.string().min(1).max(80),
});

const settingSchema = z.strictObject({
  id: idSchema,
  label: z.string().min(1).max(80),
  options: z.array(settingOptionSchema).min(1).max(16),
  default: idSchema,
});

const moveRollSchema = z.strictObject({
  dice: z.literal("2d4"),
  floor: z.number().int().min(1).max(8),
  modifiers: z.literal(false),
});

const startAssignmentSchema = z.strictObject({
  hero: idSchema,
  kingdom: kingdomIdSchema,
});

const storyStartSchema = z.strictObject({
  mode: z.literal("one-per-kingdom-citadel"),
  assignments: z.array(startAssignmentSchema).min(1),
});

export const storyPackSchema = z
  .strictObject({
    format: z.literal(2),
    kind: z.literal("story"),
    pack_id: idSchema,
    title: z.string().min(1).max(120),
    version: semverSchema,
    engine_min: semverSchema,
    tagline: z.string().min(1).max(200).optional(),
    base_pack: idSchema,
    playable: z.boolean().default(true),
    players: z.strictObject({
      min: z.number().int().min(1),
      max: z.number().int().min(1),
    }),
    settings: z.array(settingSchema).max(16).default([]),
    day: z.strictObject({
      move_roll: moveRollSchema,
    }),
    start: storyStartSchema,
    game: z
      .strictObject({
        start: entryPointSchema.optional(),
        end: entryPointSchema.optional(),
      })
      .default({}),
    chapters: z.array(chapterSchema).min(1),
    assets: z
      .array(
        z.strictObject({
          id: assetIdSchema,
          type: z.enum(["still", "portrait", "line", "music", "ambient", "sfx", "clip"]),
          target: z.enum(["storyboard", "ipad", "phone"]),
          status: z.enum(["placeholder", "draft", "final"]),
          path: z.string().optional(),
        }),
      )
      .default([]),
  })
  .superRefine((pack, ctx) => {
    if (pack.players.min > pack.players.max) {
      ctx.addIssue({ code: "custom", message: "P2-1: players.min is above players.max." });
    }
    for (const setting of pack.settings) {
      const optionIds = setting.options.map((o) => o.id);
      if (!optionIds.includes(setting.default)) {
        ctx.addIssue({
          code: "custom",
          message: `P2-1: setting ${setting.id} default is not one of its options.`,
        });
      }
    }
    const chapterIds = pack.chapters.map((c) => c.id);
    if (new Set(chapterIds).size !== chapterIds.length) {
      ctx.addIssue({ code: "custom", message: "P2-1: each chapter id is unique." });
    }
  });

export type StoryPack = z.infer<typeof storyPackSchema>;
