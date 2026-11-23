import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type ChapterPlan, configureChapters } from "../../engine/loops/chapter/chapters.ts";
import {
  ensureClock,
  heroSheet,
  markQuestWon,
  setHeroSheet,
} from "../../engine/loops/day/clock.ts";
import { ensureQuests } from "../../engine/loops/quest/store.ts";
import { TEST_STORY } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import {
  activeMsOf,
  averageActiveMs,
  heroTotals,
  projectGameRecords,
  projectGameStats,
  tapCounts,
} from "../events/gameStats.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { type CoreSession, createCoreSession } from "./session.ts";

const dirs: string[] = [];
const closers: Array<() => void> = [];
afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const harness = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-end-"));
  dirs.push(dir);
  const opened = openDatabase(join(dir, "session.sqlite"));
  closers.push(() => opened.close());
  const store = createEventStore(opened.db);
  const log = createHostLogger({ dataDir: dir, mirror: false });
  const clock = stepClock();
  let count = 0;
  const boot = async (): Promise<CoreSession> => {
    count += 1;
    const session = createCoreSession({
      sessionId: `session-${count}`,
      seed: "seed",
      stories: [TEST_STORY],
      playContent: PROVING_GROUNDS_PLAY,
      packVersion: "0.1.0",
      store,
      tower: bloodtowerTowerFromMock(createMockTower({ log })),
      clock,
      log,
      onChange: () => {},
      graceMs: 10,
      // The effects wait (C3/20) ends at once: the test moves the day on.
      waitTimer: (fire) => {
        const handle = setTimeout(fire, 0);
        return () => clearTimeout(handle);
      },
    });
    await session.whenIdle();
    return session;
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
  return { boot, store, clock };
};

const spaceIn = (kingdom: string, n: number): string => {
  const row = PROVING_GROUNDS_PLAY.board.spaces.filter((s) => s.kingdom === kingdom && s.building)[
    n
  ];
  if (!row) throw new Error(`no building ${n} in ${kingdom}`);
  return row.id;
};

const PLAN: ChapterPlan = {
  c3EndAfterChapter1: true,
  sealBreakMin: 2,
  foeLevel: { chapter1: 1, perChapter: 1 },
  seals: [{ id: "seal-a", glyph: "glyph-a", boon: "boon-a" }],
  chapters: [
    {
      id: "ch-1",
      index: 1,
      kingdoms: ["N"],
      quests: [
        { id: "herald", spaceId: spaceIn("N", 0) },
        { id: "ambush", spaceId: spaceIn("N", 1) },
      ],
    },
    // A second chapter, so chapter 1 is not the finale: C3 ends after chapter 1 (Q-C3-01).
    { id: "ch-2", index: 2, kingdoms: ["E"], quests: [{ id: "c2-a", spaceId: spaceIn("E", 0) }] },
  ],
};

type Pad = {
  deviceId: string;
  act: (p: string, a: string, args?: Record<string, unknown>) => Promise<void>;
};

/**
 * Continue, then the re-pick (CU/16): Continue seats the saved party on the iPads joined now, so
 * this iPad picks every seated hero that nobody holds before play goes on.
 */
const continueAndSeat = async (session: CoreSession, pad: Pad): Promise<void> => {
  await pad.act("continue-saved-game", "continue");
  for (const group of session.state().play?.groups ?? []) {
    for (const heroId of group.heroIds) {
      if (session.state().holdings[heroId] == null) {
        await pad.act("hero-hold", "take", { heroId });
      }
    }
  }
};

const padFor = async (session: CoreSession): Promise<Pad> => {
  const joined = session.join({ joinCode: "000000", formFactor: "ipad" });
  await session.whenIdle();
  if (!joined.ok) throw new Error("join refused");
  return {
    deviceId: joined.deviceId,
    act: async (promptId, actionId, args = {}) => {
      session.act(joined.deviceId, promptId, actionId, args);
      await session.whenIdle();
    },
  };
};

