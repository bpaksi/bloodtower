import { describe, expect, it } from "vitest";
import type { Card, Graph } from "./graph-types.ts";
import { RELS } from "./graph-types.ts";
import {
  allows,
  cycles,
  type LinkRules,
  linkBreaks,
  linkKey,
  linkProblems,
  typeOfIn,
} from "./rules.ts";

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
    // part-of between mechanics is a real break, so the baseline entry is meaningful; needs
    // between them would only yield a stale-baseline error.
    const g = graphOf([
      card("MEC-001", "mechanic", [
        ["part-of", "MEC-002"],
        ["part-of", "MEC-002"],
        ["part-of", "MEC-002"],
      ]),
      card("MEC-002", "mechanic"),
    ]);
    expect(linkProblems(g, RULES, ["MEC-001|part-of|MEC-002"])).toEqual([
      "duplicate link MEC-001|part-of|MEC-002",
    ]);
  });

  it("a link to a dangling card-shaped ID says no such card", () => {
    const g = graphOf([card("MEC-001", "mechanic", [["needs", "MEC-999"]])]);
    const ref = g.nodes["MEC-999"];
    if (ref?.kind === "ref") ref.idKind = "mechanic";
    expect(linkProblems(g, RULES, [])).toEqual([
      "link MEC-001|needs|MEC-999: no such card MEC-999",
    ]);
  });

  it("a break to a document ref keeps the generic rules message", () => {
    const g = graphOf([card("MEC-001", "mechanic", [["needs", "R-X-1"]])]);
    expect(linkProblems(g, RULES, [])).toEqual([
      "link MEC-001|needs|R-X-1 breaks the link rules (see the rules table in the cards README)",
    ]);
    const q = graphOf([card("MEC-001", "mechanic", [["needs", "Q3"]])]);
    const ref = q.nodes.Q3;
    if (ref?.kind === "ref") ref.idKind = "question";
    expect(linkProblems(q, RULES, [])).toEqual([
      "link MEC-001|needs|Q3 breaks the link rules (see the rules table in the cards README)",
    ]);
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

const breakMsg = (k: string) =>
  `link ${k} breaks the link rules (see the rules table in the cards README)`;

describe("typeOfIn: edge cases", () => {
  it("reports ref:unknown for an ID that is in no node", () => {
    expect(typeOfIn(graphOf([]))("GHOST-1")).toBe("ref:unknown");
  });

  it("reports ref:<kind> for each kind of ref", () => {
    const g = graphOf([card("MEC-001", "mechanic", [["needs", "E-1"]])]);
    const ref = g.nodes["E-1"];
    if (ref?.kind === "ref") ref.idKind = "engine";
    expect(typeOfIn(g)("E-1")).toBe("ref:engine");
  });
});

describe("allows and linkKey", () => {
  it("builds the baseline key as from|rel|to", () => {
    expect(linkKey("A", "needs", "B")).toBe("A|needs|B");
  });

  it("allows nothing for a verb with no entry, and for a verb with an empty list", () => {
    expect(allows(RULES, "uses", "mechanic", "mechanic")).toBe(false);
    expect(allows({ ...RULES, rels: { uses: [] } }, "uses", "mechanic", "mechanic")).toBe(false);
  });

  it("allows when any one of several rules matches", () => {
    const rules: LinkRules = {
      rels: {
        uses: [
          { from: ["mechanic"], to: ["cue"] },
          { from: ["screen"], to: ["ui"] },
        ],
      },
      buildOrder: [],
      acyclic: [],
    };
    expect(allows(rules, "uses", "mechanic", "cue")).toBe(true);
    expect(allows(rules, "uses", "screen", "ui")).toBe(true);
    // Each side matches a different rule: that is not a match.
    expect(allows(rules, "uses", "mechanic", "ui")).toBe(false);
    expect(allows(rules, "uses", "screen", "cue")).toBe(false);
  });

  it("matches `any` on either side, including a ref:unknown node", () => {
    expect(allows(RULES, "part-of", "ref:unknown", "area")).toBe(true);
    expect(allows(RULES, "part-of", "mechanic", "mechanic")).toBe(false);
    const rules: LinkRules = {
      rels: { sees: [{ from: ["screen"], to: "any" }] },
      buildOrder: [],
      acyclic: [],
    };
    expect(allows(rules, "sees", "screen", "ref:unknown")).toBe(true);
    expect(allows(rules, "sees", "mechanic", "ref:unknown")).toBe(false);
  });

  it("is case-sensitive on types and verbs", () => {
    expect(allows(RULES, "Needs", "mechanic", "mechanic")).toBe(false);
    expect(allows(RULES, "needs", "Mechanic", "mechanic")).toBe(false);
  });
});

describe("linkBreaks: edge cases", () => {
  it("is empty for a graph with no links", () => {
    expect(linkBreaks(graphOf([card("MEC-001", "mechanic")]), RULES)).toEqual([]);
  });

  it("lists each break once, sorted, even when written twice", () => {
    const g = graphOf([
      card("SCR-002", "screen", [
        ["needs", "AREA-001"],
        ["needs", "AREA-001"],
      ]),
      card("SCR-001", "screen", [["needs", "AREA-001"]]),
      card("AREA-001", "area"),
    ]);
    expect(linkBreaks(g, RULES)).toEqual(["SCR-001|needs|AREA-001", "SCR-002|needs|AREA-001"]);
  });

  it("breaks a link to an ID in no node, since its type is ref:unknown", () => {
    const g = graphOf([card("MEC-001", "mechanic", [["needs", "GHOST-1"]])]);
    delete g.nodes["GHOST-1"];
    expect(linkBreaks(g, RULES)).toEqual(["MEC-001|needs|GHOST-1"]);
  });

  it("reads the direction: a rule for mechanic to ref does not allow ref to mechanic", () => {
    const g = graphOf([card("MEC-001", "mechanic")]);
    g.nodes["R-X-1"] = { kind: "ref", id: "R-X-1", idKind: "requirement", title: "r", foundIn: [] };
    g.edges.push({ from: "R-X-1", to: "MEC-001", rel: "refines" });
    expect(linkBreaks(g, RULES)).toEqual(["R-X-1|refines|MEC-001"]);
  });
});

describe("cycles: edge cases", () => {
  const needs = (id: string, ...to: string[]) =>
    card(
      id,
      "mechanic",
      to.map((t) => ["needs", t]),
    );

  it("is empty for a graph with no links and for a verb nobody uses", () => {
    expect(cycles(graphOf([]), "needs")).toEqual([]);
    expect(cycles(graphOf([needs("MEC-001", "MEC-001")]), "uses")).toEqual([]);
  });

  it("ignores links of other verbs when looking for a loop", () => {
    const g = graphOf([
      card("MEC-001", "mechanic", [["needs", "MEC-002"]]),
      card("MEC-002", "mechanic", [["uses", "MEC-001"]]),
    ]);
    expect(cycles(g, "needs")).toEqual([]);
  });

  it("finds a loop of three and sorts the IDs inside it", () => {
    const g = graphOf([
      needs("MEC-003", "MEC-001"),
      needs("MEC-001", "MEC-002"),
      needs("MEC-002", "MEC-003"),
    ]);
    expect(cycles(g, "needs")).toEqual([["MEC-001", "MEC-002", "MEC-003"]]);
  });

  it("keeps a card that only leads into a loop out of it", () => {
    const g = graphOf([
      needs("MEC-001", "MEC-002"),
      needs("MEC-002", "MEC-003"),
      needs("MEC-003", "MEC-002"),
      needs("MEC-004", "MEC-001"),
    ]);
    expect(cycles(g, "needs")).toEqual([["MEC-002", "MEC-003"]]);
  });

  it("keeps a card that only hangs off a loop out of it", () => {
    const g = graphOf([
      needs("MEC-001", "MEC-002", "MEC-009"),
      needs("MEC-002", "MEC-001"),
      needs("MEC-009"),
    ]);
    expect(cycles(g, "needs")).toEqual([["MEC-001", "MEC-002"]]);
  });

  it("reports a self-loop beside a larger loop as two groups", () => {
    const g = graphOf([
      needs("MEC-001", "MEC-002"),
      needs("MEC-002", "MEC-001", "MEC-002"),
      needs("MEC-005", "MEC-005"),
    ]);
    expect(cycles(g, "needs")).toEqual([["MEC-001", "MEC-002"], ["MEC-005"]]);
  });

  it("sorts groups by their first ID", () => {
    const g = graphOf([
      needs("MEC-009", "MEC-008"),
      needs("MEC-008", "MEC-009"),
      needs("MEC-002", "MEC-001"),
      needs("MEC-001", "MEC-002"),
    ]);
    expect(cycles(g, "needs").map((x) => x[0])).toEqual(["MEC-001", "MEC-008"]);
  });

  it("handles a long chain without overflowing and finds the loop at its end", () => {
    const cards = Array.from({ length: 2000 }, (_, i) =>
      needs(`N-${String(i).padStart(4, "0")}`, `N-${String(i + 1).padStart(4, "0")}`),
    );
    cards.push(needs("N-2000", "N-1999"));
    expect(cycles(graphOf(cards), "needs")).toEqual([["N-1999", "N-2000"]]);
  });
});

describe("linkProblems: edge cases", () => {
  it("is empty for a clean graph and an empty baseline", () => {
    const g = graphOf([
      card("MEC-001", "mechanic", [["needs", "MEC-002"]]),
      card("MEC-002", "mechanic"),
    ]);
    expect(linkProblems(g, RULES, [])).toEqual([]);
  });

  it("reports a break with a dangling ID that is in no node as a rules break", () => {
    const g = graphOf([card("MEC-001", "mechanic", [["needs", "GHOST-1"]])]);
    delete g.nodes["GHOST-1"];
    expect(linkProblems(g, RULES, [])).toEqual([breakMsg("MEC-001|needs|GHOST-1")]);
  });

  it("calls a dangling Q-001 (with a hyphen) a missing card, but not Q3", () => {
    const g = graphOf([card("MEC-001", "mechanic", [["needs", "Q-001"]])]);
    const ref = g.nodes["Q-001"];
    if (ref?.kind === "ref") ref.idKind = "question";
    expect(linkProblems(g, RULES, [])).toEqual(["link MEC-001|needs|Q-001: no such card Q-001"]);
  });

  it("does not call an asset or engine ref a missing card", () => {
    for (const kind of ["asset", "engine"]) {
      const g = graphOf([card("MEC-001", "mechanic", [["needs", "X-1"]])]);
      const ref = g.nodes["X-1"];
      if (ref?.kind === "ref") ref.idKind = kind;
      expect(linkProblems(g, RULES, [])).toEqual([breakMsg("MEC-001|needs|X-1")]);
    }
  });

  it("does not call a break to an existing card a missing card", () => {
    const g = graphOf([
      card("SCR-001", "screen", [["needs", "AREA-001"]]),
      card("AREA-001", "area"),
    ]);
    expect(linkProblems(g, RULES, [])).toEqual([breakMsg("SCR-001|needs|AREA-001")]);
  });

  it("lists new breaks, then stale baseline entries, then duplicates, then loops", () => {
    const g = graphOf([
      card("MEC-001", "mechanic", [
        ["needs", "MEC-002"],
        ["needs", "MEC-002"],
        ["part-of", "MEC-002"],
      ]),
      card("MEC-002", "mechanic", [["needs", "MEC-001"]]),
    ]);
    expect(linkProblems(g, RULES, ["ZZZ-1|uses|ZZZ-2"])).toEqual([
      breakMsg("MEC-001|part-of|MEC-002"),
      "baseline entry ZZZ-1|uses|ZZZ-2 is no longer a break; remove it from the baseline",
      "duplicate link MEC-001|needs|MEC-002",
      "needs loop among: MEC-001, MEC-002",
    ]);
  });

  it("reports stale baseline entries sorted, once each even if the baseline repeats one", () => {
    const g = graphOf([card("MEC-001", "mechanic")]);
    expect(linkProblems(g, RULES, ["B|x|C", "A|x|B", "B|x|C"])).toEqual([
      "baseline entry A|x|B is no longer a break; remove it from the baseline",
      "baseline entry B|x|C is no longer a break; remove it from the baseline",
    ]);
  });

  it("reports each duplicated link once, however many times it is written", () => {
    const g = graphOf([
      card("MEC-001", "mechanic", [
        ["refines", "R-X-1"],
        ["refines", "R-X-1"],
        ["refines", "R-X-1"],
        ["refines", "R-X-1"],
      ]),
    ]);
    expect(linkProblems(g, RULES, [])).toEqual(["duplicate link MEC-001|refines|R-X-1"]);
  });

  it("does not call two links with one verb and different targets duplicates", () => {
    const g = graphOf([
      card("MEC-001", "mechanic", [
        ["needs", "MEC-002"],
        ["needs", "MEC-003"],
      ]),
      card("MEC-002", "mechanic"),
      card("MEC-003", "mechanic"),
    ]);
    expect(linkProblems(g, RULES, [])).toEqual([]);
  });

  it("does not call the same target under two verbs duplicates", () => {
    const g = graphOf([
      card("MEC-001", "mechanic", [
        ["needs", "MEC-002"],
        ["part-of", "MEC-002"],
      ]),
      card("MEC-002", "mechanic"),
    ]);
    expect(linkProblems(g, RULES, ["MEC-001|part-of|MEC-002"])).toEqual([]);
  });

  it("only checks loops for verbs in the acyclic list", () => {
    const g = graphOf([
      card("MEC-001", "mechanic", [["refines", "MEC-001"]]),
      card("MEC-002", "mechanic"),
    ]);
    expect(linkProblems(g, RULES, ["MEC-001|refines|MEC-001"])).toEqual([]);
  });

  it("reports a loop through an allowed verb even with nothing else wrong", () => {
    const g = graphOf([card("MEC-001", "mechanic", [["needs", "MEC-001"]])]);
    expect(linkProblems(g, RULES, [])).toEqual(["needs loop among: MEC-001"]);
  });

  it("reports a loop that is also a baselined break", () => {
    const g = graphOf([card("AREA-001", "area", [["part-of", "AREA-001"]])]);
    expect(linkProblems(g, RULES, [])).toEqual(["part-of loop among: AREA-001"]);
  });

  it("is quiet with no acyclic verbs", () => {
    const g = graphOf([card("MEC-001", "mechanic", [["needs", "MEC-001"]])]);
    expect(linkProblems(g, { ...RULES, acyclic: [] }, [])).toEqual([]);
  });
});
