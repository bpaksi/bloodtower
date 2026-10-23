// How the service's states read on screen. A value this page does not have is "Unknown" or
// "Unavailable", never zero or blank.
import type {
  CalibrationState,
  ClientSocketState,
  ConnectionState,
  LifecycleStage,
  Origin,
  StateValue,
} from "@dark-tower/tower";

export const CONNECTION_LABELS: Record<ConnectionState, string> = {
  "bluetooth-unavailable": "Bluetooth unavailable",
  disconnected: "Not connected",
  scanning: "Scanning",
  connecting: "Connecting",
  connected: "Connected",
  disconnecting: "Disconnecting",
  error: "Error",
};

export const CALIBRATION_LABELS: Record<CalibrationState, string> = {
  uncalibrated: "Not calibrated",
  calibrating: "Calibrating",
  calibrated: "Calibrated",
};

export const SOCKET_LABELS: Record<ClientSocketState, string> = {
  online: "Online",
  "reconnecting-to-service": "Reconnecting",
  "service-unreachable": "Unreachable",
};

export const STAGE_LABELS: Record<LifecycleStage, string> = {
  queued: "Queued",
  started: "Started",
  "write-completed": "Sent",
  confirmed: "Confirmed",
  indeterminate: "Sent, no answer",
  failed: "Failed",
  "timed-out": "Timed out",
  rejected: "Rejected",
};

const isBattery = (value: unknown): value is { millivolts: number; percent: number } =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { millivolts?: unknown }).millivolts === "number" &&
  typeof (value as { percent?: unknown }).percent === "number";

/** The battery as the header shows it, with "stale" when it is not a current reading. */
export const batteryLabel = (value: StateValue | undefined) => {
  if (!value) return "Unknown";
  if (value.freshness === "unavailable" || !isBattery(value.value)) return "Unavailable";
  const text = `${Math.round(value.value.percent)}% (${(value.value.millivolts / 1000).toFixed(2)} V)`;
  return value.freshness === "stale" ? `${text}, stale` : text;
};

export const ORIGIN_LABELS: Record<Origin, string> = {
  "device-reported": "Reported by the tower",
  "library-derived": "Worked out by the library",
  "application-maintained": "Kept by the app",
  unknown: "Origin unknown",
};

export const FRESHNESS_LABELS: Record<StateValue["freshness"], string> = {
  current: "Current",
  stale: "Stale",
  unavailable: "Unavailable",
};

/** A time of day to the second, with the date when it is not today. */
export const timeLabel = (at: number, now: number = Date.now()) => {
  const date = new Date(at);
  const time = date.toLocaleTimeString(undefined, { hour12: false });
  return date.toDateString() === new Date(now).toDateString()
    ? time
    : `${date.toLocaleDateString()} ${time}`;
};
