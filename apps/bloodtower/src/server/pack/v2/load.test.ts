import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../../config.ts";
import { loadStoryCatalog } from "../../core/loadStories.ts";
import { lintPath } from "../../scripts/packLint.ts";
import { loadPackV2Dir } from "./load.ts";

const packsDir = loadConfig().packsDir;
const serverPackDir = join(import.meta.dirname, "..");

const copyPacks = (...ids: string[]) => {
  const root = mkdtempSync(join(tmpdir(), "bloodtower-v2-load-"));
  for (const id of ids) cpSync(join(packsDir, id), join(root, id), { recursive: true });
  return root;
};

describe("every story loads through the v2 loader (C3-01 EV-01)", () => {
  it("loads every shipped story: packs/test in full, Dracula as metadata only", () => {
    const test = loadPackV2Dir(join(packsDir, "test"), packsDir);
    expect(test.ok).toBe(true);
    if (!test.ok || test.kind !== "story") throw new Error("packs/test is a story pack");
    expect(test.pack.pack_id).toBe("test");
    expect(test.pack.chapters.length).toBeGreaterThan(0);
    expect(test.base.pack_id).toBe("base");

    const dracula = loadPackV2Dir(join(packsDir, "dracula"), packsDir);
    expect(dracula.ok).toBe(true);
    if (!dracula.ok || dracula.kind !== "metadata") throw new Error("dracula is metadata only");
    expect(dracula.pack.playable).toBe(false);
    expect(dracula.pack.title).toBe("The Count of Vellmoor");
    expect(dracula.assets.packId).toBe("dracula");
    expect(dracula.assets.byBasename.has("cover.png")).toBe(true);
  });

  it("validates no story content for a playable: false pack", () => {
    const root = copyPacks("dracula");
    try {
      writeFileSync(join(root, "dracula", "script.yaml"), ":\n  - [\n");
      writeFileSync(join(root, "dracula", "cast.yaml"), "`not yaml\n");
      const result = loadPackV2Dir(join(root, "dracula"), root);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.kind).toBe("metadata");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reaches the host catalog only through v2: the v1 loader is not in the module graph", async () => {
    expect(existsSync(join(serverPackDir, "load.ts"))).toBe(false);
    const missing = "../load.ts";
    await expect(import(/* @vite-ignore */ missing)).rejects.toThrow();
    const catalog = loadStoryCatalog(packsDir);
    expect(catalog.issues).toEqual([]);
    expect(catalog.stories.map((story) => [story.card.id, story.card.playable])).toEqual([
      ["dracula", false],
      ["test", true],
    ]);
  });

  it("refuses a playable pack that is not format 2", () => {
    const root = copyPacks("base", "test");
    try {
      const manifest = join(root, "test", "pack.yaml");
      writeFileSync(manifest, readFileSync(manifest, "utf8").replace("format: 2\n", ""));
      const result = loadPackV2Dir(join(root, "test"), root);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.issues.some((item) => item.path === "format")).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a metadata-only pack that carries story fields", () => {
    const root = copyPacks("dracula");
    try {
      const manifest = join(root, "dracula", "pack.yaml");
      writeFileSync(manifest, `${readFileSync(manifest, "utf8")}hunters: []\n`);
      const result = loadPackV2Dir(join(root, "dracula"), root);
      expect(result.ok).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("dracula offers short and standard only", () => {
    const result = loadPackV2Dir(join(packsDir, "dracula"), packsDir);
    expect(result.ok).toBe(true);
    if (!result.ok || result.kind !== "metadata") return;
    const length = result.pack.settings.find((setting) => setting.id === "length");
    expect(length?.options.map((option) => option.id)).toEqual(["short", "standard"]);
    expect(length?.default).toBe("standard");
  });

  it("passes pack:lint for the v2 test pack and Dracula's metadata", () => {
    const ok = lintPath(join(packsDir, "test"), process.cwd());
    expect(ok.exitCode).toBe(0);
    expect(ok.lines[0]).toMatch(/OK test 0\.1\.0 \(format v2\)/);
    const dracula = lintPath(join(packsDir, "dracula"), process.cwd());
    expect(dracula.exitCode).toBe(0);
    expect(dracula.lines[0]).toMatch(/OK dracula .* \(metadata only\)/);
  });
});

describe("a broken v2 pack fails loudly (C3-01 EV-04)", () => {
  // A copy of packs/test with one quest in quests.yaml whose `chapter:` is ch-9, which no chapter
  // declares.
  const writeQuests = (root: string, chapter: string) =>
    writeFileSync(
      join(root, "test", "quests.yaml"),
      `- {id: lost-tomb, quest_type: tomb, chapter: ${chapter}}\n`,
    );

  it("loads the same copy when the quest names a declared chapter (control)", () => {
    const root = copyPacks("base", "test");
    try {
      writeQuests(root, "proving-grounds");
      const result = loadPackV2Dir(join(root, "test"), root);
      expect(result.ok).toBe(true);
      if (!result.ok || result.kind !== "story") return;
      expect(result.pack.chapters[0]?.quests.map((quest) => quest.id)).toEqual(["lost-tomb"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns a lint issue on quests.yaml for id ch-9", () => {
    const root = copyPacks("base", "test");
    try {
      writeQuests(root, "ch-9");
      const result = loadPackV2Dir(join(root, "test"), root);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      const found = result.issues.find((item) => item.id === "ch-9");
      expect(found?.file.endsWith("quests.yaml")).toBe(true);
      expect(found?.rule).toBe("P2-2");
      expect(found?.message).toContain("ch-9");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("lists the story as Not ready (not playable), reports the issue, and does not throw", () => {
    const root = copyPacks("base", "test", "dracula");
    try {
      writeQuests(root, "ch-9");
      const catalog = loadStoryCatalog(root);
      expect(catalog.stories.map((story) => [story.card.id, story.card.playable])).toEqual([
        ["dracula", false],
        ["test", false],
      ]);
      expect(catalog.stories.find((story) => story.card.id === "test")?.card.title).toBe(
        "Proving Grounds",
      );
      expect(catalog.defaultPlay).toBeNull();
      expect(
        catalog.issues.some((item) => item.file.endsWith("quests.yaml") && item.id === "ch-9"),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports a folder with no manifest instead of dropping it", () => {
    const root = copyPacks("base", "test");
    try {
      const catalog = loadStoryCatalog(root);
      expect(catalog.issues).toEqual([]);
      mkdtempSync(join(root, "empty-"));
      const again = loadStoryCatalog(root);
      expect(again.stories.map((story) => story.card.id)).toEqual(["test"]);
      expect(again.issues.some((item) => item.file.includes("empty-"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
