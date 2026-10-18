import type { TowerSnapshot } from "bloodtower-protocols";
import { unavailableTower } from "./snapshot.ts";
import type { TowerPort, TowerSent } from "./types.ts";

export interface MockTower extends TowerPort {
  setBattery: (percent: number | "unavailable") => void;
  /** `null` is a tower that reports no firmware. The mock reports "mock" until a test says. */
  setFirmware: (version: string | null) => void;
  /** The next playSound fails once, as a tower that did not take the command. */
  failNextSound: () => void;
}

/**
 * In-memory tower for CI. It records connect, calibrate and sounds, and never a light cue.
 * Battery stays unavailable until a test sets a reading. Zero is a reading only when set.
 */
export const createMockTower = (): MockTower => {
  let snapshot: TowerSnapshot = unavailableTower();
  const sent: TowerSent[] = [];
  let opened = false;
  let failSound = false;

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
        firmware: { state: "known", version: "mock" },
      };
    },
    calibrate: () => {
      if (snapshot.connection !== "connected") return;
      sent.push({ type: "calibrate" });
      snapshot = { ...snapshot, calibrated: { state: "known", calibrated: true } };
    },
    playSound: async (soundIndex, volume) => {
      if (snapshot.connection !== "connected") return "failed";
      if (failSound) {
        failSound = false;
        return "failed";
      }
      sent.push({ type: "sound", soundIndex, volume });
      return "written";
    },
    setFirmware: (version) => {
      snapshot = {
        ...snapshot,
        firmware: version === null ? { state: "unavailable" } : { state: "known", version },
      };
    },
    failNextSound: () => {
      failSound = true;
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
