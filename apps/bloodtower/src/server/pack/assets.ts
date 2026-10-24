import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { basename, extname, join, sep } from "node:path";
import type { Asset } from "bloodtower-protocols";
import type { PackAudioIndex } from "./audio.ts";
import { indexPackAudio } from "./audio.ts";
import type { PackCameraIndex } from "./camera.ts";
import { indexPackCamera } from "./camera.ts";
import { type ImageSize, isSixteenByNine, readImageSize } from "./imageSize.ts";
import type { PackLoadIssue } from "./load.ts";

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

export interface PackAssetIndex {
  packId: string;
  packRoot: string;
  byId: ReadonlyMap<string, ResolvedPackAsset>;
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
export const assetImageCandidates = (asset: Asset): string[] => {
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

export const resolveAssetImage = (assetsDir: string, asset: Asset): string | undefined => {
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

/**
 * V-1: `assets/` may hold only image files, no nested folders.
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
    if (!isImageFileName(name)) {
      push({
        rule: "V-1",
        file: label,
        path: "(file)",
        message: "V-1: An assets file must be an image.",
      });
    }
  }
};

const expectsImageFile = (type: Asset["type"]) => type === "still" || type === "portrait";

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
}): Asset => ({
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
  for (const asset of assets) {
    if (!FILE_BACKED_TYPES.has(asset.type)) continue;
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
  pack: { pack_id: string; assets: readonly Asset[]; cover?: string },
): PackAssetIndex => {
  const assetsDir = join(packRoot, PACK_ASSETS_DIR);
  const warnings: PackLoadIssue[] = [];
  const byId = new Map<string, ResolvedPackAsset>();
  const byBasename = new Map<string, string>();
  for (const asset of pack.assets) {
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
  pack: { assets: readonly Asset[]; cover?: string },
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
