import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import {
  type GameSetting,
  optionIdSchema,
  type Pack,
  type PackMetadata,
  packIssues,
  packMetadataSchema,
  packSchema,
  STORY_ID_MAX,
  type StoryCard,
} from "bloodtower-protocols";
import { parse as parseYaml } from "yaml";
import {
  indexPackAssets,
  PACK_ASSETS_DIR,
  type PackAssetIndex,
  validateAssetsFolder,
} from "./assets.ts";
import { PACK_AUDIO_DIR, validateAudioFolder } from "./audio.ts";
import { PACK_CAMERA_DIR, validateCameraFolder } from "./camera.ts";

/**
 * Reads one pack folder (YAML or JSON) into the frozen pack schema.
 * Sections R1 does not run are parsed and kept. Nothing in this module executes them.
 * R1's own load is `loadR1Pack`, which reads only `<packsDir>/test`.
 */

const MAX_FILE_BYTES = 1_000_000;

const MANIFEST_FILES: ReadonlySet<string> = new Set(["pack.yaml", "pack.yml", "pack.json"]);

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

/** A `playable: false` pack carries only its metadata, so it is never a session's story. */
export type PackLoadResult =
  | { ok: true; playable: true; pack: Pack; assets: PackAssetIndex }
  | { ok: true; playable: false; pack: PackMetadata; assets: PackAssetIndex }
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
  const split = new Map<string, { file: string; value: unknown }>();
  const texts = new Map<string, string>();
  const assembled: Record<string, unknown> = {};
  const sources = new Map<string, string>();
  const sortedNames = names.sort();
  const packFile = sortedNames.find((name) => MANIFEST_FILES.has(name));
  const manifestName = packFile ?? "(none)";

  // The manifest is read first: a `playable: false` pack reads only it and assets/.
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
  const metadataOnly = assembled.playable === false;

  for (const name of sortedNames) {
    if (name === "README.md" || name === packFile) continue;
    if (MANIFEST_FILES.has(name)) {
      issues.push(issue(name, "(file)", "V-1", "The pack has two manifest files."));
      continue;
    }
    if (name === PACK_ASSETS_DIR) {
      validateAssetsFolder(root, (item) => issues.push(item));
      continue;
    }
    if (metadataOnly) continue;
    if (name === PACK_CAMERA_DIR) {
      validateCameraFolder(root, (item) => issues.push(item));
      continue;
    }
    if (name === PACK_AUDIO_DIR) {
      validateAudioFolder(root, (item) => issues.push(item));
      continue;
    }
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
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

  const failed = (error: Parameters<typeof packIssues>[0]): PackLoadResult => ({
    ok: false,
    issues: packIssues(error).map((item) => {
      const place = locate(item.path, sources, manifestName);
      const blamed = place.path === "(file)" ? blame(item.message, texts, place.file) : place;
      return issue(blamed.file, blamed.path, item.rule, item.message);
    }),
  });
  if (metadataOnly) {
    const meta = packMetadataSchema.safeParse(assembled);
    if (!meta.success) return failed(meta.error);
    const assets = indexPackAssets(root, {
      pack_id: meta.data.pack_id,
      assets: [],
      cover: meta.data.cover,
    });
    return { ok: true, playable: false, pack: meta.data, assets };
  }

  const parsed = packSchema.safeParse(assembled);
  if (!parsed.success) return failed(parsed.error);
  const assets = indexPackAssets(root, parsed.data);
  return { ok: true, playable: true, pack: parsed.data, assets };
};

export type PlayableLoadResult =
  | Extract<PackLoadResult, { playable: true }>
  | { ok: false; issues: PackLoadIssue[] };

/** R1 loads the test pack only, and it must be playable. `packsDir` is the packs root, not the test folder itself. */
export const loadR1Pack = (packsDir: string): PlayableLoadResult => {
  const result = loadPackDir(join(packsDir, "test"));
  if (!result.ok) return result;
  if (!result.playable) {
    return {
      ok: false,
      issues: [issue("pack.yaml", "playable", "V-1", "The test pack must be playable.")],
    };
  }
  return result;
};

