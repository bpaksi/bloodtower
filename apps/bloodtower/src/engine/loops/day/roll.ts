import { virtuesCount } from "../../rules/corruption/index.ts";
import { groupById, nextPlayRng, type PlayState } from "../chapter/playState.ts";
import { ensureClock, heroSheet, type MoveShift } from "./clock.ts";
import { applyMoveTotal } from "./rules.ts";

/** A roll record with the split term (PT-06). Older records have none, which reads as 0. */
export type SplitMoveShift = MoveShift & { split?: number };

/** The split term of a roll record: 0 when the party was not split or the record predates it. */
export const splitShiftOf = (shift: SplitMoveShift): number =>
  typeof shift.split === "number" ? shift.split : 0;

/**
 * Seeded 2d3, then virtue, the most corrupted hero and, while the party is split, the
 * per-split-group shift for every group, never under the floor (DEC-615, DEC-684, DEC-918).
 */
export const rollDayMoves = (play: PlayState, seed: string): void => {
  const clock = ensureClock(play);
  play.dayRolls = {};
  clock.shifts = {};
  const split = play.groups.length > 1;
  for (const groupId of play.turnOrder) {
    const group = groupById(play, groupId);
    if (!group) continue;
    const sheets = group.heroIds.map((heroId) => heroSheet(clock, heroId));
    // DEC-474: a Feeble holder's virtues add nothing.
    const virtues = group.heroIds.reduce((sum, heroId) => sum + virtuesCount(clock, heroId), 0);
    const corruption = sheets.reduce((max, sheet) => Math.max(max, sheet.corruptions), 0);
    const virtueShift = virtues === 0 ? 0 : virtues * clock.tuning.perVirtue;
    const corruptionShift = corruption === 0 ? 0 : corruption * clock.tuning.perCorruption;
    const splitShift = split ? clock.tuning.perSplitGroup : 0;
    const raw = nextPlayRng(seed, play).roll(clock.tuning.moveDice).total;
    const total = applyMoveTotal(
      raw,
      virtueShift,
      corruptionShift,
      splitShift,
      clock.tuning.moveFloor,
    );
    play.dayRolls[groupId] = total;
    const shift: SplitMoveShift = {
      raw,
      virtue: virtueShift,
      corruption: corruptionShift,
      total,
      ...(splitShift === 0 ? {} : { split: splitShift }),
    };
    clock.shifts[groupId] = shift;
  }
};
