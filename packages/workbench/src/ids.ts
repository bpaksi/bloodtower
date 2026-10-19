/**
 * ID schemes. Every piece of a workbench's content has a stable ID, so Bob and Claude can name it
 * exactly. Each app says which ID shapes it knows (as regex sources) and how to classify one;
 * this module turns that into the patterns the renderer and the loaders use.
 */

export type IdScheme = {
  /** Matches an ID with word boundaries. Global; use `matchAll` or reset `lastIndex`. */
  pattern: RegExp;
  /** Matches an ID only at the start of the string (for the markdown tokenizer). */
  atStart: RegExp;
  /** The kind of an ID, used for its chip colour (`chip-<kind>`) and label. */
  kindOf(id: string): string;
  /** A human label for a kind. */
  label(kind: string): string;
};

/**
 * `sources` are regex sources, one per ID shape. Order matters: put longer, more specific forms
 * first so that, say, R-AST-ORG-1 is not read as AST-….
 */
export function makeIdScheme(opts: {
  sources: string[];
  kindOf: (id: string) => string;
  labels: Record<string, string>;
}): IdScheme {
  const source = opts.sources.join("|");
  return {
    pattern: new RegExp(String.raw`(?<![\w-])(?:${source})(?![\w-])`, "g"),
    atStart: new RegExp(String.raw`^(?:${source})(?![\w-])`),
    kindOf: opts.kindOf,
    label: (kind) => opts.labels[kind] ?? kind,
  };
}

/** Unique IDs in the text, in first-seen order. Fenced code is skipped. */
export function extractIds(markdown: string, ids: IdScheme): string[] {
  const text = markdown.replace(/```[\s\S]*?```/g, "");
  return [...new Set([...text.matchAll(ids.pattern)].map((m) => m[0]))];
}

/** "R-ENG-20" → "R-ENG"; "AST-T04" → "AST-T"; "E17" → "E"; "DRA-CHR-004" → "DRA-CHR". */
export function idFamily(id: string): string {
  return id.replace(/\d+[a-z]?$/, "").replace(/-$/, "");
}
