import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { neighborsOf } from "../../engine/loops/chapter/board.ts";
import { tryChapters } from "../../engine/loops/chapter/chapters.ts";
import type { PlayState } from "../../engine/loops/chapter/playState.ts";
import { ensureClock, heroSheet } from "../../engine/loops/day/clock.ts";
import type { EncounterLocal } from "../../engine/loops/encounter/loop.ts";
import { buildingModel } from "../../engine/loops/encounter/menu.ts";
import { ensurePicks, setMoves } from "../../engine/loops/encounter/picks.ts";
import { eventEligible } from "../../engine/loops/event/state.ts";
import { openQuestAt } from "../../engine/loops/quest/quest.ts";
import { BASE_QUEST_TUNING, ensureQuests } from "../../engine/loops/quest/store.ts";
import { TEST_STORY } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { OPENING_MOMENTS, openingPromptId } from "../../protocols/opening.ts";
import { openDatabase } from "../db/client.ts";
import { createSessionStore } from "../db/store.ts";
import { projectGameRecords } from "../events/gameStats.ts";
import { createEventStore } from "../events/store.ts";
import { createHostLogger } from "../log/hostLog.ts";
import { stepClock } from "../timing/clock.ts";
import { createMockTower } from "../tower/mock.ts";
import { bloodtowerTowerFromMock } from "../tower/testAdapter.ts";
import { loadStoryCatalog } from "./loadStories.ts";
import {
  deserializeShellState,
  type SerializedShellState,
  serializeShellState,
} from "./serialize.ts";
import { type CoreSession, createCoreSession } from "./session.ts";
import { shellCheckpointFromState } from "./shellCheckpoint.ts";

const repoPacksDir = join(import.meta.dirname, "../../../../../packs");

/**
 * These tests pin the C3 end (chapter 1 won ends the game). C4 turned that switch off in the
 * base tuning (C4-01), so they load a copy of the packs with it back on.
 */
const packsDir = mkdtempSync(join(tmpdir(), "wild-quest-packs-"));
for (const id of ["base", "test", "dracula"]) {
  cpSync(join(repoPacksDir, id), join(packsDir, id), { recursive: true });
}
const tuningFile = join(packsDir, "base", "tuning.yaml");
const c3Tuning = readFileSync(tuningFile, "utf8").replace(
  "c3_end_after_chapter_1: false",
  "c3_end_after_chapter_1: true",
);
if (!c3Tuning.includes("c3_end_after_chapter_1: true")) throw new Error("tuning has no C3 switch");
writeFileSync(tuningFile, c3Tuning);
const catalog = loadStoryCatalog(packsDir);
afterAll(() => rmSync(packsDir, { recursive: true, force: true }));

const dirs: string[] = [];
const closers: Array<() => void> = [];
afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

type Pad = {
  act: (p: string, a: string, args?: Record<string, unknown>) => Promise<void>;
};

type Game = {
  session: CoreSession;
  pad: Pad;
  store: ReturnType<typeof createEventStore>;
  /** A host restart: a new session on the same database, with Continue pressed. */
  restart: () => Promise<Game>;
};

