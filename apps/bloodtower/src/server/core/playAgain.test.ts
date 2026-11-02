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

const dirs: string[] = [];
const closers: Array<() => void> = [];

afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const harness = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-again-"));
  dirs.push(dir);
  const opened = openDatabase(join(dir, "session.sqlite"));
  closers.push(() => opened.close());
  const store = createEventStore(opened.db);
  const log = createHostLogger({ dataDir: dir, mirror: false });
  const clock = stepClock();
  let count = 0;
  /** One host process: a fresh session on the same database. */
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
    });
    await session.whenIdle();
    return session;
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
  return { boot, store };
};

const HEROES = ["hero-a", "hero-b", "hero-c", "hero-d"];

const padFor = async (session: CoreSession) => {
  const joined = session.join({ joinCode: "000000", formFactor: "ipad" });
  await session.whenIdle();
  if (!joined.ok) throw new Error("join refused");
  const act = async (promptId: string, actionId: string, args: Record<string, unknown> = {}) => {
    session.act(joined.deviceId, promptId, actionId, args);
    await session.whenIdle();
  };
  return { deviceId: joined.deviceId, act };
};

type Act = Awaited<ReturnType<typeof padFor>>["act"];

const toBegin = async (session: CoreSession, act: Act) => {
  for (const step of session.state().setupSteps) await act(`continue-setup-${step.id}`, "continue");
  await act("continue-begin", "continue");
  for (const moment of OPENING_MOMENTS) await act(openingPromptId(moment), "continue");
};

/** Takes the day's roll, then one walk if the table offers it. */
const walkOnce = async (session: CoreSession, act: Act) => {
  const open = () => session.state().offered.filter((offer) => offer.open);
  const roll = open().find((offer) => offer.promptId.includes("roll-done"));
  if (roll) await act(roll.promptId, "continue");
  const walk = open().find((offer) => offer.actionId === "walk");
  if (!walk) throw new Error("No walk was offered.");
  await act(walk.promptId, "walk");
};

const firstGame = async (session: CoreSession) => {
  const pad = await padFor(session);
  await pad.act("base-board-done", "board-set-up");
  await pad.act("play-without-tower", "play-without-tower");
  await pad.act("continue-pick-story-test", "continue");
  await pad.act("continue-game-settings", "continue");
  for (const heroId of HEROES) await pad.act("hero-hold", "take", { heroId });
  await pad.act("continue-claim-heroes", "continue");
  await toBegin(session, pad.act);
  return pad;
};

describe("a game's stats and Play again across a host restart (C2/07)", () => {
  it("rebuilds the stats after a restart, equal to what the game showed (EV-12)", async () => {
    const { boot, store } = harness();
    const first = await boot();
    const pad = await firstGame(first);
    await walkOnce(first, pad.act);
    await pad.act("menu-quit", "quit-story");
    await pad.act("session-game-1", "open-game");
    await pad.act("set-setting", "set", { settingId: "fun-rating", optionId: "4" });
    const board = (session: CoreSession) =>
      session
        .projectBoard({ code: "000000", url: "http://127.0.0.1/join", reachable: true })
        .levels.find((level) => level.id === "game-stats");
    const before = board(first);
    expect(before?.label).toBe("Game 1");
    expect(before?.shows).toContain("Moves taken: 1");
    expect(before?.shows).toContain("Time played: —");
    expect(first.state().games[0]?.rating).toBe(4);
    await pad.act("stats-back", "back");
    const written = first.state().games;
    expect(written[0]?.moves).toBe(1);

    const autosave = store.getAutosave();
    const second = await boot();
    second.rememberAutosave({ gameId: autosave?.gameId ?? "", packId: "test", day: 1 });
    expect(await second.resumeSession()).toBe(true);
    expect(second.state().games).toEqual(written);
    const again = await padFor(second);
    await again.act("session-game-1", "open-game");
    expect(board(second)).toEqual(before);
  });

  it("Continue after Play again resumes the new game's seed, not the first game's (EV-11)", async () => {
    const { boot, store } = harness();
    const first = await boot();
    const pad = await firstGame(first);
    await pad.act("menu-quit", "quit-story");
    const original = store.getAutosave();
    const originalSeed = store.lastCheckpoint(original?.gameId ?? "")?.seed;
    expect(originalSeed).toBe("seed");

    await pad.act("session-game-1", "open-game");
    await pad.act("stats-play-again", "play-again");
    await pad.act("session-play-again-confirm", "play-again");
    expect(first.state().screen).toBe("claim-heroes");
    // The same iPad is still joined, so it holds all four heroes again.
    expect(
      Object.values(first.state().holdings).filter((holder) => holder === pad.deviceId),
    ).toHaveLength(4);
    await pad.act("continue-claim-heroes", "continue");
    await toBegin(first, pad.act);
    await walkOnce(first, pad.act);
    const played = first.state();
    expect(played.seed).not.toBe(originalSeed);
    await pad.act("menu-quit", "quit-story");

    const autosave = store.getAutosave();
    expect(autosave?.gameId).not.toBe(original?.gameId);
    const newSeed = store.lastCheckpoint(autosave?.gameId ?? "")?.seed;
    expect(newSeed).toBe(played.seed);
    expect(newSeed).not.toBe(originalSeed);

    const second = await boot();
    second.rememberAutosave({ gameId: autosave?.gameId ?? "", packId: "test", day: 1 });
    expect(second.state().autosave?.seed).toBe(newSeed);
    expect(await second.resumeSession()).toBe(true);
    const resumedPad = await padFor(second);
    await resumedPad.act("continue-saved-game", "continue");
    const resumed = second.state();
    expect(resumed.screen).toBe("play");
    expect(resumed.seed).toBe(newSeed);
    expect(resumed.play?.groups.map((group) => `${group.id}:${group.spaceId}`)).toEqual(
      played.play?.groups.map((group) => `${group.id}:${group.spaceId}`),
    );
    expect(resumed.play?.rngSeq).toBe(played.play?.rngSeq);
    expect(resumed.play?.dayRolls).toEqual(played.play?.dayRolls);
  });
});
