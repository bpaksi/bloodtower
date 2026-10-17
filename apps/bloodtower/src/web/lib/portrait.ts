/**
 * Where a hunter's portrait image lives. The pack asset route (`/packs/<pack>/asset/<assetId>`)
 * is not served yet, so no caller passes a URL today and the card shows its placeholder.
 * When the route lands, change this one helper and pass the hunter's portrait asset id.
 */
export const portraitUrl = (packId: string, assetId: string): string =>
  `/packs/${encodeURIComponent(packId)}/asset/${encodeURIComponent(assetId)}`;

/** The one letter on a placeholder frame. Empty names give "?" rather than a blank frame. */
export const portraitInitial = (name: string): string => {
  const first = [...name.trim()][0];
  return first ? first.toLocaleUpperCase() : "?";
};
