import { z } from "zod";

export const PROTOCOL_VERSION = 1;

/**
 * Wrapper around every WebSocket message in both directions (spec §3.2).
 * `payload` is validated per message type by the schemas that build on this.
 */
export const envelopeSchema = z.strictObject({
  v: z.literal(PROTOCOL_VERSION),
  type: z.string().min(1),
  id: z.string().min(1).max(64).optional(),
  correlationId: z.string().min(1).max(64).optional(),
  payload: z.unknown(),
});

export type Envelope = z.infer<typeof envelopeSchema>;
