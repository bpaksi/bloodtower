/**
 * Where a hunter's portrait image lives. The pack asset route (`/packs/<pack>/assets/<file>`)
 * is not served yet, so no caller passes a URL today and the card shows its placeholder.
 * When the route lands, change this one helper and map the asset id to its file.
 */
export const portraitUrl = (packId: string, assetId: string): string =>
  `/packs/${encodeURIComponent(packId)}/assets/${encodeURIComponent(assetId)}`;

/** The one letter on a placeholder frame. Empty names give "?" rather than a blank frame. */
export const portraitInitial = (name: string): string => {
  const first = [...name.trim()][0];
  return first ? first.toLocaleUpperCase() : "?";
};
