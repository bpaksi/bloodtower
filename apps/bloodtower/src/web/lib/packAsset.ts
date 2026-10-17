import { pageServerOrigin } from "./serverOrigin.ts";

const DEFAULT_PACK_ID = "test";

const assetPath = (packId: string, assetId: string) =>
  `/packs/${encodeURIComponent(packId)}/asset/${encodeURIComponent(assetId)}`;

/**
 * Story still URL on the session host. Under `pnpm dev` the page and the session host are on
 * different ports; {@link pageServerOrigin} picks the host that serves pack assets.
 */
export const packStillImageUrl = (
  assetId: string,
  packId: string = DEFAULT_PACK_ID,
  origin: string = pageServerOrigin(),
): string => `${origin}${assetPath(packId, assetId)}`;
