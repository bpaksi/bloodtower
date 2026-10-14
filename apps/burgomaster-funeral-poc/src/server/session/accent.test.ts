import { describe, expect, it } from "vitest";
import { accentDelayMs } from "./accent.ts";

describe("accentDelayMs", () => {
  it("stays inside 20–60 seconds and repeats for the same seed", () => {
    const first = accentDelayMs("funeral-demo", 0);
    expect(first).toBeGreaterThanOrEqual(20_000);
    expect(first).toBeLessThanOrEqual(60_000);
    expect(accentDelayMs("funeral-demo", 0)).toBe(first);
    expect(accentDelayMs("funeral-demo", 1)).toBeGreaterThanOrEqual(20_000);
    expect(accentDelayMs("other-seed", 0)).not.toBe(first);
  });
});
