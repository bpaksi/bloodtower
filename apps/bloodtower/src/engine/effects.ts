import { z } from "zod";

export const recordedPressEffectV1 = z.object({
  kind: z.literal("recorded-press"),
  v: z.literal(1),
  deviceId: z.string(),
  promptId: z.string(),
  actionId: z.string(),
  winner: z.boolean(),
});

export const loopTraceEffectV1 = z.object({
  kind: z.literal("loop-trace"),
  v: z.literal(1),
  loopId: z.string(),
  phase: z.string(),
});

export const loopEndEffectV1 = z.object({
  kind: z.literal("loop-end"),
  v: z.literal(1),
  loopId: z.string(),
  result: z.unknown(),
});

export const engineEffectSchema = z.discriminatedUnion("kind", [
  recordedPressEffectV1,
  loopTraceEffectV1,
  loopEndEffectV1,
]);

export type EngineEffect = z.infer<typeof engineEffectSchema>;
export type RecordedPressEffect = z.infer<typeof recordedPressEffectV1>;
export type LoopTraceEffect = z.infer<typeof loopTraceEffectV1>;
