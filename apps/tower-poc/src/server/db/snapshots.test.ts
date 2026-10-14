import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import type { PendingRestore } from "tower-poc-protocols";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStateStore } from "../stateStore.ts";
import { openDatabase } from "./client.ts";
import { MIGRATIONS } from "./migrations.ts";
import { stateSnapshots } from "./schema.ts";
import { createSnapshotStorage } from "./snapshots.ts";

const saved: PendingRestore = {
  savedAt: 1_000,
  snapshot: {
    "battery.level": {
      freshness: "stale",
      value: { millivolts: 4_100, percent: 60 },
      origin: "device-reported",
      updatedAt: 900,
    },
  },
};

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "tower-poc-db-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("database", () => {
  it("creates its folder and the schema, and opens again without migrating twice", () => {
    const path = join(dir, "nested", "tower.db");
    openDatabase(path).close();
    const again = openDatabase(path);
    again.close();
    const raw = new Database(path);
    expect(raw.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
    raw.close();
  });

  it("refuses a database written by a newer version of the service", () => {
    const path = join(dir, "tower.db");
    const raw = new Database(path);
    raw.pragma(`user_version = ${MIGRATIONS.length + 1}`);
    raw.close();
    expect(() => openDatabase(path)).toThrow(/newer version/);
  });
});

describe("snapshot storage", () => {
  it("has nothing saved in a new database", () => {
    const { db, close } = openDatabase(":memory:");
    expect(createSnapshotStorage(db).load()).toBeUndefined();
    close();
  });

  it("keeps one snapshot across a restart, replaced by each save", () => {
    const path = join(dir, "tower.db");
    const first = openDatabase(path);
    const storage = createSnapshotStorage(first.db);
    storage.save({ ...saved, savedAt: 1 });
    storage.save(saved);
    first.close();

    const second = openDatabase(path);
    expect(createSnapshotStorage(second.db).load()).toEqual(saved);
    expect(second.db.select().from(stateSnapshots).all()).toHaveLength(1);
    second.close();
  });

  it("removes the snapshot when saved with no values", () => {
    const { db, close } = openDatabase(":memory:");
    const storage = createSnapshotStorage(db);
    storage.save(saved);
    storage.save({ savedAt: 2_000, snapshot: {} });
    expect(storage.load()).toBeUndefined();
    close();
  });

  it.each([
    ["not JSON", "{", /not valid JSON/],
    ["a value with no freshness", JSON.stringify({ "battery.level": { value: 1 } }), /protocol/],
  ])("treats a saved row that is %s as missing, and says so", (_name, snapshot, reason) => {
    const { db, close } = openDatabase(":memory:");
    db.insert(stateSnapshots).values({ id: 1, savedAt: 1, snapshot }).run();
    const onUnreadable = vi.fn();
    expect(createSnapshotStorage(db, onUnreadable).load()).toBeUndefined();
    expect(onUnreadable).toHaveBeenCalledWith(expect.stringMatching(reason));
    close();
  });

  it("offers a restarted store the state the last run left (D11)", () => {
    const path = join(dir, "tower.db");
    const first = openDatabase(path);
    const before = createStateStore({ storage: createSnapshotStorage(first.db), now: () => 50 });
    before.set("battery.level", { millivolts: 4_100, percent: 60 }, "device-reported");
    first.close();

    const second = openDatabase(path);
    const after = createStateStore({ storage: createSnapshotStorage(second.db) });
    expect(after.pendingRestore()?.snapshot["battery.level"]).toEqual({
      freshness: "stale",
      value: { millivolts: 4_100, percent: 60 },
      origin: "device-reported",
      updatedAt: 50,
    });
    after.answerRestore(true);
    expect(after.snapshot()["battery.level"]).toMatchObject({
      freshness: "stale",
      origin: "application-maintained",
      updatedAt: 50,
    });
    second.close();
  });
});
