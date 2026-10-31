import { describe, expect, it } from "vitest";
import { buildGraph, type CardSchema, parseCard, splitFrontMatter } from "./cards.ts";
import { RELS, releaseOf } from "./graph-types.ts";

const schema: CardSchema = {
  types: ["thing", "place"],
  checkId: (type, id) => (id.startsWith(type === "thing" ? "T-" : "P-") ? null : `bad id ${id}`),
  layers: ["core", "extra"],
  rels: RELS,
  dir: "x/cards",
  render: (md) => `<p>${md}</p>`,
};

const front = (fields: string, body = "") => `---\n${fields}\n---\n${body}`;

describe("splitFrontMatter", () => {
  it("returns parsed YAML and a trimmed body", () => {
    expect(splitFrontMatter("---\na: 1\n---\n\n  hello \n\n")).toEqual({
      data: { a: 1 },
      body: "hello",
    });
  });

  it("accepts an empty body and no newline after the closing fence", () => {
    expect(splitFrontMatter("---\na: 1\n---")).toEqual({ data: { a: 1 }, body: "" });
  });

  it("keeps later --- rules in the body", () => {
    expect(splitFrontMatter("---\na: 1\n---\none\n---\ntwo").body).toBe("one\n---\ntwo");
  });

  it("throws when the file does not open with ---", () => {
    expect(() => splitFrontMatter("\n---\na: 1\n---\n")).toThrow("missing --- front matter");
    expect(() => splitFrontMatter("---\na: 1\n")).toThrow("missing --- front matter");
  });

  it("gives null data for empty front matter", () => {
    expect(splitFrontMatter("---\n\n---\nbody").data).toBeNull();
  });
});

describe("parseCard", () => {
  it("fills defaults: open status, no layer, no author, no links, no sources, empty html", () => {
    const c = parseCard("T-1.md", front("type: thing\ntitle: Sword"), schema);
    expect(c).toMatchObject({
      id: "T-1",
      type: "thing",
      title: "Sword",
      status: "open",
      layer: null,
      by: null,
      links: [],
      sources: [],
      body: "",
      bodyHtml: "",
      file: "x/cards/T-1.md",
    });
  });

  it("renders the body through the schema and trims the title", () => {
    const c = parseCard("T-1.md", front("type: thing\ntitle: '  Sword  '", "Sharp."), schema);
    expect(c.title).toBe("Sword");
    expect(c.bodyHtml).toBe("<p>Sharp.</p>");
  });

  it("keeps status, layer and by when valid", () => {
    const c = parseCard(
      "P-2.md",
      front("type: place\ntitle: Inn\nstatus: decided\nlayer: extra\nby: Bob"),
      schema,
    );
    expect(c).toMatchObject({ status: "decided", layer: "extra", by: "Bob" });
  });

  it("ignores a non-string by", () => {
    expect(parseCard("T-1.md", front("type: thing\ntitle: x\nby: 5"), schema).by).toBeNull();
  });

  it("keeps link notes only when given, and source lines/notes only when given", () => {
    const c = parseCard(
      "T-1.md",
      front(
        [
          "type: thing",
          "title: x",
          "links:",
          "  - { rel: needs, to: T-2, note: why }",
          "  - { rel: uses, to: T-3 }",
          "sources:",
          "  - { file: a.md, lines: 3-4, note: n }",
          "  - { file: b.md }",
          "  - { file: c.md, lines: 7 }",
        ].join("\n"),
      ),
      schema,
    );
    expect(c.links).toEqual([
      { rel: "needs", to: "T-2", note: "why" },
      { rel: "uses", to: "T-3" },
    ]);
    expect(c.sources).toEqual([
      { file: "a.md", lines: "3-4", note: "n" },
      { file: "b.md" },
      { file: "c.md", lines: "7" },
    ]);
  });

  it("keeps the raw front matter in data, including fields the schema does not know", () => {
    const c = parseCard("T-1.md", front("type: thing\ntitle: x\nfeel: grim"), schema);
    expect(c.data.feel).toBe("grim");
  });

  it.each([
    ["no front matter", "just text", /^cards\/T-1\.md: missing --- front matter$/],
    ["unknown type", front("type: bogus\ntitle: x"), /unknown type "bogus"/],
    ["missing type", front("title: x"), /unknown type "undefined"/],
    ["empty front matter", "---\n\n---\n", /unknown type/],
    ["bad id for type", front("type: place\ntitle: x"), /bad id T-1/],
    ["unknown layer", front("type: thing\ntitle: x\nlayer: deep"), /unknown layer "deep"/],
    ["missing title", front("type: thing"), /title is required/],
    ["blank title", front("type: thing\ntitle: '  '"), /title is required/],
    ["non-string title", front("type: thing\ntitle: 5"), /title is required/],
    ["unknown status", front("type: thing\ntitle: x\nstatus: done"), /unknown status "done"/],
    [
      "unknown rel",
      front("type: thing\ntitle: x\nlinks:\n  - { rel: loves, to: T-2 }"),
      /unknown link rel "loves"/,
    ],
    [
      "link without to",
      front("type: thing\ntitle: x\nlinks:\n  - { rel: needs }"),
      /link without a 'to' ID/,
    ],
    [
      "link missing rel",
      front("type: thing\ntitle: x\nlinks:\n  - { to: T-2 }"),
      /unknown link rel/,
    ],
    ["malformed yaml", front("type: [thing\ntitle: x"), /./],
    [
      "release 1.0 written out",
      front('type: thing\ntitle: x\nrelease: "1.0"'),
      /unknown release "1.0"/,
    ],
    ["release 2", front('type: thing\ntitle: x\nrelease: "2"'), /unknown release "2"/],
    ["unquoted release", front("type: thing\ntitle: x\nrelease: 1.1"), /quote it: release: "1.1"/],
    ["empty release", front("type: thing\ntitle: x\nrelease:"), /unknown release null/],
  ])("rejects %s", (_name, text, message) => {
    expect(() => parseCard("T-1.md", text, schema)).toThrow(message);
  });

  it('accepts release: "1.1", and reads no field as 1.0 (DEC-696)', () => {
    const later = parseCard("T-1.md", front('type: thing\ntitle: x\nrelease: "1.1"'), schema);
    expect(releaseOf(later)).toBe("1.1");
    expect(releaseOf(parseCard("T-1.md", front("type: thing\ntitle: x"), schema))).toBe("1.0");
  });

  it("prefixes every failure with the file name", () => {
    expect(() => parseCard("T-9.md", front("type: thing"), schema)).toThrow(/^cards\/T-9\.md: /);
  });

  it("rejects a layer when the workbench has none", () => {
    const noLayers: CardSchema = { ...schema, layers: null };
    expect(() =>
      parseCard("T-1.md", front("type: thing\ntitle: x\nlayer: core"), noLayers),
    ).toThrow(/unknown layer/);
    expect(parseCard("T-1.md", front("type: thing\ntitle: x"), noLayers).layer).toBeNull();
  });

  it("runs checkFields after the id check and fails with its message", () => {
    const withFields: CardSchema = {
      ...schema,
      checkFields: (_t, d) => (d.feel === undefined ? "feel is required" : null),
    };
    expect(() => parseCard("T-1.md", front("type: thing\ntitle: x"), withFields)).toThrow(
      /feel is required/,
    );
    expect(parseCard("T-1.md", front("type: thing\ntitle: x\nfeel: a"), withFields).id).toBe("T-1");
    // id problem wins over a field problem
    expect(() => parseCard("P-1.md", front("type: thing\ntitle: x"), withFields)).toThrow(/bad id/);
  });
});

