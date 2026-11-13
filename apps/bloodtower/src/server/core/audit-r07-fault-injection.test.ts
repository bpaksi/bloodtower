/**
 * Audit R07: fault injection for LC-04 (exact-node recovery, DEC-675; record once, DEC-218).
 *
 * Each case stops a host at one point, boots a second host on the same database the way
 * `server/hub/host.ts` does after a crash, presses Continue, and checks that the restored
 * state and the play stream match a run with no stop, with nothing paid, given or recorded
 * twice. A case marked `it.fails` is an AUDIT-BUG the code does not meet today; it is kept
 * as a test and not fixed here.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { PlayState } from "../../engine/loops/chapter/playState.ts";
import { ensureClock } from "../../engine/loops/day/clock.ts";
import { applyPick, ensurePicks, setMoves, setPurse } from "../../engine/loops/encounter/picks.ts";
import { HERALD } from "../../engine/loops/quest/fixtures.ts";
import { beginQuest, chooseOption } from "../../engine/loops/quest/quest.ts";
import { configureQuests, ensureQuests } from "../../engine/loops/quest/store.ts";
import { TEST_STORY } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { createEventStore, type EventStore } from "../events/store.ts";
import { createHostLogger } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower, type MockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { type CoreSession, createCoreSession } from "./session.ts";

type Track = "connect" | "without";

const HEROES = ["hero-a", "hero-b", "hero-c", "hero-d"];

const dirs: string[] = [];
const closers: Array<() => void> = [];

afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Faults the store throws on, each the next N times its write is reached. */
type Faults = { checkpoint: number; gameRecord: number };

/** One table: a temp SQLite file, a store that can be told to fail, and a host boot. */
const harness = () => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-r07-"));
  dirs.push(dir);
  const opened = openDatabase(join(dir, "session.sqlite"));
  closers.push(() => opened.close());
  const base = createEventStore(opened.db);
  const faults: Faults = { checkpoint: 0, gameRecord: 0 };
  const store: EventStore = {
    ...base,
    writeCheckpoint: (input) => {
      if (faults.checkpoint > 0) {
        faults.checkpoint -= 1;
        throw new Error("Injected fault: the checkpoint write was lost.");
      }
      return base.writeCheckpoint(input);
    },
    append: (input) => {
      if (input.kind === "game-record" && faults.gameRecord > 0) {
        faults.gameRecord -= 1;
        throw new Error("Injected fault: the game record write was lost.");
      }
      return base.append(input);
    },
  };
  const log = createHostLogger({ dataDir: dir, mirror: false });
  const clock = stepClock();
  createSessionStore(opened.db).saveRoster({
    sessionId: "session-1",
    packId: "test",
    packVersion: "0.1.0",
    startedWall: "2026-10-30T00:00:00.000Z",
    joinCode: "000000",
    devices: [],
    holdings: [],
  });
  let count = 0;
  /** One host process: a fresh session and mock tower on the same database. */
  const boot = async (): Promise<{ session: CoreSession; tower: MockTower }> => {
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
  return { boot, store, faults };
};

type Harness = ReturnType<typeof harness>;

type Table = {
  session: CoreSession;
  act: (promptId: string, actionId: string, args?: Record<string, unknown>) => Promise<void>;
  open: () => Array<{ promptId: string; actionId: string }>;
};

const tableFor = async (session: CoreSession): Promise<Table> => {
  const joined = session.join({ joinCode: "000000", formFactor: "ipad" });
  await session.whenIdle();
  if (!joined.ok) throw new Error("join refused");
  const act = async (promptId: string, actionId: string, args: Record<string, unknown> = {}) => {
    session.act(joined.deviceId, promptId, actionId, args);
    await session.whenIdle();
  };
  const open = () =>
    session
      .projectDevice(joined.deviceId)
      .actions.filter((action) => action.open && !action.promptId.startsWith("menu-"));
  return { session, act, open };
};

/** From the first boot to the opening's end, on the chosen tower track. */
const reachPlay = async (h: Harness, track: Track): Promise<Table> => {
  const { session } = await h.boot();
  const table = await tableFor(session);
  const { act } = table;
  await act("base-board-done", "board-set-up");
  if (track === "connect") {
    await act("tower-connect", "tower-connect");
    await act("tower-calibrate", "tower-calibrate");
    session.syncTowerSnapshot();
    await session.whenIdle();
  } else {
    await act("play-without-tower", "play-without-tower");
  }
  await act("continue-pick-story-test", "continue");
  await act("continue-game-settings", "continue");
  for (const heroId of HEROES) await act("hero-hold", "take", { heroId });
  await act("continue-claim-heroes", "continue");
  for (const step of session.state().setupSteps) await act(`continue-setup-${step.id}`, "continue");
  await act("continue-begin", "continue");
  for (const moment of OPENING_MOMENTS) await act(openingPromptId(moment), "continue");
  return table;
};

