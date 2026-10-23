import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockTower,
  DEFAULT_MOCK_TIMINGS,
  type MockTowerOptions,
} from "./adapters/mockTower.ts";
import type { ConnectionPayload } from "./protocols/index.ts";
import { CALIBRATION_LIMIT_MS, createTowerSession, SessionStateError } from "./session.ts";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const T = DEFAULT_MOCK_TIMINGS;
const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);

/** A session on one mock tower, with every status it reports recorded. */
const setup = (options?: MockTowerOptions) => {
  const mock = createMockTower(options);
  const createAdapter = vi.fn(() => mock.adapter);
  const session = createTowerSession({ createAdapter });
  const seen: ConnectionPayload[] = [];
  session.subscribe((status) => seen.push(status));
  const states = () => seen.map((status) => `${status.state}/${status.calibration}`);
  /** Adapter events from index `from` on, as "kind name-or-hex". */
  const events = (from = 0) =>
    session.events
      .events()
      .slice(from)
      .map((event) =>
        event.kind === "lifecycle" ? `${event.name}` : `${event.kind} ${event.hex}`,
      );
  return { mock, session, seen, states, events, createAdapter };
};

const connect = async (
  session: ReturnType<typeof setup>["session"],
  how: "connect" | "reconnect" = "connect",
) => {
  const done = session[how]();
  await advance(T.connectMs);
  await done;
};

const calibrate = async (session: ReturnType<typeof setup>["session"]) => {
  const done = session.calibrate();
  await advance(T.calibrationMs + T.echoMs);
  await done;
};

describe("tower session: connecting", () => {
  it("starts disconnected and uncalibrated, with no tower object", () => {
    const { session } = setup();
    expect(session.status()).toEqual({ state: "disconnected", calibration: "uncalibrated" });
    expect(session.tower()).toBeUndefined();
  });

  it("connects, reporting connecting then connected with the tower's device information", async () => {
    const { session, states } = setup();
    await connect(session);
    expect(states()).toEqual(["connecting/uncalibrated", "connected/uncalibrated"]);
    expect(session.status()).toEqual({
      state: "connected",
      calibration: "uncalibrated",
      device: {
        manufacturerName: "Mock tower",
        modelNumber: "ReturnToDarkTower",
        serialNumber: "MOCK-0000",
        hardwareRevision: "mock",
        firmwareRevision: "mock",
        softwareRevision: "mock",
      },
    });
  });

  it("turns the library's automatic re-send off as soon as the tower object exists (D21)", async () => {
    const { session } = setup();
    const done = session.connect();
    // Still connecting: the object is constructed and the adapter has not answered yet.
    expect(session.status().state).toBe("connecting");
    expect(session.tower()?.retrySendCommandMax).toBe(0);
    await advance(T.connectMs);
    await done;
    expect(session.tower()?.retrySendCommandMax).toBe(0);
  });

  it.each([
    ["not-found", "disconnected", "tower-not-found"],
    ["bluetooth-unavailable", "bluetooth-unavailable", "bluetooth-unavailable"],
  ] as const)(
    "reports a failed connect (%s) and lets go of the tower object",
    async (failConnect, state, code) => {
      const { session } = setup({ failConnect });
      await connect(session);
      expect(session.status()).toMatchObject({
        state,
        calibration: "uncalibrated",
        error: { code },
      });
      expect(session.status().error?.actionable).toBeTruthy();
      expect(session.tower()).toBeUndefined();
    },
  );

  it("reports any other connect failure as an error, and can connect again from it", async () => {
    const { session, mock } = setup();
    vi.spyOn(mock.adapter, "connect").mockRejectedValueOnce(new Error("GATT server refused"));
    await connect(session);
    expect(session.status()).toMatchObject({
      state: "error",
      calibration: "uncalibrated",
      error: { code: "connect-failed", message: expect.stringMatching(/GATT server refused/) },
    });
    expect(session.tower()).toBeUndefined();
    await connect(session);
    expect(session.status().state).toBe("connected");
    expect(session.status().error).toBeUndefined();
  });

  it("can connect again after a failed connect", async () => {
    const { session, createAdapter } = setup({ failConnect: "not-found" });
    await connect(session);
    await connect(session);
    expect(createAdapter).toHaveBeenCalledTimes(2);
    expect(session.status().state).toBe("disconnected");
  });

  it("refuses to connect while connecting or connected, and sends nothing", async () => {
    const { session, createAdapter } = setup();
    const done = session.connect();
    await expect(session.connect()).rejects.toBeInstanceOf(SessionStateError);
    await advance(T.connectMs);
    await done;
    await expect(session.connect()).rejects.toThrow(/connected/);
    await expect(session.reconnect()).rejects.toBeInstanceOf(SessionStateError);
    expect(createAdapter).toHaveBeenCalledTimes(1);
  });

  it("gives up a connect that a disconnect interrupts, and ends disconnected with no error", async () => {
    const { session, mock, states } = setup();
    const done = session.connect();
    await advance(T.connectMs / 2);
    await session.disconnect();
    await advance(T.connectMs);
    await done;
    expect(states()).toEqual([
      "connecting/uncalibrated",
      "disconnecting/uncalibrated",
      "disconnected/uncalibrated",
    ]);
    expect(session.status().error).toBeUndefined();
    expect(mock.adapter.isConnected()).toBe(false);
  });
});

