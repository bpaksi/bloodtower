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
  /**
   * The next idle fails once, after the command is recorded. The tower did not take it.
   * A later idle is sent normally.
   */
  failNextIdle: () => void;
  /** The next connect fails once: the tower is not found. A later connect works. */
  failNextConnect: () => void;
  /** The next calibrate fails once. A later calibrate works. */
  failNextCalibrate: () => void;
  /** How many idle commands were dispatched while the link was up. */
  idleAttempts: () => number;
  /** `lighting.all-off`. Recorded as `{ type: "idle" }` once per dispatch. */
  idle: () => Promise<"written" | "failed">;
  /**
   * `lighting.sequence` (CU/15, the starting purse's light chase). Recorded as
   * `{ type: "sequence", sequence, soundIndex? }` once per dispatch; no raw bytes.
   */
  lightSequence: (sequence: string, soundIndex?: number) => Promise<"written" | "failed">;
  /**
   * `mechanics.rotate-drum` (DEC-716, C2-11). Recorded as `{ type: "rotate-drum", drumIndex, position }`
   * once per dispatch; no raw bytes.
   */
  rotateDrum: (drumIndex: number, position: number) => Promise<"written" | "failed">;
  /**
   * Fails a future `rotateDrum` call once. `atAttempt` is 1-based from now (default 1 = the very
   * next rotate; 2 = succeed the first rotate, fail the second, EV-06).
   */
  failNextRotate: (atAttempt?: number) => void;
  /** Drops the link while keeping prior calibration readings (tower-lost pause). */
  loseConnection: () => void;
  onSnapshotChange: (listener: () => void) => () => void;
}

/**
 * In-memory tower for CI. It records connect, calibrate, sounds, idle (`lighting.all-off` as
 * `{ type: "idle" }`) and light sequences (`lighting.sequence`, CU/15). It never records raw bytes.
 * Battery stays unavailable until a test sets a reading. Zero is a reading only when set.
 */
export const createMockTower = (options: MockTowerOptions = {}): MockTower => {
  let snapshot: TowerSnapshot = unavailableTower();
  const sent: TowerSent[] = [];
  let opened = false;
  let failSound = false;
  let failIdle = false;
  let failConnect = false;
  let failCalibrate = false;
  let failRotateCountdown = 0;
  let idleAttempts = 0;
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
      if (opened && snapshot.connection === "connected") return "written";
      if (failConnect) {
        failConnect = false;
        report("tower-command-failed", "The tower did not answer the connect.");
        return "failed";
      }
      opened = true;
      sent.push({ type: "connect" });
      snapshot = {
        ...snapshot,
        connection: "connected",
        calibrated: { state: "known", calibrated: false },
        firmware: { state: "known", version: "mock" },
      };
      notifySnapshot();
      return "written";
    },
    calibrate: () => {
      if (snapshot.connection !== "connected") return "failed";
      if (failCalibrate) {
        failCalibrate = false;
        report("tower-command-failed", "The tower did not answer the calibrate.");
        return "failed";
      }
      sent.push({ type: "calibrate" });
      snapshot = { ...snapshot, calibrated: { state: "known", calibrated: true } };
      notifySnapshot();
      return "written";
    },
    failNextConnect: () => {
      failConnect = true;
    },
    failNextCalibrate: () => {
      failCalibrate = true;
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
    idle: async () => {
      if (snapshot.connection !== "connected") return "failed";
      idleAttempts += 1;
      sent.push({ type: "idle" });
      if (failIdle) {
        failIdle = false;
        return "failed";
      }
      return "written";
    },
    lightSequence: async (sequence, soundIndex) => {
      if (snapshot.connection !== "connected") {
        report(
          "tower-command-failed",
          `Light sequence ${sequence} was not sent because the tower is not connected.`,
        );
        return "failed";
      }
      sent.push({
        type: "sequence",
        sequence,
        ...(soundIndex === undefined ? {} : { soundIndex }),
      });
      return "written";
    },
    rotateDrum: async (drumIndex, position) => {
      if (
        snapshot.connection !== "connected" ||
        snapshot.calibrated.state !== "known" ||
        !snapshot.calibrated.calibrated
      ) {
        return "failed";
      }
      sent.push({ type: "rotate-drum", drumIndex, position });
      if (failRotateCountdown > 0) {
        failRotateCountdown -= 1;
        if (failRotateCountdown === 0) return "failed";
      }
      return "written";
    },
    failNextRotate: (atAttempt = 1) => {
      failRotateCountdown = Math.max(1, Math.trunc(atAttempt));
    },
    failNextIdle: () => {
      failIdle = true;
    },
    idleAttempts: () => idleAttempts,
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
