import { describe, expect, it } from "vitest";
import { backlinks, outlinks } from "./backlinks.ts";
import { type Card, type Graph, RELS } from "./graph-types.ts";

const card = (id: string): Card => ({
  id,
  type: "mechanic",
  title: id,
  status: "open",
  layer: null,
  by: null,
  links: [],
  sources: [],
  body: "",
  bodyHtml: "",
  file: `${id}.md`,
  data: {},
});

const graph: Graph = {
  nodes: Object.fromEntries(
    ["A", "B", "C", "D"].map((id) => [id, { kind: "card" as const, ...card(id) }]),
  ),
  edges: [
    { from: "B", to: "A", rel: "needs", note: "for turns" },
    { from: "C", to: "A", rel: "needs" },
    { from: "D", to: "A", rel: "answers" },
    { from: "A", to: "D", rel: "uses", note: "outgoing" },
  ],
  rels: RELS,
};

describe("backlinks", () => {
  it("groups incoming links under the reverse verb with notes", () => {
    expect(backlinks(graph, "A")).toEqual([
      {
        verb: "needed by",
        links: [{ id: "B", note: "for turns" }, { id: "C" }],
      },
      { verb: "answered by", links: [{ id: "D" }] },
    ]);
  });

  it("is empty for a card nothing links to", () => {
    expect(backlinks(graph, "B")).toEqual([]);
    expect(backlinks(graph, "missing")).toEqual([]);
  });

  it("outlinks lists what the card writes, with the forward verb", () => {
    expect(outlinks(graph, "A")).toEqual([
      { verb: "uses", links: [{ id: "D", note: "outgoing" }] },
    ]);
  });

  it("drops a note that is the other node's title (a document ID titled by its note)", () => {
    const g: Graph = {
      nodes: {
        ...graph.nodes,
        "R-X-1": {
          kind: "ref",
          id: "R-X-1",
          idKind: "requirement",
          title: "same words",
          foundIn: [],
        },
      },
      edges: [
        { from: "A", to: "R-X-1", rel: "uses", note: "same words" },
        { from: "B", to: "R-X-1", rel: "uses", note: "other words" },
      ],
      rels: RELS,
    };
    expect(outlinks(g, "A")).toEqual([{ verb: "uses", links: [{ id: "R-X-1" }] }]);
    expect(backlinks(g, "R-X-1")).toEqual([
      {
        verb: "used by",
        links: [{ id: "A" }, { id: "B", note: "other words" }],
      },
    ]);
  });
});

describe("backlinks: edge cases", () => {
  const edgesGraph = (edges: Graph["edges"], rels: Graph["rels"] = RELS): Graph => ({
    nodes: graph.nodes,
    edges,
    rels,
  });

  it("ignores a self-link both ways", () => {
    const g = edgesGraph([{ from: "A", to: "A", rel: "needs", note: "self" }]);
    expect(backlinks(g, "A")).toEqual([]);
    expect(outlinks(g, "A")).toEqual([]);
  });

  it("does not list a link twice when the same edge is written twice", () => {
    const g = edgesGraph([
      { from: "B", to: "A", rel: "needs", note: "n" },
      { from: "B", to: "A", rel: "needs", note: "n" },
    ]);
    expect(backlinks(g, "A")).toEqual([{ verb: "needed by", links: [{ id: "B", note: "n" }] }]);
  });

  it("keeps two links from one card that differ only by note", () => {
    const g = edgesGraph([
      { from: "B", to: "A", rel: "needs", note: "one" },
      { from: "B", to: "A", rel: "needs", note: "two" },
      { from: "B", to: "A", rel: "needs" },
    ]);
    expect(backlinks(g, "A")[0]?.links).toEqual([
      { id: "B", note: "one" },
      { id: "B", note: "two" },
      { id: "B" },
    ]);
  });

  it("sorts links by ID with numbers as numbers", () => {
    const g = edgesGraph([
      { from: "MEC-10", to: "A", rel: "needs" },
      { from: "MEC-2", to: "A", rel: "needs" },
      { from: "MEC-1", to: "A", rel: "needs" },
    ]);
    expect(backlinks(g, "A")[0]?.links.map((l) => l.id)).toEqual(["MEC-1", "MEC-2", "MEC-10"]);
  });

  it("orders groups by the verb table, with unknown verbs last, sorted by name", () => {
    const rels = {
      needs: { label: "needs", reverse: "needed by" },
      uses: { label: "uses", reverse: "used by" },
    };
    const g = edgesGraph(
      [
        { from: "B", to: "A", rel: "zeta" },
        { from: "B", to: "A", rel: "alpha" },
        { from: "B", to: "A", rel: "uses" },
        { from: "B", to: "A", rel: "needs" },
      ],
      rels,
    );
    expect(backlinks(g, "A").map((x) => x.verb)).toEqual(["needed by", "used by", "alpha", "zeta"]);
  });

  it("uses the bare verb in both directions for a verb missing from the table", () => {
    const g = edgesGraph([
      { from: "B", to: "A", rel: "oddly" },
      { from: "A", to: "C", rel: "oddly" },
    ]);
    expect(backlinks(g, "A")).toEqual([{ verb: "oddly", links: [{ id: "B" }] }]);
    expect(outlinks(g, "A")).toEqual([{ verb: "oddly", links: [{ id: "C" }] }]);
  });

  it("keeps a note on an outlink to a card whose title differs", () => {
    const g = edgesGraph([{ from: "A", to: "B", rel: "uses", note: "not B" }]);
    expect(outlinks(g, "A")).toEqual([{ verb: "uses", links: [{ id: "B", note: "not B" }] }]);
  });

  it("drops a note equal to the target's title, but not for the same note on another target", () => {
    const g = edgesGraph([
      { from: "A", to: "B", rel: "uses", note: "B" },
      { from: "A", to: "C", rel: "uses", note: "B" },
    ]);
    expect(outlinks(g, "A")).toEqual([
      { verb: "uses", links: [{ id: "B" }, { id: "C", note: "B" }] },
    ]);
  });

  it("treats an empty note as no note", () => {
    const g = edgesGraph([{ from: "B", to: "A", rel: "needs", note: "" }]);
    expect(backlinks(g, "A")).toEqual([{ verb: "needed by", links: [{ id: "B" }] }]);
  });

  it("returns nothing for an empty graph", () => {
    const g: Graph = { nodes: {}, edges: [], rels: RELS };
    expect(backlinks(g, "A")).toEqual([]);
    expect(outlinks(g, "A")).toEqual([]);
  });

  it("does not change the graph it reads", () => {
    const before = JSON.stringify(graph);
    backlinks(graph, "A");
    outlinks(graph, "A");
    expect(JSON.stringify(graph)).toBe(before);
  });
});
