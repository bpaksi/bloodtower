import { inventory, type PendingRestore } from "tower-poc-protocols";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockTower } from "./adapters/mockTower.ts";
import { createTowerSession } from "./session.ts";
import {
  createStateStore,
  feedStateStore,
  NoPendingRestoreError,
  type SnapshotStorage,
  STATE_KEYS,
} from "./stateStore.ts";

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
  it("names only inventory properties and queries", () => {
    for (const key of STATE_KEYS) {
      const entry = inventory.find((capability) => capability.id === key);
      expect(entry?.kind, key).toMatch(/^(property|query)$/);
    }
  });
});

describe("state store", () => {
  it("starts with every value unavailable, never zero", () => {
    expect(createStateStore().snapshot()).toEqual({
      "battery.level": { freshness: "unavailable", origin: "unknown" },
    });
  });

  it("records a reading as current with its origin and time, and saves it", () => {
    const memory = memoryStorage();
    const store = createStateStore({ storage: memory.storage, now: () => 5_000 });
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
    const store = createStateStore({ now: () => 5_000 });
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

  it("refuses a key it does not keep", () => {
    const store = createStateStore();
    // @ts-expect-error: not a state key
    expect(() => store.set("skulls.count", 3, "library-derived")).toThrow(/not a value/);
  });

  it("opens no prompt when nothing is saved, or nothing saved has a value it keeps", () => {
    expect(createStateStore({ storage: memoryStorage().storage }).pendingRestore()).toBeUndefined();
    const unusable = memoryStorage({
      savedAt: 1,
      snapshot: {
        "battery.level": { freshness: "unavailable", origin: "unknown" },
        "skulls.count": { freshness: "stale", value: 3, origin: "library-derived", updatedAt: 1 },
      },
    });
    expect(createStateStore({ storage: unusable.storage }).pendingRestore()).toBeUndefined();
  });

  it("restores a saved value as application-maintained and stale, and closes the prompt", () => {
    const memory = memoryStorage(savedBattery);
    const store = createStateStore({ storage: memory.storage, now: () => 7_000 });
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
    const store = createStateStore({ storage: memoryStorage(savedBattery).storage, now: () => 8 });
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
    const store = createStateStore({ storage: memory.storage });
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
    const store = createStateStore({ storage: memory.storage });
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
    const store = createStateStore({
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

describe("feedStateStore", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("records battery readings while connected, and makes them stale when the connection ends", async () => {
    vi.useFakeTimers();
    const mock = createMockTower({ timings: { connectMs: 20 }, batteryMillivolts: 4_400 });
    const session = createTowerSession({ createAdapter: () => mock.adapter });
    const store = createStateStore();
    const stop = feedStateStore(session, store);
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
    feedStateStore(session, store)();
    try {
      const connecting = session.connect();
      await vi.advanceTimersByTimeAsync(3_000);
      await connecting;
      expect(store.snapshot()["battery.level"]?.freshness).toBe("unavailable");
    } finally {
      await session.close();
    }
  });
});
