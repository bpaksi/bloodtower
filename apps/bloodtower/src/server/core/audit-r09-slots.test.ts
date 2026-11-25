/**
 * Audit R09: lint and validation of the story slot decisions that exist today (DEC-535, DEC-536,
 * DEC-538, DEC-596). Unknown keys, a removed reference, and the most specific candidate first. The required-slot lint, per-variant art fallback and a chapter layer
 * that removes a runtime-held entry have no engine code yet; they are not covered here.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { assetImageCandidates } from "../pack/assets.ts";
import { loadPackV2Dir } from "../pack/v2/load.ts";

const packs = join(import.meta.dirname, "../../../../../packs");

/** A temp copy of the test story and the base pack, with `edit` applied to the story manifest. */
const withManifest = (edit: (manifest: Record<string, unknown>) => void) => {
  const root = mkdtempSync(join(tmpdir(), "audit-r09-"));
  cpSync(join(packs, "test"), join(root, "test"), { recursive: true });
  cpSync(join(packs, "base"), join(root, "base"), { recursive: true });
  const file = join(root, "test", "pack.yaml");
  const manifest = parseYaml(readFileSync(file, "utf8")) as Record<string, unknown>;
  edit(manifest);
  writeFileSync(file, stringifyYaml(manifest));
  const result = loadPackV2Dir(join(root, "test"), root);
  rmSync(root, { recursive: true, force: true });
  return result;
};

describe("audit R09: slot lint (DEC-535, DEC-536)", () => {
  it("R09-01 an unknown key at the top of the story is refused, naming the key", () => {
    const result = withManifest((m) => {
      m.hero_pool = ["a"];
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((i) => `${i.rule} ${i.path} ${i.message}`).join("\n")).toContain(
      "hero_pool",
    );
  });

  it("R09-02 an unknown key inside a chapter is refused, naming the key", () => {
    const result = withManifest((m) => {
      const chapters = m.chapters as Record<string, unknown>[];
      const first = chapters[0];
      if (!first) throw new Error("no chapter");
      first.core_rule = "skip";
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((i) => i.message).join("\n")).toContain("core_rule");
  });

  it("R09-03 a removed reference: a chapter that reads a flag nothing sets is refused", () => {
    const result = withManifest((m) => {
      // The setter was renamed away: the chapter's read now points at nothing (a removed reference).
      const game = m.game as { start: { effects: { flag: string }[] } };
      const setter = game.start.effects[0];
      if (!setter) throw new Error("no start effect");
      setter.flag = "renamed-flag";
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((i) => `${i.rule} ${i.path}`)).toContain("P2-3 chapters.0.end.when");
  });
});

describe("audit R09: the most specific candidate first (DEC-596)", () => {
  const names = (asset: Parameters<typeof assetImageCandidates>[0]) => assetImageCandidates(asset);

  it("R09-04 the row's own path comes before its id, and the id before the dotted-id form", () => {
    const list = names({ id: "keep.gate", type: "still", path: "art/gate.png" } as never);
    expect(list[0]).toBe("art/gate.png");
    expect(list.indexOf("keep.gate.png")).toBeGreaterThan(list.indexOf("art/gate.png"));
    expect(list.indexOf("keep-gate.png")).toBeGreaterThan(list.indexOf("keep.gate.png"));
  });

  it("R09-05 a row with no path falls back to its id, and no name repeats", () => {
    const list = names({ id: "keep-gate", type: "still" } as never);
    expect(list[0]).toBe("keep-gate.png");
    expect(new Set(list).size).toBe(list.length);
  });
});