/** One door on Pick Story: the card the UIs show, and the pack behind it when it loads. */
export interface StoryEntry {
  card: StoryCard;
  pack: Pack | null;
  /**
   * The manifest's game settings, shown on Game settings once the card is chosen. Kept here
   * because a `playable: false` pack has no `pack` but still has settings. Empty for a greyed card.
   */
  settings: readonly GameSetting[];
  issues: PackLoadIssue[];
  /** Resolved asset index when the pack folder parsed; null when load failed. */
  assets: PackAssetIndex | null;
}

/**
 * Every folder under `packsDir` is a story. A folder that fails the pack lint, or has no night
 * to play, stays in the list as a card that cannot be chosen (R2 §3.3). The card never carries
 * the lint messages; they stay on the server. A folder with no `pack.*` manifest is work in
 * progress, not a story, and neither is a plain file or a folder whose name is not a valid id.
 * A valid id longer than `STORY_ID_MAX` is a greyed card too: its Choose prompt id would not fit.
 * A `playable: false` pack is a card with its title and tagline that cannot be chosen; only its
 * manifest and `assets/` are read.
 */
export const loadStories = (packsDir: string): StoryEntry[] => {
  let names: string[];
  try {
    names = readdirSync(packsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
  const hasManifest = (id: string) => {
    try {
      return readdirSync(join(packsDir, id)).some((file) => MANIFEST_FILES.has(file));
    } catch {
      return false;
    }
  };
  return names
    .filter((name) => optionIdSchema.safeParse(name).success && hasManifest(name))
    .sort()
    .map((id): StoryEntry => {
      if (id.length > STORY_ID_MAX) {
        return {
          card: greyedCard(id, id),
          pack: null,
          settings: [],
          issues: [
            issue(id, "(folder)", "V-1", `The folder name is over ${STORY_ID_MAX} characters.`),
          ],
          assets: null,
        };
      }
      const loaded = loadPackDir(join(packsDir, id));
      if (loaded.ok && !loaded.playable) {
        // Listed and choosable, but never bound: Pick Game stops at "Not playable yet".
        const { pack } = loaded;
        return {
          card: {
            id,
            title: pack.title,
            blurb: pack.tagline ?? null,
            tagline: pack.tagline ?? null,
            cover: coverPath(id, pack.cover, loaded.assets),
            players: null,
            playable: false,
            loadable: true,
          },
          pack: null,
          settings: pack.settings,
          issues: [],
          assets: loaded.assets,
        };
      }
      if (loaded.ok && loaded.pack.nights[0]?.phases[0]) {
        const { pack } = loaded;
        return {
          card: {
            id,
            title: pack.title,
            blurb: pack.tagline ?? pack.tone ?? null,
            tagline: pack.tagline ?? null,
            cover: coverPath(id, pack.cover, loaded.assets),
            players: pack.players,
            playable: true,
            loadable: true,
          },
          pack,
          settings: pack.settings,
          issues: [],
          assets: loaded.assets,
        };
      }
      const issues = loaded.ok
        ? [issue(id, "nights", "V-1", "The pack has no night to play.")]
        : loaded.issues;
      return {
        card: greyedCard(id, id),
        pack: null,
        settings: [],
        issues,
        assets: loaded.ok ? loaded.assets : null,
      };
    });
};

/** A card that cannot be chosen: a folder that failed the lint, or one with no night. */
const greyedCard = (id: string, title: string): StoryCard => ({
  id,
  title,
  blurb: null,
  tagline: null,
  cover: null,
  players: null,
  playable: false,
  loadable: false,
});

/**
 * The host path of the pack's cover image, or null when the manifest has no cover or the file did
 * not resolve. The route is `/packs/<id>/assets/<file>`, the one `serve.ts` answers.
 */
const coverPath = (
  id: string,
  cover: string | undefined,
  assets: PackAssetIndex | null | undefined,
): string | null => {
  if (!cover || !assets) return null;
  const file = basename(cover);
  if (!assets.byBasename.has(file)) return null;
  return `/packs/${encodeURIComponent(id)}/assets/${encodeURIComponent(file)}`;
};

export const formatLoadIssues = (issues: readonly PackLoadIssue[]): string[] =>
  issues.map(
    (item) => `file=${item.file} path=${item.path} rule=${item.rule} message=${item.message}`,
  );
