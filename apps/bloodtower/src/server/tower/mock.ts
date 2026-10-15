import type { TowerSnapshot } from "bloodtower-protocols";
import { unavailableTower } from "./snapshot.ts";
import type { TowerPort, TowerSent } from "./types.ts";

export interface MockTower extends TowerPort {
  setBattery: (percent: number | "unavailable") => void;
}

/**
 * In-memory tower for CI. It records connect and calibrate and never a cue.
 * Battery stays unavailable until a test sets a reading. Zero is a reading only when set.
 */
export const createMockTower = (): MockTower => {
  let snapshot: TowerSnapshot = unavailableTower();
  const sent: TowerSent[] = [];
  let opened = false;

  return {
    snapshot: () => snapshot,
    connect: () => {
      if (opened && snapshot.connection === "connected") return;
      opened = true;
      sent.push({ type: "connect" });
      snapshot = {
        ...snapshot,
        connection: "connected",
        calibrated: { state: "known", calibrated: false },
      };
    },
    calibrate: () => {
      if (snapshot.connection !== "connected") return;
      sent.push({ type: "calibrate" });
      snapshot = { ...snapshot, calibrated: { state: "known", calibrated: true } };
    },
    setBattery: (percent) => {
      snapshot = {
        ...snapshot,
        battery: percent === "unavailable" ? { state: "unavailable" } : { state: "known", percent },
      };
    },
    close: () => {
      opened = false;
      snapshot = unavailableTower();
    },
    sent: () => sent,
    settled: async () => {},
  };
};
