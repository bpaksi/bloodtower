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

/**
 * How a tower command the Enter sent ended. The host appends it after the command settles,
 * so a failed connect or calibrate loops back to the tower choice (MEC-039 .11).
 */
export const towerResultEventV1 = z.object({
  kind: z.literal("tower-result"),
  v: z.literal(1),
  capabilityId: z.enum(["tower.connect", "tower.calibrate"]),
  ok: z.boolean(),
});

// An iPad tapped Enable sound: its browser audio is unlocked (Pick story, Bob 2026-10-31).
export const soundUnlockEventV1 = z.object({
  kind: z.literal("sound-unlock"),
  v: z.literal(1),
  deviceId: z.string().min(1),
});

// An iPad pressed one volume. The tower plays Dungeon Complete at it only on this press (SCR-006).
export const volumePlayEventV1 = z.object({
  kind: z.literal("volume-play"),
  v: z.literal(1),
  deviceId: z.string().min(1),
  level: z.number().int().min(0).max(2),
});

// How the tower's Dungeon Complete at that volume ended. The host appends it.
export const volumeResultEventV1 = z.object({
  kind: z.literal("volume-result"),
  v: z.literal(1),
  deviceId: z.string().min(1),
  level: z.number().int().min(0).max(2),
  ok: z.boolean(),
});

// Keep the volume last played, or Try another.
export const volumeAnswerEventV1 = z.object({
  kind: z.literal("volume-answer"),
  v: z.literal(1),
  deviceId: z.string().min(1),
  answer: z.enum(["keep", "again"]),
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
  towerResultEventV1,
  soundUnlockEventV1,
  volumePlayEventV1,
  volumeResultEventV1,
  volumeAnswerEventV1,
]);

export type ShellEvent = z.infer<typeof shellEventSchema>;
