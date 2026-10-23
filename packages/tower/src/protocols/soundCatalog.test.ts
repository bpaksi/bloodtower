import { describe, expect, it } from "vitest";
import { SOUND_COUNT, soundIndexSchema } from "./inventory.ts";
import { buildSoundCatalog, SOUND_CATALOG, SOUND_CATEGORIES, soundName } from "./soundCatalog.ts";

describe("sound catalog", () => {
  it("lists every index the schema accepts, in order, each with a name", () => {
    expect(SOUND_CATALOG.map((sound) => sound.index)).toEqual(
      Array.from({ length: SOUND_COUNT }, (_, i) => i + 1),
    );
    for (const sound of SOUND_CATALOG) {
      expect(soundIndexSchema.safeParse(sound.index).success, String(sound.index)).toBe(true);
      expect(sound.name, String(sound.index)).not.toBe("");
    }
  });

  it("takes names and categories from ultimatedarktowerdata", () => {
    expect(SOUND_CATALOG[0]).toEqual({ index: 1, name: "Ashstrider", category: "Adversary" });
    expect(soundName(112)).toBe("Tower Seal");
    expect(SOUND_CATEGORIES).toContain("Battle");
    expect(new Set(SOUND_CATEGORIES).size).toBe(SOUND_CATEGORIES.length);
  });

  it("falls back to the number for a sound the data does not name", () => {
    const catalog = buildSoundCatalog(
      {
        a: { value: 1, name: "Named", category: "Battle" },
        b: { value: 2, name: "  ", category: "" },
        c: { value: 9, name: "Out of range" },
      },
      3,
    );
    expect(catalog).toEqual([
      { index: 1, name: "Named", category: "Battle" },
      { index: 2, name: "Sound 2", category: undefined },
      { index: 3, name: "Sound 3", category: undefined },
    ]);
    expect(soundName(SOUND_COUNT + 1)).toBe(`Sound ${SOUND_COUNT + 1}`);
  });
});
