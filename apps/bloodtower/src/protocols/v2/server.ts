import { z } from "zod";
import { loggedPayloadSchema } from "../messages.ts";
import { message, roleSchema, tokenSchema } from "./common.ts";
import { refuseBoardContent } from "./refuse.ts";
import { boardViewMessageSchema, deviceViewMessageSchema } from "./views.ts";

const issue = (ctx: z.RefinementCtx, messageText: string) => {
  ctx.addIssue({ code: "custom", message: messageText });
};

/** `storyboard`, or `ipad:<hero>` for a hero this device holds. */
export const channelSchema = z
  .string()
  .refine((value) => value === "storyboard" || /^ipad:[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value), {
    message: "A channel is storyboard or ipad:<hero>.",
  });

export const welcomePayloadSchema = z
  .strictObject({
    clientId: z.string().min(1).max(64),
    role: roleSchema,
    token: tokenSchema,
    channels: z.array(channelSchema).max(16),
    versions: z.strictObject({
      protocol: z.literal(2),
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

export const errorCodeSchema = z.enum([
  "invalid-json",
  "invalid-envelope",
  "unknown-type",
  "invalid-payload",
  "invalid-state",
  "private-on-storyboard",
  "storyboard-control",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorPayloadSchema = z
  .strictObject({
    code: errorCodeSchema,
    message: z.string().min(1).max(300),
    actionable: z.string().min(1).max(300).optional(),
  })
  .superRefine((value, ctx) => refuseBoardContent(value, ctx));

export const welcomeMessageSchema = message("welcome", welcomePayloadSchema);
export const errorMessageSchema = message("error", errorPayloadSchema);

export const loggedMessageSchema = message("logged", loggedPayloadSchema);

export const serverMessageSchema = z.discriminatedUnion("type", [
  welcomeMessageSchema,
  errorMessageSchema,
  loggedMessageSchema,
  boardViewMessageSchema,
  deviceViewMessageSchema,
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;

export const SERVER_MESSAGE_TYPES: readonly string[] = serverMessageSchema.options.map(
  (option) => option.shape.type.value,
);
