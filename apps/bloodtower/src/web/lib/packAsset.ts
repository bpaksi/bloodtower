import { pageServerOrigin } from "./serverOrigin.ts";

const DEFAULT_PACK_ID = "test";

const assetPath = (packId: string, file: string) =>
  `/packs/${encodeURIComponent(packId)}/assets/${encodeURIComponent(file)}`;

/** A place still's asset id (`place.village`) names its file (`place-village.jpg`) under `assets/`. */
export const placeStillFile = (stillId: string): string => `${stillId.replace(".", "-")}.jpg`;

/**
 * Story still URL on the session host: the file under the pack's `assets/` folder, the one asset
 * route the host serves. Under `pnpm dev` the page and the session host are on different ports;
 * {@link pageServerOrigin} picks the host that serves pack assets.
 */
export const packStillImageUrl = (
  file: string,
  packId: string = DEFAULT_PACK_ID,
  origin: string = pageServerOrigin(),
): string => `${origin}${assetPath(packId, file)}`;
