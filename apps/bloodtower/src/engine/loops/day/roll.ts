import { groupById, nextPlayRng, type PlayState } from "../chapter/playState.ts";
import { ensureClock, heroSheet } from "./clock.ts";
import { applyMoveTotal } from "./rules.ts";

/** Seeded 2d3, then virtue and the most corrupted hero, never under the floor (DEC-615, DEC-684). */
export const rollDayMoves = (play: PlayState, seed: string): void => {
  const clock = ensureClock(play);
  play.dayRolls = {};
  clock.shifts = {};
  for (const groupId of play.turnOrder) {
    const group = groupById(play, groupId);
    if (!group) continue;
    const sheets = group.heroIds.map((heroId) => heroSheet(clock, heroId));
    const virtues = sheets.reduce((sum, sheet) => sum + sheet.helpingVirtues, 0);
    const corruption = sheets.reduce((max, sheet) => Math.max(max, sheet.corruptions), 0);
    const virtueShift = virtues === 0 ? 0 : virtues * clock.tuning.perVirtue;
    const corruptionShift = corruption === 0 ? 0 : corruption * clock.tuning.perCorruption;
    const raw = nextPlayRng(seed, play).roll(clock.tuning.moveDice).total;
    const total = applyMoveTotal(raw, virtueShift, corruptionShift, clock.tuning.moveFloor);
    play.dayRolls[groupId] = total;
    clock.shifts[groupId] = { raw, virtue: virtueShift, corruption: corruptionShift, total };
  }
};
