import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import type { PlayState } from "../../engine/loops/chapter/playState.ts";
import { ensureClock, heroSheet } from "../../engine/loops/day/clock.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { refreshOffersAfterRestore } from "../../engine/loops/session/stepShell.ts";
import { projectShellView } from "../../engine/loops/session/view.ts";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { loadStoryCatalog } from "./loadStories.ts";
import { type CoreSession, createCoreSession } from "./session.ts";
import { parseShellCheckpoint } from "./shellCheckpoint.ts";

/*
 * #589: a building result's wait ends and play moves on, so the host saves a checkpoint then. The
 * save alone (no replay of the log after it) holds the step that is showing, a host that stops
 * with no quit resumes on that step, and the payment made at the pick is not made twice.
 */

const repoPacksDir = join(import.meta.dirname, "../../../../../packs");
const packsDir = mkdtempSync(join(tmpdir(), "building-wait-packs-"));
for (const id of ["base", "test", "dracula"]) {
  cpSync(join(repoPacksDir, id), join(packsDir, id), { recursive: true });
}
const catalogs = { next: loadStoryCatalog(packsDir) };
afterAll(() => rmSync(packsDir, { recursive: true, force: true }));

const dirs: string[] = [];
const closers: Array<() => void> = [];
afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** The host's wait timer on a clock the test moves (C3/20's fake clock). */
const manualClock = () => {
  let now = 0;
  const timers = new Set<{ at: number; fire: () => void }>();
  return {
    set: (fire: () => void, ms: number) => {
      const timer = { at: now + ms, fire };
      timers.add(timer);
      return () => {
        timers.delete(timer);
      };
    },
    advance: (ms: number) => {
      now += ms;
      for (const timer of [...timers].filter((row) => row.at <= now)) {
        timers.delete(timer);
        timer.fire();
      }
    },
  };
};

type Game = {
  session: CoreSession;
  pad: string;
  store: ReturnType<typeof createEventStore>;
  clock: ReturnType<typeof manualClock>;
  act: (promptId: string, actionId: string, args?: Record<string, unknown>) => Promise<void>;
  /** Moves the wait clock and lets the host apply what fired. */
  tick: (ms: number) => Promise<void>;
  /** A host restart on the same database, with Continue pressed. */
  restart: () => Promise<Game>;
};

const realGame = async (seed: string, options: { tower?: boolean } = {}): Promise<Game> => {
  const catalog = catalogs.next;
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-chapter-card-"));
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
  const stepped = stepClock();
  let boots = 0;
  const boot = async (): Promise<Game> => {
    boots += 1;
    const clock = manualClock();
    const session = createCoreSession({
      sessionId: `session-${boots}`,
      seed,
      allowTestSeed: true,
      stories: catalog.stories,
      playContent: catalog.defaultPlay ?? PROVING_GROUNDS_PLAY,
      packVersion: "0.1.0",
      store,
      tower: bloodtowerTowerFromMock(createMockTower({ log })),
      clock: stepped,
      log,
      onChange: () => {},
      graceMs: 10,
      waitTimer: clock.set,
    });
    await session.whenIdle();
    const joined = session.join({ joinCode: "000000", formFactor: "ipad" });
    await session.whenIdle();
    if (!joined.ok) throw new Error("join refused");
    const act = async (promptId: string, actionId: string, args: Record<string, unknown> = {}) => {
      session.act(joined.deviceId, promptId, actionId, args);
      await session.whenIdle();
    };
    const tick = async (ms: number) => {
      clock.advance(ms);
      await session.whenIdle();
    };
    const game: Game = { session, pad: joined.deviceId, store, clock, act, tick, restart };
    return game;
  };
  const restart = async (): Promise<Game> => {
    const autosave = store.getAutosave();
    if (!autosave) throw new Error("No autosave to continue.");
    const again = await boot();
    again.session.rememberAutosave({ gameId: autosave.gameId, packId: autosave.packId, day: 1 });
    if (!(await again.session.resumeSession())) throw new Error("The save was not resumed.");
    await again.act("continue-saved-game", "continue");
    for (const group of again.session.state().play?.groups ?? []) {
      for (const heroId of group.heroIds) {
        if (again.session.state().holdings[heroId] == null) {
          await again.act("hero-hold", "take", { heroId });
        }
      }
    }
    for (let guard = 0; guard < 20 && again.session.state().screen === "piece-check"; guard += 1) {
      const open = again.session.projectDevice(again.pad).actions.filter((a) => a.open);
      const next =
        open.find((a) => a.actionId === "turn-drums") ?? open.find((a) => a.actionId === "confirm");
      if (!next) break;
      await again.act(next.promptId, next.actionId);
    }
    return again;
  };
  const game = await boot();
  await game.act("base-board-done", "board-set-up");
  if (options.tower) {
    await game.act("tower-connect", "tower-connect");
    await game.act("tower-calibrate", "tower-calibrate");
    await game.act("volume-1", "volume-play");
    await game.act("volume-keep", "volume-keep");
  } else {
    await game.act("play-without-tower", "play-without-tower");
  }
  await game.act("continue-pick-story-test", "continue");
  await game.act("set-setting", "set", { settingId: "party-size", optionId: "n-1" });
  // Hints run on a real timer; they are not under test here.
  await game.act("set-setting", "set", { settingId: "hints", optionId: "off" });
  await game.act("continue-game-settings", "continue");
  await game.act("hero-hold", "take", { heroId: "hero-a" });
  await game.act("continue-claim-heroes", "continue");
  for (const step of game.session.state().setupSteps) {
    if (step.id === "starting-purse") await game.act(`spin-setup-${step.id}`, "spin");
    await game.act(`continue-setup-${step.id}`, "continue");
  }
  await game.act("continue-begin", "continue");
  for (const moment of OPENING_MOMENTS) await game.act(openingPromptId(moment), "continue");
  return game;
};

