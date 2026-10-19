import { type Card, type Graph, LAYERS, type Layer } from "./graph-types.ts";

/**
 * Progress of one area. A card belongs to an area when it links `part-of` that area.
 * decided = decided or answered; proposed = drafted, waiting for Bob; open = still a question or
 * an unexplored idea. Parked cards are left out.
 */
export type AreaProgress = {
  area: Card;
  members: Card[];
  decided: number;
  proposed: number;
  open: number;
  /** decided / (decided + proposed + open), 0–100; null when the area has no cards yet. */
  percent: number | null;
  byLayer: Record<Layer, number>;
  openQuestions: Card[];
  /** Conflicts touching this area where neither side is decided yet. */
  conflicts: { from: Card; to: string; note?: string }[];
};

function cardsOf(graph: Graph): Card[] {
  return Object.values(graph.nodes).flatMap((n) => (n.kind === "card" ? [n] : []));
}

export function areaProgress(graph: Graph): AreaProgress[] {
  const cards = cardsOf(graph);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const areas = cards.filter((c) => c.type === "area");
  return areas.map((area) => {
    const memberIds = new Set(
      graph.edges.filter((e) => e.rel === "part-of" && e.to === area.id).map((e) => e.from),
    );
    const members = [...memberIds]
      .map((id) => byId.get(id))
      .filter((c): c is Card => c !== undefined && c.status !== "parked");
    const decided = members.filter((c) => c.status === "decided" || c.status === "answered").length;
    const proposed = members.filter((c) => c.status === "proposed").length;
    const open = members.filter((c) => c.status === "open").length;
    const total = decided + proposed + open;
    const byLayer = Object.fromEntries(LAYERS.map((l) => [l, 0])) as Record<Layer, number>;
    for (const m of members) if (m.layer) byLayer[m.layer] += 1;
    const unsettled = (id: string) => {
      const c = byId.get(id);
      return !c || (c.status !== "decided" && c.status !== "answered");
    };
    const conflicts = graph.edges
      .filter((e) => e.rel === "conflicts" && memberIds.has(e.from))
      .filter((e) => unsettled(e.from) || unsettled(e.to))
      .flatMap((e) => {
        const from = byId.get(e.from);
        return from ? [{ from, to: e.to, ...(e.note ? { note: e.note } : {}) }] : [];
      });
    return {
      area,
      members,
      decided,
      proposed,
      open,
      percent: total === 0 ? null : Math.round((decided / total) * 100),
      byLayer,
      openQuestions: members.filter((c) => c.type === "question" && c.status === "open"),
      conflicts,
    };
  });
}
