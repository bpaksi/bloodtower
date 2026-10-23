import { z } from "zod";

/** Event schema version for a kind. A changed shape is a new kind or v. */
export const pressEventV1 = z.object({
  kind: z.literal("press"),
  v: z.literal(1),
  deviceId: z.string().min(1),
  promptId: z.string().min(1),
  actionId: z.string().min(1),
});

export const startTestLoopEventV1 = z.object({
  kind: z.literal("start-test-loop"),
  v: z.literal(1),
  seed: z.string(),
});

export const engineEventSchema = z.discriminatedUnion("kind", [pressEventV1, startTestLoopEventV1]);

export type EngineEvent = z.infer<typeof engineEventSchema>;
export type PressEvent = z.infer<typeof pressEventV1>;
export type StartTestLoopEvent = z.infer<typeof startTestLoopEventV1>;
