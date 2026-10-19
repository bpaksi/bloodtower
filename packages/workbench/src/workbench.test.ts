import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildGraph, type CardSchema, parseCard } from "./cards.ts";
import { RELS } from "./graph-types.ts";
import { extractIds, makeIdScheme } from "./ids.ts";
import { neighbours } from "./layout.ts";
import { makeRenderer } from "./markdown.ts";
import { buildPrompt } from "./prompt.ts";
import { parseSections } from "./sections.ts";
import { loadCards, loadDoc } from "./server.ts";

// A scheme unlike the game's, so nothing here leans on game-workbench's IDs.
const ids = makeIdScheme({
  sources: [String.raw`ZZ-(?:CHR|LOC)-\d{3}`, String.raw`MEC-\d+`],
  kindOf: (id) =>
    id.startsWith("ZZ-CHR") ? "character" : id.startsWith("ZZ") ? "location" : "mechanic",
  labels: { character: "Character", location: "Location" },
});

const RELS_PLUS = { ...RELS, "appears-in": { label: "appears in", reverse: "has" } };

const schema: CardSchema = {
  types: ["character", "location"],
  checkId: (type, id) =>
    new RegExp(`^ZZ-${type === "character" ? "CHR" : "LOC"}-\\d{3}$`).test(id) ? null : "bad ID",
  layers: null,
  rels: RELS_PLUS,
  dir: "research/zz/cards",
  render: makeRenderer({ ids, docHref: (s) => `/z/doc/${s}` }),
};

const card = (front: string, body = "") => `---\n${front}\n---\n${body}`;

describe("ID schemes", () => {
  it("finds only the shapes it was given, with word boundaries", () => {
    expect(
      extractIds("ZZ-CHR-004 at ZZ-LOC-001 uses MEC-5; not XZZ-CHR-004 or ZZ-CHR-0041.", ids),
    ).toEqual(["ZZ-CHR-004", "ZZ-LOC-001", "MEC-5"]);
    expect(ids.label("character")).toBe("Character");
    expect(ids.label("mechanic")).toBe("mechanic");
  });

  it("renders chips and doc links through the workbench's own paths", () => {
    const html = makeRenderer({ ids, docHref: (s) => `/z/doc/${s}` })(
      "## Cast\nZZ-CHR-004, see [notes](notes.md#a).",
    );
    expect(html).toContain('class="chip chip-character" data-id="ZZ-CHR-004"');
    expect(html).toContain('href="/z/doc/notes#a"');
    expect(parseSections("# T\n## Cast\nZZ-CHR-004", ids)[1]?.ids).toEqual(["ZZ-CHR-004"]);
  });
});

describe("cards", () => {
  it("checks IDs and verbs with the schema, keeps the front matter, and has no layers here", () => {
    const c = parseCard(
      "ZZ-CHR-001.md",
      card(
        "type: character\ntitle: Agnes\norder: 2\nlinks:\n  - { rel: appears-in, to: ZZ-LOC-001 }",
      ),
      schema,
    );
    expect(c).toMatchObject({ file: "research/zz/cards/ZZ-CHR-001.md", layer: null });
    expect(c.data.order).toBe(2);
    expect(() => parseCard("ZZ-LOC-001.md", card("type: character\ntitle: x"), schema)).toThrow(
      /bad ID/,
    );
    expect(() =>
      parseCard("ZZ-CHR-002.md", card("type: character\ntitle: x\nlayer: core"), schema),
    ).toThrow(/unknown layer/);
  });

  it("reports a broken card file instead of throwing, and keeps the good ones", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "wb-cards-"));
    writeFileSync(path.join(dir, "ZZ-CHR-001.md"), card("type: character\ntitle: Agnes"));
    writeFileSync(path.join(dir, "ZZ-CHR-002.md"), "no front matter");
    writeFileSync(path.join(dir, "README.md"), "# not a card");
    const { cards, errors } = loadCards(dir, schema);
    expect(cards.map((c) => c.id)).toEqual(["ZZ-CHR-001"]);
    expect(errors).toEqual(["cards/ZZ-CHR-002.md: missing --- front matter"]);
    expect(loadCards(path.join(dir, "missing"), schema)).toEqual({ cards: [], errors: [] });
  });

  it("puts the workbench's verbs on the graph and reads them from the focus card's side", () => {
    const agnes = parseCard(
      "ZZ-CHR-001.md",
      card("type: character\ntitle: Agnes\nlinks:\n  - { rel: appears-in, to: ZZ-LOC-001 }"),
      schema,
    );
    const inn = parseCard("ZZ-LOC-001.md", card("type: location\ntitle: Inn"), schema);
    const { graph, problems } = buildGraph([agnes, inn], {
      docs: [],
      rels: RELS_PLUS,
      kindOf: ids.kindOf,
    });
    expect(problems).toEqual([]);
    expect(neighbours(graph, "ZZ-LOC-001")).toEqual([
      { id: "ZZ-CHR-001", verbs: ["has"], notes: [] },
    ]);
  });
});

describe("docs and prompts", () => {
  it("refuses doc slugs that could leave the folder", () => {
    expect(loadDoc("../package", tmpdir(), ids)).toBeNull();
    expect(loadDoc("README", tmpdir(), ids)).toBeNull();
  });

  it("uses the workbench's own rules and new-idea scope", () => {
    const config = {
      rules: { change: "C rules", add: "A rules", ask: "Q rules" },
      newScope: "research/zz (new)",
    };
    const p = buildPrompt(
      { file: null, section: [], lines: null, ids: [] },
      "add",
      " Fog ",
      config,
    );
    expect(p).toBe("Scope: research/zz (new)\n\nRules: A rules\n\nIdea to add: Fog");
  });
});
