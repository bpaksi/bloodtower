import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type ShellStory, TEST_STORY } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { SHELL_ENGINE_VERSION } from "../../engine/loops/session/state.ts";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import type { ErrorCode } from "../../protocols/v2/index.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower, type MockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { type CoreSession, createCoreSession } from "./session.ts";

const dirs: string[] = [];
const closers: Array<() => void> = [];

afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const harness = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-enter-"));
  dirs.push(dir);
  const opened = openDatabase(join(dir, "session.sqlite"));
  closers.push(() => opened.close());
  const store = createEventStore(opened.db);
  const log = createHostLogger({ dataDir: dir, mirror: false });
  const clock = stepClock();
  let count = 0;
  /** One host process: a fresh session on the same database, with a fresh mock tower. */
  const boot = async (
    onDeviceError?: (deviceId: string, code: ErrorCode, message: string) => void,
    stories: ShellStory[] = [TEST_STORY],
  ): Promise<{ session: CoreSession; tower: MockTower }> => {
    count += 1;
    const tower = createMockTower({ log });
    const session = createCoreSession({
      sessionId: `session-${count}`,
      seed: "seed",
      stories,
      playContent: PROVING_GROUNDS_PLAY,
      packVersion: "0.1.0",
      store,
      tower: bloodtowerTowerFromMock(tower),
      clock,
      log,
      onChange: () => {},
      onDeviceError,
      graceMs: 10,
    });
    await session.whenIdle();
    return { session, tower };
  };
  return { dir, store, boot, sessions: createSessionStore(opened.db) };
};

const press = async (session: CoreSession, promptId: string, actionId: string) => {
  session.act("ipad-0", promptId, actionId, {});
  await session.whenIdle();
};

const joinPad = async (session: CoreSession) => {
  const joined = session.join({ joinCode: "000000", formFactor: "ipad" });
  await session.whenIdle();
  if (!joined.ok) throw new Error("join refused");
  return joined.deviceId;
};

const pressAs = async (
  session: CoreSession,
  deviceId: string,
  promptId: string,
  actionId: string,
  args: Record<string, unknown> = {},
) => {
  session.act(deviceId, promptId, actionId, args);
  await session.whenIdle();
};

