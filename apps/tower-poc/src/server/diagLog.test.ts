import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createAdapterEventList } from "./adapters/instrumented.ts";
import { openDiagLog, teeEventList } from "./diagLog.ts";

const lines = (path: string) =>
  readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));

describe("diag log", () => {
  it("appends one JSON line per record, with the time, creating the folder", () => {
    const path = join(mkdtempSync(join(tmpdir(), "diag-")), "nested", "smoke.jsonl");
    const log = openDiagLog(path, () => 0);
    log.write({ source: "transport", event: { kind: "tx", hex: "00", bytes: 1 } });
    log.write({ source: "transport", event: { kind: "lifecycle", name: "connect:start" } });
    expect(lines(path)).toEqual([
      {
        at: "1970-01-01T00:00:00.000Z",
        source: "transport",
        event: { kind: "tx", hex: "00", bytes: 1 },
      },
      {
        at: "1970-01-01T00:00:00.000Z",
        source: "transport",
        event: { kind: "lifecycle", name: "connect:start" },
      },
    ]);
  });

  it("tees adapter events: the list still holds them and the log gets each", () => {
    const path = join(mkdtempSync(join(tmpdir(), "diag-")), "smoke.jsonl");
    const list = createAdapterEventList();
    const tee = teeEventList(list, openDiagLog(path));
    tee.emit({ kind: "rx", hex: "0102", bytes: 2 });
    expect(list.events()).toHaveLength(1);
    expect(tee.events()).toHaveLength(1);
    expect(lines(path)[0]).toMatchObject({
      source: "transport",
      event: { kind: "rx", hex: "0102" },
    });
  });

  it("never throws when a write fails: it warns once and drops the record", () => {
    const folder = mkdtempSync(join(tmpdir(), "diag-"));
    const log = openDiagLog(join(folder, "smoke.jsonl"));
    rmSync(folder, { recursive: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const tee = teeEventList(createAdapterEventList(), log);
      expect(() => tee.emit({ kind: "rx", hex: "00", bytes: 1 })).not.toThrow();
      expect(() => tee.emit({ kind: "rx", hex: "00", bytes: 1 })).not.toThrow();
      expect(tee.events()).toHaveLength(2);
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });
});
