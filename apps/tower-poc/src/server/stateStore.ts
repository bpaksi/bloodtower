// Every tower value the service shows, with where it came from and how fresh it is (spec §3.1),
// and the saved snapshot that lets a restarted service offer the last values back (D11).
//
// Restoring is bookkeeping only. A restored value is shown as `application-maintained` and
// `stale`; nothing is sent to the tower and nothing is written into the library.
//
// Two kinds of value (spec D24):
// - Readings (battery, drums, glyphs) come from the tower or the library. They are `current` while
//   the connection they came from lasts, and are saved in the snapshot the restore prompt offers.
// - The record (broken seals, skull count) is the service's own. It is saved on its own, loaded at
//   start with no prompt, never made stale by a disconnect, and changed only by a person or by
//   what the service itself counts.
import {
  BATTERY_HISTORY_INTERVAL_MS,
  BATTERY_HISTORY_LIMIT,
  isRecordKey,
  type Origin,
  type PendingRestore,
  RECORD_KEYS,
  type RecordKey,
  type StateSnapshot,
  type StateValue,
  TOWER_VALUE_SCHEMAS,
  type TowerValue,
  type TowerValueKey,
} from "tower-poc-protocols";
import type { TowerSession } from "./session.ts";

/** The values the store keeps, by inventory id. */
export const STATE_KEYS = Object.keys(TOWER_VALUE_SCHEMAS) as TowerValueKey[];
export type StateKey = TowerValueKey;
export type ReadingKey = Exclude<StateKey, RecordKey>;
export const READING_KEYS = STATE_KEYS.filter((key): key is ReadingKey => !isRecordKey(key));

type Known = Extract<StateValue, { value: unknown }>;
export type StateJson = Known["value"];

/** Where the latest snapshot is kept between runs of the service. */
export interface SnapshotStorage {
  /** The saved snapshot, or undefined when there is none or it cannot be read. */
  load: () => PendingRestore | undefined;
  /** Replaces the saved snapshot. One with no values removes it. */
  save: (saved: PendingRestore) => void;
}

/** Where the service's own record is kept between runs (spec D24), one value per key. */
export interface RecordStorage {
  /** The saved value, a reason it cannot be read, or undefined when there is none. */
  load: (
    key: RecordKey,
  ) => { value: unknown; updatedAt: number } | { unreadable: string } | undefined;
  save: (key: RecordKey, value: StateJson, updatedAt: number) => void;
}

/** `restoreState` answered when no restore prompt is open. */
export class NoPendingRestoreError extends Error {
  constructor() {
    super("There is no saved state waiting to be restored.");
    this.name = "NoPendingRestoreError";
  }
}

export interface StateStoreOptions {
  storage?: SnapshotStorage;
  records?: RecordStorage;
  /** The values kept; every one by default. */
  keys?: readonly StateKey[];
  /** Milliseconds since the epoch. */
  now?: () => number;
  /** Called when saving the snapshot or the record fails. The values in memory are unaffected. */
  onSaveError?: (error: unknown) => void;
  /** Called when a saved record cannot be used; the record starts afresh. */
  onRecordUnreadable?: (key: RecordKey, reason: string) => void;
}

export interface StateStore {
  snapshot: () => StateSnapshot;
  /** Saved state from an earlier run, until a person restores it or declines (D11). */
  pendingRestore: () => PendingRestore | undefined;
  /**
   * Records a reading. It is `current` until the connection it came from ends. A value that does
   * not match its schema is a bug in the service and throws.
   */
  set: <Key extends ReadingKey>(
    key: Key,
    value: TowerValue<Key>,
    origin: Exclude<Origin, "unknown" | "application-maintained">,
  ) => void;
  /** The same, but nothing happens when the value is already current, the same and from the same origin. */
  update: <Key extends ReadingKey>(
    key: Key,
    value: TowerValue<Key>,
    origin: Exclude<Origin, "unknown" | "application-maintained">,
  ) => void;
  /** Makes current readings stale: the tower is no longer reporting them. All of them by default. */
  markStale: (keys?: readonly ReadingKey[]) => void;
  /** The service's own record for a key. */
  record: <Key extends RecordKey>(key: Key) => TowerValue<Key>;
  /** Replaces the service's own record for a key, and saves it. */
  setRecord: <Key extends RecordKey>(key: Key, value: TowerValue<Key>) => void;
  /**
   * Answers the restore prompt. Accepting fills each reading the store does not have from the
   * saved snapshot; a value read since the service started is newer and stays. Either way the
   * prompt closes and the saved snapshot is replaced by the store's own.
   */
  answerRestore: (accept: boolean) => void;
  /** Calls `listener` after every change, the prompt closing included. Returns a function that stops it. */
  subscribe: (listener: () => void) => () => void;
}

const UNAVAILABLE: StateValue = { freshness: "unavailable", origin: "unknown" };

const known = (value: StateValue | undefined): value is Known =>
  value !== undefined && value.freshness !== "unavailable";

