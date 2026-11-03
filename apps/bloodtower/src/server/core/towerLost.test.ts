import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TEST_STORY } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { stepShell } from "../../engine/loops/session/stepShell.ts";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { parseHostPayload } from "../events/kinds.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower, type MockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { type CoreSession, createCoreSession } from "./session.ts";
import { parseShellCheckpoint } from "./shellCheckpoint.ts";

const dirs: string[] = [];
const closers: Array<() => void> = [];

afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const harness = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-tower-lost-"));
  dirs.push(dir);
  const opened = openDatabase(join(dir, "session.sqlite"));
  closers.push(() => opened.close());
  const store = createEventStore(opened.db);
  const log = createHostLogger({ dataDir: dir, mirror: false });
  const clock = stepClock();
  let count = 0;
  const boot = async (): Promise<{ session: CoreSession; tower: MockTower }> => {
    count += 1;
    const tower = createMockTower({ log });
    const session = createCoreSession({
      sessionId: `session-${count}`,
      seed: "seed",
      stories: [TEST_STORY],
      playContent: PROVING_GROUNDS_PLAY,
      packVersion: "0.1.0",
      store,
      tower: bloodtowerTowerFromMock(tower),
      clock,
      log,
      onChange: () => {},
      graceMs: 10,
    });
    await session.whenIdle();
    return { session, tower };
  };
  const sessions = createSessionStore(opened.db);
  sessions.saveRoster({
    sessionId: "session-1",
    packId: "test",
    packVersion: "0.1.0",
    startedWall: "2026-10-30T00:00:00.000Z",
    joinCode: "000000",
    devices: [],
    holdings: [],
  });
  return { store, boot };
};

const joinPad = async (session: CoreSession) => {
  const joined = session.join({ joinCode: "000000", formFactor: "ipad" });
  await session.whenIdle();
  if (!joined.ok) throw new Error("join refused");
  return joined.deviceId;
};

const pressWith =
  (session: CoreSession, pad: string) =>
  async (promptId: string, actionId: string, args: Record<string, unknown> = {}) => {
    session.act(pad, promptId, actionId, args);
    await session.whenIdle();
  };

/** From the first join to the opening's end, without the tower or on the connect track. */
const reachPlay = async (session: CoreSession, tower: "connect" | "without") => {
  const pad = await joinPad(session);
  const act = pressWith(session, pad);
  await act("base-board-done", "board-set-up");
  if (tower === "connect") {
    await act("tower-connect", "tower-connect");
    await act("tower-calibrate", "tower-calibrate");
    session.syncTowerSnapshot();
    await session.whenIdle();
  } else {
    await act("play-without-tower", "play-without-tower");
  }
  await act("continue-pick-story-test", "continue");
  await act("continue-game-settings", "continue");
  for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
    await act("hero-hold", "take", { heroId });
  }
  await act("continue-claim-heroes", "continue");
  for (const step of session.state().setupSteps) await act(`continue-setup-${step.id}`, "continue");
  await act("continue-begin", "continue");
  for (const moment of OPENING_MOMENTS) await act(openingPromptId(moment), "continue");
  return { pad, act };
};

const openActions = (session: CoreSession, pad: string) =>
  session
    .projectDevice(pad)
    .actions.filter((action) => action.open && !action.promptId.startsWith("menu-"));

/** The first sensible press: Continue, then Done, Leave, End turn. Never a walk. */
const nextPress = (session: CoreSession, pad: string) => {
  const open = openActions(session, pad);
  const pick = ["continue", "record", "done", "leave", "end-turn"]
    .map((actionId) => open.find((action) => action.actionId === actionId))
    .find((action) => action !== undefined);
  if (!pick) throw new Error(`Nothing to press: ${open.map((a) => a.promptId).join(", ")}`);
  return pick;
};

/** Plays on until `drops` simulated skull drops were pressed past. Returns where each landed. */
const playDrops = async (session: CoreSession, pad: string, drops: number) => {
  const landed: string[] = [];
  for (let guard = 0; guard < 400 && landed.length < drops; guard += 1) {
    const pick = nextPress(session, pad);
    if (pick.promptId.startsWith("skull-sim-day-")) {
      const spot = session.state().play?.lastSkull?.spaceId;
      if (!spot) throw new Error("A simulated drop landed nowhere.");
      landed.push(spot);
    }
    session.act(pad, pick.promptId, pick.actionId, {});
    await session.whenIdle();
  }
  return landed;
};