/**
 * The crash: the first host is dropped where it stands. A second host boots on the same
 * database the way `server/hub/host.ts` does (remember the autosave, resume the session),
 * the table takes the heroes again and presses Continue.
 */
const restart = async (h: Harness, track: Track): Promise<Table> => {
  const { session, tower } = await h.boot();
  if (track === "connect") {
    tower.connect();
    tower.calibrate();
    session.syncTowerSnapshot();
    await session.whenIdle();
  }
  const row = h.store.getAutosave();
  if (!row) throw new Error("No autosave to continue.");
  session.rememberAutosave({
    gameId: row.gameId,
    packId: row.packId,
    day: h.store.lastCheckpoint(row.gameId)?.day ?? 1,
  });
  expect(await session.resumeSession()).toBe(true);
  const table = await tableFor(session);
  for (const heroId of HEROES) await table.act("hero-hold", "take", { heroId });
  await table.act("continue-saved-game", "continue");
  expect(session.state().screen).toBe("play");
  return table;
};

const press = async (table: Table, prefix: string, actionId: string) => {
  const offer = table
    .open()
    .find((action) => action.promptId.startsWith(prefix) && action.actionId === actionId);
  if (!offer) {
    const shown = table.open().map((action) => `${action.promptId}:${action.actionId}`);
    throw new Error(`No ${prefix}*:${actionId} offered. Open: ${shown.join(", ")}`);
  }
  await table.act(offer.promptId, offer.actionId);
  return offer.promptId;
};

/** The first sensible press: Continue, Done, Leave, End turn. Never a walk or a record. */
const nextPress = (table: Table) => {
  const open = table.open();
  return ["continue", "done", "leave", "end-turn"]
    .map((actionId) => open.find((action) => action.actionId === actionId))
    .find((action) => action !== undefined);
};

/** Plays on until `drops` simulated skull drops were pressed past. Returns where each landed. */
const playDrops = async (table: Table, drops: number): Promise<string[]> => {
  const landed: string[] = [];
  for (let guard = 0; guard < 400 && landed.length < drops; guard += 1) {
    const pick = nextPress(table);
    if (!pick) throw new Error("Nothing to press.");
    if (pick.promptId.startsWith("skull-sim-day-")) {
      const spot = table.session.state().play?.lastSkull?.spaceId;
      if (!spot) throw new Error("A simulated drop landed nowhere.");
      landed.push(spot);
    }
    await table.act(pick.promptId, pick.actionId);
  }
  return landed;
};

/** On the tower track: presses on until the table is asked where the skull landed. */
const toSkullRecord = async (table: Table): Promise<string[]> => {
  for (let guard = 0; guard < 400; guard += 1) {
    const records = table
      .open()
      .filter((action) => action.actionId === "record")
      .map((action) => action.promptId);
    if (records.length > 0) return records;
    const pick = nextPress(table);
    if (!pick) throw new Error("Nothing to press before the skull record.");
    await table.act(pick.promptId, pick.actionId);
  }
  throw new Error("The skull record was never asked for.");
};

const livePlay = (table: Table): PlayState => {
  const play = table.session.state().play;
  if (!play) throw new Error("No play state.");
  return play;
};

/** What a restore must give back exactly: the seed, the play stream and the board. */
const snapshot = (table: Table) => {
  const state = table.session.state();
  const play = livePlay(table);
  const clock = ensureClock(play);
  return {
    seed: state.seed,
    day: play.dayNumber,
    rngSeq: play.rngSeq,
    dayRolls: { ...play.dayRolls },
    groups: play.groups.map((group) => `${group.id}:${group.spaceId}`),
    lastSkull: play.lastSkull,
    supply: clock.supply,
    held: clock.held,
    skulls: { ...clock.skulls },
  };
};

/** Every skull the clock knows of: supply, held in the tower, and on buildings. */
const skullTotal = (snap: ReturnType<typeof snapshot>): number =>
  snap.supply + snap.held + Object.values(snap.skulls).reduce((sum, n) => sum + n, 0);

const gameRecords = (h: Harness, gameId: string) =>
  h.store.listEvents(gameId).filter((row) => row.kind === "game-record");

const gameIdOf = (table: Table): string => {
  const id = table.session.currentGameId();
  if (!id) throw new Error("No game id.");
  return id;
};

/** A group's first walk, so a press writes a checkpoint (stepShell writes one per walk). */
const walk = (table: Table) => press(table, "walk--", "walk");

