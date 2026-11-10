import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { initialShellState } from "../../engine/loops/session/state.ts";
import { projectShellView } from "../../engine/loops/session/view.ts";
import { project } from "../../engine/views/project.ts";
import { loadStoryCatalog } from "./loadStories.ts";

const packsDir = join(import.meta.dirname, "../../../../../packs");

const pickStoryDoors = (catalog: ReturnType<typeof loadStoryCatalog>) => {
  const state = initialShellState({ sessionId: "s", seed: "seed", stories: catalog.stories });
  state.screen = "pick-story";
  return project(projectShellView(state), { kind: "device", deviceId: "ipad-0" }).doors;
};

describe("Pick story doors (C2-14, EV-03)", () => {
  it("has one door per story pack, Dracula not playable, and no load error", () => {
    const catalog = loadStoryCatalog(packsDir);
    expect(catalog.issues).toEqual([]);
    expect(catalog.stories.map((story) => [story.card.id, story.card.playable])).toEqual([
      ["dracula", false],
      ["test", true],
    ]);
    expect(pickStoryDoors(catalog)).toEqual([
      { id: "dracula", title: "The Count of Vellmoor", focus: false },
      { id: "test", title: "The Ruined Keep", focus: true },
    ]);
  });

  it("reports a malformed pack with its id and keeps the other doors", () => {
    const root = mkdtempSync(join(tmpdir(), "pick-story-doors-"));
    try {
      for (const id of ["base", "test", "dracula"]) {
        cpSync(join(packsDir, id), join(root, id), { recursive: true });
      }
      mkdirSync(join(root, "broken"));
      writeFileSync(join(root, "broken", "pack.yaml"), "`not yaml\n");
      const catalog = loadStoryCatalog(root);
      expect(catalog.stories.map((story) => story.card.id)).toEqual(["dracula", "test"]);
      expect(pickStoryDoors(catalog)?.map((door) => door.id)).toEqual(["dracula", "test"]);
      expect(catalog.issues.length).toBeGreaterThan(0);
      expect(
        catalog.issues.every((item) => item.file.includes("broken") || item.file === "pack.yaml"),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports a pack whose id cannot be a door instead of dropping it silently", () => {
    const root = mkdtempSync(join(tmpdir(), "pick-story-doors-"));
    try {
      for (const id of ["base", "test"]) {
        cpSync(join(packsDir, id), join(root, id), { recursive: true });
      }
      const manifest = join(root, "test", "pack.yaml");
      const original = readFileSync(manifest, "utf8");
      writeFileSync(manifest, original.replace(/^pack_id: .*$/m, "pack_id: Bad_Id"));
      const catalog = loadStoryCatalog(root);
      expect(catalog.stories).toEqual([]);
      expect(catalog.issues.some((item) => item.path === "pack_id")).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports a non-format-2 pack that cannot be read instead of dropping it silently", () => {
    const root = mkdtempSync(join(tmpdir(), "pick-story-doors-"));
    try {
      for (const id of ["base", "test"]) {
        cpSync(join(packsDir, id), join(root, id), { recursive: true });
      }
      mkdirSync(join(root, "empty-door"));
      const catalog = loadStoryCatalog(root);
      expect(catalog.stories.map((story) => story.card.id)).toEqual(["test"]);
      expect(catalog.issues.length).toBeGreaterThan(0);
      expect(catalog.issues.some((item) => item.file.includes("empty-door"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
