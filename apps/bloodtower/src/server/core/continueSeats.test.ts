import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TEST_STORY } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { type CoreSession, createCoreSession } from "./session.ts";

// CU/16 EV-12: the Continue press through the core session, with a mock tower and the real store.
// It sits here, not beside the engine test, because the repo check keeps `node:fs` out of the engine.
const dirs: string[] = [];
const closers: Array<() => void> = [];

afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const harness = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-cu16-"));
  dirs.push(dir);
  const opened = openDatabase(join(dir, "session.sqlite"));
  closers.push(() => opened.close());
  const store = createEventStore(opened.db);
  const log = createHostLogger({ dataDir: dir, mirror: false });
  const clock = stepClock();
  let count = 0;
  const boot = async () => {
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
  createSessionStore(opened.db).saveRoster({
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

const actWith =
  (session: CoreSession, pad: string) =>
  async (promptId: string, actionId: string, args: Record<string, unknown> = {}) => {
    session.act(pad, promptId, actionId, args);
    await session.whenIdle();
  };

describe("CU/16 the Continue press through the session", () => {
  it("EV-12 seating sends no tower frame and writes no game record", async () => {
    const { boot, store } = harness();
    const first = await boot();
    const pad = await joinPad(first.session);
    const act = actWith(first.session, pad);
    await act("base-board-done", "board-set-up");
    await act("play-without-tower", "play-without-tower");
    await act("continue-pick-story-test", "continue");
    await act("set-setting", "set", { settingId: "hints", optionId: "off" });
    await act("set-setting", "set", { settingId: "party-size", optionId: "n-2" });
    await act("continue-game-settings", "continue");
    for (const heroId of ["hero-a", "hero-b"]) await act("hero-hold", "take", { heroId });
    await act("continue-claim-heroes", "continue");
    for (const step of first.session.state().setupSteps) {
      if (step.id === "starting-purse") await act(`spin-setup-${step.id}`, "spin");
      await act(`continue-setup-${step.id}`, "continue");
    }
    await act("continue-begin", "continue");
    for (const moment of OPENING_MOMENTS) await act(openingPromptId(moment), "continue");
    await act("menu-quit", "quit-story");
    const saved = store.getAutosave();
    if (!saved) throw new Error("No autosave.");

    const second = await boot();
    expect(await second.session.resumeSession()).toBe(true);
    second.session.rememberAutosave({ gameId: saved.gameId, packId: saved.packId, day: 1 });
    const pad2 = await joinPad(second.session);
    const sentBefore = second.tower.sent().length;
    const eventsBefore = store.listEvents(saved.gameId).length;
    // A tower snapshot rebuilds the session screen's offers, so Continue is offered.
    second.session.syncTowerSnapshot();
    await second.session.whenIdle();
    expect(pad2).not.toBe(pad);
    await actWith(second.session, pad2)("continue-saved-game", "continue");

    const state = second.session.state();
    expect(state.screen).toBe("pause");
    expect(state.pause?.cause).toBe("disconnect");
    expect(state.holdings["hero-a"] ?? null).toBeNull();
    expect(state.holdings["hero-b"] ?? null).toBeNull();
    expect(second.tower.sent().length).toBe(sentBefore);
    // Only the press and the normal bookkeeping follow it; the seating writes no game record.
    const rows = store.listEvents(saved.gameId).slice(eventsBefore);
    expect(rows.filter((row) => row.kind === "game-record")).toEqual([]);

    // The new iPad picks both; play goes on, and still no tower frame.
    const act2 = actWith(second.session, pad2);
    await act2("hero-hold", "take", { heroId: "hero-a" });
    await act2("hero-hold", "take", { heroId: "hero-b" });
    expect(second.session.state().stage).toBe("playing");
    expect(second.tower.sent().length).toBe(sentBefore);
  });
});
