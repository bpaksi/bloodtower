import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_STORY } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import { AUTO_ADVANCE_MS } from "../../protocols/v2/views.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { type CoreSession, createCoreSession } from "./session.ts";

// CU/09 EV-04, through the host's own session: the hint ends by the host's timer at 4 s, and
// until then each iPad keeps the screen it had before the step, greyed (review follow-up, PR 532).

const dirs: string[] = [];
const closers: Array<() => void> = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  vi.useRealTimers();
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const bootToPlay = async () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-hints-session-"));
  dirs.push(dir);
  const opened = openDatabase(join(dir, "session.sqlite"));
  closers.push(() => opened.close());
  const store = createEventStore(opened.db);
  createSessionStore(opened.db).saveRoster({
    sessionId: "session-1",
    packId: "test",
    packVersion: "0.1.0",
    startedWall: "2026-10-30T00:00:00.000Z",
    joinCode: "000000",
    devices: [],
    holdings: [],
  });
  const log = createHostLogger({ dataDir: dir, mirror: false });
  const session: CoreSession = createCoreSession({
    sessionId: "session-1",
    seed: "seed",
    stories: [TEST_STORY],
    playContent: PROVING_GROUNDS_PLAY,
    packVersion: "0.1.0",
    store,
    tower: bloodtowerTowerFromMock(createMockTower({ log })),
    clock: stepClock(),
    log,
    onChange: () => {},
    graceMs: 10,
  });
  await session.whenIdle();
  const joined = session.join({ joinCode: "000000", formFactor: "ipad" });
  await session.whenIdle();
  if (!joined.ok) throw new Error("join refused");
  const pad = joined.deviceId;
  const act = async (promptId: string, actionId: string, args: Record<string, unknown> = {}) => {
    session.act(pad, promptId, actionId, args);
    await session.whenIdle();
  };
  await act("base-board-done", "board-set-up");
  await act("play-without-tower", "play-without-tower");
  await act("continue-pick-story-test", "continue");
  // Hints stay on (the default): the first building visit raises one.
  await act("continue-game-settings", "continue");
  for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"]) {
    await act("hero-hold", "take", { heroId });
  }
  await act("continue-claim-heroes", "continue");
  for (const step of session.state().setupSteps) await act(`continue-setup-${step.id}`, "continue");
  await act("continue-begin", "continue");
  for (const moment of OPENING_MOMENTS) await act(openingPromptId(moment), "continue");
  return { session, pad };
};

/** Presses the first sensible open action until a hint shows. Never a walk. */
const playToFirstHint = async (session: CoreSession, pad: string): Promise<string> => {
  for (let guard = 0; guard < 400; guard += 1) {
    const hint = session.state().hint;
    if (hint) return hint;
    const open = session
      .projectDevice(pad)
      .actions.filter((action) => action.open && !action.promptId.startsWith("menu-"));
    const pick = ["continue", "record", "done", "leave", "end-turn"]
      .map((actionId) => open.find((action) => action.actionId === actionId))
      .find((action) => action !== undefined);
    if (!pick) throw new Error(`Nothing to press: ${open.map((a) => a.promptId).join(", ")}`);
    session.act(pad, pick.promptId, pick.actionId, {});
    await session.whenIdle();
  }
  throw new Error("No hint showed within 400 presses.");
};

describe("CU/09 EV-04 the host ends a hint at 4 s and the iPad holds its screen until then", () => {
  it("is still on at 3.9 s and gone at 4.1 s", async () => {
    const { session, pad } = await bootToPlay();
    const hint = await playToFirstHint(session, pad);
    expect(hint).toMatch(/^hint\./);
    expect(AUTO_ADVANCE_MS).toBe(4000);

    await vi.advanceTimersByTimeAsync(AUTO_ADVANCE_MS - 100);
    await session.whenIdle();
    expect(session.state().hint).toBe(hint);

    await vi.advanceTimersByTimeAsync(200);
    await session.whenIdle();
    expect(session.state().hint).toBeNull();
  });

  it("holds the iPad's prior screen greyed while the hint shows, then releases it", async () => {
    const { session, pad } = await bootToPlay();
    await playToFirstHint(session, pad);

    const held = session.projectDevice(pad);
    expect(held.held).toBe(true);
    expect(held.actions.every((action) => !action.open)).toBe(true);

    await vi.advanceTimersByTimeAsync(AUTO_ADVANCE_MS + 100);
    await session.whenIdle();
    const released = session.projectDevice(pad);
    expect(released.held).toBeUndefined();
  });
});
