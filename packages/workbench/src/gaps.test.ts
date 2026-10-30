import { describe, expect, it } from "vitest";
import { findGaps, GAP_RULE_LABEL, type Gap, gapsPerArea, groupGaps } from "./gaps.ts";
import type { Card, CardStatus, Graph } from "./graph-types.ts";
import { RELS } from "./graph-types.ts";

type Spec = { type: string; status?: CardStatus; links?: [string, string][] };

function graphOf(specs: Record<string, Spec>): Graph {
  const nodes: Graph["nodes"] = {};
  const edges: Graph["edges"] = [];
  for (const [id, s] of Object.entries(specs)) {
    const c: Card = {
      id,
      type: s.type,
      title: id,
      status: s.status ?? "open",
      layer: null,
      by: null,
      links: (s.links ?? []).map(([rel, to]) => ({ rel, to })),
      sources: [],
      body: "",
      bodyHtml: "",
      file: `${id}.md`,
      data: {},
    };
    nodes[id] = { kind: "card", ...c };
    for (const l of c.links) {
      edges.push({ from: id, to: l.to, rel: l.rel });
      if (!specs[l.to]) {
        nodes[l.to] = { kind: "ref", id: l.to, idKind: "requirement", title: l.to, foundIn: [] };
      }
    }
  }
  return { nodes, edges, rels: RELS };
}

const rulesFor = (g: Graph, id: string) =>
  findGaps(g)
    .filter((x) => x.id === id && x.rule !== "conflict-unparked")
    .map((x) => x.rule);

