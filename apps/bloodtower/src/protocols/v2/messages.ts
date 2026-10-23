import { z } from "zod";
import { roleSchema, tokenSchema } from "../devices.ts";
import { errorPayloadSchema, helloPayloadSchema, logPayloadSchema } from "../messages.ts";
import { issue, messageV2, PROTOCOL_V2 } from "./envelope.ts";
import { actionIdSchema, clientIdSchema, promptIdSchema } from "./ids.ts";
import { boardCarriesForbidden, carriesForbiddenKey } from "./refuse.ts";

/**
 * v2 client and server messages other than the two views.
 * Payloads that v1 already froze (hello, error, log) are reused so the rules stay one.
 * The envelope version is 2. Welcome cannot reuse v1: its protocol literal is 1.
 */

export const helloMessageV2Schema = messageV2("hello", helloPayloadSchema);

const actScalar = z.union([z.string().max(500), z.number().finite(), z.boolean(), z.null()]);

/**
 * Arguments for one action. A record, so a new action needs no new message type (DEC-204).
 * Values stay short. Forbidden keys are refused even when the key is a valid string.
 */
export const actArgsSchema = z
  .record(z.string().min(1).max(64), z.union([actScalar, z.array(actScalar).max(16)]))
  .superRefine((value, ctx) => {
    if (Object.keys(value).length > 16) issue(ctx, "An act carries at most 16 arguments.");
    if (carriesForbiddenKey(value)) {
      issue(ctx, "An act cannot carry raw bytes or a tower command.");
    }
  });

/** One press. The engine decides whether it wins. The payload does not carry a device id. */
export const actPayloadSchema = z.strictObject({
  promptId: promptIdSchema,
  actionId: actionIdSchema,
  args: actArgsSchema,
});
export type ActPayload = z.infer<typeof actPayloadSchema>;

export const actMessageV2Schema = messageV2("act", actPayloadSchema);

/**
 * The story board reports that a public narration line finished (D7, D36).
 * The host acts only when `narrationId` and `line` are the line now showing.
 */
export const narrationEndedPayloadSchema = z
  .strictObject({
    narrationId: z.string().min(1).max(120),
    line: z.number().int().min(0).max(999),
  })
  .superRefine((value, ctx) => {
    if (boardCarriesForbidden(value)) {
      issue(ctx, "A narration report cannot carry a private line or a tower command.");
    }
  });

export const narrationEndedMessageV2Schema = messageV2(
  "narration-ended",
  narrationEndedPayloadSchema,
);

/** Page log (decision 0003, D39). Text and a short code only. */
export const logMessageV2Schema = messageV2("log", logPayloadSchema);

export const clientMessageV2Schema = z.discriminatedUnion("type", [
  helloMessageV2Schema,
  actMessageV2Schema,
  narrationEndedMessageV2Schema,
  logMessageV2Schema,
]);
export type ClientMessageV2 = z.infer<typeof clientMessageV2Schema>;

export const CLIENT_MESSAGE_V2_TYPES: readonly string[] = clientMessageV2Schema.options.map(
  (option) => option.shape.type.value,
);

/** `ipad:<hero>` or the storyboard channel. The colon is the target form from D8. */
const heroChannel = /^ipad:[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export const channelV2Schema = z
  .string()
  .refine((value) => value === "storyboard" || heroChannel.test(value), {
    message: "A channel is storyboard or ipad:<hero>.",
  });

export const welcomePayloadV2Schema = z
  .strictObject({
    clientId: clientIdSchema,
    role: roleSchema,
    token: tokenSchema,
    /**
     * Story board: exactly `storyboard`.
     * Device: one `ipad:<hero>` for each hero it holds at hello, or none yet.
     */
    channels: z.array(channelV2Schema).max(16),
    versions: z.strictObject({
      protocol: z.literal(PROTOCOL_V2),
      server: z.string().min(1).max(32),
      node: z.string().min(1).max(32),
    }),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.channels).size !== value.channels.length) {
      issue(ctx, "A channel is listed twice.");
    }
    if (value.role === "storyboard") {
      if (value.channels.length !== 1 || value.channels[0] !== "storyboard") {
        issue(ctx, "A story board socket subscribes only to the storyboard channel.");
      }
      return;
    }
    if (value.channels.includes("storyboard")) {
      issue(ctx, "A device socket does not subscribe to the storyboard channel.");
    }
  });

export const welcomeMessageV2Schema = messageV2("welcome", welcomePayloadV2Schema);

export const errorMessageV2Schema = messageV2("error", errorPayloadSchema);
