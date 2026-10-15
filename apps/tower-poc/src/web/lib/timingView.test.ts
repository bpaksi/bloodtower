import { describe, expect, it } from "vitest";
import {
  measuredGapMs,
  readSkull,
  serviceHttpOrigin,
  showTime,
  skullDropAt,
} from "./timingView.ts";

describe("timing view", () => {
  it("posts to the service, including when the page is served from another port", () => {
    expect(serviceHttpOrigin("http:", "localhost:4747")).toBe("http://localhost:4747");
    expect(serviceHttpOrigin("http:", "localhost:3000", "ws://localhost:4747/ws")).toBe(
      "http://localhost:4747",
    );
    expect(serviceHttpOrigin("https:", "tower.local", "wss://tower.local/ws")).toBe(
      "https://tower.local",
    );
  });

  it("reads a skull tally and treats an unknown one as unavailable, not zero", () => {
    expect(readSkull(undefined)).toBeUndefined();
    expect(
      readSkull({
        "skulls.count": { freshness: "unavailable", origin: "application-maintained" },
      }),
    ).toBeUndefined();
    expect(
      readSkull({
        "skulls.count": {
          freshness: "current",
          origin: "application-maintained",
          value: { count: 0, since: 5 },
          updatedAt: 5,
        },
      }),
    ).toEqual({ count: 0, updatedAt: 5 });
  });

  it("marks a drop only when the count rises, and shows a missing time as unavailable", () => {
    const baseline = { count: 2, updatedAt: 10 };
    expect(skullDropAt(baseline, { count: 2, updatedAt: 20 })).toBeNull();
    expect(skullDropAt(baseline, { count: 3, updatedAt: 30 })).toBe(30);
    expect(skullDropAt(undefined, { count: 1, updatedAt: 30 })).toBeNull();
    expect(showTime(null)).toBe("Unavailable");
    expect(showTime(0)).toBe("1970-01-01T00:00:00.000Z");
  });

  it("records the gap between the two sent times, and the planned pause when one is missing", () => {
    expect(measuredGapMs(1_000, 5_000, 6_040)).toBe(1_040);
    expect(measuredGapMs(0, 8_000, 8_012)).toBe(12);
    expect(measuredGapMs(1_000, 5_000, null)).toBe(1_000);
    expect(measuredGapMs(0, null, 8_000)).toBe(0);
    expect(measuredGapMs(1_000, 6_000, 5_000)).toBe(0);
  });
});