describe("gaps", () => {
  it("open question: found until an answers link points at it", () => {
    const bad = graphOf({ "Q-001": { type: "question" } });
    expect(rulesFor(bad, "Q-001")).toEqual(["open-question"]);
    const ok = graphOf({
      "Q-001": { type: "question" },
      "DEC-001": { type: "decision", links: [["answers", "Q-001"]] },
    });
    expect(rulesFor(ok, "Q-001")).toEqual([]);
  });

  it("mechanic: found until it links to a screen, ui or cue, either way", () => {
    const bad = graphOf({ "MEC-001": { type: "mechanic" } });
    expect(rulesFor(bad, "MEC-001")).toEqual(["mechanic-surface"]);
    const out = graphOf({
      "MEC-001": { type: "mechanic", links: [["uses", "CUE-001"]] },
      "CUE-001": { type: "cue" },
    });
    expect(rulesFor(out, "MEC-001")).toEqual([]);
    const back = graphOf({
      "MEC-001": { type: "mechanic" },
      "SCR-001": { type: "screen", links: [["uses", "MEC-001"]] },
    });
    expect(rulesFor(back, "MEC-001")).toEqual([]);
  });

  it("conflict: found once for a pair, not once either card is parked", () => {
    const both = graphOf({
      "OPT-001": { type: "option", links: [["conflicts", "OPT-002"]] },
      "OPT-002": { type: "option", links: [["conflicts", "OPT-001"]] },
    });
    expect(findGaps(both).filter((g) => g.rule === "conflict-unparked")).toHaveLength(1);
    const parked = graphOf({
      "OPT-001": { type: "option", links: [["conflicts", "OPT-002"]] },
      "OPT-002": { type: "option", status: "parked" },
    });
    expect(findGaps(parked)).toEqual([]);
  });

  it("conflict with a document ID: settled once the card is parked or decided", () => {
    const g = (status: "open" | "parked" | "decided" | "proposed") =>
      graphOf({ "DEC-001": { type: "decision", status, links: [["conflicts", "R-X-1"]] } });
    const conflicts = (x: Graph) => findGaps(x).filter((f) => f.rule === "conflict-unparked");
    expect(conflicts(g("open"))).toHaveLength(1);
    expect(conflicts(g("proposed"))).toHaveLength(1);
    expect(conflicts(g("parked"))).toHaveLength(0);
    expect(conflicts(g("decided"))).toHaveLength(0);
  });

  it("conflict with an old document question ID (Q3) is settled once decided", () => {
    const g = graphOf({
      "DEC-001": { type: "decision", status: "decided", links: [["conflicts", "Q3"]] },
    });
    const ref = g.nodes.Q3;
    if (ref?.kind === "ref") ref.idKind = "question";
    expect(findGaps(g).filter((f) => f.rule === "conflict-unparked")).toHaveLength(0);
  });

  it("conflict with a card-shaped ID that has no card is not settled by a decided card", () => {
    const g = graphOf({
      "DEC-001": { type: "decision", status: "decided", links: [["conflicts", "DEC-999"]] },
    });
    const ref = g.nodes["DEC-999"];
    if (ref?.kind === "ref") ref.idKind = "decision";
    expect(findGaps(g).filter((f) => f.rule === "conflict-unparked")).toHaveLength(1);
  });

  it("conflict between cards: a decided card does not settle it, only a parked one", () => {
    const decided = graphOf({
      "DEC-001": { type: "decision", status: "decided", links: [["conflicts", "OPT-002"]] },
      "OPT-002": { type: "option" },
    });
    expect(findGaps(decided).filter((f) => f.rule === "conflict-unparked")).toHaveLength(1);
  });

  it("decided ruling: found until a deliverable reaches it by needs or uses", () => {
    const none = graphOf({ "DEC-001": { type: "decision", status: "decided" } });
    expect(rulesFor(none, "DEC-001")).toEqual(["no-deliverable"]);
    const ok = graphOf({
      "DEC-001": { type: "decision", status: "decided" },
      "SCR-001": { type: "screen", links: [["needs", "DEC-001"]] },
    });
    expect(rulesFor(ok, "DEC-001")).toEqual([]);
    const open = graphOf({ "DEC-001": { type: "decision", status: "open" } });
    expect(rulesFor(open, "DEC-001")).toEqual([]);
  });

  it("area: found until something in its part-of subtree is decided", () => {
    const base = (leaf: CardStatus) =>
      graphOf({
        "AREA-001": { type: "area" },
        "AREA-002": { type: "area", links: [["part-of", "AREA-001"]] },
        "DEC-001": {
          type: "decision",
          status: leaf,
          links: [["part-of", "AREA-002"]],
        },
        "SCR-001": { type: "screen", links: [["needs", "DEC-001"]] },
      });
    expect(findGaps(base("open")).map((g) => g.id)).toEqual(["AREA-001", "AREA-002"]);
    expect(findGaps(base("decided"))).toEqual([]);
  });

  it("a card in several areas counts once in each, and once overall", () => {
    const g = graphOf({
      "AREA-001": { type: "area", status: "decided" },
      "AREA-002": { type: "area", status: "decided" },
      "DEC-001": {
        type: "decision",
        status: "decided",
        links: [
          ["part-of", "AREA-001"],
          ["part-of", "AREA-002"],
          ["part-of", "AREA-001"],
        ],
      },
      "Q-001": { type: "question" },
    });
    const gaps = findGaps(g);
    expect(gaps.filter((x) => x.id === "DEC-001")).toHaveLength(1);
    const per = gapsPerArea(gaps);
    expect(per.get("AREA-001")).toBe(per.get("AREA-002"));
    const group = groupGaps(gaps).find((x) => x.rule === "no-deliverable");
    expect(group?.count).toBe(1);
    expect(group?.byArea.map((a) => a.area)).toEqual(["AREA-001", "AREA-002"]);
  });
});

const ofRule = (g: Graph, rule: string) => findGaps(g).filter((x) => x.rule === rule);
const setKind = (g: Graph, id: string, idKind: string) => {
  const n = g.nodes[id];
  if (n?.kind === "ref") n.idKind = idKind;
};

