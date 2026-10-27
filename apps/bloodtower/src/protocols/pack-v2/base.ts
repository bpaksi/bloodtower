import { z } from "zod";
import {
  assetIdSchema,
  buildingTypeIdSchema,
  heroIdSchema,
  heroRoleSchema,
  idSchema,
  kingdomIdSchema,
  questTypeIdSchema,
  semverSchema,
  spaceIdSchema,
  terrainSchema,
} from "./ids.ts";

const kingdomSchema = z.strictObject({
  id: kingdomIdSchema,
  name: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
});

const regionIdSchema = z.string().regex(/^REG-\d{2,}$/, {
  message: "P2-1: a region id is REG- and a number (DEC-243).",
});

const regionLabelSchema = z.strictObject({
  /** A region a space can point at (DEC-242). A label with no id is a name on the board only. */
  id: regionIdSchema.optional(),
  name: z.string().min(1).max(120),
  notes: z.string().max(500).optional(),
});

const neighbourSchema = z.strictObject({
  to: spaceIdSchema,
  slot: z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]).nullable().optional(),
});

const spaceSchema = z.strictObject({
  id: spaceIdSchema,
  name: z.string().min(1).max(120),
  kingdom: kingdomIdSchema,
  terrain: terrainSchema,
  building: buildingTypeIdSchema.optional(),
  tower_adjacent: z.boolean().optional(),
  region: regionIdSchema.optional(),
  adjacent: z.array(spaceIdSchema).default([]),
  neighbours: z.array(neighbourSchema).optional(),
  notes: z.string().max(500).optional(),
});

const riverCrossingSchema = z.strictObject({
  from: spaceIdSchema,
  to: spaceIdSchema,
  notes: z.string().max(500).optional(),
});

const boardSchema = z
  .strictObject({
    kingdoms: z.array(kingdomSchema).length(4),
    region_labels: z.array(regionLabelSchema).default([]),
    spaces: z.array(spaceSchema).min(1),
    river_crossings: z.array(riverCrossingSchema).default([]),
    draft_note: z.string().max(1000).optional(),
  })
  .superRefine((board, ctx) => {
    const kingdoms = new Set(board.kingdoms.map((k) => k.id));
    if (kingdoms.size !== 4) {
      ctx.addIssue({ code: "custom", message: "P2-1: the board lists four kingdoms (DEC-226)." });
    }
    const ids = new Set(board.spaces.map((s) => s.id));
    if (ids.size !== board.spaces.length) {
      ctx.addIssue({ code: "custom", message: "P2-1: each space id is unique." });
    }
    const regionIds = new Set(board.region_labels.flatMap((r) => (r.id ? [r.id] : [])));
    for (const space of board.spaces) {
      if (space.region && !regionIds.has(space.region)) {
        ctx.addIssue({
          code: "custom",
          message: `P2-2: space ${space.id} points at unknown region ${space.region}.`,
        });
      }
      if (!space.id.startsWith(`${space.kingdom}-`)) {
        ctx.addIssue({
          code: "custom",
          message: `P2-1: space ${space.id} kingdom letter must match its id (DEC-225).`,
        });
      }
      const slots = new Set<string>();
      for (const neighbour of space.neighbours ?? []) {
        if (!ids.has(neighbour.to)) {
          ctx.addIssue({
            code: "custom",
            message: `P2-2: space ${space.id} lists unknown neighbour ${neighbour.to}.`,
          });
        }
        if (neighbour.slot) {
          if (slots.has(neighbour.slot)) {
            ctx.addIssue({
              code: "custom",
              message: `P2-3: space ${space.id} gives slot ${neighbour.slot} to two neighbours (DEC-236).`,
            });
          }
          slots.add(neighbour.slot);
        }
      }
      for (const neighbor of space.adjacent) {
        if (!ids.has(neighbor)) {
          ctx.addIssue({
            code: "custom",
            message: `P2-2: space ${space.id} lists unknown neighbor ${neighbor}.`,
          });
        }
      }
    }
    for (const crossing of board.river_crossings) {
      if (!ids.has(crossing.from) || !ids.has(crossing.to)) {
        ctx.addIssue({
          code: "custom",
          message: "P2-2: a river crossing must name declared spaces.",
        });
      }
    }
  });

const heroSchema = z.strictObject({
  id: heroIdSchema,
  name: z.string().min(1).max(80),
  role: heroRoleSchema,
  might: z.number().int().min(1).max(5),
  stealth: z.number().int().min(1).max(5),
  magic: z.number().int().min(1).max(5),
  wits: z.number().int().min(1).max(5),
  ability: z.string().min(1).max(120),
  portrait: assetIdSchema,
  voice: assetIdSchema,
});

const buildingTypeSchema = z.strictObject({
  id: buildingTypeIdSchema,
  name: z.string().min(1).max(80),
});

const questTypeSchema = z.strictObject({
  id: questTypeIdSchema,
  name: z.string().min(1).max(80),
});

export const baseContentPackSchema = z
  .strictObject({
    format: z.literal(2),
    kind: z.literal("base-content"),
    pack_id: idSchema,
    title: z.string().min(1).max(120),
    version: semverSchema,
    engine_min: semverSchema,
    heroes: z.array(heroSchema).min(1),
    building_types: z.array(buildingTypeSchema).min(1),
    quest_types: z.array(questTypeSchema).min(1),
    board: boardSchema,
    assets: z
      .array(
        z.strictObject({
          id: assetIdSchema,
          type: z.enum(["still", "portrait", "line", "music", "ambient", "sfx"]),
          target: z.enum(["storyboard", "ipad", "phone"]),
          status: z.enum(["placeholder", "draft", "final"]),
          path: z.string().optional(),
        }),
      )
      .default([]),
  })
  .superRefine((pack, ctx) => {
    const heroIds = pack.heroes.map((h) => h.id);
    if (new Set(heroIds).size !== heroIds.length) {
      ctx.addIssue({ code: "custom", message: "P2-1: each hero id is unique." });
    }
    const roles = pack.heroes.map((h) => h.role);
    if (new Set(roles).size !== roles.length) {
      ctx.addIssue({ code: "custom", message: "P2-1: each hero role is unique (DEC-100)." });
    }
  });

export type BaseContentPack = z.infer<typeof baseContentPackSchema>;
