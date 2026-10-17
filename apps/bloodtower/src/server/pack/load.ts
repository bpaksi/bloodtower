import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { type Pack, packIssues, packSchema } from "bloodtower-protocols";
import { parse as parseYaml } from "yaml";
import {
  indexPackAssets,
  PACK_ASSETS_DIR,
  type PackAssetIndex,
  validateAssetsFolder,
} from "./assets.ts";

/**
 * Reads one pack folder (YAML or JSON) into the frozen pack schema.
 * Sections R1 does not run are parsed and kept. Nothing in this module executes them.
 * R1's own load is `loadR1Pack`, which reads only `<packsDir>/test`.
 */

const MAX_FILE_BYTES = 1_000_000;

/** File stem → pack field. A stem not listed here is not a pack file. */
const SPLIT_KEYS: Readonly<Record<string, string>> = {
  hunters: "hunters",
  cast: "cast",
  nights: "nights",
  "set-pieces": "set_pieces",
  moments: "moments",
  cues: "cues",
  assets: "assets",
  stats: "stats",
  "by-length": "by_length",
  choices: "choices",
  items: "items",
  tracks: "tracks",
  corruption: "corruption",
  guard: "guard",
  hooks: "hooks",
  "quest-tokens": "quest_tokens",
  encounters: "encounters",
  dungeons: "dungeons",
  endings: "endings",
  titles: "titles",
};

export interface PackLoadIssue {
  rule: string;
  file: string;
  path: string;
  message: string;
}

export type PackLoadResult =
  | { ok: true; pack: Pack; assets: PackAssetIndex }
  | { ok: false; issues: PackLoadIssue[] };

const issue = (file: string, path: string, rule: string, message: string): PackLoadIssue => ({
  rule,
  file,
  path,
  message: message.startsWith(`${rule}:`) ? message : `${rule}: ${message}`,
});

const isInside = (root: string, file: string) => file === root || file.startsWith(`${root}${sep}`);

