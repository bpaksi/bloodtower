import type { Pack, TowerSnapshot } from "bloodtower-protocols";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../config.ts";
import { createPressLog } from "../control/lock.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { loadR1Pack } from "../pack/load.ts";
import { stepClock } from "../timing/clock.ts";
import { createTimingLog } from "../timing/log.ts";
import { createSession, type SessionEngine } from "./engine.ts";

const JOIN = "http://127.0.0.1:4787/join?code=048213";
const TOWER: TowerSnapshot = {
  connection: "unavailable",
  battery: { state: "unavailable" },
  calibrated: { state: "unavailable" },
};

const packOrThrow = (absent?: readonly string[]) => {
  const loaded = loadR1Pack(loadConfig().packsDir);
  if (!loaded.ok) throw new Error(loaded.issues.map((item) => item.message).join("\n"));
  return { pack: loaded.pack, absent };
};

const setup = (options?: {
  absent?: readonly string[];
  pack?: Pack;
  tower?: () => TowerSnapshot;
}) => {
  const opened = openDatabase(":memory:");
  const store = createSessionStore(opened.db);
  const clock = stepClock();
  const source = options?.pack
    ? { pack: options.pack, absent: options.absent }
    : packOrThrow(options?.absent);
  const timing = createTimingLog(store, clock, "run");
  const presses = createPressLog(clock, (press) => store.insertPress("run", press));
  let tokens = 0;
  const engine = createSession(source.pack, {
    sessionId: "run",
    joinCode: "048213",
    absent: source.absent,
    startedWall: clock.wall(),
    timing,
    presses,
    saveRoster: (roster) => store.saveRoster(roster),
    tokens: () => `rejoin-token-${String(++tokens).padStart(4, "0")}`,
    tower: options?.tower,
  });
  return { opened, store, clock, engine };
};

const holdAll = (engine: SessionEngine, deviceId: string) => {
  for (const hunter of ["alpha", "beta", "gamma", "delta"]) {
    const result = engine.hold(deviceId, hunter, "take");
    if (!result.ok) throw new Error(result.code);
  }
};

