import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { openChapterWait, tryChapters } from "../../engine/loops/chapter/chapters.ts";
import type { PlayState } from "../../engine/loops/chapter/playState.ts";
import { ensureQuests } from "../../engine/loops/quest/store.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
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

/*
 * C3/15: the chapter card, the stamped won card, the close Scroll, the seal's Reveal and Set the
 * table, played on a real host with the Ruined Keep pack. The host's wait timer runs on a clock
 * the test moves, so "4 s" is exact. `c3` loads the packs with the C3 end on (Q-C3-01); the base
 * tuning has it off (C4-01), which is the fixture with `c3_end_after_chapter_1: false`.
 */

const repoPacksDir = join(import.meta.dirname, "../../../../../packs");
const copyPacks = (c3End: boolean): string => {
  const dir = mkdtempSync(join(tmpdir(), "chapter-card-packs-"));
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

const realGame = async (
  seed: string,
  options: { c3?: boolean; tower?: boolean } = {},
): Promise<Game> => {
  const catalog = options.c3 ? catalogs.c3 : catalogs.next;
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
const chapters = (game: Game) => {
  const store = tryChapters(playOf(game));
  if (!store) throw new Error("No chapter store.");
  return store;
};
const beat = (game: Game) => game.session.projectDevice(game.pad).table?.chapterBeat ?? null;
const boardBeat = (game: Game) =>
  game.session.projectBoard({ code: "000000", url: "http://x", reachable: true }).table
    ?.chapterBeat ?? null;
const wait = (game: Game) => openChapterWait(game.session.state().loops.stack, playOf(game));
/** What the iPad can press now, menu and toolbar items left out. */
const pressable = (game: Game) =>
  game.session
    .projectDevice(game.pad)
    .actions.filter(
      (a) => a.open && !a.promptId.startsWith("menu-") && a.actionId !== "quit-story",
    );
const helpScreen = (game: Game) => game.session.projectDevice(game.pad).gear?.helpScreen;

/** Chapter rows of the shell event log: the wait ends and the presses, in order. */
const shellLog = (game: Game) => {
  const gameId = game.session.currentGameId();
  if (!gameId) throw new Error("No game.");
  return game.store.listEvents(gameId).flatMap((row) => {
    if (row.kind !== "shell") return [];
    const event = (
      JSON.parse(row.payload) as {
        event?: { kind?: string; waitId?: string; promptId?: string; cause?: string };
      }
    ).event;
    if (event?.kind === "wait-end" && event.waitId?.startsWith("chapter-")) {
      return [`${event.waitId}:${event.cause}`];
    }
    if (event?.kind === "press" && event.promptId?.startsWith("table-done--")) {
      return [event.promptId];
    }
    return [];
  });
};

/** Presses what a table presses between turns until `until` holds; moves the wait clock too. */
const playOn = async (game: Game, until: () => boolean) => {
  for (let guard = 0; guard < 400 && !until(); guard += 1) {
    const pick = ["continue", "record", "done", "leave", "end-turn"]
      .map((id) => pressable(game).find((a) => a.actionId === id))
      .find((found) => found !== undefined);
    if (pick && !pick.promptId.startsWith("table-done--")) {
      await game.act(pick.promptId, pick.actionId);
      continue;
    }
    if (beat(game)?.stage === "table") return;
    await game.tick(4_000);
  }
};

/** Chapter 1 won at the first day's end: the test marks both quests done (no quest scenes). */
const winChapterOne = async (game: Game) => {
  await game.session.applyTestSeed("~test-quests-done:herald+ambush");
  await playOn(game, () => beat(game)?.stage === "stamp");
  expect(beat(game)?.stage).toBe("stamp");
};

const SEED = "c315~test-event:none";

describe("C3/15 the chapter card at the start", () => {
  it("EV-01, EV-06, EV-08, EV-09, EV-11: the card shows with CUE-004, no Next, and moves on after 4 s", async () => {
    const game = await realGame(SEED);
    const card = beat(game);
    expect(card).toMatchObject({
      stage: "card",
      chapter: 1,
      label: "Chapter 1",
      name: "The Roads",
      goal: "Hear the herald in Greyford. Then open the forest road.",
      cue: "CUE-004",
      tick: "Moves on by itself.",
      lineId: null,
      table: null,
    });
    expect(boardBeat(game)).toEqual(card);
    expect(chapters(game).nodes.filter((n) => n === "cue:CUE-004:1")).toHaveLength(1);
    // No Next: nothing to press but the toolbar (EV-09: the happy path never needs it).
    expect(pressable(game)).toEqual([]);
    expect(helpScreen(game)).toBe("chapter-card");
    await game.tick(3_800);
    expect(beat(game)?.stage).toBe("card");
    await game.tick(200);
    expect(beat(game)).toBeNull();
    expect(chapters(game).stage).toBe("days");
    expect(shellLog(game)).toEqual(["chapter-card-1:timeout"]);
    expect(pressable(game).length).toBeGreaterThan(0);
  });

  it("EV-12: with narration it waits for the audio end, never the timer", async () => {
    const game = await realGame(`${SEED}~test-chapter-line:chapter.line-1`);
    expect(beat(game)?.lineId).toBe("chapter.line-1");
    await game.tick(4_500);
    expect(beat(game)?.stage).toBe("card");
    game.session.narrationEnded("another.line");
    await game.session.whenIdle();
    expect(beat(game)?.stage).toBe("card");
    game.session.narrationEnded("chapter.line-1");
    game.session.narrationEnded("chapter.line-1");
    await game.session.whenIdle();
    expect(beat(game)).toBeNull();
    expect(shellLog(game)).toEqual(["chapter-card-1:audio-end"]);
  });

  it("EV-13: a restart on the card shows it again, applies CUE-004 once, and it moves on once", async () => {
    const game = await realGame(SEED);
    expect(beat(game)?.stage).toBe("card");
    const again = await game.restart();
    expect(beat(again)?.stage).toBe("card");
    expect(pressable(again)).toEqual([]);
    await again.tick(4_000);
    expect(beat(again)).toBeNull();
    const store = chapters(again);
    expect(store.nodes.filter((n) => n === "cue:CUE-004:1")).toHaveLength(1);
    expect(store.nodes.filter((n) => n === "enter:1")).toHaveLength(1);
    expect(store.entered).toEqual([1]);
    expect(shellLog(again)).toEqual(["chapter-card-1:timeout"]);
  });

  it("EV-14: Continue on day 2 does not replay the chapter card", async () => {
    const game = await realGame(SEED);
    await game.tick(4_000);
    await playOn(game, () => playOf(game).dayNumber >= 2);
    expect(playOf(game).dayNumber).toBe(2);
    const again = await game.restart();
    expect(beat(again)).toBeNull();
    expect(chapters(again).nodes.filter((n) => n === "card:1")).toHaveLength(1);
    expect(pressable(again).length).toBeGreaterThan(0);
  });
});

describe("C3/15 the chapter end in C3 (Q-C3-01)", () => {
  it("EV-05, EV-06, EV-09, EV-10, EV-11: stamp with CUE-005, the close Scroll, then the outcome", async () => {
    const game = await realGame(SEED, { c3: true, tower: true });
    await game.tick(4_000);
    await winChapterOne(game);
    expect(beat(game)).toMatchObject({ stage: "stamp", stamp: "Cleared", cue: "CUE-005" });
    expect(helpScreen(game)).toBe("chapter-card");
    expect(pressable(game)).toEqual([]);
    await game.tick(4_000);
    expect(beat(game)).toMatchObject({
      stage: "close",
      close: "The roads are quiet again.",
      cue: null,
    });
    expect(game.session.state().screen).toBe("play");
    expect(pressable(game)).toEqual([]);
    await game.tick(4_000);
    // The outcome follows (feature 16): win scene, chapter-1 closing, summary, then Game stats.
    expect(game.session.projectDevice(game.pad).table?.outcome?.stage).toBe("scene");
    await game.tick(4_000);
    expect(game.session.projectDevice(game.pad).table?.outcome?.stage).toBe("closing");
    await game.tick(4_000);
    expect(game.session.projectDevice(game.pad).table?.outcome?.stage).toBe("summary");
    await game.tick(4_000);
    expect(game.session.state().screen).toBe("session");
    const store = chapters(game);
    expect(store.nodes.filter((n) => n === "cue:CUE-005:1")).toHaveLength(1);
    expect(store.nodes).not.toContain("seal-break");
    expect(store.nodes).not.toContain("table.shown:2");
    expect(store.nodes.filter((n) => n.startsWith(".25"))).toEqual([]);
    expect(shellLog(game)).toEqual([
      "chapter-card-1:timeout",
      "chapter-stamp-1:timeout",
      "chapter-close-1:timeout",
    ]);
  });

  it("EV-13: a restart on the stamped card shows it again; CUE-005 is applied once", async () => {
    const game = await realGame(SEED, { c3: true });
    await game.tick(4_000);
    await winChapterOne(game);
    const again = await game.restart();
    expect(beat(again)?.stage).toBe("stamp");
    await again.tick(4_000);
    expect(beat(again)?.stage).toBe("close");
    await again.tick(4_000);
    expect(again.session.projectDevice(again.pad).table?.outcome?.stage).toBe("scene");
    await again.tick(4_000);
    await again.tick(4_000);
    await again.tick(4_000);
    expect(again.session.state().screen).toBe("session");
    expect(chapters(again).nodes.filter((n) => n === "cue:CUE-005:1")).toHaveLength(1);
    expect(chapters(again).nodes.filter((n) => n === "won")).toHaveLength(1);
  });
});

describe("C3/15 Set the table after the next chapter's card (PT-21)", () => {
  const toTable = async (game: Game) => {
    await game.tick(4_000);
    await winChapterOne(game);
    await game.tick(4_000);
    expect(beat(game)?.stage).toBe("close");
    await game.tick(4_000);
  };

  it("EV-03, EV-07, EV-16, EV-17b, EV-18, EV-20, EV-21: no tower: story first, then the tokens only", async () => {
    const game = await realGame(SEED);
    await toTable(game);
    // Chapter 2's card, with Brynthia lit (its enter ran) and no chore before it.
    expect(beat(game)).toMatchObject({ stage: "card", chapter: 2, name: "The Keep" });
    expect(beat(game)?.goal).toBe(
      "Go down into the barrow under the old keep. Find the shrine on the road beside it.",
    );
    const store = chapters(game);
    expect(store.bounds).toEqual(["N", "E"]);
    expect(store.nodes.filter((n) => n === "cue:CUE-004:2")).toHaveLength(1);
    expect(pressable(game)).toEqual([]);
    await game.tick(4_000);
    const table = beat(game)?.table;
    expect(beat(game)?.stage).toBe("table");
    expect(table).toEqual({
      title: "Set the table",
      rows: [{ id: "tokens", label: "Quest tokens: The Barrow, The Shrine" }],
      done: "Done",
      promptId: "table-done--2",
    });
    expect(boardBeat(game)?.table).toEqual(table);
    expect(beat(game)?.tick).toBeNull();
    expect(helpScreen(game)).toBe("set-the-table");
    // One button, open from the start (EV-24): Done.
    expect(pressable(game).map((a) => `${a.promptId}:${a.actionId}:${a.label}`)).toEqual([
      "table-done--2:done:Done",
    ]);
    const words = JSON.stringify(beat(game));
    expect(words).not.toMatch(/\[COPY:/);
    expect(words).not.toMatch(/glyph|drum|traitor/i);
    // The tokens are in the state once, from chapter 2's enter.
    expect(ensureQuests(playOf(game)).bySpace["E-utars-barrows"]).toBe("barrow");
    expect(ensureQuests(playOf(game)).bySpace["E-greater-tombstones"]).toBe("shrine");

    const dayBefore = playOf(game).dayNumber;
    await game.act("table-done--2", "done");
    expect(beat(game)).toBeNull();
    // A late second press is logged as a press but changes nothing: one `table.done`.
    const dayAfterDone = playOf(game).dayNumber;
    await game.act("table-done--2", "done");
    expect(store.nodes.filter((n) => n === "table.done:2")).toHaveLength(1);
    expect(playOf(game).dayNumber).toBe(dayAfterDone);
    const order = ["stamp:1", "close:1", "enter:2", "card:2", "table.shown:2", "table.done:2"];
    const at = order.map((n) => store.nodes.indexOf(n));
    expect(at.every((value, k) => value >= 0 && (k === 0 || value > (at[k - 1] ?? 0)))).toBe(true);
    // Chapter 2's first day starts.
    expect(game.session.state().loops.stack.some((f) => f.loopId === "day")).toBe(true);
    expect(playOf(game).dayNumber).toBe(dayBefore + 1);
    expect(store.sealsDroppedOut).toBe(true);
  });

  it("EV-02, EV-17a, EV-24: with the tower: the Reveal right after the card, then the seal and tokens rows", async () => {
    const game = await realGame(`${SEED}~test-seals`, { tower: true });
    await toTable(game);
    expect(beat(game)?.stage).toBe("card");
    await game.tick(4_000);
    const reveal = beat(game);
    expect(reveal?.stage).toBe("reveal");
    expect(reveal?.seal?.boon).toMatch(/^Its glyph lends you strength: .+\.$/);
    expect(pressable(game)).toEqual([]);
    await game.tick(4_000);
    const rows = beat(game)?.table?.rows ?? [];
    expect(rows.map((row) => row.id)).toEqual(["seal", "tokens"]);
    expect(["The Road Seal", "The Keep Seal", "The Warden's Seal"]).toContain(rows[0]?.label);
    expect(rows[1]?.label).toBe("Quest tokens: The Barrow, The Shrine");
    // No skulls were held, so none are freed: no row, and no skull prompt before or after Done.
    expect(chapters(game).skullsToPlace).toBe(0);
    expect(pressable(game).map((a) => a.promptId)).toEqual(["table-done--2"]);
    await game.act("table-done--2", "done");
    expect(beat(game)).toBeNull();
    expect(pressable(game).some((a) => a.promptId.startsWith("skull-record--"))).toBe(false);
    expect(shellLog(game)).toEqual([
      "chapter-card-1:timeout",
      "chapter-stamp-1:timeout",
      "chapter-close-1:timeout",
      "chapter-card-2:timeout",
      "chapter-reveal-2:timeout",
      "table-done--2",
    ]);
  });

  it("EV-19: Set the table never moves on by itself", async () => {
    const game = await realGame(SEED);
    await toTable(game);
    await game.tick(4_000);
    expect(beat(game)?.stage).toBe("table");
    for (let s = 0; s < 30; s += 1) await game.tick(1_000);
    game.session.narrationEnded("chapter.line-1");
    await game.session.whenIdle();
    expect(beat(game)?.stage).toBe("table");
    expect(wait(game)).toBeNull();
  });

  it("EV-23: a restart in Set the table resumes it; no card replay, no second tokens, one Done", async () => {
    const game = await realGame(SEED);
    await toTable(game);
    await game.tick(4_000);
    expect(beat(game)?.stage).toBe("table");
    const again = await game.restart();
    expect(beat(again)?.stage).toBe("table");
    expect(pressable(again).map((a) => a.promptId)).toEqual(["table-done--2"]);
    const store = chapters(again);
    expect(store.nodes.filter((n) => n === "card:2")).toHaveLength(1);
    expect(store.nodes.filter((n) => n === "enter:2")).toHaveLength(1);
    const barrows = Object.values(ensureQuests(playOf(again)).bySpace).filter(
      (q) => q === "barrow",
    );
    expect(barrows).toHaveLength(1);
    await again.act("table-done--2", "done");
    expect(beat(again)).toBeNull();
    expect(store.nodes.filter((n) => n === "table.done:2")).toHaveLength(1);
    expect(again.session.state().loops.stack.some((f) => f.loopId === "day")).toBe(true);
  });

  it("EV-15, EV-23: a gear panel open in Set the table; after a restart Done is offered again", async () => {
    const game = await realGame(SEED);
    await toTable(game);
    await game.tick(4_000);
    expect(beat(game)?.stage).toBe("table");
    await game.act("gear", "open", { item: "current-party" });
    const again = await game.restart();
    expect(beat(again)?.stage).toBe("table");
    expect(again.session.projectDevice(again.pad).gear?.paused ?? false).toBe(false);
    expect(pressable(again).map((a) => a.promptId)).toEqual(["table-done--2"]);
  });

  it("EV-23: a drop pause in Set the table, then the hero taken again, offers Done again", async () => {
    const game = await realGame(SEED);
    await toTable(game);
    await game.tick(4_000);
    expect(beat(game)?.stage).toBe("table");
    game.session.disconnect(game.pad);
    // The drop's grace (10 ms) runs out, so the disconnect pause opens.
    await new Promise((resolve) => setTimeout(resolve, 50));
    await game.session.whenIdle();
    expect(game.session.state().pause?.cause).toBe("disconnect");
    const joined = game.session.join({ joinCode: "000000", formFactor: "ipad" });
    await game.session.whenIdle();
    if (!joined.ok) throw new Error("join refused");
    game.session.act(joined.deviceId, "hero-hold", "take", { heroId: "hero-a" });
    await game.session.whenIdle();
    const again = { ...game, pad: joined.deviceId };
    expect(beat(again)?.stage).toBe("table");
    expect(pressable(again).map((a) => a.promptId)).toEqual(["table-done--2"]);
  });
});
