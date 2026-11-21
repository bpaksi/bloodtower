import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadStoryCatalog } from "./loadStories.ts";

const packsDir = join(import.meta.dirname, "../../../../../packs");

const storyOf = (catalog: ReturnType<typeof loadStoryCatalog>, id: string) =>
  catalog.stories.find((story) => story.card.id === id);

const copyPacks = (): string => {
  const root = mkdtempSync(join(tmpdir(), "story-play-"));
  for (const id of ["base", "test", "dracula"]) {
    cpSync(join(packsDir, id), join(root, id), { recursive: true });
  }
  return root;
};

describe("the loader gives a story its quests and chapter plan (F1/03)", () => {
  it("EV-01: The Ruined Keep has its quests, scenes and chapter plan; the Dracula door has none", () => {
    const catalog = loadStoryCatalog(packsDir);
    expect(catalog.issues).toEqual([]);
    const play = storyOf(catalog, "test")?.play;
    expect(play).toBeDefined();
    if (!play) return;
    const quests = play.quests.chapters.map((chapter) => ({
      index: chapter.index,
      quests: chapter.quests.map((q) => [q.id, q.scene, q.place?.space]),
    }));
    expect(quests).toEqual([
      {
        index: 1,
        quests: [
          ["herald", "herald", "N-egans-end"],
          ["ambush", "ambush", "N-muted-forest"],
        ],
      },
      {
        index: 2,
        quests: [
          ["barrow", undefined, "E-utars-barrows"],
          ["shrine", "shrine", "E-greater-tombstones"],
        ],
      },
      {
        index: 3,
        quests: [
          ["lock", "lock", "S-howling-desert"],
          ["last-stand", "last-stand", "W-the-grass-sea"],
        ],
      },
    ]);
    expect((play.quests.scenes ?? []).map((scene) => scene.id).sort()).toEqual(
      ["ambush", "herald", "last-stand", "lock", "shrine", "tower-end"].sort(),
    );
    const plan = play.chapters;
    expect(plan).not.toBeNull();
    expect(plan?.chapters).toEqual([
      {
        id: "the-roads",
        index: 1,
        kingdoms: ["N"],
        quests: [
          { id: "herald", spaceId: "N-egans-end" },
          { id: "ambush", spaceId: "N-muted-forest" },
        ],
      },
      {
        id: "the-keep",
        index: 2,
        kingdoms: ["N", "E"],
        quests: [
          { id: "barrow", spaceId: "E-utars-barrows" },
          { id: "shrine", spaceId: "E-greater-tombstones" },
        ],
      },
      {
        id: "the-tower",
        index: 3,
        kingdoms: ["N", "E", "S", "W"],
        quests: [
          { id: "lock", spaceId: "S-howling-desert" },
          { id: "last-stand", spaceId: "W-the-grass-sea" },
        ],
      },
    ]);
    expect(plan?.seals).toEqual([]);
    expect(plan?.c3EndAfterChapter1).toBe(true);
    expect(plan?.foeLevel).toEqual({ chapter1: 1, perChapter: 1 });
    expect(plan?.sealBreakMin).toBe(0);
    expect(storyOf(catalog, "dracula")?.play).toBeUndefined();
  });

  it("EV-02: an unplaced quest is not in its chapter's goal, and the plan reads tuning.yaml", () => {
    const root = copyPacks();
    try {
      const manifest = join(root, "test", "pack.yaml");
      const original = readFileSync(manifest, "utf8");
      const edited = original.replace(
        "{id: ambush, scene: ambush, place: {space: N-muted-forest, type: wild}}",
        "{id: ambush, scene: ambush}",
      );
      expect(edited).not.toBe(original);
      writeFileSync(manifest, edited);
      const catalog = loadStoryCatalog(root);
      expect(catalog.issues).toEqual([]);
      const play = storyOf(catalog, "test")?.play;
      expect(play?.chapters?.chapters[0]?.quests).toEqual([
        { id: "herald", spaceId: "N-egans-end" },
      ]);
      expect(play?.quests.chapters[0]?.quests.map((q) => [q.id, q.scene])).toContainEqual([
        "ambush",
        "ambush",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }

    const tuned = copyPacks();
    try {
      const tuning = join(tuned, "base", "tuning.yaml");
      const original = readFileSync(tuning, "utf8");
      const edited = original
        .replace("c3_end_after_chapter_1: true", "c3_end_after_chapter_1: false")
        .replace("chapter_1: 1", "chapter_1: 2");
      expect(edited).not.toBe(original);
      writeFileSync(tuning, edited);
      const catalog = loadStoryCatalog(tuned);
      const plan = storyOf(catalog, "test")?.play?.chapters;
      expect(plan?.c3EndAfterChapter1).toBe(false);
      expect(plan?.foeLevel.chapter1).toBe(2);
    } finally {
      rmSync(tuned, { recursive: true, force: true });
    }
  });
});
