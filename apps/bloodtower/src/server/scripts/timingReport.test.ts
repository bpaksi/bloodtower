import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createPressLog } from "../control/lock.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore, type SessionStore } from "../db/store.ts";
import { stepClock } from "../timing/clock.ts";
import { createTimingLog } from "../timing/log.ts";
import { formatTimingReport, parseReportArgs, readRun, timelineOf } from "./timingReport.ts";

const dirs: string[] = [];
const tempDb = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-report-"));
  dirs.push(dir);
  return join(dir, "session.sqlite");
};

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const roster = (store: SessionStore, sessionId: string, startedWall: string) =>
  store.saveRoster({
    sessionId,
    packId: "test",
    packVersion: "0.1.0",
    startedWall,
    joinCode: "048213",
    devices: [
      { deviceId: "device-1", formFactor: "ipad", token: "rejoin-token-0001", connected: true },
      { deviceId: "device-2", formFactor: "phone", token: "rejoin-token-0002", connected: true },
    ],
    holdings: [{ deviceId: "device-1", hunter: "alpha" }],
  });

/** A short run: begin, a lost and a won continue, a disconnect pause, and the end. */
const writeRun = (path: string, sessionId: string, options: { leavePauseOpen?: boolean } = {}) => {
  const opened = openDatabase(path);
  try {
    const store = createSessionStore(opened.db);
    const clock = stepClock();
    roster(store, sessionId, clock.wall());
    const log = createTimingLog(store, clock, sessionId);
    const presses = createPressLog(clock, (press) => store.insertPress(sessionId, press));
    clock.advance(1000);
    presses.record({
      promptId: "begin",
      action: "begin",
      deviceId: "device-1",
      winner: true,
      screen: "begin",
      nextScreen: "play",
    });
    log.open({ kind: "phase", subject: "night", deviceId: null, cause: null, hunter: null });
    log.open({
      kind: "moment",
      subject: "proving-ground.01",
      deviceId: null,
      cause: null,
      hunter: null,
    });
    clock.advance(2500);
    presses.record({
      promptId: "continue-0",
      action: "continue",
      deviceId: "device-2",
      winner: true,
      screen: "play",
      nextScreen: null,
    });
    presses.record({
      promptId: "continue-0",
      action: "continue",
      deviceId: "device-1",
      winner: false,
      screen: "play",
      nextScreen: null,
    });
    log.close("moment", "proving-ground.01");
    log.open({
      kind: "moment",
      subject: "proving-ground.03",
      deviceId: null,
      cause: null,
      hunter: null,
    });
    log.open({ kind: "cue", subject: "bell", deviceId: null, cause: null, hunter: null });
    clock.advance(500);
    log.open({
      kind: "pause",
      subject: "disconnect:alpha",
      deviceId: null,
      cause: "disconnect",
      hunter: "alpha",
    });
    if (options.leavePauseOpen) return;
    clock.advance(4000);
    log.close("pause", "disconnect:alpha");
    clock.advance(1000);
    presses.record({
      promptId: "continue-1",
      action: "continue",
      deviceId: "device-1",
      winner: true,
      screen: "play",
      nextScreen: null,
    });
    log.close("cue", "bell");
    log.close("moment", "proving-ground.03");
    log.close("phase", "night");
  } finally {
    opened.close();
  }
};

