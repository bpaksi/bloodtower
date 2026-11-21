import { type CorruptionTuning, corruptionTuningFrom } from "../../rules/corruption/tuning.ts";
import type { KingdomId } from "../chapter/board.ts";

/**
 * The corruptions that lose the game at once: a hero's third (DEC-043, DEC-676). One copy; the
 * board's band mark (CU/10) shows one short of it, and C3-08 reuses it.
 */
export const CORRUPTION_LOSS_LIMIT = 3;

/**
 * Numbers the day reads. Defaults match packs/base/tuning.yaml (DEC-703).
 * `loss.fallen_buildings` is Q-C3-05 (4). The base file has no loss block yet, so a
 * test copy can set the key and the check reads it.
 */
export type DayTuning = {
  moveDice: string;
  moveFloor: number;
  perVirtue: number;
  perCorruption: number;
  /** Each group's shift while the party is split, a group of one included (PT-06, DEC-918). */
  perSplitGroup: number;
  supply: number;
  dropOneOrTwo: number;
  dropThreeOrFourEach: number;
  dropThreeOrFourOther: number;
  questSkips: boolean;
  kingdomDie: string;
  loss: { fallen_buildings: number };
  /** Gold the corruptions take or add (C3-08, Q-C3-16). */
  corruption: CorruptionTuning;
  /** Hit points a potion gives (`battle.potion_hit_points`, CU/13). */
  potionHitPoints: number;
};

const BASE_DAY_TUNING: DayTuning = {
  moveDice: "2d3",
  moveFloor: 2,
  perVirtue: 1,
  perCorruption: -1,
  perSplitGroup: -1,
  supply: 24,
  dropOneOrTwo: 1,
  dropThreeOrFourEach: 1,
  dropThreeOrFourOther: 2,
  questSkips: true,
  kingdomDie: "d4",
  loss: { fallen_buildings: 4 },
  corruption: corruptionTuningFrom(),
  potionHitPoints: 4,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const whole = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isInteger(value) ? value : fallback;

/** Reads a tuning object. Missing fields keep the base placeholders. */
export const dayTuningFrom = (source?: unknown): DayTuning => {
  const root = isRecord(source) ? source : {};
  const day = isRecord(root.day) ? root.day : {};
  const move = isRecord(day.move_roll) ? day.move_roll : {};
  const shifts = isRecord(day.shifts) ? day.shifts : {};
  const skulls = isRecord(root.skulls) ? root.skulls : {};
  const drops = isRecord(skulls.drops_a_night) ? skulls.drops_a_night : {};
  const many = isRecord(drops.heroes_3_to_4) ? drops.heroes_3_to_4 : {};
  const simulated = isRecord(skulls.simulated_drop) ? skulls.simulated_drop : {};
  const loss = isRecord(root.loss) ? root.loss : {};
  const battle = isRecord(root.battle) ? root.battle : {};
  const base = BASE_DAY_TUNING;
  return {
    moveDice: typeof move.dice === "string" ? move.dice : base.moveDice,
    moveFloor: whole(move.floor, base.moveFloor),
    perVirtue: whole(shifts.per_helping_virtue, base.perVirtue),
    perCorruption: whole(shifts.per_corruption, base.perCorruption),
    perSplitGroup: whole(shifts.per_split_group, base.perSplitGroup),
    supply: whole(skulls.supply, base.supply),
    dropOneOrTwo: whole(drops.heroes_1_to_2, base.dropOneOrTwo),
    dropThreeOrFourEach: whole(many.each_night, base.dropThreeOrFourEach),
    dropThreeOrFourOther: whole(many.every_other_night, base.dropThreeOrFourOther),
    questSkips:
      typeof skulls.quest_won_suppresses_drop === "boolean"
        ? skulls.quest_won_suppresses_drop
        : base.questSkips,
    kingdomDie: typeof simulated.kingdom_die === "string" ? simulated.kingdom_die : base.kingdomDie,
    loss: { fallen_buildings: whole(loss.fallen_buildings, base.loss.fallen_buildings) },
    corruption: corruptionTuningFrom(root),
    potionHitPoints: whole(battle.potion_hit_points, base.potionHitPoints),
  };
};

export const BASE_TUNING = BASE_DAY_TUNING;

/** Citadel picks above Cleanse, last one removed first (DEC-093, feature 06 menu). */
export const CITADEL_ABOVE_CLEANSE = ["Rally", "Virtue draw"] as const;

/** d4 face 1..4 maps to the board's kingdom order N, E, S, W. */
export const D4_KINGDOMS = ["N", "E", "S", "W"] as const satisfies readonly KingdomId[];

export const kingdomFromD4 = (face: number): KingdomId => {
  const kingdom = D4_KINGDOMS[face - 1];
  if (!kingdom) throw new Error(`A d4 kingdom face must be 1 to 4, got ${face}.`);
  return kingdom;
};

export const fallenLimit = (tuning: DayTuning): number => {
  const value = tuning.loss.fallen_buildings;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Tuning key loss.fallen_buildings must be a whole number of 1 or more.");
  }
  return value;
};