describe("audit R07 (LC-04): the move roll", () => {
  it("R07-01 a stop at the roll prompt: Continue keeps the same dice and the same stream", async () => {
    const control = harness();
    const ctl = await reachPlay(control, "without");
    await press(ctl, "day-1-roll-done", "continue");
    const expected = snapshot(ctl);
    const expectedDrops = await playDrops(ctl, 2);

    const h = harness();
    const first = await reachPlay(h, "without");
    const before = snapshot(first);
    // The dice are drawn when the roll prompt opens; the press only takes the roll.
    expect(before).toEqual(expected);
    const table = await restart(h, "without");
    expect(snapshot(table)).toEqual(before);
    expect(await playDrops(table, 2)).toEqual(expectedDrops);
  });

  // AUDIT-BUG LC-04: Continue at "Take the move roll" skips that prompt; refreshOffersAfterRestore leaves the day frame's awaitingPress set, so the day body runs on as if it was pressed.
  it.fails("R07-01b a stop at the roll prompt: Continue offers the roll prompt again", async () => {
    const h = harness();
    const first = await reachPlay(h, "without");
    expect(first.open().map((action) => action.promptId)).toEqual(["day-1-roll-done"]);
    const table = await restart(h, "without");
    expect(table.open().map((action) => action.promptId)).toEqual(["day-1-roll-done"]);
  });

  it("R07-02 a stop after the roll: Continue does not roll again or move the stream", async () => {
    const control = harness();
    const ctl = await reachPlay(control, "without");
    await press(ctl, "day-1-roll-done", "continue");
    const expectedDrops = await playDrops(ctl, 2);

    const h = harness();
    const first = await reachPlay(h, "without");
    await press(first, "day-1-roll-done", "continue");
    const before = snapshot(first);
    const table = await restart(h, "without");
    expect(snapshot(table)).toEqual(before);
    expect(table.open().some((action) => action.promptId.endsWith("-roll-done"))).toBe(false);
    expect(await playDrops(table, 2)).toEqual(expectedDrops);
  });

  it("R07-03 a lost checkpoint write after a logged press: replay gives back the same state", async () => {
    const control = harness();
    const ctl = await reachPlay(control, "without");
    await press(ctl, "day-1-roll-done", "continue");
    const walked = await walk(ctl);
    const expected = snapshot(ctl);
    const expectedDrops = await playDrops(ctl, 2);

    const h = harness();
    const first = await reachPlay(h, "without");
    await press(first, "day-1-roll-done", "continue");
    const gameId = gameIdOf(first);
    const checkpointsBefore = h.store.lastCheckpoint(gameId)?.afterEventSeq;
    h.faults.checkpoint = 1;
    await first.act(walked, "walk");
    expect(h.faults.checkpoint).toBe(0);
    // The press reached the log; its checkpoint did not.
    expect(h.store.lastCheckpoint(gameId)?.afterEventSeq).toBe(checkpointsBefore);
    expect(snapshot(first)).toEqual(expected);

    const table = await restart(h, "without");
    expect(snapshot(table)).toEqual(expected);
    expect(await playDrops(table, 2)).toEqual(expectedDrops);
  });
});

describe("audit R07 (LC-04): the physical confirmation (skull record, tower track)", () => {
  it("R07-04 a stop before the record: nothing was placed and the stream is unchanged", async () => {
    const h = harness();
    const first = await reachPlay(h, "connect");
    await toSkullRecord(first);
    const before = snapshot(first);
    const table = await restart(h, "connect");
    expect(snapshot(table)).toEqual(before);
  });

  // AUDIT-BUG LC-04: Continue at the skull record leaves the table with no prompt at all (day frame still awaitingPress in skull-place), so the drop can never be recorded.
  it.fails("R07-04b a stop before the record: the record is asked again and lands as it would have", async () => {
    const control = harness();
    const ctl = await reachPlay(control, "connect");
    const ctlTargets = await toSkullRecord(ctl);
    const target = ctlTargets[0] ?? "";
    await ctl.act(target, "record");
    const expected = snapshot(ctl);

    const h = harness();
    const first = await reachPlay(h, "connect");
    const targets = await toSkullRecord(first);
    expect(targets).toEqual(ctlTargets);
    const table = await restart(h, "connect");
    const again = table
      .open()
      .filter((action) => action.actionId === "record")
      .map((action) => action.promptId);
    expect(again).toEqual(targets);
    await table.act(target, "record");
    expect(snapshot(table)).toEqual(expected);
  });

  it("R07-05 a stop after the record: the skull is placed once and every skull is kept", async () => {
    const h = harness();
    const first = await reachPlay(h, "connect");
    const startTotal = skullTotal(snapshot(first));
    const targets = await toSkullRecord(first);
    const target = targets[0] ?? "";
    const spaceId = target.split("--").at(-1) ?? "";
    const skullsBefore = snapshot(first).skulls[spaceId] ?? 0;
    await first.act(target, "record");
    const after = snapshot(first);
    expect(after.skulls[spaceId]).toBe(skullsBefore + 1);
    expect(skullTotal(after)).toBe(startTotal);

    const table = await restart(h, "connect");
    const restored = snapshot(table);
    expect(restored).toEqual(after);
    expect(restored.skulls[spaceId]).toBe(skullsBefore + 1);
    expect(skullTotal(restored)).toBe(startTotal);
    // The pressed record is not offered again.
    expect(table.open().some((action) => action.promptId === target)).toBe(false);
  });
});

