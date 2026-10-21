import type { Graph } from "./graph-types.ts";

/** Links of one verb, as one card reads them: the other node and the link's note. */
export type LinkGroup = { verb: string; links: { id: string; note?: string }[] };

function group(graph: Graph, id: string, incoming: boolean): LinkGroup[] {
  const order = Object.keys(graph.rels);
  const byRel = new Map<string, LinkGroup>();
  for (const e of graph.edges) {
    if ((incoming ? e.to : e.from) !== id) continue;
    const other = incoming ? e.from : e.to;
    if (other === id) continue;
    const rel = graph.rels[e.rel] ?? { label: e.rel, reverse: e.rel };
    const g = byRel.get(e.rel) ?? { verb: incoming ? rel.reverse : rel.label, links: [] };
    if (!g.links.some((l) => l.id === other && l.note === e.note)) {
      g.links.push({ id: other, ...(e.note ? { note: e.note } : {}) });
    }
    byRel.set(e.rel, g);
  }
  const rank = (rel: string) => {
    const i = order.indexOf(rel);
    return i < 0 ? order.length : i;
  };
  return [...byRel]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([, g]) => ({
      ...g,
      links: g.links.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true })),
    }));
}

/** The links that point at `id`, grouped by reverse verb ("needed by", "answered by"), with notes. */
export function backlinks(graph: Graph, id: string): LinkGroup[] {
  return group(graph, id, true);
}

/** The links `id` writes, grouped by verb, with notes. */
export function outlinks(graph: Graph, id: string): LinkGroup[] {
  return group(graph, id, false);
}
