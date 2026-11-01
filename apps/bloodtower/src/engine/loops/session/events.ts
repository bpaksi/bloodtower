import { z } from "zod";
import { pressEventV1 } from "../../events.ts";
import { towerSnapshotSchema } from "./towerSnapshot.ts";

export const startSessionEventV1 = z.object({
  kind: z.literal("start-session"),
  v: z.literal(1),
  seed: z.string(),
  sessionId: z.string(),
});

export const towerSnapshotEventV1 = z.object({
  kind: z.literal("tower-snapshot"),
  v: z.literal(1),
  tower: towerSnapshotSchema,
});

export const deviceJoinEventV1 = z.object({
  kind: z.literal("device-join"),
  v: z.literal(1),
  deviceId: z.string().min(1),
});

export const deviceDropEventV1 = z.object({
  kind: z.literal("device-drop"),
  v: z.literal(1),
  deviceId: z.string().min(1),
});

export const heroHoldEventV1 = z.object({
  kind: z.literal("hero-hold"),
  v: z.literal(1),
  deviceId: z.string().min(1),
  heroId: z.string().min(1),
  action: z.enum(["take", "release"]),
});

export const focusStoryEventV1 = z.object({
  kind: z.literal("focus-story"),
  v: z.literal(1),
  deviceId: z.string().min(1),
  storyId: z.string().min(1),
});

export const setSettingEventV1 = z.object({
  kind: z.literal("set-setting"),
  v: z.literal(1),
  deviceId: z.string().min(1),
  settingId: z.string().min(1),
  optionId: z.string().min(1),
});

export const gearEventV1 = z.object({
  kind: z.literal("gear"),
  v: z.literal(1),
  deviceId: z.string().min(1),
  action: z.enum(["open", "pick", "done", "keep-volume", "try-another", "step-back"]),
  item: z.string().min(1).max(64).optional(),
  pick: z.string().min(1).max(80).optional(),
  heroId: z.string().min(1).max(80).optional(),
  otherHeroId: z.string().min(1).max(80).optional(),
  volume: z.number().int().min(0).max(2).optional(),
});

export const shellEventSchema = z.discriminatedUnion("kind", [
  startSessionEventV1,
  pressEventV1,
  towerSnapshotEventV1,
  deviceJoinEventV1,
  deviceDropEventV1,
  heroHoldEventV1,
  focusStoryEventV1,
  setSettingEventV1,
  gearEventV1,
]);

export type ShellEvent = z.infer<typeof shellEventSchema>;
