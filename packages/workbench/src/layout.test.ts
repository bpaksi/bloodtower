import { describe, expect, it } from "vitest";
import type { Graph } from "./graph-types.ts";
import { BOX, DENSE_AT, labelPoint, layout, neighbours, type Placed } from "./layout.ts";

const rels = { needs: { label: "needs", reverse: "needed by" } };

function star(count: number, extra: [string, string][] = []): Graph {
  const edges = [
    ...Array.from({ length: count }, (_, i) => ({ from: "F", to: `N${i}`, rel: "needs" })),
    ...extra.map(([from, to]) => ({ from, to, rel: "needs" })),
  ];
  return { nodes: {}, edges, rels };
}

const overlaps = (a: Placed, b: Placed) => {
  const box = (p: Placed) => (p.compact ? BOX[2] : BOX[p.ring]);
  return (
    Math.abs(a.x - b.x) < (box(a).w + box(b).w) / 2 &&
    Math.abs(a.y - b.y) < (box(a).h + box(b).h) / 2
  );
};

describe("layout", () => {
  it("places a lone focus at the centre", () => {
    const r = layout(star(0), "F", 1000, 600);
    expect(r.placed).toEqual([{ id: "F", x: 500, y: 300, ring: 0 }]);
    expect(r.dense).toBe(false);
  });

  it("puts the first neighbour at the top and the next clockwise", () => {
    const { placed } = layout(star(4), "F", 1200, 800);
    const [, n0, n1] = placed;
    expect(n0?.y).toBeLessThan(400);
    expect(Math.abs((n0?.x ?? 0) - 600)).toBeLessThanOrEqual(1);
    expect(n1?.x).toBeGreaterThan(600);
  });

  it("adds second-step cards behind a neighbour, capped and never repeated", () => {
    const g = star(2, [
      ["N0", "S1"],
      ["N0", "S2"],
      ["N0", "S3"],
      ["N0", "S4"],
      ["N1", "S1"],
      ["N0", "N1"],
    ]);
    const { placed } = layout(g, "F", 1400, 900, 3);
    const outer = placed.filter((p) => p.ring === 2);
    expect(outer.map((p) => p.id)).toEqual(["S1", "S2", "S3"]);
    expect(outer.every((p) => p.via === "N0")).toBe(true);
  });

  it("goes compact with no second step above DENSE_AT neighbours", () => {
    const r = layout(star(DENSE_AT + 1, [["N0", "S1"]]), "F", 1400, 900);
    expect(r.dense).toBe(true);
    expect(r.placed.some((p) => p.ring === 2)).toBe(false);
    expect(r.placed.slice(1).every((p) => p.compact)).toBe(true);
  });

  it("is not dense at exactly DENSE_AT", () => {
    expect(layout(star(DENSE_AT), "F", 1400, 900).dense).toBe(false);
  });

  it("returns whole pixels and leaves no overlaps", () => {
    const g = star(8, [
      ["N0", "A"],
      ["N0", "B"],
      ["N0", "C"],
      ["N1", "D"],
      ["N1", "E"],
    ]);
    const { placed } = layout(g, "F", 1200, 800);
    for (const p of placed) {
      expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true);
    }
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        expect(overlaps(placed[i] as Placed, placed[j] as Placed)).toBe(false);
      }
    }
  });

  it("gives the same result twice (server and browser must agree)", () => {
    expect(layout(star(6), "F", 1100, 700)).toEqual(layout(star(6), "F", 1100, 700));
  });
});

describe("labelPoint", () => {
  const at = (x: number, y: number, ring: 0 | 1 | 2): Placed => ({ id: "x", x, y, ring });
  it("sits midway between the visible edges of two cards on a row", () => {
    // Ring 0 half-width 125, ring 1 half-width 100: the visible line runs 125..400.
    expect(labelPoint(at(0, 0, 0), at(500, 0, 1))).toEqual({ x: 262.5, y: 0 });
  });
  it("sits midway between the visible edges of two cards in a column", () => {
    // Ring 0 half-height 35, ring 1 half-height 32: the visible line runs 35..268.
    expect(labelPoint(at(0, 0, 0), at(0, 300, 1))).toEqual({ x: 0, y: 151.5 });
  });
  it("falls back to the centre when the boxes touch or overlap", () => {
    expect(labelPoint(at(0, 0, 0), at(100, 0, 1))).toEqual({ x: 50, y: 0 });
  });
});

