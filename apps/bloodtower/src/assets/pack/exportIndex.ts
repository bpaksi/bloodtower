import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { join, sep } from "node:path";
import type { Issue } from "../needs/issues.ts";
import { errorText } from "../needs/source.ts";
import { PACK_RULE, PackError, packIssue } from "./issues.ts";

export const EXPORT_INDEX_FILE = "export-index.json";

/** A shipped file name: the SHA-256 of its bytes and a kind the pack can carry (D10). */
export const HASH_NAME = /^[0-9a-f]{64}\.(webp|m4a)$/;
const ANY_HASH_NAME = /^[0-9a-f]{64}\.[a-z0-9]+$/;

export interface ExportEntry {
  kind: string;
  file: string;
  size: unknown;
  status: "draft" | "final";
  speaker?: string;
  text?: string;
}

/** `export-index.json` as asset-studio 0.2 writes it (the formats package has no schema for it). */
export interface ExportIndex {
  schema: 1;
  story: string;
  source: string;
  assets: Record<string, ExportEntry>;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/**
 * Reads and checks the export folder's index (A1-21, A1-22): the schema, the story, every file
 * name, and every file against its name. Nothing outside `dir` is read. Throws `PackError` with
 * every problem found; the caller has written nothing to the pack by then.
 */
export const readExportIndex = (dir: string, story: string): ExportIndex => {
  const fail = (path: string, rule: string, message: string): never => {
    throw new PackError([packIssue(EXPORT_INDEX_FILE, path, rule, message)]);
  };
  let doc: unknown;
  try {
    doc = JSON.parse(readFileSync(join(dir, EXPORT_INDEX_FILE), "utf8"));
  } catch (error) {
    return fail(
      "(file)",
      PACK_RULE.exportIndex,
      `cannot read ${EXPORT_INDEX_FILE}: ${errorText(error)}`,
    );
  }
  if (
    !isRecord(doc) ||
    doc.schema !== 1 ||
    typeof doc.story !== "string" ||
    typeof doc.source !== "string" ||
    !isRecord(doc.assets)
  ) {
    return fail(
      "(file)",
      PACK_RULE.exportIndex,
      `${EXPORT_INDEX_FILE} is not {schema: 1, story, source, assets}.`,
    );
  }
  if (doc.story !== story) {
    return fail(
      "story",
      PACK_RULE.exportIndex,
      `the export is for story "${doc.story}", not "${story}".`,
    );
  }
  let realDir: string;
  try {
    realDir = realpathSync(dir);
  } catch (error) {
    return fail(
      "(file)",
      PACK_RULE.exportIndex,
      `cannot read the export folder: ${errorText(error)}`,
    );
  }
  const issues: Issue[] = [];
  const assets: Record<string, ExportEntry> = {};
  for (const [id, entry] of Object.entries(doc.assets)) {
    const bad = (rule: string, message: string) =>
      issues.push(packIssue(EXPORT_INDEX_FILE, id, rule, `${id}: ${message}`));
    if (
      !isRecord(entry) ||
      typeof entry.kind !== "string" ||
      typeof entry.file !== "string" ||
      (entry.status !== "draft" && entry.status !== "final") ||
      !("size" in entry)
    ) {
      bad(PACK_RULE.exportIndex, "the entry is not {kind, file, size, status}.");
      continue;
    }
    const file = entry.file;
    if (!HASH_NAME.test(file)) {
      if (ANY_HASH_NAME.test(file)) {
        bad(
          PACK_RULE.fileType,
          `${file} is not a .webp or .m4a file, and the pack carries only those. For a sound, give the job a .m4a source instead of a WAV; voice WAV masters are never exported.`,
        );
      } else {
        bad(
          PACK_RULE.exportIndex,
          `"${file}" is not a safe file name (<64 hex digits>.webp or .m4a).`,
        );
      }
      continue;
    }
    const path = join(realDir, file);
    try {
      if (!lstatSync(path).isFile()) {
        bad(PACK_RULE.exportIndex, `${file} is not a regular file (a link or folder is refused).`);
        continue;
      }
      const real = realpathSync(path);
      if (!real.startsWith(`${realDir}${sep}`)) {
        bad(PACK_RULE.exportIndex, `${file} resolves outside the export folder.`);
        continue;
      }
      const hash = sha256(readFileSync(real));
      if (hash !== file.slice(0, 64)) {
        bad(PACK_RULE.exportIndex, `${file} does not match its name (its bytes hash to ${hash}).`);
        continue;
      }
    } catch (error) {
      bad(PACK_RULE.exportIndex, `cannot read ${file}: ${errorText(error)}`);
      continue;
    }
    assets[id] = {
      kind: entry.kind,
      file,
      size: entry.size,
      status: entry.status,
      ...(typeof entry.speaker === "string" ? { speaker: entry.speaker } : {}),
      ...(typeof entry.text === "string" ? { text: entry.text } : {}),
    };
  }
  if (issues.length > 0) throw new PackError(issues);
  return { schema: 1, story: doc.story, source: doc.source, assets };
};

/** The hash a shipped name carries. */
export const hashOf = (file: string): string => file.slice(0, 64);
export { sha256 };
