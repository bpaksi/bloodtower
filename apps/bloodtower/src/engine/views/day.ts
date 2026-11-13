import { type DayTuning, daysLeft, dropsThisNight } from "../loops/day/rules.ts";
import type { DayPhaseView, DayRollView } from "./state.ts";

/** Day fields for the board (C3 feature 11). */
export type DayClockView = {
  daysLeft: number;
  effects: readonly string[];
};

export const projectDayClock = (input: {
  supply: number;
  heroes: number;
  night: number;
  effects?: readonly string[];
  tuning: DayTuning;
}): DayClockView => ({
  daysLeft: daysLeft(input.supply, input.heroes, input.night, input.tuning),
  effects: input.effects ?? [],
});

/** Day loop phase to the panel the board paints. Null when no day panel applies. */
export const dayPhaseView = (
  phase: string | undefined,
  hasEffects: boolean,
): DayPhaseView | null => {
  switch (phase) {
    case "regroup":
      return "regroup";
    case "roll":
      return "roll";
    case "groups":
      return "turn";
    case "skull-prompt":
    case "skull-place":
      return "skull";
    case "skull-sim":
      return "skull-sim";
    case "check":
      return hasEffects ? "effects" : "turn";
    // Once the day is done the panel is gone; it must not linger into the next screen (Review A).
    case "done":
      return null;
    default:
      return null;
  }
};

/**
 * The coming drop only (Q-C3-19). A won quest skips the night's drop (DEC-699), so the bar
 * reads 0 then. Null when there are no heroes to count.
 */
export const comingDrop = (input: {
  heroes: number;
  night: number;
  questWon: boolean;
  tuning: DayTuning;
}): number | null => {
  if (input.heroes < 1) return null;
  if (input.questWon && input.tuning.questSkips) return 0;
  return dropsThisNight(input.heroes, input.night, input.tuning);
};

/** One roll row. Terrain is not a modifier the engine has yet, so it is always 0 (no term shown). */
export const rollView = (input: {
  groupId: string;
  name: string;
  shift: { raw: number; virtue: number; corruption: number; total: number };
}): DayRollView => ({
  groupId: input.groupId,
  name: input.name,
  rolled: input.shift.raw,
  virtue: input.shift.virtue,
  terrain: 0,
  corruption: input.shift.corruption,
  total: input.shift.total,
});

const signed = (n: number, word: string): string =>
  n < 0 ? `(−${Math.abs(n)} ${word})` : `(+${n} ${word})`;

/** `<Group name>: <total>` then one term per modifier: virtue, terrain, corruption (EV-01). */
export const rollLine = (roll: DayRollView): string => {
  const terms: string[] = [];
  if (roll.virtue !== 0) terms.push(signed(roll.virtue, "virtue"));
  if (roll.terrain !== 0) terms.push(signed(roll.terrain, "terrain"));
  if (roll.corruption !== 0) terms.push(signed(roll.corruption, "corruption"));
  return [`${roll.name}: ${roll.total}`, ...terms].join(" ");
};