/** A game of `heroes` heroes from the first screen to the first day. */
const startGame = async (
  session: CoreSession,
  heroes: string[],
  hooks: {
    beforeBegin?: (pad: Pad) => Promise<void>;
    afterBegin?: (pad: Pad) => Promise<void>;
  } = {},
): Promise<Pad> => {
  const pad = await padFor(session);
  await pad.act("base-board-done", "board-set-up");
  await pad.act("play-without-tower", "play-without-tower");
  await pad.act("continue-pick-story-test", "continue");
  if (heroes.length < 4) {
    await pad.act("set-setting", "set", {
      settingId: "party-size",
      optionId: `n-${heroes.length}`,
    });
  }
  await pad.act("continue-game-settings", "continue");
  for (const heroId of heroes) await pad.act("hero-hold", "take", { heroId });
  await pad.act("continue-claim-heroes", "continue");
  for (const step of session.state().setupSteps) {
    if (step.id === "starting-purse") await pad.act(`spin-setup-${step.id}`, "spin");
    await pad.act(`continue-setup-${step.id}`, "continue");
  }
  await hooks.beforeBegin?.(pad);
  await pad.act("continue-begin", "continue");
  await hooks.afterBegin?.(pad);
  for (const moment of OPENING_MOMENTS) await pad.act(openingPromptId(moment), "continue");
  return pad;
};

/**
 * Production has no chapter plan wired from the pack yet, so a test gives the running game one:
 * the plan, and the chapter frame set to chapter 1 (its enter ran before the plan existed).
 */
const armChapters = (session: CoreSession, ending: "win" | "loss" | "none") => {
  const state = session.state();
  const play = state.play;
  if (!play) throw new Error("No play state.");
  configureChapters(play, PLAN);
  const frame = state.loops.stack.find((row) => row.loopId === "chapter");
  if (!frame) throw new Error("No chapter frame.");
  frame.local = { ...(frame.local as object), chapter: 1 };
  if (ending === "win") {
    ensureClock(play).supply = 24;
    ensureQuests(play).done.push("herald", "ambush");
    markQuestWon(play);
  } else if (ending === "loss") {
    ensureClock(play).supply = 0;
  }
};

const playOn = async (session: CoreSession, pad: Pad, until: () => boolean) => {
  let idle = 0;
  for (let guard = 0; guard < 600 && !until(); guard += 1) {
    const pick = ["continue", "record", "done", "leave", "end-turn", "walk"]
      .map((id) => session.state().offered.find((offer) => offer.open && offer.actionId === id))
      .find((offer) => offer !== undefined);
    if (!pick) {
      // Nothing to press: a timer (the effects wait) may still be due.
      await new Promise((resolve) => setTimeout(resolve, 5));
      await session.whenIdle();
      if (!session.state().offered.some((offer) => offer.open && offer.actionId !== "quit-story"))
        idle += 1;
      if (idle > 5) break;
      continue;
    }
    idle = 0;
    await pad.act(pick.promptId, pick.actionId);
  }
};

/**
 * Two iPads, each holding one of two heroes. The game starts, plays 10 s, the second iPad
 * drops for `pauseMs` (the game pauses), and it plays 5 s more before the opening moments.
 */
const startPausedGame = async (
  session: CoreSession,
  clock: { advance: (ms: number) => void },
  pauseMs: number,
) => {
  let second: Pad | undefined;
  return startGame(session, ["hero-a", "hero-b"], {
    beforeBegin: async (first) => {
      second = await padFor(session);
      await first.act("hero-hold", "release", { heroId: "hero-b" });
      await second.act("hero-hold", "take", { heroId: "hero-b" });
    },
    afterBegin: async () => {
      if (!second) throw new Error("No second iPad.");
      clock.advance(10_000);
      session.disconnect(second.deviceId);
      await new Promise((resolve) => setTimeout(resolve, 40));
      await session.whenIdle();
      expect(session.state().stage).toBe("paused");
      clock.advance(pauseMs);
      await second.act("hero-hold", "take", { heroId: "hero-b" });
      expect(session.state().stage).toBe("playing");
      clock.advance(5_000);
    },
  });
};

const HEROES = ["hero-a", "hero-b", "hero-c", "hero-d"];
const ended = (session: CoreSession) => session.state().screen === "session";

