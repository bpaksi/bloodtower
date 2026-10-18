import {
  type ControlAction,
  type GameSetting,
  type Pack,
  packSchema,
  SETTING_ID_MAX,
  SETTING_LABEL_MAX,
  SETTING_OPTIONS_MAX,
  SETTINGS_MAX,
  type TowerMode,
  type TowerSnapshot,
} from "bloodtower-protocols";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../config.ts";
import { createPressLog } from "../control/lock.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import type { PackAssetIndex } from "../pack/assets.ts";
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

const LENGTH_SETTING: GameSetting = {
  id: "length",
  label: "Length",
  options: [
    { id: "short", label: "Short" },
    { id: "standard", label: "Standard" },
    { id: "long", label: "Long" },
  ],
  default: "standard",
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

/** One step's press, which must win. A pick names its option; a set its option and setting. */
const winStep = (
  engine: SessionEngine,
  deviceId: string,
  promptId: string,
  action: ControlAction,
  option?: string,
  setting?: string,
) => {
  const result = engine.press(deviceId, promptId, action, option, setting);
  if (!result.ok || !result.winner) throw new Error(`${promptId} did not win.`);
};

/** Presses Done on each of the bound pack's setup steps, from the first to Begin. */
const doSetup = (engine: SessionEngine, deviceId: string) => {
  while (engine.screen() === "setup") {
    const step = engine.projectStoryboard(TOWER, null).setupStep?.step;
    if (!step) throw new Error("The setup screen has no step.");
    winStep(engine, deviceId, `continue-setup-${step.id}`, "continue");
  }
};

/** Leaves splash, walks the steps before play, and presses Begin on the begin screen. */
const startPlay = (engine: SessionEngine, deviceId: string) => {
  engine.finishSplash();
  winStep(engine, deviceId, "continue-pick-story-test", "continue");
  winStep(engine, deviceId, "continue-game-settings", "continue");
  winStep(engine, deviceId, "continue-tower-connect", "continue");
  winStep(engine, deviceId, "continue-tower-volume-test", "continue");
  winStep(engine, deviceId, "continue-party-join", "continue");
  doSetup(engine, deviceId);
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
      winStep(engine, joined.deviceId, "continue-pick-story-test", "continue");
      winStep(engine, joined.deviceId, "continue-game-settings", "continue");
      winStep(engine, joined.deviceId, "continue-tower-connect", "continue");
      winStep(engine, joined.deviceId, "continue-tower-volume-test", "continue");
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
      doSetup(engine, joined.deviceId);
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

  it("walks splash, pick-story, game-settings, tower-connect, party-join and begin in order, and refuses Quit before play", () => {
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
      // Splash goes straight to Pick Story. Connect Tower comes after Game settings (R3-UI-22).
      engine.finishSplash();
      expect(engine.screen()).toBe("pick-story");
      expect(engine.press(alpha.deviceId, "continue-tower-connect", "continue")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      holdAll(engine, alpha.deviceId);
      const pack = packOrThrow().pack;
      expect(pack.set_pieces.map((piece) => piece.id)).not.toContain(pack.title);
      expect(pack.moments.map((moment) => moment.id)).not.toContain(pack.title);
      expect(engine.projectDevice(alpha.deviceId).prompt).toEqual({
        id: "continue-pick-story-test",
        label: `Choose ${pack.title}`,
      });
      winStep(engine, alpha.deviceId, "continue-pick-story-test", "continue");
      expect(engine.screen()).toBe("game-settings");
      expect(engine.projectDevice(alpha.deviceId).prompt).toEqual({
        id: "continue-game-settings",
        label: "Continue",
      });
      winStep(engine, alpha.deviceId, "continue-game-settings", "continue");
      expect(engine.screen()).toBe("tower-connect");
      expect(engine.projectStoryboard(TOWER, JOIN).prompt).toEqual({
        id: "continue-tower-connect",
        label: "Next: tower volume test",
      });
      expect(engine.press(alpha.deviceId, "quit", "quit")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      expect(engine.projectDevice(alpha.deviceId)).toMatchObject({
        screen: "tower-connect",
        quitPromptId: null,
        backPromptId: "back-tower-connect",
        backLock: null,
      });
      winStep(engine, alpha.deviceId, "continue-tower-connect", "continue");
      winStep(engine, alpha.deviceId, "continue-tower-volume-test", "continue");
      expect(engine.screen()).toBe("party-join");
      winStep(engine, alpha.deviceId, "continue-party-join", "continue");
      doSetup(engine, alpha.deviceId);
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
      winStep(engine, alpha.deviceId, "continue-pick-story-test", "continue");
      winStep(engine, alpha.deviceId, "continue-game-settings", "continue");
      const batch = engine.pressAll([
        { deviceId: alpha.deviceId, promptId: "continue-tower-connect", action: "continue" },
        { deviceId: beta.deviceId, promptId: "continue-tower-connect", action: "continue" },
      ]);
      expect(batch.map((result) => (result.ok ? result.winner : result.code))).toEqual([
        true,
        false,
      ]);
      expect(engine.screen()).toBe("tower-volume-test");
      // The flow moved on. A press on the step it left is ignored, not an error.
      expect(engine.press(beta.deviceId, "continue-tower-connect", "continue")).toMatchObject({
        ok: true,
        winner: false,
      });
      expect(engine.screen()).toBe("tower-volume-test");

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
          nextScreen: "tower-volume-test",
        },
        // Arrived after the flow moved in the same batch, so it records the screen then held.
        { device: beta.deviceId, winner: false, screen: "tower-volume-test", nextScreen: null },
        { device: beta.deviceId, winner: false, screen: "tower-volume-test", nextScreen: null },
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
      tower: pack.tower,
    });
    return {
      first,
      second,
      stories: [
        {
          card: card(first, "test"),
          pack: first,
          settings: first.settings,
          issues: [],
          assets: null,
        },
        {
          card: card(second, "second"),
          pack: second,
          settings: second.settings,
          issues: [],
          assets: null,
        },
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
            tower: null,
          },
          pack: null,
          settings: [],
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
            tower: "optional",
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
      // Moving the highlight is not a press.
      expect(store.loadRun("run").presses).toEqual([]);
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
      // On the splash, and later on Connect Tower.
      expect(engine.focusStory(joined.deviceId, "second")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      engine.finishSplash();
      winStep(engine, joined.deviceId, "continue-pick-story-test", "continue");
      winStep(engine, joined.deviceId, "continue-game-settings", "continue");
      expect(engine.screen()).toBe("tower-connect");
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
      winStep(engine, deviceId, "continue-game-settings", "continue");
      winStep(engine, deviceId, "continue-tower-connect", "continue");
      winStep(engine, deviceId, "continue-tower-volume-test", "continue");
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
      winStep(engine, deviceId, "continue-game-settings", "continue");
      winStep(engine, deviceId, "continue-tower-connect", "continue");
      winStep(engine, deviceId, "continue-tower-volume-test", "continue");
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
        tower: "optional",
      },
      pack: null,
      settings: [LENGTH_SETTING],
      issues: [],
      assets: null,
    },
  ];

  it("stops a chosen playable: false story at Not playable yet after Game settings, binds nothing, and Back returns", () => {
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
      expect(engine.screen()).toBe("game-settings");
      expect(engine.projectStoryboard(TOWER, JOIN).gameSettings).toEqual({
        story: "vellmoor",
        settings: [
          {
            id: "length",
            label: "Length",
            options: [
              { id: "short", label: "Short" },
              { id: "standard", label: "Standard" },
              { id: "long", label: "Long" },
            ],
          },
        ],
        chosen: { length: "standard" },
      });
      winStep(engine, deviceId, "set-0", "set", "long", "length");
      winStep(engine, deviceId, "continue-game-settings", "continue");
      expect(engine.screen()).toBe("not-playable");
      const board = engine.projectStoryboard(TOWER, JOIN);
      expect(board.screen).toBe("not-playable");
      expect(board.stories?.current).toBe("test");
      expect(board.prompt).toEqual({ id: "back-not-playable", label: "Back" });
      expect(engine.roster().packId).toBe("test");

      // Only Back is offered here: no Continue. The Continue press that won is locked, so a
      // repeat is recorded as a losing press and changes nothing.
      expect(engine.press(deviceId, "continue-game-settings", "continue")).toMatchObject({
        ok: true,
        winner: false,
      });
      expect(engine.screen()).toBe("not-playable");
      expect(engine.press(deviceId, "back-not-playable", "back")).toMatchObject({ winner: true });
      // Back from Not playable yet returns to Game settings, with the choice kept.
      expect(engine.screen()).toBe("game-settings");
      expect(engine.chosenSettings()).toEqual({ length: "long" });
      expect(engine.projectDevice(deviceId).prompt).toEqual({
        id: "continue-game-settings",
        label: "Continue",
      });
      expect(engine.projectDevice(deviceId).lock).toBeNull();
      winStep(engine, deviceId, "back-game-settings", "back");
      expect(engine.screen()).toBe("pick-story");
      expect(engine.projectDevice(deviceId).prompt).toEqual({
        id: "continue-pick-story-vellmoor",
        label: "Choose The Count of Vellmoor",
      });
    } finally {
      opened.close();
    }
  });

  it("lets the same story be chosen again, and Back pressed again, after Back", () => {
    const { opened, engine, deviceId } = atPickStory({
      stories: doorsWithVellmoor(),
      storyId: "test",
    });
    try {
      engine.focusStory(deviceId, "vellmoor");
      for (let visit = 0; visit < 2; visit += 1) {
        expect(engine.projectDevice(deviceId).lock).toBeNull();
        expect(engine.press(deviceId, "continue-pick-story-vellmoor", "continue")).toMatchObject({
          winner: true,
        });
        expect(engine.screen()).toBe("game-settings");
        expect(engine.press(deviceId, "continue-game-settings", "continue")).toMatchObject({
          winner: true,
        });
        expect(engine.screen()).toBe("not-playable");
        expect(engine.projectDevice(deviceId).lock).toBeNull();
        expect(engine.press(deviceId, "back-not-playable", "back")).toMatchObject({
          winner: true,
        });
        expect(engine.screen()).toBe("game-settings");
        // A late Back from this visit still loses and moves nothing.
        expect(engine.press(deviceId, "back-not-playable", "back")).toMatchObject({
          ok: true,
          winner: false,
        });
        expect(engine.screen()).toBe("game-settings");
        expect(engine.press(deviceId, "back-game-settings", "back")).toMatchObject({
          winner: true,
        });
        expect(engine.screen()).toBe("pick-story");
        expect(engine.press(deviceId, "back-game-settings", "back")).toMatchObject({
          ok: true,
          winner: false,
        });
        expect(engine.screen()).toBe("pick-story");
      }
      expect(engine.roster().packId).toBe("test");
    } finally {
      opened.close();
    }
  });

  it("refuses Back on Pick Story", () => {
    const { opened, engine, deviceId } = atPickStory({
      stories: doorsWithVellmoor(),
      storyId: "test",
    });
    try {
      expect(engine.press(deviceId, "back-not-playable", "back")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      expect(engine.press(deviceId, "back-game-settings", "back")).toEqual({
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
      winStep(engine, deviceId, "continue-game-settings", "continue");
      winStep(engine, deviceId, "continue-tower-connect", "continue");
      winStep(engine, deviceId, "continue-tower-volume-test", "continue");
      holdAll(engine, deviceId);
      winStep(engine, deviceId, "continue-party-join", "continue");
      doSetup(engine, deviceId);
      winStep(engine, deviceId, "begin", "begin");
      expect(engine.projectStoryboard(TOWER, JOIN).moment?.id).toBe("proving-ground.01");
    } finally {
      opened.close();
    }
  });
});

describe("game settings", () => {
  /** Joined iPad on Game settings for the test pack. `pack` swaps in another manifest. */
  const atGameSettings = (pack?: Pack) => {
    const made = setup(pack ? { pack } : undefined);
    const joined = made.engine.join({ joinCode: "048213", formFactor: "ipad" });
    if (!joined.ok) throw new Error("join");
    made.engine.finishSplash();
    winStep(made.engine, joined.deviceId, "continue-pick-story-test", "continue");
    return { ...made, deviceId: joined.deviceId };
  };

  it("lists Proving Ground's length and difficulty from its manifest, each at its default", () => {
    const { opened, engine, deviceId } = atGameSettings();
    try {
      expect(engine.screen()).toBe("game-settings");
      const expected = {
        story: "test",
        settings: [
          {
            id: "length",
            label: "Length",
            options: [
              { id: "short", label: "Short" },
              { id: "standard", label: "Standard" },
              { id: "long", label: "Long" },
            ],
          },
          {
            id: "difficulty",
            label: "Difficulty",
            options: [{ id: "standard", label: "Standard" }],
          },
        ],
        chosen: { length: "standard", difficulty: "standard" },
      };
      expect(engine.projectStoryboard(TOWER, JOIN).gameSettings).toEqual(expected);
      const device = engine.projectDevice(deviceId);
      expect(device.gameSettings).toEqual(expected);
      expect(device.setPromptId).toBe("set-0");
      expect(device.backPromptId).toBe("back-game-settings");
      expect(device.backLock).toBeNull();
      expect(engine.chosenSettings()).toEqual({ length: "standard", difficulty: "standard" });
    } finally {
      opened.close();
    }
  });

  it("shows a third setting when the pack has one, and nothing it does not list", () => {
    const base = packOrThrow().pack;
    const pack: Pack = {
      ...base,
      settings: [
        ...base.settings,
        {
          id: "lantern",
          label: "Lantern",
          options: [
            { id: "lit", label: "Lit" },
            { id: "dark", label: "Dark" },
          ],
          default: "dark",
        },
      ],
    };
    const { opened, engine } = atGameSettings(pack);
    try {
      const shown = engine.projectStoryboard(TOWER, JOIN).gameSettings;
      expect(shown?.settings.map((setting) => setting.id)).toEqual([
        "length",
        "difficulty",
        "lantern",
      ]);
      expect(shown?.chosen.lantern).toBe("dark");
    } finally {
      opened.close();
    }
  });

  it("sends board and device state for a pack at every settings limit the manifest allows", () => {
    const longId = (index: number) =>
      `${"s".repeat(SETTING_ID_MAX - 3)}${String(index).padStart(3, "0")}`;
    const options = Array.from({ length: SETTING_OPTIONS_MAX }, (_, index) => ({
      id: longId(index),
      label: "x".repeat(SETTING_LABEL_MAX),
    }));
    const settings = Array.from({ length: SETTINGS_MAX }, (_, index) => ({
      id: longId(index),
      label: "y".repeat(SETTING_LABEL_MAX),
      options,
      default: longId(0),
    }));
    const pack = packSchema.parse({ ...packOrThrow().pack, settings });
    const { opened, engine, deviceId } = atGameSettings(pack);
    try {
      expect(engine.projectStoryboard(TOWER, JOIN).gameSettings?.settings).toHaveLength(
        SETTINGS_MAX,
      );
      const last = longId(SETTING_OPTIONS_MAX - 1);
      winStep(engine, deviceId, "set-0", "set", last, longId(SETTINGS_MAX - 1));
      expect(engine.projectDevice(deviceId).gameSettings?.chosen[longId(SETTINGS_MAX - 1)]).toBe(
        last,
      );
    } finally {
      opened.close();
    }
  });

  it("shows an empty list for a pack with no settings, and Continue still moves on", () => {
    const pack: Pack = { ...packOrThrow().pack, settings: [] };
    const { opened, engine, deviceId } = atGameSettings(pack);
    try {
      expect(engine.projectStoryboard(TOWER, JOIN).gameSettings).toEqual({
        story: "test",
        settings: [],
        chosen: {},
      });
      winStep(engine, deviceId, "continue-game-settings", "continue");
      winStep(engine, deviceId, "continue-tower-connect", "continue");
      winStep(engine, deviceId, "continue-tower-volume-test", "continue");
      expect(engine.screen()).toBe("party-join");
    } finally {
      opened.close();
    }
  });

  it("lets the first press win each change, logs every press, and refuses a value the pack does not offer", () => {
    const { opened, store, engine } = atGameSettings();
    try {
      const beta = engine.join({ joinCode: "048213", formFactor: "ipad" });
      if (!beta.ok) throw new Error("join");
      const alpha = "device-1";
      const batch = [
        engine.press(alpha, "set-0", "set", "short", "length"),
        engine.press(beta.deviceId, "set-0", "set", "long", "length"),
      ];
      expect(batch.map((result) => result.ok && result.winner)).toEqual([true, false]);
      expect(engine.chosenSettings()?.length).toBe("short");
      // The next change is a fresh lock, so the other iPad can win it.
      expect(engine.projectDevice(beta.deviceId).setPromptId).toBe("set-1");
      winStep(engine, beta.deviceId, "set-1", "set", "long", "length");
      expect(engine.chosenSettings()?.length).toBe("long");
      expect(engine.screen()).toBe("game-settings");

      for (const [option, setting] of [
        ["epic", "length"],
        ["standard", "speed"],
        ["standard", undefined],
        [undefined, "length"],
      ] as const) {
        expect(engine.press(alpha, "set-2", "set", option, setting)).toEqual({
          ok: false,
          code: "invalid-state",
        });
      }
      // A stale serial is a lost press, not a change.
      expect(engine.press(alpha, "set-0", "set", "standard", "length")).toMatchObject({
        ok: true,
        winner: false,
      });
      expect(engine.press(alpha, "set-9", "set", "standard", "length")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      expect(engine.chosenSettings()?.length).toBe("long");

      const sets = store
        .loadRun("run")
        .presses.filter((press) => press.action === "set")
        .map((press) => ({
          promptId: press.promptId,
          device: press.deviceId,
          winner: press.winner,
          screen: press.screen,
          nextScreen: press.nextScreen,
        }));
      expect(sets).toEqual([
        {
          promptId: "set-0",
          device: alpha,
          winner: true,
          screen: "game-settings",
          nextScreen: null,
        },
        {
          promptId: "set-0",
          device: beta.deviceId,
          winner: false,
          screen: "game-settings",
          nextScreen: null,
        },
        {
          promptId: "set-1",
          device: beta.deviceId,
          winner: true,
          screen: "game-settings",
          nextScreen: null,
        },
        {
          promptId: "set-0",
          device: alpha,
          winner: false,
          screen: "game-settings",
          nextScreen: null,
        },
      ]);
    } finally {
      opened.close();
    }
  });

  it("Back returns to Pick Story and clears the chosen settings; choosing again starts at the defaults", () => {
    const { opened, engine, deviceId } = atGameSettings();
    try {
      winStep(engine, deviceId, "set-0", "set", "short", "length");
      winStep(engine, deviceId, "back-game-settings", "back");
      expect(engine.screen()).toBe("pick-story");
      expect(engine.chosenSettings()).toBeNull();
      expect(engine.projectStoryboard(TOWER, JOIN).gameSettings).toBeNull();
      const device = engine.projectDevice(deviceId);
      expect(device.gameSettings).toBeNull();
      expect(device.setPromptId).toBeNull();
      expect(device.backPromptId).toBeNull();
      expect(engine.press(deviceId, "set-1", "set", "long", "length")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      winStep(engine, deviceId, "continue-pick-story-test", "continue");
      expect(engine.screen()).toBe("game-settings");
      expect(engine.chosenSettings()).toEqual({ length: "standard", difficulty: "standard" });
      // Re-entering drops the last visit's Back lock, so Back can be pressed again.
      expect(engine.projectDevice(deviceId).backLock).toBeNull();
    } finally {
      opened.close();
    }
  });

  it("keeps Back pressable while Continue is the step prompt, and Continue goes on to Party Join", () => {
    const { opened, engine, deviceId } = atGameSettings();
    try {
      const device = engine.projectDevice(deviceId);
      expect(device.prompt).toEqual({ id: "continue-game-settings", label: "Continue" });
      expect(device.lock).toBeNull();
      winStep(engine, deviceId, "continue-game-settings", "continue");
      winStep(engine, deviceId, "continue-tower-connect", "continue");
      winStep(engine, deviceId, "continue-tower-volume-test", "continue");
      expect(engine.screen()).toBe("party-join");
      expect(engine.press(deviceId, "back-game-settings", "back")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      // Claim Hunters names its own Back, which goes to Connect Tower, not Game settings.
      expect(engine.projectDevice(deviceId)).toMatchObject({
        setPromptId: null,
        backPromptId: "back-party-join",
        backLock: null,
        gameSettings: { story: "test", chosen: { length: "standard" } },
      });
    } finally {
      opened.close();
    }
  });

  it("locks the settings at Begin and records each chosen value in the timing log", () => {
    const { opened, store, engine, deviceId } = atGameSettings();
    try {
      winStep(engine, deviceId, "set-0", "set", "long", "length");
      winStep(engine, deviceId, "continue-game-settings", "continue");
      winStep(engine, deviceId, "continue-tower-connect", "continue");
      winStep(engine, deviceId, "continue-tower-volume-test", "continue");
      holdAll(engine, deviceId);
      winStep(engine, deviceId, "continue-party-join", "continue");
      doSetup(engine, deviceId);
      expect(store.loadRun("run").marks.some((mark) => mark.kind === "setting")).toBe(false);
      winStep(engine, deviceId, "begin", "begin");
      expect(engine.press(deviceId, "set-1", "set", "short", "length")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      expect(engine.chosenSettings()).toEqual({ length: "long", difficulty: "standard" });
      const settings = store
        .loadRun("run")
        .marks.filter((mark) => mark.kind === "setting")
        .map((mark) => ({ subject: mark.subject, closed: mark.endMonoMs !== null }));
      expect(settings).toEqual([
        { subject: "length:long", closed: true },
        { subject: "difficulty:standard", closed: true },
      ]);
    } finally {
      opened.close();
    }
  });
});

describe("Connect Tower after Game settings (R3-UI-23)", () => {
  const unavailable = TOWER;
  const connected = (calibrated: boolean): TowerSnapshot => ({
    connection: "connected",
    battery: { state: "unavailable" },
    calibrated: { state: "known", calibrated },
  });

  /** Proving Ground with its `tower` field set to `mode`, on its card and its pack. */
  const towerStory = (mode: TowerMode): StoryEntry[] => {
    const { pack } = packOrThrow();
    return [
      {
        card: {
          id: "test",
          title: pack.title,
          blurb: null,
          tagline: null,
          cover: null,
          players: pack.players,
          playable: true,
          loadable: true,
          tower: mode,
        },
        pack: { ...pack, tower: mode },
        settings: pack.settings,
        issues: [],
        assets: null,
      },
    ];
  };

  /** A joined iPad on Game settings, with a tower reading the test can change. */
  const atSettings = (mode: TowerMode) => {
    let reading = unavailable;
    const stories = towerStory(mode);
    const made = setup({
      pack: stories[0]?.pack ?? undefined,
      stories,
      storyId: "test",
      tower: () => reading,
    });
    const joined = made.engine.join({ joinCode: "048213", formFactor: "ipad" });
    if (!joined.ok) throw new Error("join");
    made.engine.finishSplash();
    winStep(made.engine, joined.deviceId, "continue-pick-story-test", "continue");
    expect(made.engine.screen()).toBe("game-settings");
    const setTower = (next: TowerSnapshot) => {
      reading = next;
    };
    return { ...made, deviceId: joined.deviceId, setTower };
  };

  it("goes from Game settings to Connect Tower for an optional tower, and Play without tower skips it", () => {
    const { opened, engine, deviceId } = atSettings("optional");
    try {
      winStep(engine, deviceId, "continue-game-settings", "continue");
      expect(engine.screen()).toBe("tower-connect");
      // "Play without tower" is the Continue prompt while no tower is connected (R2-22).
      expect(engine.projectDevice(deviceId).prompt).toEqual({
        id: "continue-tower-connect",
        label: "Next: tower volume test",
      });
      winStep(engine, deviceId, "continue-tower-connect", "continue");
      winStep(engine, deviceId, "continue-tower-volume-test", "continue");
      expect(engine.screen()).toBe("party-join");
    } finally {
      opened.close();
    }
  });

  it("skips Connect Tower for a story with tower: none", () => {
    const { opened, store, engine, deviceId } = atSettings("none");
    try {
      winStep(engine, deviceId, "continue-game-settings", "continue");
      expect(engine.screen()).toBe("party-join");
      expect(engine.press(deviceId, "continue-tower-connect", "continue")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      const won = store
        .loadRun("run")
        .presses.find((press) => press.promptId === "continue-game-settings");
      expect(won).toMatchObject({
        winner: true,
        screen: "game-settings",
        nextScreen: "party-join",
      });
    } finally {
      opened.close();
    }
  });

  it("holds Continue for a required tower until it is connected and calibrated", () => {
    const { opened, engine, deviceId, setTower } = atSettings("required");
    try {
      winStep(engine, deviceId, "continue-game-settings", "continue");
      expect(engine.screen()).toBe("tower-connect");
      const notReady: TowerSnapshot[] = [
        unavailable,
        { ...unavailable, connection: "connecting" },
        { ...unavailable, connection: "disconnected" },
        // Connected with calibration unknown or not done is not ready.
        { ...unavailable, connection: "connected" },
        connected(false),
      ];
      for (const reading of notReady) {
        setTower(reading);
        expect(engine.projectStoryboard(reading, JOIN).prompt).toBeNull();
        expect(engine.projectDevice(deviceId).prompt).toBeNull();
        expect(engine.press(deviceId, "continue-tower-connect", "continue")).toEqual({
          ok: false,
          code: "invalid-state",
        });
        expect(engine.screen()).toBe("tower-connect");
      }
      // Back stays pressable while Continue is held.
      expect(engine.projectDevice(deviceId).backPromptId).toBe("back-tower-connect");

      setTower(connected(true));
      expect(engine.projectDevice(deviceId).prompt).toEqual({
        id: "continue-tower-connect",
        label: "Next: tower volume test",
      });
      winStep(engine, deviceId, "continue-tower-connect", "continue");
      winStep(engine, deviceId, "continue-tower-volume-test", "continue");
      expect(engine.screen()).toBe("party-join");
    } finally {
      opened.close();
    }
  });

  it("Back from Connect Tower returns to Game settings with the chosen values, and Connect Tower can be passed again", () => {
    const { opened, store, engine, deviceId, setTower } = atSettings("optional");
    try {
      winStep(engine, deviceId, "set-0", "set", "long", "length");
      winStep(engine, deviceId, "continue-game-settings", "continue");
      expect(engine.press(deviceId, "back-game-settings", "back")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      // The tower is connected and calibrated here; Back must leave it so.
      setTower(connected(true));
      winStep(engine, deviceId, "back-tower-connect", "back");
      expect(engine.screen()).toBe("game-settings");
      expect(engine.chosenSettings()).toEqual({ length: "long", difficulty: "standard" });
      expect(engine.projectDevice(deviceId).backPromptId).toBe("back-game-settings");

      // Back again on the second visit, then on through: each visit is a fresh lock.
      winStep(engine, deviceId, "continue-game-settings", "continue");
      expect(engine.screen()).toBe("tower-connect");
      winStep(engine, deviceId, "back-tower-connect", "back");
      winStep(engine, deviceId, "continue-game-settings", "continue");
      winStep(engine, deviceId, "continue-tower-connect", "continue");
      winStep(engine, deviceId, "continue-tower-volume-test", "continue");
      expect(engine.screen()).toBe("party-join");
      // Off Connect Tower, Back is refused like Back from Game settings once it is left.
      expect(engine.press(deviceId, "back-tower-connect", "back")).toEqual({
        ok: false,
        code: "invalid-state",
      });
      expect(engine.screen()).toBe("party-join");

      const backs = store
        .loadRun("run")
        .presses.filter((press) => press.promptId === "back-tower-connect" && press.winner);
      expect(backs.map((press) => [press.screen, press.nextScreen])).toEqual([
        ["tower-connect", "game-settings"],
        ["tower-connect", "game-settings"],
      ]);
    } finally {
      opened.close();
    }
  });

  it("never connects or calibrates on a flow press: Back, Continue and Play without tower are not tower presses", () => {
    const { opened, engine, deviceId } = atSettings("optional");
    try {
      const results = [
        engine.press(deviceId, "continue-game-settings", "continue"),
        engine.press(deviceId, "back-tower-connect", "back"),
        engine.press(deviceId, "continue-game-settings", "continue"),
        engine.press(deviceId, "continue-tower-connect", "continue"),
      ];
      for (const result of results) {
        expect(result).toMatchObject({ ok: true, winner: true });
        if (result.ok) expect(result.action).not.toMatch(/^tower-/);
      }
      expect(engine.lockFor("tower-connect")).toBeNull();
      expect(engine.lockFor("tower-calibrate")).toBeNull();
    } finally {
      opened.close();
    }
  });
});

describe("claim hunters and setup steps", () => {
  const READY: TowerSnapshot = {
    connection: "connected",
    battery: { state: "unavailable" },
    calibrated: { state: "known", calibrated: true },
  };
  const STEPS = ["lay-out-board", "place-hunters", "ready-decks"];

  /** The test pack as the only door, with its asset index so an illustration can resolve. */
  const entry = (pack: Pack, illustrated: readonly string[] = []): StoryEntry => ({
    card: {
      id: "test",
      title: pack.title,
      blurb: null,
      tagline: null,
      cover: "/packs/test/assets/cover.png",
      players: pack.players,
      playable: true,
      loadable: true,
      tower: pack.tower,
    },
    pack,
    settings: pack.settings,
    issues: [],
    assets: {
      byId: new Map(illustrated.map((id) => [id, { absolute: `/x/${id}.png`, basename: id }])),
    } as unknown as PackAssetIndex,
  });

  /** Joined iPad holding every hunter, on Claim Hunters. */
  const atClaim = (options?: {
    pack?: Pack;
    tower?: () => TowerSnapshot;
    illustrated?: readonly string[];
  }) => {
    const pack = options?.pack ?? packOrThrow().pack;
    const made = setup({
      pack,
      tower: options?.tower,
      stories: [entry(pack, options?.illustrated)],
      storyId: "test",
    });
    const joined = made.engine.join({ joinCode: "048213", formFactor: "ipad" });
    if (!joined.ok) throw new Error("join");
    made.engine.finishSplash();
    const deviceId = joined.deviceId;
    winStep(made.engine, deviceId, "continue-pick-story-test", "continue");
    winStep(made.engine, deviceId, "continue-game-settings", "continue");
    if (made.engine.screen() === "tower-connect") {
      winStep(made.engine, deviceId, "continue-tower-connect", "continue");
      winStep(made.engine, deviceId, "continue-tower-volume-test", "continue");
    }
    holdAll(made.engine, deviceId);
    return { ...made, deviceId };
  };

  const board = (engine: SessionEngine) => engine.projectStoryboard(TOWER, JOIN);

  it("takes the test pack's setup steps from its manifest, one dialog each", () => {
    expect(packOrThrow().pack.setup.map((step) => step.id)).toEqual(STEPS);
    expect(packOrThrow().pack.setup[0]).toEqual({
      id: "lay-out-board",
      label: "Lay out the board and orient the kingdoms.",
      illustration: "ill.setup-board",
    });
  });

  it("walks Claim Hunters, each step with Done, then Begin, and logs time per step", () => {
    const { opened, store, engine, deviceId } = atClaim();
    try {
      expect(engine.screen()).toBe("party-join");
      winStep(engine, deviceId, "continue-party-join", "continue");
      for (const [index, id] of STEPS.entries()) {
        expect(engine.screen()).toBe("setup");
        const state = board(engine);
        expect(state.setupStep?.step).toEqual({
          id,
          label: packOrThrow().pack.setup[index]?.label,
          index,
          count: 3,
        });
        expect(state.prompt).toEqual({ id: `continue-setup-${id}`, label: "Done" });
        expect(engine.projectDevice(deviceId)).toMatchObject({
          screen: "setup",
          setupStep: { id, index, count: 3 },
          prompt: { id: `continue-setup-${id}`, label: "Done" },
          backPromptId: `back-setup-${id}`,
        });
        // Begin is refused until every step is done (R2-52).
        expect(engine.press(deviceId, "begin", "begin")).toEqual({
          ok: false,
          code: "invalid-state",
        });
        winStep(engine, deviceId, `continue-setup-${id}`, "continue");
      }
      expect(engine.screen()).toBe("begin");
      expect(board(engine).prompt).toEqual({ id: "begin", label: "Begin" });
      expect(board(engine).setupStep).toBeNull();
      winStep(engine, deviceId, "begin", "begin");
      const marks = store
        .loadRun("run")
        .marks.filter((mark) => mark.kind === "setup-step")
        .map((mark) => ({ subject: mark.subject, closed: mark.endMonoMs !== null }));
      expect(marks).toEqual(STEPS.map((subject) => ({ subject, closed: true })));
    } finally {
      opened.close();
    }
  });

  it("goes back one step at a time, undoing the step it returns to, and never assumes a step", () => {
    const { opened, store, engine, deviceId } = atClaim();
    try {
      winStep(engine, deviceId, "continue-party-join", "continue");
      winStep(engine, deviceId, "continue-setup-lay-out-board", "continue");
      winStep(engine, deviceId, "continue-setup-place-hunters", "continue");
      // Back from step 3 re-opens step 2, which is no longer done.
      winStep(engine, deviceId, "back-setup-ready-decks", "back");
      expect(board(engine).setupStep?.step.id).toBe("place-hunters");
      expect(board(engine).summary?.setup.map((step) => step.done)).toEqual([true, false, false]);
      // Its Done is a fresh lock on the revisit; the Back that just won stays locked.
      winStep(engine, deviceId, "continue-setup-place-hunters", "continue");
      expect(engine.press(deviceId, "back-setup-ready-decks", "back")).toMatchObject({
        ok: true,
        winner: true,
      });
      expect(board(engine).setupStep?.step.id).toBe("place-hunters");
      winStep(engine, deviceId, "back-setup-place-hunters", "back");
      winStep(engine, deviceId, "back-setup-lay-out-board", "back");
      expect(engine.screen()).toBe("party-join");
      expect(board(engine).summary?.setup.every((step) => !step.done)).toBe(true);
      // Back from Begin re-opens the last step.
      winStep(engine, deviceId, "continue-party-join", "continue");
      doSetup(engine, deviceId);
      expect(engine.screen()).toBe("begin");
      winStep(engine, deviceId, "back-begin", "back");
      expect(board(engine).setupStep?.step.id).toBe("ready-decks");
      expect(board(engine).prompt?.id).toBe("continue-setup-ready-decks");
      winStep(engine, deviceId, "continue-setup-ready-decks", "continue");
      expect(engine.screen()).toBe("begin");
      // Every visit is its own mark, and none is left open.
      const marks = store.loadRun("run").marks.filter((mark) => mark.kind === "setup-step");
      expect(marks.every((mark) => mark.endMonoMs !== null)).toBe(true);
      expect(marks.map((mark) => mark.subject)).toEqual([
        "lay-out-board",
        "place-hunters",
        "ready-decks",
        "place-hunters",
        "ready-decks",
        "place-hunters",
        "lay-out-board",
        "lay-out-board",
        "place-hunters",
        "ready-decks",
        "ready-decks",
      ]);
    } finally {
      opened.close();
    }
  });

  it("refuses a Done or Back for a step that is not on screen", () => {
    const { opened, engine, deviceId } = atClaim();
    try {
      winStep(engine, deviceId, "continue-party-join", "continue");
      for (const [promptId, action] of [
        ["continue-setup-place-hunters", "continue"],
        ["back-setup-place-hunters", "back"],
        ["back-party-join", "back"],
        ["back-begin", "back"],
      ] as const) {
        expect(engine.press(deviceId, promptId, action), promptId).toEqual({
          ok: false,
          code: "invalid-state",
        });
      }
    } finally {
      opened.close();
    }
  });

  it("goes from Claim Hunters straight to Begin when the pack has no setup steps", () => {
    const pack = { ...packOrThrow().pack, setup: [] };
    const { opened, engine, deviceId } = atClaim({ pack });
    try {
      expect(board(engine).prompt).toEqual({
        id: "continue-party-join",
        label: "Next: begin the story",
      });
      winStep(engine, deviceId, "continue-party-join", "continue");
      expect(engine.screen()).toBe("begin");
      winStep(engine, deviceId, "back-begin", "back");
      expect(engine.screen()).toBe("party-join");
    } finally {
      opened.close();
    }
  });

  it("shows the illustration only once its file has landed", () => {
    const placeholder = atClaim();
    try {
      winStep(placeholder.engine, placeholder.deviceId, "continue-party-join", "continue");
      expect(board(placeholder.engine).setupStep).toMatchObject({
        step: { id: "lay-out-board" },
        illustration: null,
      });
    } finally {
      placeholder.opened.close();
    }
    const landed = atClaim({ illustrated: ["ill.setup-board"] });
    try {
      winStep(landed.engine, landed.deviceId, "continue-party-join", "continue");
      expect(board(landed.engine).setupStep?.illustration).toBe("ill.setup-board");
      // The device gets the step text only, never the image (R3-UI-51).
      expect(JSON.stringify(landed.engine.projectDevice(landed.deviceId))).not.toContain(
        "ill.setup-board",
      );
      winStep(landed.engine, landed.deviceId, "continue-setup-lay-out-board", "continue");
      expect(board(landed.engine).setupStep?.illustration).toBeNull();
    } finally {
      landed.opened.close();
    }
  });

  it("Back from Claim Hunters returns to the tower volume test, and Back again to Connect Tower, clearing the tower item", () => {
    const { opened, engine, deviceId } = atClaim();
    try {
      expect(board(engine).summary?.tower).toBe("without");
      winStep(engine, deviceId, "back-party-join", "back");
      expect(engine.screen()).toBe("tower-volume-test");
      expect(board(engine).summary?.tower).toBe("without");
      winStep(engine, deviceId, "back-tower-volume-test", "back");
      expect(engine.screen()).toBe("tower-connect");
      expect(board(engine).summary?.tower).toBeNull();
      expect(board(engine).gate).toEqual({ canBegin: true, unheld: [] });
    } finally {
      opened.close();
    }
  });

  it("Back from Claim Hunters returns to Game settings when the story does not use the tower", () => {
    const pack: Pack = { ...packOrThrow().pack, tower: "none" };
    const { opened, engine, deviceId } = atClaim({ pack });
    try {
      expect(board(engine).summary?.tower).toBe("not-used");
      winStep(engine, deviceId, "back-party-join", "back");
      expect(engine.screen()).toBe("game-settings");
      expect(board(engine).summary?.tower).toBeNull();
    } finally {
      opened.close();
    }
  });

  it("builds the summary as each choice is made and clears what Back undoes", () => {
    const pack = packOrThrow().pack;
    const made = setup({ pack, tower: () => READY, stories: [entry(pack)], storyId: "test" });
    const { opened, engine } = made;
    try {
      const joined = engine.join({ joinCode: "048213", formFactor: "ipad" });
      if (!joined.ok) throw new Error("join");
      const deviceId = joined.deviceId;
      expect(board(engine).summary).toBeNull();
      engine.finishSplash();
      const empty = { game: null, settings: null, tower: null, hunters: null, setup: [] };
      expect(board(engine).summary).toEqual(empty);

      winStep(engine, deviceId, "continue-pick-story-test", "continue");
      expect(board(engine).summary).toMatchObject({
        game: { id: "test", title: "Proving ground", cover: "/packs/test/assets/cover.png" },
        settings: [
          { id: "length", label: "Length", value: "Standard" },
          { id: "difficulty", label: "Difficulty", value: "Standard" },
        ],
        tower: null,
        hunters: [
          { id: "alpha", name: "Agnes", holders: [] },
          { id: "beta", name: "Tomas", holders: [] },
          { id: "gamma", name: "Wren", holders: [] },
          { id: "delta", name: "Emeric", holders: [] },
        ],
        setup: STEPS.map((id) => ({ id, done: false })),
      });
      winStep(engine, deviceId, "set-0", "set", "long", "length");
      expect(board(engine).summary?.settings?.[0]?.value).toBe("Long");

      // Back to Pick Game clears the game and its settings.
      winStep(engine, deviceId, "back-game-settings", "back");
      expect(board(engine).summary).toEqual(empty);
      winStep(engine, deviceId, "continue-pick-story-test", "continue");
      winStep(engine, deviceId, "continue-game-settings", "continue");
      expect(board(engine).summary?.tower).toBeNull();
      winStep(engine, deviceId, "continue-tower-connect", "continue");
      winStep(engine, deviceId, "continue-tower-volume-test", "continue");
      expect(board(engine).summary?.tower).toBe("connected");

      engine.hold(deviceId, "alpha", "take");
      expect(board(engine).summary?.hunters?.[0]).toEqual({
        id: "alpha",
        name: "Agnes",
        holders: [deviceId],
      });
      holdAll(engine, deviceId);
      winStep(engine, deviceId, "continue-party-join", "continue");
      winStep(engine, deviceId, "continue-setup-lay-out-board", "continue");
      expect(board(engine).summary?.setup.map((step) => step.done)).toEqual([true, false, false]);
      doSetup(engine, deviceId);
      expect(board(engine).summary?.setup.every((step) => step.done)).toBe(true);
      winStep(engine, deviceId, "begin", "begin");
      expect(board(engine).summary).toBeNull();
    } finally {
      opened.close();
    }
  });

  it("does not list hunters or setup steps for a story that is not playable", () => {
    const pack = packOrThrow().pack;
    const vellmoor: StoryEntry = {
      card: {
        id: "dracula",
        title: "The Count of Vellmoor",
        blurb: null,
        tagline: null,
        cover: null,
        players: null,
        playable: false,
        loadable: true,
        tower: "optional",
      },
      pack: null,
      settings: [LENGTH_SETTING],
      issues: [],
      assets: null,
    };
    const { opened, engine } = setup({ pack, stories: [vellmoor, entry(pack)], storyId: "test" });
    try {
      const joined = engine.join({ joinCode: "048213", formFactor: "ipad" });
      if (!joined.ok) throw new Error("join");
      engine.finishSplash();
      engine.focusStory(joined.deviceId, "dracula");
      winStep(engine, joined.deviceId, "continue-pick-story-dracula", "continue");
      expect(board(engine).summary).toMatchObject({
        game: { id: "dracula", title: "The Count of Vellmoor" },
        settings: [{ id: "length", value: "Standard" }],
        hunters: null,
        setup: [],
      });
    } finally {
      opened.close();
    }
  });
});
