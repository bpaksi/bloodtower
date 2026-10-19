import { type Edge, type Graph, RELS, type Rel } from "./graph-types.ts";

/** A neighbour of the focus card, with the verb read from the focus card's side. */
export type Neighbour = { id: string; verbs: string[]; notes: string[] };

export type Placed = {
  id: string;
  x: number;
  y: number;
  ring: 0 | 1 | 2;
  via?: string;
  /** Drawn at the small size (busy focus card with many neighbours). */
  compact?: boolean;
};

const REL_ORDER = Object.keys(RELS) as Rel[];

function verbFrom(focus: string, e: Edge): string {
  return e.from === focus ? RELS[e.rel].label : RELS[e.rel].reverse;
}

/** Everything one link away from `focus`, grouped by verb so related cards sit together. */
export function neighbours(graph: Graph, focus: string): Neighbour[] {
  const byId = new Map<string, Neighbour & { order: number }>();
  for (const e of graph.edges) {
    if (e.from !== focus && e.to !== focus) continue;
    const other = e.from === focus ? e.to : e.from;
    if (other === focus) continue;
    const n = byId.get(other) ?? { id: other, verbs: [], notes: [], order: 99 };
    const verb = verbFrom(focus, e);
    if (!n.verbs.includes(verb)) n.verbs.push(verb);
    if (e.note && !n.notes.includes(e.note)) n.notes.push(e.note);
    n.order = Math.min(n.order, REL_ORDER.indexOf(e.rel) * 2 + (e.from === focus ? 0 : 1));
    byId.set(other, n);
  }
  return [...byId.values()]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id, "en", { numeric: true }))
    .map(({ order: _order, ...n }) => n);
}

/** Card boxes per ring, matching graph.css (width) and a typical height. */
export const BOX = { 0: { w: 250, h: 70 }, 1: { w: 200, h: 64 }, 2: { w: 150, h: 46 } } as const;
const GAP = 14;
/** Above this many neighbours, the focus is "busy": compact neighbours on two rings, no next ring. */
export const DENSE_AT = 10;

const boxOf = (p: Placed) => (p.compact ? BOX[2] : BOX[p.ring]);

/**
 * Places the focus in the centre, its neighbours on an inner ellipse (starting at the top,
 * clockwise), and up to `perNeighbour` second-step cards on an outer ellipse behind each one.
 * A busy focus (more than DENSE_AT neighbours) gets compact neighbours on two alternating rings
 * and no second step. A short relaxation then pushes cards off anything they overlap.
 */
export function layout(
  graph: Graph,
  focus: string,
  width: number,
  height: number,
  perNeighbour = 3,
): { placed: Placed[]; ring1: Neighbour[]; dense: boolean } {
  const cx = width / 2;
  const cy = height / 2;
  const outerX = Math.max(width / 2 - BOX[2].w / 2 - 16, 120);
  const outerY = Math.max(height / 2 - BOX[2].h / 2 - 16, 90);
  // Wide enough sideways that the verb label fits between the focus card and its neighbour.
  const rx = Math.min(Math.max(outerX * 0.58, 310), outerX - 90, 440);
  const ry = Math.min(outerY * 0.55, 260);
  const ring1 = neighbours(graph, focus);
  const placed: Placed[] = [{ id: focus, x: cx, y: cy, ring: 0 }];
  const taken = new Set([focus, ...ring1.map((n) => n.id)]);
  const dense = ring1.length > DENSE_AT;

  if (dense) {
    ring1.forEach((n, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / ring1.length;
      const scale = i % 2 === 0 ? 0.6 : 0.97;
      placed.push({
        id: n.id,
        x: cx + outerX * scale * Math.cos(angle),
        y: cy + outerY * scale * Math.sin(angle),
        ring: 1,
        compact: true,
      });
    });
    return finish(placed, ring1, width, height, true);
  }

  ring1.forEach((n, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(ring1.length, 1);
    placed.push({ id: n.id, x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle), ring: 1 });
    const further = neighbours(graph, n.id)
      .map((m) => m.id)
      .filter((id) => !taken.has(id))
      .slice(0, perNeighbour);
    further.forEach((id, k) => {
      taken.add(id);
      const a = angle + (k - (further.length - 1) / 2) * 0.34;
      placed.push({
        id,
        x: cx + outerX * Math.cos(a),
        y: cy + outerY * Math.sin(a),
        ring: 2,
        via: n.id,
      });
    });
  });

  return finish(placed, ring1, width, height, false);
}

function finish(
  placed: Placed[],
  ring1: Neighbour[],
  width: number,
  height: number,
  dense: boolean,
): { placed: Placed[]; ring1: Neighbour[]; dense: boolean } {
  relax(placed, width, height);
  // Whole pixels: server and browser must print identical numbers, or hydration fails.
  for (const p of placed) {
    p.x = Math.round(p.x);
    p.y = Math.round(p.y);
  }
  return { placed, ring1, dense };
}

/** Moves outer-ring cards (and inner ones only against each other) until no boxes overlap. */
function relax(placed: Placed[], width: number, height: number) {
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i] as Placed;
        const b = placed[j] as Placed;
        const ox = (boxOf(a).w + boxOf(b).w) / 2 + GAP - Math.abs(a.x - b.x);
        const oy = (boxOf(a).h + boxOf(b).h) / 2 + GAP - Math.abs(a.y - b.y);
        if (ox <= 0 || oy <= 0) continue;
        // Move whichever is further out; the focus never moves.
        const mover = b.ring >= a.ring ? b : a;
        const anchor = mover === b ? a : b;
        if (mover.ring === 0) continue;
        if (oy < ox) mover.y += (mover.y >= anchor.y ? 1 : -1) * (oy + 1);
        else mover.x += (mover.x >= anchor.x ? 1 : -1) * (ox + 1);
        const box = boxOf(mover);
        mover.x = Math.max(box.w / 2 + 8, Math.min(width - box.w / 2 - 8, mover.x));
        mover.y = Math.max(box.h / 2 + 8, Math.min(height - box.h / 2 - 8, mover.y));
        moved = true;
      }
    }
    if (!moved) return;
  }
}

/** Where a ray from a box's centre toward (dx, dy) leaves the box, as a fraction of (dx, dy). */
function exitFraction(box: { w: number; h: number }, dx: number, dy: number): number {
  const tx = dx === 0 ? Number.POSITIVE_INFINITY : box.w / 2 / Math.abs(dx);
  const ty = dy === 0 ? Number.POSITIVE_INFINITY : box.h / 2 / Math.abs(dy);
  return Math.min(tx, ty, 1);
}

/** The middle of the visible part of the line between two cards, for its verb label. */
export function labelPoint(a: Placed, b: Placed): { x: number; y: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t0 = exitFraction(boxOf(a), dx, dy);
  const t1 = 1 - exitFraction(boxOf(b), -dx, -dy);
  const t = t1 > t0 ? (t0 + t1) / 2 : 0.5;
  return { x: a.x + dx * t, y: a.y + dy * t };
}
