import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { tryChapters } from "../../engine/loops/chapter/chapters.ts";
import type { PlayState } from "../../engine/loops/chapter/playState.ts";
import { ensureClock, heroSheet } from "../../engine/loops/day/clock.ts";
import type { EncounterLocal } from "../../engine/loops/encounter/loop.ts";
import { buildingModel } from "../../engine/loops/encounter/menu.ts";
import { ensurePicks } from "../../engine/loops/encounter/picks.ts";
import { beginQuest, chooseOption, openQuestAt } from "../../engine/loops/quest/quest.ts";
import { ensureQuests } from "../../engine/loops/quest/store.ts";
import { applyQuestTestSeed } from "../../engine/loops/quest/testSeed.ts";
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
import { deserializeShellState, type SerializedShellState } from "./serialize.ts";
import { type CoreSession, createCoreSession } from "./session.ts";
import { shellCheckpointFromState } from "./shellCheckpoint.ts";

const packsDir = join(import.meta.dirname, "../../../../../packs");
const catalog = loadStoryCatalog(packsDir);

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
const HERALD_PAY = "--qopt--ask-pay-first";
const QUEST_LEAVE = "--qleave";
const questIds = (game: Game) =>
  model(game).options.map((o) => o.promptId.match(/--(qopt--.+|qleave)$/)?.[0] ?? o.promptId);
const pressOption = async (game: Game, suffix: string) => {
  const found = model(game).options.find((o) => o.promptId.endsWith(suffix));
  if (!found) throw new Error(`No "${suffix}" in ${JSON.stringify(questIds(game))}`);
  await game.pad.act(found.promptId, found.actionId);
};

describe("quests and chapters live from the pack in a real game (F1/03)", () => {
  it("EV-03: when play begins chapter 1 is entered and its markers are open", async () => {
    const game = await realGame("f103-a", ["hero-a", "hero-b", "hero-c", "hero-d"]);
    const play = playOf(game);
    expect(openQuestAt(play, "N-egans-end")).toBe("herald");
    expect(openQuestAt(play, "N-muted-forest")).toBe("ambush");
    for (const space of [
      "E-greater-tombstones",
      "E-utars-barrows",
      "S-howling-desert",
      "W-the-grass-sea",
    ]) {
      expect(openQuestAt(play, space)).toBeNull();
    }
    expect(
      ensureQuests(play)
        .defs.map((def) => def.id)
        .sort(),
    ).toEqual(["ambush", "herald", "last-stand", "lock", "shrine"]);
    const chapters = tryChapters(play);
    expect(chapters?.current).toBe(1);
    expect(chapters?.entered).toEqual([1]);
    expect(chapters?.outputs.map((o) => o.kind)).toEqual(["cue", "narration", "card"]);
    expect(chapters?.outputs[2]).toMatchObject({
      kind: "card",
      chapter: 1,
      questsDone: 0,
      questsTotal: 2,
      kingdoms: ["N"],
    });
  });

  it("EV-04: a story with no pack data plays as main does today", async () => {
    const game = await realGame("f103-e", ["hero-a", "hero-b", "hero-c", "hero-d"], {
      stories: [TEST_STORY],
    });
    const play = playOf(game);
    expect(ensureQuests(play).defs).toEqual([]);
    expect(ensureQuests(play).bySpace).toEqual({});
    expect(tryChapters(play)).toBeNull();
    await toGroupTurn(game);
    expect(offer(game, "walk") ?? offer(game, "enter")).toBeDefined();
  });

  it("EV-05: the Quest row reaches handleQuestPick and plays the pack's Herald", async () => {
    const game = await realGame("f103-b~test-event:none~test-at:N-egans-end", ["hero-a"]);
    const play = playOf(game);
    await toGroupTurn(game);
    await pressOffer(game, "enter");
    const first = model(game).options[0];
    expect(first).toMatchObject({ label: "Quest", enabled: true });
    expect(first?.detail).toContain("1 move");
    await pressLabel(game, "Quest");
    expect(questIds(game)).toEqual([HERALD_TAKE, HERALD_PAY, QUEST_LEAVE]);
    await pressOption(game, HERALD_PAY);
    expect(ensureQuests(play).done).toEqual(["herald"]);
    expect(ensureQuests(play).log).toContain("gold:10");
    expect(ensureClock(play).questsWon).toBe(1);
    expect(ensurePicks(play).moves[encounterOf(game).groupId]).toBe(0);
    expect(model(game).options.map((o) => o.label)).not.toContain("Quest");
    expect(heroSheet(ensureClock(play), "hero-a")).toBeDefined();
  });

  it("EV-08: the test marker opens a pack quest on a live game", async () => {
    const a = await realGame("f103-f~test-quest:N-dayside=shrine", ["hero-a"]);
    expect(openQuestAt(playOf(a), "N-dayside")).toBe("shrine");
    expect(
      ensureQuests(playOf(a))
        .defs.map((def) => def.id)
        .sort(),
    ).toEqual(["ambush", "herald", "last-stand", "lock", "shrine"]);

    const b = await realGame(
      "f103-g~test-event:none~test-at:N-egans-end~test-quest:N-egans-end=herald",
      ["hero-a"],
    );
    await toGroupTurn(b);
    await pressOffer(b, "enter");
    await pressLabel(b, "Quest");
    expect(questIds(b)).toEqual([HERALD_TAKE, HERALD_PAY, QUEST_LEAVE]);

    // (c) The session catches a throw from the play start; the marker's own call shows it.
    expect(() => applyQuestTestSeed(playOf(a), "~test-quest:N-dayside=nope")).toThrow(/nope/);
    expect(openQuestAt(playOf(a), "N-dayside")).toBe("shrine");
  });
});

