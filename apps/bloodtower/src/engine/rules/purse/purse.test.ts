import { describe, expect, it } from "vitest";
import { BASE_PURSE_WHEEL, drawPurse, isPurseAmount, purseWheelFrom } from "./index.ts";

describe("CU/15 EV-09 the seeded purse draw", () => {
  it("gives the same amount for the same seed, and can differ for another", () => {
    expect(drawPurse("a")).toBe(drawPurse("a"));
    const seen = new Set(Array.from({ length: 40 }, (_, i) => drawPurse(`seed-${i}`)));
    expect(seen.size).toBeGreaterThan(1);
  });

  it("never goes below the floor, even when a side is under it", () => {
    const wheel = { sides: [3, 5, 7, 40], floor: 10 };
    for (let i = 0; i < 60; i += 1) expect(drawPurse(`s${i}`, wheel)).toBeGreaterThanOrEqual(10);
  });

  it("reads setup.purse_wheel from tuning, and keeps the base wheel for a missing or bad one", () => {
    expect(purseWheelFrom({ setup: { purse_wheel: { sides: [1, 2, 3, 4], floor: 2 } } })).toEqual({
      sides: [1, 2, 3, 4],
      floor: 2,
    });
    expect(purseWheelFrom({})).toEqual(BASE_PURSE_WHEEL);
    expect(purseWheelFrom({ setup: { purse_wheel: { sides: [0], floor: -1 } } })).toEqual(
      BASE_PURSE_WHEEL,
    );
  });

  it("knows a usable amount from an unusable one", () => {
    expect(isPurseAmount(0)).toBe(true);
    expect(isPurseAmount(20)).toBe(true);
    for (const bad of [null, undefined, -1, 1.5, Number.NaN, "20"]) {
      expect(isPurseAmount(bad)).toBe(false);
    }
  });
});
