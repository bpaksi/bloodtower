import { extractIds, type IdScheme } from "./ids.ts";

/** One heading of a document and the lines it covers, so a prompt can name its exact scope. */
export type Section = {
  /** Anchor id, unique within the doc; matches the id the renderer gives the heading. */
  anchor: string;
  title: string;
  depth: number;
  /** Titles of the enclosing headings, outermost first, then this one. */
  path: string[];
  /** 1-based, inclusive. */
  startLine: number;
  endLine: number;
  ids: string[];
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Hands out heading anchors, adding -2, -3… to repeats, the same way for parser and renderer. */
export function anchorMaker(): (title: string) => string {
  const seen = new Map<string, number>();
  return (title) => {
    const base = slugify(title) || "section";
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };
}

/** Markdown headings outside fenced code, with their line ranges and the IDs inside them. */
export function parseSections(markdown: string, ids: IdScheme): Section[] {
  const lines = markdown.split("\n");
  const anchor = anchorMaker();
  const found: { title: string; depth: number; line: number; anchor: string }[] = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) return;
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m?.[1] && m[2]) {
      found.push({ title: m[2], depth: m[1].length, line: i + 1, anchor: anchor(m[2]) });
    }
  });

  const stack: { title: string; depth: number }[] = [];
  return found.map((h, i) => {
    while (stack.length > 0 && (stack.at(-1)?.depth ?? 0) >= h.depth) stack.pop();
    stack.push(h);
    const next = found.slice(i + 1).find((o) => o.depth <= h.depth);
    const endLine = next ? next.line - 1 : lines.length;
    return {
      anchor: h.anchor,
      title: h.title,
      depth: h.depth,
      path: stack.map((s) => s.title),
      startLine: h.line,
      endLine,
      ids: extractIds(lines.slice(h.line - 1, endLine).join("\n"), ids),
    };
  });
}
