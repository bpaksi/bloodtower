export interface PreloadAsset {
  url: string;
  kind: "image" | "audio";
}

export type PreloadPhase = "loading" | "ready";

const isAsset = (value: unknown): value is PreloadAsset => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as { url?: unknown; kind?: unknown };
  return typeof record.url === "string" && (record.kind === "image" || record.kind === "audio");
};

export const isPreloadList = (value: unknown): value is { assets: PreloadAsset[] } => {
  if (typeof value !== "object" || value === null || !("assets" in value)) return false;
  const assets = (value as { assets: unknown }).assets;
  return Array.isArray(assets) && assets.every(isAsset);
};

/**
 * Fetches the joined actor's list, loads each file, and reports loading then ready.
 * A failed file does not stick the indicator: every asset settles, then the phase is ready.
 */
export const preloadScene = async (
  fetchList: () => Promise<PreloadAsset[]>,
  load: (asset: PreloadAsset) => Promise<void>,
  onPhase: (phase: PreloadPhase) => void,
): Promise<"ready"> => {
  onPhase("loading");
  try {
    const assets = await fetchList();
    await Promise.allSettled(assets.map((asset) => load(asset)));
  } finally {
    onPhase("ready");
  }
  return "ready";
};

/** Pulls one asset into the browser cache. Missing `Image` (tests, no window) resolves. */
export const loadAsset = (asset: PreloadAsset): Promise<void> => {
  if (typeof Image === "undefined") return Promise.resolve();
  if (asset.kind === "image") {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = asset.url;
    });
  }
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "auto";
    const done = () => resolve();
    audio.addEventListener("canplaythrough", done, { once: true });
    audio.addEventListener("error", done, { once: true });
    audio.src = asset.url;
    audio.load();
  });
};

export const fetchPreloadList = async (token: string): Promise<PreloadAsset[]> => {
  const response = await fetch("/preload", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return [];
  const body: unknown = await response.json();
  return isPreloadList(body) ? body.assets : [];
};
