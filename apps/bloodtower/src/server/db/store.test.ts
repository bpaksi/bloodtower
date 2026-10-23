import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { openDatabase } from "./client.ts";
import { MIGRATIONS } from "./migrations.ts";
import { createSessionStore } from "./store.ts";

describe("session store", () => {
  it("creates the six game tables", () => {
    const opened = openDatabase(":memory:");
    try {
      const names = opened.db.all<{ name: string }>(
        sql`select name from sqlite_master where type = 'table' order by name`,
      );
      expect(names.map((row) => row.name).filter((name) => name !== "sqlite_sequence")).toEqual([
        "autosave",
        "checkpoints",
        "control_presses",
        "devices",
        "events",
        "holdings",
        "sessions",
        "stat_events",
        "timing_marks",
      ]);
      const version = opened.db.get<{ user_version: number }>(sql`pragma user_version`);
      expect(version?.user_version).toBe(MIGRATIONS.length);
    } finally {
      opened.close();
    }
  });

  it("refuses a database written by a newer build", () => {
    const dir = mkdtempSync(join(tmpdir(), "bloodtower-db-"));
    const path = join(dir, "game.sqlite");
    try {
      const opened = openDatabase(path);
      opened.close();
      const sqlite = new Database(path);
      sqlite.pragma(`user_version = ${MIGRATIONS.length + 1}`);
      sqlite.close();
      expect(() => openDatabase(path)).toThrow(/schema version/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps an open mark's end null", () => {
    const opened = openDatabase(":memory:");
    try {
      const store = createSessionStore(opened.db);
      store.saveRoster({
        sessionId: "s",
        packId: "test",
        packVersion: "0.1.0",
        startedWall: "2026-10-15T18:00:00.000Z",
        joinCode: "048213",
        devices: [],
        holdings: [],
      });
      const id = store.insertMark({
        sessionId: "s",
        kind: "pause",
        subject: "host-pause:0",
        startMonoMs: 0,
        endMonoMs: null,
        startWall: "2026-10-15T18:00:00.000Z",
        endWall: null,
        deviceId: null,
        cause: "host-pause",
        hunter: null,
        result: null,
      });
      const raw = opened.db.get<{ end_mono_ms: number | null; end_wall: string | null }>(
        sql`select end_mono_ms, end_wall from timing_marks where id = ${id}`,
      );
      expect(raw?.end_mono_ms).toBeNull();
      expect(raw?.end_wall).toBeNull();
    } finally {
      opened.close();
    }
  });
});
