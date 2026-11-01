import { type DayTuning, daysLeft } from "../loops/day/rules.ts";

/** Day fields for the board. The wire schema stays with feature 11. */
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