const ended = (game: Game) => game.session.state().screen === "session";

/** Presses what a table presses (rolls, leaves, turn ends) until `until` holds. */
const playOn = async (game: Game, until: () => boolean) => {
  let idle = 0;
  for (let guard = 0; guard < 600 && !until(); guard += 1) {
    const pick = ["continue", "record", "done", "leave", "end-turn", "walk"]
      .map((id) => offer(game, id))
      .find((found) => found !== undefined);
    if (!pick) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      await game.session.whenIdle();
      if (!game.session.state().offered.some((o) => o.open && o.actionId !== "quit-story")) {
        idle += 1;
      }
      if (idle > 5) break;
      continue;
    }
    idle = 0;
    await game.pad.act(pick.promptId, pick.actionId);
  }
};

/** The Herald, as EV-05 does it: Enter, Quest, "Ask for pay first". */
const doHerald = async (game: Game) => {
  await toGroupTurn(game);
  await pressOffer(game, "enter");
  await pressLabel(game, "Quest");
  await pressOption(game, HERALD_PAY);
};

/** The Ambush by engine calls: Enter on a wild quest marker is not built (DEC-641). */
const doAmbush = (game: Game) => {
  const play = playOf(game);
  const group = play.groups[0];
  if (!group) throw new Error("No group.");
  group.spaceId = "N-muted-forest";
  expect(beginQuest(play, group.id, "ambush").ok).toBe(true);
  expect(chooseOption(play, group.id, "ambush", "pay-the-toll").ok).toBe(true);
  expect(ensureQuests(play).done).toContain("ambush");
};

const records = (game: Game) => projectGameRecords(game.store);

const EV06_SEED = "f103-c~test-event:none~test-at:N-egans-end";

