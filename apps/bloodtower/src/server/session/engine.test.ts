import type { ControlAction, Pack, TowerSnapshot } from "bloodtower-protocols";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../config.ts";
import { createPressLog } from "../control/lock.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { loadR1Pack, type StoryEntry } from "../pack/load.ts";
import { stepClock } from "../timing/clock.ts";
import { createTimingLog } from "../timing/log.ts";
import { createSession, type SessionEngine } from "./engine.ts";

const JOIN = { url: "http://127.0.0.1:4787/join?code=048213", reachable: false };
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
  graceMs?: number;
  onChange?: () => void;
  stories?: readonly StoryEntry[];
  storyId?: string;
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
    graceMs: options?.graceMs,
    onChange: options?.onChange,
    stories: options?.stories,
    storyId: options?.storyId,
  });
  return { opened, store, clock, engine };
};

const holdAll = (engine: SessionEngine, deviceId: string) => {
  for (const hunter of ["alpha", "beta", "gamma", "delta"]) {
    const result = engine.hold(deviceId, hunter, "take");
    if (!result.ok) throw new Error(result.code);
  }
};

afterEach(() => {
  vi.useRealTimers();
});

/** One step's press, which must win. A pick names its option. */
const winStep = (
  engine: SessionEngine,
  deviceId: string,
  promptId: string,
  action: ControlAction,
  option?: string,
) => {
  const result = engine.press(deviceId, promptId, action, option);
  if (!result.ok || !result.winner) throw new Error(`${promptId} did not win.`);
};

/** Leaves splash, walks the three steps before play, and presses Begin on the begin screen. */
const startPlay = (engine: SessionEngine, deviceId: string) => {
  engine.finishSplash();
  winStep(engine, deviceId, "continue-tower-connect", "continue");
  winStep(engine, deviceId, "continue-pick-story-test", "continue");
  winStep(engine, deviceId, "continue-party-join", "continue");
  winStep(engine, deviceId, "begin", "begin");
};

/** Plays from Begin to the Keeper at grey-stair.03, which is beat 5. */
const toKeeper = (engine: SessionEngine, deviceId: string) => {
  startPlay(engine, deviceId);
  for (let beat = 0; beat < 5; beat += 1) {
    winStep(engine, deviceId, `continue-${beat}`, "continue");
  }
};

