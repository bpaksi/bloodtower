import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateAssetsFolder } from "./assets.ts";
import type { PackV2LoadIssue } from "./v2/load.ts";

const roots: string[] = [];
const packWith = (files: Record<string, string>, dirs: string[] = []): PackV2LoadIssue[] => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "bt-v1-")));
  roots.push(root);
  mkdirSync(join(root, "assets"));
  for (const d of dirs) mkdirSync(join(root, "assets", d));
  for (const [name, data] of Object.entries(files)) writeFileSync(join(root, "assets", name), data);
  const issues: PackV2LoadIssue[] = [];
  validateAssetsFolder(root, (i) => issues.push(i));
  return issues;
};

afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
});

describe("V-1 assets folder", () => {
  it("still allows images only", () => {
    expect(packWith({ "a.png": "x", "b.jpg": "x", "c.webp": "x" })).toEqual([]);
    const issues = packWith({ "notes.txt": "x" });
    expect(issues.map((i) => i.file)).toEqual(["assets/notes.txt"]);
  });

  it("allows the exact name index.json and .m4a sounds (A1 step 3)", () => {
    expect(packWith({ "index.json": "{}", "door.m4a": "x", "DOOR.M4A": "x" })).toEqual([]);
  });

  it("names the fix for a leftover temp file of an interrupted assets:pack", () => {
    const name = `${"a".repeat(64)}.webp.tmp-4242`;
    const issues = packWith({ [name]: "x", "index.json.tmp-7": "x" });
    expect(issues).toHaveLength(2);
    for (const item of issues) {
      expect(item.rule).toBe("V-1");
      expect(item.message).toContain("assets:pack");
      expect(item.message).toContain("again or delete assets/");
    }
    expect(issues[0]?.message).toContain(name);
  });

  it("rejects other json, other audio and subfolders", () => {
    const issues = packWith({ "index.json.bak": "x", "other.json": "x", "door.mp3": "x" }, ["sub"]);
    expect(issues.map((i) => i.file).sort()).toEqual([
      "assets/door.mp3",
      "assets/index.json.bak",
      "assets/other.json",
      "assets/sub",
    ]);
  });
});
