import { describe, expect, it } from "vitest";
import { batteryLabel } from "./labels.ts";

describe("batteryLabel", () => {
  const reading = { millivolts: 4_100, percent: 60.4 };

  it("never shows a value the service does not have as zero", () => {
    expect(batteryLabel(undefined)).toBe("Unknown");
    expect(batteryLabel({ freshness: "unavailable", origin: "unknown" })).toBe("Unavailable");
  });

  it("shows a current reading, and marks a stale one", () => {
    const current = {
      freshness: "current",
      value: reading,
      origin: "device-reported",
      updatedAt: 1,
    } as const;
    expect(batteryLabel(current)).toBe("60% (4.10 V)");
    expect(batteryLabel({ ...current, freshness: "stale" })).toBe("60% (4.10 V), stale");
  });
});
