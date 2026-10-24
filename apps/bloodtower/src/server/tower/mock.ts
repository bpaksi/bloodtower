import type { TowerSnapshot } from "bloodtower-protocols";
import type { HostLogger } from "../log/hostLog.ts";
import { unavailableTower } from "./snapshot.ts";
import type { TowerPort, TowerSent } from "./types.ts";

export interface MockTowerOptions {
  /** Decision 0003 log. A failed sound is an error line. */
  log?: HostLogger;
}

export interface MockTower extends TowerPort {
  setBattery: (percent: number | "unavailable") => void;
  /** `null` is a tower that reports no firmware. The mock reports "mock" until a test says. */
  setFirmware: (version: string | null) => void;
  /** The next playSound fails once, as a tower that did not take the command. */
  failNextSound: () => void;
  /** Drops the link while keeping prior calibration readings (tower-lost pause). */
  loseConnection: () => void;
  onSnapshotChange: (listener: () => void) => () => void;
}

/**
 * In-memory tower for CI. It records connect, calibrate and sounds, and never a light cue.
 * Battery stays unavailable until a test sets a reading. Zero is a reading only when set.
 */
export const createMockTower = (options: MockTowerOptions = {}): MockTower => {
  let snapshot: TowerSnapshot = unavailableTower();
  const sent: TowerSent[] = [];
  let opened = false;
  let failSound = false;
  const snapshotListeners = new Set<() => void>();
  const notifySnapshot = () => {
    for (const listener of snapshotListeners) listener();
  };

  const report = (code: string, message: string) => {
    if (options.log) options.log.error(code, message);
    else console.error(`${code}: ${message}`);
  };

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
      notifySnapshot();
    },
    calibrate: () => {
      if (snapshot.connection !== "connected") return;
      sent.push({ type: "calibrate" });
      snapshot = { ...snapshot, calibrated: { state: "known", calibrated: true } };
      notifySnapshot();
    },
    playSound: async (soundIndex, volume) => {
      if (snapshot.connection !== "connected") {
        report(
          "tower-command-failed",
          `Sound ${soundIndex} at volume ${volume} was not sent because the tower is not connected.`,
        );
        return "failed";
      }
      if (failSound) {
        failSound = false;
        report("tower-command-failed", `Sound ${soundIndex} at volume ${volume} was not taken.`);
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
      notifySnapshot();
    },
    loseConnection: () => {
      snapshot = {
        ...snapshot,
        connection: "disconnected",
        calibrated: { state: "unavailable" },
      };
      notifySnapshot();
    },
    onSnapshotChange: (listener) => {
      snapshotListeners.add(listener);
      return () => snapshotListeners.delete(listener);
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