describe("buildGraph", () => {
  const mk = (id: string, links: { rel: string; to: string; note?: string }[] = []) =>
    parseCard(
      `${id}.md`,
      front(
        `type: thing\ntitle: ${id}\nlinks:\n${links.map((l) => `  - ${JSON.stringify(l)}`).join("\n") || "  []"}`,
      ),
      schema,
    );
  const kindOf = (id: string) => (id.startsWith("D-") ? "doc" : "other");

  it("makes a card node and an edge per link, keeping notes only when present", () => {
    const { graph, problems } = buildGraph(
      [
        mk("T-1", [
          { rel: "needs", to: "T-2", note: "because" },
          { rel: "uses", to: "T-2" },
        ]),
        mk("T-2"),
      ],
      { docs: [], rels: RELS, kindOf },
    );
    expect(problems).toEqual([]);
    expect(graph.nodes["T-1"]?.kind).toBe("card");
    expect(graph.edges).toEqual([
      { from: "T-1", to: "T-2", rel: "needs", note: "because" },
      { from: "T-1", to: "T-2", rel: "uses" },
    ]);
    expect(graph.rels).toBe(RELS);
  });

  it("turns a link to an ID found in documents into a ref node listing those documents", () => {
    const { graph, problems } = buildGraph([mk("T-1", [{ rel: "uses", to: "D-1" }])], {
      docs: [
        { file: "a.md", ids: ["D-1", "D-2"] },
        { file: "b.md", ids: ["D-2"] },
        { file: "c.md", ids: ["D-1"] },
      ],
      rels: RELS,
      kindOf,
    });
    expect(problems).toEqual([]);
    expect(graph.nodes["D-1"]).toEqual({
      kind: "ref",
      id: "D-1",
      idKind: "doc",
      title: "D-1",
      foundIn: ["a.md", "c.md"],
    });
  });

  it("titles a ref node by the first note that names it", () => {
    const { graph } = buildGraph(
      [
        mk("T-1", [{ rel: "uses", to: "D-1", note: "first" }]),
        mk("T-2", [{ rel: "uses", to: "D-1", note: "second" }]),
      ],
      { docs: [], rels: RELS, kindOf },
    );
    expect(graph.nodes["D-1"]).toMatchObject({ kind: "ref", title: "first" });
  });

  it("reports a link to an ID that is no card, in no document, and has no note", () => {
    const { problems } = buildGraph(
      [
        mk("T-1", [
          { rel: "uses", to: "D-9" },
          { rel: "uses", to: "D-8", note: "ok" },
        ]),
      ],
      { docs: [], rels: RELS, kindOf },
    );
    expect(problems).toEqual(["T-1 links to D-9, which is no card and appears in no document"]);
  });

  it("does not report a second link to the same missing ID once a ref node exists", () => {
    const { problems } = buildGraph(
      [mk("T-1", [{ rel: "uses", to: "D-9" }]), mk("T-2", [{ rel: "uses", to: "D-9" }])],
      { docs: [], rels: RELS, kindOf },
    );
    expect(problems).toHaveLength(1);
  });

  it("does not replace a card with a ref node when a link points at it, whatever the order", () => {
    const { graph } = buildGraph([mk("T-1", [{ rel: "needs", to: "T-2" }]), mk("T-2")], {
      docs: [],
      rels: RELS,
      kindOf,
    });
    expect(graph.nodes["T-2"]?.kind).toBe("card");
  });

  it("handles no cards", () => {
    const { graph, problems } = buildGraph([], { docs: [], rels: RELS, kindOf });
    expect(graph).toEqual({ nodes: {}, edges: [], rels: RELS });
    expect(problems).toEqual([]);
  });
});