describe("session", () => {
  it("blocks Begin until every hunter is held, including when one device holds all four", () => {
    const { opened, engine } = setup();
    try {
      const joined = engine.join({ joinCode: "048213", formFactor: "ipad" });
      expect(joined.ok).toBe(true);
      if (!joined.ok) return;
      expect(engine.press(joined.deviceId, "begin", "begin")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      expect(engine.projectStoryboard(TOWER, JOIN).gate.canBegin).toBe(false);
      holdAll(engine, joined.deviceId);
      const board = engine.projectStoryboard(TOWER, JOIN);
      expect(board.gate).toEqual({ canBegin: true, unheld: [] });
      expect(board.prompt).toEqual({ id: "begin", label: "Begin" });
      expect(engine.join({ joinCode: "000000", formFactor: "phone" })).toMatchObject({
        ok: false,
        code: "bad-code",
      });
      expect(engine.hold("missing", "alpha", "take")).toMatchObject({
        ok: false,
        code: "unknown-device",
      });
    } finally {
      opened.close();
    }
  });

  it("lets the first of two continues win, shows the private line only to that hunter's holder, and logs both presses", () => {
    const { opened, store, clock, engine } = setup();
    try {
      const alpha = engine.join({ joinCode: "048213", formFactor: "ipad" });
      const beta = engine.join({ joinCode: "048213", formFactor: "phone" });
      if (!alpha.ok || !beta.ok) throw new Error("join");
      engine.hold(alpha.deviceId, "alpha", "take");
      engine.hold(alpha.deviceId, "beta", "take");
      engine.hold(beta.deviceId, "gamma", "take");
      engine.hold(beta.deviceId, "delta", "take");
      expect(engine.press(alpha.deviceId, "begin", "begin").ok).toBe(true);
      expect(engine.projectStoryboard(TOWER, JOIN).moment?.text).toBe(
        "The proving ground is quiet.",
      );
      clock.advance(10);
      const results = engine.pressAll([
        { deviceId: alpha.deviceId, promptId: "continue-0", action: "continue" },
        { deviceId: beta.deviceId, promptId: "continue-0", action: "continue" },
      ]);
      expect(results.map((result) => (result.ok ? result.winner : result.code))).toEqual([
        true,
        false,
      ]);
      const run = store.loadRun("run");
      const continues = run.presses.filter((press) => press.promptId === "continue-0");
      expect(continues.map((press) => press.winner)).toEqual([true, false]);
      expect(continues.map((press) => press.atMonoMs)).toEqual([10, 10]);
      expect(new Set(continues.map((press) => press.deviceId)).size).toBe(2);

      const board = engine.projectStoryboard(TOWER, JOIN);
      expect(JSON.stringify(board)).not.toContain("Only Alpha hears this.");
      expect(JSON.stringify(board)).not.toContain("ipad:");
      expect(board.moment?.text).toBe("Each hunter reads alone.");
      const alphaView = engine.projectDevice(alpha.deviceId);
      const betaView = engine.projectDevice(beta.deviceId);
      expect(alphaView.views.find((view) => view.hunter === "alpha")?.privateMoment?.text).toBe(
        "Only Alpha hears this.",
      );
      expect(JSON.stringify(betaView)).not.toContain("Only Alpha hears this.");
      expect(engine.projectDevice("missing").heldHunters).toEqual([]);
    } finally {
      opened.close();
    }
  });

  it("plays the ~no-delta line when delta is absent and keeps a global private line", () => {
    const { opened, engine } = setup({ absent: ["delta"] });
    try {
      const joined = engine.join({ joinCode: "048213", formFactor: "ipad" });
      if (!joined.ok) throw new Error("join");
      holdAll(engine, joined.deviceId);
      engine.press(joined.deviceId, "begin", "begin");
      expect(engine.projectStoryboard(TOWER, JOIN).moment?.text).toBe("Delta is not in the hall.");
      engine.press(joined.deviceId, "continue-0", "continue");
      const duringPrivate = JSON.stringify(engine.projectDevice(joined.deviceId));
      expect(duringPrivate).not.toContain("Only Delta hears this.");
      expect(engine.projectStoryboard(TOWER, JOIN).moment?.text).toBe("Each hunter reads alone.");
    } finally {
      opened.close();
    }

    const loaded = loadR1Pack(loadConfig().packsDir);
    if (!loaded.ok) throw new Error("pack");
    const pack: Pack = structuredClone(loaded.pack);
    const moment = pack.moments.find((item) => item.id === "proving-ground.02.private.delta");
    if (!moment) throw new Error("moment");
    moment.scope = "global";
    const global = setup({ absent: ["delta"], pack });
    try {
      const joined = global.engine.join({ joinCode: "048213", formFactor: "ipad" });
      if (!joined.ok) throw new Error("join");
      holdAll(global.engine, joined.deviceId);
      global.engine.press(joined.deviceId, "begin", "begin");
      global.engine.press(joined.deviceId, "continue-0", "continue");
      expect(
        global.engine.projectDevice(joined.deviceId).views.find((view) => view.hunter === "delta")
          ?.privateMoment?.text,
      ).toBe("Only Delta hears this.");
      expect(JSON.stringify(global.engine.projectStoryboard(TOWER, JOIN))).not.toContain(
        "Only Delta hears this.",
      );
    } finally {
      global.opened.close();
    }
  });

  it("pauses when the only connected holder drops, resumes on rejoin, and records the cause", () => {
    const { opened, store, engine } = setup();
    try {
      const alpha = engine.join({ joinCode: "048213", formFactor: "ipad" });
      const beta = engine.join({ joinCode: "048213", formFactor: "phone" });
      if (!alpha.ok || !beta.ok) throw new Error("join");
      engine.hold(alpha.deviceId, "alpha", "take");
      for (const hunter of ["beta", "gamma", "delta"]) engine.hold(beta.deviceId, hunter, "take");
      engine.press(beta.deviceId, "begin", "begin");
      engine.disconnect(alpha.deviceId);
      const paused = engine.projectStoryboard(TOWER, JOIN);
      expect(paused.stage).toBe("paused");
      expect(paused.pause).toEqual({ cause: "disconnect", hunter: "alpha" });
      expect(engine.press(beta.deviceId, "resume-1", "resume")).toMatchObject({
        ok: false,
        code: "invalid-state",
      });
      const back = engine.rejoin(alpha.token);
      expect(back).toMatchObject({ ok: true, deviceId: alpha.deviceId, held: ["alpha"] });
      expect(engine.projectStoryboard(TOWER, JOIN).stage).toBe("playing");
      const pause = store.loadRun("run").marks.find((mark) => mark.kind === "pause");
      expect(pause?.cause).toBe("disconnect");
      expect(pause?.hunter).toBe("alpha");
      expect(pause?.endMonoMs).not.toBeNull();
      expect(engine.rejoin("not-a-real-token")).toMatchObject({ ok: false, code: "bad-token" });
    } finally {
      opened.close();
    }
  });

  it("pauses on release of the last holder and does not resume a host pause by itself", () => {
    const { opened, store, engine } = setup();
    try {
      const alpha = engine.join({ joinCode: "048213", formFactor: "ipad" });
      const beta = engine.join({ joinCode: "048213", formFactor: "phone" });
      if (!alpha.ok || !beta.ok) throw new Error("join");
      holdAll(engine, alpha.deviceId);
      engine.hold(beta.deviceId, "alpha", "take");
      engine.press(alpha.deviceId, "begin", "begin");
      engine.hold(alpha.deviceId, "alpha", "release");
      expect(engine.projectStoryboard(TOWER, JOIN).stage).toBe("playing");
      engine.hold(beta.deviceId, "alpha", "release");
      expect(engine.projectStoryboard(TOWER, JOIN).pause?.cause).toBe("unheld-hunter");
      engine.hold(beta.deviceId, "alpha", "take");
      expect(engine.projectStoryboard(TOWER, JOIN).stage).toBe("playing");

      const pauseId = engine.pausePromptId();
      expect(pauseId).toBe("pause-1");
      const pausing = engine.pressAll([
        { deviceId: alpha.deviceId, promptId: "pause-1", action: "pause" },
        { deviceId: beta.deviceId, promptId: "pause-1", action: "pause" },
      ]);
      expect(pausing.map((result) => (result.ok ? result.winner : false))).toEqual([true, false]);
      expect(engine.projectStoryboard(TOWER, JOIN).pause).toEqual({
        cause: "host-pause",
        hunter: null,
      });
      expect(engine.projectStoryboard(TOWER, JOIN).stage).toBe("paused");
      engine.disconnect(alpha.deviceId);
      expect(engine.projectStoryboard(TOWER, JOIN).pause?.cause).toBe("disconnect");
      engine.rejoin(alpha.token);
      expect(engine.projectStoryboard(TOWER, JOIN).stage).toBe("playing");
      const causes = store
        .loadRun("run")
        .marks.filter((mark) => mark.kind === "pause")
        .map((mark) => mark.cause);
      expect(causes).toContain("unheld-hunter");
      expect(causes).toContain("host-pause");
      expect(causes).toContain("disconnect");
    } finally {
      opened.close();
    }
  });

  it("locks tower connect and calibrate the same way, and steps the cue without sending one", () => {
    let connection: TowerSnapshot["connection"] = "unavailable";
    const { opened, store, engine } = setup({
      tower: () => ({ ...TOWER, connection }),
    });
    try {
      const alpha = engine.join({ joinCode: "048213", formFactor: "ipad" });
      const beta = engine.join({ joinCode: "048213", formFactor: "phone" });
      if (!alpha.ok || !beta.ok) throw new Error("join");
      holdAll(engine, alpha.deviceId);
      expect(engine.press(beta.deviceId, "tower-calibrate", "tower-calibrate")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      const connect = engine.pressAll([
        { deviceId: beta.deviceId, promptId: "tower-connect", action: "tower-connect" },
        { deviceId: alpha.deviceId, promptId: "tower-connect", action: "tower-connect" },
      ]);
      expect(connect.map((result) => (result.ok ? result.winner : false))).toEqual([true, false]);
      expect(engine.lockFor("tower-connect")?.winnerDeviceId).toBe(beta.deviceId);
      connection = "disconnected";
      expect(engine.lockFor("tower-connect")).toBeNull();
      expect(engine.press(alpha.deviceId, "tower-connect", "tower-connect")).toMatchObject({
        ok: true,
        winner: true,
      });
      connection = "connected";
      expect(engine.press(beta.deviceId, "tower-connect", "tower-connect")).toMatchObject({
        ok: true,
        winner: false,
      });
      const calibrate = engine.pressAll([
        { deviceId: alpha.deviceId, promptId: "tower-calibrate", action: "tower-calibrate" },
        { deviceId: beta.deviceId, promptId: "tower-calibrate", action: "tower-calibrate" },
      ]);
      expect(calibrate.map((result) => (result.ok ? result.winner : false))).toEqual([true, false]);
      connection = "disconnected";
      expect(engine.press(beta.deviceId, "tower-calibrate", "tower-calibrate")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      connection = "connected";
      expect(engine.press(beta.deviceId, "tower-calibrate", "tower-calibrate")).toMatchObject({
        ok: true,
        winner: true,
      });
      engine.press(alpha.deviceId, "begin", "begin");
      engine.press(alpha.deviceId, "continue-0", "continue");
      engine.press(alpha.deviceId, "continue-1", "continue");
      const board = engine.projectStoryboard(TOWER, JOIN);
      expect(board.moment?.fallbackAudio).toBe("sfx.bell");
      expect(board.moment?.text).toBe("A bell marks the step.");
      engine.press(alpha.deviceId, "continue-2", "continue");
      expect(engine.projectStoryboard(TOWER, JOIN).prompt).toBeNull();
      const marks = store.loadRun("run").marks;
      expect(marks.some((mark) => mark.kind === "cue" && mark.subject === "bell")).toBe(true);
      expect(marks.some((mark) => mark.kind === "phase" && mark.endMonoMs !== null)).toBe(true);
      expect(store.loadRun("run").session.packVersion).toBe("0.1.0");
    } finally {
      opened.close();
    }
  });
});
