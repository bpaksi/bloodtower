/**
 * Where a hunter's portrait image lives: the pack asset-id route
 * (`/packs/<pack>/asset/<asset-id>`), which serves any asset the pack declares.
 */
export const portraitUrl = (packId: string, assetId: string): string =>
  `/packs/${encodeURIComponent(packId)}/asset/${encodeURIComponent(assetId)}`;

/**
 * The image URL for a hunter, or undefined when the pack is unknown or the hunter has no
 * portrait. The card then shows its initial placeholder.
 */
export const portraitSrc = (
  packId: string | undefined,
  assetId: string | undefined,
): string | undefined => (packId && assetId ? portraitUrl(packId, assetId) : undefined);

/** The one letter on a placeholder frame. Empty names give "?" rather than a blank frame. */
export const portraitInitial = (name: string): string => {
  const first = [...name.trim()][0];
  return first ? first.toLocaleUpperCase() : "?";
};
