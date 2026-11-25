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
import { boardViewPayloadSchema } from "../../protocols/v2/index.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { projectGameRecords } from "../events/gameStats.ts";
import { createEventStore, type EventStore } from "../events/store.ts";
import { createHostLogger } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { type CoreSession, createCoreSession } from "./session.ts";

/**
 * C3/17 (SCR-019, DEC-116, PT-03, PT-04, PT-10): the stats screen reads the stored record, the
 * best and the average under the game's key, and the rating per iPad, across a host restart.
 */

const MIN = 60_000;
const dirs: string[] = [];
const closers: Array<() => void> = [];
afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const harness = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-stats-"));
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

type Seed = {
  outcome: "won" | "lost" | "quit";
  activeMs: number;
  partySize?: number;
  length?: string | null;
};

/** An earlier game's record, as an older evening left it in the log (oldest game first). */
const seedRecord = (store: EventStore, gameId: string, seed: Seed) => {
  store.append({
    gameId,
    kind: "game-record",
    payload: {
      v: 1,
      gameId,
      outcome: seed.outcome,
      storyId: "test",
      length: seed.length ?? null,
      difficulty: null,
      partySize: seed.partySize ?? 2,
      heroIds: ["hero-a", "hero-b"],
      how: seed.outcome === "quit" ? "quit" : seed.outcome === "won" ? "won" : "skulls",
      endDay: 4,
      activeMs: seed.activeMs,
      taps: 0,
    },
    atMonoMs: 0,
    atWall: "2026-10-01T00:00:00.000Z",
    deviceId: null,
    seed: "seed",
    packVersion: "0.1.0",
    engineVersion: "test",
  });
};

type Pad = {
  deviceId: string;
  act: (p: string, a: string, args?: Record<string, unknown>) => Promise<void>;
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
  seals: [{ id: "seal-a", name: "Seal A", glyph: "glyph-a", boon: "boon-a" }],
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
    { id: "ch-2", index: 2, kingdoms: ["E"], quests: [{ id: "c2-a", spaceId: spaceIn("E", 0) }] },
  ],
};

const armChapters = (session: CoreSession, ending: "win" | "loss") => {
  const state = session.state();
  const play = state.play;
  if (!play) throw new Error("No play state.");
  configureChapters(play, PLAN);
  const frame = state.loops.stack.find((row) => row.loopId === "chapter");
  if (!frame) throw new Error("No chapter frame.");
  frame.local = { ...(frame.local as object), chapter: 1 };
  const live = ensureClock(play);
  setHeroSheet(play, "hero-a", { ...heroSheet(live, "hero-a"), gold: 7, corruptions: 2 });
  setHeroSheet(play, "hero-b", { ...heroSheet(live, "hero-b"), gold: 0, corruptions: 0 });
  if (ending === "win") {
    ensureClock(play).supply = 24;
    ensureQuests(play).done.push("herald", "ambush");
    markQuestWon(play);
  } else {
    ensureClock(play).supply = 0;
  }
};

/** Two heroes on one iPad, `minutes` of play, then the game played to its end. */
const playGame = async (
  session: CoreSession,
  clock: { advance: (ms: number) => void },
  ending: "win" | "loss",
  minutes: number,
  partySize = 2,
): Promise<Pad> => {
  const pad = await padFor(session);
  await pad.act("base-board-done", "board-set-up");
  await pad.act("play-without-tower", "play-without-tower");
  await pad.act("continue-pick-story-test", "continue");
  await pad.act("set-setting", "set", { settingId: "party-size", optionId: `n-${partySize}` });
  await pad.act("continue-game-settings", "continue");
  for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d"].slice(0, partySize)) {
    await pad.act("hero-hold", "take", { heroId });
  }
  await pad.act("continue-claim-heroes", "continue");
  for (const step of session.state().setupSteps) {
    if (step.id === "starting-purse") await pad.act(`spin-setup-${step.id}`, "spin");
    await pad.act(`continue-setup-${step.id}`, "continue");
  }
  await pad.act("continue-begin", "continue");
  clock.advance(minutes * MIN);
  for (const moment of OPENING_MOMENTS) await pad.act(openingPromptId(moment), "continue");
  armChapters(session, ending);
  let idle = 0;
  for (let guard = 0; guard < 600 && session.state().screen !== "session"; guard += 1) {
    const pick = ["continue", "record", "done", "leave", "end-turn", "walk"]
      .map((id) => session.state().offered.find((offer) => offer.open && offer.actionId === id))
      .find((offer) => offer !== undefined);
    if (!pick) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      await session.whenIdle();
      idle += 1;
      if (idle > 20) break;
      continue;
    }
    idle = 0;
    await pad.act(pick.promptId, pick.actionId);
  }
  if (session.state().screen !== "session") throw new Error("The game did not end.");
  return pad;
};

