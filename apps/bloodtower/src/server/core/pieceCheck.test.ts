import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TEST_STORY } from "../../engine/loops/session/pack.ts";
import { pieceCheckPromptId } from "../../engine/loops/session/pieceCheck.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
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

      // Autosave has top's new position (2) and middle's/bottom's old calibrated positions (0, 0).
      const cp = store.lastCheckpoint(gameId);
      if (!cp) throw new Error("Expected checkpoint.");
      const saved = parseShellCheckpoint(JSON.parse(cp.stateJson));
      expect(saved.drums).toEqual({ top: 2, middle: 0, bottom: 0 });
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

    // Restart host mid-check on drums step.
    const second = await boot();
    second.tower.connect();
    second.tower.calibrate();
    expect(await second.session.resumeSession()).toBe(true);
    expect(second.session.state().screen).toBe("piece-check");
    expect(board(second.session).pieceCheck?.stepId).toBe("drums");

    const read2 = readInsideAndDrums();
    expect(read2.insideJson).toBe(read1.insideJson);
    expect(read2.drumsJson).toBe(read1.drumsJson);

    // Skip drums and trapped skulls without pressing Turn the drums.
    const pad2 = await joinPad(second.session);
    const act2 = actWith(second.session, pad2);
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
});
