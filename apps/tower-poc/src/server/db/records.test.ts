import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStateStore, createTowerRecords } from "@dark-tower/tower/runtime";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./client.ts";
import { createRecordStorage } from "./records.ts";
import { appRecords } from "./schema.ts";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "tower-poc-records-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("record storage (spec D24)", () => {
  it("has nothing saved in a new database", () => {
    const { db, close } = openDatabase(":memory:");
    expect(createRecordStorage(db).load("seals.broken")).toBeUndefined();
    close();
  });

  it("keeps the seals and the skull count across a restart, with no prompt", () => {
    const path = join(dir, "tower.db");
    const first = openDatabase(path);
    const store = createStateStore({ records: createRecordStorage(first.db), now: () => 100 });
    const records = createTowerRecords(store, () => 100);
    records.markSeal({ side: "north", level: "bottom" }, true);
    records.addSkullDrops(4);
    first.close();

    const second = openDatabase(path);
    const again = createStateStore({ records: createRecordStorage(second.db), now: () => 900 });
    expect(again.pendingRestore()).toBeUndefined();
    expect(again.record("seals.broken")).toEqual([{ side: "north", level: "bottom" }]);
    expect(again.record("skulls.count")).toEqual({ count: 4, since: 100 });
    expect(again.snapshot()["skulls.count"]).toMatchObject({
      freshness: "current",
      origin: "application-maintained",
      updatedAt: 100,
    });
    second.close();
  });

  it("reports a row that is not JSON, or has a bad time, as unreadable", () => {
    const { db, close } = openDatabase(":memory:");
    db.insert(appRecords).values({ key: "seals.broken", value: "{", updatedAt: 1 }).run();
    db.insert(appRecords).values({ key: "skulls.count", value: "{}", updatedAt: -1 }).run();
    const storage = createRecordStorage(db);
    expect(storage.load("seals.broken")).toEqual({ unreadable: "it is not valid JSON." });
    expect(storage.load("skulls.count")).toEqual({ unreadable: "its time is not valid." });
    close();
  });
});