describe("gaps: empty and trivial graphs", () => {
  it("finds nothing in an empty graph", () => {
    expect(findGaps({ nodes: {}, edges: [], rels: RELS })).toEqual([]);
    expect(groupGaps([])).toEqual([]);
    expect(gapsPerArea([]).size).toBe(0);
  });

  it("ignores ref nodes: only cards can have gaps", () => {
    const g: Graph = {
      nodes: { "Q-001": { kind: "ref", id: "Q-001", idKind: "question", title: "q", foundIn: [] } },
      edges: [],
      rels: RELS,
    };
    expect(findGaps(g)).toEqual([]);
  });

  it("ignores card types no rule looks at", () => {
    const g = graphOf({ "OPT-001": { type: "option" }, "NOTE-001": { type: "note" } });
    expect(findGaps(g)).toEqual([]);
  });
});

describe("gaps: open question edge cases", () => {
  it("is not a gap once decided, parked or proposed", () => {
    for (const status of ["decided", "parked", "proposed"] as const) {
      expect(ofRule(graphOf({ "Q-001": { type: "question", status } }), "open-question")).toEqual(
        [],
      );
    }
  });

  it("is answered by any card, however it is typed, and by a link from a ref", () => {
    const g = graphOf({
      "Q-001": { type: "question" },
      "Q-002": { type: "question" },
      "MEC-001": { type: "mechanic", links: [["answers", "Q-001"]] },
    });
    g.edges.push({ from: "R-X-1", to: "Q-002", rel: "answers" });
    expect(ofRule(g, "open-question")).toEqual([]);
  });

  it("is not answered by another verb pointing at it, or by answering something else", () => {
    const g = graphOf({
      "Q-001": { type: "question" },
      "DEC-001": {
        type: "decision",
        links: [
          ["uses", "Q-001"],
          ["answers", "Q-009"],
        ],
      },
    });
    expect(ofRule(g, "open-question").map((x) => x.id)).toEqual(["Q-001"]);
  });

  it("is not answered by the question's own outgoing answers link", () => {
    const g = graphOf({ "Q-001": { type: "question", links: [["answers", "Q-002"]] } });
    // Q-001 answers Q-002 (a ref); Q-001 itself is still open and unanswered.
    expect(ofRule(g, "open-question").map((x) => x.id)).toEqual(["Q-001"]);
  });
});

describe("gaps: mechanic surface edge cases", () => {
  it("is not satisfied by a link to a ref, or to a card of another type", () => {
    const g = graphOf({
      "MEC-001": {
        type: "mechanic",
        links: [
          ["uses", "CUE-999"],
          ["uses", "MEC-002"],
        ],
      },
      "MEC-002": { type: "mechanic" },
    });
    expect(ofRule(g, "mechanic-surface").map((x) => x.id)).toEqual(["MEC-001", "MEC-002"]);
  });

  it("is satisfied by each of screen, ui and cue", () => {
    for (const type of ["screen", "ui", "cue"]) {
      const g = graphOf({
        "MEC-001": { type: "mechanic", links: [["uses", "X-001"]] },
        "X-001": { type },
      });
      expect(ofRule(g, "mechanic-surface")).toEqual([]);
    }
  });

  it("is satisfied by any non-conflict verb, and a surface with no mechanic is not a gap", () => {
    const g = graphOf({
      "MEC-001": { type: "mechanic", links: [["needs", "SCR-001"]] },
      "SCR-001": { type: "screen" },
    });
    expect(findGaps(g)).toEqual([]);
  });
});

