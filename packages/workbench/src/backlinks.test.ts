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

  it.fails("drops a note that is the other node's title (a document ID titled by its note)", () => {
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
