import { describe, expect, it } from "vitest";
import { findGaps, gapsPerArea, groupGaps } from "./gaps.ts";
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

  it("decided card: found until it links to an R- ID, and conflicts does not count", () => {
    const none = graphOf({ "DEC-001": { type: "decision", status: "decided" } });
    expect(rulesFor(none, "DEC-001")).toEqual(["decided-no-requirement"]);
    const onlyConflict = graphOf({
      "DEC-001": { type: "decision", status: "decided", links: [["conflicts", "R-X-1"]] },
    });
    expect(rulesFor(onlyConflict, "DEC-001")).toEqual(["decided-no-requirement"]);
    const ok = graphOf({
      "DEC-001": { type: "decision", status: "decided", links: [["becomes", "R-X-1"]] },
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
          links: [
            ["part-of", "AREA-002"],
            ["uses", "R-X-1"],
          ],
        },
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
    const group = groupGaps(gaps).find((x) => x.rule === "decided-no-requirement");
    expect(group?.count).toBe(1);
    expect(group?.byArea.map((a) => a.area)).toEqual(["AREA-001", "AREA-002"]);
  });
});
