import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { extractIds } from "./ids.ts";

/** One markdown file in research/game-design, as the workbench shows it. */
export type DesignDoc = {
  slug: string;
  file: string;
  title: string;
  /** The doc's own "Status:" line, or null when it has none (shown as unavailable). */
  status: string | null;
  lines: number;
  ids: string[];
  markdown: string;
};

export type DocGroup = { title: string; note: string; docs: DesignDoc[] };

/**
 * A first grouping of today's flat folder. It previews the reorg (step 1), where the groups
 * become real folders. A doc not listed here lands in "Other" so nothing is hidden.
 */
const GROUPS: { title: string; note: string; slugs: string[] }[] = [
  {
    title: "Game design",
    note: "Story-neutral rules, systems and requirements",
    slugs: [
      "requirements",
      "core-mechanics",
      "story-engine",
      "encounters-and-set-pieces",
      "sessions",
      "statistics",
      "rtdt-subsystems",
      "open-questions",
    ],
  },
  {
    title: "Screens and look",
    note: "Screens, layout zones and flows",
    slugs: [
      "look-and-feel-harness",
      "landing-and-initial-screens",
      "setup-wizard-and-summary",
      "r2-screen-flow",
    ],
  },
  {
    title: "Tower and assets",
    note: "Tower effects, sounds and reusable assets",
    slugs: [
      "tower-effects-library",
      "tower-sound-inventory",
      "asset-catalog",
      "asset-organization",
    ],
  },
  { title: "Formats", note: "How a story pack is written", slugs: ["story-pack-format"] },
  {
    title: "Notes",
    note: "Dated notes, kept as written",
    slugs: ["playthrough-ui-notes-2026-10-17"],
  },
];

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

export function designDir(root = repoRoot()): string {
  return path.join(root, "research", "game-design");
}

export function parseDoc(file: string, markdown: string): DesignDoc {
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
    ids: extractIds(markdown),
    markdown,
  };
}

/** Every top-level markdown file except the README, read fresh on each call. */
export function loadDocs(dir = designDir()): DesignDoc[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort()
    .map((f) => parseDoc(f, readFileSync(path.join(dir, f), "utf8")));
}

export function loadDoc(slug: string, dir = designDir()): DesignDoc | null {
  if (!/^[\w-]+$/.test(slug)) return null;
  const file = path.join(dir, `${slug}.md`);
  if (slug === "README" || !existsSync(file)) return null;
  return parseDoc(`${slug}.md`, readFileSync(file, "utf8"));
}

export function groupDocs(docs: DesignDoc[]): DocGroup[] {
  const bySlug = new Map(docs.map((d) => [d.slug, d]));
  const used = new Set<string>();
  const groups: DocGroup[] = GROUPS.map((g) => ({
    title: g.title,
    note: g.note,
    docs: g.slugs.flatMap((s) => {
      const doc = bySlug.get(s);
      if (!doc) return [];
      used.add(s);
      return [doc];
    }),
  }));
  const other = docs.filter((d) => !used.has(d.slug));
  if (other.length > 0) groups.push({ title: "Other", note: "Not grouped yet", docs: other });
  return groups.filter((g) => g.docs.length > 0);
}
