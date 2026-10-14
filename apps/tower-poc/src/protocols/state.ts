import { z } from "zod";

/** Where a value came from (spec §3.1). */
export const originSchema = z.enum([
  "device-reported",
  "library-derived",
  "application-maintained",
  "unknown",
]);
export type Origin = z.infer<typeof originSchema>;

/**
 * One value in the state snapshot. A value the service does not have is `unavailable` and carries
 * no `value` at all, so it cannot be shown as zero or as empty. A `value` of null is a real
 * reading (for example "no seal is left to break"); it never stands for unknown.
 */
export const stateValueSchema = z.discriminatedUnion("freshness", [
  z.strictObject({
    freshness: z.enum(["current", "stale"]),
    value: z.json(),
    origin: originSchema,
    /** When the service last set it, in milliseconds since the epoch. */
    updatedAt: z.int().nonnegative(),
  }),
  z.strictObject({
    freshness: z.literal("unavailable"),
    origin: originSchema,
  }),
]);
export type StateValue = z.infer<typeof stateValueSchema>;

/** State values keyed by the inventory id of the property or query they belong to. */
export const stateSnapshotSchema = z.record(z.string().min(1).max(64), stateValueSchema);
export type StateSnapshot = z.infer<typeof stateSnapshotSchema>;

/**
 * State saved by an earlier run of the service, waiting for a person to restore it or not (D11).
 * The values are as they were saved; restoring one makes it `application-maintained` and `stale`.
 */
export const pendingRestoreSchema = z.strictObject({
  /** When it was saved, in milliseconds since the epoch. */
  savedAt: z.int().nonnegative(),
  snapshot: stateSnapshotSchema,
});
export type PendingRestore = z.infer<typeof pendingRestoreSchema>;

/**
 * Payload of `state`. `pendingRestore` is there for as long as the restore prompt is open, so a
 * client that sees a `state` without it closes the prompt, whoever answered it.
 */
export const statePayloadSchema = z.strictObject({
  snapshot: stateSnapshotSchema,
  pendingRestore: pendingRestoreSchema.optional(),
});
export type StatePayload = z.infer<typeof statePayloadSchema>;

/** Payload of `restoreState`: the answer to the restore prompt (D11). Nothing is sent to the tower. */
export const restoreStatePayloadSchema = z.strictObject({ accept: z.boolean() });
