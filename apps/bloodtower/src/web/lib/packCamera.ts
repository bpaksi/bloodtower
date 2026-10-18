import type { CameraTrack } from "./cameraTrack.ts";
import { packStillImageUrl } from "./packAsset.ts";
import { pageServerOrigin } from "./serverOrigin.ts";

const DEFAULT_PACK_ID = "test";

const cameraPath = (packId: string, momentId: string) =>
  `/packs/${encodeURIComponent(packId)}/camera/${encodeURIComponent(momentId)}.json`;

export const packCameraTrackUrl = (
  momentId: string,
  packId: string = DEFAULT_PACK_ID,
  origin: string = pageServerOrigin(),
): string => `${origin}${cameraPath(packId, momentId)}`;

/** Shipped still file under `assets/`, or a pack asset id when no extension is present. */
export const packTrackStillUrl = (
  still: string,
  packId: string = DEFAULT_PACK_ID,
  origin: string = pageServerOrigin(),
): string => {
  if (/\.(png|jpe?g|webp)$/i.test(still)) {
    return `${origin}/packs/${encodeURIComponent(packId)}/assets/${encodeURIComponent(still)}`;
  }
  return packStillImageUrl(still, packId, origin);
};

export const fetchCameraTrack = async (
  momentId: string,
  packId: string = DEFAULT_PACK_ID,
): Promise<CameraTrack | null> => {
  const url = packCameraTrackUrl(momentId, packId);
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as CameraTrack;
    if (data.id !== momentId || !Array.isArray(data.cues)) return null;
    return data;
  } catch {
    return null;
  }
};

export const preloadStill = (src: string) => {
  if (typeof Image === "undefined") return;
  const image = new Image();
  image.src = src;
};
