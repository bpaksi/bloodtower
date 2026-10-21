/** Reading a workbench's folder from disk. Server only. */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { type CardSchema, parseCard } from "./cards.ts";
import type { Card } from "./graph-types.ts";
import { extractIds, type IdScheme } from "./ids.ts";

/** One markdown file, as a workbench shows it. */
export type Doc = {
  slug: string;
  file: string;
  title: string;
  /** The doc's own "Status:" line, or null when it has none (shown as unavailable). */
  status: string | null;
  lines: number;
  ids: string[];
  markdown: string;
};

/** The repo root: the nearest folder above `from` that holds pnpm-workspace.yaml. */
export function repoRoot(from = process.cwd()): string {
  let dir = path.resolve(from);
  while (!existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`No pnpm-workspace.yaml above ${from}`);
    dir = parent;
  }
  return dir;
}

export function parseDoc(file: string, markdown: string, ids: IdScheme): Doc {
  const slug = file.replace(/\.md$/, "");
  const title = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim() ?? slug;
  const statusLine = /^Status:\s*(.+)$/m.exec(markdown)?.[1];
  const status = statusLine ? statusLine.replace(/\*\*/g, "").trim() : null;
  return {
    slug,
    file,
    title,
    status,
    lines: markdown.split("\n").length,
    ids: extractIds(markdown, ids),
    markdown,
  };
}

/** Every top-level markdown file in `dir` except the README, read fresh on each call. */
export function loadDocs(dir: string, ids: IdScheme): Doc[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort()
    .map((f) => parseDoc(f, readFileSync(path.join(dir, f), "utf8"), ids));
}

/** One doc by slug, or null. Refuses slugs that could leave the folder. */
export function loadDoc(slug: string, dir: string, ids: IdScheme): Doc | null {
  if (!/^[\w-]+$/.test(slug)) return null;
  const file = path.join(dir, `${slug}.md`);
  if (slug === "README" || !existsSync(file)) return null;
  return parseDoc(`${slug}.md`, readFileSync(file, "utf8"), ids);
}

/**
 * Every card in `dir`, in ID order. A card that does not parse is left out and reported in
 * `errors`, so one bad file shows as a warning instead of taking every page down.
 */
export function loadCards(dir: string, schema: CardSchema): { cards: Card[]; errors: string[] } {
  if (!existsSync(dir)) return { cards: [], errors: [] };
  const cards: Card[] = [];
  const errors: string[] = [];
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  for (const f of files) {
    try {
      cards.push(parseCard(f, readFileSync(path.join(dir, f), "utf8"), schema));
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  return { cards, errors };
}

export {
  findGaps,
  GAP_RULE_LABEL,
  GAP_RULES,
  type Gap,
  type GapGroup,
  type GapRule,
  gapsPerArea,
  groupGaps,
} from "./gaps.ts";
export { dirStamp } from "./stamp.ts";
