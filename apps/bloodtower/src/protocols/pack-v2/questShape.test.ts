import { describe, expect, it } from "vitest";
import { flagCoverageIssues } from "./semantic.ts";
import { type StoryPack, storyPackSchema } from "./story.ts";

const story = (
  quests: Array<Record<string, unknown>>,
  chapter3: Array<Record<string, unknown>> = [],
) => ({
  format: 2,
  kind: "story",
  pack_id: "test",
  title: "Test",
  version: "0.1.0",
  engine_min: "0.1.0",
  base_pack: "base",
  players: { min: 1, max: 4 },
  day: { move_roll: { dice: "2d4", floor: 2, modifiers: false } },
  start: { mode: "one-per-kingdom-citadel", assignments: [{ hero: "hero-a", kingdom: "N" }] },
  chapters: [
    { id: "roads", index: 1, kingdoms: ["N"], quests },
    { id: "keep", index: 3, kingdoms: ["N"], quests: chapter3 },
  ],
});

const parse = (
  quests: Array<Record<string, unknown>>,
  chapter3: Array<Record<string, unknown>> = [],
): StoryPack => {
  const parsed = storyPackSchema.safeParse(story(quests, chapter3));
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error.issues));
  return parsed.data;
};

const place = (space: string) => ({ space, type: "wild" });

describe("C3-19 quest type and one quest per space", () => {
  it("EV-01: a scene quest with no quest_type parses and has no type", () => {
    const pack = parse([{ id: "herald", scene: "herald" }]);
    const quest = pack.chapters[0]?.quests[0];
    expect(quest).toEqual({ id: "herald", scene: "herald" });
    expect(quest?.quest_type).toBeUndefined();
  });

  it("EV-02: a quest with neither type nor scene fails lint, naming its id", () => {
    const issues = flagCoverageIssues(parse([{ id: "bare" }]));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("bare");
    expect(flagCoverageIssues(parse([{ id: "tomb", quest_type: "tomb" }]))).toEqual([]);
    expect(flagCoverageIssues(parse([{ id: "herald", scene: "herald" }]))).toEqual([]);
  });

  it("EV-05: two quests on one space fail lint naming both ids, across chapters too", () => {
    const same = parse(
      [{ id: "herald", scene: "h", place: place("N-a") }],
      [{ id: "lock", scene: "l", place: place("N-a") }],
    );
    const issues = flagCoverageIssues(same);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("herald");
    expect(issues[0]?.message).toContain("lock");
    const apart = parse(
      [{ id: "herald", scene: "h", place: place("N-a") }],
      [{ id: "lock", scene: "l", place: place("N-b") }],
    );
    expect(flagCoverageIssues(apart)).toEqual([]);
  });
});
