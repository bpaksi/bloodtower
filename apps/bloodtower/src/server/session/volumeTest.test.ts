import type { Pack, TowerSnapshot } from "bloodtower-protocols";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../config.ts";
import { createPressLog } from "../control/lock.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { loadR1Pack } from "../pack/load.ts";
import { stepClock } from "../timing/clock.ts";
import { createTimingLog } from "../timing/log.ts";
import { createStatLog } from "../timing/stats.ts";
import { createSession, type SessionEngine } from "./engine.ts";

const JOIN = { url: "http://127.0.0.1:4787/join?code=048213", reachable: false };

const towerReading = (firmware?: string | null): TowerSnapshot => ({
  connection: "connected",
  battery: { state: "unavailable" },
  calibrated: { state: "known", calibrated: true },
  ...(firmware === undefined
    ? {}
    : {
        firmware:
          firmware === null ? { state: "unavailable" } : { state: "known", version: firmware },
      }),
});
const NO_TOWER: TowerSnapshot = {
  connection: "unavailable",
  battery: { state: "unavailable" },
  calibrated: { state: "unavailable" },
};

const loadPack = (): Pack => {
  const loaded = loadR1Pack(loadConfig().packsDir);
  if (!loaded.ok) throw new Error(loaded.issues.map((item) => item.message).join("\n"));
  return loaded.pack;
};

/** A joined iPad on Connect Tower, with a tower reading the test can change. */
const atTowerConnect = (options?: { declareStat?: boolean }) => {
  let reading: TowerSnapshot = NO_TOWER;
  const opened = openDatabase(":memory:");
  const store = createSessionStore(opened.db);
  const clock = stepClock();
  const pack = loadPack();
  const bound: Pack =
    options?.declareStat === false ? { ...pack, stats: { ...pack.stats, custom: [] } } : pack;
  const engine = createSession(bound, {
    sessionId: "run",
    joinCode: "048213",
    startedWall: clock.wall(),
    timing: createTimingLog(store, clock, "run"),
    stats: createStatLog(store, clock, "run"),
    presses: createPressLog(clock, (press) => store.insertPress("run", press)),
    saveRoster: (roster) => store.saveRoster(roster),
    tower: () => reading,
  });
  const joined = engine.join({ joinCode: "048213", formFactor: "ipad" });
  if (!joined.ok) throw new Error("join");
  engine.finishSplash();
  const win = (
    promptId: string,
    action: Parameters<SessionEngine["press"]>[2],
    option?: string,
    note?: string,
  ) => {
    const result = engine.press(joined.deviceId, promptId, action, option, undefined, note);
    if (!result.ok || !result.winner) throw new Error(`${promptId} did not win.`);
  };
  win("continue-pick-story-test", "continue");
  win("continue-game-settings", "continue");
  return {
    opened,
    store,
    engine,
    deviceId: joined.deviceId,
    win,
    setTower: (next: TowerSnapshot) => {
      reading = next;
    },
    toVolumeTest: () => win("continue-tower-connect", "continue"),
  };
};

const board = (engine: SessionEngine, tower: TowerSnapshot) =>
  engine.projectStoryboard(tower, JOIN).volumeTest;