describe("timing report", () => {
  it("puts every press and every mark start and end on one monotonic timeline", () => {
    const path = tempDb();
    writeRun(path, "run-1");
    const run = readRun(path, "run-1");
    const events = timelineOf(run);

    expect(events.map((event) => `${event.what} ${event.subject}`)).toEqual([
      "press won begin begin on begin -> play",
      "phase start night",
      "moment start proving-ground.01",
      "press won continue-0 continue on play",
      "press lost continue-0 continue on play",
      "moment end proving-ground.01",
      "moment start proving-ground.03",
      "cue start bell",
      "pause start disconnect:alpha",
      "pause end disconnect:alpha",
      "press won continue-1 continue on play",
      // Same instant: stored row order.
      "phase end night",
      "moment end proving-ground.03",
      "cue end bell",
    ]);
    const monos = events.map((event) => event.monoMs);
    expect([...monos].sort((a, b) => a - b)).toEqual(monos);
    expect(events.find((event) => event.what === "press lost")?.deviceId).toBe("device-1");
    const pause = events.find((event) => event.what === "pause start");
    expect(pause).toMatchObject({ cause: "disconnect", hunter: "alpha", monoMs: 4000 });
  });

  it("prints relative and wall time, device and cause, and the paused and active totals", () => {
    const path = tempDb();
    writeRun(path, "run-1");
    const lines = formatTimingReport(readRun(path, "run-1"));

    expect(lines[0]).toBe("Session run-1");
    expect(lines).toContain(
      "+0:03.500  2026-10-15T18:00:03.500Z  press lost      continue-0 continue on play  device device-1",
    );
    expect(lines).toContain(
      "+0:04.000  2026-10-15T18:00:04.000Z  pause start     disconnect:alpha  cause disconnect  hunter alpha",
    );
    expect(lines).toContain("Marks 5, presses 4 (3 won).");
    expect(lines).toContain("Open marks none.");
    // Begin at 1000 ms; the night closes at 9000 ms.
    expect(lines.at(-1)).toBe("Lobby 1000 ms. Night 8000 ms. Paused 4000 ms. Active 4000 ms.");
  });

  it("reports an open pause and leaves the totals unknown, not zero", () => {
    const path = tempDb();
    writeRun(path, "run-open", { leavePauseOpen: true });
    const lines = formatTimingReport(readRun(path, "run-open"));

    expect(lines).toContain(
      "Open marks phase night, moment proving-ground.03, cue bell, pause disconnect:alpha.",
    );
    expect(lines.at(-1)).toBe("Lobby 1000 ms. Night unknown. Paused unknown. Active unknown.");
  });

  it("leaves a pause after the night out of Paused and Active, closed or still open", () => {
    for (const close of [true, false]) {
      const path = tempDb();
      const opened = openDatabase(path);
      try {
        const store = createSessionStore(opened.db);
        const clock = stepClock();
        roster(store, "run-late", clock.wall());
        const log = createTimingLog(store, clock, "run-late");
        clock.advance(1000);
        log.open({ kind: "phase", subject: "night", deviceId: null, cause: null, hunter: null });
        clock.advance(8000);
        log.close("phase", "night");
        clock.advance(500);
        log.open({
          kind: "pause",
          subject: "disconnect:alpha",
          deviceId: null,
          cause: "disconnect",
          hunter: "alpha",
        });
        clock.advance(2000);
        if (close) log.close("pause", "disconnect:alpha");
      } finally {
        opened.close();
      }
      expect(formatTimingReport(readRun(path, "run-late")).at(-1)).toBe(
        "Lobby 1000 ms. Night 8000 ms. Paused 0 ms. Active 8000 ms.",
      );
    }
  });

  it("clips a pause that runs past the night's end to the night", () => {
    const path = tempDb();
    const opened = openDatabase(path);
    try {
      const store = createSessionStore(opened.db);
      const clock = stepClock();
      roster(store, "run-clip", clock.wall());
      const log = createTimingLog(store, clock, "run-clip");
      log.open({ kind: "phase", subject: "night", deviceId: null, cause: null, hunter: null });
      clock.advance(3000);
      log.open({
        kind: "pause",
        subject: "disconnect:alpha",
        deviceId: null,
        cause: "disconnect",
        hunter: "alpha",
      });
      clock.advance(1000);
      log.close("phase", "night");
      clock.advance(1000);
      log.close("pause", "disconnect:alpha");
    } finally {
      opened.close();
    }
    expect(formatTimingReport(readRun(path, "run-clip")).at(-1)).toBe(
      "Lobby 0 ms. Night 4000 ms. Paused 1000 ms. Active 3000 ms.",
    );
  });

  it("reads the latest session when no id is given", () => {
    const path = tempDb();
    writeRun(path, "run-old");
    const opened = openDatabase(path);
    try {
      roster(createSessionStore(opened.db), "run-new", "2026-10-16T09:00:00.000Z");
    } finally {
      opened.close();
    }
    expect(readRun(path).session.id).toBe("run-new");
    const empty = formatTimingReport(readRun(path));
    expect(empty).toContain("No timing rows.");
    expect(empty.at(-1)).toBe("Lobby unknown. Night unknown. Paused 0 ms. Active unknown.");
  });

  it("does not create a database at a wrong path, and names a missing session", () => {
    const path = tempDb();
    expect(() => readRun(path)).toThrow(/No database at/);
    expect(existsSync(path)).toBe(false);
    writeRun(path, "run-1");
    expect(() => readRun(path, "run-2")).toThrow(/No session run-2/);
  });

  it("takes an optional session id and an optional --db file", () => {
    expect(parseReportArgs([])).toEqual({});
    expect(parseReportArgs(["run-1"])).toEqual({ sessionId: "run-1" });
    expect(parseReportArgs(["--db", "x.sqlite", "run-1"])).toEqual({
      sessionId: "run-1",
      db: "x.sqlite",
    });
    expect(parseReportArgs(["run-1", "run-2"])).toBeNull();
    expect(parseReportArgs(["--db"])).toBeNull();
    expect(parseReportArgs(["--verbose"])).toBeNull();
  });
});