describe("neighbours", () => {
  const two = {
    needs: { label: "needs", reverse: "needed by" },
    uses: { label: "uses", reverse: "used by" },
  };
  const g = (edges: Graph["edges"], r = two): Graph => ({ nodes: {}, edges, rels: r });

  it("reads the verb from the focus card's side", () => {
    const graph = g([
      { from: "F", to: "A", rel: "needs" },
      { from: "B", to: "F", rel: "needs" },
    ]);
    expect(neighbours(graph, "F")).toEqual([
      { id: "A", verbs: ["needs"], notes: [] },
      { id: "B", verbs: ["needed by"], notes: [] },
    ]);
  });

  it("ignores edges that do not touch the focus and edges from the focus to itself", () => {
    const graph = g([
      { from: "A", to: "B", rel: "needs" },
      { from: "F", to: "F", rel: "needs" },
    ]);
    expect(neighbours(graph, "F")).toEqual([]);
  });

  it("merges several edges to one card into one neighbour, without repeating a verb or note", () => {
    const graph = g([
      { from: "F", to: "A", rel: "needs", note: "x" },
      { from: "F", to: "A", rel: "needs", note: "x" },
      { from: "F", to: "A", rel: "uses", note: "y" },
      { from: "F", to: "A", rel: "uses" },
    ]);
    expect(neighbours(graph, "F")).toEqual([
      { id: "A", verbs: ["needs", "uses"], notes: ["x", "y"] },
    ]);
  });

  it("keeps the earliest order when a card is linked by several verbs", () => {
    const graph = g([
      { from: "F", to: "Z", rel: "uses" },
      { from: "F", to: "A", rel: "uses" },
      { from: "F", to: "Z", rel: "needs" },
    ]);
    // Z has "needs" (order 0), so it sorts ahead of A (order 2).
    expect(neighbours(graph, "F").map((n) => n.id)).toEqual(["Z", "A"]);
  });

  it("lists outgoing before incoming within one verb, then by ID with numbers as numbers", () => {
    const graph = g([
      { from: "N10", to: "F", rel: "needs" },
      { from: "N2", to: "F", rel: "needs" },
      { from: "F", to: "N11", rel: "needs" },
      { from: "F", to: "N3", rel: "needs" },
    ]);
    expect(neighbours(graph, "F").map((n) => n.id)).toEqual(["N3", "N11", "N2", "N10"]);
  });

  it("uses the verb name for both directions when the verb is not in the table", () => {
    const graph = g([
      { from: "F", to: "A", rel: "mystery" },
      { from: "B", to: "F", rel: "mystery" },
    ]);
    expect(neighbours(graph, "F")).toEqual([
      { id: "A", verbs: ["mystery"], notes: [] },
      { id: "B", verbs: ["mystery"], notes: [] },
    ]);
  });

  // Known bug: an unknown verb has indexOf -1, so its order is negative and it sorts first;
  // backlinks() puts unknown verbs last. Remove `.fails` when neighbours() is fixed.
  it.fails("puts an unknown verb after every known one, as backlinks does", () => {
    const graph = g([
      { from: "F", to: "A", rel: "mystery" },
      { from: "F", to: "B", rel: "uses" },
    ]);
    expect(neighbours(graph, "F").map((n) => n.id)).toEqual(["B", "A"]);
  });
});

describe("layout: edge cases", () => {
  it("treats a focus that is not in the graph as a lone card", () => {
    const r = layout(star(3), "NOPE", 800, 600);
    expect(r.placed).toEqual([{ id: "NOPE", x: 400, y: 300, ring: 0 }]);
    expect(r.ring1).toEqual([]);
  });

  it("adds no second step when perNeighbour is 0", () => {
    const g = star(2, [["N0", "S1"]]);
    expect(layout(g, "F", 1400, 900, 0).placed.some((p) => p.ring === 2)).toBe(false);
  });

  it("never moves the focus, even on a small canvas with many neighbours", () => {
    const r = layout(star(DENSE_AT), "F", 500, 400);
    expect(r.placed[0]).toEqual({ id: "F", x: 250, y: 200, ring: 0 });
  });

  it("starts a dense ring at the top, with the first card on the inner ring", () => {
    const { placed, ring1 } = layout(star(DENSE_AT + 2), "F", 1400, 900);
    expect(ring1).toHaveLength(DENSE_AT + 2);
    const first = placed[1] as Placed;
    expect(Math.abs(first.x - 700)).toBeLessThanOrEqual(1);
    expect(first.y).toBeLessThan(450);
    expect(first.ring).toBe(1);
  });

  it("keeps a dense layout free of overlaps", () => {
    const { placed } = layout(star(DENSE_AT + 6), "F", 1400, 900);
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        expect(overlaps(placed[i] as Placed, placed[j] as Placed)).toBe(false);
      }
    }
  });

  it("places every neighbour once, in neighbours() order", () => {
    const { placed, ring1 } = layout(star(5), "F", 1200, 800);
    expect(placed.filter((p) => p.ring === 1).map((p) => p.id)).toEqual(ring1.map((n) => n.id));
  });

  it("does not give a card a second-step slot when it is already a neighbour or the focus", () => {
    const g = star(2, [
      ["N0", "F"],
      ["N0", "N1"],
    ]);
    expect(layout(g, "F", 1400, 900).placed.filter((p) => p.ring === 2)).toEqual([]);
  });
});

describe("labelPoint: edge cases", () => {
  const at = (x: number, y: number, ring: 0 | 1 | 2, compact?: boolean): Placed => ({
    id: "x",
    x,
    y,
    ring,
    ...(compact ? { compact } : {}),
  });

  it("is symmetric for two cards on the same ring", () => {
    const a = at(0, 0, 1);
    const b = at(600, 0, 1);
    expect(labelPoint(a, b).x + labelPoint(b, a).x).toBe(600);
  });

  it("uses the small box for a compact card, whatever its ring", () => {
    // Ring 0 half-width 125, compact half-width 75: visible line runs 125..425.
    expect(labelPoint(at(0, 0, 0), at(500, 0, 1, true))).toEqual({ x: 275, y: 0 });
  });

  it("does not return NaN for two cards at the same spot", () => {
    const p = labelPoint(at(10, 20, 0), at(10, 20, 1));
    expect(p).toEqual({ x: 10, y: 20 });
  });

  it("stays on the line between two cards placed diagonally", () => {
    const p = labelPoint(at(0, 0, 0), at(400, 300, 1));
    expect(p.x / 400).toBeCloseTo(p.y / 300, 10);
    expect(p.x).toBeGreaterThan(0);
    expect(p.x).toBeLessThan(400);
  });
});
