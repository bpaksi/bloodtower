import { describe, expect, it } from "vitest";
import { mapBattery, mapCalibration, mapConnection, mapFirmware } from "./snapshot.ts";

describe("tower snapshot maps", () => {
  it("keeps an unknown battery unavailable, and keeps a known zero", () => {
    expect(mapConnection("connected")).toBe("connected");
    expect(mapConnection("scanning")).toBe("connecting");
    expect(mapConnection("bluetooth-unavailable")).toBe("unavailable");
    expect(mapConnection(undefined)).toBe("unavailable");
    expect(mapCalibration("calibrated")).toEqual({ state: "known", calibrated: true });
    expect(mapCalibration("uncalibrated")).toEqual({ state: "known", calibrated: false });
    expect(mapCalibration(undefined)).toEqual({ state: "unavailable" });
    expect(mapBattery(undefined)).toEqual({ state: "unavailable" });
    expect(mapBattery({ freshness: "unavailable", origin: "unknown" })).toEqual({
      state: "unavailable",
    });
    expect(
      mapBattery({
        freshness: "current",
        origin: "device",
        value: { percent: 0 },
      }),
    ).toEqual({ state: "known", percent: 0 });
    expect(mapFirmware(undefined)).toEqual({ state: "unavailable" });
    expect(mapFirmware({ firmwareRevision: "  " })).toEqual({ state: "unavailable" });
    expect(mapFirmware({ firmwareRevision: "1.2.3" })).toEqual({
      state: "known",
      version: "1.2.3",
    });
  });
});