describe("the game's record, written once per outcome (C3/10)", () => {
  it("EV-04, EV-08: a lost game writes a record with a 30 s pause left out of its active length, and clears the autosave", async () => {
    const { boot, store, clock } = harness();
    const session = await boot();
    const pad = await startPausedGame(session, clock, 30_000);
    armChapters(session, "loss");
    await playOn(session, pad, () => ended(session));
    expect(ended(session)).toBe(true);
    const gameId = session.state().games[0]?.gameId ?? "";
    const rows = store.listEvents(gameId);
    const record = projectGameRecords(store)[0];
    expect(record).toMatchObject({
      outcome: "lost",
      how: "skulls",
      partySize: 2,
      storyId: "test",
    });
    expect(record?.heroIds).toEqual(["hero-a", "hero-b"]);
    // Start and end time, and 10 s + 5 s of play: the 30 s pause is not counted (within 1 s).
    expect(record?.startedWall).toBe("2026-10-15T18:00:00.000Z");
    expect(record?.endedWall).toBe("2026-10-15T18:00:45.000Z");
    expect(Math.abs((record?.activeMs ?? 0) - 15_000)).toBeLessThanOrEqual(1_000);
    expect(activeMsOf(rows)).toBe(record?.activeMs);
    expect(heroTotals(projectGameRecords(store))).toEqual({
      "hero-a": { played: 1, won: 0 },
      "hero-b": { played: 1, won: 0 },
    });
    // EV-08: a finished game clears the autosave; Continue is not offered.
    expect(store.getAutosave()).toBeNull();
    expect(session.state().autosave).toBeNull();
    expect(session.state().offered.some((o) => o.promptId === "continue-saved-game")).toBe(false);
  });

  it("EV-04: a won game with a 30 s pause adds a win and leaves the pause out of its length; EV-09: the record and row survive a restart", async () => {
    const { boot, store, clock } = harness();
    const first = await boot();
    const pad = await startPausedGame(first, clock, 30_000);
    armChapters(first, "win");
    await playOn(first, pad, () => ended(first));
    expect(first.state().games[0]?.outcome).toBe("won");
    const won = projectGameRecords(store)[0];
    expect(won).toMatchObject({ outcome: "won", how: "won", sceneId: "win" });
    expect(won?.startedWall).toBe("2026-10-15T18:00:00.000Z");
    expect(won?.endedWall).toBe("2026-10-15T18:00:45.000Z");
    expect(Math.abs((won?.activeMs ?? 0) - 15_000)).toBeLessThanOrEqual(1_000);
    expect(heroTotals(projectGameRecords(store))).toEqual({
      "hero-a": { played: 1, won: 1 },
      "hero-b": { played: 1, won: 1 },
    });
    const gameId = first.state().games[0]?.gameId ?? "";
    expect(store.getAutosave()).toBeNull();
    const second = await boot();
    await second.resumeSession();
    expect(projectGameRecords(store).map((r) => [r.gameId, r.outcome])).toEqual([[gameId, "won"]]);
    expect(second.state().games.map((g) => g.outcome)).toEqual(["won"]);
  });

  it("EV-11, EV-12, EV-21: a quit writes one quit record; Continue then a win overwrites it, across restarts", async () => {
    const { boot, store } = harness();
    const first = await boot();
    const pad = await startGame(first, HEROES.slice(0, 2));
    await pad.act("menu-quit", "quit-story");
    const gameId = first.state().games[0]?.gameId ?? "";
    expect(projectGameRecords(store)).toHaveLength(1);
    expect(projectGameRecords(store)[0]).toMatchObject({ gameId, outcome: "quit", how: "quit" });
    expect(store.getAutosave()?.gameId).toBe(gameId);
    expect(first.state().offered.some((o) => o.promptId === "continue-saved-game")).toBe(true);
    // A plain quit counts neither as played nor as won (EV-14).
    expect(heroTotals(projectGameRecords(store))).toEqual({});

    const second = await boot();
    const autosave = store.getAutosave();
    second.rememberAutosave({ gameId: autosave?.gameId ?? "", packId: "test", day: 1 });
    expect(await second.resumeSession()).toBe(true);
    expect(projectGameRecords(store)).toHaveLength(1);
    const again = await padFor(second);
    await continueAndSeat(second, again);
    armChapters(second, "win");
    await playOn(second, again, () => ended(second));
    const records = projectGameRecords(store);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ gameId, outcome: "won" });
    // The earlier quit row is still in the append-only log.
    expect(
      store
        .listEvents(gameId)
        .filter((row) => row.kind === "game-record")
        .map((row) => JSON.parse(row.payload).outcome),
    ).toEqual(["quit", "won"]);
    expect(second.state().games).toHaveLength(1);
    expect(second.state().games[0]?.outcome).toBe("won");
    expect(heroTotals(records)).toEqual({
      "hero-a": { played: 1, won: 1 },
      "hero-b": { played: 1, won: 1 },
    });

    const third = await boot();
    await third.resumeSession();
    expect(projectGameRecords(store)).toHaveLength(1);
    expect(third.state().games.map((g) => g.outcome)).toEqual(["won"]);
  });

  it("EV-13: a new game replaces the autosave; the quit game's record stays quit", async () => {
    const { boot, store } = harness();
    const session = await boot();
    const pad = await startGame(session, HEROES.slice(0, 2));
    await pad.act("menu-quit", "quit-story");
    const quitId = session.state().games[0]?.gameId ?? "";
    await pad.act("session-new-game", "new-game");
    await pad.act("session-new-confirm", "new-game");
    expect(session.state().screen).toBe("pick-story");
    expect(session.state().activeGameId).not.toBe(quitId);
    // Continue is not offered for A once the table is starting a new game.
    expect(session.state().autosave).toBeNull();
    expect(session.state().offered.some((o) => o.promptId === "continue-saved-game")).toBe(false);
    const again = await startGame2(session, pad);
    armChapters(session, "win");
    await playOn(session, again, () => session.state().games.length === 2 && ended(session));
    const records = projectGameRecords(store);
    expect(records.map((r) => [r.gameId === quitId, r.outcome])).toEqual([
      [true, "quit"],
      [false, "won"],
    ]);
  });

  it("EV-12: a quit game continued and then lost has one record, lost, and one row tonight", async () => {
    const { boot, store } = harness();
    const first = await boot();
    const pad = await startGame(first, HEROES.slice(0, 2));
    await pad.act("menu-quit", "quit-story");
    const gameId = first.state().games[0]?.gameId ?? "";
    const second = await boot();
    const autosave = store.getAutosave();
    second.rememberAutosave({ gameId: autosave?.gameId ?? "", packId: "test", day: 1 });
    expect(await second.resumeSession()).toBe(true);
    const again = await padFor(second);
    await continueAndSeat(second, again);
    armChapters(second, "loss");
    await playOn(second, again, () => ended(second));
    const records = projectGameRecords(store);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ gameId, outcome: "lost", how: "skulls" });
    expect(second.state().games.map((g) => g.outcome)).toEqual(["lost"]);
    expect(
      store
        .listEvents(gameId)
        .filter((row) => row.kind === "game-record")
        .map((row) => JSON.parse(row.payload).outcome),
    ).toEqual(["quit", "lost"]);
    // A lost game was a quit game once: only the final outcome counts toward played and won.
    expect(heroTotals(records)).toEqual({
      "hero-a": { played: 1, won: 0 },
      "hero-b": { played: 1, won: 0 },
    });
  });

  it("EV-13: Play again from the quit game's screen leaves its record quit, with no Continue for it", async () => {
    const { boot, store } = harness();
    const session = await boot();
    const pad = await startGame(session, HEROES.slice(0, 2));
    await pad.act("menu-quit", "quit-story");
    const quitId = session.state().games[0]?.gameId ?? "";
    await pad.act("session-game-1", "open-game");
    await pad.act("stats-play-again", "play-again");
    await pad.act("session-play-again-confirm", "play-again");
    expect(session.state().screen).toBe("claim-heroes");
    await pad.act("continue-claim-heroes", "continue");
    for (const step of session.state().setupSteps) {
      if (step.id === "starting-purse") await pad.act(`spin-setup-${step.id}`, "spin");
      await pad.act(`continue-setup-${step.id}`, "continue");
    }
    await pad.act("continue-begin", "continue");
    for (const moment of OPENING_MOMENTS) await pad.act(openingPromptId(moment), "continue");
    armChapters(session, "win");
    await playOn(session, pad, () => session.state().games.length === 2 && ended(session));
    const records = projectGameRecords(store);
    expect(records.map((r) => [r.gameId === quitId, r.outcome])).toEqual([
      [true, "quit"],
      [false, "won"],
    ]);
    // The new game ended, so no autosave is left: Continue is not offered for either game.
    expect(store.getAutosave()).toBeNull();
    expect(session.state().offered.some((o) => o.promptId === "continue-saved-game")).toBe(false);
  });

  it("EV-05: the stats view reads the stored stats; changing the live state after the end changes nothing", async () => {
    const { boot, store, clock } = harness();
    const session = await boot();
    const pad = await startPausedGame(session, clock, 30_000);
    armChapters(session, "win");
    const play = session.state().play;
    if (!play) throw new Error("No play state.");
    const live = ensureClock(play);
    setHeroSheet(play, "hero-a", { ...heroSheet(live, "hero-a"), gold: 7, corruptions: 1 });
    setHeroSheet(play, "hero-b", { ...heroSheet(live, "hero-b"), gold: 3, corruptions: 1 });
    await playOn(session, pad, () => ended(session));
    const gameId = session.state().games[0]?.gameId ?? "";
    const before = projectGameStats(store, gameId);
    expect(before).toMatchObject({
      outcome: "won",
      how: "won",
      questsDone: 1,
      corruptionsTaken: 2,
      goldLeft: 10,
      best: { state: "this-game" },
    });
    expect(before?.days).toBe(projectGameRecords(store)[0]?.endDay);
    expect(before?.days).not.toBeNull();
    expect(Math.abs((before?.activeMs ?? 0) - 15_000)).toBeLessThanOrEqual(1_000);
    expect(before?.keyMoments).toEqual(
      expect.arrayContaining([
        { kind: "quest-done", count: 1 },
        { kind: "corruption-taken", count: 2 },
        { kind: "chapter-won", count: 1 },
      ]),
    );
    // EV-20: the view holds no game-length target and no warning.
    expect(Object.keys(before ?? {}).sort()).toEqual(
      [
        "activeMs",
        "averageMs",
        "best",
        "corruptionsTaken",
        "days",
        "gameId",
        "goldLeft",
        "how",
        "keyMoments",
        "outcome",
        "questsDone",
        "storyId",
      ].sort(),
    );
    // Mutate the live state: purse +50 and the day counter +3. The view must not move.
    setHeroSheet(play, "hero-a", { ...heroSheet(live, "hero-a"), gold: 57 });
    play.dayNumber += 3;
    markQuestWon(play);
    expect(projectGameStats(store, gameId)).toEqual(before);
  });

  it("EV-14: totals and the average count won and lost records only", () => {
    const record = (
      gameId: string,
      outcome: "won" | "lost" | "quit",
      minutes: number,
    ): Parameters<typeof heroTotals>[0][number] => ({
      v: 1,
      gameId,
      outcome,
      heroIds: ["hero-a", "hero-b"],
      activeMs: minutes * 60_000,
      seq: 1,
      atWall: "2026-10-30T00:00:00.000Z",
    });
    const records = [
      record("g1", "won", 40),
      record("g2", "lost", 30),
      record("g3", "quit", 20),
      record("g4", "won", 50),
    ];
    expect(heroTotals(records)["hero-a"]).toEqual({ played: 3, won: 2 });
    expect(averageActiveMs(records)).toBe(40 * 60_000);
    expect(records).toHaveLength(4);
  });
});

