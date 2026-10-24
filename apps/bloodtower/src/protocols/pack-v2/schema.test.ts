import { describe, expect, it } from "vitest";
import { baseContentPackSchema } from "./base.ts";
import { storyPackSchema } from "./story.ts";

describe("pack format v2 schema", () => {
  it("uses hero and quest names, not R1 legacy glossary fields", () => {
    const parsed = baseContentPackSchema.safeParse({
      format: 2,
      kind: "base-content",
      pack_id: "base",
      title: "Base",
      version: "0.1.0",
      engine_min: "0.1.0",
      heroes: [
        {
          id: "hero-a",
          name: "Hero A",
          role: "fighter",
          might: 5,
          stealth: 2,
          magic: 1,
          wits: 2,
          ability: "Duel",
          portrait: "por.hero-a",
          voice: "vo.hero-a",
        },
      ],
      building_types: [{ id: "citadel", name: "Citadel" }],
      quest_types: [{ id: "tomb", name: "Tomb" }],
      board: {
        kingdoms: [
          { id: "N", name: "Arisilon", label: "Arisilon (N)" },
          { id: "E", name: "Brynthia", label: "Brynthia (E)" },
          { id: "S", name: "Durnin", label: "Durnin (S)" },
          { id: "W", name: "Zenon", label: "Zenon (W)" },
        ],
        spaces: [
          {
            id: "N-radiant-mountains",
            name: "Radiant Mountains",
            kingdom: "N",
            terrain: "mountains",
            building: "citadel",
            adjacent: [],
          },
        ],
      },
    });
    expect(parsed.success).toBe(true);
    const story = storyPackSchema.safeParse({
      format: 2,
      kind: "story",
      pack_id: "test",
      title: "Test",
      version: "0.1.0",
      engine_min: "0.1.0",
      base_pack: "base",
      players: { min: 1, max: 4 },
      day: { move_roll: { dice: "2d4", floor: 2, modifiers: false } },
      start: {
        mode: "one-per-kingdom-citadel",
        assignments: [{ hero: "hero-a", kingdom: "N" }],
      },
      chapters: [
        {
          id: "proving-grounds",
          index: 1,
          kingdoms: ["N"],
          quests: [{ id: "sample-quest", quest_type: "tomb" }],
        },
      ],
    });
    expect(story.success).toBe(true);
  });
});