describe("gaps: conflict edge cases", () => {
  const conflicts = (g: Graph) => ofRule(g, "conflict-unparked");

  it("names the other side in the detail and reports the card that wrote it", () => {
    const g = graphOf({
      "OPT-001": { type: "option", links: [["conflicts", "OPT-002"]] },
      "OPT-002": { type: "option" },
    });
    expect(conflicts(g)).toEqual([
      {
        id: "OPT-001",
        rule: "conflict-unparked",
        title: "OPT-001",
        areas: [],
        detail: "conflicts with OPT-002",
      },
    ]);
  });

  it("is one gap when written on both cards, reported on the first edge's card", () => {
    const g = graphOf({
      "OPT-002": { type: "option", links: [["conflicts", "OPT-001"]] },
      "OPT-001": { type: "option", links: [["conflicts", "OPT-002"]] },
    });
    expect(conflicts(g).map((x) => x.id)).toEqual(["OPT-002"]);
  });

  it("is skipped when the writing card is parked, even if the other side is open", () => {
    const g = graphOf({
      "OPT-001": { type: "option", status: "parked", links: [["conflicts", "OPT-002"]] },
      "OPT-002": { type: "option" },
    });
    expect(conflicts(g)).toEqual([]);
  });

  it("settles a conflict with an asset or engine ID once decided, not while open", () => {
    for (const kind of ["asset", "engine", "requirement", "question"]) {
      const decided = graphOf({
        "DEC-001": { type: "decision", status: "decided", links: [["conflicts", "X-1"]] },
      });
      setKind(decided, "X-1", kind);
      expect(conflicts(decided)).toEqual([]);
      const open = graphOf({
        "DEC-001": { type: "decision", status: "open", links: [["conflicts", "X-1"]] },
      });
      setKind(open, "X-1", kind);
      expect(conflicts(open)).toHaveLength(1);
    }
  });

  it("does not drop a conflict with an ID that is in no node at all", () => {
    const g = graphOf({ "DEC-001": { type: "decision", status: "decided" } });
    g.edges.push({ from: "DEC-001", to: "GHOST-1", rel: "conflicts" });
    expect(conflicts(g)).toHaveLength(1);
  });

  it("skips a conflict written by a ref node", () => {
    const g = graphOf({ "OPT-001": { type: "option" } });
    g.nodes["R-X-1"] = { kind: "ref", id: "R-X-1", idKind: "requirement", title: "r", foundIn: [] };
    g.edges.push({ from: "R-X-1", to: "OPT-001", rel: "conflicts" });
    expect(conflicts(g)).toEqual([]);
  });

  it("reports one gap per distinct pair when a card conflicts with two others", () => {
    const g = graphOf({
      "OPT-001": {
        type: "option",
        links: [
          ["conflicts", "OPT-002"],
          ["conflicts", "OPT-003"],
        ],
      },
      "OPT-002": { type: "option" },
      "OPT-003": { type: "option" },
    });
    expect(conflicts(g).map((x) => x.detail)).toEqual([
      "conflicts with OPT-002",
      "conflicts with OPT-003",
    ]);
  });

  it("carries the writing card's areas", () => {
    const g = graphOf({
      "AREA-001": { type: "area" },
      "OPT-001": {
        type: "option",
        links: [
          ["part-of", "AREA-001"],
          ["conflicts", "OPT-002"],
        ],
      },
      "OPT-002": { type: "option" },
    });
    expect(conflicts(g)[0]?.areas).toEqual(["AREA-001"]);
  });
});

