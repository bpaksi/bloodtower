import { eventRng } from "@dark-tower/rng";
import { groupById, type PlayState } from "../../loops/chapter/playState.ts";
import { ensureClock, heroSheet, setHeroSheet } from "../../loops/day/clock.ts";
import type { HeroGold } from "../corruption/index.ts";

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

/*
 * The party's pool (D5, DEC-911, DEC-944). Every seated hero carries gold on their sheet; any of it
 * pays a priced choice. The heroes present pay first, in equal shares, each leftover coin from a hero
 * holding the most (DEC-646, ties by seat); a short present hero is covered by the other present
 * heroes the same way; only when the present heroes together are short do the heroes elsewhere pay the
 * rest. A hero with no gold figure adds 0 and pays 0 (C3/13). Nothing below changes its input.
 */

/** Gold by hero id. A hero missing from the map holds 0. */
export type GoldMap = Record<string, number>;

const held = (gold: GoldMap, heroId: string): number => gold[heroId] ?? 0;

export const poolTotal = (gold: GoldMap): number =>
  Object.values(gold).reduce((sum, amount) => sum + amount, 0);

/** Takes `amount` from `heroes` (in seat order) and returns the coins that could not be taken. */
const payAmong = (gold: GoldMap, heroes: readonly string[], amount: number): number => {
  if (heroes.length === 0 || amount <= 0) return Math.max(0, amount);
  const share = Math.floor(amount / heroes.length);
  let left = amount;
  for (const id of heroes) {
    const paid = Math.min(share, held(gold, id));
    gold[id] = held(gold, id) - paid;
    left -= paid;
  }
  // Each leftover coin, and each coin a short hero could not give, from a hero holding the most.
  while (left > 0) {
    const richest = heroes.reduce((top, id) => (held(gold, id) > held(gold, top) ? id : top));
    if (held(gold, richest) <= 0) break;
    gold[richest] = held(gold, richest) - 1;
    left -= 1;
  }
  return left;
};

/** DEC-911: `price` paid by the present heroes, then by the absent ones for what is left. */
export const payPool = (
  gold: GoldMap,
  present: readonly string[],
  absent: readonly string[],
  price: number,
): { gold: GoldMap; unpaid: number } => {
  const next: GoldMap = { ...gold };
  const lacking = payAmong(next, present, price);
  return { gold: next, unpaid: payAmong(next, absent, lacking) };
};

/** DEC-178, DEC-646: `amount` to the present heroes, equal shares, each odd coin to a hero holding least. */
export const gainPresent = (gold: GoldMap, present: readonly string[], amount: number): GoldMap => {
  const next: GoldMap = { ...gold };
  if (present.length === 0 || amount <= 0) return next;
  const share = Math.floor(amount / present.length);
  for (const id of present) next[id] = held(next, id) + share;
  for (let coin = amount - share * present.length; coin > 0; coin--) {
    const least = present.reduce((low, id) => (held(next, id) < held(next, low) ? id : low));
    next[least] = held(next, least) + 1;
  }
  return next;
};

/** Seat order: the start assignments' order, then play order for a hero with no assignment. */
const seatOrder = (play: PlayState, heroIds: readonly string[]): string[] => {
  const seat = (id: string): number => {
    const at = play.content.start.assignments.findIndex((row) => row.hero === id);
    return at < 0 ? Number.MAX_SAFE_INTEGER : at;
  };
  return heroIds
    .map((id, index) => ({ id, index }))
    .sort((a, b) => seat(a.id) - seat(b.id) || a.index - b.index)
    .map((row) => row.id);
};

/** The heroes present (the group) and those elsewhere (every other group), each in seat order. */
export const poolSides = (
  play: PlayState,
  groupId: string,
): { present: string[]; absent: string[] } => {
  const present = seatOrder(play, groupById(play, groupId)?.heroIds ?? []);
  const here = new Set(present);
  const elsewhere = play.groups
    .filter((group) => group.id !== groupId)
    .flatMap((group) => group.heroIds)
    .filter((id) => !here.has(id));
  const absent = seatOrder(play, [...new Set(elsewhere)]);
  return { present, absent };
};

/** Every seated hero's sheet gold. A hero with no gold figure is left out: adds 0, pays 0. */
export const sheetGoldMap = (play: PlayState): GoldMap => {
  const clock = ensureClock(play);
  const map: GoldMap = {};
  for (const group of play.groups) {
    for (const id of group.heroIds) {
      const gold = heroSheet(clock, id).gold;
      if (gold !== undefined) map[id] = gold;
    }
  }
  return map;
};

/** The pool: the sum of every seated hero's sheet gold, across all groups. */
export const poolGold = (play: PlayState): number => poolTotal(sheetGoldMap(play));

const writeSheets = (play: PlayState, before: GoldMap, after: GoldMap): void => {
  const clock = ensureClock(play);
  for (const [id, gold] of Object.entries(after)) {
    if (gold === before[id]) continue;
    setHeroSheet(play, id, { ...heroSheet(clock, id), gold });
  }
};

/** Pays `price` off the sheets in DEC-911's order. Returns the coins no hero could pay (0 once gated). */
export const payFromSheets = (play: PlayState, groupId: string, price: number): number => {
  const before = sheetGoldMap(play);
  const { present, absent } = poolSides(play, groupId);
  const paid = payPool(before, present, absent, price);
  writeSheets(play, before, paid.gold);
  return paid.unpaid;
};

/** A gain to the heroes present (DEC-178, DEC-646). A present hero with no gold figure starts from 0. */
export const gainOnSheets = (play: PlayState, groupId: string, amount: number): void => {
  const before = sheetGoldMap(play);
  const { present } = poolSides(play, groupId);
  writeSheets(play, before, gainPresent(before, present, amount));
};

/**
 * Each hero's own gold on the sheets, for the losses that are never covered (DEC-896). A hero with no
 * gold figure reads 0 and is never written. `onTaken` hears each coin a loss takes (old minus new).
 */
export const sheetHeroGold = (play: PlayState, onTaken?: (taken: number) => void): HeroGold => ({
  get: (heroId) => heroSheet(ensureClock(play), heroId).gold ?? 0,
  set: (heroId, gold) => {
    const sheet = heroSheet(ensureClock(play), heroId);
    if (sheet.gold === undefined) return;
    setHeroSheet(play, heroId, { ...sheet, gold });
    onTaken?.(sheet.gold - gold);
  },
});
