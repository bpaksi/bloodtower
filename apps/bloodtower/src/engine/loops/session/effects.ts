import { z } from "zod";

export const viewRefreshEffectV1 = z.object({
  kind: z.literal("view-refresh"),
  v: z.literal(1),
});

export const autosaveWriteEffectV1 = z.object({
  kind: z.literal("autosave-write"),
  v: z.literal(1),
  gameId: z.string(),
});

export const gameRecordEffectV1 = z.object({
  kind: z.literal("game-record"),
  v: z.literal(1),
  gameId: z.string(),
  outcome: z.enum(["quit", "won", "lost"]),
});

export const towerCommandEffectV1 = z.object({
  kind: z.literal("tower-command"),
  v: z.literal(1),
  capabilityId: z.string(),
  params: z.record(z.string(), z.unknown()),
});

export const checkpointWriteEffectV1 = z.object({
  kind: z.literal("checkpoint-write"),
  v: z.literal(1),
  gameId: z.string(),
  day: z.number().int().min(1),
});

export const shellEffectSchema = z.discriminatedUnion("kind", [
  viewRefreshEffectV1,
  autosaveWriteEffectV1,
  gameRecordEffectV1,
  towerCommandEffectV1,
  checkpointWriteEffectV1,
]);

export type ShellEffect = z.infer<typeof shellEffectSchema>;
