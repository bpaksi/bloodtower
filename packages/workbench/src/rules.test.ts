import { describe, expect, it } from "vitest";
import type { Card, Graph } from "./graph-types.ts";
import { RELS } from "./graph-types.ts";
import { cycles, type LinkRules, linkBreaks, linkProblems, typeOfIn } from "./rules.ts";

const card = (id: string, type: string, links: [string, string][] = []): Card => ({
  id,
  type,
  title: id,
  status: "open",
  layer: null,
  by: null,
  links: links.map(([rel, to]) => ({ rel, to })),
  sources: [],
  body: "",
  bodyHtml: "",
  file: `cards/${id}.md`,
  data: {},
});

/** A graph over cards, plus a ref node for any link to an ID with no card. */
function graphOf(cards: Card[]): Graph {
  const nodes: Graph["nodes"] = {};
  for (const c of cards) nodes[c.id] = { kind: "card", ...c };
  const edges = cards.flatMap((c) => c.links.map((l) => ({ from: c.id, to: l.to, rel: l.rel })));
  for (const e of edges) {
    nodes[e.to] ??= { kind: "ref", id: e.to, idKind: "requirement", title: e.to, foundIn: [] };
  }
  return { nodes, edges, rels: RELS };
}

const RULES: LinkRules = {
  rels: {
    needs: [{ from: ["mechanic", "screen"], to: ["mechanic", "screen"] }],
    "part-of": [{ from: "any", to: ["area"] }],
    refines: [{ from: ["mechanic"], to: ["ref:requirement"] }],
  },
  buildOrder: ["needs"],
  acyclic: ["needs", "part-of"],
};

describe("link rules", () => {
  it("reads a card's type, and ref:<kind> for an ID with no card", () => {
    const g = graphOf([card("MEC-001", "mechanic", [["refines", "R-X-1"]])]);
    const typeOf = typeOfIn(g);
    expect(typeOf("MEC-001")).toBe("mechanic");
    expect(typeOf("R-X-1")).toBe("ref:requirement");
  });

  it("fails a link that joins types its rule does not allow", () => {
    const g = graphOf([
      card("MEC-001", "mechanic", [
        ["needs", "SCR-001"],
        ["refines", "R-X-1"],
      ]),
      card("SCR-001", "screen", [["needs", "AREA-001"]]),
      card("AREA-001", "area"),
    ]);
    expect(linkBreaks(g, RULES)).toEqual(["SCR-001|needs|AREA-001"]);
    expect(linkProblems(g, RULES, [])).toEqual([
      "link SCR-001|needs|AREA-001 breaks the link rules (see the rules table in the cards README)",
    ]);
  });

  it("fails a verb with no rules at all", () => {
    const g = graphOf([
      card("MEC-001", "mechanic", [["uses", "MEC-002"]]),
      card("MEC-002", "mechanic"),
    ]);
    expect(linkBreaks(g, RULES)).toEqual(["MEC-001|uses|MEC-002"]);
  });

  it("fails a needs cycle and a part-of cycle", () => {
    const g = graphOf([
      card("MEC-001", "mechanic", [["needs", "MEC-002"]]),
      card("MEC-002", "mechanic", [["needs", "MEC-001"]]),
      card("AREA-001", "area", [["part-of", "AREA-002"]]),
      card("AREA-002", "area", [["part-of", "AREA-001"]]),
    ]);
    expect(cycles(g, "needs")).toEqual([["MEC-001", "MEC-002"]]);
    expect(linkProblems(g, RULES, [])).toEqual([
      "needs loop among: MEC-001, MEC-002",
      "part-of loop among: AREA-001, AREA-002",
    ]);
  });

  it("reports every looped group once, even when loops share cards", () => {
    const g = graphOf([
      card("MEC-001", "mechanic", [
        ["needs", "MEC-002"],
        ["needs", "MEC-003"],
      ]),
      card("MEC-002", "mechanic", [["needs", "MEC-003"]]),
      card("MEC-003", "mechanic", [["needs", "MEC-001"]]),
      card("MEC-004", "mechanic", [["needs", "MEC-005"]]),
      card("MEC-005", "mechanic", [["needs", "MEC-004"]]),
      card("MEC-006", "mechanic", [["needs", "MEC-001"]]),
    ]);
    expect(cycles(g, "needs")).toEqual([
      ["MEC-001", "MEC-002", "MEC-003"],
      ["MEC-004", "MEC-005"],
    ]);
  });

  it("reports a self-loop once, even when written twice", () => {
    const g = graphOf([
      card("MEC-001", "mechanic", [
        ["needs", "MEC-001"],
        ["needs", "MEC-001"],
      ]),
    ]);
    expect(cycles(g, "needs")).toEqual([["MEC-001"]]);
  });

  it("fails a duplicate link (same verb and target on one card), even if grandfathered", () => {
    const g = graphOf([
      card("MEC-001", "mechanic", [
        ["needs", "MEC-002"],
        ["needs", "MEC-002"],
        ["needs", "MEC-002"],
      ]),
      card("MEC-002", "mechanic"),
    ]);
    expect(linkProblems(g, RULES, [])).toEqual(["duplicate link MEC-001|needs|MEC-002"]);
  });

  it("finds no cycle in a chain or a diamond", () => {
    const g = graphOf([
      card("MEC-001", "mechanic", [
        ["needs", "MEC-002"],
        ["needs", "MEC-003"],
      ]),
      card("MEC-002", "mechanic", [["needs", "MEC-004"]]),
      card("MEC-003", "mechanic", [["needs", "MEC-004"]]),
      card("MEC-004", "mechanic"),
    ]);
    expect(cycles(g, "needs")).toEqual([]);
  });

  it("passes a break listed in the baseline and fails one that is not", () => {
    const g = graphOf([
      card("SCR-001", "screen", [
        ["needs", "AREA-001"],
        ["refines", "R-X-1"],
      ]),
      card("AREA-001", "area"),
    ]);
    expect(linkProblems(g, RULES, ["SCR-001|needs|AREA-001"])).toEqual([
      "link SCR-001|refines|R-X-1 breaks the link rules (see the rules table in the cards README)",
    ]);
  });

  it("fails a baseline entry that is no longer a break", () => {
    const g = graphOf([card("MEC-001", "mechanic", [["refines", "R-X-1"]])]);
    expect(linkProblems(g, RULES, ["MEC-001|refines|R-X-1", "MEC-009|uses|MEC-001"])).toEqual([
      "baseline entry MEC-001|refines|R-X-1 is no longer a break; remove it from the baseline",
      "baseline entry MEC-009|uses|MEC-001 is no longer a break; remove it from the baseline",
    ]);
  });
});