describe("a tower lost mid-game", () => {
  it("EV-12 replaying the log gives the same simulated drops", async () => {
    const { boot, store } = harness();
    const { session } = await boot();
    const { pad } = await reachPlay(session, "without");
    const gameId = session.currentGameId();
    if (!gameId) throw new Error("No game id.");
    const checkpoint = store.lastCheckpoint(gameId);
    if (!checkpoint) throw new Error("No checkpoint at the start of play.");

    const live = await playDrops(session, pad, 3);
    expect(live).toHaveLength(3);

    // Rebuild the run from the checkpoint and the events after it: no new draw may differ.
    let state = parseShellCheckpoint(JSON.parse(checkpoint.stateJson) as unknown);
    const rebuilt: string[] = [];
    for (const row of store.listEvents(gameId, checkpoint.afterEventSeq)) {
      if (row.kind !== "shell") continue;
      const { event } = parseHostPayload("shell", row.payload);
      if (event.kind === "press" && event.promptId.startsWith("skull-sim-day-")) {
        const spot = state.play?.lastSkull?.spaceId;
        if (spot) rebuilt.push(spot);
      }
      state = stepShell(state, event).state;
    }
    expect(rebuilt).toEqual(live);
  });

  it("EV-11 a game that went on without the tower continues without it", async () => {
    const { boot, store } = harness();
    const first = await boot();
    const { pad, act } = await reachPlay(first.session, "connect");
    expect(first.tower.sent().map((row) => row.type)).toContain("calibrate");

    first.tower.loseConnection();
    first.session.syncTowerSnapshot();
    await first.session.whenIdle();
    expect(first.session.state().screen).toBe("pause");
    const without = openActions(first.session, pad).find((a) => a.actionId === "go-on-without");
    expect(without).toBeDefined();
    await act(without?.promptId ?? "", "go-on-without");
    expect(first.session.state().towerWithout).toBe(true);
    expect(first.session.state().pause).toBeNull();

    // The game goes on; a quit keeps the autosave and the session screen reads without the tower.
    await act("menu-quit", "quit-story");
    expect(first.session.state().screen).toBe("session");
    expect(store.getAutosave()).not.toBeNull();

    // A new host with a tower that is up: the saved game still goes on without it.
    const second = await boot();
    second.tower.connect();
    second.tower.calibrate();
    const sentBefore = second.tower.sent().length;
    expect(await second.session.resumeSession()).toBe(true);
    const state = second.session.state();
    expect(state.towerChoice).toBe("without");
    const saved = store.getAutosave();
    if (!saved) throw new Error("No autosave.");
    second.session.rememberAutosave({ gameId: saved.gameId, packId: saved.packId, day: 1 });
    const pad2 = await joinPad(second.session);
    const act2 = pressWith(second.session, pad2);
    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
      await act2("hero-hold", "take", { heroId });
    }
    await act2("continue-saved-game", "continue");
    const resumed = second.session.state();
    expect(resumed.screen).toBe("play");
    expect(resumed.towerWithout).toBe(true);
    expect(resumed.towerLinked).toBe(false);
    expect(resumed.pause).toBeNull();
    const drops = await playDrops(second.session, pad2, 1);
    expect(drops).toHaveLength(1);
    expect(second.tower.sent().length).toBe(sentBefore);
  });

  it("a failed Reconnect shows its code on the iPad that pressed and asks again", async () => {
    const { boot } = harness();
    const first = await boot();
    const { pad, act } = await reachPlay(first.session, "connect");
    first.tower.loseConnection();
    first.session.syncTowerSnapshot();
    await first.session.whenIdle();
    first.tower.failNextConnect();
    const reconnect = openActions(first.session, pad).find((a) => a.actionId === "reconnect");
    await act(reconnect?.promptId ?? "", "reconnect");
    expect(first.session.state().screen).toBe("pause");
    expect(openActions(first.session, pad).map((a) => a.actionId)).toEqual([
      "reconnect",
      "go-on-without",
      "quit-story",
    ]);
  });
});
