import { describe, expect, it } from "vitest";
import { assetIdSchema, storyPackSchema } from "./index.ts";

describe("assetIdSchema allows <base>~<variant> (A1 8b-1, D48)", () => {
  it.each(["place.village", "seal-break.01~vo-01", "portrait.guide~friendly", "a", "x@2.png"])(
    "accepts %s",
    (id) => {
      expect(assetIdSchema.safeParse(id).success).toBe(true);
    },
  );

  it.each([
    "seal-break.01~",
    "~vo-01",
    "a~b~c",
    "a~~b",
    "a~/b",
    "a~..b",
    "a/b~c",
    "a\\b~c",
    "a~B",
    "a~-b",
    "",
  ])("rejects %s", (id) => {
    expect(assetIdSchema.safeParse(id).success).toBe(false);
  });
});

describe("a line asset row names speaker and text together, on a line only", () => {
  const base = {
    format: 2,
    kind: "story",
    pack_id: "x",
    title: "X",
    version: "0.1.0",
    engine_min: "0.1.0",
    base_pack: "base",
    playable: false,
    players: { min: 1, max: 4 },
    settings: [],
    day: { move_roll: { dice: "2d4", floor: 2, modifiers: false } },
    start: { mode: "one-per-kingdom-citadel", assignments: [{ hero: "hero-a", kingdom: "N" }] },
    chapters: [{ id: "c", index: 1, kingdoms: ["N"], timed_beats: [], quests: [] }],
  };
  const row = (extra: Record<string, unknown>) => ({
    ...base,
    assets: [{ id: "a.b~c", target: "storyboard", status: "placeholder", ...extra }],
  });
  const ok = (extra: Record<string, unknown>) => {
    return storyPackSchema.safeParse(row(extra)).success;
  };

  it("accepts speaker plus text on a line, and neither", () => {
    expect(ok({ type: "line", speaker: "narrator", text: "Hello." })).toBe(true);
    expect(ok({ type: "line" })).toBe(true);
  });

  it("rejects one without the other, and either on another type", () => {
    expect(ok({ type: "still" })).toBe(true); // control: the base fixture itself is valid
    expect(ok({ type: "line", speaker: "narrator" })).toBe(false);
    expect(ok({ type: "line", text: "Hello." })).toBe(false);
    expect(ok({ type: "still", speaker: "narrator", text: "Hello." })).toBe(false);
  });
});
