import { z } from "zod";

/** v2 envelope version. v1 `PROTOCOL_VERSION` stays 1 until the host switch-over. */
export const PROTOCOL_V2 = 2 as const;

const issue = (ctx: z.RefinementCtx, message: string) => {
  ctx.addIssue({ code: "custom", message });
};

export const envelopeV2Schema = z.strictObject({
  v: z.literal(PROTOCOL_V2),
  type: z.string().min(1).max(80),
  id: z.string().min(1).max(64).optional(),
  correlationId: z.string().min(1).max(64).optional(),
  payload: z.unknown(),
});
export type EnvelopeV2 = z.infer<typeof envelopeV2Schema>;

export const messageV2 = <const T extends string, P extends z.ZodType>(type: T, payload: P) =>
  z.strictObject({
    v: z.literal(PROTOCOL_V2),
    type: z.literal(type),
    id: z.string().min(1).max(64).optional(),
    correlationId: z.string().min(1).max(64).optional(),
    payload,
  });

export { issue };
