import { z } from "zod";

/** Known reading, or unavailable. A known 0 stays 0. Unavailable is a different state. */
export const towerBatterySchema = z.discriminatedUnion("state", [
  z.strictObject({ state: z.literal("unavailable") }),
  z.strictObject({
    state: z.literal("known"),
    percent: z.number().int().min(0).max(100),
  }),
]);

export const towerCalibrationSchema = z.discriminatedUnion("state", [
  z.strictObject({ state: z.literal("unavailable") }),
  z.strictObject({ state: z.literal("known"), calibrated: z.boolean() }),
]);

/** The firmware revision the tower reported on connect. Absent or unavailable is never blank. */
export const towerFirmwareSchema = z.discriminatedUnion("state", [
  z.strictObject({ state: z.literal("unavailable") }),
  z.strictObject({ state: z.literal("known"), version: z.string().min(1).max(200) }),
]);

export const towerSnapshotSchema = z.strictObject({
  connection: z.enum(["unavailable", "disconnected", "connecting", "connected"]),
  battery: towerBatterySchema,
  calibrated: towerCalibrationSchema,
  /** Absent means the same as unavailable. */
  firmware: towerFirmwareSchema.optional(),
});
export type TowerSnapshot = z.infer<typeof towerSnapshotSchema>;