describe("the Enter and a host restart", () => {
  it("resumes tonight's choice without the Enter after a Play without Tower (EV-13)", async () => {
    const { boot } = harness();
    const first = await boot();
    const pad = await joinPad(first.session);
    await pressAs(first.session, pad, "base-board-done", "board-set-up");
    await pressAs(first.session, pad, "play-without-tower", "play-without-tower");
    expect(first.session.state().screen).toBe("pick-story");

    const second = await boot();
    expect(second.session.state().screen).toBe("table-join");
    expect(await second.session.resumeSession()).toBe(true);
    const state = second.session.state();
    expect(state.screen).toBe("pick-story");
    expect(state.enter).toBeNull();
    expect(state.towerChoice).toBe("without");
    expect(second.session.projectDevice(pad).actions.map((action) => action.label)).toEqual([
      "Choose Proving Grounds",
    ]);
    expect(second.tower.sent()).toEqual([]);
  });

  it("resumes the connect choice without sending a tower command (EV-13)", async () => {
    const { boot } = harness();
    const first = await boot();
    const pad = await joinPad(first.session);
    await pressAs(first.session, pad, "base-board-done", "board-set-up");
    await pressAs(first.session, pad, "tower-connect", "tower-connect");
    await first.session.whenIdle();
    expect(first.tower.sent().map((row) => row.type)).toEqual(["connect"]);
    await pressAs(first.session, pad, "tower-calibrate", "tower-calibrate");
    await first.session.whenIdle();
    expect(first.session.state().enter).toBeNull();
    expect(first.session.state().towerChoice).toBe("connect");

    const second = await boot();
    expect(await second.session.resumeSession()).toBe(true);
    expect(second.session.state().screen).toBe("pick-story");
    expect(second.session.state().towerChoice).toBe("connect");
    expect(second.session.state().towerLinked).toBe(false);
    expect(second.tower.sent()).toEqual([]);
  });

  it("keeps the focused Pick story door across a restart with an autosave (EV-05)", async () => {
    const other: ShellStory = { ...TEST_STORY, card: { ...TEST_STORY.card, id: "other" } };
    const { boot } = harness();
    const first = await boot(undefined, [TEST_STORY, other]);
    const pad = await joinPad(first.session);
    await pressAs(first.session, pad, "base-board-done", "board-set-up");
    await pressAs(first.session, pad, "play-without-tower", "play-without-tower");
    await pressAs(first.session, pad, "focus-story", "focus", { storyId: "other" });
    await first.session.whenIdle();
    expect(first.session.state().focusStoryId).toBe("other");

    const second = await boot(undefined, [TEST_STORY, other]);
    second.session.rememberAutosave({ gameId: "game-x", packId: "test", day: 1 });
    expect(await second.session.resumeSession()).toBe(true);
    expect(second.session.state().screen).toBe("pick-story");
    expect(second.session.state().focusStoryId).toBe("other");
  });

  it("starts the Enter again from the join when the restart came mid-Enter (EV-19)", async () => {
    const { boot } = harness();
    const first = await boot();
    await first.session.resumeSession();
    const pad = await joinPad(first.session);
    await pressAs(first.session, pad, "base-board-done", "board-set-up");
    await pressAs(first.session, pad, "tower-connect", "tower-connect");
    expect(first.session.state().enter?.step).not.toBeNull();

    const second = await boot();
    expect(await second.session.resumeSession()).toBe(false);
    expect(second.session.state().screen).toBe("table-join");
    expect(second.session.state().enter?.step).toBe("join");
    expect(second.tower.sent()).toEqual([]);
  });

  it("starts a new Enter after Done for tonight", async () => {
    const { boot, store, sessions } = harness();
    const first = await boot();
    sessions.saveRoster({
      sessionId: "session-1",
      packId: "test",
      packVersion: "0.1.0",
      startedWall: "2026-10-30T00:00:00.000Z",
      joinCode: "000000",
      devices: [],
      holdings: [],
    });
    const pad = await joinPad(first.session);
    const act = (promptId: string, actionId: string, args: Record<string, unknown> = {}) =>
      pressAs(first.session, pad, promptId, actionId, args);
    await act("base-board-done", "board-set-up");
    await act("play-without-tower", "play-without-tower");
    await act("continue-pick-story-test", "continue");
    await act("continue-game-settings", "continue");
    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
      await act("hero-hold", "take", { heroId });
    }
    await act("continue-claim-heroes", "continue");
    for (const step of first.session.state().setupSteps) {
      await act(`continue-setup-${step.id}`, "continue");
    }
    await act("continue-begin", "continue");
    for (const moment of OPENING_MOMENTS) await act(openingPromptId(moment), "continue");
    await act("menu-quit", "quit-story");
    await act("session-done-tonight", "done-for-tonight");
    expect(first.session.state().sessionEnded).toBe(false);
    await act("session-done-confirm", "done-for-tonight");
    expect(first.session.state().sessionEnded).toBe(true);
    expect(first.session.state().screen).toBe("session-over");
    // The autosave survives Done for tonight (EV-05).
    expect(store.getAutosave()).not.toBeNull();

    const second = await boot();
    expect(await second.session.resumeSession()).toBe(false);
    expect(second.session.state().screen).toBe("table-join");
  });
});

describe("a failed connect (EV-08)", () => {
  it("sends the error to the pressing iPad, logs it for the board toast, and asks again", async () => {
    const { boot, dir } = harness();
    const shown: Array<{ deviceId: string; code: string }> = [];
    const { session, tower } = await boot((deviceId, code) => shown.push({ deviceId, code }));
    tower.failNextConnect();
    const pad = await joinPad(session);
    await pressAs(session, pad, "base-board-done", "board-set-up");
    await pressAs(session, pad, "tower-connect", "tower-connect");
    await session.whenIdle();
    expect(session.state().screen).toBe("tower-choice");
    expect(session.state().enter).toEqual({ step: "choice", failed: true });
    expect(tower.sent()).toEqual([]);
    expect(shown).toEqual([{ deviceId: pad, code: "tower-command-failed" }]);
    const logs = join(dir, "logs");
    const lines = readdirSync(logs).map((name) => readFileSync(join(logs, name), "utf8"));
    expect(lines.join("\n")).toContain("tower-command-failed");
    // Nothing retried: the second try is a new press.
    await pressAs(session, pad, "tower-connect", "tower-connect");
    expect(tower.sent().map((row) => row.type)).toEqual(["connect"]);
    expect(session.state().enter?.step).toBe("calibrate");
  });

  it("goes back to the choice when calibrate fails too", async () => {
    const { boot } = harness();
    const { session, tower } = await boot();
    const pad = await joinPad(session);
    await pressAs(session, pad, "base-board-done", "board-set-up");
    await pressAs(session, pad, "tower-connect", "tower-connect");
    tower.failNextCalibrate();
    await pressAs(session, pad, "tower-calibrate", "tower-calibrate");
    await session.whenIdle();
    expect(session.state().enter).toEqual({ step: "choice", failed: true });
    expect(tower.sent().map((row) => row.type)).toEqual(["connect"]);
  });
});

