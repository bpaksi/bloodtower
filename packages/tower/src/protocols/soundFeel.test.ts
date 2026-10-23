import { describe, expect, it } from "vitest";
import { SOUND_COUNT } from "./inventory.ts";
import {
  buildSoundFeelExport,
  SOUND_MOODS,
  type SoundFeelRow,
  soundCardId,
  soundFeelExportSchema,
  soundFeelRecordPayloadSchema,
} from "./soundFeel.ts";

const row = (index: number, fields: Partial<SoundFeelRow> = {}): SoundFeelRow => ({
  index,
  mood: null,
  readsAs: null,
  strength: null,
  lengthMs: null,
  answerLengthMs: null,
  note: null,
  updatedAt: 1,
  client: "iPad",
  ...fields,
});

describe("soundFeel.record payload (D25)", () => {
  const ok = (payload: unknown) => soundFeelRecordPayloadSchema.safeParse(payload).success;

  it("takes the game design's nine moods, mystery and menace included", () => {
    expect(SOUND_MOODS).toHaveLength(9);
    for (const mood of SOUND_MOODS) expect(ok({ index: 1, mood }), mood).toBe(true);
  });

  it("takes every sound the tower has and no other", () => {
    expect(SOUND_COUNT).toBe(113);
    expect(ok({ index: 1 })).toBe(true);
    expect(ok({ index: 113 })).toBe(true);
    expect(ok({ index: 0 })).toBe(false);
    expect(ok({ index: 114 })).toBe(false);
  });

  it("refuses a word outside the lists, a length outside 1 ms to a minute, and an unknown field", () => {
    expect(ok({ index: 1, mood: "spooky" })).toBe(false);
    expect(ok({ index: 1, readsAs: "boom" })).toBe(false);
    expect(ok({ index: 1, strength: "loud" })).toBe(false);
    expect(ok({ index: 1, lengthMs: 0 })).toBe(false);
    expect(ok({ index: 1, answerLengthMs: 60_001 })).toBe(false);
    expect(ok({ index: 1, lengthMs: 1.5 })).toBe(false);
    expect(ok({ index: 1, avoid: true })).toBe(false);
    expect(ok({ index: 1, note: "x".repeat(501) })).toBe(false);
  });

  it("takes null as clearing a field", () => {
    expect(
      soundFeelRecordPayloadSchema.parse({ index: 1, mood: null, lengthMs: null, note: null }),
    ).toEqual({ index: 1, mood: null, lengthMs: null, note: null });
  });
});

describe("sound-feel.json", () => {
  it("names each sound by its card ID", () => {
    expect(soundCardId(7)).toBe("SND-007");
    expect(soundCardId(113)).toBe("SND-113");
  });

  it("lists rows by index, leaves out what was never recorded, and drops an empty row", () => {
    const exported = buildSoundFeelExport([
      row(92, { mood: "menace", readsAs: "threat" }),
      row(50),
      row(7, { lengthMs: 2300, answerLengthMs: 2240, note: "rot" }),
    ]);
    expect(exported).toEqual({
      version: 1,
      sounds: [
        { id: "SND-007", index: 7, lengthMs: 2300, answerLengthMs: 2240, note: "rot" },
        { id: "SND-092", index: 92, mood: "menace", readsAs: "threat" },
      ],
    });
    expect(soundFeelExportSchema.safeParse(exported).success).toBe(true);
  });

  it("never writes a length as 0 or a note as empty", () => {
    const text = JSON.stringify(buildSoundFeelExport([row(1, { mood: "calm" })]));
    expect(text).not.toMatch(/Ms":0|"note":""/);
    expect(text).not.toContain("null");
  });
});
