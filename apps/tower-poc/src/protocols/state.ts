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
 * no `value` at all, so it cannot be shown as zero or as empty.
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

/** Payload of `state`: values keyed by the inventory id of the property or query they belong to. */
export const statePayloadSchema = z.strictObject({
  snapshot: z.record(z.string().min(1).max(64), stateValueSchema),
});
export type StatePayload = z.infer<typeof statePayloadSchema>;

/** Payload of `restoreState`: the answer to the restore prompt (D11). Nothing is sent to the tower. */
export const restoreStatePayloadSchema = z.strictObject({ accept: z.boolean() });