/**
 * Skulls that leave the supply on the night counted as N (DEC-912, DEC-822, DEC-824, DEC-564).
 * N is the saved counter of counted nights, not the calendar day; the first counted night is 1.
 * Solo: a drop on odd N. Pair: a drop unless N is a multiple of 4. Three or four: the "each"
 * count on odd N, the "other" count on even N.
 */
export const dropsThisNight = (heroes: number, counted: number, tuning: DayTuning): number => {
  if (!Number.isInteger(heroes) || heroes < 1) {
    throw new Error("The night's drop needs the hero count.");
  }
  if (!Number.isInteger(counted) || counted < 1) {
    throw new Error("The night's drop needs a counted night from 1.");
  }
  if (heroes === 1) return counted % 2 === 1 ? tuning.dropOneOrTwo : 0;
  if (heroes === 2) return counted % 4 === 0 ? 0 : tuning.dropOneOrTwo;
  return counted % 2 === 0 ? tuning.dropThreeOrFourOther : tuning.dropThreeOrFourEach;
};

/**
 * Nights the supply still covers, counting from the night counted as `from` (N + 1 for the saved
 * counter N). A night with no drop counts as a day (DEC-947), and so does a night whose drop is
 * larger than the skulls still left (Q-C3-04).
 */
export const daysLeft = (
  supply: number,
  heroes: number,
  from: number,
  tuning: DayTuning,
): number => {
  if (!Number.isInteger(supply) || supply < 0) {
    throw new Error("Days left needs a whole skull supply.");
  }
  if (supply === 0) return 0;
  const cycle = [0, 1, 2, 3].reduce(
    (sum, at) => sum + dropsThisNight(heroes, from + at, tuning),
    0,
  );
  if (cycle < 1) throw new Error("The nights drop at least one skull in four.");
  let left = supply;
  let at = from;
  let days = 0;
  while (left > 0) {
    left -= dropsThisNight(heroes, at, tuning);
    days += 1;
    at += 1;
  }
  return days;
};

/** Each skull removes the last offer above Cleanse. Cleanse and Leave stay until the 4th. */
export const buildingMenu = (
  aboveCleanse: readonly string[],
  skulls: number,
  quest: boolean,
): string[] => {
  if (!Number.isInteger(skulls) || skulls < 0) {
    throw new Error("Skulls on a building are a whole number.");
  }
  // A fallen building keeps only an open quest (DEC-910): Quest, then Leave.
  if (skulls >= 4) return quest ? ["Quest", "Leave"] : [];
  const left = [...aboveCleanse];
  for (let i = 0; i < skulls && left.length > 0; i++) left.pop();
  const menu = [...left, "Cleanse", "Leave"];
  if (quest) menu.unshift("Quest");
  return menu;
};

export const applyMoveTotal = (
  raw: number,
  virtueShift: number,
  corruptionShift: number,
  splitShift: number,
  floor: number,
): number => Math.max(floor, raw + virtueShift + corruptionShift + splitShift);
