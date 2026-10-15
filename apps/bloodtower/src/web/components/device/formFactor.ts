/** R-DEV-8. A phone is detected at join. An iPad, and anything else, uses the full layout. */
export const detectFormFactor = (userAgent: string): "ipad" | "phone" => {
  if (/iPad|Tablet/i.test(userAgent)) return "ipad";
  if (/iPhone|iPod|Android.+Mobile|Windows Phone/i.test(userAgent)) return "phone";
  return "ipad";
};

export type PlayerLayout = "phone" | "full";

/** Phone starts on the compact layout. The player can switch to the full one, and back. */
export const layoutFor = (
  formFactor: "ipad" | "phone",
  preference: PlayerLayout | null,
): PlayerLayout => preference ?? (formFactor === "phone" ? "phone" : "full");
