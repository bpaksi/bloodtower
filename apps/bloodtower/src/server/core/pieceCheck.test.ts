import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { eventChoicePromptId } from "../../engine/loops/day/loop.ts";
import { TEST_STORY } from "../../engine/loops/session/pack.ts";
import { pieceCheckPromptId } from "../../engine/loops/session/pieceCheck.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import {
  pauseGoWithoutPrompt,
  pauseQuitPrompt,
  pauseReconnectPrompt,
} from "../../engine/loops/session/reconnect.ts";
import { eventPressDeviceRefusal } from "../../engine/loops/session/stepShell.ts";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import type { ErrorCode } from "../../protocols/v2/index.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { parseHostPayload } from "../events/kinds.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger, type LogEntry } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower, type MockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { type CoreSession, createCoreSession } from "./session.ts";
import { parseShellCheckpoint } from "./shellCheckpoint.ts";
import { continueShellFromCheckpoint, shellEngineVersion } from "./shellContinue.ts";

const dirs: string[] = [];
const closers: Array<() => void> = [];

afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const harness = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-piece-check-"));
  dirs.push(dir);
  const opened = openDatabase(join(dir, "session.sqlite"));
  closers.push(() => opened.close());
  const store = createEventStore(opened.db);
  const log = createHostLogger({ dataDir: dir, mirror: false });
  const clock = stepClock();
  const sessions = createSessionStore(opened.db);
  sessions.saveRoster({
    sessionId: "session-1",
    packId: "test",
    packVersion: "0.1.0",
    startedWall: "2026-11-24T00:00:00.000Z",
    joinCode: "000000",
    devices: [],
    holdings: [],
  });
  let count = 0;
  const boot = async (options?: {
    onDeviceError?: (deviceId: string, code: ErrorCode, message: string) => void;
    seed?: string;
    tower?: MockTower;
  }): Promise<{ session: CoreSession; tower: MockTower }> => {
    count += 1;
    const tower = options?.tower ?? createMockTower({ log });
    const session = createCoreSession({
      sessionId: `session-${count}`,
      seed: options?.seed ?? "c2-11-seed",
      stories: [TEST_STORY],
      playContent: PROVING_GROUNDS_PLAY,
      packVersion: "0.1.0",
      store,
      tower: bloodtowerTowerFromMock(tower),
      clock,
      log,
      onChange: () => {},
      onDeviceError: options?.onDeviceError,
      allowTestSeed: true,
      graceMs: 10,
    });
    await session.whenIdle();
    return { session, tower };
  };
  return { store, log, clock, boot };
};

const joinPad = async (session: CoreSession) => {
  const joined = session.join({ joinCode: "000000", formFactor: "ipad" });
  await session.whenIdle();
  if (!joined.ok) throw new Error("join refused");
  return joined.deviceId;
};

const actWith =
  (session: CoreSession, pad: string) =>
  async (promptId: string, actionId: string, args: Record<string, unknown> = {}) => {
    session.act(pad, promptId, actionId, args);
    await session.whenIdle();
  };

/** Plays a fresh game through Enter (with tower), setup, opening, and seeds test markers before Quit. */
const playAndQuitWithSeed = async (session: CoreSession, markers: string) => {
  const pad = await joinPad(session);
  const act = actWith(session, pad);
  await act("base-board-done", "board-set-up");
  await act("tower-connect", "tower-connect");
  await act("tower-calibrate", "tower-calibrate");
  session.syncTowerSnapshot();
  await session.whenIdle();
  await act("continue-pick-story-test", "continue");
  await act("set-setting", "set", { settingId: "hints", optionId: "off" });
  await act("continue-game-settings", "continue");
  for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
    await act("hero-hold", "take", { heroId });
  }
  await act("continue-claim-heroes", "continue");
  for (const step of session.state().setupSteps) {
    if (step.id === "starting-purse") await act(`spin-setup-${step.id}`, "spin");
    await act(`continue-setup-${step.id}`, "continue");
  }
  await act("continue-begin", "continue");
  for (const moment of OPENING_MOMENTS) await act(openingPromptId(moment), "continue");
  if (markers) {
    await session.applyTestSeed(markers);
  }
  const gameId = session.currentGameId();
  if (!gameId) throw new Error("No game id.");
  await act("menu-quit", "quit-story");
  return { pad, act, gameId };
};

const board = (session: CoreSession) =>
  session.projectBoard({ code: "000000", url: "http://127.0.0.1:4747", reachable: true });

