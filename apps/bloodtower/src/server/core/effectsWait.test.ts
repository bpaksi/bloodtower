import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureClock } from "../../engine/loops/day/clock.ts";
import { openEffectsWait } from "../../engine/loops/day/wait.ts";
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

// C3/20: the effects wait, run by the host. The engine names it; the host's timer (4 s, no audio)
// or the board's audio-end report ends it, once, and only then does the day go on.

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

const bootToPlay = async (seed = "seed", allowTestSeed = false) => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-effects-wait-"));
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
    seed,
    allowTestSeed,
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
  return { session, pad, store };
};

/** Presses on until the day loop is waiting on the effects panel. A Cleanse's "+1 day" stands in. */
const toEffectsWait = async (session: CoreSession, pad: string) => {
  let injected = false;
  for (let guard = 0; guard < 400; guard += 1) {
    const wait = openEffectsWait(session.state().loops.stack);
    if (wait) return wait;
    const play = session.state().play;
    if (play && !injected && play.dayNumber === 1) {
      ensureClock(play).effects.push("+1 day");
      injected = true;
    }
    if (session.state().hint) {
      await vi.advanceTimersByTimeAsync(AUTO_ADVANCE_MS);
      await session.whenIdle();
      continue;
    }
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
  throw new Error("The day never reached the effects wait.");
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

describe("C3/20 EV-01 the host runs the effects wait", () => {
  it("with no audio the day waits 4 s, and moves on once at the end", async () => {
    const { session, pad, store } = await bootToPlay();
    const wait = await toEffectsWait(session, pad);
    expect(wait).toEqual({ id: "effects-day-1", maxMs: 4000, lineId: null });
    await vi.advanceTimersByTimeAsync(3900);
    await session.whenIdle();
    expect(openEffectsWait(session.state().loops.stack)).not.toBeNull();
    // The iPad is offered nothing to press: no Next.
    expect(
      session.projectDevice(pad).actions.filter((a) => a.open && a.actionId === "continue"),
    ).toEqual([]);
    await vi.advanceTimersByTimeAsync(200);
    await session.whenIdle();
    expect(openEffectsWait(session.state().loops.stack)).toBeNull();
    expect(waitEnds(store, session)).toEqual([{ waitId: "effects-day-1", cause: "timeout" }]);
  });

  it("with narration it never moves on a timer, only on that line's audio end, once", async () => {
    const { session, pad, store } = await bootToPlay("seed~test-effects-line:effects.line-1");
    const wait = await toEffectsWait(session, pad);
    expect(wait.lineId).toBe("effects.line-1");
    await vi.advanceTimersByTimeAsync(4500);
    await session.whenIdle();
    expect(openEffectsWait(session.state().loops.stack)).not.toBeNull();
    session.narrationEnded("another.line");
    await session.whenIdle();
    expect(openEffectsWait(session.state().loops.stack)).not.toBeNull();
    session.narrationEnded("effects.line-1");
    session.narrationEnded("effects.line-1");
    await session.whenIdle();
    expect(openEffectsWait(session.state().loops.stack)).toBeNull();
    expect(waitEnds(store, session)).toEqual([{ waitId: "effects-day-1", cause: "audio-end" }]);
  });
});

describe("C3/20 EV-06 the live seed is a test-only door", () => {
  it("is refused, logged and thrown on a host that was not built for tests", async () => {
    const { session } = await bootToPlay();
    await expect(session.applyTestSeed("~test-corruption:hero-a=2")).rejects.toThrow(/tests only/);
  });

  it("changes the running game on a test host and refuses a bad marker loudly", async () => {
    const { session } = await bootToPlay("seed", true);
    await session.applyTestSeed("~test-corruption:hero-a=2");
    const play = session.state().play;
    expect(play && ensureClock(play).heroes["hero-a"]?.corruptions).toBe(2);
    await expect(session.applyTestSeed("~test-kingdom:Q")).rejects.toThrow(/N, E, S, W/);
  });
});

describe("C3/20 EV-06 route audit: nothing in production reaches the seed fields", () => {
  it("has four client messages, none with a seed field, and the strict ones refuse extras", async () => {
    const { CLIENT_MESSAGE_TYPES, narrationEndedMessageSchema, helloMessageSchema } = await import(
      "../../protocols/v2/client.ts"
    );
    expect([...CLIENT_MESSAGE_TYPES].sort()).toEqual(["act", "hello", "log", "narration-ended"]);
    const ended = narrationEndedMessageSchema.safeParse({
      v: 2,
      type: "narration-ended",
      payload: { lineId: "line-1", testSeed: "~test-corruption:hero-a=2" },
    });
    expect(ended.success).toBe(false);
    expect(
      helloMessageSchema.safeParse({ v: 2, type: "hello", payload: { seed: "x" } }).success,
    ).toBe(false);
  });

  it("an act that carries seed text changes nothing", async () => {
    const { session, pad } = await bootToPlay();
    const play = session.state().play;
    if (!play) throw new Error("No play state.");
    session.act(pad, "continue-anything", "continue", {
      seed: "~test-corruption:hero-a=2",
      testSeed: "~test-skulls:x=1",
    });
    await session.whenIdle();
    const clock = ensureClock(play);
    expect(clock.heroes["hero-a"]).toBeUndefined();
    expect(clock.skulls).toEqual({});
    expect(clock.seedKingdoms).toEqual([]);
  });

  it("an unseeded game's first night holds no seeded data", async () => {
    const { session } = await bootToPlay("0123456789abcdef");
    const play = session.state().play;
    if (!play) throw new Error("No play state.");
    const clock = ensureClock(play);
    expect(clock.skulls).toEqual({});
    expect(clock.seedKingdoms).toEqual([]);
    expect(clock.effectsLine).toBeNull();
    expect(play.groups.length).toBeGreaterThan(1);
  });

  it("only the host's test option and the core name the live seed; the production start never sets it", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join: joinPath } = await import("node:path");
    const root = new URL("..", import.meta.url).pathname;
    const named: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules") continue;
        const path = joinPath(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
          if (/allowTestSeed|applyTestSeed/.test(readFileSync(path, "utf8"))) {
            named.push(path.slice(root.length));
          }
        }
      }
    };
    walk(root);
    expect(named.sort()).toEqual(["core/session.ts", "hub/host.ts"]);
    expect(readFileSync(joinPath(root, "index.ts"), "utf8")).not.toMatch(/TestSeed/);
  });
});
