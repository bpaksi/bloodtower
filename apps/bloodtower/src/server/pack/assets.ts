import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, extname, join, sep } from "node:path";
import { type PackIndex, packIndexSchema } from "../../assets/lint/indexSchema.ts";
import type { StoryPack } from "../../protocols/pack-v2/index.ts";
import type { PackAudioIndex } from "./audio.ts";
import { indexPackAudio } from "./audio.ts";
import type { PackCameraIndex } from "./camera.ts";
import { indexPackCamera } from "./camera.ts";
import { type ImageSize, isSixteenByNine, readImageSize } from "./imageSize.ts";
import type { PackV2LoadIssue as PackLoadIssue } from "./v2/load.ts";

/** One manifest `assets` row, as the v2 story schema parses it. */
export type PackAsset = StoryPack["assets"][number];

export const PACK_ASSETS_DIR = "assets";

export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"] as const;

const IMAGE_EXT_SET = new Set<string>(IMAGE_EXTENSIONS);

export const isImageFileName = (name: string) => IMAGE_EXT_SET.has(extname(name).toLowerCase());

const isInside = (root: string, file: string) => file === root || file.startsWith(`${root}${sep}`);

/** Declared asset id → resolved file under `<pack>/assets/`. */
export interface ResolvedPackAsset {
  absolute: string;
  basename: string;
}

/** One `assets/index.json` entry whose file is on disk. */
export interface ResolvedIndexEntry {
  kind: string;
  absolute: string;
  basename: string;
}

export interface PackAssetIndex {
  packId: string;
  packRoot: string;
  byId: ReadonlyMap<string, ResolvedPackAsset>;
  /**
   * Every `assets/index.json` entry whose file is on disk, by asset id (D45). `line` and `glow`
   * entries are listed here and wired to nothing.
   */
  indexed: ReadonlyMap<string, ResolvedIndexEntry>;
  /** Basename → absolute path. Only declared assets that resolved. */
  byBasename: ReadonlyMap<string, string>;
  /** Optional camera-track sidecars under `<pack>/camera/`. */
  camera: PackCameraIndex;
  /** Mood and music files under `<pack>/audio/`. */
  audio: PackAudioIndex;
  warnings: readonly PackLoadIssue[];
}

const warn = (file: string, path: string, message: string): PackLoadIssue => ({
  rule: "W-asset",
  file,
  path,
  message: message.startsWith("W-asset:") ? message : `W-asset: ${message}`,
});

export const PACK_INDEX_FILE = "index.json";

/** A temp name `assets:pack` leaves if it is killed mid-copy. */
export const PACK_TEMP_FILE = /^(?:[0-9a-f]{64}\.(?:webp|m4a)|index\.json)\.tmp-\d+$/;

export type PackIndexRead =
  | { index: PackIndex | undefined; issue?: undefined }
  | { index?: undefined; issue: PackLoadIssue };

/**
 * The pack's generated `assets/index.json` (A1 step 5), or none when the pack has no such file.
 * A file that cannot be read, is not JSON or does not match the index schema is an `A1-9` issue.
 */