const matches = (key: StateKey, value: unknown) =>
  TOWER_VALUE_SCHEMAS[key].safeParse(value).success;

/** A record as it starts on the first run, or when the saved one cannot be used. */
const freshRecord = (key: RecordKey, now: number): StateJson =>
  key === "seals.broken" ? [] : { count: 0, since: now };

export const createStateStore = (options: StateStoreOptions = {}): StateStore => {
  const keys: readonly StateKey[] = options.keys ?? STATE_KEYS;
  const now = options.now ?? Date.now;
  const onSaveError =
    options.onSaveError ?? ((error) => console.error("Could not save the tower state:", error));
  const onRecordUnreadable =
    options.onRecordUnreadable ??
    ((key, reason) => console.warn(`Starting the ${key} record afresh: the saved one ${reason}`));
  const listeners = new Set<() => void>();
  const values = new Map<string, StateValue>(
    keys.filter((key) => !isRecordKey(key)).map((key) => [key, UNAVAILABLE]),
  );
  const isReading = (key: string) => values.has(key) && !isRecordKey(key);

  const saveRecord = (key: RecordKey, value: StateJson, updatedAt: number) => {
    try {
      options.records?.save(key, value, updatedAt);
    } catch (error) {
      onSaveError(error);
    }
  };

  // The record is loaded with no prompt (spec D24). One saved by no run yet starts afresh and is
  // saved at once, so that the skull count's start time stays the same from run to run.
  for (const key of RECORD_KEYS.filter((recordKey) => keys.includes(recordKey))) {
    const saved = options.records?.load(key);
    if (saved && "value" in saved && matches(key, saved.value)) {
      values.set(key, {
        freshness: "current",
        value: saved.value as StateJson,
        origin: "application-maintained",
        updatedAt: saved.updatedAt,
      });
      continue;
    }
    if (saved) {
      onRecordUnreadable(
        key,
        "unreadable" in saved ? saved.unreadable : "does not match the state protocol.",
      );
    }
    const at = now();
    const value = freshRecord(key, at);
    values.set(key, {
      freshness: "current",
      value,
      origin: "application-maintained",
      updatedAt: at,
    });
    saveRecord(key, value, at);
  }

  // A saved value for a key this store no longer keeps as a reading, one saved unavailable, or one
  // that no longer matches its schema is not offered. One that was current when saved is stale
  // now: the service has restarted since.
  const loaded = options.storage?.load();
  const offered = Object.fromEntries(
    Object.entries(loaded?.snapshot ?? {}).flatMap(([key, value]): [string, StateValue][] =>
      isReading(key) && known(value) && matches(key as StateKey, value.value)
        ? [[key, { ...value, freshness: "stale" }]]
        : [],
    ),
  );
  let pending: PendingRestore | undefined =
    loaded && Object.keys(offered).length > 0
      ? { savedAt: loaded.savedAt, snapshot: offered }
      : undefined;

  let saveFailing = false;
  const save = () => {
    // While the prompt is open the saved snapshot is what it offers, so it is not overwritten.
    if (!options.storage || pending) return;
    const snapshot = Object.fromEntries(
      [...values].filter(([key, value]) => !isRecordKey(key) && known(value)),
    );
    try {
      options.storage.save({ savedAt: now(), snapshot });
      saveFailing = false;
    } catch (error) {
      // Battery readings arrive every 2 s; report a failing disk once, not on each of them.
      if (!saveFailing) onSaveError(error);
      saveFailing = true;
    }
  };

  const tell = () => {
    for (const listener of listeners) listener();
  };
  const changed = () => {
    save();
    tell();
  };

  const set: StateStore["set"] = (key, value, origin) => {
    if (!isReading(key)) throw new Error(`"${key}" is not a reading this store keeps.`);
    if (!matches(key, value)) throw new Error(`The value for "${key}" does not match its schema.`);
    values.set(key, { freshness: "current", value: value as StateJson, origin, updatedAt: now() });
    changed();
  };

  return {
    snapshot: () => Object.fromEntries(values),
    pendingRestore: () => pending,
    set,
    update: (key, value, origin) => {
      const current = values.get(key);
      const same =
        current?.freshness === "current" &&
        current.origin === origin &&
        JSON.stringify(current.value) === JSON.stringify(value);
      if (!same) set(key, value, origin);
    },
    markStale: (only = READING_KEYS) => {
      let any = false;
      for (const key of only) {
        const value = values.get(key);
        if (value?.freshness === "current") {
          values.set(key, { ...value, freshness: "stale" });
          any = true;
        }
      }
      if (any) changed();
    },
    record: (key) => {
      const value = values.get(key);
      if (!known(value)) throw new Error(`"${key}" is not a record this store keeps.`);
      return value.value as TowerValue<typeof key>;
    },
    setRecord: (key, value) => {
      if (!values.has(key)) throw new Error(`"${key}" is not a record this store keeps.`);
      if (!matches(key, value))
        throw new Error(`The value for "${key}" does not match its schema.`);
      const at = now();
      const json = value as StateJson;
      values.set(key, {
        freshness: "current",
        value: json,
        origin: "application-maintained",
        updatedAt: at,
      });
      saveRecord(key, json, at);
      tell();
    },
    answerRestore: (accept) => {
      if (!pending) throw new NoPendingRestoreError();
      if (accept) {
        for (const [key, saved] of Object.entries(pending.snapshot)) {
          if (!known(saved) || values.get(key)?.freshness !== "unavailable") continue;
          values.set(key, {
            freshness: "stale",
            value: saved.value,
            origin: "application-maintained",
            updatedAt: saved.updatedAt,
          });
        }
      }
      pending = undefined;
      changed();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

/** What `feedStateStore` changes in the service's own record. `createTowerRecords` has it. */
export interface SkullCounter {
  addSkullDrops: (count: number) => void;
}

export interface StateFeed {
  /**
   * Reads the drums and glyphs from the library again. The library moves its glyphs after a
   * rotation it sent has ended, which no tower report follows, so the service calls this as each
   * command ends.
   */
  refresh: () => void;
  stop: () => void;
}

/** Drums and glyphs move with a rotation and come from the library's own record (spec §3.1). */
const POSITION_KEYS: readonly ReadingKey[] = ["mechanics.drum-position", "glyphs.all-positions"];

/**
 * Feeds the store from the tower session:
 *
 * - battery readings as they arrive, and a battery history of one reading per interval;
 * - drum and glyph positions while the tower is calibrated (D9), from the library;
 * - skull drops into the service's own count (spec D24): the first report of each connection
 *   sets where counting starts, and each rise after it is added. A count that falls (the tower's
 *   counter was reset) starts counting again from there.
 *
 * Every reading is made stale once the connection it came from has ended, and the positions too
 * while the tower calibrates again.
 */
export const feedStateStore = (
  session: TowerSession,
  store: StateStore,
  options: {
    skulls?: SkullCounter;
    historyIntervalMs?: number;
    historyLimit?: number;
    /** Milliseconds since the epoch, for the battery history. */
    now?: () => number;
  } = {},
): StateFeed => {
  const now = options.now ?? Date.now;
  const historyIntervalMs = options.historyIntervalMs ?? BATTERY_HISTORY_INTERVAL_MS;
  const historyLimit = options.historyLimit ?? BATTERY_HISTORY_LIMIT;
  /** The tower's skull count at its last report on this connection; unknown at first. */
  let skullBaseline: number | undefined;

  const keeps = (key: ReadingKey) => key in store.snapshot();

  const refresh = () => {
    const status = session.status();
    const tower = session.tower();
    if (status.state !== "connected" || status.calibration !== "calibrated" || !tower) return;
    if (!POSITION_KEYS.every(keeps)) return;
    store.update(
      "mechanics.drum-position",
      {
        top: tower.getCurrentDrumPosition("top"),
        middle: tower.getCurrentDrumPosition("middle"),
        bottom: tower.getCurrentDrumPosition("bottom"),
      },
      "library-derived",
    );
    // Every glyph has a side once the tower is calibrated. One without is not shown as a guess.
    const glyphs = tower.getAllGlyphPositions();
    if (Object.values(glyphs).every((side) => side !== null)) {
      store.update(
        "glyphs.all-positions",
        glyphs as TowerValue<"glyphs.all-positions">,
        "library-derived",
      );
    }
  };

  const stops = [
    session.subscribe((status) => {
      if (status.state !== "connected") {
        skullBaseline = undefined;
        store.markStale();
      } else if (status.calibration !== "calibrated") {
        store.markStale(POSITION_KEYS);
      } else {
        refresh();
      }
    }),
    session.onTowerReport(() => {
      refresh();
      const count = session.tower()?.towerSkullDropCount;
      if (count === undefined || count < 0) return;
      if (skullBaseline !== undefined && count > skullBaseline) {
        options.skulls?.addSkullDrops(count - skullBaseline);
      }
      skullBaseline = count;
    }),
    session.onBattery(({ millivolts, percent }) => {
      store.set("battery.level", { millivolts, percent }, "device-reported");
      if (!keeps("battery.on-level")) return;
      // A history restored from the last run (D11) is carried on: each point was a reading.
      const saved = store.snapshot()["battery.on-level"];
      const earlier = known(saved) ? (saved.value as TowerValue<"battery.on-level">) : [];
      const last = earlier.at(-1);
      const at = now();
      if (saved?.freshness === "current" && last && at - last.at < historyIntervalMs) return;
      store.set(
        "battery.on-level",
        [...earlier, { at, millivolts, percent }].slice(-historyLimit),
        "device-reported",
      );
    }),
  ];
  return {
    refresh,
    stop: () => {
      for (const stop of stops) stop();
    },
  };
};
