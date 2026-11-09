/**
 * Debug label (A1-07, D46): the id of the asset on screen, fixed bottom-left inside the safe margin.
 * Shown only when the web build was made with `SHOW_ASSET_IDS=1` (mapped to
 * `NEXT_PUBLIC_SHOW_ASSET_IDS` in next.config.ts). Any other value, or no id, renders nothing.
 * Board only: the device pages never render it.
 */
export const assetIdsShown = (flag: string | undefined = process.env.NEXT_PUBLIC_SHOW_ASSET_IDS) =>
  flag === "1";

export function AssetIdLabel({
  assetId,
  flag = process.env.NEXT_PUBLIC_SHOW_ASSET_IDS,
}: {
  assetId: string | null | undefined;
  /** For tests; the build passes the real flag. */
  flag?: string | undefined;
}) {
  if (!assetIdsShown(flag)) return null;
  if (typeof assetId !== "string" || assetId === "") return null;
  return (
    <p className="bt-asset-id" data-asset-id-label="">
      {assetId}
    </p>
  );
}
