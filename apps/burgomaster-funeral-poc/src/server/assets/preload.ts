import { extname } from "node:path";
import { type AssetActor, type AssetRecord, authorizeAsset, type Catalog } from "./catalog.ts";

export interface PreloadAsset {
  url: string;
  kind: "image" | "audio";
}

const RASTER = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const AUDIO = new Set([".wav", ".mp3"]);

const assetUrl = (relativePath: string, token?: string): string => {
  const path = relativePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const base = `/assets/${path}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
};

const kindOf = (record: AssetRecord): PreloadAsset["kind"] | undefined => {
  const ext = extname(record.path).toLowerCase();
  if (RASTER.has(ext)) return "image";
  if (AUDIO.has(ext)) return "audio";
  return undefined;
};

/**
 * Image and audio files this actor may fetch right now.
 * A private still or line stays out until `authorizeAsset` would serve it.
 */
export const preloadFor = (catalog: Catalog, actor: AssetActor, token: string): PreloadAsset[] => {
  const assets: PreloadAsset[] = [];
  for (const record of catalog.byPath.values()) {
    if (!authorizeAsset(record, actor).ok) continue;
    const kind = kindOf(record);
    if (!kind) continue;
    const needsToken = record.type !== "portrait";
    assets.push({ url: assetUrl(record.path, needsToken ? token : undefined), kind });
  }
  assets.sort((a, b) => a.url.localeCompare(b.url));
  return assets;
};
