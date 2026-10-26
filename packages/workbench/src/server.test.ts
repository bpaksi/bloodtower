import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CardSchema } from "./cards.ts";
import { RELS } from "./graph-types.ts";
import { makeIdScheme } from "./ids.ts";
import { loadCards, loadDoc, loadDocs, parseDoc, repoRoot } from "./server.ts";

const ids = makeIdScheme({
  sources: [String.raw`MEC-\d+`],
  kindOf: () => "mechanic",
  labels: {},
});

const schema: CardSchema = {
  types: ["thing"],
  checkId: () => null,
  layers: null,
  rels: RELS,
  dir: "x/cards",
  render: (md) => md,
};

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "wb-server-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("parseDoc", () => {
  it("takes the title from the first H1, the status from a Status: line, and counts lines and IDs", () => {
    const d = parseDoc("rules.md", "# Rules\nStatus: **Draft**\nMEC-1 and MEC-2 and MEC-1\n", ids);
    expect(d).toMatchObject({
      slug: "rules",
      file: "rules.md",
      title: "Rules",
      status: "Draft",
      lines: 4,
      ids: ["MEC-1", "MEC-2"],
    });
  });

  it("falls back to the slug as title and null (unavailable, not zero or empty) for no Status", () => {
    const d = parseDoc("loose.md", "no heading here\n## Sub", ids);
    expect(d.title).toBe("loose");
    expect(d.status).toBeNull();
  });

  it("ignores an H2 when looking for the title and trims it", () => {
    expect(parseDoc("a.md", "## Not top\n#   Real   \n", ids).title).toBe("Real");
  });

  it("does not take an indented or mid-line Status:", () => {
    expect(parseDoc("a.md", "  Status: x\nsee Status: y", ids).status).toBeNull();
  });
});

describe("loadDocs", () => {
  it("is empty for a missing folder", () => {
    expect(loadDocs(path.join(dir, "nope"), ids)).toEqual([]);
  });

  it("lists top-level .md files in name order, skipping README, other extensions and sub-folders", () => {
    writeFileSync(path.join(dir, "b.md"), "# B");
    writeFileSync(path.join(dir, "a.md"), "# A");
    writeFileSync(path.join(dir, "README.md"), "# R");
    writeFileSync(path.join(dir, "notes.txt"), "x");
    mkdirSync(path.join(dir, "cards"));
    writeFileSync(path.join(dir, "cards", "c.md"), "# C");
    expect(loadDocs(dir, ids).map((d) => d.slug)).toEqual(["a", "b"]);
  });

  it("reads fresh on every call", () => {
    writeFileSync(path.join(dir, "a.md"), "# One");
    expect(loadDocs(dir, ids)[0]?.title).toBe("One");
    writeFileSync(path.join(dir, "a.md"), "# Two");
    expect(loadDocs(dir, ids)[0]?.title).toBe("Two");
  });
});

describe("loadDoc", () => {
  it("loads one doc by slug", () => {
    writeFileSync(path.join(dir, "rules.md"), "# Rules\nMEC-3");
    expect(loadDoc("rules", dir, ids)).toMatchObject({ slug: "rules", ids: ["MEC-3"] });
  });

  it("returns null for a missing file", () => {
    expect(loadDoc("ghost", dir, ids)).toBeNull();
  });

  it.each(["../x", "a/b", "a.b", "", "a b", "..", "a\\b"])("refuses slug %j", (slug) => {
    expect(loadDoc(slug, dir, ids)).toBeNull();
  });

  it("refuses the README even when it exists", () => {
    writeFileSync(path.join(dir, "README.md"), "# R");
    expect(loadDoc("README", dir, ids)).toBeNull();
  });
});

describe("loadCards ordering and filtering", () => {
  const card = (title: string) => `---\ntype: thing\ntitle: ${title}\n---\n`;

  it("sorts IDs numerically, so 2 comes before 10", () => {
    for (const n of ["T-10", "T-2", "T-1"]) writeFileSync(path.join(dir, `${n}.md`), card(n));
    expect(loadCards(dir, schema).cards.map((c) => c.id)).toEqual(["T-1", "T-2", "T-10"]);
  });

  it("skips non-.md files and README", () => {
    writeFileSync(path.join(dir, "T-1.md"), card("one"));
    writeFileSync(path.join(dir, "T-2.txt"), card("two"));
    writeFileSync(path.join(dir, "README.md"), "no front matter");
    const { cards, errors } = loadCards(dir, schema);
    expect(cards.map((c) => c.id)).toEqual(["T-1"]);
    expect(errors).toEqual([]);
  });

  it("collects one error per bad file, in file order, and still returns good cards", () => {
    writeFileSync(path.join(dir, "T-1.md"), "oops");
    writeFileSync(path.join(dir, "T-2.md"), card("fine"));
    writeFileSync(path.join(dir, "T-3.md"), "---\ntype: bogus\ntitle: x\n---\n");
    const { cards, errors } = loadCards(dir, schema);
    expect(cards.map((c) => c.id)).toEqual(["T-2"]);
    expect(errors).toEqual([
      "cards/T-1.md: missing --- front matter",
      'cards/T-3.md: unknown type "bogus"',
    ]);
  });

  it("returns an empty result for an empty folder", () => {
    expect(loadCards(dir, schema)).toEqual({ cards: [], errors: [] });
  });
});

describe("repoRoot", () => {
  it("finds the nearest folder above that holds pnpm-workspace.yaml", () => {
    writeFileSync(path.join(dir, "pnpm-workspace.yaml"), "packages: []\n");
    const deep = path.join(dir, "a", "b");
    mkdirSync(deep, { recursive: true });
    expect(repoRoot(deep)).toBe(path.resolve(dir));
    expect(repoRoot(dir)).toBe(path.resolve(dir));
  });

  it("prefers the nearest one", () => {
    writeFileSync(path.join(dir, "pnpm-workspace.yaml"), "");
    const inner = path.join(dir, "inner");
    mkdirSync(inner);
    writeFileSync(path.join(inner, "pnpm-workspace.yaml"), "");
    expect(repoRoot(path.join(inner, "x-nonexistent"))).toBe(path.resolve(inner));
  });
});
