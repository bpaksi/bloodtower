// The shape of each value the state store publishes, by its inventory id (spec §3.1, M3 step 3.5).
// `state` carries every value as plain JSON; the service checks a value against its schema here
// before it stores it, and a client reads it with the same schema. A value that does not match is
// shown as unavailable, never guessed at.
import { z } from "zod";
import { glyphSchema, sealSchema, towerLevelSchema, towerSideSchema } from "./inventory.ts";

const percentSchema = z.number().min(0).max(100);

/** `battery.level`: the latest reading, with the library's percentage for it. */
export const batteryReadingSchema = z.strictObject({
  millivolts: z.int().nonnegative(),
  percent: percentSchema,
});

/** The battery history keeps a reading at most this often. The tower sends one about every 2 s. */
export const BATTERY_HISTORY_INTERVAL_MS = 30_000;
/** Two hours at one reading per interval. */
export const BATTERY_HISTORY_LIMIT = 240;

/** `battery.on-level`: readings over time, oldest first, for the history chart. */
export const batteryHistorySchema = z
  .array(
    z.strictObject({
      /** When the reading arrived, in milliseconds since the epoch. */
      at: z.int().nonnegative(),
      millivolts: z.int().nonnegative(),
      percent: percentSchema,
    }),
  )
  .max(BATTERY_HISTORY_LIMIT);

/** `mechanics.drum-position`: the side each drum faces, as the library holds it. */
export const drumPositionsSchema = z.strictObject({
  top: towerSideSchema,
  middle: towerSideSchema,
  bottom: towerSideSchema,
});

/** `glyphs.all-positions`: the side each glyph faces. Every glyph is named. */
export const glyphPositionsSchema = z.record(glyphSchema, towerSideSchema);

type Seal = z.infer<typeof sealSchema>;

/** Every seal, in level then side order: the order the record is kept in. */
export const ALL_SEALS: readonly Seal[] = towerLevelSchema.options.flatMap((level) =>
  towerSideSchema.options.map((side) => ({ side, level })),
);

/** A seal's place in `ALL_SEALS`. */
export const sealOrder = (seal: Seal) =>
  towerLevelSchema.options.indexOf(seal.level) * towerSideSchema.options.length +
  towerSideSchema.options.indexOf(seal.side);

/** `seals.broken`: the broken seals, each once, in `ALL_SEALS` order. Empty is a real record. */
export const brokenSealsSchema = z
  .array(sealSchema)
  .max(ALL_SEALS.length)
  .refine(
    (seals) =>
      seals.every((seal, i) => i === 0 || sealOrder(seals[i - 1] ?? seal) < sealOrder(seal)),
    {
      error: "Seals are listed once each, in level then side order.",
    },
  );

/** `skulls.count`: skulls dropped since the person last reset the count, and when that was. */
export const skullTallySchema = z.strictObject({
  count: z.int().nonnegative(),
  /** When the count was last reset, or first started, in milliseconds since the epoch. */
  since: z.int().nonnegative(),
});

/** Every value the store keeps, with its schema. */
export const TOWER_VALUE_SCHEMAS = {
  "battery.level": batteryReadingSchema,
  "battery.on-level": batteryHistorySchema,
  "mechanics.drum-position": drumPositionsSchema,
  "glyphs.all-positions": glyphPositionsSchema,
  "seals.broken": brokenSealsSchema,
  "skulls.count": skullTallySchema,
} as const;

export type TowerValueKey = keyof typeof TOWER_VALUE_SCHEMAS;
export type TowerValue<Key extends TowerValueKey> = z.infer<(typeof TOWER_VALUE_SCHEMAS)[Key]>;

/**
 * The service's own record, not readings from the tower (spec D24): saved apart from the snapshot,
 * loaded when the service starts with no prompt, and never made stale by a disconnect.
 */
export const RECORD_KEYS = ["seals.broken", "skulls.count"] as const satisfies TowerValueKey[];
export type RecordKey = (typeof RECORD_KEYS)[number];

export const isRecordKey = (key: string): key is RecordKey =>
  (RECORD_KEYS as readonly string[]).includes(key);