describe("C2-11 Continue piece check (server + tower + survival)", () => {
  it("EV-04, EV-13, EV-15: no rotate before press; press rotates off-home drums top->middle only; updates autosave; Done confirms", async () => {
    const { boot, store } = harness();
    const { session, tower } = await boot();
    const { pad, act, gameId } = await playAndQuitWithSeed(session, "~test-drums:2,1,0");

    await act("continue-saved-game", "continue");
    expect(session.state().screen).toBe("piece-check");
    expect(board(session).pieceCheck?.stepId).toBe("hero-minis");

    await act(pieceCheckPromptId("hero-minis"), "confirm");
    expect(board(session).pieceCheck?.stepId).toBe("skulls");

    await act(pieceCheckPromptId("skulls"), "confirm");
    expect(board(session).pieceCheck?.stepId).toBe("drums");

    // EV-04: wait before press — zero rotate commands sent automatically.
    const rotatesBefore = tower.sent().filter((s) => s.type === "rotate-drum");
    expect(rotatesBefore).toHaveLength(0);
    await new Promise((r) => setTimeout(r, 50));
    expect(tower.sent().filter((s) => s.type === "rotate-drum")).toHaveLength(0);

    // Done must be disabled before Turn the drums succeeds.
    const beforeTurn = session.projectDevice(pad).actions;
    expect(beforeTurn.find((a) => a.actionId === "confirm")?.open).toBe(false);
    expect(beforeTurn.find((a) => a.actionId === "turn-drums")?.open).toBe(true);
    expect(beforeTurn.find((a) => a.actionId === "skip")?.open).toBe(true);

    // Press Turn the drums.
    await act(pieceCheckPromptId("drums"), "turn-drums");
    const rotatesAfter = tower.sent().filter((s) => s.type === "rotate-drum");
    expect(rotatesAfter).toEqual([
      { type: "rotate-drum", drumIndex: 0, position: 2 },
      { type: "rotate-drum", drumIndex: 1, position: 1 },
    ]);

    // EV-13: board view shows expected sides per drum, and Done is now enabled.
    const drumsView = board(session).pieceCheck?.drums;
    expect(drumsView?.turned).toBe(true);
    expect(drumsView?.rows.map((r) => [r.level, r.side])).toEqual([
      ["top", "south"],
      ["middle", "east"],
      ["bottom", "north"],
    ]);
    expect(session.projectDevice(pad).actions.find((a) => a.actionId === "confirm")?.open).toBe(
      true,
    );

    // EV-15: autosave checkpoint drum positions equal the sent positions.
    const cp = store.lastCheckpoint(gameId);
    if (!cp) throw new Error("Expected checkpoint.");
    const parsed = parseShellCheckpoint(JSON.parse(cp.stateJson));
    expect(parsed.drums).toEqual({ top: 2, middle: 1, bottom: 0 });

    // EV-13: Done confirms drums and logs one confirm event for drums.
    await act(pieceCheckPromptId("drums"), "confirm");
    expect(session.state().screen).toBe("play");
    const confirmEvents = store
      .listEvents(gameId)
      .filter((row) => row.kind === "control-press")
      .map((row) => parseHostPayload("control-press", row.payload).press)
      .filter((p) => p.promptId === pieceCheckPromptId("drums") && p.action === "confirm");
    expect(confirmEvents).toHaveLength(1);
    expect(confirmEvents[0]?.winner).toBe(true);
  });

  it("EV-06: failed second rotate logs one error with code, tells pressing iPad, toasts board, never retries, keeps partial autosave", async () => {
    const { boot, store, log } = harness();
    const deviceErrors: Array<{ deviceId: string; code: ErrorCode; message: string }> = [];
    const loggedErrors: LogEntry[] = [];
    const stop = log.subscribe((entry) => {
      if (entry.level === "error") loggedErrors.push(entry);
    });
    try {
      const { session, tower } = await boot({
        onDeviceError: (deviceId, code, message) => deviceErrors.push({ deviceId, code, message }),
      });
      // Save with all 3 drums off so we also prove no 3rd command is sent when 2nd fails!
      const { pad, act, gameId } = await playAndQuitWithSeed(session, "~test-drums:2,1,3");
      await act("continue-saved-game", "continue");
      await act(pieceCheckPromptId("hero-minis"), "confirm");
      await act(pieceCheckPromptId("skulls"), "confirm");
      expect(board(session).pieceCheck?.stepId).toBe("drums");

      // Fail the 2nd rotate (middle drum).
      tower.failNextRotate(2);
      await act(pieceCheckPromptId("drums"), "turn-drums");

      // Exactly 2 rotate attempts (top ok, middle failed); NO 3rd command sent for bottom!
      const rotates = tower.sent().filter((s) => s.type === "rotate-drum");
      expect(rotates).toEqual([
        { type: "rotate-drum", drumIndex: 0, position: 2 },
        { type: "rotate-drum", drumIndex: 1, position: 1 },
      ]);

      // Exactly one error log line with code (board toast subscribes to log errors).
      expect(loggedErrors).toHaveLength(1);
      expect(loggedErrors[0]?.code).toBe("tower-command-failed");

      // Pressing iPad received the error with code.
      expect(deviceErrors).toHaveLength(1);
      expect(deviceErrors[0]?.deviceId).toBe(pad);
      expect(deviceErrors[0]?.code).toBe("tower-command-failed");

      // Step stays on drums, offers Turn the drums again and Skip; Done stays disabled.
      expect(session.state().screen).toBe("piece-check");
      expect(board(session).pieceCheck?.stepId).toBe("drums");
      const actions = session.projectDevice(pad).actions;
      expect(actions.find((a) => a.actionId === "turn-drums")?.open).toBe(true);
      expect(actions.find((a) => a.actionId === "skip")?.open).toBe(true);
      expect(actions.find((a) => a.actionId === "confirm")?.open).toBe(false);

      // Autosave has top's new position (2) and middle's/bottom's old saved positions (1, 3).
      const cp = store.lastCheckpoint(gameId);
      if (!cp) throw new Error("Expected checkpoint.");
      const saved = parseShellCheckpoint(JSON.parse(cp.stateJson));
      expect(saved.drums).toEqual({ top: 2, middle: 1, bottom: 3 });
    } finally {
      stop();
    }
  });

  it("EV-10: running to drums, restarting, and skipping every step leaves 'inside' records and drums byte-equal in autosave", async () => {
    const { boot, store } = harness();
    const first = await boot();
    const { act, gameId } = await playAndQuitWithSeed(
      first.session,
      "~test-drums:2,1,0~test-inside:2",
    );

    const readInsideAndDrums = () => {
      const cp = store.lastCheckpoint(gameId);
      if (!cp) throw new Error("No checkpoint.");
      const raw = JSON.parse(cp.stateJson) as {
        drums?: unknown;
        dayClock?: { held: number; log: unknown[] };
      };
      return {
        drumsJson: JSON.stringify(raw.drums),
        insideJson: JSON.stringify({
          held: raw.dayClock?.held,
          heldLog: raw.dayClock?.log.filter((e) => (e as { kind?: string }).kind === "held"),
        }),
      };
    };

    const read1 = readInsideAndDrums();
    await act("continue-saved-game", "continue");
    await act(pieceCheckPromptId("hero-minis"), "confirm");
    await act(pieceCheckPromptId("skulls"), "confirm");
    expect(board(first.session).pieceCheck?.stepId).toBe("drums");

    // Restart host mid-check on drums step; the same iPad reconnects with its saved token.
    const roster = first.session.roster().devices;
    const savedDevice = roster[0];
    if (!savedDevice) throw new Error("Expected saved device.");
    const second = await boot();
    second.session.restoreDevices(
      roster.map((d) => ({ deviceId: d.id, token: d.token, formFactor: d.formFactor })),
    );
    second.tower.connect();
    second.tower.calibrate();
    expect(await second.session.resumeSession()).toBe(true);
    expect(second.session.state().screen).toBe("piece-check");
    expect(board(second.session).pieceCheck?.stepId).toBe("drums");

    const read2 = readInsideAndDrums();
    expect(read2.insideJson).toBe(read1.insideJson);
    expect(read2.drumsJson).toBe(read1.drumsJson);

    // Skip drums and trapped skulls without pressing Turn the drums.
    const rejoined = second.session.rejoin(savedDevice.token);
    await second.session.whenIdle();
    if (!rejoined.ok) throw new Error("rejoin refused");
    const act2 = actWith(second.session, rejoined.deviceId);
    await act2(pieceCheckPromptId("drums"), "skip");
    expect(board(second.session).pieceCheck?.stepId).toBe("trapped-skulls");
    await act2(pieceCheckPromptId("trapped-skulls"), "skip");
    expect(second.session.state().screen).toBe("play");
    expect(second.session.state().unconfirmedPieces).toEqual(["drums", "trapped-skulls"]);

    const read3 = readInsideAndDrums();
    expect(read3.insideJson).toBe(read1.insideJson);
    expect(read3.drumsJson).toBe(read1.drumsJson);
  });

  it("EV-12: host restart mid-check after confirming minis resumes on skulls with minis still confirmed", async () => {
    const { boot, store, clock } = harness();
    const first = await boot();
    const { act, gameId } = await playAndQuitWithSeed(first.session, "");

    await act("continue-saved-game", "continue");
    expect(board(first.session).pieceCheck?.stepId).toBe("hero-minis");
    await act(pieceCheckPromptId("hero-minis"), "confirm");
    expect(board(first.session).pieceCheck?.stepId).toBe("skulls");

    // Rebuild directly from the event log.
    const rebuilt = continueShellFromCheckpoint(store, {
      gameId,
      packVersion: "0.1.0",
      engineVersion: shellEngineVersion(),
      meta: { seed: "c2-11-seed", packVersion: "0.1.0", engineVersion: shellEngineVersion() },
      atMonoMs: clock.monoMs(),
      atWall: clock.wall(),
    });
    expect(rebuilt.state.screen).toBe("piece-check");
    expect(rebuilt.state.pieceCheck?.confirmed).toEqual(["hero-minis"]);
    expect(rebuilt.state.pieceCheck?.steps[rebuilt.state.pieceCheck.index]).toBe("skulls");

    // Also verify full host restart via resumeSession().
    const second = await boot();
    expect(await second.session.resumeSession()).toBe(true);
    expect(board(second.session).screen).toBe("piece-check");
    expect(board(second.session).pieceCheck?.stepId).toBe("skulls");
    expect(second.session.state().pieceCheck?.confirmed).toEqual(["hero-minis"]);
  });

  it("EV-24: restart on the quest-tokens step resumes there with minis, skulls, foes, and seals confirmed", async () => {
    const { boot } = harness();
    const first = await boot();
    const space = PROVING_GROUNDS_PLAY.board.spaces[1];
    if (!space) throw new Error("Expected space.");
    const { act } = await playAndQuitWithSeed(
      first.session,
      `~test-foes:oreks@${space.id}~test-broken-seals:road-seal~test-quest:${space.id}=herald`,
    );

    await act("continue-saved-game", "continue");
    expect(board(first.session).pieceCheck?.stepId).toBe("hero-minis");
    await act(pieceCheckPromptId("hero-minis"), "confirm");
    expect(board(first.session).pieceCheck?.stepId).toBe("skulls");
    await act(pieceCheckPromptId("skulls"), "confirm");
    expect(board(first.session).pieceCheck?.stepId).toBe("foes");
    await act(pieceCheckPromptId("foes"), "confirm");
    expect(board(first.session).pieceCheck?.stepId).toBe("broken-seals");
    await act(pieceCheckPromptId("broken-seals"), "confirm");
    expect(board(first.session).pieceCheck?.stepId).toBe("quest-tokens");
    expect(board(first.session).pieceCheck?.stepNumber).toBe("4a");

    // Restart and rebuild from the log.
    const second = await boot();
    expect(await second.session.resumeSession()).toBe(true);
    expect(board(second.session).screen).toBe("piece-check");
    expect(board(second.session).pieceCheck?.stepId).toBe("quest-tokens");
    expect(board(second.session).pieceCheck?.stepNumber).toBe("4a");
    expect(second.session.state().pieceCheck?.confirmed).toEqual([
      "hero-minis",
      "skulls",
      "foes",
      "broken-seals",
    ]);
  });

  it("EV-12 mid-rotate restart: crash during first rotate or between drums never deadlocks step 5 or auto-resends", async () => {
    const { boot, store, clock } = harness();
    const first = await boot();
    const { pad, act, gameId } = await playAndQuitWithSeed(first.session, "~test-drums:2,1,3");

    await act("continue-saved-game", "continue");
    await act(pieceCheckPromptId("hero-minis"), "confirm");
    await act(pieceCheckPromptId("skulls"), "confirm");
    expect(board(first.session).pieceCheck?.stepId).toBe("drums");

    // (a) Simulate crash immediately after pressing Turn the drums (logged before BLE result arrives).
    store.append({
      gameId,
      kind: "shell",
      payload: {
        v: 1,
        event: {
          kind: "press",
          v: 1,
          deviceId: pad,
          promptId: pieceCheckPromptId("drums"),
          actionId: "turn-drums",
        },
      },
      atMonoMs: clock.monoMs(),
      atWall: clock.wall(),
      deviceId: pad,
      seed: "c2-11-seed",
      packVersion: "0.1.0",
      engineVersion: shellEngineVersion(),
    });

    const roster = first.session.roster().devices;
    const savedDevice = roster[0];
    if (!savedDevice) throw new Error("Expected saved device.");

    const second = await boot();
    second.session.restoreDevices(
      roster.map((d) => ({ deviceId: d.id, token: d.token, formFactor: d.formFactor })),
    );
    second.tower.connect();
    second.tower.calibrate();
    expect(await second.session.resumeSession()).toBe(true);
    expect(second.session.state().screen).toBe("piece-check");
    expect(board(second.session).pieceCheck?.stepId).toBe("drums");
    expect(second.session.state().pieceCheck?.drumsTurning).toBe(false);
    expect(second.session.state().pieceCheck?.drumsTurned).toBe(false);
    // Tower safety: zero automatic rotate commands on restart.
    expect(second.tower.sent().filter((s) => s.type === "rotate-drum")).toHaveLength(0);

    const rejoined = second.session.rejoin(savedDevice.token);
    await second.session.whenIdle();
    if (!rejoined.ok) throw new Error("rejoin refused");
    const pad2 = rejoined.deviceId;
    const actions2 = second.session.projectDevice(pad2).actions;
    expect(actions2.find((a) => a.actionId === "turn-drums")?.open).toBe(true);
    expect(actions2.find((a) => a.actionId === "skip")?.open).toBe(true);
    expect(actions2.find((a) => a.actionId === "confirm")?.open).toBe(false);

    // (b) Simulate crash after drum 0 succeeded and wrote a checkpoint with drumsTurning: true
    // while drum 1 is still in flight.
    const cp = store.lastCheckpoint(gameId);
    if (!cp) throw new Error("Expected checkpoint.");
    const parsedCp = JSON.parse(cp.stateJson) as {
      screen?: string;
      pieceCheck?: Record<string, unknown>;
      drums?: Record<string, unknown>;
    };
    parsedCp.screen = "piece-check";
    parsedCp.pieceCheck = {
      ...second.session.state().pieceCheck,
      drumActual: { top: 2, middle: 0, bottom: 0 },
      drumsTurning: true,
      drumsTurned: false,
    };
    parsedCp.drums = { top: 2, middle: 1, bottom: 3 };
    store.writeCheckpoint({
      gameId,
      day: 1,
      afterEventSeq: store.nextSeq(gameId) - 1,
      stateJson: JSON.stringify(parsedCp),
      atMonoMs: clock.monoMs(),
      atWall: clock.wall(),
      seed: "c2-11-seed",
      packVersion: "0.1.0",
      engineVersion: shellEngineVersion(),
    });

    const third = await boot();
    third.session.restoreDevices(
      roster.map((d) => ({ deviceId: d.id, token: d.token, formFactor: d.formFactor })),
    );
    third.tower.connect();
    third.tower.calibrate();
    expect(await third.session.resumeSession()).toBe(true);
    expect(third.session.state().pieceCheck?.drumsTurning).toBe(false);
    expect(third.session.state().pieceCheck?.drumsTurned).toBe(false);
    expect(third.session.state().pieceCheck?.drumActual).toEqual({ top: 2, middle: 0, bottom: 0 });
    expect(third.tower.sent().filter((s) => s.type === "rotate-drum")).toHaveLength(0);

    const rejoined3 = third.session.rejoin(savedDevice.token);
    await third.session.whenIdle();
    if (!rejoined3.ok) throw new Error("rejoin refused");
    const act3 = actWith(third.session, rejoined3.deviceId);
    const actions3 = third.session.projectDevice(rejoined3.deviceId).actions;
    expect(actions3.find((a) => a.actionId === "turn-drums")?.open).toBe(true);
    expect(actions3.find((a) => a.actionId === "skip")?.open).toBe(true);
    expect(actions3.find((a) => a.actionId === "confirm")?.open).toBe(false);

    // Pressing Turn the drums now rotates only the remaining drums (middle, bottom) and finishes.
    await act3(pieceCheckPromptId("drums"), "turn-drums");
    expect(third.tower.sent().filter((s) => s.type === "rotate-drum")).toEqual([
      { type: "rotate-drum", drumIndex: 1, position: 1 },
      { type: "rotate-drum", drumIndex: 2, position: 3 },
    ]);
    await act3(pieceCheckPromptId("drums"), "confirm");
    expect(third.session.state().screen).toBe("play");
  });

  it("Continue with all heroes held and disconnected tower enters piece-check after Go on without or Reconnect", async () => {
    // Save reached play with tower linked, host restarts without Quit (so screen is pick-story),
    // original iPad rejoins with saved token (all heroes held), tower is disconnected,
    // press Continue -> hits tower-lost pause with returnTo: "piece-check".
    const runFromPickStory = async (resolution: "go-on-without" | "reconnect") => {
      const { boot, store } = harness();
      const first = await boot();
      const pad = await joinPad(first.session);
      const act = actWith(first.session, pad);
      await act("base-board-done", "board-set-up");
      await act("tower-connect", "tower-connect");
      await act("tower-calibrate", "tower-calibrate");
      first.session.syncTowerSnapshot();
      await first.session.whenIdle();
      await act("continue-pick-story-test", "continue");
      await act("set-setting", "set", { settingId: "hints", optionId: "off" });
      await act("continue-game-settings", "continue");
      for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
        await act("hero-hold", "take", { heroId });
      }
      await act("continue-claim-heroes", "continue");
      for (const step of first.session.state().setupSteps) {
        if (step.id === "starting-purse") await act(`spin-setup-${step.id}`, "spin");
        await act(`continue-setup-${step.id}`, "continue");
      }
      await act("continue-begin", "continue");
      for (const moment of OPENING_MOMENTS) await act(openingPromptId(moment), "continue");
      await first.session.applyTestSeed("~test-drums:2,0,0~test-inside:1");
      const gameId = first.session.currentGameId();
      if (!gameId) throw new Error("No game id.");
      // Host crashes without Quit (so resumeSession returns to pick-story, not session).
      const roster = first.session.roster().devices;
      const savedDevice = roster[0];
      if (!savedDevice) throw new Error("Expected saved device.");

      const second = await boot();
      second.session.restoreDevices(
        roster.map((d) => ({ deviceId: d.id, token: d.token, formFactor: d.formFactor })),
      );
      expect(await second.session.resumeSession()).toBe(true);
      second.session.rememberAutosave({ gameId, packId: "test", day: 1 });
      second.session.syncTowerSnapshot();
      await second.session.whenIdle();
      expect(second.session.state().screen).toBe("pick-story");

      const rejoined = second.session.rejoin(savedDevice.token);
      await second.session.whenIdle();
      if (!rejoined.ok) throw new Error("rejoin refused");
      const act2 = actWith(second.session, rejoined.deviceId);

      // Press Continue while tower is disconnected and all heroes are already held.
      await act2("continue-saved-game", "continue");
      expect(second.session.state().screen).toBe("pause");
      expect(second.session.state().pause).toEqual({
        cause: "tower-lost",
        returnTo: "piece-check",
      });

      if (resolution === "go-on-without") {
        await act2(pauseGoWithoutPrompt(second.session.state().pauseSerial), "go-on-without");
        expect(second.session.state().screen).toBe("piece-check");
        expect(second.session.state().pieceCheck?.steps).toEqual(["hero-minis", "skulls"]);
        await act2(pieceCheckPromptId("hero-minis"), "confirm");
        await act2(pieceCheckPromptId("skulls"), "confirm");
        expect(second.session.state().screen).toBe("play");
        expect(second.session.state().pieceCheck).toBeNull();
      } else {
        await act2(pauseReconnectPrompt(second.session.state().pauseSerial), "reconnect");
        expect(second.session.state().screen).toBe("tower-wake");
        await act2("tower-calibrate", "tower-calibrate");
        expect(second.session.state().screen).toBe("piece-check");
        expect(second.session.state().pieceCheck?.steps).toEqual([
          "hero-minis",
          "skulls",
          "drums",
          "trapped-skulls",
        ]);
        // Confirm step 1 and verify piece-check-start was persisted so a restart survives on skulls.
        await act2(pieceCheckPromptId("hero-minis"), "confirm");
        expect(board(second.session).pieceCheck?.stepId).toBe("skulls");
        const third = await boot();
        expect(await third.session.resumeSession()).toBe(true);
        expect(third.session.state().screen).toBe("piece-check");
        expect(board(third.session).pieceCheck?.stepId).toBe("skulls");
        expect(store.listEvents(gameId).length).toBeGreaterThan(0);
      }
    };

    await runFromPickStory("go-on-without");
    await runFromPickStory("reconnect");
  });

  it("quitting from a pause mid-check clears pieceCheck so restart stays on session and next Continue starts at step 1", async () => {
    const { boot } = harness();
    const first = await boot();
    const { act } = await playAndQuitWithSeed(first.session, "");

    // Continue and confirm step 1 (now on skulls).
    await act("continue-saved-game", "continue");
    expect(board(first.session).pieceCheck?.stepId).toBe("hero-minis");
    await act(pieceCheckPromptId("hero-minis"), "confirm");
    expect(board(first.session).pieceCheck?.stepId).toBe("skulls");

    // Drop the tower to open a pause mid-check, then Quit from the pause.
    first.tower.loseConnection();
    first.session.syncTowerSnapshot();
    await first.session.whenIdle();
    expect(first.session.state().screen).toBe("pause");
    expect(first.session.state().pause?.cause).toBe("tower-lost");

    await act(pauseQuitPrompt(first.session.state().pauseSerial), "quit-story");
    expect(first.session.state().screen).toBe("session");
    expect(first.session.state().pieceCheck).toBeNull();

    // (a) Host restart from session screen must stay on session, never hijacking into piece-check.
    const roster = first.session.roster().devices;
    const savedDevice = roster[0];
    if (!savedDevice) throw new Error("Expected saved device.");
    const second = await boot();
    second.session.restoreDevices(
      roster.map((d) => ({ deviceId: d.id, token: d.token, formFactor: d.formFactor })),
    );
    second.tower.connect();
    second.tower.calibrate();
    expect(await second.session.resumeSession()).toBe(true);
    expect(second.session.state().screen).toBe("session");
    expect(second.session.state().pieceCheck).toBeNull();

    // (b) Pressing Continue again must start a fresh piece check at step 1 (hero-minis).
    const rejoined = second.session.rejoin(savedDevice.token);
    await second.session.whenIdle();
    if (!rejoined.ok) throw new Error("rejoin refused");
    const act2 = actWith(second.session, rejoined.deviceId);
    const saved = second.session.state().autosave;
    if (!saved) {
      const row = first.session.state().autosave;
      if (!row) throw new Error("Expected autosave.");
      second.session.rememberAutosave({ gameId: row.gameId, packId: row.packId, day: row.day });
    }
    second.session.syncTowerSnapshot();
    await second.session.whenIdle();

    await act2("continue-saved-game", "continue");
    expect(second.session.state().screen).toBe("piece-check");
    expect(board(second.session).pieceCheck?.stepId).toBe("hero-minis");
    expect(second.session.state().pieceCheck?.confirmed).toEqual([]);
  });

  it("mid-check restart with a fresh iPad preserves live devices and triggers CU/16 re-pick on entering play", async () => {
    const { boot } = harness();
    const first = await boot();
    const { pad: oldPad, act } = await playAndQuitWithSeed(first.session, "");

    await act("continue-saved-game", "continue");
    await act(pieceCheckPromptId("hero-minis"), "confirm");
    expect(board(first.session).pieceCheck?.stepId).toBe("skulls");

    // Restart without rejoining oldPad; join a brand-new iPad instead.
    const second = await boot();
    second.tower.connect();
    second.tower.calibrate();
    expect(await second.session.resumeSession()).toBe(true);
    expect(second.session.state().screen).toBe("piece-check");
    expect(second.session.state().devices.has(oldPad)).toBe(false);

    const newPad = await joinPad(second.session);
    expect(newPad).not.toBe(oldPad);
    expect([...second.session.state().devices]).toEqual([newPad]);

    const act2 = actWith(second.session, newPad);
    await act2(pieceCheckPromptId("skulls"), "confirm");

    // Entering play with dead pre-restart holders triggers CU/16 disconnect re-pick.
    expect(second.session.state().screen).toBe("pause");
    expect(second.session.state().pause?.cause).toBe("disconnect");
    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
      expect(second.session.state().holdings[heroId] ?? null).toBeNull();
    }

    // New iPad claims all heroes, enters play, owns all channels, and passes hero-gated checks.
    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
      await act2("hero-hold", "take", { heroId });
    }
    expect(second.session.state().screen).toBe("play");
    expect(second.session.channelsFor(newPad).sort()).toEqual([
      "ipad:hero-a",
      "ipad:hero-b",
      "ipad:hero-c",
      "ipad:hero-d",
    ]);
    const firstGroupId = second.session.state().play?.groups[0]?.id;
    if (!firstGroupId) throw new Error("Expected group.");
    const choicePrompt = eventChoicePromptId(firstGroupId, "pay-off");
    expect(
      eventPressDeviceRefusal(second.session.state(), newPad, choicePrompt, "choose"),
    ).toBeNull();
    expect(
      eventPressDeviceRefusal(second.session.state(), oldPad, choicePrompt, "choose"),
    ).not.toBeNull();
  });

  it("rebuilds accurately across two Continue sittings in the same game log", async () => {
    const { boot } = harness();
    const first = await boot();
    const { act } = await playAndQuitWithSeed(first.session, "");

    // Sitting 2: Continue, finish piece check, seed a foe in play (no new checkpoint), then Quit.
    await act("continue-saved-game", "continue");
    await act(pieceCheckPromptId("hero-minis"), "confirm");
    await act(pieceCheckPromptId("skulls"), "confirm");
    expect(first.session.state().screen).toBe("play");
    const space = PROVING_GROUNDS_PLAY.board.spaces[1];
    if (!space) throw new Error("Expected space.");
    await first.session.applyTestSeed(`~test-foes:oreks@${space.id}`);
    await act("menu-quit", "quit-story");
    expect(first.session.state().screen).toBe("session");

    // Sitting 3: Continue again — Sitting 2's foe must be present, and a fresh check runs.
    await act("continue-saved-game", "continue");
    expect(first.session.state().screen).toBe("piece-check");
    expect(first.session.state().pieceCheck?.steps).toEqual(["hero-minis", "skulls", "foes"]);
    await act(pieceCheckPromptId("hero-minis"), "confirm");
    expect(board(first.session).pieceCheck?.stepId).toBe("skulls");

    // Host restart mid-check during Sitting 3 rebuilds cleanly at skulls with foes intact.
    const second = await boot();
    second.tower.connect();
    second.tower.calibrate();
    expect(await second.session.resumeSession()).toBe(true);
    expect(second.session.state().screen).toBe("piece-check");
    expect(board(second.session).pieceCheck?.stepId).toBe("skulls");
    expect(second.session.state().pieceCheck?.steps).toEqual(["hero-minis", "skulls", "foes"]);
    expect(second.session.state().pieceCheck?.confirmed).toEqual(["hero-minis"]);
  });

  it("mid-check restart of a Play-without-Tower Continue keeps tower unlinked across syncTowerSnapshot and play entry", async () => {
    const { boot } = harness();
    const first = await boot();
    const pad = await joinPad(first.session);
    const act = actWith(first.session, pad);
    await act("base-board-done", "board-set-up");
    await act("tower-connect", "tower-connect");
    await act("tower-calibrate", "tower-calibrate");
    first.session.syncTowerSnapshot();
    await first.session.whenIdle();
    await act("continue-pick-story-test", "continue");
    await act("set-setting", "set", { settingId: "hints", optionId: "off" });
    await act("continue-game-settings", "continue");
    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
      await act("hero-hold", "take", { heroId });
    }
    await act("continue-claim-heroes", "continue");
    for (const step of first.session.state().setupSteps) {
      if (step.id === "starting-purse") await act(`spin-setup-${step.id}`, "spin");
      await act(`continue-setup-${step.id}`, "continue");
    }
    await act("continue-begin", "continue");
    for (const moment of OPENING_MOMENTS) await act(openingPromptId(moment), "continue");
    await first.session.applyTestSeed("~test-drums:2,0,0~test-inside:1");
    const gameId = first.session.currentGameId();
    if (!gameId) throw new Error("No game id.");
    const roster = first.session.roster().devices;
    const savedDevice = roster[0];
    if (!savedDevice) throw new Error("Expected saved device.");

    // New evening without tower: Enter -> Play without Tower -> Pick story -> Continue.
    // Continuing from pick-story does not rewrite the saved game's checkpoint (which still has
    // towerLinked: true, towerWithout: false).
    const tonight = await boot();
    tonight.session.restoreDevices(
      roster.map((d) => ({ deviceId: d.id, token: d.token, formFactor: d.formFactor })),
    );
    tonight.session.rememberAutosave({ gameId, packId: "test", day: 1 });
    const rejoinedTonight = tonight.session.rejoin(savedDevice.token);
    await tonight.session.whenIdle();
    if (!rejoinedTonight.ok) throw new Error("rejoin refused");
    const actTonight = actWith(tonight.session, rejoinedTonight.deviceId);
    await actTonight("base-board-done", "board-set-up");
    await actTonight("play-without-tower", "play-without-tower");
    expect(tonight.session.state().screen).toBe("pick-story");

    await actTonight("continue-saved-game", "continue");
    expect(tonight.session.state().screen).toBe("piece-check");
    expect(tonight.session.state().pieceCheck?.steps).toEqual(["hero-minis", "skulls"]);
    await actTonight(pieceCheckPromptId("hero-minis"), "confirm");
    expect(board(tonight.session).pieceCheck?.stepId).toBe("skulls");

    // Host restarts mid-check with the tower disconnected.
    const third = await boot();
    third.session.restoreDevices(
      roster.map((d) => ({ deviceId: d.id, token: d.token, formFactor: d.formFactor })),
    );
    expect(await third.session.resumeSession()).toBe(true);
    expect(third.session.state().screen).toBe("piece-check");
    expect(board(third.session).pieceCheck?.stepId).toBe("skulls");
    expect(third.session.state().towerLinked).toBe(false);
    expect(third.session.state().towerWithout).toBe(true);
    expect(third.session.state().towerChoice).toBe("without");

    // A disconnected tower snapshot mid-check must NOT trigger a spurious tower-lost pause.
    third.session.syncTowerSnapshot();
    await third.session.whenIdle();
    expect(third.session.state().screen).toBe("piece-check");
    expect(third.session.state().pause).toBeNull();

    // Finishing the piece check into play must stay unpaused and unlinked.
    const rejoinedThird = third.session.rejoin(savedDevice.token);
    await third.session.whenIdle();
    if (!rejoinedThird.ok) throw new Error("rejoin refused");
    const actThird = actWith(third.session, rejoinedThird.deviceId);
    await actThird(pieceCheckPromptId("skulls"), "confirm");
    expect(third.session.state().screen).toBe("play");
    expect(third.session.state().pause).toBeNull();
    expect(third.session.state().towerLinked).toBe(false);
    expect(third.session.state().towerWithout).toBe(true);
    expect(third.session.state().towerChoice).toBe("without");
  });

  it("mid-check restart after Go on without on Continue keeps tower unlinked into play", async () => {
    const { boot } = harness();
    const first = await boot();
    const { gameId } = await playAndQuitWithSeed(first.session, "~test-drums:2,0,0~test-inside:1");
    const roster = first.session.roster().devices;
    const savedDevice = roster[0];
    if (!savedDevice) throw new Error("Expected saved device.");

    // Restart onto pick-story with towerChoice: connect, tower disconnected, all heroes held.
    const second = await boot();
    second.session.restoreDevices(
      roster.map((d) => ({ deviceId: d.id, token: d.token, formFactor: d.formFactor })),
    );
    expect(await second.session.resumeSession()).toBe(true);
    second.session.rememberAutosave({ gameId, packId: "test", day: 1 });
    second.session.syncTowerSnapshot();
    await second.session.whenIdle();
    const rejoined2 = second.session.rejoin(savedDevice.token);
    await second.session.whenIdle();
    if (!rejoined2.ok) throw new Error("rejoin refused");
    const act2 = actWith(second.session, rejoined2.deviceId);

    // Continue hits tower-lost pause -> Go on without -> confirm step 1 -> host restarts mid-check.
    await act2("continue-saved-game", "continue");
    expect(second.session.state().screen).toBe("tower-choice");
    await act2("play-without-tower", "play-without-tower");
    expect(second.session.state().screen).toBe("piece-check");
    expect(second.session.state().pieceCheck?.steps).toEqual(["hero-minis", "skulls"]);
    await act2(pieceCheckPromptId("hero-minis"), "confirm");
    expect(board(second.session).pieceCheck?.stepId).toBe("skulls");

    const third = await boot();
    third.session.restoreDevices(
      roster.map((d) => ({ deviceId: d.id, token: d.token, formFactor: d.formFactor })),
    );
    expect(await third.session.resumeSession()).toBe(true);
    expect(third.session.state().screen).toBe("piece-check");
    expect(third.session.state().towerLinked).toBe(false);
    expect(third.session.state().towerWithout).toBe(true);
    expect(third.session.state().towerChoice).toBe("without");
    third.session.syncTowerSnapshot();
    await third.session.whenIdle();
    expect(third.session.state().screen).toBe("piece-check");
    expect(third.session.state().pause).toBeNull();

    const rejoined3 = third.session.rejoin(savedDevice.token);
    await third.session.whenIdle();
    if (!rejoined3.ok) throw new Error("rejoin refused");
    const act3 = actWith(third.session, rejoined3.deviceId);
    await act3(pieceCheckPromptId("skulls"), "confirm");
    expect(third.session.state().screen).toBe("play");
    expect(third.session.state().pause).toBeNull();
    expect(third.session.state().towerLinked).toBe(false);
    expect(third.session.state().towerWithout).toBe(true);
  });

  it("Continue after a crash during a tower-lost pause mid-check refreshes piece-check offers and finishes into play", async () => {
    const { boot } = harness();
    const first = await boot();
    const { act, gameId } = await playAndQuitWithSeed(first.session, "~test-drums:2,0,0");

    // Continue, confirm step 1 (now on skulls), then drop the tower to open a tower-lost pause.
    await act("continue-saved-game", "continue");
    await act(pieceCheckPromptId("hero-minis"), "confirm");
    expect(board(first.session).pieceCheck?.stepId).toBe("skulls");

    first.tower.loseConnection();
    first.session.syncTowerSnapshot();
    await first.session.whenIdle();
    expect(first.session.state().screen).toBe("pause");
    expect(first.session.state().pause).toEqual({
      cause: "tower-lost",
      returnTo: "piece-check",
    });

    // Host crashes during the tower-lost pause; restarts with tower ready and same iPad rejoined.
    const roster = first.session.roster().devices;
    const savedDevice = roster[0];
    if (!savedDevice) throw new Error("Expected saved device.");

    const second = await boot();
    second.session.restoreDevices(
      roster.map((d) => ({ deviceId: d.id, token: d.token, formFactor: d.formFactor })),
    );
    second.tower.connect();
    second.tower.calibrate();
    expect(await second.session.resumeSession()).toBe(true);
    second.session.rememberAutosave({ gameId, packId: "test", day: 1 });
    second.session.syncTowerSnapshot();
    await second.session.whenIdle();
    const rejoined = second.session.rejoin(savedDevice.token);
    await second.session.whenIdle();
    if (!rejoined.ok) throw new Error("rejoin refused");
    const pad2 = rejoined.deviceId;
    const act2 = actWith(second.session, pad2);

    // Continue clears the tower-lost pause, lands on skulls with fresh piece-check offers (no stale pause-* offers).
    await act2("continue-saved-game", "continue");
    expect(second.session.state().screen).toBe("piece-check");
    expect(second.session.state().pause).toBeNull();
    expect(board(second.session).pieceCheck?.stepId).toBe("skulls");
    const skullActions = second.session.projectDevice(pad2).actions;
    expect(skullActions.some((a) => a.promptId.startsWith("pause-"))).toBe(false);
    expect(
      skullActions.find(
        (a) => a.promptId === pieceCheckPromptId("skulls") && a.actionId === "confirm",
      )?.open,
    ).toBe(true);
    expect(
      skullActions.find((a) => a.promptId === pieceCheckPromptId("skulls") && a.actionId === "skip")
        ?.open,
    ).toBe(true);

    // Confirm skulls -> advances to drums -> restart again to verify replay survives past the old pause.
    await act2(pieceCheckPromptId("skulls"), "confirm");
    expect(board(second.session).pieceCheck?.stepId).toBe("drums");

    const third = await boot();
    third.session.restoreDevices(
      roster.map((d) => ({ deviceId: d.id, token: d.token, formFactor: d.formFactor })),
    );
    third.tower.connect();
    third.tower.calibrate();
    expect(await third.session.resumeSession()).toBe(true);
    expect(third.session.state().screen).toBe("piece-check");
    expect(board(third.session).pieceCheck?.stepId).toBe("drums");

    const rejoined3 = third.session.rejoin(savedDevice.token);
    await third.session.whenIdle();
    if (!rejoined3.ok) throw new Error("rejoin refused");
    const act3 = actWith(third.session, rejoined3.deviceId);
    await act3(pieceCheckPromptId("drums"), "turn-drums");
    await act3(pieceCheckPromptId("drums"), "confirm");
    expect(third.session.state().screen).toBe("play");
    expect(third.session.state().pieceCheck).toBeNull();
    expect(third.session.state().pause).toBeNull();
  });

  it("Continue without tower after a crash during a tower-lost pause mid-check clears pause, drops tower steps, and finishes into play", async () => {
    const { boot } = harness();
    const first = await boot();
    const { act, gameId } = await playAndQuitWithSeed(first.session, "~test-drums:2,0,0");

    await act("continue-saved-game", "continue");
    await act(pieceCheckPromptId("hero-minis"), "confirm");
    expect(board(first.session).pieceCheck?.stepId).toBe("skulls");

    first.tower.loseConnection();
    first.session.syncTowerSnapshot();
    await first.session.whenIdle();
    expect(first.session.state().screen).toBe("pause");
    expect(first.session.state().pause?.cause).toBe("tower-lost");

    const roster = first.session.roster().devices;
    const savedDevice = roster[0];
    if (!savedDevice) throw new Error("Expected saved device.");

    // Restart with tower still disconnected; table runs Enter -> Play without Tower -> Continue.
    const second = await boot();
    second.session.restoreDevices(
      roster.map((d) => ({ deviceId: d.id, token: d.token, formFactor: d.formFactor })),
    );
    second.session.rememberAutosave({ gameId, packId: "test", day: 1 });
    const rejoined = second.session.rejoin(savedDevice.token);
    await second.session.whenIdle();
    if (!rejoined.ok) throw new Error("rejoin refused");
    const pad2 = rejoined.deviceId;
    const act2 = actWith(second.session, pad2);
    await act2("base-board-done", "board-set-up");
    await act2("play-without-tower", "play-without-tower");

    await act2("continue-saved-game", "continue");
    expect(second.session.state().screen).toBe("piece-check");
    expect(second.session.state().pause).toBeNull();
    expect(second.session.state().towerLinked).toBe(false);
    expect(second.session.state().towerWithout).toBe(true);
    expect(second.session.state().pieceCheck?.steps).toEqual(["hero-minis", "skulls"]);
    expect(board(second.session).pieceCheck?.stepId).toBe("skulls");

    await act2(pieceCheckPromptId("skulls"), "confirm");
    expect(second.session.state().screen).toBe("play");
    expect(second.session.state().pause).toBeNull();
    expect(second.session.state().pieceCheck).toBeNull();
  });

  it("restart after finishing Play-without-Tower Continue from a mid-check tower-lost crash restores pick-story and CU/16 hero re-pick", async () => {
    const { boot } = harness();
    const first = await boot();
    const {
      pad: oldPad,
      act,
      gameId,
    } = await playAndQuitWithSeed(first.session, "~test-drums:2,0,0");

    // Mid-check on skulls, tower drops -> tower-lost pause -> host crashes.
    await act("continue-saved-game", "continue");
    await act(pieceCheckPromptId("hero-minis"), "confirm");
    expect(board(first.session).pieceCheck?.stepId).toBe("skulls");

    first.tower.loseConnection();
    first.session.syncTowerSnapshot();
    await first.session.whenIdle();
    expect(first.session.state().screen).toBe("pause");
    expect(first.session.state().pause?.cause).toBe("tower-lost");

    const roster = first.session.roster().devices;
    const savedDevice = roster[0];
    if (!savedDevice) throw new Error("Expected saved device.");

    // Second host: Enter -> Play without Tower -> Continue -> confirm skulls into play
    // (before any play-move checkpoint is written).
    const second = await boot();
    second.session.restoreDevices(
      roster.map((d) => ({ deviceId: d.id, token: d.token, formFactor: d.formFactor })),
    );
    second.session.rememberAutosave({ gameId, packId: "test", day: 1 });
    const rejoined = second.session.rejoin(savedDevice.token);
    await second.session.whenIdle();
    if (!rejoined.ok) throw new Error("rejoin refused");
    const act2 = actWith(second.session, rejoined.deviceId);
    await act2("base-board-done", "board-set-up");
    await act2("play-without-tower", "play-without-tower");
    await act2("continue-saved-game", "continue");
    expect(second.session.state().screen).toBe("piece-check");
    expect(second.session.state().pieceCheck?.steps).toEqual(["hero-minis", "skulls"]);

    await act2(pieceCheckPromptId("skulls"), "confirm");
    expect(second.session.state().screen).toBe("play");
    expect(second.session.state().pieceCheck).toBeNull();

    // Third host restarts before any play-move checkpoint: must NOT boot directly into "play"
    // with empty devices and dead pre-restart holdings.
    const third = await boot();
    third.session.rememberAutosave({ gameId, packId: "test", day: 1 });
    expect(await third.session.resumeSession()).toBe(true);
    expect(third.session.state().screen).toBe("pick-story");
    expect(third.session.state().towerChoice).toBe("without");
    expect(third.session.state().pieceCheck).toBeNull();

    // A brand-new iPad joins and presses Continue: seatOnContinue clears dead holdings and opens
    // CU/16 disconnect re-pick, then runs a non-tower piece check and seats all heroes on newPad.
    const newPad = await joinPad(third.session);
    expect(newPad).not.toBe(oldPad);
    const act3 = actWith(third.session, newPad);
    await act3("continue-saved-game", "continue");
    expect(third.session.state().screen).toBe("pause");
    expect(third.session.state().pause?.cause).toBe("disconnect");
    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
      expect(third.session.state().holdings[heroId] ?? null).toBeNull();
    }

    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
      await act3("hero-hold", "take", { heroId });
    }
    expect(third.session.state().screen).toBe("piece-check");
    expect(third.session.state().towerWithout).toBe(true);
    expect(third.session.state().towerLinked).toBe(false);
    expect(third.session.state().pieceCheck?.steps).toEqual(["hero-minis", "skulls"]);

    await act3(pieceCheckPromptId("hero-minis"), "confirm");
    await act3(pieceCheckPromptId("skulls"), "confirm");
    expect(third.session.state().screen).toBe("play");
    expect(third.session.state().pause).toBeNull();
    expect(third.session.channelsFor(newPad).sort()).toEqual([
      "ipad:hero-a",
      "ipad:hero-b",
      "ipad:hero-c",
      "ipad:hero-d",
    ]);
    const firstGroupId = third.session.state().play?.groups[0]?.id;
    if (!firstGroupId) throw new Error("Expected group.");
    const choicePrompt = eventChoicePromptId(firstGroupId, "pay-off");
    expect(
      eventPressDeviceRefusal(third.session.state(), newPad, choicePrompt, "choose"),
    ).toBeNull();
    expect(
      eventPressDeviceRefusal(third.session.state(), oldPad, choicePrompt, "choose"),
    ).not.toBeNull();
  });

  it("disconnected tower-snapshot between Play-without-Tower Continue and next step confirm survives host restart", async () => {
    const { boot } = harness();
    const first = await boot();
    const space = PROVING_GROUNDS_PLAY.board.spaces[1];
    if (!space) throw new Error("Expected space.");
    const { act, gameId } = await playAndQuitWithSeed(
      first.session,
      `~test-foes:oreks@${space.id}~test-drums:2,0,0`,
    );

    // Mid-check on skulls (with foes and drums still ahead), tower drops -> tower-lost pause.
    await act("continue-saved-game", "continue");
    await act(pieceCheckPromptId("hero-minis"), "confirm");
    expect(board(first.session).pieceCheck?.stepId).toBe("skulls");

    first.tower.loseConnection();
    first.session.syncTowerSnapshot();
    await first.session.whenIdle();
    expect(first.session.state().screen).toBe("pause");
    expect(first.session.state().pause?.cause).toBe("tower-lost");

    const roster = first.session.roster().devices;
    const savedDevice = roster[0];
    if (!savedDevice) throw new Error("Expected saved device.");

    // Second host: Enter -> Play without Tower -> Continue -> disconnected tower-snapshot -> confirm skulls.
    const second = await boot();
    second.session.restoreDevices(
      roster.map((d) => ({ deviceId: d.id, token: d.token, formFactor: d.formFactor })),
    );
    second.session.rememberAutosave({ gameId, packId: "test", day: 1 });
    const rejoined = second.session.rejoin(savedDevice.token);
    await second.session.whenIdle();
    if (!rejoined.ok) throw new Error("rejoin refused");
    const act2 = actWith(second.session, rejoined.deviceId);
    await act2("base-board-done", "board-set-up");
    await act2("play-without-tower", "play-without-tower");
    await act2("continue-saved-game", "continue");
    expect(second.session.state().screen).toBe("piece-check");
    expect(second.session.state().pieceCheck?.steps).toEqual(["hero-minis", "skulls", "foes"]);

    // Disconnected tower-snapshot arrives between Continue and confirming skulls.
    second.session.syncTowerSnapshot();
    await second.session.whenIdle();
    expect(second.session.state().screen).toBe("piece-check");
    expect(second.session.state().pause).toBeNull();

    await act2(pieceCheckPromptId("skulls"), "confirm");
    expect(second.session.state().screen).toBe("piece-check");
    expect(board(second.session).pieceCheck?.stepId).toBe("foes");

    // Host restarts: replay must NOT re-open tower-lost or drop the skulls confirmation.
    const third = await boot();
    third.session.restoreDevices(
      roster.map((d) => ({ deviceId: d.id, token: d.token, formFactor: d.formFactor })),
    );
    third.session.rememberAutosave({ gameId, packId: "test", day: 1 });
    expect(await third.session.resumeSession()).toBe(true);
    expect(third.session.state().screen).toBe("piece-check");
    expect(third.session.state().pause).toBeNull();
    expect(third.session.state().towerLinked).toBe(false);
    expect(third.session.state().towerWithout).toBe(true);
    expect(third.session.state().towerChoice).toBe("without");
    expect(board(third.session).pieceCheck?.stepId).toBe("foes");
    expect(third.session.state().pieceCheck?.steps).toEqual(["hero-minis", "skulls", "foes"]);
    expect(third.session.state().pieceCheck?.confirmed).toEqual(["hero-minis", "skulls"]);

    const rejoined3 = third.session.rejoin(savedDevice.token);
    await third.session.whenIdle();
    if (!rejoined3.ok) throw new Error("rejoin refused");
    const act3 = actWith(third.session, rejoined3.deviceId);
    await act3(pieceCheckPromptId("foes"), "confirm");
    expect(third.session.state().screen).toBe("play");
    expect(third.session.state().pause).toBeNull();
    expect(third.session.state().pieceCheck).toBeNull();
  });

  it("resumeSession falls through to pick-story when dropping tower steps finishes a mid-check save", async () => {
    const { boot } = harness();
    const first = await boot();
    const {
      pad: oldPad,
      act,
      gameId,
    } = await playAndQuitWithSeed(first.session, "~test-drums:2,0,0");

    // Confirm all non-tower steps so piece check sits on drums, then crash mid-check.
    await act("continue-saved-game", "continue");
    await act(pieceCheckPromptId("hero-minis"), "confirm");
    await act(pieceCheckPromptId("skulls"), "confirm");
    expect(board(first.session).pieceCheck?.stepId).toBe("drums");

    // Simulate a subsequent session checkpoint with towerChoice: "without" (e.g. an older log
    // before playWithout was persisted on the game) while the game log still sits on drums.
    const second = await boot();
    const pad2 = await joinPad(second.session);
    const act2 = actWith(second.session, pad2);
    await act2("base-board-done", "board-set-up");
    await act2("play-without-tower", "play-without-tower");
    expect(second.session.state().screen).toBe("pick-story");
    expect(second.session.state().towerChoice).toBe("without");

    // Host restarts: dropping drums would finish midCheck into "play", so resumeSession must
    // fall through to pick-story instead of booting directly into "play" with dead holdings.
    const third = await boot();
    third.session.rememberAutosave({ gameId, packId: "test", day: 1 });
    expect(await third.session.resumeSession()).toBe(true);
    expect(third.session.state().screen).toBe("pick-story");
    expect(third.session.state().towerChoice).toBe("without");

    const newPad = await joinPad(third.session);
    expect(newPad).not.toBe(oldPad);
    const act3 = actWith(third.session, newPad);
    await act3("continue-saved-game", "continue");
    expect(third.session.state().screen).toBe("pause");
    expect(third.session.state().pause?.cause).toBe("disconnect");
    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
      await act3("hero-hold", "take", { heroId });
    }
    expect(third.session.state().screen).toBe("play");
    expect(third.session.state().towerWithout).toBe(true);
    expect(third.session.channelsFor(newPad).sort()).toEqual([
      "ipad:hero-a",
      "ipad:hero-b",
      "ipad:hero-c",
      "ipad:hero-d",
    ]);
  });
});
