import { SOUND_CATALOG, type Sound } from "@dark-tower/tower";
import { describe, expect, it } from "vitest";
import { describeSound, filterSounds } from "./soundFilter.ts";

const indexes = (sounds: readonly Sound[]) => sounds.map((sound) => sound.index);

describe("filterSounds", () => {
  it("returns the whole catalog for an empty query and no category", () => {
    expect(filterSounds(SOUND_CATALOG, "  ", undefined)).toEqual(SOUND_CATALOG);
  });

  it("matches a number to that index exactly, and to names containing it", () => {
    expect(indexes(filterSounds(SOUND_CATALOG, "12", undefined))).toEqual([12]);
    // "8" is sound 8 and every "8-bit" sound.
    const eight = filterSounds(SOUND_CATALOG, "8", undefined);
    expect(eight[0]?.index).toBe(8);
    expect(eight.slice(1).every((sound) => sound.name.includes("8"))).toBe(true);
    expect(eight.length).toBeGreaterThan(1);
  });

  it("matches names and categories ignoring case and extra spaces", () => {
    expect(indexes(filterSounds(SOUND_CATALOG, "tower  SEAL", undefined))).toEqual([112]);
    expect(filterSounds(SOUND_CATALOG, "adversary", undefined).length).toBeGreaterThanOrEqual(8);
  });

  it("filters by category, alone or with a query", () => {
    const seals = filterSounds(SOUND_CATALOG, "", "Seals");
    expect(seals.every((sound) => sound.category === "Seals")).toBe(true);
    expect(indexes(filterSounds(SOUND_CATALOG, "loop", "Seals"))).toEqual([110]);
    expect(filterSounds(SOUND_CATALOG, "Ashstrider", "Seals")).toEqual([]);
  });

  it("finds nothing for a query no sound matches", () => {
    expect(filterSounds(SOUND_CATALOG, "no such sound", undefined)).toEqual([]);
    expect(filterSounds(SOUND_CATALOG, "999", undefined)).toEqual([]);
  });
});

describe("describeSound", () => {
  it("names a sound by number and name, and a numeric fallback once", () => {
    expect(describeSound({ index: 12, name: "Letha" })).toBe("12 Letha");
    expect(describeSound({ index: 7, name: "Sound 7" })).toBe("Sound 7");
  });
});
