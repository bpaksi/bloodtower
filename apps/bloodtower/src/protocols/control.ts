import { z } from "zod";
import { deviceIdSchema, utcTimestampSchema } from "./devices.ts";

/**
 * The only controls accepted on a joined device.
 * Tower connect and calibrate are named presses. `pick` is a choice press on an iPad pick prompt,
 * and it carries the chosen option id. There is no command message and no raw bytes.
 * The server decides the winner by arrival order (step 5). This module is the record shape.
 */
export const CONTROL_ACTIONS = [
  "begin",
  "continue",
  "pause",
  "resume",
  "quit",
  "tower-connect",
  "tower-calibrate",
  "pick",
] as const;
export const controlActionSchema = z.enum(CONTROL_ACTIONS);
export type ControlAction = z.infer<typeof controlActionSchema>;

/**
 * The flow screens, in order. The server holds the current one; no client sends it.
 * Splash is the first screen after load. Quit is the end once play has been quit.
 */
export const FLOW_SCREENS = [
  "splash",
  "tower-connect",
  "pick-story",
  "party-join",
  "begin",
  "play",
  "quit",
] as const;
export const flowScreenSchema = z.enum(FLOW_SCREENS);
export type FlowScreen = z.infer<typeof flowScreenSchema>;

export const promptIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

/** A pick option id from the pack's choices, such as `oil-the-hinge`. */
export const optionIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);

const monoMs = z.number().refine((value) => Number.isFinite(value) && value >= 0, {
  message: "Expected a finite monotonic millisecond offset.",
});

/** One press, winning or losing. Both are logged, with the device and the screen it was made on. */
export const controlPressSchema = z.strictObject({
  promptId: promptIdSchema,
  action: controlActionSchema,
  deviceId: deviceIdSchema,
  atMonoMs: monoMs,
  atWall: utcTimestampSchema,
  winner: z.boolean(),
  /**
   * The screen the server held when the press arrived. A press that loses a batch to an
   * earlier press in the same batch arrives after the flow moved, so it records the new screen.
   * Null only on a press recorded before the flow state existed.
   */
  screen: flowScreenSchema.nullable(),
  /** The screen a winning press moved the flow to. Null when nothing moved. */
  nextScreen: flowScreenSchema.nullable(),
});
export type ControlPress = z.infer<typeof controlPressSchema>;

/** The locked result every screen shows after the first press. */
export const controlLockSchema = z.strictObject({
  promptId: promptIdSchema,
  action: controlActionSchema,
  winnerDeviceId: deviceIdSchema,
});
export type ControlLock = z.infer<typeof controlLockSchema>;
