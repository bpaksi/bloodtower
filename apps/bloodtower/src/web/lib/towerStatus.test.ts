import { describe, expect, it } from "vitest";
import { towerStatusLines } from "./towerStatus.ts";

describe("tower status lines", () => {
  it("shows unavailable rather than zero, and shows a known zero as 0%", () => {
    expect(
      towerStatusLines({
        connection: "unavailable",
        battery: { state: "unavailable" },
        calibrated: { state: "unavailable" },
      }),
    ).toEqual({ connection: "unavailable", battery: "unavailable", calibration: "unavailable" });
    expect(
      towerStatusLines({
        connection: "connected",
        battery: { state: "known", percent: 0 },
        calibrated: { state: "known", calibrated: false },
      }).battery,
    ).toBe("0%");
  });
});
