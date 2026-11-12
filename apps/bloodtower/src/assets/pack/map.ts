import type { ExportIndex } from "./exportIndex.ts";

/** One pack `assets/index.json` entry, as `assets:pack` writes it. */
export interface MappedEntry {
  kind: string;
  file: string;
  size: unknown;
  captions: string[];
  status: "draft" | "final";
}

/**
 * Export entry to pack entry. Key, kind, file, size and status are the export's, verbatim; the
 * status is never raised (a draft stays a draft). A voiced line's caption is its raw text; the
 * lint strips pause markup. The speaker is dropped.
 */
export const mapExport = (index: ExportIndex): Record<string, MappedEntry> => {
  const out: Record<string, MappedEntry> = {};
  for (const id of Object.keys(index.assets).sort()) {
    const e = index.assets[id];
    if (e === undefined) continue;
    out[id] = {
      kind: e.kind,
      file: e.file,
      size: e.size,
      captions: e.kind === "line" && e.text !== undefined ? [e.text] : [],
      status: e.status,
    };
  }
  return out;
};

/** The index as written: key-sorted, two-space indent, trailing newline. */
export const serializeIndex = (assets: Record<string, MappedEntry>): string =>
  `${JSON.stringify({ assets }, null, 2)}\n`;
