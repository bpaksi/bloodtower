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

const percentSchema = z.number().int().min(0).max(100);
const intSchema = z.number().int();
const positiveIntSchema = z.number().int().positive();
const diceSchema = z.string().regex(/^\d*d\d+$/, {
  message: "P2-1: dice look like 2d3 or d4.",
});
const fractionSchema = z.strictObject({
  n: positiveIntSchema,
  d: positiveIntSchema,
});
const heroRowSchema = z.strictObject({
  fight: intSchema,
  hit_points: positiveIntSchema,
});
const rangeSchema = z.strictObject({
  min: positiveIntSchema,
  max: positiveIntSchema,
});

/**
 * DEC-703's tables. Values are data, not literals, so a playtest can change a
 * placeholder without a schema edit (DEC-500, DEC-131).
 */
export const tuningSchema = z
  .strictObject({
    c3_end_after_chapter_1: z.boolean(),
    fight_enabled: z.boolean(),
    setup: z.strictObject({
      purse_wheel: z.strictObject({
        sides: z.array(positiveIntSchema).length(4),
        floor: positiveIntSchema,
      }),
      difficulty: z.strictObject({
        easy: z.strictObject({
          foe_level: intSchema,
          purse_percent: intSchema,
          full_hit_points: positiveIntSchema,
        }),
        hard: z.strictObject({
          foe_level: intSchema,
          purse_percent: intSchema,
          purse_round: z.literal("down"),
        }),
      }),
      foe_level_by_chapter: z.strictObject({
        chapter_1: positiveIntSchema,
        per_chapter: intSchema,
      }),
      skull_supply: positiveIntSchema,
    }),
    day: z.strictObject({
      move_roll: z.strictObject({
        dice: diceSchema,
        floor: z.number().int().nonnegative(),
      }),
      shifts: z.strictObject({
        per_helping_virtue: intSchema,
        per_corruption: intSchema,
      }),
      event_chance: z.strictObject({
        short: percentSchema,
        standard: percentSchema,
      }),
      event_weights: z.strictObject({
        quiet: percentSchema,
        windfall: percentSchema,
        hazard: percentSchema,
        foes: percentSchema,
        disaster: percentSchema,
        people: percentSchema,
      }),
      hazard: z.strictObject({ hit_points: intSchema }),
      windfall: z.strictObject({ gold: intSchema }),
      go_around: z.strictObject({
        hit_points: intSchema,
        minimum: positiveIntSchema,
      }),
    }),
    skulls: z.strictObject({
      supply: positiveIntSchema,
      drops_a_night: z.strictObject({
        heroes_1_to_2: positiveIntSchema,
        heroes_3_to_4: z.strictObject({
          each_night: positiveIntSchema,
          every_other_night: positiveIntSchema,
        }),
      }),
      quest_won_suppresses_drop: z.boolean(),
      simulated_drop: z.strictObject({
        skulls: positiveIntSchema,
        kingdom_die: diceSchema,
      }),
      tower_drop: z
        .array(
          z.strictObject({
            count: z.number().int().nonnegative(),
            percent: percentSchema,
          }),
        )
        .length(3),
      seal_break: z.strictObject({
        min: z.number().int().nonnegative(),
        max: z.literal("held"),
      }),
    }),
    battle: z.strictObject({
      foe_count: z.strictObject({
        per_level: positiveIntSchema,
        per_extra_hero: positiveIntSchema,
      }),
      round_odds: z.strictObject({
        min_percent: percentSchema,
        max_percent: percentSchema,
        heroes_divisor: positiveIntSchema,
      }),
      won_round: z.strictObject({
        fraction: z.literal("half"),
        round: z.literal("up"),
        minimum: positiveIntSchema,
      }),
      lost_round: z.strictObject({
        heroes: positiveIntSchema,
        hit_points: z.literal("foe_level"),
      }),
      trait_extra_hit_points: positiveIntSchema,
      step_up: z.strictObject({
        chance: fractionSchema,
        level: positiveIntSchema,
      }),
      hex: z.strictObject({
        target: z.literal("random_attacking_hero"),
        min_group: positiveIntSchema,
      }),
      shield_wall: z.strictObject({
        cut_less: positiveIntSchema,
        small_group_max_heroes: positiveIntSchema,
        small_group_minimum_cut: positiveIntSchema,
      }),
      automatic_advantage: z.strictObject({
        per_match: positiveIntSchema,
        max: positiveIntSchema,
      }),
      potion_hit_points: positiveIntSchema,
    }),
    heroes: z.strictObject({
      fighter: heroRowSchema,
      ranger: heroRowSchema,
      scout: heroRowSchema,
      healer: heroRowSchema,
      magic_user: heroRowSchema,
      bard: heroRowSchema,
      solo: z.strictObject({
        fight: intSchema,
        hit_points: intSchema,
      }),
    }),
    spells: z.strictObject({
      magic_missile: intSchema,
      lightning: intSchema,
      fireball: z.strictObject({
        fraction: z.literal("half"),
        round: z.literal("down"),
      }),
      mend: intSchema,
      silver_tongue: z.strictObject({
        off: z.literal("quarter"),
      }),
    }),
    gold: z.strictObject({
      won_battle: z.strictObject({
        per_level: positiveIntSchema,
        disaster: z.literal("double"),
      }),
      won_quest: intSchema,
      lost_on_fall: z.strictObject({
        per_level: positiveIntSchema,
        split: z.boolean(),
        capped: z.boolean(),
      }),
      citadel_rally: z.strictObject({
        gold: intSchema,
        moves: positiveIntSchema,
        heal: z.literal("full"),
      }),
      sanctuary_cure: z.strictObject({
        gold: intSchema,
        moves: positiveIntSchema,
        corruption: positiveIntSchema,
        first_each_chapter: z.literal("free"),
      }),
      tavern_rest: z.strictObject({
        hit_points: intSchema,
      }),
      virtue_draw: intSchema,
    }),
    tomb: z.strictObject({
      rooms: z.strictObject({
        short: rangeSchema,
        standard: rangeSchema,
        guardian_included: z.boolean(),
      }),
      deal: z.strictObject({
        nothing: percentSchema,
        battle: percentSchema,
        trap: percentSchema,
        at_least_battle: positiveIntSchema,
        at_least_trap: positiveIntSchema,
      }),
      guardian: z.strictObject({
        level_up: positiveIntSchema,
      }),
    }),
    tower: z.strictObject({
      rooms: z.strictObject({
        kinds: z.tuple([z.literal("guard"), z.literal("trap"), z.literal("shrine")]),
        each: fractionSchema,
        third: z.literal("stair_guard"),
      }),
      guard: z.strictObject({
        level_offset: intSchema,
      }),
      shrine: z.strictObject({
        hit_points: intSchema,
        once: z.boolean(),
      }),
      trap: z.strictObject({
        hit_points: intSchema,
      }),
      warden: z.strictObject({
        level: positiveIntSchema,
        counts_as: z.literal("any_foe"),
      }),
    }),
  })
  .superRefine((tuning, ctx) => {
    const weights = tuning.day.event_weights;
    const weightSum =
      weights.quiet +
      weights.windfall +
      weights.hazard +
      weights.foes +
      weights.disaster +
      weights.people;
    if (weightSum !== 100) {
      ctx.addIssue({
        code: "custom",
        path: ["day", "event_weights"],
        message: "P2-1: event weights add up to 100 (DEC-022).",
      });
    }
    const dropSum = tuning.skulls.tower_drop.reduce((sum, row) => sum + row.percent, 0);
    if (dropSum !== 100) {
      ctx.addIssue({
        code: "custom",
        path: ["skulls", "tower_drop"],
        message: "P2-1: tower drop chances add up to 100 (DEC-064).",
      });
    }
    const deal = tuning.tomb.deal;
    if (deal.nothing + deal.battle + deal.trap !== 100) {
      ctx.addIssue({
        code: "custom",
        path: ["tomb", "deal"],
        message: "P2-1: tomb deal chances add up to 100 (DEC-604).",
      });
    }
  });

export type Tuning = z.infer<typeof tuningSchema>;

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
    /** DEC-703. The loader requires this file on a base pack; schema fixtures may omit it. */
    tuning: tuningSchema.optional(),
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
