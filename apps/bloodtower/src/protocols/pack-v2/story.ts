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
import { coverSchema } from "./metadata.ts";
import { endingsSchema, plainSceneSchema, questPlaceSchema, sceneItemSchema } from "./scenes.ts";

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
  /** Omitted by a plain-scene quest (C3-19); lint requires a `scene` then. */
  quest_type: questTypeIdSchema.optional(),
  label: z.string().min(1).max(120).optional(),
  when: conditionSchema.optional(),
  /** The space it stands on and whether that is a village or the wild (C3-18, DEC-662). */
  place: questPlaceSchema.optional(),
  /** The plain scene that is this quest's one step (MEC-077), by id in `scenes`. */
  scene: idSchema.optional(),
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

/** Physical setup steps the pack adds after the engine seals-and-skulls step. */
const setupStepSchema = z.strictObject({
  id: idSchema,
  label: z.string().min(1).max(200),
});

const ENGINE_SETUP_STEP_ID = "seals-and-skulls";

export const storyPackSchema = z
  .strictObject({
    format: z.literal(2),
    kind: z.literal("story"),
    pack_id: idSchema,
    title: z.string().min(1).max(120),
    cover: coverSchema.optional(),
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
    setup: z.array(setupStepSchema).max(16).default([]),
    game: z
      .strictObject({
        start: entryPointSchema.optional(),
        end: entryPointSchema.optional(),
      })
      .default({}),
    chapters: z.array(chapterSchema).min(1),
    /** Plain scenes (MEC-077) that quests name (C3-18). Absent in a pack that has none. */
    scenes: z.array(plainSceneSchema).optional(),
    /** Quest items, each with the quest and option that gives it (DEC-653, C3-18). */
    items: z.array(sceneItemSchema).optional(),
    /** Win lines by flag (DEC-664) and one loss scene per way to lose (DEC-043). */
    endings: endingsSchema.optional(),
    assets: z
      .array(
        z
          .strictObject({
            id: assetIdSchema,
            type: z.enum(["still", "portrait", "line", "music", "ambient", "sfx", "clip"]),
            target: z.enum(["storyboard", "ipad", "phone"]),
            status: z.enum(["placeholder", "draft", "final"]),
            path: z.string().optional(),
            /** A `line` row only: who speaks it and its fixed text, for `assets:needs` (D48). */
            speaker: idSchema.optional(),
            text: z.string().min(1).max(2000).optional(),
          })
          .superRefine((row, ctx) => {
            if (row.type !== "line" && (row.speaker !== undefined || row.text !== undefined)) {
              ctx.addIssue({
                code: "custom",
                message: "P2-1: speaker and text belong on a line asset only.",
              });
            }
            if ((row.speaker === undefined) !== (row.text === undefined)) {
              ctx.addIssue({
                code: "custom",
                message: "P2-1: a line asset names both speaker and text, or neither.",
              });
            }
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
    const setupIds = pack.setup.map((step) => step.id);
    if (new Set(setupIds).size !== setupIds.length) {
      ctx.addIssue({ code: "custom", message: "P2-1: each setup step id is unique." });
    }
    if (setupIds.includes(ENGINE_SETUP_STEP_ID)) {
      ctx.addIssue({
        code: "custom",
        message: "P2-1: seals-and-skulls is an engine setup step, not a pack step.",
      });
    }
  });

export type StoryPack = z.infer<typeof storyPackSchema>;