describe("tower session: calibration", () => {
  it("is calibrating until the tower reports the end of calibration, then calibrated", async () => {
    const { session, states } = setup();
    await connect(session);
    const done = session.calibrate();
    expect(session.status().calibration).toBe("calibrating");
    await advance(T.calibrationMs - 10);
    expect(session.status().calibration).toBe("calibrating");
    await advance(10 + T.echoMs);
    await done;
    expect(session.status()).toMatchObject({ state: "connected", calibration: "calibrated" });
    expect(session.status().device?.serialNumber).toBe("MOCK-0000");
    expect(states().slice(-2)).toEqual(["connected/calibrating", "connected/calibrated"]);
  });

  it("refuses to calibrate when not connected or already calibrating", async () => {
    const { session } = setup();
    await expect(session.calibrate()).rejects.toBeInstanceOf(SessionStateError);
    await connect(session);
    const done = session.calibrate();
    await expect(session.calibrate()).rejects.toThrow(/already calibrating/);
    await advance(T.calibrationMs + T.echoMs);
    await done;
  });

  it("can calibrate again once calibrated", async () => {
    const { session } = setup();
    await connect(session);
    await calibrate(session);
    await calibrate(session);
    expect(session.status().calibration).toBe("calibrated");
  });
});

describe("tower session: calibration limit", () => {
  const LIMIT = CALIBRATION_LIMIT_MS;

  it("reports a calibration that does not end within the limit as failed, and sends nothing more", async () => {
    // A tower that takes twice the limit to finish.
    const { session, events } = setup({ timings: { calibrationMs: 2 * LIMIT } });
    await connect(session);
    const done = session.calibrate();
    await advance(LIMIT - 10);
    expect(session.status().calibration).toBe("calibrating");
    const from = session.events.events().length;
    await advance(10);
    await done;
    expect(session.status()).toMatchObject({
      state: "connected",
      calibration: "uncalibrated",
      error: { code: "calibration-failed", message: expect.stringMatching(/within 30 s/) },
    });
    expect(session.status().error?.actionable).toBeTruthy();
    expect(session.tower()?.performingCalibration).toBe(false);

    // The tower finishes late: the session stays uncalibrated, and nothing was sent meanwhile.
    await advance(LIMIT + T.echoMs);
    expect(session.status().calibration).toBe("uncalibrated");
    expect(events(from).filter((entry) => entry.startsWith("tx"))).toEqual([]);

    // A person can calibrate again; that one is limited and reported the same way.
    const again = session.calibrate();
    await advance(2 * LIMIT);
    await again.catch(() => {});
    expect(session.status().calibration).not.toBe("calibrating");
  });

  it("does not trip after a calibration that ended in time", async () => {
    const { session } = setup();
    await connect(session);
    await calibrate(session);
    await advance(2 * LIMIT);
    expect(session.status()).toMatchObject({ calibration: "calibrated" });
    expect(session.status().error).toBeUndefined();
  });

  it("reports a disconnect during calibration as a disconnect, not a failed calibration", async () => {
    const { session, mock } = setup();
    await connect(session);
    const done = session.calibrate();
    await advance(1_000);
    mock.dropConnection();
    await done.catch(() => {});
    await advance(2 * LIMIT);
    expect(session.status()).toMatchObject({
      state: "disconnected",
      calibration: "uncalibrated",
      error: { code: "unexpected-disconnect" },
    });
  });
});

