import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { designDir, loadDocs } from "./content.ts";
import {
  CARD_TYPES,
  type Card,
  type CardStatus,
  type CardType,
  type Edge,
  type Graph,
  type GraphNode,
  type Link,
  RELS,
  type Source,
  STATUSES,
} from "./graph-types.ts";
import { idKind } from "./ids.ts";
import { renderMarkdown } from "./markdown.ts";

export { RELS };

const PREFIX: Record<CardType, string> = {
  idea: "IDEA",
  question: "Q",
  decision: "DEC",
  mechanic: "MEC",
  screen: "SCR",
  ui: "UI",
  cue: "CUE",
  sound: "SND",
  sketch: "SK",
  example: "EX",
};

export function cardsDir(): string {
  return path.join(designDir(), "cards");
}

function splitFrontMatter(text: string): { data: unknown; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) throw new Error("missing --- front matter");
  return { data: parse(m[1] ?? ""), body: (m[2] ?? "").trim() };
}

/** Parses and checks one card file. Throws with the file name on any format error. */
export function parseCard(file: string, text: string): Card {
  const id = file.replace(/\.md$/, "");
  const fail = (msg: string): never => {
    throw new Error(`cards/${file}: ${msg}`);
  };
  const { data, body } = splitFrontMatter(text);
  const d = (data ?? {}) as Record<string, unknown>;
  const type = d.type as CardType;
  if (!CARD_TYPES.includes(type)) fail(`unknown type "${String(d.type)}"`);
  if (!id.startsWith(`${PREFIX[type]}-`) || !/-\d{3,}$/.test(id)) {
    fail(`ID must be ${PREFIX[type]}-NNN for type ${type}`);
  }
  if (typeof d.title !== "string" || !d.title.trim()) fail("title is required");
  const status = (d.status ?? "open") as CardStatus;
  if (!STATUSES.includes(status)) fail(`unknown status "${String(status)}"`);
  const links = ((d.links ?? []) as Link[]).map((l) => {
    if (!(l?.rel in RELS)) fail(`unknown link rel "${String(l?.rel)}"`);
    if (typeof l.to !== "string") fail("link without a 'to' ID");
    return { rel: l.rel, to: l.to, ...(l.note ? { note: String(l.note) } : {}) };
  });
  const sources = ((d.sources ?? []) as Source[]).map((s) => ({
    file: String(s.file),
    ...(s.lines !== undefined ? { lines: String(s.lines) } : {}),
    ...(s.note ? { note: String(s.note) } : {}),
  }));
  return {
    id,
    type,
    title: (d.title as string).trim(),
    status,
    by: typeof d.by === "string" ? d.by : null,
    links,
    sources,
    body,
    bodyHtml: body ? renderMarkdown(body) : "",
    file: `research/game-design/cards/${file}`,
  };
}

export function loadCards(dir = cardsDir()): Card[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
    .map((f) => parseCard(f, readFileSync(path.join(dir, f), "utf8")));
}

/**
 * Builds the graph. A link to an ID with no card becomes a "ref" node, titled by the first note
 * that names it and listing the documents that mention it. Returns the problems it finds
 * (links to IDs that appear nowhere), so the lint test can fail on them.
 */
export function buildGraph(cards: Card[] = loadCards()): { graph: Graph; problems: string[] } {
  const docs = loadDocs();
  const nodes: Record<string, GraphNode> = {};
  const edges: Edge[] = [];
  const problems: string[] = [];
  for (const c of cards) nodes[c.id] = { kind: "card", ...c };
  for (const c of cards) {
    for (const l of c.links) {
      edges.push({ from: c.id, to: l.to, rel: l.rel, ...(l.note ? { note: l.note } : {}) });
      if (nodes[l.to]) continue;
      const foundIn = docs.filter((d) => d.ids.includes(l.to)).map((d) => d.file);
      if (foundIn.length === 0 && !l.note) {
        problems.push(`${c.id} links to ${l.to}, which is no card and appears in no document`);
      }
      nodes[l.to] = {
        kind: "ref",
        id: l.to,
        idKind: idKind(l.to),
        title: l.note ?? l.to,
        foundIn,
      };
    }
  }
  return { graph: { nodes, edges }, problems };
}
