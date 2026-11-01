import { describe, expect, it } from "vitest";
import {
  DRUM_SIDES,
  EMPTY_RUN,
  type ExpectedGlyph,
  loadRun,
  parseCount,
  recordGlyphs,
  type SeenGlyph,
  saveRun,
  sideKey,
  summarizeSkulls,
  visitTowerState,
  withFacing,
} from "./setupCheck.ts";

// The library table (ultimatedarktowerdata@3.0.0 GLYPHS), written out here so a copied table
// that drifted would fail this test rather than agree with itself.
const LIBRARY: Record<string, ExpectedGlyph> = {
  "top/north": "cleanse",
  "top/east": "none",
  "top/south": "quest",
  "top/west": "none",
  "middle/north": "battle",
  "middle/east": "none",
  "middle/south": "none",
  "middle/west": "none",
  "bottom/north": "banner",
  "bottom/east": "none",
  "bottom/south": "reinforce",
  "bottom/west": "none",
};

const memory = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
};

describe("recordGlyphs", () => {
  it("records seen glyphs beside the expected ones", () => {
    // 6 that agree with the library, 5 that do not, and 1 left blank.
    const answers: Record<string, SeenGlyph> = {
      "top/north": "cleanse",
      "top/east": "none",
      "top/south": "quest",
      "top/west": "cleanse",
      "middle/north": "battle",
      "middle/east": "quest",
      "middle/south": "battle",
      "middle/west": "banner",
      "bottom/north": "banner",
      "bottom/east": "reinforce",
      "bottom/south": "reinforce",
      "bottom/west": "blank",
    };

    const records = recordGlyphs(answers);

    expect(records).toHaveLength(12);
    expect(DRUM_SIDES).toHaveLength(12);
    for (const record of records) {
      expect(record.expected).toBe(LIBRARY[sideKey(record.drum, record.side)]);
      expect(record.seen).toBe(answers[sideKey(record.drum, record.side)]);
    }
    expect(records.filter((record) => record.match === true)).toHaveLength(6);
    expect(records.filter((record) => record.match === false)).toHaveLength(5);
    expect(records.filter((record) => record.match === "unknown")).toHaveLength(1);

    const blank = records.find((record) => record.drum === "bottom" && record.side === "west");
    expect(blank).toMatchObject({ expected: "none", seen: "blank", match: "unknown" });
    expect(blank?.match).not.toBe(true);
  });
});

describe("summarizeSkulls", () => {
  it("skull tries", () => {
    const counted = [
      { id: "1", dropped: 2, stayed: 1 },
      { id: "2", dropped: 2, stayed: 1 },
      { id: "3", dropped: 1, stayed: 1 },
      { id: "4", dropped: 1, stayed: 0 },
      { id: "5", dropped: 1, stayed: 0 },
      { id: "6", dropped: 1, stayed: 1 },
      { id: "7", dropped: 1, stayed: 0 },
      { id: "8", dropped: 1, stayed: 1 },
      { id: "9", dropped: 2, stayed: 1 },
    ];
    // The tenth try was not counted. It must not be read as zero.
    const missing = { id: "10" };
    const summary = summarizeSkulls([...counted, missing]);

    expect(summary.tries).toBe(9);
    expect(summary.totalDropped).toBe(12);
    expect(summary.totalStayed).toBe(6);
    expect(summary.share).toBe(0.5);
    expect(summary.uncounted).toEqual([missing]);
    expect(summary.incomplete).toBe(true);
    expect(summary.tries < 10).toBe(true);

    const storage = memory();
    const error = saveRun(storage, { ...EMPTY_RUN, skulls: [...counted, missing] });
    expect(error).toBeUndefined();
    const loaded = loadRun(storage);
    expect(loaded.error).toBeUndefined();
    const again = summarizeSkulls(loaded.run.skulls);
    expect(again.tries).toBe(9);
    expect(again.totalDropped).toBe(12);
    expect(again.totalStayed).toBe(6);
    expect(again.share).toBe(0.5);
    expect(again.uncounted).toEqual([{ id: "10" }]);
    expect(loaded.run.skulls[9]).toEqual({ id: "10" });
    expect(loaded.run.skulls[9]?.dropped).not.toBe(0);
    expect(loaded.run.skulls[9]?.stayed).not.toBe(0);
    expect(parseCount("")).toBeUndefined();
    expect(parseCount("0")).toBe(0);
    expect(parseCount("2")).toBe(2);
  });
});

describe("visitTowerState", () => {
  it("stays unknown until this visit presses calibrate", () => {
    expect(visitTowerState(false, "calibrated")).toBe("unknown");
    expect(visitTowerState(false, undefined)).toBe("unknown");
    expect(visitTowerState(true, "calibrating")).toBe("calibrating");
    expect(visitTowerState(true, "calibrated")).toBe("calibrated");
    expect(visitTowerState(true, "uncalibrated")).toBe("unknown");
  });
});

describe("withFacing", () => {
  it("does not store a kingdom when the north side was not lit", () => {
    expect(withFacing(EMPTY_RUN, "North")).toEqual(EMPTY_RUN);
    expect(withFacing({ ...EMPTY_RUN, northLit: true }, "North").facingKingdom).toBe("North");
  });
});
