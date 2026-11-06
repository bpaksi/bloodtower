import { z } from "zod";
import { idSchema, semverSchema } from "./ids.ts";

/** Cover image: a file directly inside `<pack>/assets/`, the same folder jail as the other assets. */
export const coverSchema = z
  .string()
  .regex(/^assets\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:png|jpe?g|webp)$/i, {
    message: "P2-1: cover is a file directly inside assets/, such as assets/cover.png.",
  });

export const LENGTH_IDS = ["short", "standard", "long"] as const;

export const SETTINGS_MAX = 16;
export const SETTING_OPTIONS_MAX = 16;
/** A setting or option id travels in a `set` press, so it fits the control option id (64). */
export const SETTING_ID_MAX = 64;
export const SETTING_LABEL_MAX = 80;

const settingIdSchema = idSchema.max(SETTING_ID_MAX);
const settingLabelSchema = z.string().min(1).max(SETTING_LABEL_MAX);

/** A game setting the player picks on Game settings. */
export const settingSchema = z.strictObject({
  id: settingIdSchema,
  label: settingLabelSchema,
  options: z
    .array(z.strictObject({ id: settingIdSchema, label: settingLabelSchema }))
    .min(1)
    .max(SETTING_OPTIONS_MAX),
  default: settingIdSchema,
});

/**
 * Whether a story needs the tower. `optional` offers "Play without tower" on Connect Tower,
 * `required` holds Continue until the tower is connected and calibrated, and `none` skips it.
 */
export const TOWER_MODES = ["required", "optional", "none"] as const;
export const towerModeSchema = z.enum(TOWER_MODES);
export type TowerMode = z.infer<typeof towerModeSchema>;

/**
 * The manifest of a `playable: false` pack with no `format`: only the fields Pick story shows.
 * No story content is read or validated (DEC-691).
 */
export const packMetadataSchema = z
  .strictObject({
    pack_id: idSchema,
    title: z.string().min(1).max(120),
    version: semverSchema,
    engine_min: semverSchema,
    tagline: z.string().min(1).max(200).optional(),
    cover: coverSchema.optional(),
    tower: towerModeSchema.default("optional"),
    settings: z.array(settingSchema).max(SETTINGS_MAX).default([]),
    playable: z.literal(false),
  })
  .superRefine((pack, ctx) => {
    const ids = pack.settings.map((setting) => setting.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", message: "P2-1: a setting is listed twice." });
    }
    for (const setting of pack.settings) {
      const optionIds = setting.options.map((option) => option.id);
      if (new Set(optionIds).size !== optionIds.length) {
        ctx.addIssue({
          code: "custom",
          message: `P2-1: setting ${setting.id} lists an option twice.`,
        });
      }
      if (!optionIds.includes(setting.default)) {
        ctx.addIssue({
          code: "custom",
          message: `P2-1: setting ${setting.id} default ${setting.default} is not one of its options.`,
        });
      }
      if (setting.id === "length") {
        for (const id of optionIds) {
          if (!(LENGTH_IDS as readonly string[]).includes(id)) {
            ctx.addIssue({
              code: "custom",
              message: `P2-1: setting length option ${id} is not short, standard or long.`,
            });
          }
        }
      }
    }
  });
export type PackMetadata = z.infer<typeof packMetadataSchema>;
