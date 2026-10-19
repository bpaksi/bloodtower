import path from "node:path";
import {
  type Doc,
  loadDocs as loadDocsWith,
  loadDoc as loadDocWith,
  parseDoc as parseDocWith,
  repoRoot,
} from "@dark-tower/workbench/server";
import { GAME_IDS } from "./ids.ts";

/** One markdown file in research/game-design, as the workbench shows it. */
export type DesignDoc = Doc;

export { repoRoot };

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

export function designDir(root = repoRoot()): string {
  return path.join(root, "research", "game-design");
}

export function parseDoc(file: string, markdown: string): DesignDoc {
  return parseDocWith(file, markdown, GAME_IDS);
}

/** Every top-level markdown file except the README, read fresh on each call. */
export function loadDocs(dir = designDir()): DesignDoc[] {
  return loadDocsWith(dir, GAME_IDS);
}

export function loadDoc(slug: string, dir = designDir()): DesignDoc | null {
  return loadDocWith(slug, dir, GAME_IDS);
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
