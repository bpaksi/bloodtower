import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createPressLog } from "../control/lock.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore, type SessionStore } from "../db/store.ts";
import { formatTimingReport, timelineOf } from "../scripts/timingReport.ts";
import { stepClock } from "../timing/clock.ts";
import { createTimingLog } from "../timing/log.ts";
import { storedRunFromEventLog } from "./rebuildRun.ts";
import { createEventStore } from "./store.ts";

const dirs: string[] = [];
const tempDb = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-events-timing-"));
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

const writeRunToEventLog = (
  path: string,
  sessionId: string,
  gameId: string,
  options: { leavePauseOpen?: boolean } = {},
) => {
  const opened = openDatabase(path);
  try {
    const sessionStore = createSessionStore(opened.db);
    const eventStore = createEventStore(opened.db);
    const clock = stepClock();
    roster(sessionStore, sessionId, clock.wall());
    eventStore.setAutosave({ gameId, sessionId, packId: "test" });
    const meta = {
      seed: "timing-seed",
      packVersion: "0.1.0",
      engineVersion: "0.0.0-step3",
    };

    const logPress = createPressLog(clock, (press) => {
      eventStore.append({
        gameId,
        kind: "control-press",
        payload: { v: 1, press },
        atMonoMs: press.atMonoMs,
        atWall: press.atWall,
        deviceId: press.deviceId,
        seed: meta.seed,
        packVersion: meta.packVersion,
        engineVersion: meta.engineVersion,
      });
    });

    let nextMarkId = 1;
    const openById = new Map<number, { kind: string; subject: string }>();
    const logTiming = createTimingLog(
      {
        insertMark: (mark) => {
          const id = nextMarkId;
          nextMarkId += 1;
          openById.set(id, { kind: mark.kind, subject: mark.subject });
          eventStore.append({
            gameId,
            kind: "timing-mark-open",
            payload: { v: 1, mark },
            atMonoMs: mark.startMonoMs,
            atWall: mark.startWall,
            deviceId: mark.deviceId,
            seed: meta.seed,
            packVersion: meta.packVersion,
            engineVersion: meta.engineVersion,
          });
          return id;
        },
        closeMark: (id, end) => {
          const markRef = openById.get(id);
          if (!markRef) throw new Error(`Timing mark ${id} is not open.`);
          eventStore.append({
            gameId,
            kind: "timing-mark-close",
            payload: {
              v: 1,
              kind: markRef.kind,
              subject: markRef.subject,
              endMonoMs: end.endMonoMs,
              endWall: end.endWall,
              result: end.result,
            },
            atMonoMs: end.endMonoMs,
            atWall: end.endWall,
            deviceId: null,
            seed: meta.seed,
            packVersion: meta.packVersion,
            engineVersion: meta.engineVersion,
          });
          openById.delete(id);
        },
        listMarks: () => [],
      },
      clock,
      sessionId,
    );

    clock.advance(1000);
    logPress.record({
      promptId: "begin",
      action: "begin",
      deviceId: "device-1",
      winner: true,
      screen: "begin",
      nextScreen: "play",
    });
    logTiming.open({ kind: "phase", subject: "night", deviceId: null, cause: null, hunter: null });
    logTiming.open({
      kind: "moment",
      subject: "proving-ground.01",
      deviceId: null,
      cause: null,
      hunter: null,
    });
    clock.advance(2500);
    logPress.record({
      promptId: "continue-0",
      action: "continue",
      deviceId: "device-2",
      winner: true,
      screen: "play",
      nextScreen: null,
    });
    logPress.record({
      promptId: "continue-0",
      action: "continue",
      deviceId: "device-1",
      winner: false,
      screen: "play",
      nextScreen: null,
    });
    logTiming.close("moment", "proving-ground.01");
    logTiming.open({
      kind: "moment",
      subject: "proving-ground.03",
      deviceId: null,
      cause: null,
      hunter: null,
    });
    logTiming.open({ kind: "cue", subject: "bell", deviceId: null, cause: null, hunter: null });
    clock.advance(500);
    logTiming.open({
      kind: "pause",
      subject: "disconnect:alpha",
      deviceId: null,
      cause: "disconnect",
      hunter: "alpha",
    });
    if (options.leavePauseOpen) return;
    clock.advance(4000);
    logTiming.close("pause", "disconnect:alpha");
    clock.advance(1000);
    logPress.record({
      promptId: "continue-1",
      action: "continue",
      deviceId: "device-1",
      winner: true,
      screen: "play",
      nextScreen: null,
    });
    logTiming.close("cue", "bell");
    logTiming.close("moment", "proving-ground.03");
    logTiming.close("phase", "night");
  } finally {
    opened.close();
  }
};

describe("timing report from event log", () => {
  it("rebuilds the same timeline and totals as the R1 tables", () => {
    const legacyPath = tempDb();
    const eventsPath = tempDb();
    writeRunToEventLog(eventsPath, "run-1", "game-1");

    const opened = openDatabase(legacyPath);
    try {
      const store = createSessionStore(opened.db);
      const clock = stepClock();
      roster(store, "run-1", clock.wall());
      const log = createTimingLog(store, clock, "run-1");
      const presses = createPressLog(clock, (press) => store.insertPress("run-1", press));
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

    const legacyDb = openDatabase(legacyPath);
    const eventsDb = openDatabase(eventsPath);
    try {
      const legacyRun = createSessionStore(legacyDb.db).loadRun("run-1");
      const base = createSessionStore(eventsDb.db).loadRun("run-1");
      const eventRun = storedRunFromEventLog(createEventStore(eventsDb.db), "game-1", base);

      expect(timelineOf(eventRun).map((e) => `${e.what} ${e.subject}`)).toEqual(
        timelineOf(legacyRun).map((e) => `${e.what} ${e.subject}`),
      );
      expect(formatTimingReport(eventRun).at(-1)).toBe(formatTimingReport(legacyRun).at(-1));
    } finally {
      legacyDb.close();
      eventsDb.close();
    }
  });
});
