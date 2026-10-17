/** R1 loads only the test pack. */
const PACK_ID = "test";

const assetPath = (assetId: string) => `/packs/${PACK_ID}/asset/${encodeURIComponent(assetId)}`;

/**
 * Story still URL on the session host. `next dev` serves pages from another port, so
 * `pnpm dev` sets `NEXT_PUBLIC_WS_URL` and the image is loaded from the server port.
 */
export const packStillImageUrl = (assetId: string): string => {
  const configured = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (configured) {
    const http = configured.replace(/^ws/i, "http").replace(/\/ws\/?$/i, "");
    return `${http}${assetPath(assetId)}`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}${assetPath(assetId)}`;
  }
  return assetPath(assetId);
};
