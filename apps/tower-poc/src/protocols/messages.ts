import { z } from "zod";
import { envelopeSchema, PROTOCOL_VERSION } from "./envelope.ts";

const message = <T extends string, P extends z.ZodType>(type: T, payload: P) =>
  envelopeSchema.extend({ type: z.literal(type), payload });

// Client → server

export const helloPayloadSchema = z.strictObject({
  clientLabel: z.string().min(1).max(64),
});

export const helloMessageSchema = message("hello", helloPayloadSchema);

export const clientMessageSchema = z.discriminatedUnion("type", [helloMessageSchema]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

// Server → client

export const welcomePayloadSchema = z.strictObject({
  clientId: z.string().min(1),
  versions: z.strictObject({
    protocol: z.literal(PROTOCOL_VERSION),
    server: z.string().min(1),
    node: z.string().min(1),
  }),
});

export const errorCodeSchema = z.enum([
  "invalid-json",
  "invalid-envelope",
  "unknown-type",
  "invalid-payload",
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorPayloadSchema = z.strictObject({
  code: errorCodeSchema,
  message: z.string().min(1),
  /** What the user can do about it, when there is something. */
  actionable: z.string().min(1).optional(),
});

export const welcomeMessageSchema = message("welcome", welcomePayloadSchema);
export const errorMessageSchema = message("error", errorPayloadSchema);

export const serverMessageSchema = z.discriminatedUnion("type", [
  welcomeMessageSchema,
  errorMessageSchema,
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;

/** Message types a client may send. Anything else is answered with `unknown-type`. */
export const CLIENT_MESSAGE_TYPES: readonly string[] = clientMessageSchema.options.map(
  (option) => option.shape.type.value,
);
