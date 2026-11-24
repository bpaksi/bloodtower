import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { openOutcomeWait } from "../../engine/loops/game/loop.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { OUTCOME_COPY } from "../../engine/views/outcome.ts";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { projectGameRecords } from "../events/gameStats.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower, type MockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { loadStoryCatalog } from "./loadStories.ts";
import { type CoreSession, createCoreSession } from "./session.ts";

/*
 * C3/16 (SCR-018, UI-046, DEC-144, DEC-627, DEC-663, DEC-664, CUE-003, PT-02): the outcome scene
 * and its one-line summary on a real host with the Ruined Keep pack, running on a manual wait clock.
 */

const repoPacksDir = join(import.meta.dirname, "../../../../../packs");
const copyPacks = (c3End: boolean): string => {
  const dir = mkdtempSync(join(tmpdir(), "outcome-scene-packs-"));
  for (const id of ["base", "test", "dracula"]) {
    cpSync(join(repoPacksDir, id), join(dir, id), { recursive: true });
  }
  if (c3End) {
    const file = join(dir, "base", "tuning.yaml");
    const text = readFileSync(file, "utf8");
    const edited = text.replace("c3_end_after_chapter_1: false", "c3_end_after_chapter_1: true");
    if (edited === text) throw new Error("The tuning has no C3 switch to turn on.");
    writeFileSync(file, edited);
  }
  return dir;
};
const c3Dir = copyPacks(true);
const c4Dir = copyPacks(false);
const catalogs = { c3: loadStoryCatalog(c3Dir), next: loadStoryCatalog(c4Dir) };
afterAll(() => {
  rmSync(c3Dir, { recursive: true, force: true });
  rmSync(c4Dir, { recursive: true, force: true });
});

const dirs: string[] = [];
const closers: Array<() => void> = [];
afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

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
  tower: MockTower;
  clock: ReturnType<typeof manualClock>;
  act: (promptId: string, actionId: string, args?: Record<string, unknown>) => Promise<void>;
  tick: (ms: number) => Promise<void>;
  /** Restarts the host on the same database without pressing Continue (EV-14). */
  reboot: () => Promise<Game>;
  /** Restarts the host and presses Continue + seats hero-a (EV-13, EV-15). */
  restart: () => Promise<Game>;
};

