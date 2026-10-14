import { z } from "zod";
import { commandLifecyclePayloadSchema, commandPayloadSchema } from "./command.ts";
import { connectionPayloadSchema } from "./connection.ts";
import { envelopeSchema, PROTOCOL_VERSION } from "./envelope.ts";
import { inventoryEntrySchema } from "./inventoryWire.ts";
import { restoreStatePayloadSchema, statePayloadSchema } from "./state.ts";

const message = <T extends string, P extends z.ZodType>(type: T, payload: P) =>
  envelopeSchema.extend({ type: z.literal(type), payload });

// Client → server

export const helloPayloadSchema = z.strictObject({
  clientLabel: z.string().min(1).max(64),
});

export const helloMessageSchema = message("hello", helloPayloadSchema);

/** The four lifecycle actions carry nothing: each is a person pressing a button (D9, D10). */
const noPayload = z.strictObject({});

export const connectMessageSchema = message("connect", noPayload);
export const disconnectMessageSchema = message("disconnect", noPayload);
export const reconnectMessageSchema = message("reconnect", noPayload);
export const calibrateMessageSchema = message("calibrate", noPayload);
/** `id` is required: it is the command's correlation id in every `command.lifecycle` that follows. */
export const commandMessageSchema = message("command", commandPayloadSchema).extend({
  id: z.string().min(1).max(64),
});
export const restoreStateMessageSchema = message("restoreState", restoreStatePayloadSchema);

export const clientMessageSchema = z.discriminatedUnion("type", [
  helloMessageSchema,
  connectMessageSchema,
  disconnectMessageSchema,
  reconnectMessageSchema,
  calibrateMessageSchema,
  commandMessageSchema,
  restoreStateMessageSchema,
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

// Server → client

export const welcomePayloadSchema = z.strictObject({
  clientId: z.string().min(1),
  versions: z.strictObject({
    protocol: z.literal(PROTOCOL_VERSION),
    server: z.string().min(1),
    node: z.string().min(1),
    /** The installed `ultimatedarktower` and `ultimatedarktowerdata`, read from their manifests. */
    library: z.string().min(1),
    data: z.string().min(1),
  }),
  /** The service's capability inventory, in inventory order. */
  inventory: z.array(inventoryEntrySchema),
  /** Which tower the service drives: its mock (`MOCK=1`, D8) or a real one over Bluetooth. */
  tower: z.enum(["mock", "bluetooth"]),
});
export type WelcomePayload = z.infer<typeof welcomePayloadSchema>;

export const errorCodeSchema = z.enum([
  "invalid-json",
  "invalid-envelope",
  "unknown-type",
  "invalid-payload",
  // An action the service's current state does not allow, such as connecting while connected or
  // answering a restore prompt that is not open. Nothing was sent to the tower; the current state
  // follows in `connection` or `state`.
  "invalid-state",
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

export const connectionMessageSchema = message("connection", connectionPayloadSchema);
export const stateMessageSchema = message("state", statePayloadSchema);
export const commandLifecycleMessageSchema = message(
  "command.lifecycle",
  commandLifecyclePayloadSchema,
);

export const serverMessageSchema = z.discriminatedUnion("type", [
  welcomeMessageSchema,
  errorMessageSchema,
  connectionMessageSchema,
  stateMessageSchema,
  commandLifecycleMessageSchema,
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;

/** Message types a client may send. Anything else is answered with `unknown-type`. */
export const CLIENT_MESSAGE_TYPES: readonly string[] = clientMessageSchema.options.map(
  (option) => option.shape.type.value,
);
