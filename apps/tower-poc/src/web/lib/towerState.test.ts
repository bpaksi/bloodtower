import type { StateSnapshot } from "@dark-tower/tower";
import { describe, expect, it } from "vitest";
import {
  batteryPoints,
  glyphsBySide,
  isSealBroken,
  nearestPoint,
  readValue,
} from "./towerState.ts";

const snapshot: StateSnapshot = {
  "seals.broken": {
    freshness: "current",
    value: [{ side: "east", level: "top" }],
    origin: "application-maintained",
    updatedAt: 5,
  },
  "skulls.count": {
    freshness: "stale",
    value: { count: -1, since: 1 },
    origin: "unknown",
    updatedAt: 1,
  },
  "battery.level": { freshness: "unavailable", origin: "unknown" },
};

describe("readValue", () => {
  it("reads a value with its origin, freshness and time", () => {
    expect(readValue(snapshot, "seals.broken")).toEqual({
      known: true,
      value: [{ side: "east", level: "top" }],
      origin: "application-maintained",
      freshness: "current",
      updatedAt: 5,
    });
  });

  it("calls a missing, unavailable or off-schema value unavailable, never zero", () => {
    expect(readValue(undefined, "seals.broken")).toEqual({ known: false });
    expect(readValue(snapshot, "battery.level")).toEqual({ known: false });
    expect(readValue(snapshot, "glyphs.all-positions")).toEqual({ known: false });
    // A negative count is not a count.
    expect(readValue(snapshot, "skulls.count")).toEqual({ known: false });
  });
});

describe("tower state helpers", () => {
  it("groups the glyphs by the side they face, in side order", () => {
    expect(
      glyphsBySide({
        cleanse: "north",
        quest: "east",
        battle: "north",
        banner: "west",
        reinforce: "west",
      }),
    ).toEqual([
      { side: "north", glyphs: ["battle", "cleanse"] },
      { side: "east", glyphs: ["quest"] },
      { side: "south", glyphs: [] },
      { side: "west", glyphs: ["banner", "reinforce"] },
    ]);
  });

  it("finds a broken seal by side and level", () => {
    const broken = [{ side: "east", level: "top" }] as const;
    expect(isSealBroken([...broken], { side: "east", level: "top" })).toBe(true);
    expect(isSealBroken([...broken], { side: "east", level: "middle" })).toBe(false);
  });

  it("lays the battery history out by time and percent, and finds the nearest reading", () => {
    const points = batteryPoints(
      [
        { at: 1_000, millivolts: 4_000, percent: 100 },
        { at: 2_000, millivolts: 3_900, percent: 50 },
        { at: 5_000, millivolts: 3_800, percent: 0 },
      ],
      400,
      100,
    );
    expect(points.map(({ x, y }) => [x, y])).toEqual([
      [0, 0],
      [100, 50],
      [400, 100],
    ]);
    expect(nearestPoint(points, 180)?.at).toBe(2_000);
    expect(nearestPoint([], 10)).toBeUndefined();
    expect(batteryPoints([{ at: 9, millivolts: 1, percent: 25 }], 400, 100)).toEqual([
      { at: 9, millivolts: 1, percent: 25, x: 200, y: 75 },
    ]);
  });
});
