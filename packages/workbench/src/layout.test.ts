import { describe, expect, it } from "vitest";
import type { Graph } from "./graph-types.ts";
import { BOX, DENSE_AT, labelPoint, layout, type Placed } from "./layout.ts";

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
