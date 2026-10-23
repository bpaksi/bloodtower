// Reading the service's state values for the Tower State page (M3 step 3.5). Pure, so it is
// tested without React. A value is read with its schema from the protocols package; one that is
// missing, unavailable or off its schema is unavailable, never zero, empty or a guess.
import {
  type Origin,
  type StateSnapshot,
  TOWER_VALUE_SCHEMAS,
  type TowerValue,
  type TowerValueKey,
  towerSideSchema,
} from "@dark-tower/tower";

export type ValueView<Value> =
  | { known: false }
  | {
      known: true;
      value: Value;
      origin: Origin;
      freshness: "current" | "stale";
      updatedAt: number;
    };

export const readValue = <Key extends TowerValueKey>(
  snapshot: StateSnapshot | undefined,
  key: Key,
): ValueView<TowerValue<Key>> => {
  const value = snapshot?.[key];
  if (!value || value.freshness === "unavailable") return { known: false };
  const parsed = TOWER_VALUE_SCHEMAS[key].safeParse(value.value);
  if (!parsed.success) return { known: false };
  return {
    known: true,
    value: parsed.data as TowerValue<Key>,
    origin: value.origin,
    freshness: value.freshness,
    updatedAt: value.updatedAt,
  };
};

type Side = (typeof towerSideSchema.options)[number];

/** The glyphs facing each side, in side order, each list sorted by name. */
export const glyphsBySide = (glyphs: TowerValue<"glyphs.all-positions">) =>
  towerSideSchema.options.map((side) => ({
    side,
    glyphs: Object.entries(glyphs)
      .filter(([, facing]) => facing === side)
      .map(([glyph]) => glyph)
      .sort(),
  }));

export const isSealBroken = (
  broken: TowerValue<"seals.broken">,
  seal: { side: Side; level: string },
) => broken.some((other) => other.side === seal.side && other.level === seal.level);

/**
 * The battery history laid out for a chart `width` by `height`: a point per reading, x by time
 * from the first reading to the last and y by percent from 0 at the bottom to 100 at the top. One
 * reading sits in the middle of the width.
 */
export const batteryPoints = (
  history: TowerValue<"battery.on-level">,
  width: number,
  height: number,
) => {
  const first = history[0]?.at ?? 0;
  const span = (history.at(-1)?.at ?? first) - first;
  return history.map((reading) => ({
    ...reading,
    x: span === 0 ? width / 2 : ((reading.at - first) / span) * width,
    y: height - (reading.percent / 100) * height,
  }));
};

/** The reading nearest to `x` on the chart, for the hover tooltip. */
export const nearestPoint = <Point extends { x: number }>(points: readonly Point[], x: number) =>
  points.reduce<Point | undefined>(
    (best, point) => (!best || Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best),
    undefined,
  );
