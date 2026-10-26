import { describe, expect, it } from "vitest";
import {
  applyChange,
  carryOver,
  emptyDraft,
  exportSounds,
  isReviewed,
  LENGTH_MAX_MS,
  ModelError,
  oldTone,
  SOUNDS_LIKE_MAX,
} from "./model.ts";

const COUNT = 113;

const codeOf = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    if (error instanceof ModelError) return error.code;
    throw error;
  }
  return undefined;
};

describe("applyChange", () => {
  it("sets each field, keeps the ones left out, and stamps the time", () => {
    const draft = emptyDraft();
    applyChange(draft, { index: 1, soundsLike: "  growl, hound " }, COUNT, 10);
    applyChange(draft, { index: 1, tone: "bad" }, COUNT, 20);
    const record = applyChange(draft, { index: 1, lengthMs: 3635 }, COUNT, 30);
    expect(record).toEqual({
      index: 1,
      soundsLike: "growl, hound",
      tone: "bad",
      lengthMs: 3635,
      updatedAt: 30,
    });
    expect(draft.sounds["1"]).toEqual(record);
  });

  it("clears a field with null, and drops sounds like of only spaces", () => {
    const draft = emptyDraft();
    applyChange(draft, { index: 2, soundsLike: "coins", tone: "good", lengthMs: 10 }, COUNT, 1);
    const record = applyChange(
      draft,
      { index: 2, soundsLike: "   ", tone: null, lengthMs: null },
      COUNT,
      2,
    );
    expect(record).toEqual({ index: 2, updatedAt: 2 });
    expect(isReviewed(record)).toBe(false);
  });

  it("refuses a sound, tone, length or text the tool does not accept", () => {
    const draft = emptyDraft();
    expect(codeOf(() => applyChange(draft, { index: 0 }, COUNT, 1))).toBe("bad-sound");
    expect(codeOf(() => applyChange(draft, { index: COUNT + 1 }, COUNT, 1))).toBe("bad-sound");
    expect(codeOf(() => applyChange(draft, { index: 1.5 }, COUNT, 1))).toBe("bad-sound");
    expect(codeOf(() => applyChange(draft, { index: 1, tone: "dread" as never }, COUNT, 1))).toBe(
      "bad-tone",
    );
    for (const lengthMs of [0, -5, 1.5, LENGTH_MAX_MS + 1]) {
      expect(codeOf(() => applyChange(draft, { index: 1, lengthMs }, COUNT, 1))).toBe("bad-length");
    }
    expect(
      codeOf(() =>
        applyChange(draft, { index: 1, soundsLike: "x".repeat(SOUNDS_LIKE_MAX + 1) }, COUNT, 1),
      ),
    ).toBe("bad-sounds-like");
    expect(codeOf(() => applyChange(draft, { index: 1, soundsLike: 5 as never }, COUNT, 1))).toBe(
      "bad-sounds-like",
    );
    expect(draft.sounds).toEqual({});
  });
});

describe("exportSounds", () => {
  it("lists reviewed sounds by index with card IDs, leaving out what was not entered", () => {
    const draft = emptyDraft();
    applyChange(draft, { index: 10, tone: "bad" }, COUNT, 1);
    applyChange(draft, { index: 2, soundsLike: "coins", lengthMs: 2475 }, COUNT, 1);
    applyChange(draft, { index: 5, soundsLike: "" }, COUNT, 1);
    expect(exportSounds(draft)).toEqual({
      version: 2,
      sounds: [
        { id: "SND-002", index: 2, soundsLike: "coins", lengthMs: 2475 },
        { id: "SND-010", index: 10, tone: "bad" },
      ],
    });
  });
});

describe("carry over from tower-poc", () => {
  const row = { index: 1, mood: null, readsAs: null, lengthMs: null, note: null, updatedAt: 5 };

  it("takes a tone only when the old picks point one way", () => {
    expect(oldTone({ mood: "triumph", readsAs: "reward" })).toBe("good");
    expect(oldTone({ mood: "dread", readsAs: "arrival" })).toBe("bad");
    expect(oldTone({ mood: "tension", readsAs: "alert" })).toBe("bad");
    expect(oldTone({ mood: null, readsAs: "threat" })).toBe("bad");
    expect(oldTone({ mood: "dread", readsAs: "reward" })).toBeUndefined();
    expect(oldTone({ mood: "mystery", readsAs: null })).toBeUndefined();
    expect(oldTone({ mood: null, readsAs: null })).toBeUndefined();
  });

  it("moves the note to sounds like, keeps the length, and drops rows left with nothing", () => {
    const draft = carryOver([
      { ...row, index: 1, mood: "dread", readsAs: "threat", lengthMs: 3635, note: " growl " },
      { ...row, index: 113, mood: "mystery" },
      { ...row, index: 7, lengthMs: 2417 },
    ]);
    expect(draft.sounds).toEqual({
      "1": { index: 1, soundsLike: "growl", tone: "bad", lengthMs: 3635, updatedAt: 5 },
      "7": { index: 7, lengthMs: 2417, updatedAt: 5 },
    });
  });
});