describe("an autosave from before C2/05 (EV-18)", () => {
  it("loads, logs one version-changed, and Continue resumes its day and positions", async () => {
    const fixture = JSON.parse(
      readFileSync(join(import.meta.dirname, "fixtures", "pre-c2-05-checkpoint.json"), "utf8"),
    ) as {
      afterEventSeq: number;
      day: number;
      engineVersion: string;
      state: {
        autosave: { gameId: string; packId: string };
        seed: string;
        play: { groups: unknown[]; dayNumber: number };
      };
    };
    expect(fixture.engineVersion).not.toBe(SHELL_ENGINE_VERSION);
    const { boot, store, sessions } = harness();
    const gameId = fixture.state.autosave.gameId;
    store.writeCheckpoint({
      gameId,
      day: fixture.day,
      afterEventSeq: 0,
      stateJson: JSON.stringify({ ...fixture.state, version: fixture.engineVersion }),
      atMonoMs: 0,
      atWall: "2026-10-30T00:00:00.000Z",
      seed: fixture.state.seed,
      packVersion: "0.1.0",
      engineVersion: fixture.engineVersion,
    });
    sessions.saveRoster({
      sessionId: "session-0",
      packId: "test",
      packVersion: "0.1.0",
      startedWall: "2026-10-30T00:00:00.000Z",
      joinCode: "000000",
      devices: [],
      holdings: [],
    });
    store.replaceAutosave({ gameId, sessionId: "session-0", packId: "test" });

    const { session, tower } = await boot();
    session.rememberAutosave({ gameId, packId: "test", day: fixture.day });
    expect(await session.resumeSession()).toBe(false);
    expect(session.state().screen).toBe("table-join");

    const pad = await joinPad(session);
    await pressAs(session, pad, "base-board-done", "board-set-up");
    await pressAs(session, pad, "play-without-tower", "play-without-tower");
    expect(session.state().screen).toBe("pick-story");
    await pressAs(session, pad, "continue-saved-game", "continue");
    const state = session.state();
    expect(state.screen).toBe("play");
    expect(state.play?.dayNumber).toBe(fixture.state.play.dayNumber);
    expect(state.play?.groups.map((group) => `${group.id}:${group.spaceId}`)).toEqual(
      (fixture.state.play.groups as Array<{ id: string; spaceId: string }>).map(
        (group) => `${group.id}:${group.spaceId}`,
      ),
    );
    expect(state.towerChoice).toBe("without");
    const changes = store.listEvents(gameId).filter((row) => row.kind === "version-changed");
    expect(changes).toHaveLength(1);
    expect(tower.sent()).toEqual([]);
  });
});

const HEROES = ["hero-a", "hero-b", "hero-c", "hero-d"];

/** Pick story to Begin, the whole opening, then Quit story from the menu. */
const playAndQuit = async (session: CoreSession, pad: string) => {
  const act = (promptId: string, actionId: string, args: Record<string, unknown> = {}) =>
    pressAs(session, pad, promptId, actionId, args);
  await act("continue-pick-story-test", "continue");
  await act("continue-game-settings", "continue");
  for (const heroId of HEROES) await act("hero-hold", "take", { heroId });
  await act("continue-claim-heroes", "continue");
  for (const step of session.state().setupSteps) await act(`continue-setup-${step.id}`, "continue");
  await act("continue-begin", "continue");
  for (const moment of OPENING_MOMENTS) await act(openingPromptId(moment), "continue");
  await act("menu-quit", "quit-story");
};

const boardLine = (session: CoreSession, id: string) =>
  session
    .projectBoard({ code: "000000", url: "http://127.0.0.1/join", reachable: true })
    .levels.find((level) => level.id === id)?.shows;

