import type { TowerSnapshot } from "bloodtower-protocols";

/** No reading yet. This is not a disconnected tower and not a zero battery. */
export const unavailableTower = (): TowerSnapshot => ({
  connection: "unavailable",
  battery: { state: "unavailable" },
  calibrated: { state: "unavailable" },
});

/** Maps a tower-poc `connection.state` onto the bloodtower snapshot. Unknown states stay unavailable. */
export const mapConnection = (state: string | undefined): TowerSnapshot["connection"] => {
  if (state === "connected") return "connected";
  if (state === "scanning" || state === "connecting") return "connecting";
  if (state === "disconnected" || state === "disconnecting") return "disconnected";
  return "unavailable";
};

export const mapCalibration = (state: string | undefined): TowerSnapshot["calibrated"] => {
  if (state === "calibrated") return { state: "known", calibrated: true };
  if (state === "uncalibrated" || state === "calibrating")
    return { state: "known", calibrated: false };
  return { state: "unavailable" };
};

/** A `battery.level` state value. A missing or unreadable percent is unavailable, including the string "0". */
export const mapBattery = (level: unknown): TowerSnapshot["battery"] => {
  if (!level || typeof level !== "object") return { state: "unavailable" };
  const record = level as Record<string, unknown>;
  // A stale percent is not a current reading, including a stale 0.
  if (record.freshness !== "current") return { state: "unavailable" };
  const value = record.value;
  if (!value || typeof value !== "object") return { state: "unavailable" };
  const percent = (value as Record<string, unknown>).percent;
  if (typeof percent !== "number" || !Number.isInteger(percent) || percent < 0 || percent > 100) {
    return { state: "unavailable" };
  }
  return { state: "known", percent };
};
