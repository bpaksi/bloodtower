import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockTower } from "./adapters/mockTower.ts";
import { inventory, type PendingRestore, RECORD_KEYS } from "./protocols/index.ts";
import { createTowerSession } from "./session.ts";
import {
  createStateStore,
  feedStateStore,
  NoPendingRestoreError,
  READING_KEYS,
  type RecordStorage,
  type SnapshotStorage,
  STATE_KEYS,
  type StateStoreOptions,
} from "./stateStore.ts";
import { createTowerRecords } from "./towerRecords.ts";

/** A store that keeps the battery only, as the snapshot tests need nothing else. */
const batteryStore = (options: StateStoreOptions = {}) =>
  createStateStore({ keys: ["battery.level"], ...options });

/** Record storage in memory. */
const memoryRecords = (initial: Record<string, { value: unknown; updatedAt: number }> = {}) => {
  const saved = new Map(Object.entries(initial));
  const storage: RecordStorage = {
    load: (key) => saved.get(key),
    save: (key, value, updatedAt) => {
      saved.set(key, { value, updatedAt });
    },
  };
  return { storage, saved };
};

/** Storage in memory that records every save. */
const memoryStorage = (initial?: PendingRestore) => {
  let saved = initial;
  const saves: PendingRestore[] = [];
  const storage: SnapshotStorage = {
    load: () => saved,
    save: (next) => {
      saves.push(next);
      saved = Object.keys(next.snapshot).length > 0 ? next : undefined;
    },
  };
  return { storage, saves, saved: () => saved };
};

const reading = { millivolts: 4_100, percent: 60 };
const savedBattery: PendingRestore = {
  savedAt: 1_000,
  snapshot: {
    "battery.level": {
      freshness: "current",
      value: reading,
      origin: "device-reported",
      updatedAt: 900,
    },
  },
};

describe("STATE_KEYS", () => {
  it("names only inventory properties and queries, and the battery history", () => {
    for (const key of STATE_KEYS) {
      const entry = inventory.find((capability) => capability.id === key);
      // The history is of the battery event's readings, so it is kept under the event's id.
      expect(entry?.kind, key).toMatch(
        key === "battery.on-level" ? /^event$/ : /^(property|query)$/,
      );
    }
  });

  it("splits into readings and the service's own record", () => {
    expect([...READING_KEYS, ...RECORD_KEYS].sort()).toEqual([...STATE_KEYS].sort());
    expect([...RECORD_KEYS].sort()).toEqual(["seals.broken", "skulls.count"]);
  });
});