/** The second game's start after New game, on the same pad. */
const startGame2 = async (session: CoreSession, pad: Pad): Promise<Pad> => {
  await pad.act("continue-pick-story-test", "continue");
  await pad.act("set-setting", "set", { settingId: "party-size", optionId: "n-2" });
  await pad.act("continue-game-settings", "continue");
  for (const heroId of HEROES.slice(0, 2)) await pad.act("hero-hold", "take", { heroId });
  await pad.act("continue-claim-heroes", "continue");
  for (const step of session.state().setupSteps) {
    if (step.id === "starting-purse") await pad.act(`spin-setup-${step.id}`, "spin");
    await pad.act(`continue-setup-${step.id}`, "continue");
  }
  await pad.act("continue-begin", "continue");
  for (const moment of OPENING_MOMENTS) await pad.act(openingPromptId(moment), "continue");
  return pad;
};

/** Presses that change nothing but are still presses: a prompt that is not on offer (a stale tap). */
const tap = async (pad: Pad, n: number) => {
  for (let i = 0; i < n; i += 1) await pad.act("stale-flow-button", "continue");
};

const withDay = (session: CoreSession, day: number) => {
  const play = session.state().play;
  if (!play) throw new Error("No play state.");
  play.dayNumber = day;
};

const logged = (store: ReturnType<typeof harness>["store"], gameId: string) =>
  store.listEvents(gameId);

