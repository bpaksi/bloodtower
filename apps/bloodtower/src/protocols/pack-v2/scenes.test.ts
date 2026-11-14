import { describe, expect, it } from "vitest";
import { sceneLabelForPath } from "./scenes.ts";
import { storyPackSchema } from "./story.ts";

const story = (quest: Record<string, unknown>) => ({
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
  chapters: [{ id: "roads", index: 1, kingdoms: ["N"], quests: [quest] }],
});

describe("C3-18 EV-02: a quest holds its place and type", () => {
  it.each(["village", "wild"] as const)("parses and reads back a %s place", (type) => {
    const place = { space: "N-egans-end", type };
    const parsed = storyPackSchema.safeParse(
      story({ id: "herald", quest_type: "ruins", place, scene: "herald" }),
    );
    expect(parsed.success).toBe(true);
    const quest = parsed.data?.chapters[0]?.quests[0];
    expect(quest?.place).toEqual(place);
    expect(quest?.scene).toBe("herald");
  });

  it("refuses an unknown place type, naming the field", () => {
    const parsed = storyPackSchema.safeParse(
      story({ id: "herald", quest_type: "ruins", place: { space: "N-egans-end", type: "sky" } }),
    );
    expect(parsed.success).toBe(false);
    const paths = parsed.error?.issues.map((i) => i.path.join(".")) ?? [];
    expect(paths).toContain("chapters.0.quests.0.place.type");
  });

  it("refuses an unknown key on a quest and on its place, naming the key", () => {
    const onQuest = storyPackSchema.safeParse(
      story({ id: "herald", quest_type: "ruins", where: "N-egans-end" }),
    );
    expect(onQuest.success).toBe(false);
    expect(JSON.stringify(onQuest.error?.issues)).toContain("where");
    const onPlace = storyPackSchema.safeParse(
      story({
        id: "herald",
        quest_type: "ruins",
        place: { space: "N-egans-end", type: "village", kingdom: "N" },
      }),
    );
    expect(onPlace.success).toBe(false);
    const issue = onPlace.error?.issues[0];
    expect(issue?.path.join(".")).toBe("chapters.0.quests.0.place");
    expect(JSON.stringify(issue)).toContain("kingdom");
  });

  it("refuses a place whose space is not a space id", () => {
    const parsed = storyPackSchema.safeParse(
      story({ id: "herald", quest_type: "ruins", place: { space: "village", type: "village" } }),
    );
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.path.join(".")).toBe("chapters.0.quests.0.place.space");
  });

  it("a quest with neither field parses with neither key", () => {
    const parsed = storyPackSchema.safeParse(story({ id: "lost-tomb", quest_type: "tomb" }));
    expect(parsed.success).toBe(true);
    expect(parsed.data?.chapters[0]?.quests[0]).toEqual({ id: "lost-tomb", quest_type: "tomb" });
    expect(parsed.data).not.toHaveProperty("scenes");
    expect(parsed.data).not.toHaveProperty("items");
    expect(parsed.data).not.toHaveProperty("endings");
  });
});

describe("sceneLabelForPath", () => {
  const input = { scenes: [{ id: "ambush", options: [{ id: "fight" }, { id: "toll" }] }] };
  it("names the scene and option behind a schema path", () => {
    expect(sceneLabelForPath(input, "scenes.0.options.1.cost")).toBe("scene ambush option toll");
    expect(sceneLabelForPath(input, "scenes.0.options")).toBe("scene ambush");
    expect(sceneLabelForPath(input, "chapters.0")).toBeUndefined();
  });
});
