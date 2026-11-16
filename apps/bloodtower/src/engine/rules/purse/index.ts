import { eventRng } from "@dark-tower/rng";

/*
 * The starting purse (DEC-114, UI-045, CU/15). The wheel has four sides and a floor, both read from
 * `setup.purse_wheel` in the base pack's tuning. A seeded draw picks one side; the amount never goes
 * below the floor. Nothing here reads the table, the tower or the board.
 */

export type PurseWheel = { sides: number[]; floor: number };

/** The base pack's `setup.purse_wheel`. A test keeps it equal to `packs/base/tuning.yaml`. */
export const BASE_PURSE_WHEEL: PurseWheel = { sides: [10, 20, 30, 40], floor: 10 };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const positiveWhole = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/**
 * Reads `setup.purse_wheel` from a tuning object. A missing or malformed wheel keeps the base one,
 * which is a placeholder, never a silent zero.
 */
export const purseWheelFrom = (source?: unknown): PurseWheel => {
  const setup = isRecord(source) && isRecord(source.setup) ? source.setup : {};
  const wheel = isRecord(setup.purse_wheel) ? setup.purse_wheel : {};
  const sides =
    Array.isArray(wheel.sides) && wheel.sides.length > 0 && wheel.sides.every(positiveWhole)
      ? [...wheel.sides]
      : BASE_PURSE_WHEEL.sides;
  const floor = positiveWhole(wheel.floor) ? wheel.floor : BASE_PURSE_WHEEL.floor;
  return { sides, floor };
};

/** The seeded draw. The same seed and wheel always give the same amount, never below the floor. */
export const drawPurse = (seed: string, wheel: PurseWheel = BASE_PURSE_WHEEL): number => {
  if (wheel.sides.length === 0) throw new Error("The purse wheel has no sides.");
  const side = eventRng(`${seed}|starting-purse`, 0).pick(wheel.sides);
  return Math.max(side, wheel.floor);
};

/** True when a stored purse is a usable amount: a whole number of gold, zero or more. */
export const isPurseAmount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;