describe("tower session: disconnecting", () => {
  it("disconnects when asked, resets calibration, and reports no fault (GAP-LIB-009)", async () => {
    const { session, states } = setup();
    await connect(session);
    await calibrate(session);
    const tower = session.tower();
    if (!tower) throw new Error("expected a tower object");
    const reported = vi.spyOn(tower, "onTowerDisconnect");
    await session.disconnect();
    expect(states().slice(-2)).toEqual(["disconnecting/uncalibrated", "disconnected/uncalibrated"]);
    // The library reports this disconnect as it would a lost link; the session reports it once,
    // without an error.
    expect(reported).toHaveBeenCalled();
    expect(session.status()).toEqual({ state: "disconnected", calibration: "uncalibrated" });
    expect(session.tower()).toBeUndefined();
  });

  it("refuses to disconnect when there is no connection", async () => {
    const { session } = setup();
    await expect(session.disconnect()).rejects.toBeInstanceOf(SessionStateError);
  });

  it("reports an unexpected disconnect, resets calibration, and does not reconnect (D10)", async () => {
    const { session, mock, events, createAdapter } = setup();
    await connect(session);
    await calibrate(session);
    mock.dropConnection();
    expect(session.status()).toMatchObject({
      state: "disconnected",
      calibration: "uncalibrated",
      error: { code: "unexpected-disconnect" },
    });
    expect(session.tower()).toBeUndefined();
    const before = session.events.events().length;
    await advance(120_000);
    expect(events(before).filter((name) => name.startsWith("connect"))).toEqual([]);
    expect(createAdapter).toHaveBeenCalledTimes(1);
    expect(session.status().state).toBe("disconnected");
  });

  it("reconnects when asked after an unexpected disconnect, uncalibrated", async () => {
    const { session, mock } = setup();
    await connect(session);
    await calibrate(session);
    mock.dropConnection();
    await connect(session, "reconnect");
    expect(session.status()).toMatchObject({ state: "connected", calibration: "uncalibrated" });
    expect(session.status().error).toBeUndefined();
  });

  it("uses a new tower object for each connection", async () => {
    const { session, createAdapter } = setup();
    await connect(session);
    const first = session.tower();
    await session.disconnect();
    await connect(session);
    expect(session.tower()).not.toBe(first);
    expect(createAdapter).toHaveBeenCalledTimes(2);
  });
});

describe("tower session: no stale drum positions after a reconnect (GAP-HW-006)", () => {
  const firstStatefulWrite = (hexes: string[]) => {
    const write = hexes.find((entry) => entry.startsWith("tx 00") && entry.length === 3 + 40);
    if (!write) throw new Error("no stateful write was seen");
    // Bytes 1 and 2 of a state packet are the drums.
    return write.slice(3 + 2, 3 + 6);
  };

  it("sends the calibrated drum positions while the connection lasts", async () => {
    const { session, events } = setup();
    await connect(session);
    await calibrate(session);
    const from = session.events.events().length;
    const sending = session.tower()?.playSoundStateful(1);
    await advance(T.echoMs);
    await sending;
    expect(firstStatefulWrite(events(from))).toBe("1042");
  });

  it.each(["disconnect", "dropConnection"] as const)(
    "sends none of them in the first stateful packet after a %s and reconnect",
    async (how) => {
      const { session, mock, events } = setup();
      await connect(session);
      await calibrate(session);
      expect(session.tower()?.isCalibrated).toBe(true);
      if (how === "disconnect") await session.disconnect();
      else mock.dropConnection();
      await connect(session, how === "disconnect" ? "connect" : "reconnect");
      expect(session.tower()?.isCalibrated).toBe(false);
      const from = session.events.events().length;
      const sending = session.tower()?.playSoundStateful(1);
      await advance(T.echoMs);
      await sending;
      expect(firstStatefulWrite(events(from))).toBe("0000");
    },
  );
});

describe("tower session: library warnings", () => {
  it("records the battery heartbeat warning and stays connected (GAP-LIB-008)", async () => {
    // Battery every 10 s: the library expects one at least every 3 s.
    const { session, events } = setup({ timings: { batteryMs: 10_000 } });
    await connect(session);
    await advance(30_000);
    expect(events().some((name) => name === "library-warn")).toBe(true);
    const warnings = session.events
      .events()
      .filter((event) => event.kind === "lifecycle" && event.name === "library-warn")
      .map((event) => (event.kind === "lifecycle" ? event.detail : ""));
    expect(warnings.some((text) => /heartbeat/i.test(text ?? ""))).toBe(true);
    expect(session.status()).toMatchObject({ state: "connected" });
    expect(session.status().error).toBeUndefined();
  });

  it("keeps the library's info messages, which name the tower, out of the event list", async () => {
    const { session } = setup();
    await connect(session);
    const libraryEvents = session.events
      .events()
      .filter((event) => event.kind === "lifecycle" && event.name.startsWith("library-"));
    expect(libraryEvents).toEqual([]);
  });
});

describe("tower session: closing", () => {
  it("disconnects, stops reporting, and refuses further actions", async () => {
    const { session, mock, seen } = setup();
    await connect(session);
    const count = seen.length;
    await session.close();
    expect(mock.adapter.isConnected()).toBe(false);
    expect(seen.length).toBe(count);
    await expect(session.connect()).rejects.toThrow(/closed/);
  });

  it("refuses a second session in one process", async () => {
    const prev = process.env.VITEST;
    process.env.VITEST = "";
    try {
      const mock = createMockTower();
      const first = createTowerSession({ createAdapter: () => mock.adapter });
      expect(() => createTowerSession({ createAdapter: () => mock.adapter })).toThrow(
        expect.objectContaining({
          code: "tower-session-already-open",
          name: "TowerSessionAlreadyOpenError",
        }),
      );
      await first.close();
      const second = createTowerSession({ createAdapter: () => mock.adapter });
      await second.close();
    } finally {
      process.env.VITEST = prev;
    }
  });
});
