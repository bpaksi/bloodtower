/** Corruption gold numbers (Q-C3-16, DEC-895). No imports, so the day tuning can read it. */

/** Gold the corruptions take or add, from `gold.corruption` in the base tuning (Q-C3-16, DEC-895). */
export type CorruptionTuning = {
  cruelLoss: number;
  greedyLoss: number;
  feralLoss: number;
  lostLoss: number;
  temptedBuyExtra: number;
};

/** The approved numbers. The pack schema has no defaults (DEC-895); this is for tests and a bare clock. */
export const BASE_CORRUPTION_TUNING: CorruptionTuning = {
  cruelLoss: 2,
  greedyLoss: 2,
  feralLoss: 2,
  lostLoss: 1,
  temptedBuyExtra: 2,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const whole = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isInteger(value) ? value : fallback;

/** Reads `gold.corruption` of a tuning object; the pack loader has already required every key. */
export const corruptionTuningFrom = (source?: unknown): CorruptionTuning => {
  const root = isRecord(source) ? source : {};
  const gold = isRecord(root.gold) ? root.gold : {};
  const block = isRecord(gold.corruption) ? gold.corruption : {};
  const base = BASE_CORRUPTION_TUNING;
  return {
    cruelLoss: whole(block.cruel_loss, base.cruelLoss),
    greedyLoss: whole(block.greedy_loss, base.greedyLoss),
    feralLoss: whole(block.feral_loss, base.feralLoss),
    lostLoss: whole(block.lost_loss, base.lostLoss),
    temptedBuyExtra: whole(block.tempted_buy_extra, base.temptedBuyExtra),
  };
};