const realGame = async (
  seed: string,
  options: { c3?: boolean; tower?: boolean } = {},
): Promise<Game> => {
  const catalog = options.c3 ? catalogs.c3 : catalogs.next;
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-outcome-"));
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
    const tower = createMockTower({ log });
    const session = createCoreSession({
      sessionId: `session-${boots}`,
      seed,
      allowTestSeed: true,
      stories: catalog.stories,
      playContent: catalog.defaultPlay ?? PROVING_GROUNDS_PLAY,
      packVersion: "0.1.0",
      store,
      tower: bloodtowerTowerFromMock(tower),
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
    return { session, pad: joined.deviceId, store, tower, clock, act, tick, reboot, restart };
  };
  const reboot = async (): Promise<Game> => {
    const autosave = store.getAutosave();
    const again = await boot();
    if (autosave) {
      again.session.rememberAutosave({
        gameId: autosave.gameId,
        packId: autosave.packId,
        day: 1,
      });
    }
    if (!(await again.session.resumeSession())) throw new Error("The session was not resumed.");
    return again;
  };
  const restart = async (): Promise<Game> => {
    const again = await reboot();
    await again.act("continue-saved-game", "continue");
    if (again.session.state().enter) {
      // Tower-linked game: reconnect the tower on Continue's tower block.
      await again.act("tower-connect", "tower-connect");
      await again.act("tower-calibrate", "tower-calibrate");
    }
    for (const group of again.session.state().play?.groups ?? []) {
      for (const heroId of group.heroIds) {
        if (again.session.state().holdings[heroId] == null) {
          await again.act("hero-hold", "take", { heroId });
        }
      }
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
  // Pass chapter 1's opening card.
  await game.tick(4_000);
  return game;
};

const outcomeOf = (game: Game) => game.session.projectDevice(game.pad).table?.outcome ?? null;
const boardOutcomeOf = (game: Game) =>
  game.session.projectBoard({ code: "000000", url: "http://x", reachable: true }).table?.outcome ??
  null;
const pressable = (game: Game) =>
  game.session
    .projectDevice(game.pad)
    .actions.filter(
      (a) => a.open && !a.promptId.startsWith("menu-") && a.actionId !== "quit-story",
    );

const playUntilOutcome = async (game: Game) => {
  for (let guard = 0; guard < 200 && !outcomeOf(game); guard += 1) {
    const pick = ["continue", "record", "done", "leave", "end-turn"]
      .map((id) => pressable(game).find((a) => a.actionId === id))
      .find((found) => found !== undefined);
    if (pick) {
      await game.act(pick.promptId, pick.actionId);
      continue;
    }
    await game.tick(4_000);
  }
  expect(outcomeOf(game)).not.toBeNull();
};

const SEED = "c316~test-event:none";

describe("C3/16 outcome scene (win or loss)", () => {
  it("EV-01, EV-06, EV-07, EV-10, EV-11: skulls loss plays loss-skulls + CUE-003, then summary, then Game stats", async () => {
    const game = await realGame(`${SEED}~test-supply:1~test-kingdom:E`, { tower: true });
    await playUntilOutcome(game);
    const scene = outcomeOf(game);
    expect(scene).toMatchObject({
      stage: "scene",
      outcome: "lost",
      reason: "skulls",
      sceneId: "loss-skulls",
      caption: OUTCOME_COPY.lossSkulls,
      cue: "CUE-003",
      tick: OUTCOME_COPY.tickAuto,
    });
    expect(boardOutcomeOf(game)).toEqual(scene);
    // No Next button on iPad.
    expect(pressable(game)).toEqual([]);
    expect(game.session.projectDevice(game.pad).gear?.helpScreen).toBe("outcome-scene");
    // EV-07: CUE-003 defeat light sequence fired once on the tower.
    const defeats = game.tower
      .sent()
      .filter((entry) => entry.type === "sequence" && entry.sequence === "defeat");
    expect(defeats).toEqual([{ type: "sequence", sequence: "defeat", soundIndex: 96 }]);

    // EV-11: 4 s hold without audio; not before.
    await game.tick(3_800);
    expect(outcomeOf(game)?.stage).toBe("scene");
    await game.tick(200);
    expect(outcomeOf(game)).toMatchObject({
      stage: "summary",
      sceneId: "loss-skulls",
      summary: "1 days. 0 quests done. 1 skulls on the board.",
      cue: null,
    });
    expect(pressable(game)).toEqual([]);

    // Summary holds 4 s, then moves to Game stats for this game (not session list).
    await game.tick(3_800);
    expect(outcomeOf(game)?.stage).toBe("summary");
    await game.tick(200);
    expect(game.session.state().screen).toBe("session");
    expect(game.session.state().statsGame).toBe(1);
    expect(game.session.state().autosave).toBeNull();
    expect(game.store.getAutosave()).toBeNull();
    expect(projectGameRecords(game.store)).toHaveLength(1);
    expect(projectGameRecords(game.store)[0]).toMatchObject({
      outcome: "lost",
      how: "skulls",
      sceneId: "loss-skulls",
    });
  });

  it("EV-02: third corruption in a scene reaches loss-corruption at once, before day end", async () => {
    const game = await realGame(
      `${SEED}~test-at:N-dayside~test-quest:N-dayside=curse~test-named:hero-a=feral+lost`,
    );
    await game.act("day-1-roll-done", "continue");
    await game.act("enter--hero-a--N-dayside", "enter");
    const questOpt = pressable(game).find((a) => a.promptId.endsWith("--pick--quest"));
    if (!questOpt) throw new Error("Expected quest option.");
    await game.act(questOpt.promptId, questOpt.actionId);
    const curseOpt = pressable(game).find((a) => a.promptId.endsWith("--qopt--take-the-curse"));
    if (!curseOpt) throw new Error("Expected curse option.");
    await game.act(curseOpt.promptId, curseOpt.actionId);
    const heroOpt = pressable(game).find((a) => a.promptId.endsWith("--qhero--hero-a"));
    if (!heroOpt) throw new Error("Expected hero option.");
    await game.act(heroOpt.promptId, heroOpt.actionId);

    // At once: no skull drop or day end first, and place still is cleared so outcome scene renders.
    expect(outcomeOf(game)).toMatchObject({
      stage: "scene",
      outcome: "lost",
      reason: "corruption",
      sceneId: "loss-corruption",
      caption: OUTCOME_COPY.lossCorruption,
      cue: "CUE-003",
    });
    expect(
      game.session.projectBoard({ code: "000000", url: "http://x", reachable: true }).place,
    ).toBeNull();
  });

  it("PT-02: fourth fallen building plays loss-buildings with exact Copy table line", async () => {
    const east = PROVING_GROUNDS_PLAY.board.spaces.filter((s) => s.kingdom === "E" && s.building);
    const skulls = east
      .slice(0, 4)
      .map((s, i) => `${s.id}=${i < 3 ? 4 : 3}`)
      .join(",");
    const game = await realGame(`${SEED}~test-skulls:${skulls}~test-kingdom:E`);
    await playUntilOutcome(game);
    expect(outcomeOf(game)).toMatchObject({
      stage: "scene",
      outcome: "lost",
      reason: "buildings",
      sceneId: "loss-buildings",
      caption: OUTCOME_COPY.lossBuildings,
      cue: "CUE-003",
    });
  });

  it("EV-05 & EV-07: C3 win plays win scene, then win.chapter-1 (no finale line), then summary, with no CUE-003", async () => {
    const game = await realGame(SEED, { c3: true, tower: true });
    await game.session.applyTestSeed("~test-quests-done:herald+ambush");
    await playUntilOutcome(game);
    expect(outcomeOf(game)).toMatchObject({
      stage: "scene",
      outcome: "won",
      sceneId: "win",
      caption: OUTCOME_COPY.winScene,
      cue: null,
    });
    expect(
      game.tower.sent().filter((entry) => entry.type === "sequence" && entry.sequence === "defeat"),
    ).toEqual([]);

    await game.tick(4_000);
    expect(outcomeOf(game)).toMatchObject({
      stage: "closing",
      sceneId: "win",
      closingId: "win-chapter-1",
      caption: OUTCOME_COPY.winChapter1,
      cue: null,
    });

    await game.tick(4_000);
    expect(outcomeOf(game)).toMatchObject({
      stage: "summary",
      sceneId: "win",
      summary: "1 days. 2 quests done. 1 skulls on the board.",
      cue: null,
    });

    await game.tick(4_000);
    expect(game.session.state().screen).toBe("session");
    expect(game.session.state().statsGame).toBe(1);
    expect(
      game.tower.sent().filter((entry) => entry.type === "sequence" && entry.sequence === "defeat"),
    ).toEqual([]);
  });

  it("EV-03: finale win with ending-break vs ending-oath plays two distinct closing lines", async () => {
    const runFinale = async (flag: string) => {
      const game = await realGame(SEED);
      await game.session.applyTestSeed(`~test-finale~test-flag:${flag}`);
      await playUntilOutcome(game);
      expect(outcomeOf(game)?.stage).toBe("scene");
      await game.tick(4_000);
      return outcomeOf(game);
    };
    const shattered = await runFinale("ending-break");
    const holds = await runFinale("ending-oath");
    expect(shattered?.caption).toBe(OUTCOME_COPY.winFinaleShattered);
    expect(holds?.caption).toBe(OUTCOME_COPY.winFinaleHolds);
    expect(shattered?.caption).not.toBe(holds?.caption);
  });

  it("EV-06 & EV-12: narrated outcome waits for audio-end past 4.5 s, then summary holds 4 s to Game stats", async () => {
    const game = await realGame(
      `${SEED}~test-supply:1~test-kingdom:E~test-outcome-line:outcome.loss-1`,
    );
    await playUntilOutcome(game);
    expect(outcomeOf(game)?.lineId).toBe("outcome.loss-1");
    expect(openOutcomeWait(game.session.state().loops.stack)?.lineId).toBe("outcome.loss-1");
    await game.tick(4_500);
    expect(outcomeOf(game)?.stage).toBe("scene");

    game.session.narrationEnded("outcome.loss-1");
    await game.session.whenIdle();
    expect(outcomeOf(game)?.stage).toBe("summary");

    await game.tick(3_800);
    expect(outcomeOf(game)?.stage).toBe("summary");
    await game.tick(200);
    expect(game.session.state().screen).toBe("session");
    expect(game.session.state().statsGame).toBe(1);
  });

  it("EV-13 (1) & EV-14 & EV-15: restart on outcome lands on session with game listed lost; Continue resumes once with gear closed", async () => {
    const game = await realGame(`${SEED}~test-supply:1~test-kingdom:E`, { tower: true });
    await playUntilOutcome(game);
    expect(outcomeOf(game)?.stage).toBe("scene");
    const gameId = game.session.state().activeGameId ?? "";
    // EV-15: open Volume panel before restart.
    await game.act("gear", "open", { item: "volume" });
    expect(game.session.state().gearPanel).toBe("volume");
    expect(game.session.state().gearPaused).toBe(true);

    // EV-14: restart on the outcome scene lands on the session screen, listed lost (not in progress).
    const rebooted = await game.reboot();
    expect(rebooted.session.state().screen).toBe("session");
    expect(rebooted.session.state().statsGame).toBeNull();
    expect(rebooted.session.state().games.map((g) => g.outcome)).toEqual(["lost"]);
    expect(rebooted.session.state().gearPanel).toBeNull();
    expect(rebooted.session.state().gearPaused).toBe(false);

    // EV-13 (1) & EV-15: Continue resumes the same outcome step, unpaused, with gear closed, and applies result once.
    await rebooted.act("continue-saved-game", "continue");
    if (rebooted.session.state().enter) {
      await rebooted.act("tower-connect", "tower-connect");
      await rebooted.act("tower-calibrate", "tower-calibrate");
    }
    await rebooted.act("hero-hold", "take", { heroId: "hero-a" });
    expect(outcomeOf(rebooted)?.stage).toBe("scene");
    expect(rebooted.session.state().gearPanel).toBeNull();
    expect(rebooted.session.state().gearPaused).toBe(false);
    // CUE-003 does NOT fire again on Continue.
    expect(
      rebooted.tower
        .sent()
        .filter((entry) => entry.type === "sequence" && entry.sequence === "defeat"),
    ).toEqual([]);

    await rebooted.tick(4_000);
    expect(outcomeOf(rebooted)?.stage).toBe("summary");
    await rebooted.tick(4_000);
    expect(rebooted.session.state().screen).toBe("session");
    expect(rebooted.session.state().statsGame).toBe(1);
    const finished = rebooted.store.listEvents(gameId).filter((row) => row.kind === "game-record");
    expect(finished).toHaveLength(1);
    expect(projectGameRecords(rebooted.store)).toHaveLength(1);
    expect(rebooted.session.state().games).toHaveLength(1);
  });

  it("EV-13 (2): quit on summary and Continue from session resumes summary and applies result once", async () => {
    const game = await realGame(`${SEED}~test-supply:1~test-kingdom:E`);
    await playUntilOutcome(game);
    await game.tick(4_000);
    expect(outcomeOf(game)?.stage).toBe("summary");
    const gameId = game.session.state().activeGameId ?? "";

    await game.act("menu-quit", "quit-story");
    expect(game.session.state().screen).toBe("session");
    expect(game.session.state().statsGame).toBeNull();
    expect(game.session.state().autosave?.gameId).toBe(gameId);

    await game.act("continue-saved-game", "continue");
    for (const group of game.session.state().play?.groups ?? []) {
      for (const heroId of group.heroIds) {
        if (game.session.state().holdings[heroId] == null) {
          await game.act("hero-hold", "take", { heroId });
        }
      }
    }
    expect(outcomeOf(game)?.stage).toBe("summary");
    await game.tick(4_000);
    expect(game.session.state().screen).toBe("session");
    expect(game.session.state().statsGame).toBe(1);
    expect(projectGameRecords(game.store)).toHaveLength(1);
    expect(projectGameRecords(game.store)[0]).toMatchObject({ outcome: "lost", how: "skulls" });
    const finishedRows = game.store
      .listEvents(gameId)
      .filter((row) => row.kind === "game-record" && JSON.parse(row.payload).outcome !== "quit");
    expect(finishedRows).toHaveLength(1);
  });
});
