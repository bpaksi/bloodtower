// The tower connection and its calibration, as one state machine (spec §3.2, D9, D10, D21).
//
// Every connection gets its own adapter and its own library object, and both are cleaned up when
// the connection ends. The library keeps the tower's last state (drum positions included) in a
// private field that a disconnect does not clear, and it builds every stateful packet from that
// field. A tower switched off and on comes back uncalibrated, so a packet built from the old state
// would send it drum positions from before (GAP-HW-006). A fresh object starts from the library's
// default state, which carries none.
//
// Nothing here acts on its own: no reconnect, no retry, no calibration. Each physical action is
// one of the four calls below, made because a person asked.
import type {
  CalibrationState,
  ConnectionPayload,
  ConnectionState,
  Device,
} from "tower-poc-protocols";
import {
  BluetoothDeviceNotFoundError,
  type DeviceInformation,
  type IBluetoothAdapter,
  type LogOutput,
  UltimateDarkTower,
} from "ultimatedarktower";
import {
  type AdapterEventList,
  createAdapterEventList,
  instrumentAdapter,
} from "./adapters/instrumented.ts";

export type SessionAction = "connect" | "reconnect" | "disconnect" | "calibrate";

/** An action the session cannot take in its current state. Nothing was sent to the tower. */
export class SessionStateError extends Error {
  readonly action: SessionAction;
  readonly status: ConnectionPayload;

  constructor(action: SessionAction, status: ConnectionPayload, reason: string) {
    super(reason);
    this.name = "SessionStateError";
    this.action = action;
    this.status = status;
  }
}

export interface TowerSessionOptions {
  /** Called once per connection attempt. The adapter is cleaned up when that connection ends. */
  createAdapter: () => IBluetoothAdapter;
  /** Receives every adapter event and the library's warnings and errors. */
  events?: AdapterEventList;
}

/**
 * How long calibration may take. This is the library's own command timeout, which it applies to
 * calibration too and which cannot be changed through its public API: past it, `calibrate()`
 * rejects and the library stops waiting. The real tower took 20.6 s and 22.4 s in the M1 spike.
 */
export const CALIBRATION_LIMIT_MS = 30_000;

export interface TowerSession {
  status: () => ConnectionPayload;
  /** Calls `listener` with every new status. Returns a function that stops it. */
  subscribe: (listener: (status: ConnectionPayload) => void) => () => void;
  /** Resolves once the attempt has ended; how it ended is in `status()`. */
  connect: () => Promise<void>;
  /** The same as `connect`, offered after an unexpected disconnect (D10). */
  reconnect: () => Promise<void>;
  /** Also gives up a connect that is still in progress. */
  disconnect: () => Promise<void>;
  /** Resolves once the command is sent. Calibration ends later, reported in `status()`. */
  calibrate: () => Promise<void>;
  /** The library object of the current connection, from the moment it is constructed. */
  tower: () => UltimateDarkTower | undefined;
  events: AdapterEventList;
  /** Ends any connection and stops reporting. For shutting the service down. */
  close: () => Promise<void>;
}

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));
const limit = (text: string) => (text.length > 500 ? `${text.slice(0, 499)}…` : text);

/** A field the tower did not report, or reported empty, is null (spec §3.2). */
const toDevice = (info: DeviceInformation): Device => {
  const field = (value: string | undefined) => (value ? value.slice(0, 200) : null);
  return {
    manufacturerName: field(info.manufacturerName),
    modelNumber: field(info.modelNumber),
    serialNumber: field(info.serialNumber),
    hardwareRevision: field(info.hardwareRevision),
    firmwareRevision: field(info.firmwareRevision),
    softwareRevision: field(info.softwareRevision),
  };
};

const NOT_CONNECTED: ConnectionPayload = { state: "disconnected", calibration: "uncalibrated" };

