import { describe, expect, it } from "vitest";
import { parseCard } from "./cards.ts";
import { MOODS } from "./feel.ts";
import { filterSounds, formatLength, parseSoundFilter, soundGroups } from "./sounds.ts";

const card = (file: string, front: string) => parseCard(file, `---\n${front}\n---\n`);

const area = (id: string, title: string) =>
  card(`${id}.md`, `type: area\ntitle: "${title}"\nlinks:\n  - { rel: part-of, to: AREA-021 }`);
const sound = (n: number, areaId: string, feel = "") =>
  card(
    `SND-${String(n).padStart(3, "0")}.md`,
    `type: sound\ntitle: "S${n} (sound ${n})"\nlinks:\n  - { rel: part-of, to: ${areaId} }${feel}`,
  );

describe("feel: in the card lint", () => {
  it("accepts a full feel block, including the moods mystery and menace", () => {
    for (const mood of ["dread", "mystery", "menace"]) {
      const c = sound(
        90,
        "AREA-030",
        `\nfeel:\n  mood: ${mood}\n  readsAs: threat\n  strength: strong\n  lengthMs: 2300\n  avoid: false\n  note: low growl`,
      );
      expect(c.data.feel).toMatchObject({ mood, lengthMs: 2300 });
    }
    expect(MOODS).toHaveLength(9);
  });

  it("rejects an unknown mood, reads-as, strength or field", () => {
    expect(() => sound(1, "AREA-022", "\nfeel:\n  mood: spooky")).toThrow(/unknown mood "spooky"/);
    expect(() => sound(1, "AREA-022", "\nfeel:\n  readsAs: boom")).toThrow(/unknown readsAs/);
    expect(() => sound(1, "AREA-022", "\nfeel:\n  strength: loud")).toThrow(/unknown strength/);
    expect(() => sound(1, "AREA-022", "\nfeel:\n  fits: [MEC-012]")).toThrow(/unknown feel field/);
  });

  it("rejects a length of 0, a feel on a card that is not a sound, and a feel that is not a block", () => {
    expect(() => sound(1, "AREA-022", "\nfeel:\n  lengthMs: 0")).toThrow(/lengthMs/);
    expect(() => card("IDEA-001.md", "type: idea\ntitle: x\nfeel:\n  mood: calm")).toThrow(
      /only for sound cards/,
    );
    expect(() => sound(1, "AREA-022", "\nfeel: dread")).toThrow(/must be a block/);
  });
});

describe("/sounds rows", () => {
  const cards = [
    area("AREA-022", "Tower sounds: Adversary"),
    area("AREA-030", "Tower sounds: Glyph"),
    sound(92, "AREA-030", "\nfeel:\n  mood: menace\n  readsAs: threat"),
    sound(90, "AREA-030", "\nfeel:\n  mood: dread\n  readsAs: threat\n  lengthMs: 1850"),
    sound(1, "AREA-022"),
  ];

  it("lists a card with a feel block under its category, by tower index", () => {
    const groups = soundGroups(cards);
    expect(groups.map((g) => g.category)).toEqual(["Adversary", "Glyph"]);
    expect(groups[1]?.rows.map((r) => r.id)).toEqual(["SND-090", "SND-092"]);
    expect(groups[1]?.rows[0]).toMatchObject({ index: 90, name: "S90", feel: { mood: "dread" } });
    expect(groups[0]?.rows[0]?.feel).toBeNull();
  });

  it("the mood filter hides a card with another mood, and one with no feel", () => {
    const shown = filterSounds(soundGroups(cards), { mood: "dread" });
    expect(shown.flatMap((g) => g.rows.map((r) => r.id))).toEqual(["SND-090"]);
    const threat = filterSounds(soundGroups(cards), { readsAs: "threat" });
    expect(threat.flatMap((g) => g.rows.map((r) => r.id))).toEqual(["SND-090", "SND-092"]);
  });

  it("ignores a filter word that is not a mood or reads-as", () => {
    expect(parseSoundFilter({ mood: "dread", reads: "boom" })).toEqual({ mood: "dread" });
    expect(parseSoundFilter({})).toEqual({});
  });

  it("formats a measured length and leaves an unmeasured one empty", () => {
    expect(formatLength(1850)).toBe("1.9 s");
    expect(formatLength(undefined)).toBeNull();
  });
});
