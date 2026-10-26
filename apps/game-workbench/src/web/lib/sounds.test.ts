import { describe, expect, it } from "vitest";
import { parseCard } from "./cards.ts";
import { TONES } from "./feel.ts";
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
  it("accepts a full feel block with each tone", () => {
    for (const tone of TONES) {
      const c = sound(
        90,
        "AREA-030",
        `\nfeel:\n  soundsLike: low growl, hound\n  tone: ${tone}\n  lengthMs: 2300`,
      );
      expect(c.data.feel).toEqual({ soundsLike: "low growl, hound", tone, lengthMs: 2300 });
    }
    expect(TONES).toEqual(["good", "bad", "neutral"]);
  });

  it("rejects an unknown tone or field, including the old mood, readsAs, strength and note", () => {
    expect(() => sound(1, "AREA-022", "\nfeel:\n  tone: spooky")).toThrow(/unknown tone "spooky"/);
    for (const old of ["mood: dread", "readsAs: threat", "strength: strong", "note: x"]) {
      expect(() => sound(1, "AREA-022", `\nfeel:\n  ${old}`)).toThrow(/unknown feel field/);
    }
    expect(() => sound(1, "AREA-022", "\nfeel:\n  answerLengthMs: 2240")).toThrow(
      /unknown feel field/,
    );
  });

  it("rejects a bad length or sounds like, a feel on a card that is not a sound, and a feel that is not a block", () => {
    expect(() => sound(1, "AREA-022", "\nfeel:\n  lengthMs: 0")).toThrow(/lengthMs/);
    expect(() => sound(1, "AREA-022", "\nfeel:\n  lengthMs: 1.5")).toThrow(/lengthMs/);
    expect(() => sound(1, "AREA-022", "\nfeel:\n  soundsLike: 5")).toThrow(/soundsLike/);
    expect(() => card("IDEA-001.md", "type: idea\ntitle: x\nfeel:\n  tone: bad")).toThrow(
      /only for sound cards/,
    );
    expect(() => sound(1, "AREA-022", "\nfeel: bad")).toThrow(/must be a block/);
  });
});

describe("/sounds rows", () => {
  const cards = [
    area("AREA-022", "Tower sounds: Adversary"),
    area("AREA-030", "Tower sounds: Glyph"),
    sound(92, "AREA-030", "\nfeel:\n  tone: good"),
    sound(90, "AREA-030", "\nfeel:\n  tone: bad\n  lengthMs: 1850"),
    sound(1, "AREA-022"),
  ];

  it("lists a card with a feel block under its category, by tower index", () => {
    const groups = soundGroups(cards);
    expect(groups.map((g) => g.category)).toEqual(["Adversary", "Glyph"]);
    expect(groups[1]?.rows.map((r) => r.id)).toEqual(["SND-090", "SND-092"]);
    expect(groups[1]?.rows[0]).toMatchObject({ index: 90, name: "S90", feel: { tone: "bad" } });
    expect(groups[0]?.rows[0]?.feel).toBeNull();
  });

  it("the tone filter hides a card with another tone, and one with no feel", () => {
    const shown = filterSounds(soundGroups(cards), { tone: "bad" });
    expect(shown.flatMap((g) => g.rows.map((r) => r.id))).toEqual(["SND-090"]);
    expect(filterSounds(soundGroups(cards), {})).toHaveLength(2);
  });

  it("ignores a filter word that is not a tone", () => {
    expect(parseSoundFilter({ tone: "bad" })).toEqual({ tone: "bad" });
    expect(parseSoundFilter({ tone: "dread" })).toEqual({});
    expect(parseSoundFilter({})).toEqual({});
  });

  it("throws on a repeated tone param instead of ignoring it", () => {
    expect(() => parseSoundFilter({ tone: ["bad", "good"] })).toThrow(
      "tone query param must be a single value",
    );
  });

  it("formats a measured length and leaves an unmeasured one empty", () => {
    expect(formatLength(1850)).toBe("1.9 s");
    expect(formatLength(undefined)).toBeNull();
  });
});
