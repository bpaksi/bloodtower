import { z } from "zod";
import { boardContentRefused } from "./v2/refuse.ts";

/** Short slug stored in the host log and shown on a card or toast. */
export const PAGE_LOG_CODE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Page log text. The same cap as `POST /log`, so the socket and the fallback match. */
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
export type LogPayload = z.infer<typeof logPayloadSchema>;

const refusePrivate = (value: unknown, ctx: z.RefinementCtx) => {
  if (boardContentRefused(value)) {
    ctx.addIssue({
      code: "custom",
      message: "The story board cannot carry a private moment or a tower command.",
    });
  }
};

/**
 * An error line just written to the host log. The story board shows it as a toast.
 * Warnings, info and debug are not sent. Private text is refused on the board path.
 */
export const loggedPayloadSchema = z
  .strictObject({
    code: z.string().regex(PAGE_LOG_CODE),
    source: z.enum(["server", "board", "device"]),
    message: z.string().trim().min(1).max(PAGE_LOG_MESSAGE_MAX),
  })
  .superRefine((value, ctx) => refusePrivate(value, ctx));
export type LoggedPayload = z.infer<typeof loggedPayloadSchema>;

/** `GET /health`. Connection and sound only: this process sends no light or other tower effect. */
export const hostHealthSchema = z.strictObject({
  protocol: z.literal(2),
  tower: z.literal("connection-and-sound"),
  effects: z.literal("sound-only"),
});
export type HostHealth = z.infer<typeof hostHealthSchema>;