export const readPackAssetIndex = (packRoot: string): PackIndexRead => {
  const file = join(packRoot, PACK_ASSETS_DIR, PACK_INDEX_FILE);
  const label = `${PACK_ASSETS_DIR}/${PACK_INDEX_FILE}`;
  const bad = (message: string): PackIndexRead => ({
    issue: { rule: "A1-9", file: label, path: "(file)", message: `A1-9: ${message}` },
  });
  try {
    const stat = lstatSync(file);
    if (!stat.isFile()) return bad("assets/index.json must be a regular file.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { index: undefined };
    return bad(error instanceof Error ? error.message : String(error));
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    return bad(
      `assets/index.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const parsed = packIndexSchema.safeParse(raw);
  if (!parsed.success) {
    return bad(
      `assets/index.json does not match the index schema: ${parsed.issues
        .map((i) => `${i.path}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return { index: parsed.data };
};

/** A file named by the index, inside the real assets folder, or undefined when it is not there. Any other read error throws. */
const resolveIndexedFile = (
  assetsDir: string,
  name: string,
  accept: (file: string) => boolean,
): string | undefined => {
  if (name === "" || name.includes("/") || name.includes("\\") || name.includes("\0")) {
    return undefined;
  }
  const path = join(assetsDir, name);
  let real: string;
  try {
    real = realpathSync(path);
  } catch (error) {
    // Only a missing file is "missing"; EACCES, ELOOP and the rest are their own error (decision 0003).
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  if (!isInside(assetsDir, real) || !statSync(real).isFile() || !accept(basename(real))) {
    return undefined;
  }
  return real;
};

const isM4a = (name: string) => extname(name).toLowerCase() === ".m4a";

/** `assetsDir` must already be real, so a symlinked parent (macOS `/var` → `/private/var`) cannot fail the containment test. */
const resolveInsideAssets = (assetsDir: string, name: string): string | undefined => {
  const path = join(assetsDir, name);
  if (!existsSync(path)) return undefined;
  let real = path;
  try {
    real = realpathSync(path);
  } catch {
    return undefined;
  }
  if (!isInside(assetsDir, real)) return undefined;
  if (!statSync(real).isFile() || !isImageFileName(basename(real))) return undefined;
  return real;
};

/** Candidate image paths for one manifest row, most specific first. */
export const assetImageCandidates = (asset: PackAsset): string[] => {
  const names: string[] = [];
  const pushStem = (stem: string) => {
    for (const ext of IMAGE_EXTENSIONS) names.push(`${stem}${ext}`);
  };
  if (asset.path) {
    const path = asset.path;
    if (isImageFileName(path)) names.push(path);
    const dot = path.lastIndexOf(".");
    const stem = dot > 0 ? path.slice(0, dot) : path;
    pushStem(stem);
  }
  pushStem(asset.id);
  pushStem(asset.id.replace(/\./g, "-"));
  return [...new Set(names)];
};

export const resolveAssetImage = (assetsDir: string, asset: PackAsset): string | undefined => {
  let realAssetsDir: string;
  try {
    realAssetsDir = realpathSync(assetsDir);
  } catch {
    return undefined;
  }
  for (const name of assetImageCandidates(asset)) {
    const resolved = resolveInsideAssets(realAssetsDir, name);
    if (resolved) return resolved;
  }
  return undefined;
};

/** Non-image files `assets/` may hold (A1 step 3): the generated index and `.m4a` sounds. */
export const isAllowedAssetsFile = (name: string) =>
  isImageFileName(name) || name === "index.json" || extname(name).toLowerCase() === ".m4a";

/**
 * V-1: `assets/` may hold only image files, the exact name `index.json` and `.m4a` sounds, no
 * nested folders.
 * Missing `assets/` is allowed.
 */
export const validateAssetsFolder = (
  packRoot: string,
  push: (issue: PackLoadIssue) => void,
): void => {
  const assetsDir = join(packRoot, PACK_ASSETS_DIR);
  if (!existsSync(assetsDir)) return;
  let realDir = assetsDir;
  try {
    realDir = realpathSync(assetsDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    push({
      rule: "V-1",
      file: PACK_ASSETS_DIR,
      path: "(file)",
      message: `V-1: ${message}`,
    });
    return;
  }
  if (!isInside(packRoot, realDir)) {
    push({
      rule: "V-1",
      file: PACK_ASSETS_DIR,
      path: "(file)",
      message: "V-1: The assets folder stays inside the pack folder.",
    });
    return;
  }
  if (!statSync(realDir).isDirectory()) {
    push({
      rule: "V-1",
      file: PACK_ASSETS_DIR,
      path: "(file)",
      message: "V-1: The assets entry must be a folder.",
    });
    return;
  }
  for (const name of readdirSync(realDir)) {
    const label = `${PACK_ASSETS_DIR}/${name}`;
    const full = join(realDir, name);
    let real = full;
    try {
      real = realpathSync(full);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      push({ rule: "V-1", file: label, path: "(file)", message: `V-1: ${message}` });
      continue;
    }
    if (!isInside(realDir, real)) {
      push({
        rule: "V-1",
        file: label,
        path: "(file)",
        message: "V-1: An assets file stays inside the assets folder.",
      });
      continue;
    }
    const stat = statSync(real);
    if (stat.isDirectory()) {
      push({
        rule: "V-1",
        file: label,
        path: "(file)",
        message: "V-1: The assets folder has no subfolders.",
      });
      continue;
    }
    if (!isAllowedAssetsFile(name)) {
      push({
        rule: "V-1",
        file: label,
        path: "(file)",
        message: PACK_TEMP_FILE.test(name)
          ? `V-1: ${name} is a leftover from an interrupted assets:pack; run assets:pack ${basename(packRoot)} again or delete ${label}.`
          : "V-1: An assets file must be an image, index.json or an .m4a sound.",
      });
    }
  }
};

const expectsImageFile = (type: PackAsset["type"]) => type === "still" || type === "portrait";

const AUDIO_ASSET_TYPES = new Set(["line", "sfx", "music", "ambient"]);

const FILE_BACKED_TYPES = new Set(["still", "clip", "line", "sfx", "music", "ambient"]);

/** A pack-relative file that stays inside the pack folder, or undefined when it does not. */
const resolveInsidePack = (packRoot: string, rel: string): string | undefined => {
  if (rel.length === 0 || rel.startsWith("/") || rel.startsWith("\\") || rel.includes("\\")) {
    return undefined;
  }
  if (rel.split("/").some((part) => part === ".." || part === ".")) return undefined;
  let root = packRoot;
  try {
    root = realpathSync(packRoot);
  } catch {
    return undefined;
  }
  const path = join(root, rel);
  if (!existsSync(path)) return undefined;
  let real = path;
  try {
    real = realpathSync(path);
  } catch {
    return undefined;
  }
  if (!isInside(root, real) || !statSync(real).isFile()) return undefined;
  return real;
};

const mediaAsset = (asset: {
  id: string;
  type: string;
  status?: string;
  path?: string;
}): PackAsset => ({
  id: asset.id,
  type: asset.type === "clip" ? "clip" : "still",
  target: "storyboard",
  status: asset.status === "placeholder" || asset.status === "draft" ? asset.status : "final",
  ...(asset.path ? { path: asset.path } : {}),
});

/**
 * Still, clip, and audio files the board and the lines play.
 * A placeholder with no file yet is `W-asset` (the art has not landed).
 * Any other missing still, audio, or cover file fails the load: the Story board
 * would otherwise show an empty frame.
 */
export const mediaOnDiskIssues = (
  packRoot: string,
  assets: readonly { id: string; type: string; status?: string; path?: string }[],
  cover: string | undefined,
  rule: string,
  index?: PackIndex,
): { errors: PackLoadIssue[]; warnings: PackLoadIssue[] } => {
  const errors: PackLoadIssue[] = [];
  const warnings: PackLoadIssue[] = [];
  const fail = (file: string, path: string, message: string) => {
    errors.push({
      rule,
      file,
      path,
      message: message.startsWith(`${rule}:`) ? message : `${rule}: ${message}`,
    });
  };
  const note = (file: string, path: string, message: string) => {
    warnings.push(warn(file, path, message));
  };
  let realAssets: string | undefined;
  if (index) {
    try {
      realAssets = realpathSync(join(packRoot, PACK_ASSETS_DIR));
    } catch {
      realAssets = undefined;
    }
  }
  for (const asset of assets) {
    if (!FILE_BACKED_TYPES.has(asset.type)) continue;
    const indexed = index?.assets[asset.id];
    if (indexed) {
      // The generated index names this asset's file (D45). A file missing on disk is a missing file.
      const accept = AUDIO_ASSET_TYPES.has(asset.type) ? isM4a : isImageFileName;
      let file: string | undefined;
      try {
        file =
          realAssets === undefined
            ? undefined
            : resolveIndexedFile(realAssets, indexed.file, accept);
      } catch (error) {
        fail(
          `${PACK_ASSETS_DIR}/${indexed.file}`,
          `assets.${asset.id}.path`,
          `${asset.type} ${asset.id}: cannot read ${PACK_ASSETS_DIR}/${indexed.file} (named by index.json): ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      }
      if (file) continue;
      const message = `${asset.type} ${asset.id} is missing ${PACK_ASSETS_DIR}/${indexed.file} (named by index.json) on disk.`;
      if (asset.status === "placeholder") {
        note("pack.yaml", `assets.${asset.id}.path`, message);
      } else fail(`${PACK_ASSETS_DIR}/${indexed.file}`, `assets.${asset.id}.path`, message);
      continue;
    }
    let found: string | undefined;
    if (asset.path) found = resolveInsidePack(packRoot, asset.path);
    const bareName = asset.path !== undefined && !asset.path.includes("/");
    if (!found && (asset.type === "still" || asset.type === "clip") && (!asset.path || bareName)) {
      found = resolveAssetImage(join(packRoot, PACK_ASSETS_DIR), mediaAsset(asset));
    }
    if (found) continue;
    const where = asset.path ?? "a file";
    const message = `${asset.type} ${asset.id} is missing ${where} on disk.`;
    if (asset.status === "placeholder") note("pack.yaml", `assets.${asset.id}.path`, message);
    else fail(asset.path ?? "pack.yaml", `assets.${asset.id}.path`, message);
  }
  if (cover) {
    const file = resolveCover(packRoot, cover) ?? resolveInsidePack(packRoot, cover);
    if (!file) fail(cover, "cover", `Cover ${cover} is not a file in the pack.`);
  }
  return { errors, warnings };
};

/** The manifest `cover` file under `<pack>/assets/`, or undefined when it is missing or outside the folder. */
export const resolveCover = (packRoot: string, cover: string): string | undefined => {
  let assetsDir: string;
  try {
    assetsDir = realpathSync(join(packRoot, PACK_ASSETS_DIR));
  } catch {
    return undefined;
  }
  return resolveInsideAssets(assetsDir, basename(cover));
};

export const indexPackAssets = (
  packRoot: string,
  pack: { pack_id: string; assets: readonly PackAsset[]; cover?: string },
): PackAssetIndex => {
  const assetsDir = join(packRoot, PACK_ASSETS_DIR);
  const warnings: PackLoadIssue[] = [];
  const byId = new Map<string, ResolvedPackAsset>();
  const byBasename = new Map<string, string>();
  const indexed = new Map<string, ResolvedIndexEntry>();
  const index = readPackAssetIndex(packRoot).index;
  let realAssets: string | undefined;
  try {
    realAssets = realpathSync(assetsDir);
  } catch {
    realAssets = undefined;
  }
  const fromIndex = (id: string, accept: (file: string) => boolean): string | undefined => {
    const entry = index?.assets[id];
    if (!entry || realAssets === undefined) return undefined;
    return indexedOrWarn(id, entry.file, accept);
  };
  const indexedOrWarn = (
    id: string,
    name: string,
    accept: (file: string) => boolean,
  ): string | undefined => {
    try {
      return realAssets === undefined ? undefined : resolveIndexedFile(realAssets, name, accept);
    } catch (error) {
      warnings.push(
        warn(
          `${PACK_ASSETS_DIR}/${name}`,
          id,
          `cannot read ${PACK_ASSETS_DIR}/${name} (named by index.json): ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      return undefined;
    }
  };
  if (index && realAssets !== undefined) {
    for (const [id, entry] of Object.entries(index.assets)) {
      const absolute = indexedOrWarn(id, entry.file, () => true);
      if (absolute) indexed.set(id, { kind: entry.kind, absolute, basename: basename(absolute) });
    }
  }
  for (const asset of pack.assets) {
    if (index?.assets[asset.id]) {
      if (AUDIO_ASSET_TYPES.has(asset.type)) {
        const file = fromIndex(asset.id, isM4a);
        if (file) byBasename.set(basename(file), file);
        continue;
      }
      if (!expectsImageFile(asset.type)) continue;
      const absolute = fromIndex(asset.id, isImageFileName);
      if (!absolute) {
        if (asset.status !== "placeholder") {
          warnings.push(warn("assets.yaml", asset.id, `No image file for asset ${asset.id}.`));
        }
        continue;
      }
      byId.set(asset.id, { absolute, basename: basename(absolute) });
      byBasename.set(basename(absolute), absolute);
      continue;
    }
    if (AUDIO_ASSET_TYPES.has(asset.type)) {
      // A declared audio file under assets/ is served by its file name on the one asset route.
      const file = asset.path?.startsWith("assets/")
        ? resolveInsidePack(packRoot, asset.path)
        : undefined;
      if (file) byBasename.set(basename(file), file);
      continue;
    }
    if (!expectsImageFile(asset.type)) continue;
    const absolute = resolveAssetImage(assetsDir, asset);
    if (!absolute) {
      // A placeholder declares art that has not landed yet, so its missing file is expected.
      if (asset.status !== "placeholder") {
        warnings.push(warn("assets.yaml", asset.id, `No image file for asset ${asset.id}.`));
      }
      continue;
    }
    const base = basename(absolute);
    const entry = { absolute, basename: base };
    byId.set(asset.id, entry);
    byBasename.set(base, absolute);
  }
  // The cover is served by its file name, like an asset file. A missing file warns, as an asset does.
  if (pack.cover) {
    const cover = resolveCover(packRoot, pack.cover);
    if (cover) byBasename.set(basename(cover), cover);
    else warnings.push(warn("pack.yaml", "cover", `No image file for cover ${pack.cover}.`));
  }
  const camera = indexPackCamera(packRoot);
  const audio = indexPackAudio(packRoot);
  return {
    packId: pack.pack_id,
    packRoot,
    byId,
    indexed,
    byBasename,
    camera,
    audio,
    warnings: [...warnings, ...camera.warnings],
  };
};

const sizeLabel = ({ width, height }: ImageSize) => `${width}x${height}`;

/**
 * V-aspect: every still with a file, and the pack cover, is 16:9 (within 0.5%). The board draws a
 * still in a 16:9 well and the carousel draws the cover on a 16:9 plate, and both crop anything
 * else, so a real pack never ships one. A header that cannot be read is an error too. A still
 * with no file (a placeholder) is skipped: W-asset already covers it. Portraits are not stills.
 */
export const stillAspectIssues = (
  index: PackAssetIndex,
  pack: { assets: readonly PackAsset[]; cover?: string },
): PackLoadIssue[] => {
  const issues: PackLoadIssue[] = [];
  const check = (file: string, path: string, absolute: string, what: string) => {
    const size = readImageSize(absolute);
    if (!size) {
      issues.push(
        aspectIssue(file, path, `The header of ${what} cannot be read, so its shape is unknown.`),
      );
    } else if (!isSixteenByNine(size)) {
      issues.push(
        aspectIssue(file, path, `${what} is ${sizeLabel(size)}, not 16:9 (within 0.5%).`),
      );
    }
  };
  for (const asset of pack.assets) {
    if (asset.type !== "still") continue;
    const resolved = index.byId.get(asset.id);
    if (!resolved) continue;
    check(
      `${PACK_ASSETS_DIR}/${resolved.basename}`,
      asset.id,
      resolved.absolute,
      `still ${asset.id}`,
    );
  }
  if (pack.cover) {
    const cover = resolveCover(index.packRoot, pack.cover);
    if (cover) {
      check(`${PACK_ASSETS_DIR}/${basename(cover)}`, "cover", cover, `the cover ${pack.cover}`);
    }
  }
  return issues;
};

const aspectIssue = (file: string, path: string, message: string): PackLoadIssue => ({
  rule: "V-aspect",
  file,
  path,
  message: `V-aspect: ${message}`,
});