describe("session", () => {
  it("blocks Begin until every hunter is held, and offers Begin only on the begin screen", () => {
    const { opened, engine } = setup();
    try {
      const joined = engine.join({ joinCode: "048213", formFactor: "ipad" });
      expect(joined.ok).toBe(true);
      if (!joined.ok) return;
      engine.finishSplash();
      expect(engine.press(joined.deviceId, "begin", "begin")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      winStep(engine, joined.deviceId, "continue-tower-connect", "continue");
      winStep(engine, joined.deviceId, "continue-pick-story-test", "continue");
      expect(engine.projectStoryboard(TOWER, JOIN).gate.canBegin).toBe(false);
      expect(engine.projectStoryboard(TOWER, JOIN).prompt).toBeNull();
      expect(engine.press(joined.deviceId, "continue-party-join", "continue")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      holdAll(engine, joined.deviceId);
      const party = engine.projectStoryboard(TOWER, JOIN);
      const { pack } = packOrThrow();
      expect(party.packId).toBe(pack.pack_id);
      expect(party.hunters.map((hunter) => hunter.portrait)).toEqual(
        pack.hunters.map((hunter) => hunter.portrait),
      );
      expect(party.gate).toEqual({ canBegin: true, unheld: [] });
      expect(party.prompt).toEqual({ id: "continue-party-join", label: "Next: set up the story" });
      winStep(engine, joined.deviceId, "continue-party-join", "continue");
      const board = engine.projectStoryboard(TOWER, JOIN);
      expect(board.screen).toBe("begin");
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
      startPlay(engine, alpha.deviceId);
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
      expect(JSON.stringify(board)).not.toContain("Only Agnes hears this.");
      expect(JSON.stringify(board)).not.toContain("ipad:");
      expect(board.moment?.text).toBe("Each hunter reads alone.");
      const alphaView = engine.projectDevice(alpha.deviceId);
      const betaView = engine.projectDevice(beta.deviceId);
      expect(alphaView.views.find((view) => view.hunter === "alpha")?.privateMoment?.text).toBe(
        "Only Agnes hears this.",
      );
      expect(JSON.stringify(betaView)).not.toContain("Only Agnes hears this.");
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
      startPlay(engine, joined.deviceId);
      expect(engine.projectStoryboard(TOWER, JOIN).moment?.text).toBe("Emeric is not in the hall.");
      engine.press(joined.deviceId, "continue-0", "continue");
      const duringPrivate = JSON.stringify(engine.projectDevice(joined.deviceId));
      expect(duringPrivate).not.toContain("Only Emeric hears this.");
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
      startPlay(global.engine, joined.deviceId);
      global.engine.press(joined.deviceId, "continue-0", "continue");
      expect(
        global.engine.projectDevice(joined.deviceId).views.find((view) => view.hunter === "delta")
          ?.privateMoment?.text,
      ).toBe("Only Emeric hears this.");
      expect(JSON.stringify(global.engine.projectStoryboard(TOWER, JOIN))).not.toContain(
        "Only Emeric hears this.",
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
      startPlay(engine, beta.deviceId);
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
      startPlay(engine, alpha.deviceId);
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

  it("releases a connect lock the reading has dropped before deciding a batch", () => {
    let connection: TowerSnapshot["connection"] = "disconnected";
    const { opened, engine } = setup({ tower: () => ({ ...TOWER, connection }) });
    try {
      const alpha = engine.join({ joinCode: "048213", formFactor: "ipad" });
      const beta = engine.join({ joinCode: "048213", formFactor: "phone" });
      if (!alpha.ok || !beta.ok) throw new Error("join");
      holdAll(engine, alpha.deviceId);
      expect(engine.press(alpha.deviceId, "tower-connect", "tower-connect")).toMatchObject({
        winner: true,
      });
      connection = "connecting";
      expect(engine.lockFor("tower-connect")?.winnerDeviceId).toBe(alpha.deviceId);
      // The attempt failed. No other call reconciles before the batch.
      connection = "disconnected";
      const batch = engine.pressAll([
        { deviceId: beta.deviceId, promptId: "tower-connect", action: "tower-connect" },
        { deviceId: alpha.deviceId, promptId: "tower-connect", action: "tower-connect" },
      ]);
      expect(batch.map((result) => (result.ok ? result.winner : false))).toEqual([true, false]);
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
      expect(engine.lockFor("tower-connect")).toBeNull();
      connection = "disconnected";
      expect(engine.press(alpha.deviceId, "tower-connect", "tower-connect")).toMatchObject({
        ok: true,
        winner: true,
      });
      expect(engine.press(beta.deviceId, "tower-connect", "tower-connect")).toMatchObject({
        ok: true,
        winner: true,
      });
      connection = "connecting";
      expect(engine.lockFor("tower-connect")?.winnerDeviceId).toBe(beta.deviceId);
      expect(engine.press(alpha.deviceId, "tower-connect", "tower-connect")).toMatchObject({
        ok: true,
        winner: false,
      });
      connection = "connected";
      expect(engine.press(alpha.deviceId, "tower-connect", "tower-connect")).toMatchObject({
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
      startPlay(engine, alpha.deviceId);
      engine.press(alpha.deviceId, "continue-0", "continue");
      engine.press(alpha.deviceId, "continue-1", "continue");
      const board = engine.projectStoryboard(TOWER, JOIN);
      expect(board.moment?.fallbackAudio).toBe("sfx.bell");
      expect(board.moment?.text).toBe("A bell marks the step.");
      engine.press(alpha.deviceId, "continue-2", "continue");
      expect(engine.projectStoryboard(TOWER, JOIN).moment?.id).toBe("grey-stair.01");
      engine.press(alpha.deviceId, "continue-3", "continue");
      engine.press(alpha.deviceId, "continue-4", "continue");
      expect(engine.projectStoryboard(TOWER, JOIN).moment?.id).toBe("grey-stair.03");
      expect(engine.projectStoryboard(TOWER, JOIN).moment?.kind).toBe("clip");
      // The Keeper has three lines: one Continue each, and the last one ends the scene.
      engine.press(alpha.deviceId, "continue-5-0", "continue");
      engine.press(alpha.deviceId, "continue-5-1", "continue");
      engine.press(alpha.deviceId, "continue-5-2", "continue");
      engine.press(alpha.deviceId, "pick-6", "pick", "oil-the-hinge");
      engine.press(alpha.deviceId, "continue-7", "continue");
      expect(engine.projectStoryboard(TOWER, JOIN).prompt).toBeNull();
      const marks = store.loadRun("run").marks;
      expect(marks.some((mark) => mark.kind === "cue" && mark.subject === "bell")).toBe(true);
      expect(marks.some((mark) => mark.kind === "phase" && mark.endMonoMs !== null)).toBe(true);
      expect(store.loadRun("run").session.packVersion).toBe("0.1.0");
    } finally {
      opened.close();
    }
  });
  it("keeps a dropped device's hunters claimed for the grace period, shown as disconnected, then unclaims them", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { opened, engine } = setup({ onChange });
    try {
      const alpha = engine.join({ joinCode: "048213", formFactor: "ipad" });
      if (!alpha.ok) throw new Error("join");
      holdAll(engine, alpha.deviceId);
      engine.disconnect(alpha.deviceId);

      const dropped = engine.projectStoryboard(TOWER, JOIN);
      expect(dropped.gate).toEqual({ canBegin: true, unheld: [] });
      for (const hunter of dropped.hunters) {
        expect(hunter).toMatchObject({ holders: [alpha.deviceId], disconnected: true });
      }

      vi.advanceTimersByTime(60_000 - 1);
      expect(engine.projectStoryboard(TOWER, JOIN).hunters[0]?.holders).toEqual([alpha.deviceId]);
      expect(onChange).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      const released = engine.projectStoryboard(TOWER, JOIN);
      expect(released.gate).toEqual({
        canBegin: false,
        unheld: ["alpha", "beta", "gamma", "delta"],
      });
      for (const hunter of released.hunters) {
        expect(hunter).toMatchObject({ holders: [], disconnected: false });
      }
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(engine.roster().holdings).toEqual([]);
    } finally {
      engine.close();
      opened.close();
    }
  });

  it("restores the same hunters on a rejoin inside the grace period and cancels the release", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { opened, engine } = setup({ onChange });
    try {
      const alpha = engine.join({ joinCode: "048213", formFactor: "ipad" });
      if (!alpha.ok) throw new Error("join");
      holdAll(engine, alpha.deviceId);
      engine.disconnect(alpha.deviceId);
      vi.advanceTimersByTime(30_000);

      const back = engine.rejoin(alpha.token);
      expect(back).toEqual({
        ok: true,
        deviceId: alpha.deviceId,
        held: ["alpha", "beta", "gamma", "delta"],
      });
      const restored = engine.projectStoryboard(TOWER, JOIN);
      expect(restored.hunters.every((hunter) => !hunter.disconnected)).toBe(true);

      vi.advanceTimersByTime(120_000);
      expect(engine.projectStoryboard(TOWER, JOIN).gate.unheld).toEqual([]);
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      engine.close();
      opened.close();
    }
  });

  it("pauses on the unclaimed hunter when a dropped holder's grace ends during play", () => {
    vi.useFakeTimers();
    const { opened, engine } = setup();
    try {
      const alpha = engine.join({ joinCode: "048213", formFactor: "ipad" });
      const beta = engine.join({ joinCode: "048213", formFactor: "phone" });
      if (!alpha.ok || !beta.ok) throw new Error("join");
      engine.hold(alpha.deviceId, "alpha", "take");
      for (const hunter of ["beta", "gamma", "delta"]) engine.hold(beta.deviceId, hunter, "take");
      startPlay(engine, beta.deviceId);
      engine.disconnect(alpha.deviceId);
      expect(engine.projectStoryboard(TOWER, JOIN).pause).toEqual({
        cause: "disconnect",
        hunter: "alpha",
      });

      vi.advanceTimersByTime(60_000);
      const board = engine.projectStoryboard(TOWER, JOIN);
      expect(board.stage).toBe("paused");
      expect(board.pause).toEqual({ cause: "disconnect", hunter: "alpha" });
      expect(board.gate.unheld).toEqual(["alpha"]);
      expect(engine.press(beta.deviceId, "resume-1", "resume")).toMatchObject({
        ok: false,
        code: "invalid-state",
      });
    } finally {
      engine.close();
      opened.close();
    }
  });

  it("does not release hunters after close, so the host can shut down with timers pending", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { opened, engine } = setup({ onChange });
    try {
      const alpha = engine.join({ joinCode: "048213", formFactor: "ipad" });
      if (!alpha.ok) throw new Error("join");
      holdAll(engine, alpha.deviceId);
      engine.disconnect(alpha.deviceId);
      engine.close();
      vi.advanceTimersByTime(120_000);
      expect(engine.roster().holdings).toHaveLength(4);
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      engine.close();
      opened.close();
    }
  });

  it("walks splash, tower-connect, pick-story, party-join and begin in order, and refuses Quit before play", () => {
    const { opened, engine } = setup();
    try {
      const alpha = engine.join({ joinCode: "048213", formFactor: "ipad" });
      if (!alpha.ok) throw new Error("join");
      expect(engine.screen()).toBe("splash");
      expect(engine.projectStoryboard(TOWER, JOIN)).toMatchObject({
        screen: "splash",
        stage: "lobby",
        prompt: null,
      });
      engine.finishSplash();
      expect(engine.screen()).toBe("tower-connect");
      expect(engine.projectStoryboard(TOWER, JOIN).prompt).toEqual({
        id: "continue-tower-connect",
        label: "Next: pick a story",
      });
      expect(engine.press(alpha.deviceId, "quit", "quit")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      expect(engine.projectDevice(alpha.deviceId)).toMatchObject({
        screen: "tower-connect",
        quitPromptId: null,
      });
      holdAll(engine, alpha.deviceId);
      winStep(engine, alpha.deviceId, "continue-tower-connect", "continue");
      expect(engine.screen()).toBe("pick-story");
      const pack = packOrThrow().pack;
      expect(pack.set_pieces.map((piece) => piece.id)).not.toContain(pack.title);
      expect(pack.moments.map((moment) => moment.id)).not.toContain(pack.title);
      expect(engine.projectDevice(alpha.deviceId).prompt).toEqual({
        id: "continue-pick-story-test",
        label: `Choose ${pack.title}`,
      });
      winStep(engine, alpha.deviceId, "continue-pick-story-test", "continue");
      expect(engine.screen()).toBe("party-join");
      winStep(engine, alpha.deviceId, "continue-party-join", "continue");
      expect(engine.screen()).toBe("begin");
      winStep(engine, alpha.deviceId, "begin", "begin");
      expect(engine.screen()).toBe("play");
      expect(engine.projectStoryboard(TOWER, JOIN)).toMatchObject({
        screen: "play",
        stage: "playing",
      });
      expect(engine.projectDevice(alpha.deviceId).quitPromptId).toBe("quit");
    } finally {
      opened.close();
    }
  });

  it("lets the first press win on each step, ignores a later press for that step, and logs every press with its screen", () => {
    const { opened, store, engine } = setup();
    try {
      const alpha = engine.join({ joinCode: "048213", formFactor: "ipad" });
      const beta = engine.join({ joinCode: "048213", formFactor: "phone" });
      if (!alpha.ok || !beta.ok) throw new Error("join");
      engine.finishSplash();
      const batch = engine.pressAll([
        { deviceId: alpha.deviceId, promptId: "continue-tower-connect", action: "continue" },
        { deviceId: beta.deviceId, promptId: "continue-tower-connect", action: "continue" },
      ]);
      expect(batch.map((result) => (result.ok ? result.winner : result.code))).toEqual([
        true,
        false,
      ]);
      expect(engine.screen()).toBe("pick-story");
      // The flow moved on. A press on the step it left is ignored, not an error.
      expect(engine.press(beta.deviceId, "continue-tower-connect", "continue")).toMatchObject({
        ok: true,
        winner: false,
      });
      expect(engine.screen()).toBe("pick-story");

      const presses = store
        .loadRun("run")
        .presses.filter((press) => press.promptId === "continue-tower-connect");
      expect(
        presses.map((press) => ({
          device: press.deviceId,
          winner: press.winner,
          screen: press.screen,
          nextScreen: press.nextScreen,
        })),
      ).toEqual([
        {
          device: alpha.deviceId,
          winner: true,
          screen: "tower-connect",
          nextScreen: "pick-story",
        },
        // Arrived after the flow moved in the same batch, so it records the screen then held.
        { device: beta.deviceId, winner: false, screen: "pick-story", nextScreen: null },
        { device: beta.deviceId, winner: false, screen: "pick-story", nextScreen: null },
      ]);
    } finally {
      opened.close();
    }
  });

  it("quits play on the first press, closes every open mark, and ignores a later quit", () => {
    const { opened, store, engine } = setup();
    try {
      const alpha = engine.join({ joinCode: "048213", formFactor: "ipad" });
      const beta = engine.join({ joinCode: "048213", formFactor: "phone" });
      if (!alpha.ok || !beta.ok) throw new Error("join");
      holdAll(engine, alpha.deviceId);
      startPlay(engine, alpha.deviceId);
      expect(store.loadRun("run").marks.some((mark) => mark.endMonoMs === null)).toBe(true);

      const quit = engine.pressAll([
        { deviceId: beta.deviceId, promptId: "quit", action: "quit" },
        { deviceId: alpha.deviceId, promptId: "quit", action: "quit" },
      ]);
      expect(quit.map((result) => (result.ok ? result.winner : result.code))).toEqual([
        true,
        false,
      ]);
      expect(engine.screen()).toBe("quit");
      expect(engine.projectStoryboard(TOWER, JOIN)).toMatchObject({
        screen: "quit",
        stage: "ended",
        prompt: null,
        moment: null,
        pause: null,
      });
      expect(engine.projectDevice(alpha.deviceId)).toMatchObject({
        screen: "quit",
        quitPromptId: null,
      });
      expect(engine.press(alpha.deviceId, "continue-0", "continue")).toEqual({
        ok: false,
        code: "invalid-state",
      });

      const run = store.loadRun("run");
      expect(run.marks.filter((mark) => mark.endMonoMs === null)).toEqual([]);
      expect(
        run.presses
          .filter((press) => press.promptId === "quit")
          .map((press) => [press.deviceId, press.winner, press.screen, press.nextScreen]),
      ).toEqual([
        [beta.deviceId, true, "play", "quit"],
        [alpha.deviceId, false, "quit", null],
      ]);
    } finally {
      opened.close();
    }
  });

  /**
   * The door pick-card targets ipad:all (D23): every joined iPad gets its options from
   * choices.yaml, and the board shows only the prompt text.
   */
  it("sends the door pick-card targeting ipad:all to a joined iPad with Oil and Force options", () => {
    const { pack } = packOrThrow();
    const door = pack.moments.find((moment) => moment.id === "grey-stair.door-choice");
    expect(door).toMatchObject({ kind: "pick-card", target: "ipad:all" });

    const { opened, engine } = setup();
    try {
      const joined = engine.join({ joinCode: "048213", formFactor: "ipad" });
      if (!joined.ok) throw new Error("join");
      holdAll(engine, joined.deviceId);
      toKeeper(engine, joined.deviceId);
      expect(engine.projectStoryboard(TOWER, JOIN).moment?.id).toBe("grey-stair.03");
      // The Keeper's three lines take three Continue presses; the door waits for the last.
      winStep(engine, joined.deviceId, "continue-5-0", "continue");
      winStep(engine, joined.deviceId, "continue-5-1", "continue");
      winStep(engine, joined.deviceId, "continue-5-2", "continue");
      expect(engine.projectStoryboard(TOWER, JOIN).moment?.id).toBe("grey-stair.door-choice");
      const shown = JSON.stringify(engine.projectDevice(joined.deviceId));
      expect(shown).toMatch(/Oil/i);
      expect(shown).toMatch(/Force/i);
    } finally {
      opened.close();
    }
  });

  it("routes a pick to the iPads, lets the first pick win, and refuses an option that is not offered", () => {
    const { opened, engine } = setup();
    try {
      const alpha = engine.join({ joinCode: "048213", formFactor: "ipad" });
      const beta = engine.join({ joinCode: "048213", formFactor: "ipad" });
      if (!alpha.ok || !beta.ok) throw new Error("join");
      holdAll(engine, alpha.deviceId);
      toKeeper(engine, alpha.deviceId);
      for (const line of [0, 1, 2]) {
        winStep(engine, alpha.deviceId, `continue-5-${line}`, "continue");
      }
      const alphaState = engine.projectDevice(alpha.deviceId);
      const betaState = engine.projectDevice(beta.deviceId);
      expect(alphaState.pick?.options.map((option) => option.id)).toEqual([
        "oil-the-hinge",
        "force-it",
      ]);
      expect(betaState.pick).toEqual(alphaState.pick);
      expect(alphaState.prompt).toEqual({ id: "pick-6", label: "Oil the hinge, or force it." });
      expect(engine.projectStoryboard(TOWER, JOIN).moment?.kind).toBe("pick-card");

      expect(engine.press(alpha.deviceId, "pick-6", "pick", "kept")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      expect(engine.press(alpha.deviceId, "pick-6", "pick")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      expect(engine.press(alpha.deviceId, "pick-6", "continue")).toEqual({
        ok: false,
        code: "invalid-state",
      });

      expect(engine.press(beta.deviceId, "pick-6", "pick", "force-it")).toMatchObject({
        ok: true,
        winner: true,
      });
      expect(engine.pickedOption("grey-stair.door-choice")).toBe("force-it");
      expect(engine.projectStoryboard(TOWER, JOIN).moment?.id).toBe("grey-stair.04");
      expect(engine.projectDevice(alpha.deviceId).pick).toBeNull();
    } finally {
      opened.close();
    }
  });

  it("moves the Keeper one line per Continue, takes a line-ended report only for the current line, and ends on the last line", () => {
    const { opened, engine } = setup();
    try {
      const alpha = engine.join({ joinCode: "048213", formFactor: "ipad" });
      if (!alpha.ok) throw new Error("join");
      holdAll(engine, alpha.deviceId);
      toKeeper(engine, alpha.deviceId);
      expect(engine.projectStoryboard(TOWER, JOIN).keeperLine).toBe(0);

      // A line that is not the current one does nothing, and so does the wrong moment.
      expect(engine.keeperLineEnded("grey-stair.03", 1)).toBe(false);
      expect(engine.keeperLineEnded("grey-stair.02", 0)).toBe(false);
      expect(engine.projectStoryboard(TOWER, JOIN).keeperLine).toBe(0);

      // Line 0 ends on the board: the server moves to line 1, and a repeat does nothing.
      expect(engine.keeperLineEnded("grey-stair.03", 0)).toBe(true);
      expect(engine.keeperLineEnded("grey-stair.03", 0)).toBe(false);
      expect(engine.projectStoryboard(TOWER, JOIN).keeperLine).toBe(1);
      expect(engine.projectDevice(alpha.deviceId).prompt?.id).toBe("continue-5-1");

      // Continue moves line 1 to 2, so a late report for line 1 is ignored.
      winStep(engine, alpha.deviceId, "continue-5-1", "continue");
      expect(engine.keeperLineEnded("grey-stair.03", 1)).toBe(false);
      expect(engine.projectStoryboard(TOWER, JOIN).keeperLine).toBe(2);
      expect(engine.projectStoryboard(TOWER, JOIN).moment?.id).toBe("grey-stair.03");

      // The last line finishing ends the scene, and the door comes up.
      expect(engine.keeperLineEnded("grey-stair.03", 2)).toBe(true);
      expect(engine.projectStoryboard(TOWER, JOIN).keeperLine).toBeNull();
      expect(engine.projectStoryboard(TOWER, JOIN).moment?.id).toBe("grey-stair.door-choice");
      expect(engine.keeperLineEnded("grey-stair.03", 2)).toBe(false);
    } finally {
      opened.close();
    }
  });

  it("does not project an ipad:all pick onto a joined phone", () => {
    const { opened, engine } = setup();
    try {
      const ipad = engine.join({ joinCode: "048213", formFactor: "ipad" });
      const phone = engine.join({ joinCode: "048213", formFactor: "phone" });
      if (!ipad.ok || !phone.ok) throw new Error("join");
      holdAll(engine, ipad.deviceId);
      toKeeper(engine, ipad.deviceId);
      for (const line of [0, 1, 2]) {
        winStep(engine, ipad.deviceId, `continue-5-${line}`, "continue");
      }
      expect(engine.projectDevice(ipad.deviceId).pick?.options.map((option) => option.id)).toEqual([
        "oil-the-hinge",
        "force-it",
      ]);
      expect(engine.projectDevice(phone.deviceId).pick).toBeNull();
    } finally {
      opened.close();
    }
  });

  it("ignores keeperLineEnded while the session is paused", () => {
    const { opened, engine } = setup();
    try {
      const alpha = engine.join({ joinCode: "048213", formFactor: "ipad" });
      if (!alpha.ok) throw new Error("join");
      holdAll(engine, alpha.deviceId);
      toKeeper(engine, alpha.deviceId);
      expect(engine.projectStoryboard(TOWER, JOIN).keeperLine).toBe(0);
      const pauseId = engine.pausePromptId();
      if (!pauseId) throw new Error("pause");
      winStep(engine, alpha.deviceId, pauseId, "pause");
      expect(engine.projectStoryboard(TOWER, JOIN).stage).toBe("paused");
      expect(engine.keeperLineEnded("grey-stair.03", 0)).toBe(false);
      expect(engine.projectStoryboard(TOWER, JOIN).keeperLine).toBe(0);
    } finally {
      opened.close();
    }
  });
});

describe("pick story", () => {
  /** The test pack as the door "test", a second door with other hunter names, and a greyed one. */
  const doors = (): { stories: StoryEntry[]; first: Pack; second: Pack } => {
    const first = packOrThrow().pack;
    const second: Pack = {
      ...first,
      pack_id: "second",
      title: "Second story",
      hunters: first.hunters.map((hunter) => ({ ...hunter, name: `${hunter.name} the Second` })),
    };
    const card = (pack: Pack, id: string) => ({
      id,
      title: pack.title,
      blurb: null,
      tagline: null,
      cover: null,
      players: pack.players,
      playable: true,
      loadable: true,
    });
    return {
      first,
      second,
      stories: [
        { card: card(first, "test"), pack: first, issues: [], assets: null },
        { card: card(second, "second"), pack: second, issues: [], assets: null },
        {
          card: {
            id: "zzz",
            title: "zzz",
            blurb: null,
            tagline: null,
            cover: null,
            players: null,
            playable: false,
            loadable: false,
          },
          pack: null,
          issues: [],
          assets: null,
        },
      ],
    };
  };

  /** Joined iPad on the Pick Story screen. */
  const atPickStory = (options?: Parameters<typeof setup>[0]) => {
    const made = setup(options);
    const joined = made.engine.join({ joinCode: "048213", formFactor: "ipad" });
    if (!joined.ok) throw new Error("join");
    made.engine.finishSplash();
    winStep(made.engine, joined.deviceId, "continue-tower-connect", "continue");
    return { ...made, deviceId: joined.deviceId };
  };

  it("lists the one loaded pack as a preselected door when no list is given", () => {
    const { opened, engine, deviceId } = atPickStory();
    try {
      const expected = {
        cards: [
          {
            id: "test",
            title: "Proving ground",
            blurb: "A long-lived proving ground for new ideas.",
            tagline: "A long-lived proving ground for new ideas.",
            cover: null,
            players: { min: 1, max: 4 },
            playable: true,
            loadable: true,
          },
        ],
        focus: "test",
        current: "test",
      };
      expect(engine.projectStoryboard(TOWER, JOIN).stories).toEqual(expected);
      expect(engine.projectDevice(deviceId).stories).toEqual(expected);
      expect(engine.projectDevice(deviceId).prompt).toEqual({
        id: "continue-pick-story-test",
        label: "Choose Proving ground",
      });
    } finally {
      opened.close();
    }
  });

  it("moves the highlight on Pick Story only, without a press, a lock or a screen change", () => {
    const { stories } = doors();
    const { opened, store, engine, deviceId } = atPickStory({ stories, storyId: "test" });
    try {
      expect(engine.focusStory(deviceId, "second")).toEqual({ ok: true });
      const board = engine.projectStoryboard(TOWER, JOIN);
      expect(board.stories?.focus).toBe("second");
      expect(board.stories?.current).toBe("test");
      expect(board.prompt).toEqual({
        id: "continue-pick-story-second",
        label: "Choose Second story",
      });
      expect(engine.screen()).toBe("pick-story");
      expect(engine.focusStory(deviceId, "nope")).toEqual({ ok: false, code: "invalid-state" });
      expect(engine.focusStory("device-99", "test")).toEqual({
        ok: false,
        code: "unknown-device",
      });
      expect(engine.projectStoryboard(TOWER, JOIN).stories?.focus).toBe("second");
      // Only the tower-connect press and nothing for the highlight.
      expect(store.loadRun("run").presses.map((press) => press.promptId)).toEqual([
        "continue-tower-connect",
      ]);
    } finally {
      opened.close();
    }
  });

  it("refuses to move the highlight off Pick Story", () => {
    const { stories } = doors();
    const { opened, engine } = setup({ stories, storyId: "test" });
    try {
      const joined = engine.join({ joinCode: "048213", formFactor: "ipad" });
      if (!joined.ok) throw new Error("join");
      engine.finishSplash();
      expect(engine.focusStory(joined.deviceId, "second")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      winStep(engine, joined.deviceId, "continue-tower-connect", "continue");
      winStep(engine, joined.deviceId, "continue-pick-story-test", "continue");
      expect(engine.focusStory(joined.deviceId, "second")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      expect(engine.projectStoryboard(TOWER, JOIN).stories?.focus).toBe("test");
    } finally {
      opened.close();
    }
  });

  it("refuses a Choose made for a story that is no longer highlighted", () => {
    const { stories } = doors();
    const { opened, engine, deviceId } = atPickStory({ stories, storyId: "test" });
    try {
      engine.focusStory(deviceId, "second");
      expect(engine.press(deviceId, "continue-pick-story-test", "continue")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      expect(engine.screen()).toBe("pick-story");
    } finally {
      opened.close();
    }
  });

  it("offers no Choose on a door that can't load", () => {
    const { stories } = doors();
    const { opened, engine, deviceId } = atPickStory({ stories, storyId: "test" });
    try {
      engine.focusStory(deviceId, "zzz");
      expect(engine.projectDevice(deviceId).prompt).toBeNull();
      expect(engine.press(deviceId, "continue-pick-story-zzz", "continue")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      expect(engine.screen()).toBe("pick-story");
    } finally {
      opened.close();
    }
  });

  it("binds the chosen story: its hunters, a clean roster, and the pack id in the saved roster", () => {
    const { stories } = doors();
    const { opened, engine, deviceId } = atPickStory({ stories, storyId: "test" });
    try {
      holdAll(engine, deviceId);
      expect(engine.roster().holdings).toHaveLength(4);
      engine.focusStory(deviceId, "second");
      winStep(engine, deviceId, "continue-pick-story-second", "continue");
      expect(engine.screen()).toBe("party-join");
      expect(engine.hunterRoster().map((hunter) => hunter.name)).toContain("Agnes the Second");
      const board = engine.projectStoryboard(TOWER, JOIN);
      expect(board.stories?.current).toBe("second");
      expect(board.hunters.every((hunter) => hunter.holders.length === 0)).toBe(true);
      expect(board.gate.canBegin).toBe(false);
      expect(engine.roster().packId).toBe("second");
      expect(engine.roster().holdings).toEqual([]);
    } finally {
      opened.close();
    }
  });

  it("keeps the holdings when the table chooses the story it is already on", () => {
    const { stories } = doors();
    const { opened, engine, deviceId } = atPickStory({ stories, storyId: "test" });
    try {
      holdAll(engine, deviceId);
      winStep(engine, deviceId, "continue-pick-story-test", "continue");
      expect(engine.screen()).toBe("party-join");
      expect(engine.roster().packId).toBe("test");
      expect(engine.projectStoryboard(TOWER, JOIN).gate.canBegin).toBe(true);
    } finally {
      opened.close();
    }
  });

  /** The doors plus a `playable: false` pack: listed, choosable, never bound. */
  const doorsWithVellmoor = (): StoryEntry[] => [
    ...doors().stories,
    {
      card: {
        id: "vellmoor",
        title: "The Count of Vellmoor",
        blurb: "The Count has taken Lenka.",
        tagline: "The Count has taken Lenka.",
        cover: "/packs/vellmoor/assets/cover.png",
        players: null,
        playable: false,
        loadable: true,
      },
      pack: null,
      issues: [],
      assets: null,
    },
  ];

  it("stops a chosen playable: false story at Not playable yet, binds nothing, and Back returns", () => {
    const { opened, engine, deviceId } = atPickStory({
      stories: doorsWithVellmoor(),
      storyId: "test",
    });
    try {
      engine.focusStory(deviceId, "vellmoor");
      expect(engine.projectDevice(deviceId).prompt).toEqual({
        id: "continue-pick-story-vellmoor",
        label: "Choose The Count of Vellmoor",
      });
      winStep(engine, deviceId, "continue-pick-story-vellmoor", "continue");
      expect(engine.screen()).toBe("not-playable");
      const board = engine.projectStoryboard(TOWER, JOIN);
      expect(board.screen).toBe("not-playable");
      expect(board.stories?.current).toBe("test");
      expect(board.prompt).toEqual({ id: "back-not-playable", label: "Back" });
      expect(engine.roster().packId).toBe("test");

      // Only Back is offered here: no Continue. The Choose press that won is locked, so a
      // repeat is recorded as a losing press and changes nothing.
      expect(engine.press(deviceId, "continue-pick-story-vellmoor", "continue")).toMatchObject({
        ok: true,
        winner: false,
      });
      expect(engine.screen()).toBe("not-playable");
      expect(engine.press(deviceId, "back-not-playable", "back")).toMatchObject({ winner: true });
      expect(engine.screen()).toBe("pick-story");
      expect(engine.projectDevice(deviceId).prompt).toEqual({
        id: "continue-pick-story-vellmoor",
        label: "Choose The Count of Vellmoor",
      });
    } finally {
      opened.close();
    }
  });

  it("refuses Back anywhere but Not playable yet", () => {
    const { opened, engine, deviceId } = atPickStory({
      stories: doorsWithVellmoor(),
      storyId: "test",
    });
    try {
      expect(engine.press(deviceId, "back-not-playable", "back")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      expect(engine.screen()).toBe("pick-story");
    } finally {
      opened.close();
    }
  });

  it("starts the chosen story at its own first beat on Begin", () => {
    const { stories } = doors();
    const { opened, engine, deviceId } = atPickStory({ stories, storyId: "test" });
    try {
      engine.focusStory(deviceId, "second");
      winStep(engine, deviceId, "continue-pick-story-second", "continue");
      holdAll(engine, deviceId);
      winStep(engine, deviceId, "continue-party-join", "continue");
      winStep(engine, deviceId, "begin", "begin");
      expect(engine.projectStoryboard(TOWER, JOIN).moment?.id).toBe("proving-ground.01");
    } finally {
      opened.close();
    }
  });
});