const playOf = (game: Game): PlayState => {
  const play = game.session.state().play;
  if (!play) throw new Error("No play state.");
  return play;
};
const building = (game: Game) => game.session.projectDevice(game.pad).table?.building ?? null;
const gold = (game: Game) => heroSheet(ensureClock(playOf(game)), "hero-a").gold;
const pressable = (game: Game) =>
  game.session
    .projectDevice(game.pad)
    .actions.filter(
      (a) => a.open && !a.promptId.startsWith("menu-") && a.actionId !== "quit-story",
    );

/** Past the chapter card and the roll panel, into the building at the group's space. */
const intoBuilding = async (game: Game) => {
  await game.tick(4_000);
  for (
    let guard = 0;
    guard < 10 && !pressable(game).some((a) => a.actionId === "enter");
    guard += 1
  ) {
    const next = pressable(game).find((a) => a.actionId === "continue");
    if (!next) break;
    await game.act(next.promptId, next.actionId);
  }
  const enter = pressable(game).find((a) => a.actionId === "enter");
  if (!enter) throw new Error(`No Enter: ${JSON.stringify(pressable(game))}`);
  await game.act(enter.promptId, enter.actionId);
};

const VILLAGE = "N-egans-end";
const QUEST_SEED = `c3-bld-589q~test-event:none~test-at:${VILLAGE}~test-gold:hero-a=0`;

const phase = (game: Game) => building(game)?.quest?.phase ?? null;

/** Enters the village, takes the Quest and asks to be paid first: the rewards step is up. */
const toRewards = async (game: Game) => {
  await intoBuilding(game);
  const quest = building(game)?.options.find((o) => o.label.startsWith("Quest"));
  if (!quest) throw new Error("No Quest pick.");
  await game.act(quest.promptId, "build");
  const pay = pressable(game).find((a) => a.promptId.endsWith("--qopt--ask-pay-first"));
  if (!pay) throw new Error("No ask-pay-first option.");
  await game.act(pay.promptId, pay.actionId);
  expect(phase(game)).toBe("rewards");
};

/** What the last saved checkpoint shows on its own: its building step and quest phase. */
const savedView = (game: Game) => {
  const id = game.session.currentGameId();
  const row = id ? game.store.lastCheckpoint(id) : null;
  if (!id || !row) throw new Error("No checkpoint.");
  const restored = parseShellCheckpoint(JSON.parse(row.stateJson) as unknown);
  refreshOffersAfterRestore(restored);
  const shown = projectShellView(restored).table?.building ?? null;
  const events = game.store.listEvents(id);
  return {
    step: shown?.step ?? null,
    phase: shown?.quest?.phase ?? null,
    /** Shell events the save does not cover: Continue would have to replay these. */
    uncovered: events.filter((event) => event.kind === "shell" && event.seq > row.afterEventSeq)
      .length,
  };
};

describe("#589 a building wait that ends is saved", () => {
  it("the rewards wait's end saves the end hook, and again for the menu", async () => {
    const game = await realGame(QUEST_SEED);
    await toRewards(game);
    expect(savedView(game)).toEqual({ step: "result", phase: "rewards", uncovered: 0 });
    await game.tick(4_000);
    expect(phase(game)).toBe("end");
    expect(savedView(game)).toEqual({ step: "result", phase: "end", uncovered: 0 });
    await game.tick(4_000);
    expect(building(game)?.step).toBe("menu");
    expect(savedView(game)).toEqual({ step: "menu", phase: null, uncovered: 0 });
  });

  it("a restart after the rewards wait ended resumes on the end hook and pays once", async () => {
    const game = await realGame(QUEST_SEED);
    await toRewards(game);
    const paid = gold(game);
    expect(paid).toBeGreaterThan(0);
    await game.tick(4_000);
    expect(phase(game)).toBe("end");

    // The host stops with no quit and no press since the quest option.
    const again = await game.restart();
    expect(phase(again)).toBe("end");
    expect(gold(again)).toBe(paid);
    await again.tick(4_000);
    expect(phase(again)).toBeNull();
    expect(building(again)?.step).toBe("menu");
    expect(gold(again)).toBe(paid);
  });

  it("a restart after the end hook's wait ended resumes on the menu and pays once", async () => {
    const game = await realGame(QUEST_SEED);
    await toRewards(game);
    const paid = gold(game);
    await game.tick(4_000);
    await game.tick(4_000);
    expect(building(game)?.step).toBe("menu");

    const again = await game.restart();
    expect(building(again)?.step).toBe("menu");
    expect(phase(again)).toBeNull();
    expect(gold(again)).toBe(paid);
    await again.tick(4_100);
    expect(gold(again)).toBe(paid);
  });

  it("a second sitting that ends on a wait's end resumes on the step it showed", async () => {
    const first = await realGame(QUEST_SEED);
    await toRewards(first);
    const paid = gold(first);
    const second = await first.restart();
    expect(phase(second)).toBe("rewards");
    await second.tick(4_000);
    expect(phase(second)).toBe("end");

    const third = await second.restart();
    expect(phase(third)).toBe("end");
    expect(gold(third)).toBe(paid);
  });
});
