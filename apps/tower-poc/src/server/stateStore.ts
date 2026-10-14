// Every tower value the service shows, with where it came from and how fresh it is (spec §3.1),
// and the saved snapshot that lets a restarted service offer the last values back (D11).
//
// Restoring is bookkeeping only. A restored value is shown as `application-maintained` and
// `stale`; nothing is sent to the tower and nothing is written into the library.
import type { Origin, PendingRestore, StateSnapshot, StateValue } from "tower-poc-protocols";
import type { TowerSession } from "./session.ts";

/**
 * The values the store keeps, by inventory id. Each starts unavailable. M3 (Tower State) adds the
 * drums, glyphs, seals and skulls.
 */
export const STATE_KEYS = ["battery.level"] as const;
export type StateKey = (typeof STATE_KEYS)[number];

type Known = Extract<StateValue, { value: unknown }>;
export type StateJson = Known["value"];

/** Where the latest snapshot is kept between runs of the service. */
export interface SnapshotStorage {
  /** The saved snapshot, or undefined when there is none or it cannot be read. */
  load: () => PendingRestore | undefined;
  /** Replaces the saved snapshot. One with no values removes it. */
  save: (saved: PendingRestore) => void;
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
  keys?: readonly StateKey[];
  /** Milliseconds since the epoch. */
  now?: () => number;
  /** Called when saving the snapshot fails. The values in memory are unaffected. */
  onSaveError?: (error: unknown) => void;
}

export interface StateStore {
  snapshot: () => StateSnapshot;
  /** Saved state from an earlier run, until a person restores it or declines (D11). */
  pendingRestore: () => PendingRestore | undefined;
  /** Records a reading. It is `current` until the connection it came from ends. */
  set: (key: StateKey, value: StateJson, origin: Exclude<Origin, "unknown">) => void;
  /** Makes every current value stale: the tower is no longer reporting them. */
  markStale: () => void;
  /**
   * Answers the restore prompt. Accepting fills each value the store does not have from the saved
   * snapshot; a value read since the service started is newer and stays. Either way the prompt
   * closes and the saved snapshot is replaced by the store's own.
   */
  answerRestore: (accept: boolean) => void;
  /** Calls `listener` after every change, the prompt closing included. Returns a function that stops it. */
  subscribe: (listener: () => void) => () => void;
}

const UNAVAILABLE: StateValue = { freshness: "unavailable", origin: "unknown" };

const known = (value: StateValue): value is Known => value.freshness !== "unavailable";

export const createStateStore = (options: StateStoreOptions = {}): StateStore => {
  const keys: readonly StateKey[] = options.keys ?? STATE_KEYS;
  const now = options.now ?? Date.now;
  const onSaveError =
    options.onSaveError ?? ((error) => console.error("Could not save the state snapshot:", error));
  const listeners = new Set<() => void>();
  const values = new Map<string, StateValue>(keys.map((key) => [key, UNAVAILABLE]));

  // A saved value for a key this store no longer keeps, or one saved unavailable, is not offered.
  // One that was current when saved is stale now: the service has restarted since.
  const loaded = options.storage?.load();
  const offered = Object.fromEntries(
    Object.entries(loaded?.snapshot ?? {}).flatMap(([key, value]): [string, StateValue][] =>
      values.has(key) && known(value) ? [[key, { ...value, freshness: "stale" }]] : [],
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
    const snapshot = Object.fromEntries([...values].filter(([, value]) => known(value)));
    try {
      options.storage.save({ savedAt: now(), snapshot });
      saveFailing = false;
    } catch (error) {
      // Battery readings arrive every 2 s; report a failing disk once, not on each of them.
      if (!saveFailing) onSaveError(error);
      saveFailing = true;
    }
  };

  const changed = () => {
    save();
    for (const listener of listeners) listener();
  };

  return {
    snapshot: () => Object.fromEntries(values),
    pendingRestore: () => pending,
    set: (key, value, origin) => {
      if (!values.has(key)) throw new Error(`"${key}" is not a value this store keeps.`);
      values.set(key, { freshness: "current", value, origin, updatedAt: now() });
      changed();
    },
    markStale: () => {
      let any = false;
      for (const [key, value] of values) {
        if (value.freshness === "current") {
          values.set(key, { ...value, freshness: "stale" });
          any = true;
        }
      }
      if (any) changed();
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

/**
 * Feeds the store from the tower session: battery readings as they arrive, and every value made
 * stale once the connection they came from has ended. Returns a function that stops it.
 */
export const feedStateStore = (session: TowerSession, store: StateStore) => {
  const stops = [
    session.subscribe((status) => {
      if (status.state !== "connected") store.markStale();
    }),
    session.onBattery(({ millivolts, percent }) =>
      store.set("battery.level", { millivolts, percent }, "device-reported"),
    ),
  ];
  return () => {
    for (const stop of stops) stop();
  };
};
