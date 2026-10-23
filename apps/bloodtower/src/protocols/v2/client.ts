import { z } from "zod";
import {
  actionIdSchema,
  formFactorSchema,
  joinCodeSchema,
  jsonValueSchema,
  lineIdSchema,
  message,
  promptIdSchema,
  roleSchema,
  tokenSchema,
} from "./common.ts";
import { refuseBoardContent, refuseCommandKeys } from "./refuse.ts";

const issue = (ctx: z.RefinementCtx, messageText: string) => {
  ctx.addIssue({ code: "custom", message: messageText });
};

export const helloPayloadSchema = z
  .strictObject({
    role: roleSchema,
    clientLabel: z.string().min(1).max(64),
    formFactor: formFactorSchema,
    token: tokenSchema.optional(),
    joinCode: joinCodeSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "storyboard") {
      if (value.formFactor !== "mac") issue(ctx, "The story board uses the mac form factor.");
      if (value.token || value.joinCode) {
        issue(ctx, "The story board does not join with a code or a device token.");
      }
      return;
    }
    if (value.formFactor === "mac") issue(ctx, "A player device is an iPad or a phone.");
    if (!value.token && !value.joinCode) {
      issue(ctx, "A device joins with a code or rejoins with its token.");
    }
  });

/** One press. `args` carries the choice (an option id, a note) and never a tower command. */
export const actPayloadSchema = z
  .strictObject({
    promptId: promptIdSchema,
    actionId: actionIdSchema,
    args: z.record(z.string().min(1).max(64), jsonValueSchema),
  })
  .superRefine((value, ctx) => refuseCommandKeys(value, ctx));

/**
 * The story board reports that the public line finished (D7, D36).
 * The host acts on it only when `lineId` is the line now showing. That check is the host's.
 */
export const narrationEndedPayloadSchema = z
  .strictObject({
    lineId: lineIdSchema,
  })
  .superRefine((value, ctx) => refuseBoardContent(value, ctx));

/** Short slug stored in the host log and shown on a card or toast. */
export const PAGE_LOG_CODE = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const PAGE_LOG_MESSAGE_MAX = 500;
export const PAGE_LOG_CONTEXT_MAX = 120;

export const pageLogLevelSchema = z.enum(["debug", "info", "warn", "error"]);
export const pageLogSourceSchema = z.enum(["board", "device"]);

/**
 * Client-to-host `log` (decision 0003, D39). Text and a short code only.
 * A strict object, so `bytes`, `raw`, `packet`, `capabilityId` and `params` are refused.
 */
export const logPayloadSchema = z.strictObject({
  level: pageLogLevelSchema,
  source: pageLogSourceSchema,
  device: z.string().min(1).max(PAGE_LOG_CONTEXT_MAX).nullable(),
  session: z.string().min(1).max(PAGE_LOG_CONTEXT_MAX).nullable(),
  screen: z.string().min(1).max(PAGE_LOG_CONTEXT_MAX).nullable(),
  code: z.string().regex(PAGE_LOG_CODE),
  message: z.string().trim().min(1).max(PAGE_LOG_MESSAGE_MAX),
});

export const helloMessageSchema = message("hello", helloPayloadSchema);
export const actMessageSchema = message("act", actPayloadSchema);
export const narrationEndedMessageSchema = message("narration-ended", narrationEndedPayloadSchema);
export const logMessageSchema = message("log", logPayloadSchema);

export const clientMessageSchema = z.discriminatedUnion("type", [
  helloMessageSchema,
  actMessageSchema,
  narrationEndedMessageSchema,
  logMessageSchema,
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

export const CLIENT_MESSAGE_TYPES: readonly string[] = clientMessageSchema.options.map(
  (option) => option.shape.type.value,
);
