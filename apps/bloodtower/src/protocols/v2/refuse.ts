import type { z } from "zod";

/**
 * Keys the story board must never carry (§3). `privateMoment` is the v1 private-line field.
 * The other five are tower-command and raw-byte fields. No message may carry those five.
 */
export const BOARD_SECRET_KEYS = new Set([
  "privateMoment",
  "bytes",
  "raw",
  "packet",
  "capabilityId",
  "params",
]);

export const WIRE_COMMAND_KEYS = new Set(["bytes", "raw", "packet", "capabilityId", "params"]);

const walk = (node: unknown, keys: ReadonlySet<string>, strings: boolean): boolean => {
  if (strings && typeof node === "string") {
    return node.includes(".private.") || node.includes("ipad:");
  }
  if (Array.isArray(node)) return node.some((entry) => walk(entry, keys, strings));
  if (node && typeof node === "object") {
    for (const [key, entry] of Object.entries(node)) {
      if (keys.has(key) || walk(entry, keys, strings)) return true;
    }
  }
  return false;
};

/** A `.private.` id, any `ipad:` string, or a board-secret key, at any depth. */
export const boardContentRefused = (value: unknown): boolean =>
  walk(value, BOARD_SECRET_KEYS, true);

/** A tower-command or raw-byte key at any depth. Strings are allowed. */
export const containsCommandKey = (value: unknown): boolean =>
  walk(value, WIRE_COMMAND_KEYS, false);

export const refuseBoardContent = (value: unknown, ctx: z.RefinementCtx) => {
  if (boardContentRefused(value)) {
    ctx.addIssue({
      code: "custom",
      message: "The board view cannot carry a private line, an ipad channel, or a tower command.",
    });
  }
};

export const refuseCommandKeys = (value: unknown, ctx: z.RefinementCtx) => {
  if (containsCommandKey(value)) {
    ctx.addIssue({
      code: "custom",
      message: "A message cannot carry raw bytes or a tower command.",
    });
  }
};
