// Seeded random numbers. The same seed always gives the same draws, so a run can be replayed.

export type RollResult = {
  notation: string;
  dice: number[];
  modifier: number;
  total: number;
};

export type Rng = {
  seed: string;
  /** A float in [0, 1). */
  next(): number;
  /** An integer from min to max, both included. */
  int(min: number, max: number): number;
  /** True with the given chance (0 to 1). */
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  /** Dice notation: "1d6", "2d6+1", "d20", "3d4-2", or a plain "+2". */
  roll(notation: string): RollResult;
};

/** Turns any seed text into a 32-bit number (cyrb128-style mix). */
export function hashSeed(seed: string): number {
  let h1 = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h1 = Math.imul(h1 ^ seed.charCodeAt(i), 3432918353);
    h1 = (h1 << 13) | (h1 >>> 19);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 = Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ (h1 >>> 16)) >>> 0;
}

const MAX_DICE = 1000;
const DICE = /^\s*(?:(\d*)d(\d+))?\s*(?:([+-])\s*(\d+))?\s*$/i;

/** Splits "2d6+1" into its parts. Throws on text it cannot read, so a typo is never a silent zero. */
export function parseDice(notation: string): { count: number; sides: number; modifier: number } {
  const m = DICE.exec(notation);
  if (!m || (m[2] === undefined && m[4] === undefined)) {
    throw new Error(`Invalid dice notation "${notation}". Use forms like 1d6, 2d6+1, d20 or +2.`);
  }
  const count = m[2] === undefined ? 0 : m[1] === "" ? 1 : Number(m[1]);
  const sides = m[2] === undefined ? 0 : Number(m[2]);
  if (m[2] !== undefined && (count < 1 || sides < 1)) {
    throw new Error(`Invalid dice notation "${notation}": dice need at least 1 die and 1 side.`);
  }
  if (count > MAX_DICE) {
    throw new Error(`Invalid dice notation "${notation}": at most ${MAX_DICE} dice per roll.`);
  }
  const modifier = m[4] === undefined ? 0 : (m[3] === "-" ? -1 : 1) * Number(m[4]);
  return { count, sides, modifier };
}

export function createRng(seed: string | number): Rng {
  const seedText = String(seed);
  let a = hashSeed(seedText);
  // mulberry32
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new Error(`rng.int needs whole numbers with min <= max, got ${min}, ${max}.`);
    }
    return min + Math.floor(next() * (max - min + 1));
  };
  return {
    seed: seedText,
    next,
    int,
    chance(p) {
      if (typeof p !== "number" || Number.isNaN(p) || p < 0 || p > 1) {
        throw new Error(`rng.chance needs a number from 0 to 1, got ${String(p)}.`);
      }
      return next() < p;
    },
    pick(items) {
      if (items.length === 0) throw new Error("rng.pick needs a non-empty list.");
      return items[int(0, items.length - 1)] as (typeof items)[number];
    },
    shuffle(items) {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j] as (typeof out)[number], out[i] as (typeof out)[number]];
      }
      return out;
    },
    roll(notation) {
      const { count, sides, modifier } = parseDice(notation);
      const dice: number[] = [];
      for (let i = 0; i < count; i++) dice.push(int(1, sides));
      return { notation, dice, modifier, total: dice.reduce((s, d) => s + d, 0) + modifier };
    },
  };
}