const readPackFile = (root: string, name: string): { ok: true; value: unknown } | PackLoadIssue => {
  const path = join(root, name);
  let real = path;
  try {
    real = realpathSync(path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return issue(name, "(file)", "V-1", message);
  }
  if (!isInside(root, real)) {
    return issue(name, "(file)", "V-1", "A pack file stays inside the pack folder.");
  }
  const size = statSync(real).size;
  if (size > MAX_FILE_BYTES) {
    return issue(name, "(file)", "V-1", "A pack file is over the size limit.");
  }
  const text = readFileSync(real, "utf8");
  try {
    const value = name.endsWith(".json") ? (JSON.parse(text) as unknown) : parseYaml(text);
    if (value === null || value === undefined) {
      return issue(name, "(file)", "V-1", "The file is empty.");
    }
    return { ok: true, value };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return issue(name, "(file)", "V-1", message);
  }
};

const blameTokens = (message: string): string[] => {
  const tokens = [
    ...(message.match(/~no-[a-z0-9-]+/gi) ?? []),
    ...(message.match(/[a-z0-9]+(?:[.-][a-z0-9]+)+/gi) ?? []),
  ];
  if (message.toLowerCase().includes("random")) tokens.push("random");
  return tokens;
};

/** A pack-level issue has no field path. Point it at the file and line that contain its token. */
const blame = (
  message: string,
  texts: ReadonlyMap<string, string>,
  fallbackFile: string,
): { file: string; path: string } => {
  for (const token of blameTokens(message)) {
    for (const [file, text] of texts) {
      const lines = text.split("\n");
      const index = lines.findIndex((line) => line.includes(token));
      if (index !== -1) return { file, path: String(index + 1) };
    }
  }
  return { file: fallbackFile, path: "(file)" };
};

const locate = (
  path: string,
  sources: ReadonlyMap<string, string>,
  packFile: string,
): { file: string; path: string } => {
  const [head, ...rest] = path.split(".");
  if (head && sources.has(head)) {
    return { file: sources.get(head) ?? packFile, path: rest.join(".") || "(file)" };
  }
  return { file: packFile, path: path || "(file)" };
};

/** Loads any one pack folder. The CLI uses this for a bad pack as well as the test pack. */
export const loadPackDir = (dir: string): PackLoadResult => {
  // The jail compares real paths, so the folder itself is resolved too (macOS tmp is a symlink).
  let root = resolve(dir);
  let names: string[];
  try {
    root = realpathSync(root);
    names = readdirSync(root);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, issues: [issue(dir, "(file)", "V-1", message)] };
  }

  const issues: PackLoadIssue[] = [];
  let packFile: string | undefined;
  const split = new Map<string, { file: string; value: unknown }>();
  const texts = new Map<string, string>();

  for (const name of names.sort()) {
    if (name === "README.md") continue;
    if (name === PACK_ASSETS_DIR) {
      validateAssetsFolder(root, (item) => issues.push(item));
      continue;
    }
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    if (stem === "pack" && (ext === ".yaml" || ext === ".yml" || ext === ".json")) {
      if (packFile) {
        issues.push(issue(name, "(file)", "V-1", "The pack has two manifest files."));
        continue;
      }
      packFile = name;
      continue;
    }
    const field = SPLIT_KEYS[stem];
    if (!field || (ext !== ".yaml" && ext !== ".yml" && ext !== ".json")) {
      issues.push(issue(name, "(file)", "V-1", "This file is not part of the pack."));
      continue;
    }
    if (split.has(field)) {
      issues.push(issue(name, "(file)", "V-1", `${field} is listed in two files.`));
      continue;
    }
    split.set(field, { file: name, value: undefined });
  }

  if (!packFile && split.size === 0) {
    issues.push(issue(root, "(file)", "V-1", "The folder has no pack file."));
  }
  if (issues.length > 0) return { ok: false, issues };

  const assembled: Record<string, unknown> = {};
  const sources = new Map<string, string>();
  const manifestName = packFile ?? "(none)";

  if (packFile) {
    const read = readPackFile(root, packFile);
    if (!("ok" in read)) return { ok: false, issues: [read] };
    texts.set(packFile, readFileSync(join(root, packFile), "utf8"));
    if (!read.value || typeof read.value !== "object" || Array.isArray(read.value)) {
      return {
        ok: false,
        issues: [issue(packFile, "(file)", "V-1", "The pack manifest is a JSON object.")],
      };
    }
    Object.assign(assembled, read.value);
  }

  for (const [field, entry] of split) {
    if (Object.hasOwn(assembled, field)) {
      issues.push(
        issue(entry.file, field, "V-1", `${field} is in the manifest and in its own file.`),
      );
      continue;
    }
    const read = readPackFile(root, entry.file);
    if (!("ok" in read)) {
      issues.push(read);
      continue;
    }
    texts.set(entry.file, readFileSync(join(root, entry.file), "utf8"));
    assembled[field] = read.value;
    sources.set(field, entry.file);
  }
  if (issues.length > 0) return { ok: false, issues };

  const parsed = packSchema.safeParse(assembled);
  if (!parsed.success) {
    return {
      ok: false,
      issues: packIssues(parsed.error).map((item) => {
        const place = locate(item.path, sources, manifestName);
        const blamed = place.path === "(file)" ? blame(item.message, texts, place.file) : place;
        return issue(blamed.file, blamed.path, item.rule, item.message);
      }),
    };
  }
  const assets = indexPackAssets(root, parsed.data);
  return { ok: true, pack: parsed.data, assets };
};

/** R1 loads the test pack only. `packsDir` is the packs root, not the test folder itself. */
export const loadR1Pack = (packsDir: string): PackLoadResult => loadPackDir(join(packsDir, "test"));

export const formatLoadIssues = (issues: readonly PackLoadIssue[]): string[] =>
  issues.map(
    (item) => `file=${item.file} path=${item.path} rule=${item.rule} message=${item.message}`,
  );
