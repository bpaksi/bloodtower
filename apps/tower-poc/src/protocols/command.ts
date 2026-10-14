import { z } from "zod";
import { findCapability, isCommandable } from "./inventory.ts";

const ID = z.string().min(1).max(64);

// Limits on what `validateCommand` reports. `commandLifecyclePayloadSchema` uses the same numbers,
// so a rejection can always be sent, whatever the client put in `params`.
const MAX_ISSUES = 32;
const MAX_PATH_PARTS = 8;
const MAX_PATH_PART_LENGTH = 64;
const MAX_ISSUE_MESSAGE_LENGTH = 200;

/**
 * Payload of `command`, the only message that reaches the tower's hardware (spec §3.2).
 * `params` is untyped here on purpose: `validateCommand` checks it against the capability's own
 * schema, so that a bad value comes back as a `rejected` lifecycle with the field named, not as a
 * bare protocol error. Nothing may use `params` before that check.
 */
export const commandPayloadSchema = z.strictObject({
  capabilityId: ID,
  params: z.unknown(),
});

export interface CommandIssue {
  /** Path to the field inside `params`, for example `["seal", "side"]`. Empty for the whole value. */
  path: (string | number)[];
  message: string;
}

export type CommandValidation =
  | { ok: true; capabilityId: string; params: unknown }
  | {
      ok: false;
      reason: "unknown-capability" | "not-commandable" | "invalid-params";
      issues: CommandIssue[];
    };

/**
 * Checks a `command` payload against the inventory. On success `params` is the schema's parsed
 * output, which is what the executor passes on; the input is never forwarded.
 */
export const validateCommand = (capabilityId: string, params: unknown): CommandValidation => {
  const capability = findCapability(capabilityId);
  if (!capability) return { ok: false, reason: "unknown-capability", issues: [] };
  if (!isCommandable(capability)) return { ok: false, reason: "not-commandable", issues: [] };
  const parsed = capability.params.safeParse(params);
  if (parsed.success) return { ok: true, capabilityId: capability.id, params: parsed.data };
  return {
    ok: false,
    reason: "invalid-params",
    issues: parsed.error.issues.slice(0, MAX_ISSUES).map((issue) => ({
      path: issue.path
        .filter((part) => typeof part !== "symbol")
        .slice(0, MAX_PATH_PARTS)
        .map((part) => (typeof part === "string" ? part.slice(0, MAX_PATH_PART_LENGTH) : part)),
      // Zod names the unknown keys in its message, and those are the client's own text. Every
      // other message is built from the schema alone.
      message:
        issue.code === "unrecognized_keys"
          ? "Unknown field."
          : issue.message.slice(0, MAX_ISSUE_MESSAGE_LENGTH),
    })),
  };
};

/**
 * Stages of one command (spec §3.1). A command ends in exactly one of `END_STAGES`.
 * `confirmed` means a matching tower state was seen. `indeterminate` means the write completed and
 * no state came back, which is not a failure (GAP-HW-010).
 */
export const lifecycleStageSchema = z.enum([
  "queued",
  "started",
  "write-completed",
  "confirmed",
  "indeterminate",
  "failed",
  "timed-out",
  "rejected",
]);
export type LifecycleStage = z.infer<typeof lifecycleStageSchema>;

export const END_STAGES: readonly LifecycleStage[] = [
  "confirmed",
  "indeterminate",
  "failed",
  "timed-out",
  "rejected",
];

/** Payload of `command.lifecycle`. Sent to every client, so it names the command and its sender. */
export const commandLifecyclePayloadSchema = z.strictObject({
  /** The `id` of the `command` message this is about. */
  commandId: ID,
  capabilityId: ID,
  /** The client that sent the command (D7). */
  clientId: ID,
  stage: lifecycleStageSchema,
  /** When the service recorded the stage, in milliseconds since the epoch. */
  at: z.int().nonnegative(),
  /** Why, for `failed`, `timed-out`, `indeterminate` and `rejected`. */
  reason: z.string().min(1).max(500).optional(),
  /** The fields that failed validation, for `rejected`. */
  issues: z
    .array(
      z.strictObject({
        path: z.array(z.union([z.string().max(MAX_PATH_PART_LENGTH), z.int()])).max(MAX_PATH_PARTS),
        message: z.string().max(MAX_ISSUE_MESSAGE_LENGTH),
      }),
    )
    .max(MAX_ISSUES)
    .optional(),
});
export type CommandLifecyclePayload = z.infer<typeof commandLifecyclePayloadSchema>;
