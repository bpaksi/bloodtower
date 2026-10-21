/** Find an ID or a word in the cards and documents. Pure: no Node imports, runs anywhere. */
import { extractIds, type IdScheme } from "./ids.ts";

export type FindCard = { id: string; title: string; body: string };
export type FindDoc = { slug: string; file: string; title: string; markdown: string };

export type FindEntry =
  | { kind: "card"; id: string; title: string; text: string; href: string }
  | {
      kind: "line";
      slug: string;
      file: string;
      title: string;
      line: number;
      text: string;
      href: string;
    };

export type FindIndex = {
  entries: FindEntry[];
  /** Lower-case ID → the places that define it as a document line, best first. */
  defined: Map<string, { slug: string; line: number }>;
  /** Lower-case ID → its card ID. */
  cardIds: Map<string, string>;
  ids: IdScheme;
};

export type FindHit = {
  kind: "card" | "line";
  id: string;
  title: string;
  snippet: string;
  href: string;
};

const SNIPPET = 140;

export function cardHref(id: string): string {
  return `/?focus=${encodeURIComponent(id)}`;
}

export function lineHref(slug: string, line: number): string {
  return `/doc/${slug}#L${line}`;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 0 heading, 1 table row (first cell), 2 list item; null when the line does not define the ID. */
function defineRank(line: string, id: string): number | null {
  const e = escapeRe(id);
  const after = String.raw`(?![\w-])`;
  if (new RegExp(String.raw`^#{1,6}\s+[*_\x60]*${e}${after}`, "i").test(line)) return 0;
  if (new RegExp(String.raw`^\|\s*[*_\x60]*${e}[*_\x60]*\s*\|`, "i").test(line)) return 1;
  if (new RegExp(String.raw`^\s*(?:[-*+]|\d+\.)\s+[*_\x60]*${e}${after}`, "i").test(line)) return 2;
  return null;
}

/** One entry per card and one per non-blank document line. */
export function buildFindIndex(cards: FindCard[], docs: FindDoc[], ids: IdScheme): FindIndex {
  const entries: FindEntry[] = [];
  const cardIds = new Map<string, string>();
  for (const c of cards) {
    cardIds.set(c.id.toLowerCase(), c.id);
    entries.push({ kind: "card", id: c.id, title: c.title, text: c.body, href: cardHref(c.id) });
  }
  const best = new Map<string, { rank: number; slug: string; line: number }>();
  for (const d of docs) {
    const lines = d.markdown.split("\n");
    const known = extractIds(d.markdown, ids);
    lines.forEach((text, i) => {
      if (text.trim() === "") return;
      const line = i + 1;
      entries.push({
        kind: "line",
        slug: d.slug,
        file: d.file,
        title: d.title,
        line,
        text,
        href: lineHref(d.slug, line),
      });
    });
    // Docs arrive in file order and lines in line order, so the first of a rank wins.
    for (const id of known) {
      const key = id.toLowerCase();
      for (let i = 0; i < lines.length; i++) {
        const rank = defineRank(lines[i] as string, id);
        if (rank === null) continue;
        const prev = best.get(key);
        if (!prev || rank < prev.rank) best.set(key, { rank, slug: d.slug, line: i + 1 });
        if (rank === 0) break;
      }
    }
  }
  const defined = new Map<string, { slug: string; line: number }>();
  for (const [k, v] of best) defined.set(k, { slug: v.slug, line: v.line });
  return { entries, defined, cardIds, ids };
}

function clip(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > SNIPPET ? `${flat.slice(0, SNIPPET - 1)}…` : flat;
}

/** The text around the first word found, so the snippet shows why the entry matched. */
function snippetAround(text: string, words: string[]): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const lower = flat.toLowerCase();
  const at = words.map((w) => lower.indexOf(w)).filter((i) => i >= 0);
  if (at.length === 0) return clip(flat);
  const start = Math.max(0, Math.min(...at) - 30);
  const piece = clip(flat.slice(start));
  return start > 0 ? `…${piece}` : piece;
}

const byNumber = (a: string, b: string) => a.localeCompare(b, "en", { numeric: true });

type Scored = { score: number; hit: FindHit; sort: [number, string, number] };

/** The ID in the query if the whole query is one (case ignored), else null. */
function wholeId(index: FindIndex, query: string): string | null {
  const q = query.trim();
  if (q === "") return null;
  const key = q.toLowerCase();
  if (index.cardIds.has(key) || index.defined.has(key)) return key;
  return null;
}

/** Hits, best first. An exact ID comes first; then every word must appear (AND, case ignored). */
export function find(index: FindIndex, query: string, limit = 20): FindHit[] {
  const q = query.trim();
  if (q === "") return [];
  const hits: FindHit[] = [];
  const seen = new Set<string>();
  const push = (h: FindHit) => {
    if (seen.has(h.href)) return;
    seen.add(h.href);
    hits.push(h);
  };

  const key = wholeId(index, q);
  if (key) {
    const cardId = index.cardIds.get(key);
    if (cardId) {
      const c = index.entries.find((e) => e.kind === "card" && e.id === cardId);
      if (c?.kind === "card")
        push({
          kind: "card",
          id: c.id,
          title: c.title,
          snippet: clip(c.text),
          href: c.href,
        });
    } else {
      const d = index.defined.get(key);
      const e =
        d && index.entries.find((x) => x.kind === "line" && x.slug === d.slug && x.line === d.line);
      if (e?.kind === "line") {
        const id = (e.text.match(index.ids.pattern) ?? []).find((m) => m.toLowerCase() === key);
        push({
          kind: "line",
          id: id ?? q,
          title: e.title,
          snippet: clip(e.text),
          href: e.href,
        });
      }
    }
  }

  const words = q.toLowerCase().split(/\s+/);
  const scored: Scored[] = [];
  for (const e of index.entries) {
    if (e.kind === "card") {
      const id = e.id.toLowerCase();
      const title = e.title.toLowerCase();
      const body = e.text.toLowerCase();
      let score = 0;
      let ok = true;
      for (const w of words) {
        if (id.includes(w)) score += 3;
        else if (title.includes(w)) score += 2;
        else if (body.includes(w)) score += 1;
        else {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      scored.push({
        score,
        hit: {
          kind: "card",
          id: e.id,
          title: e.title,
          snippet: snippetAround(e.text, words),
          href: e.href,
        },
        sort: [0, e.id, 0],
      });
    } else {
      const text = e.text.toLowerCase();
      if (!words.every((w) => text.includes(w))) continue;
      scored.push({
        score: words.length,
        hit: {
          kind: "line",
          id: e.text.match(index.ids.pattern)?.[0] ?? `${e.file}:${e.line}`,
          title: e.title,
          snippet: snippetAround(e.text, words),
          href: e.href,
        },
        sort: [1, e.slug, e.line],
      });
    }
  }
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.sort[0] - b.sort[0] ||
      byNumber(a.sort[1], b.sort[1]) ||
      a.sort[2] - b.sort[2],
  );
  for (const s of scored) {
    if (hits.length >= limit) break;
    push(s.hit);
  }
  return hits.slice(0, limit);
}