describe("state store", () => {
  it("starts with every value unavailable, never zero", () => {
    expect(createStateStore({ now: () => 3 }).snapshot()).toEqual({
      "battery.level": { freshness: "unavailable", origin: "unknown" },
      "battery.on-level": { freshness: "unavailable", origin: "unknown" },
      "mechanics.drum-position": { freshness: "unavailable", origin: "unknown" },
      "glyphs.all-positions": { freshness: "unavailable", origin: "unknown" },
      // The service's own record is never unknown: on a first run nothing is broken and no skull
      // has been counted, from the moment it started.
      "seals.broken": {
        freshness: "current",
        value: [],
        origin: "application-maintained",
        updatedAt: 3,
      },
      "skulls.count": {
        freshness: "current",
        value: { count: 0, since: 3 },
        origin: "application-maintained",
        updatedAt: 3,
      },
    });
  });

  it("records a reading as current with its origin and time, and saves it", () => {
    const memory = memoryStorage();
    const store = batteryStore({ storage: memory.storage, now: () => 5_000 });
    store.set("battery.level", reading, "device-reported");
    const value = {
      freshness: "current",
      value: reading,
      origin: "device-reported",
      updatedAt: 5_000,
    };
    expect(store.snapshot()).toEqual({ "battery.level": value });
    expect(memory.saved()).toEqual({ savedAt: 5_000, snapshot: { "battery.level": value } });
  });

  it("makes current values stale, keeping their value, origin and time", () => {
    const listener = vi.fn();
    const store = batteryStore({ now: () => 5_000 });
    store.set("battery.level", reading, "device-reported");
    store.subscribe(listener);
    store.markStale();
    expect(store.snapshot()["battery.level"]).toEqual({
      freshness: "stale",
      value: reading,
      origin: "device-reported",
      updatedAt: 5_000,
    });
    expect(listener).toHaveBeenCalledTimes(1);
    // Nothing current is left, so a second call changes nothing and tells nobody.
    store.markStale();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("refuses a key it does not keep, a record as a reading, and a value off its schema", () => {
    const store = batteryStore();
    expect(() =>
      store.set(
        "mechanics.drum-position",
        { top: "north", middle: "north", bottom: "north" },
        "library-derived",
      ),
    ).toThrow(/not a reading/);
    expect(() =>
      // @ts-expect-error: the record is not a reading
      createStateStore().set("skulls.count", { count: 3, since: 1 }, "library-derived"),
    ).toThrow(/not a reading/);
    // @ts-expect-error: not the battery's shape
    expect(() => store.set("battery.level", { millivolts: -1 }, "device-reported")).toThrow(
      /schema/,
    );
    expect(() => store.setRecord("seals.broken", [])).toThrow(/not a record/);
  });

  it("opens no prompt when nothing is saved, or nothing saved has a value it keeps", () => {
    expect(batteryStore({ storage: memoryStorage().storage }).pendingRestore()).toBeUndefined();
    const unusable = memoryStorage({
      savedAt: 1,
      snapshot: {
        "battery.level": { freshness: "unavailable", origin: "unknown" },
        "skulls.count": { freshness: "stale", value: 3, origin: "library-derived", updatedAt: 1 },
      },
    });
    expect(batteryStore({ storage: unusable.storage }).pendingRestore()).toBeUndefined();
    // The record is never offered, even by a store that keeps it, and nor is a value off its schema.
    const offRecord = memoryStorage({
      savedAt: 1,
      snapshot: {
        "skulls.count": {
          freshness: "current",
          value: { count: 3, since: 1 },
          origin: "application-maintained",
          updatedAt: 1,
        },
        "battery.level": {
          freshness: "current",
          value: { volts: 4 },
          origin: "device-reported",
          updatedAt: 1,
        },
      },
    });
    expect(createStateStore({ storage: offRecord.storage }).pendingRestore()).toBeUndefined();
  });

  it("restores a saved value as application-maintained and stale, and closes the prompt", () => {
    const memory = memoryStorage(savedBattery);
    const store = batteryStore({ storage: memory.storage, now: () => 7_000 });
    // Saved as current, offered as stale: it is from before the restart.
    expect(store.pendingRestore()).toEqual({
      savedAt: 1_000,
      snapshot: {
        "battery.level": {
          freshness: "stale",
          value: reading,
          origin: "device-reported",
          updatedAt: 900,
        },
      },
    });
    const listener = vi.fn();
    store.subscribe(listener);

    store.answerRestore(true);
    const restored = {
      freshness: "stale",
      value: reading,
      origin: "application-maintained",
      updatedAt: 900,
    };
    expect(store.snapshot()).toEqual({ "battery.level": restored });
    expect(store.pendingRestore()).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(1);
    // The restored state is saved again, so the next start offers it once more.
    expect(memory.saved()).toEqual({ savedAt: 7_000, snapshot: { "battery.level": restored } });
    expect(() => store.answerRestore(true)).toThrow(NoPendingRestoreError);
  });

  it("keeps a value read since the start over the saved one", () => {
    const store = batteryStore({ storage: memoryStorage(savedBattery).storage, now: () => 8 });
    store.set("battery.level", { millivolts: 4_800, percent: 95 }, "device-reported");
    store.answerRestore(true);
    expect(store.snapshot()["battery.level"]).toEqual({
      freshness: "current",
      value: { millivolts: 4_800, percent: 95 },
      origin: "device-reported",
      updatedAt: 8,
    });
  });

  it("keeps the saved snapshot while the prompt is open, then replaces it on a no", () => {
    const memory = memoryStorage(savedBattery);
    const store = batteryStore({ storage: memory.storage });
    store.set("battery.level", reading, "device-reported");
    store.markStale();
    // A restart now would still offer the earlier run's state.
    expect(memory.saves).toEqual([]);
    expect(memory.saved()).toEqual(savedBattery);

    store.answerRestore(false);
    expect(store.snapshot()["battery.level"]).toMatchObject({ origin: "device-reported" });
    expect(memory.saves).toHaveLength(1);
  });

  it("removes the saved snapshot on a no when it has no values of its own", () => {
    const memory = memoryStorage(savedBattery);
    const store = batteryStore({ storage: memory.storage });
    store.answerRestore(false);
    expect(store.snapshot()["battery.level"]).toEqual({
      freshness: "unavailable",
      origin: "unknown",
    });
    expect(memory.saved()).toBeUndefined();
  });

  it("reports a failing save once, keeps the values, and reports again after a recovery", () => {
    const onSaveError = vi.fn();
    let failing = true;
    const store = batteryStore({
      storage: {
        load: () => undefined,
        save: () => {
          if (failing) throw new Error("disk full");
        },
      },
      onSaveError,
    });
    store.set("battery.level", reading, "device-reported");
    store.set("battery.level", reading, "device-reported");
    expect(onSaveError).toHaveBeenCalledTimes(1);
    expect(store.snapshot()["battery.level"]).toMatchObject({ freshness: "current" });
    failing = false;
    store.set("battery.level", reading, "device-reported");
    failing = true;
    store.set("battery.level", reading, "device-reported");
    expect(onSaveError).toHaveBeenCalledTimes(2);
  });
});

describe("state store: the service's own record (spec D24)", () => {
  it("saves a fresh record at once on a first run, so its start time lasts", () => {
    const records = memoryRecords();
    createStateStore({ records: records.storage, now: () => 50 });
    expect(Object.fromEntries(records.saved)).toEqual({
      "seals.broken": { value: [], updatedAt: 50 },
      "skulls.count": { value: { count: 0, since: 50 }, updatedAt: 50 },
    });
  });

  it("loads the saved record with no prompt, as current", () => {
    const seal = { side: "west", level: "bottom" } as const;
    const records = memoryRecords({
      "seals.broken": { value: [seal], updatedAt: 10 },
      "skulls.count": { value: { count: 2, since: 5 }, updatedAt: 20 },
    });
    const store = createStateStore({ records: records.storage, now: () => 99 });
    expect(store.pendingRestore()).toBeUndefined();
    expect(store.record("seals.broken")).toEqual([seal]);
    expect(store.snapshot()["skulls.count"]).toEqual({
      freshness: "current",
      value: { count: 2, since: 5 },
      origin: "application-maintained",
      updatedAt: 20,
    });
  });

  it("starts afresh from a saved record it cannot use, and says so", () => {
    const onRecordUnreadable = vi.fn();
    const records = memoryRecords({
      // Out of order, so not a record the service wrote.
      "seals.broken": {
        value: [
          { side: "north", level: "middle" },
          { side: "north", level: "top" },
        ],
        updatedAt: 10,
      },
    });
    const store = createStateStore({ records: records.storage, now: () => 7, onRecordUnreadable });
    expect(store.record("seals.broken")).toEqual([]);
    expect(onRecordUnreadable).toHaveBeenCalledWith(
      "seals.broken",
      expect.stringMatching(/protocol/),
    );
    const unreadable: RecordStorage = {
      load: () => ({ unreadable: "it is not valid JSON." }),
      save: () => {},
    };
    createStateStore({ records: unreadable, onRecordUnreadable });
    expect(onRecordUnreadable).toHaveBeenCalledWith("skulls.count", "it is not valid JSON.");
  });

  it("is never made stale, and is not in the snapshot the restore prompt offers", () => {
    const memory = memoryStorage();
    const store = createStateStore({ storage: memory.storage, now: () => 1 });
    store.set("battery.level", reading, "device-reported");
    store.markStale();
    expect(store.snapshot()["seals.broken"]?.freshness).toBe("current");
    expect(store.snapshot()["skulls.count"]?.freshness).toBe("current");
    expect(Object.keys(memory.saved()?.snapshot ?? {})).toEqual(["battery.level"]);
  });

  it("saves each change and tells every listener", () => {
    const records = memoryRecords();
    let time = 1;
    const store = createStateStore({ records: records.storage, now: () => time });
    const towerRecords = createTowerRecords(store, () => time);
    const listener = vi.fn();
    store.subscribe(listener);
    time = 2;
    towerRecords.markSeal({ side: "south", level: "top" }, true);
    towerRecords.addSkullDrops(2);
    towerRecords.addSkullDrops(1);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(records.saved.get("seals.broken")).toEqual({
      value: [{ side: "south", level: "top" }],
      updatedAt: 2,
    });
    expect(records.saved.get("skulls.count")).toEqual({
      value: { count: 3, since: 1 },
      updatedAt: 2,
    });
    time = 3;
    towerRecords.resetSkulls();
    towerRecords.resetSeals();
    expect(store.record("skulls.count")).toEqual({ count: 0, since: 3 });
    expect(store.record("seals.broken")).toEqual([]);
    // A seal marked as it already is changes nothing.
    towerRecords.markSeal({ side: "south", level: "top" }, false);
    expect(listener).toHaveBeenCalledTimes(5);
  });

  it("keeps the values in memory and reports a failing save", () => {
    const onSaveError = vi.fn();
    const store = createStateStore({
      records: {
        load: () => undefined,
        save: () => {
          throw new Error("disk full");
        },
      },
      onSaveError,
    });
    expect(onSaveError).toHaveBeenCalledTimes(2);
    createTowerRecords(store).markSeal({ side: "east", level: "top" }, true);
    expect(store.record("seals.broken")).toEqual([{ side: "east", level: "top" }]);
    expect(onSaveError).toHaveBeenCalledTimes(3);
  });
});

describe("feedStateStore", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const finishConnect = async (session: ReturnType<typeof createTowerSession>) => {
    const connecting = session.connect();
    await vi.advanceTimersByTimeAsync(100);
    await connecting;
  };
  const finishDisconnect = async (session: ReturnType<typeof createTowerSession>) => {
    const disconnecting = session.disconnect();
    await vi.advanceTimersByTimeAsync(100);
    await disconnecting;
  };

  it("records battery readings while connected, and makes them stale when the connection ends", async () => {
    vi.useFakeTimers();
    const mock = createMockTower({ timings: { connectMs: 20 }, batteryMillivolts: 4_400 });
    const session = createTowerSession({ createAdapter: () => mock.adapter });
    const store = createStateStore();
    const { stop } = feedStateStore(session, store);
    try {
      const connecting = session.connect();
      await vi.advanceTimersByTimeAsync(100);
      await connecting;
      expect(store.snapshot()["battery.level"]?.freshness).toBe("unavailable");

      await vi.advanceTimersByTimeAsync(2_000);
      const value = store.snapshot()["battery.level"];
      expect(value).toMatchObject({ freshness: "current", origin: "device-reported" });
      expect(value && "value" in value ? value.value : undefined).toEqual({
        millivolts: 4_400,
        percent: session.tower()?.currentBatteryPercent,
      });

      const disconnecting = session.disconnect();
      await vi.advanceTimersByTimeAsync(100);
      await disconnecting;
      expect(store.snapshot()["battery.level"]).toMatchObject({
        freshness: "stale",
        origin: "device-reported",
      });
    } finally {
      stop();
      await session.close();
    }
  });

  it("stops feeding the store when asked", async () => {
    vi.useFakeTimers();
    const mock = createMockTower({ timings: { connectMs: 20 } });
    const session = createTowerSession({ createAdapter: () => mock.adapter });
    const store = createStateStore();
    feedStateStore(session, store).stop();
    try {
      const connecting = session.connect();
      await vi.advanceTimersByTimeAsync(3_000);
      await connecting;
      expect(store.snapshot()["battery.level"]?.freshness).toBe("unavailable");
    } finally {
      await session.close();
    }
  });

  it("keeps a battery history of one reading per interval, carried across connections", async () => {
    vi.useFakeTimers();
    const mock = createMockTower({ timings: { connectMs: 20 }, batteryMillivolts: 4_400 });
    const session = createTowerSession({ createAdapter: () => mock.adapter });
    const store = createStateStore();
    const { stop } = feedStateStore(session, store, { historyIntervalMs: 10_000, historyLimit: 3 });
    const history = () => {
      const value = store.snapshot()["battery.on-level"];
      return value && "value" in value ? (value.value as { at: number }[]) : [];
    };
    try {
      await finishConnect(session);
      await vi.advanceTimersByTimeAsync(2_500);
      expect(history()).toHaveLength(1);
      expect(store.snapshot()["battery.on-level"]).toMatchObject({
        freshness: "current",
        origin: "device-reported",
      });
      await vi.advanceTimersByTimeAsync(8_000);
      expect(history()).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(4_000);
      expect(history()).toHaveLength(2);
      await vi.advanceTimersByTimeAsync(30_000);
      // The oldest readings go once the limit is reached.
      expect(history()).toHaveLength(3);

      await finishDisconnect(session);
      expect(store.snapshot()["battery.on-level"]?.freshness).toBe("stale");
      const before = history();
      await finishConnect(session);
      await vi.advanceTimersByTimeAsync(2_500);
      // The first reading of a connection is always kept, after the earlier ones.
      expect(history()).toEqual([
        ...before.slice(1),
        expect.objectContaining({ millivolts: 4_400 }),
      ]);
    } finally {
      stop();
      await session.close();
    }
  });

  it("publishes the drums and glyphs only while the tower is calibrated, from the library", async () => {
    vi.useFakeTimers();
    const mock = createMockTower({ timings: { connectMs: 20 } });
    const session = createTowerSession({ createAdapter: () => mock.adapter });
    const store = createStateStore();
    const feed = feedStateStore(session, store);
    try {
      await finishConnect(session);
      expect(store.snapshot()["mechanics.drum-position"]?.freshness).toBe("unavailable");
      expect(store.snapshot()["glyphs.all-positions"]?.freshness).toBe("unavailable");

      const calibrating = session.calibrate();
      await vi.advanceTimersByTimeAsync(30_000);
      await calibrating;
      expect(session.status().calibration).toBe("calibrated");
      expect(store.snapshot()["mechanics.drum-position"]).toMatchObject({
        freshness: "current",
        origin: "library-derived",
        value: { top: "north", middle: "north", bottom: "north" },
      });
      const glyphs = store.snapshot()["glyphs.all-positions"];
      expect(glyphs).toMatchObject({ freshness: "current", origin: "library-derived" });
      expect(glyphs && "value" in glyphs ? glyphs.value : undefined).toEqual(
        session.tower()?.getAllGlyphPositions(),
      );

      // A rotation the library sent: the feed is refreshed as the command ends.
      const rotating = session.tower()?.rotateWithState("east", "north", "north");
      await vi.advanceTimersByTimeAsync(3_000);
      await rotating;
      feed.refresh();
      expect(store.snapshot()["mechanics.drum-position"]).toMatchObject({
        value: { top: "east", middle: "north", bottom: "north" },
      });
      expect(glyphs && "value" in glyphs ? glyphs.value : undefined).not.toEqual(
        (store.snapshot()["glyphs.all-positions"] as { value: unknown }).value,
      );

      await finishDisconnect(session);
      expect(store.snapshot()["mechanics.drum-position"]?.freshness).toBe("stale");
      // A new connection is uncalibrated: the old positions stay stale, never refreshed.
      await finishConnect(session);
      feed.refresh();
      expect(store.snapshot()["mechanics.drum-position"]?.freshness).toBe("stale");
    } finally {
      feed.stop();
      await session.close();
    }
  });

  it("counts skull drops into the service's record from the first report of each connection", async () => {
    vi.useFakeTimers();
    const mock = createMockTower({ timings: { connectMs: 20 } });
    const session = createTowerSession({ createAdapter: () => mock.adapter });
    const store = createStateStore({ now: () => 1 });
    const records = createTowerRecords(store, () => 1);
    const { stop } = feedStateStore(session, store, { skulls: records });
    try {
      await finishConnect(session);
      // The first report on this connection only says where the tower's count is.
      mock.dropSkull();
      await vi.advanceTimersByTimeAsync(100);
      expect(store.record("skulls.count").count).toBe(0);
      mock.dropSkull();
      mock.dropSkull();
      await vi.advanceTimersByTimeAsync(100);
      expect(store.record("skulls.count")).toEqual({ count: 2, since: 1 });

      // A reconnect changes nothing, and the tower's count carrying on is not counted again.
      await finishDisconnect(session);
      await finishConnect(session);
      expect(store.record("skulls.count").count).toBe(2);
      mock.dropSkull();
      await vi.advanceTimersByTimeAsync(100);
      expect(store.record("skulls.count").count).toBe(2);
      mock.dropSkull();
      await vi.advanceTimersByTimeAsync(100);
      expect(store.record("skulls.count").count).toBe(3);
    } finally {
      stop();
      await session.close();
    }
  });
});
