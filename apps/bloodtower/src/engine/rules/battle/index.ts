import type { BattleTuning } from "./tuning.ts";

export * from "./tuning.ts";

/** MEC-024, DEC-678: 4 a level, +1 per hero present after the first. A lone foe's wounds too. */
export const foeWounds = (t: BattleTuning, level: number, heroesPresent: number): number =>
  t.perLevel * level + t.perExtraHero * Math.max(0, heroesPresent - 1);

/**
 * DEC-701: strength / (strength + level x heroes present / divisor), kept between the min and max
 * percent. Never read as 0 or 1: a round is always a chance.
 */
export const roundOdds = (
  t: BattleTuning,
  strength: number,
  level: number,
  heroesPresent: number,
): number => {
  const floor = t.oddsMinPercent / 100;
  const ceil = t.oddsMaxPercent / 100;
  const against = (level * heroesPresent) / t.heroesDivisor;
  const total = strength + against;
  const raw = total > 0 ? strength / total : floor;
  return Math.min(ceil, Math.max(floor, raw));
};

/** OPT-010: a won round cuts half the round's strength, rounded up, at least the minimum. */
export const wonRoundCut = (t: BattleTuning, strength: number): number =>
  Math.max(t.wonRoundMinimum, Math.ceil(strength / 2));

/** DEC-547: 2 x the foe's level; a disaster foe pays double. */
export const rewardGold = (t: BattleTuning, level: number, disaster: boolean): number =>
  t.goldPerLevelWon * level * (disaster ? 2 : 1);

/** DEC-177, DEC-179: 2 x the foe's level. The caller splits and caps it across the purse. */
export const fallGoldLoss = (t: BattleTuning, level: number): number => t.goldPerLevelLost * level;