describe("a chapter's close in a real game (F1/03)", () => {
  it("EV-06: chapter 1's quests done ends the game won at that day's end, once", async () => {
    const game = await realGame(EV06_SEED, ["hero-a"]);
    await doHerald(game);
    // (a) One quest done: the day ends and day 2 starts; the game goes on.
    await playOn(game, () => playOf(game).dayNumber >= 2 || ended(game));
    expect(ended(game)).toBe(false);
    expect(playOf(game).dayNumber).toBe(2);
    expect(records(game)).toHaveLength(0);

    // (b) The Ambush done, then the day's end.
    doAmbush(game);
    await playOn(game, () => ended(game));
    expect(ended(game)).toBe(true);
    expect(records(game)).toHaveLength(1);
    expect(records(game)[0]).toMatchObject({ outcome: "won", how: "won", sceneId: "win" });
    expect(game.session.state().games.map((g) => g.outcome)).toEqual(["won"]);
    const play = playOf(game);
    expect(play.dayNumber).toBe(2);
    const chapters = tryChapters(play);
    expect(chapters?.current).toBe(1);
    expect(chapters?.nodes).not.toContain("seal-break");
    expect(chapters?.skullsToPlace).toBe(0);
    expect(chapters?.nodes).toContain("won");
  });

  it("EV-07: a lost day ends a real game; a story with no plan starts day 2", async () => {
    const seed =
      "f103-d~test-event:none~test-skulls:N-dayside=4,E-duwani=4,S-southern-wastes=4,W-anza=4";
    const heroes = ["hero-a", "hero-b", "hero-c", "hero-d"];
    const real = await realGame(seed, heroes);
    await playOn(real, () => playOf(real).dayNumber >= 2 || ended(real));
    expect(ended(real)).toBe(true);
    expect(records(real)).toHaveLength(1);
    expect(records(real)[0]).toMatchObject({ outcome: "lost", sceneId: "loss-buildings" });
    expect(playOf(real).dayNumber).toBe(1);

    const bare = await realGame(seed, heroes, { stories: [TEST_STORY] });
    await playOn(bare, () => playOf(bare).dayNumber >= 2 || ended(bare));
    expect(ended(bare)).toBe(false);
    expect(playOf(bare).dayNumber).toBe(2);
  });

  it("EV-09: a save from before this step plays on as saved", async () => {
    // The oldest fixture: no quest store, no chapter store; it loads without error.
    const fixture = JSON.parse(
      readFileSync(join(import.meta.dirname, "fixtures", "pre-c2-05-checkpoint.json"), "utf8"),
    ) as { state: SerializedShellState };
    const old = deserializeShellState(fixture.state);
    if (!old.play) throw new Error("The fixture has no play.");
    expect(tryChapters(old.play)).toBeNull();
    expect(ensureQuests(old.play).bySpace).toEqual({});

    // A real game's checkpoint with both stores removed: Continue plays on to the next day.
    const game = await realGame("f103-i~test-event:none", ["hero-a", "hero-b", "hero-c", "hero-d"]);
    await playOn(game, () => playOf(game).dayNumber >= 2);
    const row = JSON.parse(
      JSON.stringify(shellCheckpointFromState(game.session.state())),
    ) as Record<string, unknown>;
    await game.pad.act("menu-quit", "quit-story");
    const gameId = game.session.state().games[0]?.gameId ?? "";
    expect(row.chapters).toBeTruthy();
    expect(row.quests).toBeTruthy();
    delete row.chapters;
    delete row.quests;
    // Written as the game's newest checkpoint, as a save made before this step would be.
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
    const resumed = await game.restart();
    const play = playOf(resumed);
    expect(play.dayNumber).toBe(2);
    expect(tryChapters(play)).toBeNull();
    expect(Object.keys(ensureQuests(play).bySpace)).toEqual([]);
    await playOn(resumed, () => playOf(resumed).dayNumber >= 3 || ended(resumed));
    expect(ended(resumed)).toBe(false);
    expect(playOf(resumed).dayNumber).toBe(3);
    expect(tryChapters(play)).toBeNull();
  });
});

describe("Continue mid chapter 1 (F1/03 survival)", () => {
  it("EV-11: the chapter store survives, nothing runs twice, and a win still ends the game", async () => {
    const game = await realGame(EV06_SEED, ["hero-a"]);
    await doHerald(game);
    const before = structuredClone(tryChapters(playOf(game))?.outputs);
    expect(before).toHaveLength(3);
    const row = JSON.parse(
      JSON.stringify(shellCheckpointFromState(game.session.state())),
    ) as Record<string, unknown>;
    expect(row.chapters).toBeTruthy();
    await game.pad.act("menu-quit", "quit-story");
    // The game's newest checkpoint holds the stores, so Continue reads them from it, not by replay.
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

    const resumed = await game.restart();
    const play = playOf(resumed);
    const chapters = tryChapters(play);
    expect(chapters?.current).toBe(1);
    expect(chapters?.entered).toEqual([1]);
    expect(chapters?.outputs).toEqual(before);
    expect(ensureQuests(play).done).toEqual(["herald"]);
    expect(openQuestAt(play, "N-muted-forest")).toBe("ambush");
    expect(openQuestAt(play, "N-egans-end")).toBeNull();

    doAmbush(resumed);
    await playOn(resumed, () => ended(resumed));
    expect(ended(resumed)).toBe(true);
    expect(records(resumed)).toHaveLength(1);
    expect(records(resumed)[0]).toMatchObject({ outcome: "won", sceneId: "win" });
    expect(tryChapters(play)?.outputs).toEqual(before);
    expect(tryChapters(play)?.entered).toEqual([1]);
    expect(ensureQuests(play).done.filter((id) => id === "herald")).toHaveLength(1);
  });
});