describe("the session screen and a host restart (C2/06)", () => {
  it("tonight's games survive a host restart, newest first, each quit (EV-12)", async () => {
    const { boot, store, sessions } = harness();
    const first = await boot();
    sessions.saveRoster({
      sessionId: "session-1",
      packId: "test",
      packVersion: "0.1.0",
      startedWall: "2026-10-30T00:00:00.000Z",
      joinCode: "000000",
      devices: [],
      holdings: [],
    });
    const pad = await joinPad(first.session);
    await pressAs(first.session, pad, "base-board-done", "board-set-up");
    await pressAs(first.session, pad, "play-without-tower", "play-without-tower");
    await playAndQuit(first.session, pad);
    expect(first.session.state().screen).toBe("session");
    await pressAs(first.session, pad, "session-new-game", "new-game");
    await pressAs(first.session, pad, "session-new-confirm", "new-game");
    expect(first.session.state().screen).toBe("pick-story");
    await playAndQuit(first.session, pad);
    expect(first.session.state().games.map((game) => game.outcome)).toEqual(["quit", "quit"]);
    const autosave = store.getAutosave();
    expect(autosave).not.toBeNull();

    const second = await boot();
    second.session.rememberAutosave({
      gameId: autosave?.gameId ?? "",
      packId: "test",
      day: 1,
    });
    expect(await second.session.resumeSession()).toBe(true);
    expect(second.session.state().screen).toBe("session");
    expect(boardLine(second.session, "session-games")).toBe("Game 2 quit\nGame 1 quit");
    const rows = second.session
      .projectDevice(pad)
      .actions.filter((action) => action.actionId === "open-game")
      .map((action) => action.label);
    expect(rows).toEqual(["Game 2", "Game 1"]);
    expect(second.tower.sent()).toEqual([]);
  });

  it("Tower lost survives a host restart and nothing reconnects (EV-13)", async () => {
    const { boot, store, sessions } = harness();
    const first = await boot();
    sessions.saveRoster({
      sessionId: "session-1",
      packId: "test",
      packVersion: "0.1.0",
      startedWall: "2026-10-30T00:00:00.000Z",
      joinCode: "000000",
      devices: [],
      holdings: [],
    });
    const pad = await joinPad(first.session);
    await pressAs(first.session, pad, "base-board-done", "board-set-up");
    await pressAs(first.session, pad, "tower-connect", "tower-connect");
    await pressAs(first.session, pad, "tower-calibrate", "tower-calibrate");
    first.session.syncTowerSnapshot();
    await first.session.whenIdle();
    await playAndQuit(first.session, pad);
    expect(boardLine(first.session, "session")).toBe("tower: in play");
    first.tower.loseConnection();
    first.session.syncTowerSnapshot();
    await first.session.whenIdle();
    expect(boardLine(first.session, "session")).toBe("Tower lost");
    const autosave = store.getAutosave();

    const second = await boot();
    second.session.rememberAutosave({
      gameId: autosave?.gameId ?? "",
      packId: "test",
      day: 1,
    });
    expect(await second.session.resumeSession()).toBe(true);
    expect(second.session.state().screen).toBe("session");
    expect(boardLine(second.session, "session")).toBe("Tower lost");
    expect(second.tower.sent()).toEqual([]);
    // The next New game runs the tower block first.
    await pressAs(second.session, pad, "session-new-game", "new-game");
    await pressAs(second.session, pad, "session-new-confirm", "new-game");
    expect(second.session.state().screen).toBe("tower-choice");
    expect(second.tower.sent()).toEqual([]);
  });
});

describe("a Play again the engine refuses", () => {
  it("logs invalid-state for the board toast and shows the code on the pressing iPad", async () => {
    const { boot, dir, sessions } = harness();
    const story: ShellStory = { ...TEST_STORY, card: { ...TEST_STORY.card } };
    const shown: Array<{ deviceId: string; code: string }> = [];
    const { session } = await boot((deviceId, code) => shown.push({ deviceId, code }), [story]);
    sessions.saveRoster({
      sessionId: "session-1",
      packId: "test",
      packVersion: "0.1.0",
      startedWall: "2026-10-30T00:00:00.000Z",
      joinCode: "000000",
      devices: [],
      holdings: [],
    });
    const pad = await joinPad(session);
    const act = (promptId: string, actionId: string, args: Record<string, unknown> = {}) =>
      pressAs(session, pad, promptId, actionId, args);
    await act("base-board-done", "board-set-up");
    await act("play-without-tower", "play-without-tower");
    await act("continue-pick-story-test", "continue");
    await act("continue-game-settings", "continue");
    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
      await act("hero-hold", "take", { heroId });
    }
    await act("continue-claim-heroes", "continue");
    for (const step of session.state().setupSteps)
      await act(`continue-setup-${step.id}`, "continue");
    await act("continue-begin", "continue");
    for (const moment of OPENING_MOMENTS) await act(openingPromptId(moment), "continue");
    await act("menu-quit", "quit-story");
    // The story stops being playable after the game, so Play again has nothing to start.
    story.card.playable = false;
    await act("session-game-1", "open-game");
    await act("stats-play-again", "play-again");
    await act("session-play-again-confirm", "play-again");
    expect(session.state().screen).toBe("session");
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.every((row) => row.deviceId === pad && row.code === "invalid-state")).toBe(true);
    const logs = join(dir, "logs");
    const lines = readdirSync(logs).map((name) => readFileSync(join(logs, name), "utf8"));
    expect(lines.join("\n")).toContain("invalid-state");
  });
});