describe("gaps: no deliverable edge cases", () => {
  const rule = "no-deliverable";
  const reachedBy = (type: string, rel: string, status: CardStatus = "decided") =>
    graphOf({
      "DEC-001": { type: "decision", status: "decided" },
      "X-001": { type, status, links: [[rel, "DEC-001"]] },
    });

  it("applies to decided decisions only, not to decided cards of other types", () => {
    for (const type of ["mechanic", "screen", "ui", "cue", "question", "option", "area"]) {
      expect(ofRule(graphOf({ "X-001": { type, status: "decided" } }), rule)).toEqual([]);
    }
    for (const status of ["open", "proposed", "parked", "answered"] as const) {
      expect(ofRule(graphOf({ "DEC-001": { type: "decision", status } }), rule)).toEqual([]);
    }
  });

  it("is reached by each of screen, ui, cue, mechanic and art, with needs or uses", () => {
    for (const type of ["screen", "ui", "cue", "mechanic", "art"]) {
      for (const rel of ["needs", "uses"]) expect(ofRule(reachedBy(type, rel), rule)).toEqual([]);
    }
  });

  it("is not reached by another verb, by a non-deliverable, or by a parked deliverable", () => {
    expect(ofRule(reachedBy("screen", "affects"), rule)).toHaveLength(1);
    expect(ofRule(reachedBy("screen", "conflicts"), rule)).toHaveLength(1);
    expect(ofRule(reachedBy("decision", "needs", "open"), rule)).toHaveLength(1);
    expect(ofRule(reachedBy("option", "uses"), rule)).toHaveLength(1);
    expect(ofRule(reachedBy("screen", "needs", "parked"), rule)).toHaveLength(1);
  });

  it("is not reached through a parked card in the middle of the path", () => {
    for (const middle of [
      { type: "mechanic", id: "MEC-001" },
      { type: "decision", id: "DEC-002" },
    ]) {
      const path = (status: CardStatus) =>
        graphOf({
          "SCR-001": { type: "screen", links: [["needs", middle.id]] },
          [middle.id]: { type: middle.type, status, links: [["uses", "DEC-001"]] },
          "DEC-001": { type: "decision", status: "decided" },
        });
      expect(ofRule(path("open"), rule).map((x) => x.id)).not.toContain("DEC-001");
      expect(ofRule(path("parked"), rule).map((x) => x.id)).toContain("DEC-001");
    }
  });

  it("is not reached by the ruling's own outgoing link to a deliverable", () => {
    const g = graphOf({
      "DEC-001": { type: "decision", status: "decided", links: [["needs", "SCR-001"]] },
      "SCR-001": { type: "screen" },
    });
    expect(ofRule(g, rule).map((x) => x.id)).toEqual(["DEC-001"]);
  });

  it("is reached over several hops, and ends on a needs loop", () => {
    const g = graphOf({
      "UI-001": { type: "ui", links: [["uses", "MEC-001"]] },
      "MEC-001": { type: "mechanic", links: [["needs", "DEC-001"]] },
      "DEC-001": { type: "decision", status: "decided", links: [["needs", "DEC-002"]] },
      "DEC-002": { type: "decision", status: "decided", links: [["needs", "DEC-001"]] },
      "DEC-003": { type: "decision", status: "decided", links: [["needs", "DEC-003"]] },
    });
    expect(ofRule(g, rule).map((x) => x.id)).toEqual(["DEC-003"]);
  });
});

describe("gaps: answered questions", () => {
  const conflicts = (g: Graph) => ofRule(g, "conflict-unparked");

  it("skips a conflict written on an answered question, by status or by an answers link", () => {
    const byStatus = graphOf({
      "Q-001": { type: "question", status: "answered", links: [["conflicts", "DEC-001"]] },
      "DEC-001": { type: "decision", status: "decided" },
    });
    expect(conflicts(byStatus)).toEqual([]);
    const byLink = graphOf({
      "Q-001": { type: "question", links: [["conflicts", "DEC-001"]] },
      "DEC-001": { type: "decision", status: "decided" },
      "DEC-002": { type: "decision", links: [["answers", "Q-001"]] },
    });
    expect(conflicts(byLink)).toEqual([]);
  });

  it("skips a conflict pointing at an answered question, and with a document ID", () => {
    const into = graphOf({
      "OPT-001": { type: "option", links: [["conflicts", "Q-001"]] },
      "Q-001": { type: "question", status: "answered" },
    });
    expect(conflicts(into)).toEqual([]);
    const doc = graphOf({
      "Q-001": { type: "question", status: "answered", links: [["conflicts", "R-X-1"]] },
    });
    expect(conflicts(doc)).toEqual([]);
  });

  it("keeps a conflict on an open question", () => {
    const g = graphOf({
      "Q-001": { type: "question", links: [["conflicts", "DEC-001"]] },
      "DEC-001": { type: "decision", status: "decided" },
    });
    expect(conflicts(g)).toHaveLength(1);
  });
});

