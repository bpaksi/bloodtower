import type { ConnectionPayload } from "@dark-tower/tower";
import { describe, expect, it } from "vitest";
import { towerActions } from "./towerActions.ts";

const tower = (
  state: ConnectionPayload["state"],
  calibration: ConnectionPayload["calibration"] = "uncalibrated",
  error?: ConnectionPayload["error"],
): ConnectionPayload => ({ state, calibration, ...(error ? { error } : {}) });

describe("towerActions", () => {
  it("allows nothing while nothing is known", () => {
    expect(Object.values(towerActions(undefined)).some(Boolean)).toBe(false);
  });

  it("calibrates only a connected tower that is not already calibrating", () => {
    expect(towerActions(tower("connected")).calibrate).toBe(true);
    expect(towerActions(tower("connected", "calibrated")).calibrate).toBe(true);
    expect(towerActions(tower("connected", "calibrating")).calibrate).toBe(false);
    expect(towerActions(tower("disconnected")).calibrate).toBe(false);
    expect(towerActions(tower("connecting")).calibrate).toBe(false);
  });

  it("offers Reconnect instead of Connect only after the tower dropped the link (D10)", () => {
    expect(towerActions(tower("disconnected"))).toMatchObject({ connect: true, reconnect: false });
    const dropped = tower("disconnected", "uncalibrated", {
      code: "unexpected-disconnect",
      message: "The tower disconnected.",
    });
    expect(towerActions(dropped)).toMatchObject({ connect: false, reconnect: true });
  });
});
