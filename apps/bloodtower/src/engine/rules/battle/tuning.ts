/*
 * The numbers a battle reads (DEC-703 placeholders, DEC-500, DEC-131). They come from the
 * tuning object, never from a literal in the loop. A missing number takes the base placeholder,
 * except the silent-seat seconds (PT-20): the engine holds no value for it, so a tuning object
 * without `battle.silent_seat_seconds` is an error, never a quiet default.
 */

export type BattleTuning = {
  perLevel: number;
  perExtraHero: number;
  oddsMinPercent: number;
  oddsMaxPercent: number;
  heroesDivisor: number;
  wonRoundMinimum: number;
  stepUp: { n: number; d: number };
  /** Flat cut of each spell (the file stores them negative). */
  spellCut: { magic_missile: number; lightning: number; fireball: number };
  goldPerLevelWon: number;
  goldPerLevelLost: number;
  /** Seconds a seat is silent before "Pick for <hero>" is offered (PT-20). */
  silentSeatSeconds: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const whole = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isInteger(value) ? value : fallback;

const rec = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

export const battleTuningFrom = (source?: unknown): BattleTuning => {
  const root = rec(source);
  const battle = rec(root.battle);
  const odds = rec(battle.round_odds);
  const won = rec(battle.won_round);
  const step = rec(rec(battle.step_up).chance);
  const spells = rec(root.spells);
  const gold = rec(root.gold);
  const silent = battle.silent_seat_seconds;
  if (typeof silent !== "number" || !Number.isFinite(silent) || silent <= 0) {
    throw new Error(
      "The tuning has no battle.silent_seat_seconds (PT-20); the engine holds no value for it.",
    );
  }
  const cut = (value: unknown, fallback: number) => Math.abs(whole(value, -fallback));
  return {
    perLevel: whole(rec(battle.foe_count).per_level, 4),
    perExtraHero: whole(rec(battle.foe_count).per_extra_hero, 1),
    oddsMinPercent: whole(odds.min_percent, 10),
    oddsMaxPercent: whole(odds.max_percent, 90),
    heroesDivisor: Math.max(1, whole(odds.heroes_divisor, 2)),
    wonRoundMinimum: whole(won.minimum, 2),
    stepUp: { n: whole(step.n, 1), d: Math.max(1, whole(step.d, 3)) },
    spellCut: {
      magic_missile: cut(spells.magic_missile, 2),
      lightning: cut(spells.lightning, 4),
      fireball: cut(spells.fireball, 4),
    },
    goldPerLevelWon: whole(rec(gold.won_battle).per_level, 2),
    goldPerLevelLost: whole(rec(gold.lost_on_fall).per_level, 2),
    silentSeatSeconds: silent,
  };
};
