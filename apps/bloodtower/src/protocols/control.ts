import { z } from "zod";
import { deviceIdSchema, utcTimestampSchema } from "./devices.ts";

/**
 * The only controls R1 accepts, on a joined device.
 * Tower connect and calibrate are named presses. There is no command message and no raw bytes.
 * The server decides the winner by arrival order (step 5). This module is the record shape.
 */
export const CONTROL_ACTIONS = [
  "begin",
  "continue",
  "pause",
  "resume",
  "tower-connect",
  "tower-calibrate",
] as const;
export const controlActionSchema = z.enum(CONTROL_ACTIONS);
export type ControlAction = z.infer<typeof controlActionSchema>;

export const promptIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

const monoMs = z.number().refine((value) => Number.isFinite(value) && value >= 0, {
  message: "Expected a finite monotonic millisecond offset.",
});

/** One press, winning or losing. Both are logged. */
export const controlPressSchema = z.strictObject({
  promptId: promptIdSchema,
  action: controlActionSchema,
  deviceId: deviceIdSchema,
  atMonoMs: monoMs,
  atWall: utcTimestampSchema,
  winner: z.boolean(),
});
export type ControlPress = z.infer<typeof controlPressSchema>;

/** The locked result every screen shows after the first press. */
export const controlLockSchema = z.strictObject({
  promptId: promptIdSchema,
  action: controlActionSchema,
  winnerDeviceId: deviceIdSchema,
});
export type ControlLock = z.infer<typeof controlLockSchema>;