describe("audit R07 (LC-04, DEC-218): the terminal record", () => {
  // AUDIT-BUG LC-04: a crash between the logged Quit and its game-record write loses the record for good; replay skips game-record effects.
  it.fails("R07-06 a lost record write on Quit: after a restart the game holds one quit record", async () => {
    const h = harness();
    const first = await reachPlay(h, "without");
    await press(first, "day-1-roll-done", "continue");
    const gameId = gameIdOf(first);
    h.faults.gameRecord = 1;
    await first.act("menu-quit", "quit-story");
    expect(h.faults.gameRecord).toBe(0);
    expect(h.store.getAutosave()?.gameId).toBe(gameId);

    await restart(h, "without");
    expect(gameRecords(h, gameId)).toHaveLength(1);
    expect(gameRecords(h, gameId)[0]?.payload).toMatchObject({ outcome: "quit" });
  });

  it("R07-07 a stop after the Quit record: Continue and a second Quit write no second record", async () => {
    const h = harness();
    const first = await reachPlay(h, "without");
    await press(first, "day-1-roll-done", "continue");
    const gameId = gameIdOf(first);
    await first.act("menu-quit", "quit-story");
    expect(gameRecords(h, gameId)).toHaveLength(1);
    const before = snapshot(first);

    const table = await restart(h, "without");
    expect(snapshot(table)).toEqual(before);
    expect(gameRecords(h, gameId)).toHaveLength(1);
    await table.act("menu-quit", "quit-story");
    expect(gameRecords(h, gameId)).toHaveLength(1);
    expect(h.store.getAutosave()?.gameId).toBe(gameId);
  });
});

describe("audit R07 (LC-04): payment and reward (engine calls; no press reaches them yet)", () => {
  // AUDIT-BUG LC-04: the purse, moves and pick log live in a WeakMap that the checkpoint never writes, so Continue loses a payment.
  it.fails("R07-08 a stop after a payment: Continue keeps the debit and pays nothing twice", async () => {
    const h = harness();
    const first = await reachPlay(h, "without");
    await press(first, "day-1-roll-done", "continue");
    const play = livePlay(first);
    const group = play.groups[0];
    if (!group) throw new Error("No group.");
    setPurse(play, group.id, 10);
    setMoves(play, group.id, 3);
    const paid = applyPick(play, first.session.state().seed, group.id, "rally");
    expect(paid.ok).toBe(true);
    const purse = ensurePicks(play).purse[group.id];
    expect(purse).toBe(5);
    // A walk writes a checkpoint holding the state after the payment.
    await walk(first);
    const picksBefore = JSON.parse(JSON.stringify(ensurePicks(play)));

    const table = await restart(h, "without");
    const restored = ensurePicks(livePlay(table));
    expect(restored.purse[group.id]).toBe(purse);
    expect(restored.moves[group.id]).toBe(picksBefore.moves[group.id]);
    expect(restored.log).toEqual(picksBefore.log);
  });

  // AUDIT-BUG LC-04: quest progress and the purse are not in the checkpoint, so Continue loses a quest reward and lets it be won again.
  it.fails("R07-09 a stop after a reward: Continue keeps the gold and the quest cannot pay twice", async () => {
    const h = harness();
    const first = await reachPlay(h, "without");
    await press(first, "day-1-roll-done", "continue");
    const play = livePlay(first);
    const group = play.groups[0];
    if (!group) throw new Error("No group.");
    setPurse(play, group.id, 0);
    configureQuests(play, { defs: [{ id: "herald", chapter: 1, scene: HERALD }] });
    expect(beginQuest(play, group.id, "herald").ok).toBe(true);
    expect(chooseOption(play, group.id, "herald", "pay").ok).toBe(true);
    const purse = ensurePicks(play).purse[group.id] ?? 0;
    expect(purse).toBeGreaterThan(0);
    expect(ensureQuests(play).done).toContain("herald");
    await walk(first);

    const table = await restart(h, "without");
    const restoredPlay = livePlay(table);
    expect(ensurePicks(restoredPlay).purse[group.id]).toBe(purse);
    expect(ensureQuests(restoredPlay).done).toContain("herald");
    expect(beginQuest(restoredPlay, group.id, "herald")).toEqual({
      ok: false,
      reason: "already-done",
    });
    expect(ensurePicks(restoredPlay).purse[group.id]).toBe(purse);
  });
});
