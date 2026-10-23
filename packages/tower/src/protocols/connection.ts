import { z } from "zod";

/** Where the tower connection stands (spec §3.2). `scanning` is the PRD's "selecting device". */
export const connectionStateSchema = z.enum([
  "bluetooth-unavailable",
  "disconnected",
  "scanning",
  "connecting",
  "connected",
  "disconnecting",
  "error",
]);
export type ConnectionState = z.infer<typeof connectionStateSchema>;

/** Separate from the connection state: a tower can be connected and uncalibrated (D9). */
export const calibrationStateSchema = z.enum(["uncalibrated", "calibrating", "calibrated"]);
export type CalibrationState = z.infer<typeof calibrationStateSchema>;

/** The browser's own link to the service. Kept by the client; the service never sends it. */
export const clientSocketStateSchema = z.enum([
  "online",
  "reconnecting-to-service",
  "service-unreachable",
]);
export type ClientSocketState = z.infer<typeof clientSocketStateSchema>;

const field = z.string().max(200).nullable();

/**
 * What the tower's Device Information Service reported on connect. A field the tower did not
 * report is null, which the UI shows as unavailable, never as empty.
 */
export const deviceSchema = z.strictObject({
  manufacturerName: field,
  modelNumber: field,
  serialNumber: field,
  hardwareRevision: field,
  firmwareRevision: field,
  softwareRevision: field,
});
export type Device = z.infer<typeof deviceSchema>;

export const connectionErrorCodeSchema = z.enum([
  "bluetooth-unavailable",
  "tower-not-found",
  "connect-failed",
  "unexpected-disconnect",
  "calibration-failed",
]);
export type ConnectionErrorCode = z.infer<typeof connectionErrorCodeSchema>;

export const connectionErrorSchema = z.strictObject({
  code: connectionErrorCodeSchema,
  message: z.string().min(1).max(500),
  /** What the person can do about it, when there is something. */
  actionable: z.string().min(1).max(500).optional(),
});

/**
 * Payload of `connection`. `calibration` travels with it because every calibration change is a
 * connection-level event too: it resets on disconnect (D10).
 */
export const connectionPayloadSchema = z.strictObject({
  state: connectionStateSchema,
  calibration: calibrationStateSchema,
  device: deviceSchema.optional(),
  error: connectionErrorSchema.optional(),
});
export type ConnectionPayload = z.infer<typeof connectionPayloadSchema>;
