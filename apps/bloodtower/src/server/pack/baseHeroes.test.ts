import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { heroRoleSchema } from "../../protocols/pack-v2/ids.ts";
import { loadPackV2Dir } from "./v2/load.ts";

const repoRoot = join(import.meta.dirname, "../../../../../");
const basePack = join(repoRoot, "packs", "base");

/** DEC-936 / DEC-380: each class's two intrinsic virtues, in the DEC-380 table's order. */
const CLASS_VIRTUES: Record<string, string> = {
  fighter: "Shield Wall, Weapon Master",
  healer: "Lightning, Mend",
  "magic-user": "Magic Missile, Fireball",
  scout: "Shadow, Slip Past",
  ranger: "Beast Hunter, Pathfinder",
  bard: "Silver Tongue, Rally",
};

describe("base pack heroes (#609, DEC-936, DEC-378)", () => {
  const raw = parseYaml(readFileSync(join(basePack, "pack.yaml"), "utf8")) as {
    heroes: { id: string; role: string; ability: string }[];
  };

  it("EV-01: each hero's ability is its class's two intrinsic virtues", () => {
    expect(Object.fromEntries(raw.heroes.map((h) => [h.role, h.ability]))).toEqual(CLASS_VIRTUES);
  });

  it("EV-02: the Bard replaces the Scholar", () => {
    expect(raw.heroes.map((h) => h.role)).not.toContain("scholar");
    expect(raw.heroes.map((h) => h.role)).toContain("bard");
    expect(heroRoleSchema.safeParse("bard").success).toBe(true);
    expect(heroRoleSchema.safeParse("scholar").success).toBe(false);
  });

  it("EV-03: the pack still loads with the new values", () => {
    const loaded = loadPackV2Dir(basePack);
    expect(loaded.ok).toBe(true);
  });
});