/** A session built as the host builds it (the catalog's stories and default play), to day 1. */
const realGame = async (
  seed: string,
  heroes: string[],
  options: { stories?: typeof catalog.stories; storyId?: string } = {},
): Promise<Game> => {
  const dir = mkdtempSync(join(tmpdir(), "bloodtower-live-"));
  dirs.push(dir);
  const opened = openDatabase(join(dir, "session.sqlite"));
  closers.push(() => opened.close());
  const store = createEventStore(opened.db);
  createSessionStore(opened.db).saveRoster({
    sessionId: "session-1",
    packId: options.storyId ?? "test",
    packVersion: "0.1.0",
    startedWall: "2026-10-30T00:00:00.000Z",
    joinCode: "000000",
    devices: [],
    holdings: [],
  });
  const log = createHostLogger({ dataDir: dir, mirror: false });
  const clock = stepClock();
  let boots = 0;
  const boot = async (): Promise<{ session: CoreSession; pad: Pad }> => {
    boots += 1;
    const session = createCoreSession({
      sessionId: `session-${boots}`,
      seed,
      stories: options.stories ?? catalog.stories,
      playContent: catalog.defaultPlay ?? PROVING_GROUNDS_PLAY,
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
    const joined = session.join({ joinCode: "000000", formFactor: "ipad" });
    await session.whenIdle();
    if (!joined.ok) throw new Error("join refused");
    const pad: Pad = {
      act: async (promptId, actionId, args = {}) => {
        session.act(joined.deviceId, promptId, actionId, args);
        await session.whenIdle();
      },
    };
    return { session, pad };
  };
  const { session, pad } = await boot();
  const restart = async (): Promise<Game> => {
    const autosave = store.getAutosave();
    if (!autosave) throw new Error("No autosave to continue.");
    const again = await boot();
    again.session.rememberAutosave({
      gameId: autosave.gameId,
      packId: autosave.packId,
      day: 1,
    });
    if (!(await again.session.resumeSession())) throw new Error("The save was not resumed.");
    const next: Game = { ...again, store, restart };
    await again.pad.act("continue-saved-game", "continue");
    // Continue seats the saved party on the iPads joined now (CU/16): pick the unheld heroes.
    for (const group of again.session.state().play?.groups ?? []) {
      for (const heroId of group.heroIds) {
        if (again.session.state().holdings[heroId] == null) {
          await again.pad.act("hero-hold", "take", { heroId });
        }
      }
    }
    for (let guard = 0; guard < 20 && again.session.state().screen === "piece-check"; guard += 1) {
      const open = again.session.state().offered.filter((o) => o.open);
      const next =
        open.find((o) => o.actionId === "turn-drums") ?? open.find((o) => o.actionId === "confirm");
      if (!next) break;
      await again.pad.act(next.promptId, next.actionId);
    }
    return next;
  };
  const storyId = options.storyId ?? "test";
  await pad.act("base-board-done", "board-set-up");
  await pad.act("play-without-tower", "play-without-tower");
  await pad.act(`continue-pick-story-${storyId}`, "continue");
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
  await pad.act("continue-begin", "continue");
  for (const moment of OPENING_MOMENTS) await pad.act(openingPromptId(moment), "continue");
  return { session, pad, store, restart };
};

const playOf = (game: Game): PlayState => {
  const play = game.session.state().play;
  if (!play) throw new Error("No play state.");
  return play;
};

const offer = (game: Game, actionId: string) =>
  game.session.state().offered.find((o) => o.open && o.actionId === actionId);

const pressOffer = async (game: Game, actionId: string) => {
  // C3/14: a finished quest shows its rewards and end-hook steps first; each closes on a wait timer
  // (0 ms in this test), so give those timers their turn before reading the offers.
  for (let i = 0; i < 20 && !offer(game, actionId); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2));
    await game.session.whenIdle();
  }
  const found = offer(game, actionId);
  if (!found) throw new Error(`No open "${actionId}" offer.`);
  await game.pad.act(found.promptId, found.actionId);
};

/** Presses Continue (the day's roll) until the first group turn offers a walk or an Enter. */
const toGroupTurn = async (game: Game) => {
  for (let guard = 0; guard < 20; guard += 1) {
    if (offer(game, "walk") ?? offer(game, "enter")) return;
    await pressOffer(game, "continue");
  }
  throw new Error("No group turn.");
};

const encounterOf = (game: Game): EncounterLocal => {
  const frame = game.session.state().loops.stack.find((row) => row.loopId === "encounter");
  if (!frame) throw new Error("No encounter frame.");
  return frame.local as EncounterLocal;
};
const model = (game: Game) => buildingModel(playOf(game), encounterOf(game), (id: string) => id);
const pressLabel = async (game: Game, label: string) => {
  const found = model(game).options.find((o) => o.label === label);
  if (!found)
    throw new Error(`No "${label}" in ${JSON.stringify(model(game).options.map((o) => o.label))}`);
  await game.pad.act(found.promptId, found.actionId);
};

// The Herald's options, found by option id (DEC-949), so pack copy edits don't break these tests.
const HERALD_TAKE = "--qopt--take-the-job";
const QUEST_LEAVE = "--qleave";
const questIds = (game: Game) =>
  model(game).options.map((o) => o.promptId.match(/--(qopt--.+|qleave)$/)?.[0] ?? o.promptId);
const pressOption = async (game: Game, suffix: string) => {
  const found = model(game).options.find((o) => o.promptId.endsWith(suffix));
  if (!found) throw new Error(`No "${suffix}" in ${JSON.stringify(questIds(game))}`);
  await game.pad.act(found.promptId, found.actionId);
};

const FOREST = "N-muted-forest";
const VILLAGE = "N-egans-end";
const TOLL = "--qopt--pay-the-toll";
const HERALD_PAY = "--qopt--ask-pay-first";
const SEED = "f104-a~test-event:none";

const groupOf = (game: Game) => {
  const group = playOf(game).groups[0];
  if (!group) throw new Error("No group.");
  return group;
};