describe("gaps: area edge cases", () => {
  const rule = "area-undecided";

  it("flags an area with no children", () => {
    expect(ofRule(graphOf({ "AREA-001": { type: "area" } }), rule).map((x) => x.id)).toEqual([
      "AREA-001",
    ]);
  });

  it("does not count the area's own status", () => {
    const g = graphOf({ "AREA-001": { type: "area", status: "decided" } });
    expect(ofRule(g, rule)).toHaveLength(1);
  });

  it("is satisfied by a decided card several levels down", () => {
    const g = graphOf({
      "AREA-001": { type: "area" },
      "AREA-002": { type: "area", links: [["part-of", "AREA-001"]] },
      "AREA-003": { type: "area", links: [["part-of", "AREA-002"]] },
      "OPT-001": { type: "option", status: "decided", links: [["part-of", "AREA-003"]] },
    });
    expect(ofRule(g, rule).map((x) => x.id)).toEqual([]);
  });

  it("flags the parent when only a sibling area is decided", () => {
    const g = graphOf({
      "AREA-001": { type: "area" },
      "AREA-002": { type: "area" },
      "OPT-001": { type: "option", status: "decided", links: [["part-of", "AREA-002"]] },
    });
    expect(ofRule(g, rule).map((x) => x.id)).toEqual(["AREA-001"]);
  });

  it("ends on a part-of loop between areas instead of hanging", () => {
    const g = graphOf({
      "AREA-001": { type: "area", links: [["part-of", "AREA-002"]] },
      "AREA-002": { type: "area", links: [["part-of", "AREA-001"]] },
    });
    expect(ofRule(g, rule).map((x) => x.id)).toEqual(["AREA-001", "AREA-002"]);
  });

  it("ends on a card that is part of itself", () => {
    const g = graphOf({ "AREA-001": { type: "area", links: [["part-of", "AREA-001"]] } });
    expect(ofRule(g, rule).map((x) => x.id)).toEqual(["AREA-001"]);
  });

  it("reports an area as its own area", () => {
    const g = graphOf({
      "AREA-001": { type: "area" },
      "AREA-002": { type: "area", links: [["part-of", "AREA-001"]] },
    });
    const gaps = ofRule(g, rule);
    expect(gaps.find((x) => x.id === "AREA-002")?.areas).toEqual(["AREA-002"]);
  });

  it("ignores a part-of to a card that is not an area when listing a card's areas", () => {
    const g = graphOf({
      "MEC-001": { type: "mechanic", links: [["part-of", "MEC-002"]] },
      "MEC-002": { type: "mechanic" },
    });
    expect(findGaps(g).find((x) => x.id === "MEC-001")?.areas).toEqual([]);
  });

  it("ignores a part-of to a ref", () => {
    const g = graphOf({ "MEC-001": { type: "mechanic", links: [["part-of", "R-X-1"]] } });
    expect(findGaps(g).find((x) => x.id === "MEC-001")?.areas).toEqual([]);
  });
});

