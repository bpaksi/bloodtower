import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { basename, extname, join, sep } from "node:path";
import type { Asset } from "bloodtower-protocols";
import type { PackCameraIndex } from "./camera.ts";
import { indexPackCamera } from "./camera.ts";
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
      warnings.push(warn("assets.yaml", asset.id, `No image file for asset ${asset.id}.`));
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
  return {
    packId: pack.pack_id,
    packRoot,
    byId,
    byBasename,
    camera,
    warnings: [...warnings, ...camera.warnings],
  };
};