/** The next space on a shortest path from the group to `target`. */
const nextStep = (game: Game, target: string): string => {
  const board = playOf(game).content.board;
  const from = groupOf(game).spaceId;
  const prev = new Map<string, string>([[from, ""]]);
  const queue = [from];
  while (queue.length > 0) {
    const at = queue.shift() as string;
    if (at === target) break;
    for (const n of neighborsOf(board, at)) {
      if (!prev.has(n.id)) {
        prev.set(n.id, at);
        queue.push(n.id);
      }
    }
  }
  let step = target;
  while (prev.get(step) !== from) {
    const back = prev.get(step);
    if (back === undefined || back === "") throw new Error(`No path to ${target}.`);
    step = back;
  }
  return step;
};

/** Plays a one hero game by presses only until the group stands where `target` offers Enter. */
const walkTo = async (game: Game, target: string) => {
  let idle = 0;
  for (let guard = 0; guard < 400; guard += 1) {
    if (groupOf(game).spaceId === target && offer(game, "enter")) return;
    const walkId = groupOf(game).spaceId === target ? null : nextStep(game, target);
    const walk = walkId
      ? game.session
          .state()
          .offered.find(
            (o) => o.open && o.actionId === "walk" && o.promptId.endsWith(`--${walkId}`),
          )
      : undefined;
    if (walk) {
      await game.pad.act(walk.promptId, walk.actionId);
      continue;
    }
    const pick = ["continue", "record", "done", "leave", "end-turn"]
      .map((id) => offer(game, id))
      .find((found) => found !== undefined);
    if (!pick) {
      idle += 1;
      if (idle > 20) throw new Error(`Stuck walking to ${target} at ${groupOf(game).spaceId}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      await game.session.whenIdle();
      continue;
    }
    idle = 0;
    await game.pad.act(pick.promptId, pick.actionId);
  }
  throw new Error(`Never reached ${target}.`);
};

/** The hero's gold after the Ambush: the toll first (all of it when short), then the quest gold. */
const goldAfterAmbush = (before: number): number =>
  (before >= BASE_QUEST_TUNING.tollGold ? before - BASE_QUEST_TUNING.tollGold : 0) +
  BASE_QUEST_TUNING.questGold;
const goldOf = (game: Game): number => heroSheet(ensureClock(playOf(game)), "hero-a").gold ?? 0;

const ended = (game: Game) => game.session.state().screen === "session";
const records = (game: Game) => projectGameRecords(game.store);

const playOn = async (game: Game, until: () => boolean) => {
  let idle = 0;
  for (let guard = 0; guard < 600 && !until(); guard += 1) {
    const pick = ["continue", "record", "done", "leave", "end-turn"]
      .map((id) => offer(game, id))
      .find((found) => found !== undefined);
    if (!pick) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      await game.session.whenIdle();
      idle += 1;
      if (idle > 5) break;
      continue;
    }
    idle = 0;
    await game.pad.act(pick.promptId, pick.actionId);
  }
};

const enterForestMenu = async (game: Game) => {
  await walkTo(game, FOREST);
  await pressOffer(game, "enter");
};

/** A checkpoint of the live shell, written as the game's newest, then a host restart. */
const restartFromCheckpoint = async (game: Game): Promise<Game> => {
  const row = JSON.parse(JSON.stringify(shellCheckpointFromState(game.session.state()))) as Record<
    string,
    unknown
  >;
  const gameId = game.session.state().games[0]?.gameId ?? "";
  game.store.writeCheckpoint({
    gameId,
    day: 9,
    afterEventSeq: game.store.nextSeq(gameId) - 1,
    stateJson: JSON.stringify(row),
    atMonoMs: 0,
    atWall: "2026-10-30T00:00:00.000Z",
    seed: String(row.seed),
    packVersion: "0.1.0",
    engineVersion: String(row.version),
  });
  return game.restart();
};

describe("Enter on a wild quest marker in a real game (F1/04)", () => {
  it("EV-06: a wild Enter is not a building; the space stays wild at night", async () => {
    const game = await realGame(SEED, ["hero-a"]);
    await enterForestMenu(game);
    expect(game.session.state().tally.buildings).toBe(0);
    await pressOffer(game, "leave");
    await walkTo(game, VILLAGE);
    await pressOffer(game, "enter");
    await pressOffer(game, "leave");
    expect(game.session.state().tally.buildings).toBe(1);

    // (b) Ambush done at the forest: the group ends its turn there; the night draw still counts it.
    const b = await realGame(SEED, ["hero-a"]);
    await enterForestMenu(b);
    await pressLabel(b, "Quest");
    await pressOption(b, TOLL);
    await pressOffer(b, "leave");
    expect(openQuestAt(playOf(b), FOREST)).toBeNull();
    expect(groupOf(b).spaceId).toBe(FOREST);
    expect(eventEligible(playOf(b), groupOf(b).id)).toBe(true);
  });

  it("EV-07 and EV-10b: leave partway keeps the progress; Enter stays across Continue", async () => {
    const game = await realGame(SEED, ["hero-a"]);
    await enterForestMenu(game);
    await pressLabel(game, "Quest");
    await pressOption(game, QUEST_LEAVE);
    expect(ensureQuests(playOf(game)).done).not.toContain("ambush");
    expect(openQuestAt(playOf(game), FOREST)).toBe("ambush");
    await pressOffer(game, "leave");
    // The turn ended with the leave (F1/02); the next day's first group turn offers Enter again.
    await playOn(game, () => playOf(game).dayNumber >= 2);
    await walkTo(game, FOREST);
    expect(offer(game, "enter")).toBeDefined();
    const resumed = await restartFromCheckpoint(game);
    expect(openQuestAt(playOf(resumed), FOREST)).toBe("ambush");
    await walkTo(resumed, FOREST);
    expect(offer(resumed, "enter")).toBeDefined();
    await pressOffer(resumed, "enter");
    await pressLabel(resumed, "Quest");
    expect(model(resumed).options.some((o) => o.promptId.endsWith(TOLL))).toBe(true);
  });

  it("EV-10a: Continue inside a wild marker's menu keeps the menu and the moves", async () => {
    const game = await realGame(SEED, ["hero-a"]);
    await enterForestMenu(game);
    // One move left, as the eval sets it up: Quest is still enabled.
    setMoves(playOf(game), groupOf(game).id, 1);
    for (const frame of game.session.state().loops.stack) {
      if (frame.loopId === "encounter" || frame.loopId === "group-turn") {
        (frame.local as { movesLeft: number }).movesLeft = 1;
      }
    }
    expect(ensurePicks(playOf(game)).moves[groupOf(game).id]).toBe(1);
    // Serialize and rehydrate the shell, as a Continue reads a save.
    const back = deserializeShellState(
      JSON.parse(JSON.stringify(serializeShellState(game.session.state()))),
    );
    const play = back.play;
    if (!play) throw new Error("No play after rehydrate.");
    const frame = back.loops.stack.find((row) => row.loopId === "encounter");
    expect(play.groups[0]?.insideBuilding).toBe(true);
    const rebuilt = buildingModel(play, frame?.local as EncounterLocal, (id: string) => id);
    expect(rebuilt.title).toBe("Muted Forest");
    expect(rebuilt.options.map((o) => o.label)).toEqual(["Quest", "Leave"]);
    expect(rebuilt.options[0]).toMatchObject({ label: "Quest", enabled: true });
    expect(rebuilt.options[0]?.detail).toContain("1 move");
    expect(ensurePicks(play).moves[play.groups[0]?.id ?? ""]).toBe(1);
  });

  it("EV-10c: a done Ambush stays done after Continue; its gold is paid once", async () => {
    const game = await realGame(SEED, ["hero-a"]);
    await enterForestMenu(game);
    const before = goldOf(game);
    await pressLabel(game, "Quest");
    // The pack's own words, exactly: the toll, then Leave. Fight is hidden (no battles yet).
    expect(model(game).options.map((o) => o.label)).toEqual(["Pay the toll (10 gold)", "Leave"]);
    await pressOption(game, TOLL);
    await pressOffer(game, "leave");
    const after = goldOf(game);
    expect(after).toBe(goldAfterAmbush(before));
    const resumed = await restartFromCheckpoint(game);
    expect(ensureQuests(playOf(resumed)).done.filter((id) => id === "ambush")).toHaveLength(1);
    expect(openQuestAt(playOf(resumed), FOREST)).toBeNull();
    expect(offer(resumed, "enter")).toBeUndefined();
    expect(goldOf(resumed)).toBe(after);
  });

  it("EV-08: chapter 1 is won in a real game through Enter on the wild marker", async () => {
    const game = await realGame(SEED, ["hero-a"]);
    await enterForestMenu(game);
    await pressLabel(game, "Quest");
    await pressOption(game, TOLL);
    await pressOffer(game, "leave");
    await walkTo(game, VILLAGE);
    await pressOffer(game, "enter");
    await pressLabel(game, "Quest");
    await pressOption(game, HERALD_PAY);
    expect(ensureQuests(playOf(game)).done.sort()).toEqual(["ambush", "herald"]);
    await playOn(game, () => ended(game));
    expect(ended(game)).toBe(true);
    expect(records(game)).toHaveLength(1);
    expect(records(game)[0]).toMatchObject({ outcome: "won", sceneId: "win" });
    expect(tryChapters(playOf(game))?.current).toBe(1);
  });
});
