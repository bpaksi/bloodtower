import type { KingdomId } from "../chapter/board.ts";

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
  supply: number;
  dropOneOrTwo: number;
  dropThreeOrFourEach: number;
  dropThreeOrFourOther: number;
  questSkips: boolean;
  kingdomDie: string;
  loss: { fallen_buildings: number };
};

const BASE_DAY_TUNING: DayTuning = {
  moveDice: "2d3",
  moveFloor: 2,
  perVirtue: 1,
  perCorruption: -1,
  supply: 24,
  dropOneOrTwo: 1,
  dropThreeOrFourEach: 1,
  dropThreeOrFourOther: 2,
  questSkips: true,
  kingdomDie: "d4",
  loss: { fallen_buildings: 4 },
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
  const base = BASE_DAY_TUNING;
  return {
    moveDice: typeof move.dice === "string" ? move.dice : base.moveDice,
    moveFloor: whole(move.floor, base.moveFloor),
    perVirtue: whole(shifts.per_helping_virtue, base.perVirtue),
    perCorruption: whole(shifts.per_corruption, base.perCorruption),
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

/** Skulls that leave the supply tonight (DEC-564). Night 1 is the first night. */
export const dropsThisNight = (heroes: number, night: number, tuning: DayTuning): number => {
  if (!Number.isInteger(heroes) || heroes < 1) {
    throw new Error("The night's drop needs the hero count.");
  }
  if (!Number.isInteger(night) || night < 1) {
    throw new Error("The night's drop needs a night number from 1.");
  }
  if (heroes <= 2) return tuning.dropOneOrTwo;
  return night % 2 === 0 ? tuning.dropThreeOrFourOther : tuning.dropThreeOrFourEach;
};

/**
 * Nights the supply still covers, counting the 1,2,1,2 pattern from tonight (Q-C3-04).
 * A night counts even when its drop is larger than the skulls still left.
 */
export const daysLeft = (
  supply: number,
  heroes: number,
  night: number,
  tuning: DayTuning,
): number => {
  if (!Number.isInteger(supply) || supply < 0) {
    throw new Error("Days left needs a whole skull supply.");
  }
  if (supply === 0) return 0;
  const perNight = dropsThisNight(heroes, night, tuning);
  if (perNight < 1) throw new Error("The night drop is at least one skull.");
  if (heroes <= 2) return Math.ceil(supply / perNight);
  let left = supply;
  let at = night;
  let days = 0;
  while (left > 0) {
    const drop = dropsThisNight(heroes, at, tuning);
    if (drop < 1) throw new Error("The night drop is at least one skull.");
    left -= drop;
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
  if (skulls >= 4) return [];
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
  floor: number,
): number => Math.max(floor, raw + virtueShift + corruptionShift);
