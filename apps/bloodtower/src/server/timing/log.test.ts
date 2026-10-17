import { activeMillis, pausedMillis, type TimingMark } from "bloodtower-protocols";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { stepClock } from "./clock.ts";
import { createTimingLog } from "./log.ts";

const TOKEN = "rejoin-token-0001";

describe("timing log", () => {
  it("reconstructs a run from SQLite, with pauses out of active time and nulls left null", () => {
    const opened = openDatabase(":memory:");
    try {
      const store = createSessionStore(opened.db);
      const clock = stepClock();
      store.saveRoster({
        sessionId: "run-1",
        packId: "test",
        packVersion: "0.1.0",
        startedWall: clock.wall(),
        joinCode: "048213",
        devices: [
          { deviceId: "device-1", formFactor: "ipad", token: TOKEN, connected: true },
          {
            deviceId: "device-2",
            formFactor: "phone",
            token: "rejoin-token-0002",
            connected: false,
          },
        ],
        holdings: [
          { deviceId: "device-1", hunter: "alpha" },
          { deviceId: "device-2", hunter: "beta" },
        ],
      });

      const log = createTimingLog(store, clock, "run-1");
      log.open({
        kind: "phase",
        subject: "night",
        deviceId: null,
        cause: null,
        hunter: null,
      });
      log.open({
        kind: "moment",
        subject: "proving-ground.01",
        deviceId: null,
        cause: null,
        hunter: null,
      });
      clock.advance(400);
      log.open({
        kind: "pause",
        subject: "disconnect:alpha",
        deviceId: null,
        cause: "disconnect",
        hunter: "alpha",
      });
      clock.advance(300);
      log.close("pause", "disconnect:alpha");
      log.open({
        kind: "pick",
        subject: "look",
        deviceId: "device-1",
        cause: null,
        hunter: "alpha",
      });
      clock.advance(100);
      log.close("pick", "look");
      log.open({
        kind: "table-talk",
        subject: "share",
        deviceId: null,
        cause: null,
        hunter: null,
      });
      clock.advance(50);
      log.close("table-talk", "share");
      log.open({
        kind: "battle-screen",
        subject: "gate",
        deviceId: null,
        cause: null,
        hunter: null,
      });
      clock.advance(50);
      log.close("battle-screen", "gate", "won");
      log.open({
        kind: "cue",
        subject: "bell",
        deviceId: null,
        cause: null,
        hunter: null,
      });
      clock.advance(100);
      log.close("cue", "bell");
      log.close("moment", "proving-ground.01");
      log.close("phase", "night");

      store.insertPress("run-1", {
        promptId: "continue-0",
        action: "continue",
        deviceId: "device-1",
        atMonoMs: 1000,
        atWall: "2026-10-15T18:00:01.000Z",
        winner: true,
        screen: "play",
        nextScreen: null,
      });
      store.insertPress("run-1", {
        promptId: "continue-0",
        action: "continue",
        deviceId: "device-2",
        atMonoMs: 1000,
        atWall: "2026-10-15T18:00:01.000Z",
        winner: false,
        screen: "play",
        nextScreen: null,
      });

      const run = store.loadRun("run-1");
      expect(run.session.packVersion).toBe("0.1.0");
      expect(run.devices.map((device) => device.formFactor)).toEqual(["ipad", "phone"]);
      expect(run.holdings).toEqual([
        { deviceId: "device-1", hunter: "alpha" },
        { deviceId: "device-2", hunter: "beta" },
      ]);
      expect(run.presses.map((press) => press.winner)).toEqual([true, false]);

      const kinds = run.marks.map((mark) => mark.kind);
      expect(kinds).toEqual([
        "phase",
        "moment",
        "pause",
        "pick",
        "table-talk",
        "battle-screen",
        "cue",
      ]);
      const pause = run.marks.find((mark) => mark.kind === "pause");
      expect(pause?.cause).toBe("disconnect");
      expect(pause?.hunter).toBe("alpha");
      expect(pause?.endMonoMs).toBe(700);
      const battle = run.marks.find((mark) => mark.kind === "battle-screen");
      expect(battle?.result).toBe("won");

      const open = log.open({
        kind: "pause",
        subject: "host-pause:0",
        deviceId: "device-1",
        cause: "host-pause",
        hunter: null,
      });
      expect(open.endMonoMs).toBeNull();
      expect(open.endWall).toBeNull();
      const again = store.loadRun("run-1");
      const host = again.marks.find((mark) => mark.subject === "host-pause:0");
      expect(host?.endMonoMs).toBeNull();
      expect(host?.endWall).toBeNull();
      expect(pausedMillis(again.marks)).toBeNull();
      expect(activeMillis(1000, again.marks)).toBeNull();

      log.close("pause", "host-pause:0");
      const closed = store.loadRun("run-1").marks;
      expect(pausedMillis(closed.filter((mark) => mark.subject !== "host-pause:0"))).toBe(300);
      const withoutOpen = closed.filter((mark) => mark.endMonoMs !== null);
      expect(activeMillis(1000, withoutOpen)).toBe(700);
    } finally {
      opened.close();
    }
  });

  it("refuses a second open of the same mark and a close of one that is not open", () => {
    const opened = openDatabase(":memory:");
    try {
      const store = createSessionStore(opened.db);
      store.saveRoster({
        sessionId: "run-2",
        packId: "test",
        packVersion: "0.1.0",
        startedWall: "2026-10-15T18:00:00.000Z",
        joinCode: "048213",
        devices: [],
        holdings: [],
      });
      const log = createTimingLog(store, stepClock(), "run-2");
      log.open({ kind: "moment", subject: "a", deviceId: null, cause: null, hunter: null });
      expect(() =>
        log.open({ kind: "moment", subject: "a", deviceId: null, cause: null, hunter: null }),
      ).toThrow(/already open/);
      expect(() => log.close("cue", "missing")).toThrow(/not open/);
    } finally {
      opened.close();
    }
  });

  it("does not rewrite a start when a mark closes", () => {
    const opened = openDatabase(":memory:");
    try {
      const store = createSessionStore(opened.db);
      const clock = stepClock();
      store.saveRoster({
        sessionId: "run-3",
        packId: "test",
        packVersion: "0.0.1",
        startedWall: clock.wall(),
        joinCode: "111111",
        devices: [],
        holdings: [],
      });
      const log = createTimingLog(store, clock, "run-3");
      const started = log.open({
        kind: "cue",
        subject: "bell",
        deviceId: null,
        cause: null,
        hunter: null,
      });
      clock.advance(25);
      log.close("cue", "bell");
      const stored = store.listMarks("run-3")[0] as TimingMark;
      expect(stored.startMonoMs).toBe(started.startMonoMs);
      expect(stored.startWall).toBe(started.startWall);
      expect(stored.endMonoMs).toBe(25);
    } finally {
      opened.close();
    }
  });
});