const boardStats = (session: CoreSession): string[] | null => {
  const level = session
    .projectBoard({ code: "000000", url: "http://127.0.0.1/join", reachable: true })
    .levels.find((row) => row.id === "game-stats");
  return level ? level.shows.split("\n") : null;
};

const lengthLine = (lines: string[] | null) => lines?.find((line) => line.startsWith("Length:"));

describe("the game stats screen reads the stored record (C3/17)", () => {
  it("EV-01, EV-03, EV-13, EV-16, EV-18: stats in order, best and average under the whole key", async () => {
    const { boot, store, clock } = harness();
    seedRecord(store, "old-1", { outcome: "won", activeMs: 40 * MIN });
    seedRecord(store, "old-2", { outcome: "won", activeMs: 60 * MIN });
    seedRecord(store, "old-3", { outcome: "lost", activeMs: 30 * MIN });
    // Not under the key: a quit, another party size, another length. None counts.
    seedRecord(store, "old-4", { outcome: "quit", activeMs: 20 * MIN });
    seedRecord(store, "old-5", { outcome: "won", activeMs: 10 * MIN, partySize: 4 });
    seedRecord(store, "old-6", { outcome: "won", activeMs: 20 * MIN, length: "short" });
    const session = await boot();
    await playGame(session, clock, "win", 50);
    expect(session.state().statsGame).toBe(1);
    expect(boardStats(session)).toEqual([
      "Outcome: Won",
      "Time played: 50 min",
      "Days: 1",
      "Quests done: 2",
      "Corruptions: 2",
      "Gold: 7",
      "Key moments",
      "• Day 1: Chapter won.",
      "Length: 50 min (best 40 min · average 45 min)",
    ]);
  });

  it("a game with many long-named key moments still fits the board's frame, and says how many it left out", async () => {
    const { boot, store, clock } = harness();
    const session = await boot();
    await playGame(session, clock, "win", 50);
    const gameId = session.state().games[0]?.gameId ?? "";
    const long = (tag: string) => `${tag}${"x".repeat(80 - tag.length)}`;
    for (let index = 0; index < 20; index += 1) {
      store.append({
        gameId,
        kind: "key-moment",
        payload: {
          v: 1,
          moment: index % 2 === 0 ? "item-gained" : "quest-done",
          day: index + 1,
          hero: long("hero"),
          item: long("item"),
          quest: long("quest"),
        },
        atMonoMs: 0,
        atWall: "2026-10-01T00:00:00.000Z",
        deviceId: null,
        seed: "seed",
        packVersion: "0.1.0",
        engineVersion: "test",
      });
    }
    const board = session.projectBoard({
      code: "000000",
      url: "http://127.0.0.1/join",
      reachable: true,
    });
    expect(boardViewPayloadSchema.safeParse(board).success).toBe(true);
    const lines = boardStats(session) ?? [];
    const shown = lines.filter((line) => line.startsWith("• Day")).length;
    const more = lines.find((line) => line.startsWith("• and "));
    // The game's own chapter-won moment and the 20 seeded ones are all accounted for.
    expect(shown).toBeGreaterThan(0);
    expect(more).toBe(`• and ${21 - shown} more`);
  });

  it("EV-14: the first win under the key says Best: this game, with no best minutes", async () => {
    const { boot, store, clock } = harness();
    // A win under another key and a loss under this one do not make this the second win.
    seedRecord(store, "old-1", { outcome: "won", activeMs: 10 * MIN, partySize: 4 });
    seedRecord(store, "old-2", { outcome: "lost", activeMs: 30 * MIN });
    const session = await boot();
    await playGame(session, clock, "win", 50);
    expect(lengthLine(boardStats(session))).toBe(
      "Length: 50 min (Best: this game · average 40 min)",
    );
  });

  it("EV-15: a loss with no win under its key says No win yet; with an earlier win it shows that best", async () => {
    const first = harness();
    const lonely = await first.boot();
    await playGame(lonely, first.clock, "loss", 42);
    expect(lengthLine(boardStats(lonely))).toBe(
      "Length: 42 min (No win yet to compare · average 42 min)",
    );
    expect(boardStats(lonely)?.[0]).toBe("Outcome: Lost");

    const second = harness();
    seedRecord(second.store, "old-1", { outcome: "won", activeMs: 40 * MIN });
    const beaten = await second.boot();
    await playGame(beaten, second.clock, "loss", 42);
    expect(lengthLine(boardStats(beaten))).toBe("Length: 42 min (best 40 min · average 41 min)");
  });

  it("EV-11, EV-20: the rating per iPad, the best and the average survive a restart", async () => {
    const { boot, store, clock } = harness();
    seedRecord(store, "old-1", { outcome: "won", activeMs: 40 * MIN });
    const first = await boot();
    const pad = await playGame(first, clock, "win", 50);
    const second = await padFor(first);
    await pad.act("set-setting", "set", { settingId: "fun-rating", optionId: "4" });
    await second.act("set-setting", "set", { settingId: "fun-rating", optionId: "2" });
    const before = boardStats(first);
    // Both iPads rated; only the first holds heroes, so the seat line is its own rating then the other's.
    expect(before?.at(-1)).toBe("How was tonight?: 4 · 2");

    const restarted = await boot();
    expect(await restarted.resumeSession()).toBe(true);
    const again = await padFor(restarted);
    await again.act("session-game-1", "open-game");
    expect(boardStats(restarted)).toEqual(before);
  });

  it("EV-17: a game quit, continued and won is one record, shown as Won", async () => {
    const { boot, store, clock } = harness();
    const session = await boot();
    const pad = await padFor(session);
    await pad.act("base-board-done", "board-set-up");
    await pad.act("play-without-tower", "play-without-tower");
    await pad.act("continue-pick-story-test", "continue");
    await pad.act("set-setting", "set", { settingId: "party-size", optionId: "n-2" });
    await pad.act("continue-game-settings", "continue");
    for (const heroId of ["hero-a", "hero-b"]) await pad.act("hero-hold", "take", { heroId });
    await pad.act("continue-claim-heroes", "continue");
    for (const step of session.state().setupSteps) {
      if (step.id === "starting-purse") await pad.act(`spin-setup-${step.id}`, "spin");
      await pad.act(`continue-setup-${step.id}`, "continue");
    }
    await pad.act("continue-begin", "continue");
    for (const moment of OPENING_MOMENTS) await pad.act(openingPromptId(moment), "continue");
    clock.advance(10 * MIN);
    await pad.act("menu-quit", "quit-story");
    expect(session.state().games.map((game) => game.outcome)).toEqual(["quit"]);
    // The open quit game keeps the C2 read-out.
    await pad.act("session-game-1", "open-game");
    expect(boardStats(session)?.[1]).toBe("Outcome: quit");
    await pad.act("stats-back", "back");

    await pad.act("continue-saved-game", "continue");
    for (const heroId of ["hero-a", "hero-b"]) {
      if (session.state().holdings[heroId] == null) await pad.act("hero-hold", "take", { heroId });
    }
    for (let guard = 0; guard < 20 && session.state().screen === "piece-check"; guard += 1) {
      const open = session.state().offered.filter((o) => o.open);
      const next =
        open.find((o) => o.actionId === "turn-drums") ?? open.find((o) => o.actionId === "confirm");
      if (!next) break;
      await pad.act(next.promptId, next.actionId);
    }
    clock.advance(5 * MIN);
    armChapters(session, "win");
    for (let guard = 0; guard < 600 && session.state().screen !== "session"; guard += 1) {
      const pick = ["continue", "record", "done", "leave", "end-turn", "walk"]
        .map((id) => session.state().offered.find((offer) => offer.open && offer.actionId === id))
        .find((offer) => offer !== undefined);
      if (!pick) {
        await new Promise((resolve) => setTimeout(resolve, 5));
        await session.whenIdle();
        continue;
      }
      await pad.act(pick.promptId, pick.actionId);
    }
    expect(session.state().games.map((game) => game.outcome)).toEqual(["won"]);
    const lines = boardStats(session);
    expect(lines?.[0]).toBe("Outcome: Won");
    // The quit's own record is not in the average: this game alone, 15 min, is the first win.
    expect(lengthLine(lines)).toBe("Length: 15 min (Best: this game · average 15 min)");
    expect(projectGameRecords(store).map((record) => record.outcome)).toEqual(["won"]);
  });
});
