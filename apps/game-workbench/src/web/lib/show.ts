import { backlinks, type FindHit, type LinkGroup, outlinks } from "@dark-tower/workbench";
import { buildGraph } from "./cards.ts";
import { searchGame } from "./find.ts";

function groupLines(heading: string, groups: LinkGroup[], titles: Record<string, string>) {
  if (groups.length === 0) return [`${heading}: none`];
  const lines = [`${heading}:`];
  for (const g of groups) {
    lines.push(`  ${g.verb}`);
    for (const l of g.links) {
      lines.push(`    ${l.id}  ${titles[l.id] ?? ""}${l.note ? `  (${l.note})` : ""}`.trimEnd());
    }
  }
  return lines;
}

/** The text `pnpm graph show <ID>` prints, or null when no card or document ID has that ID. */
export function showText(id: string): string | null {
  const { graph } = buildGraph();
  const node = graph.nodes[id];
  if (!node) return null;
  const titles: Record<string, string> = {};
  for (const n of Object.values(graph.nodes)) titles[n.id] = n.title;
  const lines =
    node.kind === "card"
      ? [
          `${node.id}  ${node.title}`,
          `${node.type} · ${node.status}`,
          node.file,
          "",
          node.body.trim(),
        ]
      : [`${node.id}  ${node.title}`, "document ID, no card"];
  lines.push("", ...groupLines("Links from here", outlinks(graph, id), titles));
  lines.push("", ...groupLines("Points here", backlinks(graph, id), titles));
  if (node.kind === "card") {
    lines.push("", "Sources:");
    if (node.sources.length === 0) lines.push("  none");
    for (const s of node.sources) {
      lines.push(
        `  ${s.file}${s.lines ? ` · lines ${s.lines}` : ""}${s.note ? `  ${s.note}` : ""}`,
      );
    }
  } else {
    lines.push("", "Found in:");
    if (node.foundIn.length === 0) lines.push("  none");
    for (const f of node.foundIn) lines.push(`  ${f}`);
  }
  return lines.join("\n");
}

/** One line per hit: href, ID, title, snippet. The first column is the hit's `href` from the API. */
export function hitLine(h: FindHit): string {
  return [h.href, h.id, h.title, h.snippet].join("  ");
}

/** The text `pnpm graph find <words>` prints: the hits `GET /api/find` returns. */
export function findText(query: string): string {
  const hits = searchGame(query);
  return hits.length === 0 ? "no hits" : hits.map(hitLine).join("\n");
}