describe("findGaps: ordering", () => {
  it("orders by rule, then by ID with numbers as numbers", () => {
    const g = graphOf({
      "MEC-10": { type: "mechanic" },
      "MEC-2": { type: "mechanic" },
      "Q-10": { type: "question" },
      "Q-2": { type: "question" },
    });
    expect(findGaps(g).map((x) => `${x.rule}:${x.id}`)).toEqual([
      "open-question:Q-2",
      "open-question:Q-10",
      "mechanic-surface:MEC-2",
      "mechanic-surface:MEC-10",
    ]);
  });

  it("orders two conflicts from one card by detail", () => {
    const g = graphOf({
      "OPT-001": {
        type: "option",
        links: [
          ["conflicts", "OPT-009"],
          ["conflicts", "OPT-003"],
        ],
      },
      "OPT-003": { type: "option" },
      "OPT-009": { type: "option" },
    });
    expect(findGaps(g).map((x) => x.detail)).toEqual([
      "conflicts with OPT-003",
      "conflicts with OPT-009",
    ]);
  });

  it("returns the same result when run twice", () => {
    const g = graphOf({ "Q-001": { type: "question" }, "MEC-001": { type: "mechanic" } });
    expect(findGaps(g)).toEqual(findGaps(g));
  });

  it("does not change the graph", () => {
    const g = graphOf({ "Q-001": { type: "question" } });
    const before = JSON.stringify(g);
    findGaps(g);
    expect(JSON.stringify(g)).toBe(before);
  });
});

describe("groupGaps and gapsPerArea: edge cases", () => {
  const gap = (id: string, rule: Gap["rule"], areas: string[]): Gap => ({
    id,
    rule,
    title: id,
    areas,
  });

  it("orders groups by the rule list and labels them", () => {
    const groups = groupGaps([gap("A-1", "area-undecided", []), gap("Q-1", "open-question", [])]);
    expect(groups.map((x) => [x.rule, x.label])).toEqual([
      ["open-question", GAP_RULE_LABEL["open-question"]],
      ["area-undecided", GAP_RULE_LABEL["area-undecided"]],
    ]);
  });

  it("omits a rule with no gaps", () => {
    expect(groupGaps([gap("Q-1", "open-question", [])]).map((x) => x.rule)).toEqual([
      "open-question",
    ]);
  });

  it("puts cards with no area last, under a null area", () => {
    const [group] = groupGaps([
      gap("Q-1", "open-question", []),
      gap("Q-2", "open-question", ["AREA-001"]),
    ]);
    expect(group?.byArea.map((a) => a.area)).toEqual(["AREA-001", null]);
    expect(group?.byArea[1]?.gaps.map((x) => x.id)).toEqual(["Q-1"]);
  });

  it("omits the null area when every card has one", () => {
    const [group] = groupGaps([gap("Q-1", "open-question", ["AREA-001"])]);
    expect(group?.byArea.map((a) => a.area)).toEqual(["AREA-001"]);
  });

  it("orders areas with numbers as numbers", () => {
    const [group] = groupGaps([
      gap("Q-1", "open-question", ["AREA-10"]),
      gap("Q-2", "open-question", ["AREA-2"]),
    ]);
    expect(group?.byArea.map((a) => a.area)).toEqual(["AREA-2", "AREA-10"]);
  });

  it("lists a card in several areas under each, but counts it once", () => {
    const [group] = groupGaps([gap("Q-1", "open-question", ["AREA-1", "AREA-2"])]);
    expect(group?.count).toBe(1);
    expect(group?.byArea.map((a) => a.gaps.map((x) => x.id))).toEqual([["Q-1"], ["Q-1"]]);
  });

  it("makes the group counts add up to the number of gaps", () => {
    const gaps = [
      gap("Q-1", "open-question", []),
      gap("Q-2", "open-question", ["A-1", "A-2"]),
      gap("M-1", "mechanic-surface", ["A-1"]),
    ];
    expect(groupGaps(gaps).reduce((n, x) => n + x.count, 0)).toBe(gaps.length);
  });

  it("counts gaps per area, once for each area a card is in, and skips cards with none", () => {
    const per = gapsPerArea([
      gap("Q-1", "open-question", ["A-1", "A-2"]),
      gap("Q-2", "open-question", ["A-1"]),
      gap("Q-3", "open-question", []),
    ]);
    expect([...per]).toEqual([
      ["A-1", 2],
      ["A-2", 1],
    ]);
  });
});
