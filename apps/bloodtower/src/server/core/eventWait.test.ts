import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureClock, heroSheet } from "../../engine/loops/day/clock.ts";
import { openDayWait } from "../../engine/loops/day/wait.ts";
import { TEST_STORY } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { projectShellView } from "../../engine/loops/session/view.ts";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { deserializeShellState, serializeShellState } from "./serialize.ts";
import { type CoreSession, createCoreSession } from "./session.ts";

// C3/12 PR 1: an event's result step is run by the host like the effects wait (C3/20): 4 s with no
// audio, the line's audio end with narration, once. A save keeps the open event (EV-15, EV-16).

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

const boot = async () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-event-wait-"));
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
    allowTestSeed: true,
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
  return { session, pad, store, act };
};

/** Takes the roll, seeds an event, and ends the first group's turn. */
const toEvent = async (markers: string) => {
  const booted = await boot();
  const { session, pad, act } = booted;
  const roll = session
    .projectDevice(pad)
    .actions.find((action) => action.open && action.promptId.endsWith("-roll-done"));
  if (!roll) throw new Error("No move roll.");
  await act(roll.promptId, roll.actionId);
  const play = session.state().play;
  if (!play) throw new Error("No play state.");
  const skulls = play.content.board.spaces
    .filter((space) => space.building)
    .map((space) => `${space.id}=1`)
    .join(",");
  await session.applyTestSeed(`~test-skulls:${skulls}${markers}`);
  const end = session
    .projectDevice(pad)
    .actions.find((action) => action.open && action.actionId === "end-turn");
  if (!end) throw new Error("The first group cannot end its turn.");
  await act(end.promptId, end.actionId);
  return booted;
};

const waitEnds = (store: ReturnType<typeof createEventStore>, session: CoreSession) => {
  const id = session.currentGameId();
  if (!id) throw new Error("No game.");
  return store.listEvents(id).flatMap((row) => {
    const event = (
      JSON.parse(row.payload) as { event?: { kind?: string; waitId?: string; cause?: string } }
    ).event;
    return row.kind === "shell" && event?.kind === "wait-end"
      ? [{ waitId: event.waitId, cause: event.cause }]
      : [];
  });
};

const sceneOf = (session: CoreSession) => projectShellView(session.state()).table?.event ?? null;

describe("C3/12 the host runs the event's result wait", () => {
  it("with no audio the result waits 4 s, then the day goes on once, with no Next on the iPad", async () => {
    const { session, pad, store } = await toEvent("~test-event:windfall");
    const wait = openDayWait(session.state().loops.stack);
    expect(wait?.maxMs).toBe(4000);
    expect(wait?.lineId).toBeNull();
    expect(sceneOf(session)?.result).toEqual({ kind: "windfall", gold: 5 });
    expect(
      session.projectDevice(pad).actions.filter((a) => a.open && a.actionId === "continue"),
    ).toEqual([]);
    await vi.advanceTimersByTimeAsync(3800);
    await session.whenIdle();
    expect(sceneOf(session)).not.toBeNull();
    await vi.advanceTimersByTimeAsync(300);
    await session.whenIdle();
    expect(sceneOf(session)).toBeNull();
    expect(waitEnds(store, session)).toEqual([{ waitId: wait?.id, cause: "timeout" }]);
  });

  it("with narration it moves on only at that line's audio end, never on a timer", async () => {
    const { session, store } = await toEvent("~test-event:quiet~test-event-line:event.quiet-1");
    const wait = openDayWait(session.state().loops.stack);
    expect(wait?.lineId).toBe("event.quiet-1");
    await vi.advanceTimersByTimeAsync(4500);
    await session.whenIdle();
    expect(sceneOf(session)).not.toBeNull();
    session.narrationEnded("event.quiet-1");
    await session.whenIdle();
    expect(sceneOf(session)).toBeNull();
    expect(waitEnds(store, session)).toEqual([{ waitId: wait?.id, cause: "audio-end" }]);
  });

  it("a save during the result step keeps it, and finishing it applies the gold once", async () => {
    const { session } = await toEvent("~test-event:windfall");
    const play = session.state().play;
    const lead = sceneOf(session)?.heroIds[0] ?? "";
    expect(play && heroSheet(ensureClock(play), lead).gold).toBeDefined();
    const goldNow = play ? (heroSheet(ensureClock(play), lead).gold ?? 0) : 0;
    const saved = deserializeShellState(
      JSON.parse(JSON.stringify(serializeShellState(session.state()))),
    );
    // The same event, in the same step, with the gold already in the sheet and not added again.
    expect(projectShellView(saved).table?.event?.result).toEqual({ kind: "windfall", gold: 5 });
    expect(saved.play && heroSheet(ensureClock(saved.play), lead).gold).toBe(goldNow);
    expect(openDayWait(saved.loops.stack)?.id).toBe(openDayWait(session.state().loops.stack)?.id);
  });

  it("a save at a hazard's choice comes back with the same event and the same costs", async () => {
    const { session } = await toEvent("~test-event:hazard-storm");
    const before = sceneOf(session);
    expect(before?.options.length).toBe(2);
    const saved = deserializeShellState(
      JSON.parse(JSON.stringify(serializeShellState(session.state()))),
    );
    expect(projectShellView(saved).table?.event).toEqual(before);
  });
});
