import { describe, expect, it } from "vitest";
import { tuningRoot } from "../../loops/battle/fixtures.ts";
import {
  battleTuningFrom,
  fallGoldLoss,
  foeWounds,
  rewardGold,
  roundOdds,
  wonRoundCut,
} from "./index.ts";

describe("battle rules (DEC-703 placeholders)", () => {
  const t = battleTuningFrom(tuningRoot(30));
  it("foe count is 4 a level, +1 per hero after the first", () => {
    expect(foeWounds(t, 2, 1)).toBe(8);
    expect(foeWounds(t, 4, 2)).toBe(17);
  });
  it("round odds are strength / (strength + level x heroes / 2), kept between 10% and 90%", () => {
    expect(roundOdds(t, 3, 2, 2)).toBeCloseTo(3 / 5);
    expect(roundOdds(t, 0, 2, 2)).toBeCloseTo(0.1);
    expect(roundOdds(t, 100, 1, 1)).toBeCloseTo(0.9);
  });
  it("a won round cuts half, rounded up, at least 2", () => {
    expect(wonRoundCut(t, 3)).toBe(2);
    expect(wonRoundCut(t, 9)).toBe(5);
    expect(wonRoundCut(t, 1)).toBe(2);
  });
  it("gold: 2 a level won (double for a disaster), 2 a level lost", () => {
    expect(rewardGold(t, 3, false)).toBe(6);
    expect(rewardGold(t, 3, true)).toBe(12);
    expect(fallGoldLoss(t, 2)).toBe(4);
  });
  it("the silent-seat seconds come from the file's battle block, never from the engine", () => {
    expect(t.silentSeatSeconds).toBe(30);
    expect(battleTuningFrom(tuningRoot(10)).silentSeatSeconds).toBe(10);
    expect(() => battleTuningFrom(tuningRoot(null))).toThrow(/silent_seat_seconds/);
  });
});