/** Where a failed connect leaves the session, and what to tell the person (spec §6). */
const connectFailure = (error: unknown): ConnectionPayload => {
  if (error instanceof BluetoothDeviceNotFoundError) {
    return {
      ...NOT_CONNECTED,
      error: {
        code: "tower-not-found",
        message: "No tower was found.",
        actionable: "Switch the tower on, keep it near the Mac, and press Connect again.",
      },
    };
  }
  // noble's adapter says this when Bluetooth is off or the process may not use it.
  if (/adapter not ready|powered on/i.test(describe(error))) {
    return {
      state: "bluetooth-unavailable",
      calibration: "uncalibrated",
      error: {
        code: "bluetooth-unavailable",
        message: "Bluetooth is not available to the tower service.",
        actionable:
          "Turn Bluetooth on, and allow it for Terminal or Node in System Settings → Privacy & Security → Bluetooth.",
      },
    };
  }
  return {
    state: "error",
    calibration: "uncalibrated",
    error: { code: "connect-failed", message: limit(`Could not connect: ${describe(error)}`) },
  };
};

const CAN_CONNECT: readonly ConnectionState[] = ["disconnected", "error", "bluetooth-unavailable"];

export const createTowerSession = (options: TowerSessionOptions): TowerSession => {
  const events = options.events ?? createAdapterEventList();
  const listeners = new Set<(status: ConnectionPayload) => void>();
  let status = NOT_CONNECTED;
  let current: UltimateDarkTower | undefined;
  // Goes up whenever a connection ends or is given up. A callback or a connect that belongs to an
  // older number is about a connection the session has already let go, and is ignored. This is how
  // the session tells a disconnect it asked for from one it did not (GAP-LIB-009): asking moves the
  // number on before the library reports anything.
  let generation = 0;
  let closed = false;

  const set = (next: ConnectionPayload) => {
    if (closed) return;
    status = next;
    for (const listener of listeners) listener(status);
  };

  const connected = (calibration: CalibrationState, extra: Partial<ConnectionPayload> = {}) =>
    set({
      state: "connected",
      calibration,
      ...(status.device ? { device: status.device } : {}),
      ...extra,
    });

  // The library logs the tower's serial number at info level and its console output would go to
  // the service's terminal. Only warnings and errors are kept, in the event list. Its battery
  // heartbeat warning lands here and is not taken as a lost connection (GAP-LIB-008): the library
  // checks the link itself and reports a real loss through `onTowerDisconnect`.
  const libraryLog: LogOutput = {
    write: (level, message) => {
      if (level === "warn" || level === "error") {
        events.emit({ kind: "lifecycle", name: `library-${level}`, detail: message });
      }
    },
  };

  // Cleanups still running. A new connection waits for them, so that an old object's cleanup
  // cannot reach the Bluetooth stack (or the one mock tower) while the next connect is under way.
  let releasing: Promise<void> = Promise.resolve();
  const release = (tower: UltimateDarkTower) => {
    releasing = releasing.then(async () => {
      try {
        await tower.cleanup();
      } catch (error) {
        events.emit({ kind: "lifecycle", name: "session-cleanup:error", detail: describe(error) });
      }
    });
    return releasing;
  };

  /** Ends the current connection as lost. */
  const endAsLost = () => {
    generation += 1;
    const tower = current;
    current = undefined;
    // Calibration resets with the connection (D10). Nothing reconnects.
    set({
      ...NOT_CONNECTED,
      error: {
        code: "unexpected-disconnect",
        message: "The tower disconnected without being asked to.",
        actionable: "Check that the tower is on and in range, then press Reconnect.",
      },
    });
    if (tower) void release(tower);
  };

  /** A lost link reported by the library, if it is about the current connection. */
  const lost = (owner: number) => {
    if (owner === generation && status.state === "connected") endAsLost();
  };

  const build = (owner: number) => {
    const tower = new UltimateDarkTower({
      adapter: instrumentAdapter(options.createAdapter(), events.emit),
    });
    // D21: the library would otherwise re-send a failed write up to five times.
    tower.retrySendCommandMax = 0;
    tower.setLoggerOutputs([libraryLog]);
    // The library can call this twice for one disconnect (once from the adapter, once from its own
    // disconnect); `lost` acts on the first only.
    tower.onTowerDisconnect = () => lost(owner);
    tower.onCalibrationComplete = () => {
      if (owner === generation && status.state === "connected") connected("calibrated");
    };
    return tower;
  };

  const refuse = (action: SessionAction, reason: string): never => {
    throw new SessionStateError(action, status, reason);
  };

  const open = async (action: "connect" | "reconnect") => {
    if (closed) refuse(action, "The session is closed.");
    if (!CAN_CONNECT.includes(status.state)) {
      refuse(action, `The tower is ${status.state}; ${action} needs it disconnected.`);
    }
    generation += 1;
    const owner = generation;
    const tower = build(owner);
    current = tower;
    set({ state: "connecting", calibration: "uncalibrated" });
    await releasing;
    // A disconnect or close during the wait has given this attempt up and reported it.
    if (owner !== generation) return;
    try {
      await tower.connect();
    } catch (error) {
      // A disconnect or close gave this attempt up; it has already reported.
      if (owner !== generation) return;
      generation += 1;
      current = undefined;
      set(connectFailure(error));
      await release(tower);
      return;
    }
    if (owner !== generation) return;
    if (!tower.isConnected) {
      // The link went between the adapter connecting and the library finishing.
      endAsLost();
      return;
    }
    set({
      state: "connected",
      calibration: "uncalibrated",
      device: toDevice(tower.getDeviceInformation()),
    });
  };

  const disconnect = async () => {
    if (status.state !== "connected" && status.state !== "connecting") {
      refuse("disconnect", `The tower is ${status.state}; there is nothing to disconnect.`);
    }
    generation += 1;
    const owner = generation;
    const tower = current;
    current = undefined;
    set({ state: "disconnecting", calibration: "uncalibrated" });
    if (tower) {
      try {
        if (tower.isConnected) await tower.disconnect();
      } catch (error) {
        events.emit({
          kind: "lifecycle",
          name: "session-disconnect:error",
          detail: describe(error),
        });
      }
      // Also ends a connect still in progress: the adapter gives it up.
      await release(tower);
    }
    if (owner === generation) set(NOT_CONNECTED);
  };

  const calibrate = async () => {
    const tower = current;
    if (status.state !== "connected" || !tower) {
      return refuse("calibrate", `The tower is ${status.state}; calibration needs it connected.`);
    }
    if (status.calibration === "calibrating") {
      return refuse("calibrate", "The tower is already calibrating.");
    }
    const owner = generation;
    connected("calibrating");
    try {
      // Settles when the tower sends the state that ends calibration: the library does not count
      // the tower's unprompted sensor messages as an answer. The status changes through
      // `onCalibrationComplete`, which comes first.
      await tower.calibrate();
    } catch (error) {
      // Read again: the status may have moved on while the command was being sent.
      const now: ConnectionPayload = status;
      if (owner !== generation || now.calibration !== "calibrating") return;
      // Nothing is sent again. If the tower finishes after this, the library no longer reports
      // it as the end of calibration, so the status stays uncalibrated: the cautious side (D9).
      const timedOut = /timeout/i.test(describe(error));
      connected("uncalibrated", {
        error: timedOut
          ? {
              code: "calibration-failed",
              message: `The tower did not report the end of calibration within ${CALIBRATION_LIMIT_MS / 1000} s.`,
              actionable: "Check that the drums can turn freely, then press Calibrate again.",
            }
          : {
              code: "calibration-failed",
              message: limit(`Calibration could not be started: ${describe(error)}`),
            },
      });
    }
  };

  return {
    status: () => status,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    connect: () => open("connect"),
    reconnect: () => open("reconnect"),
    disconnect,
    calibrate,
    tower: () => current,
    events,
    close: async () => {
      if (closed) return;
      generation += 1;
      const tower = current;
      current = undefined;
      status = NOT_CONNECTED;
      closed = true;
      listeners.clear();
      if (tower) {
        try {
          if (tower.isConnected) await tower.disconnect();
        } catch (error) {
          events.emit({ kind: "lifecycle", name: "session-close:error", detail: describe(error) });
        }
        await release(tower);
      }
    },
  };
};
