import { parse } from "yaml";
import {
  type Card,
  type Edge,
  type Graph,
  type GraphNode,
  LATER_RELEASES,
  type Link,
  type RelTable,
  type Source,
  STATUSES,
} from "./graph-types.ts";

/** How one workbench's card files look. */
export type CardSchema = {
  types: readonly string[];
  /** Checks a card's ID (its file name) against its type; returns the problem, or null. */
  checkId(type: string, id: string): string | null;
  /** Allowed `layer` values; null when this workbench has no layers. */
  layers: readonly string[] | null;
  rels: RelTable;
  /** Repo-relative folder of the card files, for `Card.file`. */
  dir: string;
  /** Checks the front-matter fields this workbench adds (the game's `feel:`); returns the problem, or null. */
  checkFields?(type: string, data: Record<string, unknown>): string | null;
  render(markdown: string): string;
};

export function splitFrontMatter(text: string): { data: unknown; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) throw new Error("missing --- front matter");
  return { data: parse(m[1] ?? ""), body: (m[2] ?? "").trim() };
}

/** Parses and checks one card file. Throws with the file name on any format error. */
export function parseCard(file: string, text: string, schema: CardSchema): Card {
  const id = file.replace(/\.md$/, "");
  const fail = (msg: string): never => {
    throw new Error(`cards/${file}: ${msg}`);
  };
  let split: { data: unknown; body: string };
  try {
    split = splitFrontMatter(text);
  } catch (e) {
    return fail((e as Error).message);
  }
  const { data, body } = split;
  const d = (data ?? {}) as Record<string, unknown>;
  const type = d.type as string;
  if (!schema.types.includes(type)) fail(`unknown type "${String(d.type)}"`);
  const idProblem = schema.checkId(type, id);
  if (idProblem) fail(idProblem);
  const fieldProblem = schema.checkFields?.(type, d) ?? null;
  if (fieldProblem) fail(fieldProblem);
  const layer = (d.layer ?? null) as string | null;
  if (layer !== null && !schema.layers?.includes(layer)) fail(`unknown layer "${String(layer)}"`);
  if ("release" in d && !(LATER_RELEASES as readonly unknown[]).includes(d.release)) {
    const hint = typeof d.release === "number" ? `; quote it: release: "${d.release}"` : "";
    fail(`unknown release ${JSON.stringify(d.release)}: only "1.1", or no field for 1.0${hint}`);
  }
  if (typeof d.title !== "string" || !d.title.trim()) fail("title is required");
  const status = (d.status ?? "open") as Card["status"];
  if (!STATUSES.includes(status)) fail(`unknown status "${String(status)}"`);
  const links = ((d.links ?? []) as Link[]).map((l) => {
    if (!(l?.rel in schema.rels)) fail(`unknown link rel "${String(l?.rel)}"`);
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
    layer,
    by: typeof d.by === "string" ? d.by : null,
    links,
    sources,
    body,
    bodyHtml: body ? schema.render(body) : "",
    file: `${schema.dir}/${file}`,
    data: d,
  };
}

/**
 * Builds the graph. A link to an ID with no card becomes a "ref" node, titled by the first note
 * that names it and listing the documents that mention it. Returns the problems it finds
 * (links to IDs that appear nowhere), so a lint test can fail on them.
 */
export function buildGraph<C extends Card>(
  cards: C[],
  opts: {
    docs: { file: string; ids: string[] }[];
    rels: RelTable;
    kindOf: (id: string) => string;
  },
): { graph: Graph<C>; problems: string[] } {
  const nodes: Record<string, GraphNode<C>> = {};
  const edges: Edge[] = [];
  const problems: string[] = [];
  for (const c of cards) nodes[c.id] = { kind: "card", ...c };
  for (const c of cards) {
    for (const l of c.links) {
      edges.push({ from: c.id, to: l.to, rel: l.rel, ...(l.note ? { note: l.note } : {}) });
      if (nodes[l.to]) continue;
      const foundIn = opts.docs.filter((d) => d.ids.includes(l.to)).map((d) => d.file);
      if (foundIn.length === 0 && !l.note) {
        problems.push(`${c.id} links to ${l.to}, which is no card and appears in no document`);
      }
      nodes[l.to] = {
        kind: "ref",
        id: l.to,
        idKind: opts.kindOf(l.to),
        title: l.note ?? l.to,
        foundIn,
      };
    }
  }
  return { graph: { nodes, edges, rels: opts.rels }, problems };
}