describe("tower volume test screen", () => {
  it("follows Connect Tower, goes on to Party Join, and Back returns to Connect Tower", () => {
    const f = atTowerConnect();
    try {
      expect(f.engine.screen()).toBe("tower-connect");
      f.toVolumeTest();
      expect(f.engine.screen()).toBe("tower-volume-test");
      expect(f.engine.projectDevice(f.deviceId).backPromptId).toBe("back-tower-volume-test");
      f.win("back-tower-volume-test", "back");
      expect(f.engine.screen()).toBe("tower-connect");
      f.toVolumeTest();
      f.win("continue-tower-volume-test", "continue");
      expect(f.engine.screen()).toBe("party-join");
      const wins = f.store
        .loadRun("run")
        .presses.filter((press) => press.winner && press.screen === "tower-volume-test");
      expect(wins.map((press) => [press.promptId, press.nextScreen])).toEqual([
        ["back-tower-volume-test", "tower-connect"],
        ["continue-tower-volume-test", "party-join"],
      ]);
    } finally {
      f.opened.close();
    }
  });

  it("with no tower shows only the room-sound check: nothing to play, nothing queued", () => {
    const f = atTowerConnect();
    try {
      f.toVolumeTest();
      const device = f.engine.projectDevice(f.deviceId);
      expect(device.volumeTest).toMatchObject({ mode: "room", phase: "idle" });
      expect(device.volumePlayPromptId).toBeNull();
      expect(device.volumeAnswerPromptId).toBeNull();
      expect(device.prompt).toEqual({
        id: "continue-tower-volume-test",
        label: "Next: gather the party",
      });
      expect(f.engine.press(f.deviceId, "volume-play-0", "volume-play")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      expect(f.engine.takeVolumeRun()).toBeNull();
      expect(board(f.engine, NO_TOWER)).toMatchObject({
        mode: "room",
        phase: "idle",
        logged: null,
      });
    } finally {
      f.opened.close();
    }
  });

  it("queues one run on a winning Play press, with the balance check the first time only", () => {
    const f = atTowerConnect();
    try {
      f.setTower(towerReading("1.4.0"));
      f.toVolumeTest();
      const device = f.engine.projectDevice(f.deviceId);
      expect(device.volumeTest).toMatchObject({ mode: "tower", phase: "idle", runs: 0 });
      expect(device.volumePlayPromptId).toBe("volume-play-0");
      // A tower press is not a volume press, and a stale prompt id is refused.
      expect(f.engine.press(f.deviceId, "volume-play-7", "volume-play").ok).toBe(false);

      f.win("volume-play-0", "volume-play");
      expect(f.engine.projectDevice(f.deviceId).volumeTest).toMatchObject({
        phase: "levels",
        level: 0,
        runs: 1,
      });
      // Continue and a second Play wait while the tower plays.
      expect(f.engine.projectDevice(f.deviceId).prompt).toBeNull();
      expect(f.engine.projectDevice(f.deviceId).volumePlayPromptId).toBeNull();
      const first = f.engine.takeVolumeRun();
      expect(first).toMatchObject({ withBalance: true });
      expect(f.engine.takeVolumeRun()).toBeNull();

      if (!first) return;
      f.engine.volumeProgress(first.run, "levels", 2);
      expect(board(f.engine, towerReading())).toMatchObject({ phase: "levels", level: 2 });
      f.engine.volumeProgress(first.run, "balance-bed", null);
      f.engine.volumeProgress(first.run, "balance-tower", null);
      f.engine.volumeProgress(first.run, "asking", null);
      const asking = f.engine.projectDevice(f.deviceId);
      expect(asking.volumeTest).toMatchObject({ phase: "asking", level: null });
      expect(asking.volumeAnswerPromptId).toBe("volume-answer");
      // Play again is a fresh lock and repeats the levels only.
      expect(asking.volumePlayPromptId).toBe("volume-play-1");
      f.win("volume-play-1", "volume-play");
      expect(f.engine.takeVolumeRun()).toMatchObject({ withBalance: false });
      expect(board(f.engine, towerReading())).toMatchObject({ runs: 2 });
    } finally {
      f.opened.close();
    }
  });

  it("repeats the balance check after a first run that failed before reaching it", () => {
    const f = atTowerConnect();
    try {
      f.setTower(towerReading());
      f.toVolumeTest();
      f.win("volume-play-0", "volume-play");
      const run = f.engine.takeVolumeRun();
      if (!run) throw new Error("run");
      f.engine.volumeProgress(run.run, "levels", 1);
      f.engine.volumeFailed(run.run);
      expect(f.engine.projectDevice(f.deviceId).volumeTest).toMatchObject({
        phase: "idle",
        failed: true,
        level: null,
      });
      // Nothing is retried by itself; a press tries again, and still includes the balance.
      expect(f.engine.takeVolumeRun()).toBeNull();
      f.win("volume-play-1", "volume-play");
      expect(f.engine.takeVolumeRun()).toMatchObject({ withBalance: true });
    } finally {
      f.opened.close();
    }
  });

  it("repeats the balance check when its own sound failed", () => {
    const f = atTowerConnect();
    try {
      f.setTower(towerReading());
      f.toVolumeTest();
      f.win("volume-play-0", "volume-play");
      const run = f.engine.takeVolumeRun();
      if (!run) throw new Error("run");
      f.engine.volumeProgress(run.run, "balance-bed", null);
      f.engine.volumeProgress(run.run, "balance-tower", null);
      f.engine.volumeFailed(run.run);
      f.win("volume-play-1", "volume-play");
      expect(f.engine.takeVolumeRun()).toMatchObject({ withBalance: true });
    } finally {
      f.opened.close();
    }
  });

  it("logs the answer as the tower-volume-test stat with firmware and time, first answer wins", () => {
    const f = atTowerConnect();
    try {
      f.setTower(towerReading("1.4.0"));
      f.toVolumeTest();
      f.win("volume-play-0", "volume-play");
      const run = f.engine.takeVolumeRun();
      if (!run) throw new Error("run");
      // No answer before the question is asked.
      expect(f.engine.press(f.deviceId, "volume-answer", "volume-answer", "all-same")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      f.engine.volumeProgress(run.run, "asking", null);
      f.win("volume-answer", "volume-answer", "one-louder");
      const [event, ...rest] = f.store.loadRun("run").stats;
      expect(rest).toEqual([]);
      expect(event).toMatchObject({
        statId: "tower-volume-test",
        deviceId: f.deviceId,
        data: { answer: "one-louder", note: null, firmware: "1.4.0" },
      });
      expect(event?.atWall.endsWith("Z")).toBe(true);
      expect(board(f.engine, towerReading("1.4.0"))).toMatchObject({
        phase: "answered",
        answer: "one-louder",
        logged: { answer: "one-louder", note: null, firmware: "1.4.0" },
      });
      // A later answer loses; the first stands.
      expect(
        f.engine.press(f.deviceId, "volume-answer", "volume-answer", "all-same"),
      ).toMatchObject({
        ok: true,
        winner: false,
      });
      expect(f.store.loadRun("run").stats).toHaveLength(1);
    } finally {
      f.opened.close();
    }
  });

  it("keeps an unreported firmware unavailable, never blank or zero", () => {
    for (const firmware of [undefined, null]) {
      const f = atTowerConnect();
      try {
        f.setTower(towerReading(firmware));
        f.toVolumeTest();
        f.win("volume-play-0", "volume-play");
        const run = f.engine.takeVolumeRun();
        if (!run) throw new Error("run");
        f.engine.volumeProgress(run.run, "asking", null);
        f.win("volume-answer", "volume-answer", "all-differ");
        expect(f.store.loadRun("run").stats[0]?.data).toEqual({
          answer: "all-differ",
          note: null,
          firmware: null,
        });
        expect(board(f.engine, towerReading())?.logged?.firmware).toBeNull();
      } finally {
        f.opened.close();
      }
    }
  });

  it("takes the write-in text only with the write-in answer, logs it, and never sends it to a device", () => {
    const f = atTowerConnect();
    try {
      f.setTower(towerReading("1.4.0"));
      f.toVolumeTest();
      f.win("volume-play-0", "volume-play");
      const run = f.engine.takeVolumeRun();
      if (!run) throw new Error("run");
      f.engine.volumeProgress(run.run, "asking", null);
      const refused = [
        f.engine.press(f.deviceId, "volume-answer", "volume-answer", "write-in"),
        f.engine.press(f.deviceId, "volume-answer", "volume-answer", "write-in", undefined, "  "),
        f.engine.press(
          f.deviceId,
          "volume-answer",
          "volume-answer",
          "all-same",
          undefined,
          "extra",
        ),
        f.engine.press(f.deviceId, "volume-answer", "volume-answer", "very-loud"),
      ];
      expect(refused).toEqual(Array(4).fill({ ok: false, code: "invalid-state" }));
      f.win("volume-answer", "volume-answer", "write-in", "Level 1 was the loud one");
      expect(f.store.loadRun("run").stats[0]?.data).toEqual({
        answer: "write-in",
        note: "Level 1 was the loud one",
        firmware: "1.4.0",
      });
      expect(JSON.stringify(f.engine.projectDevice(f.deviceId))).not.toContain("loud one");
      expect(board(f.engine, towerReading())?.logged?.note).toBe("Level 1 was the loud one");
    } finally {
      f.opened.close();
    }
  });

  it("does not record the stat when the bound pack does not declare it", () => {
    const f = atTowerConnect({ declareStat: false });
    try {
      f.setTower(towerReading());
      f.toVolumeTest();
      f.win("volume-play-0", "volume-play");
      const run = f.engine.takeVolumeRun();
      if (!run) throw new Error("run");
      f.engine.volumeProgress(run.run, "asking", null);
      f.win("volume-answer", "volume-answer", "all-same");
      expect(f.store.loadRun("run").stats).toEqual([]);
      expect(f.engine.projectDevice(f.deviceId).volumeTest).toMatchObject({ phase: "answered" });
    } finally {
      f.opened.close();
    }
  });

  it("ignores progress from a run that Back left behind, and starts fresh on the next visit", () => {
    const f = atTowerConnect();
    try {
      f.setTower(towerReading());
      f.toVolumeTest();
      f.win("volume-play-0", "volume-play");
      const run = f.engine.takeVolumeRun();
      if (!run) throw new Error("run");
      expect(f.engine.volumeRunLive(run.run)).toBe(true);
      f.win("back-tower-volume-test", "back");
      expect(f.engine.volumeRunLive(run.run)).toBe(false);
      f.engine.volumeProgress(run.run, "asking", null);
      f.engine.volumeFailed(run.run);
      f.toVolumeTest();
      expect(f.engine.projectDevice(f.deviceId).volumeTest).toMatchObject({
        phase: "idle",
        runs: 0,
        failed: false,
        answer: null,
      });
      expect(f.engine.projectDevice(f.deviceId).volumePlayPromptId).toBe("volume-play-1");
    } finally {
      f.opened.close();
    }
  });

  it("shows the test on the volume screen only", () => {
    const f = atTowerConnect();
    try {
      expect(board(f.engine, NO_TOWER)).toBeNull();
      expect(f.engine.projectDevice(f.deviceId).volumeTest).toBeNull();
    } finally {
      f.opened.close();
    }
  });
});
