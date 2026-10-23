/**
 * What §3 refuses on the story board, carried onto the v2 board view (D36).
 * `privateMoment` is the v1 key. The rest are raw bytes and tower-command fields.
 */
const FORBIDDEN_KEYS = new Set([
  "privateMoment",
  "bytes",
  "raw",
  "packet",
  "capabilityId",
  "params",
]);

const walk = (node: unknown, strings: boolean): boolean => {
  if (typeof node === "string") {
    return strings && (node.includes(".private.") || node.includes("ipad:"));
  }
  if (Array.isArray(node)) return node.some((entry) => walk(entry, strings));
  if (node && typeof node === "object") {
    for (const [key, entry] of Object.entries(node)) {
      if (FORBIDDEN_KEYS.has(key) || walk(entry, strings)) return true;
    }
  }
  return false;
};

/** A tower-command or raw-byte key anywhere in the value. */
export const carriesForbiddenKey = (value: unknown): boolean => walk(value, false);

/**
 * Board-view refusal: a `.private.` id, any `ipad:` string, or a forbidden key.
 * A shared line may contain the word "private". The word "ipad" without a colon is allowed.
 */
export const boardCarriesForbidden = (value: unknown): boolean => walk(value, true);
