import { battleTuningFrom } from "../../rules/battle/index.ts";
import type { BattleConfig, BattleHeroInput, RoundCard } from "./index.ts";

/** TEST ONLY: the base file's battle numbers (packs/base/tuning.yaml) plus a silent-seat value. */
export const tuningRoot = (silentSeatSeconds: number | null = 30) => ({
  battle: {
    foe_count: { per_level: 4, per_extra_hero: 1 },
    round_odds: { min_percent: 10, max_percent: 90, heroes_divisor: 2 },
    won_round: { fraction: "half", round: "up", minimum: 2 },
    lost_round: { heroes: 1, hit_points: "foe_level" },
    step_up: { chance: { n: 1, d: 3 }, level: 1 },
    ...(silentSeatSeconds === null ? {} : { silent_seat_seconds: silentSeatSeconds }),
  },
  spells: { magic_missile: -2, lightning: -4, fireball: -4 },
  gold: { won_battle: { per_level: 2, disaster: "double" }, lost_on_fall: { per_level: 2 } },
});

export const tuning = (silentSeatSeconds = 30) => battleTuningFrom(tuningRoot(silentSeatSeconds));

export const hero = (id: string, over: Partial<BattleHeroInput> = {}): BattleHeroInput => ({
  id,
  deviceId: `pad-${id}`,
  fight: 2,
  hp: 10,
  max: 10,
  canGuard: false,
  ...over,
});

/** Eight round cards; `hit` null means the foe's level (tuning lost_round). */
export const cards = (hit: number | null = null): RoundCard[] =>
  Array.from({ length: 8 }, (_, i) => ({ id: `card-${i + 1}`, name: `Card ${i + 1}`, hit }));

export const config = (over: Partial<BattleConfig> = {}): BattleConfig => ({
  seed: "battle-test",
  tuning: tuning(),
  foe: { id: "oreks", level: 2, cards: cards() },
  heroes: [hero("a"), hero("b")],
  ...over,
});