describe("tap counts and active length come from the log (PT-10)", () => {
  it("EV-18: ten presses of three kinds, per day and in total; the pause is not active time", async () => {
    const { boot, store, clock } = harness();
    const session = await boot();
    const pad = await startGame(session, HEROES.slice(0, 2));
    // A second iPad holds the second hero, so its drop pauses the game.
    const second = await padFor(session);
    await pad.act("hero-hold", "release", { heroId: "hero-b" });
    await second.act("hero-hold", "take", { heroId: "hero-b" });
    const gameId = session.state().activeGameId ?? "";
    const before = tapCounts(logged(store, gameId)).total;

    clock.advance(20_000);
    withDay(session, 1);
    await tap(pad, 5);
    for (const item of ["menu", "look-up"]) {
      session.act(pad.deviceId, "gear", "open", { item });
      await session.whenIdle();
      session.act(pad.deviceId, "gear", "done", { item });
      await session.whenIdle();
    }
    clock.advance(5_000);
    withDay(session, 2);
    await tap(pad, 3);

    // A 30 s pause: the second iPad drops and comes back.
    session.disconnect(second.deviceId);
    await new Promise((resolve) => setTimeout(resolve, 40));
    await session.whenIdle();
    expect(session.state().stage).toBe("paused");
    clock.advance(30_000);
    await second.act("hero-hold", "take", { heroId: "hero-b" });
    expect(session.state().stage).toBe("playing");
    clock.advance(10_000);
    await pad.act("menu-quit", "quit-story");

    const rows = logged(store, gameId);
    const counts = tapCounts(rows);
    expect(counts.byDay[1]).toEqual({ all: 7, flowButton: 5 });
    expect(counts.byDay[2]).toEqual({ all: 3, flowButton: 3 });
    expect(counts.total - before).toBe(10);
    expect(counts.total).toBe(Object.values(counts.byDay).reduce((sum, day) => sum + day.all, 0));
    // Every press row carries its kind: flow-button, menu or help.
    const kinds = rows
      .filter((row) => row.kind === "control-press")
      .map((row) => JSON.parse(row.payload).kind);
    expect(kinds.every((kind) => ["flow-button", "menu", "help"].includes(kind))).toBe(true);
    expect(kinds).toContain("help");
    expect(kinds).toContain("menu");
    // 20 s + 5 s + 10 s of play; the 30 s pause is not counted (EV-04, EV-18).
    expect(activeMsOf(rows)).toBe(35_000);
    // A rebuilt reading of the same log gives the same numbers.
    expect(tapCounts(store.listEvents(gameId))).toEqual(counts);
    expect(projectGameRecords(store)[0]?.taps).toBe(counts.total);
    expect(projectGameRecords(store)[0]?.activeMs).toBe(35_000);
  });

  it("EV-19: counts and active length continue across a quit and Continue; away time is not active", async () => {
    const { boot, store, clock } = harness();
    const first = await boot();
    const pad = await startGame(first, HEROES.slice(0, 2));
    const gameId = first.state().activeGameId ?? "";
    const base = tapCounts(logged(store, gameId)).total;
    clock.advance(10_000);
    withDay(first, 1);
    await tap(pad, 4);
    await pad.act("menu-quit", "quit-story");
    expect(tapCounts(logged(store, gameId)).total - base).toBe(4);

    clock.advance(600_000);
    const second = await boot();
    const autosave = store.getAutosave();
    second.rememberAutosave({ gameId: autosave?.gameId ?? "", packId: "test", day: 1 });
    expect(await second.resumeSession()).toBe(true);
    const again = await padFor(second);
    await continueAndSeat(second, again);
    clock.advance(20_000);
    withDay(second, 1);
    await tap(again, 3);
    await again.act("menu-quit", "quit-story");

    const rows = logged(store, gameId);
    expect(tapCounts(rows).total - base).toBe(7);
    const record = projectGameRecords(store)[0];
    expect(record?.taps).toBe(tapCounts(rows).total);
    // 10 s before the quit and 20 s after Continue; the 10 minutes away are not active time.
    expect(record?.activeMs).toBe(30_000);
  });
});
