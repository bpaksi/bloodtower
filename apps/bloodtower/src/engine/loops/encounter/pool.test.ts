import { describe, expect, it } from "vitest";
import { deserializeShellState, serializeShellState } from "../../../server/core/serialize.ts";
import { initPlayState, type PlayState } from "../chapter/playState.ts";
import { ensureClock, heroSheet, setHeroSheet } from "../day/clock.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { initialShellState } from "../session/state.ts";
import { buildingModel } from "./menu.ts";
import {
  applyPick,
  beginGroupTurn,
  commitLive,
  endGroupTurn,
  ensurePicks,
  loadLive,
  openMenu,
  restorePicksFromLog,
} from "./picks.ts";

/** D5 / 01-pool-pays: EV-01 (live), EV-04, EV-07, EV-13. The pool pays; own-share losses stay put. */

const SEED = "d5-pool";

/** Four groups, one hero each (seats hero-a to hero-d). Group A acts. */
const setup = (gold: Record<string, number>) => {
  const play = initPlayState(SEED, PROVING_GROUNDS_PLAY);
  const ids = ["hero-a", "hero-b", "hero-c", "hero-d"];
  play.groups.forEach((group, i) => {
    group.heroIds = ids[i] ? [ids[i] as string] : [];
  });
  for (const [id, amount] of Object.entries(gold)) {
    setHeroSheet(play, id, { helpingVirtues: 0, corruptions: 0, gold: amount });
  }
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  return { play, group };
};

/** The groups' heroes, in group order; any group not named is left with nobody (a hero sits in one group). */
const regroup = (play: PlayState, groups: string[][]): void => {
  play.groups.forEach((group, i) => {
    group.heroIds = groups[i] ?? [];
  });
};

const moveTo = (play: PlayState, groupId: string, building: string, kingdom = "N"): void => {
  const space = play.content.board.spaces.find(
    (s) => s.building === building && s.kingdom === kingdom,
  );
  const group = play.groups.find((g) => g.id === groupId);
  if (!space || !group) throw new Error(`no ${building}`);
  group.spaceId = space.id;
};

const goldOf = (play: PlayState, id: string): number | undefined =>
  heroSheet(ensureClock(play), id).gold;

const entry = (play: PlayState, groupId: string, id: string) => {
  const opened = openMenu(play, groupId);
  if (!opened.ok) throw new Error(`menu refused: ${opened.reason}`);
  const found = opened.entries.find((row) => row.id === id);
  if (!found) throw new Error(`no ${id} in the menu`);
  return found;
};

describe("D5 EV-01 live: an empty group buys Rally from the pool", () => {
  it("hero-a 0, hero-b 10: Rally is open; hero-a stays 0 and hero-b pays the 5", () => {
    const { play, group } = setup({ "hero-a": 0, "hero-b": 10 });
    setHeroSheet(play, "hero-a", {
      helpingVirtues: 0,
      corruptions: 0,
      gold: 0,
      hp: { hp: 4, max: 12 },
    });
    moveTo(play, group.id, "citadel");
    loadLive(play, group.id, 3);
    expect(entry(play, group.id, "rally")).toMatchObject({ disabled: false, price: 5 });
    const picked = applyPick(play, SEED, group.id, "rally", { heroId: "hero-a" });
    expect(picked.ok).toBe(true);
    commitLive(play, group.id);
    expect(goldOf(play, "hero-a")).toBe(0);
    expect(goldOf(play, "hero-b")).toBe(5);
    expect(heroSheet(ensureClock(play), "hero-a").hp).toEqual({ hp: 12, max: 12 });
  });
});

describe("D5 EV-04: a pool one coin short greys the pick; at the price it is open", () => {
  it("pool 9 is refused with no gold moved; pool 10 draws and both heroes hold 0", () => {
    const { play, group } = setup({ "hero-a": 4, "hero-b": 5 });
    moveTo(play, group.id, "citadel");
    loadLive(play, group.id, 3);
    expect(entry(play, group.id, "virtue-draw").disabled).toBe(true);
    const local = { groupId: group.id, movesLeft: 3, serial: 0, step: { kind: "menu" } } as never;
    const row = buildingModel(play, local, (id) => id).options.find((o) =>
      o.promptId.includes("virtue-draw"),
    );
    expect(row?.enabled).toBe(false);
    expect(row?.reason).toBe("Not enough gold.");
    const refused = applyPick(play, SEED, group.id, "virtue-draw");
    expect(refused).toEqual({ ok: false, reason: "no-gold" });
    commitLive(play, group.id);
    expect(goldOf(play, "hero-a")).toBe(4);
    expect(goldOf(play, "hero-b")).toBe(5);

    setHeroSheet(play, "hero-b", { helpingVirtues: 0, corruptions: 0, gold: 6 });
    loadLive(play, group.id, 3);
    expect(entry(play, group.id, "virtue-draw").disabled).toBe(false);
    expect(applyPick(play, SEED, group.id, "virtue-draw").ok).toBe(true);
    commitLive(play, group.id);
    expect(goldOf(play, "hero-a")).toBe(0);
    expect(goldOf(play, "hero-b")).toBe(0);
  });
});

describe("D5 EV-07: own-share losses stay with the holder", () => {
  const cruel = (play: PlayState, gold: number) =>
    setHeroSheet(play, "hero-a", {
      helpingVirtues: 0,
      corruptions: 1,
      named: ["cruel"],
      gold,
    });

  it("(a) Cruel after a Rest takes only hero-a's own 1 gold, never covered", () => {
    const { play, group } = setup({ "hero-b": 10, "hero-c": 10 });
    cruel(play, 1);
    regroup(play, [["hero-a", "hero-b"], ["hero-c"]]);
    setHeroSheet(play, "hero-b", {
      helpingVirtues: 0,
      corruptions: 0,
      gold: 10,
      hp: { hp: 4, max: 12 },
    });
    moveTo(play, group.id, "village");
    loadLive(play, group.id, 3);
    expect(applyPick(play, SEED, group.id, "rest", { heroId: "hero-b", count: 1 }).ok).toBe(true);
    commitLive(play, group.id);
    expect(goldOf(play, "hero-a")).toBe(0);
    expect(goldOf(play, "hero-b")).toBe(10);
    expect(goldOf(play, "hero-c")).toBe(10);
    expect(heroSheet(ensureClock(play), "hero-b").hp?.hp).toBe(7);
  });

  it("(b) Feral at the end of the turn on a village space takes nothing from anyone else", () => {
    const { play, group } = setup({ "hero-b": 10, "hero-c": 10 });
    setHeroSheet(play, "hero-a", {
      helpingVirtues: 0,
      corruptions: 1,
      named: ["feral"],
      gold: 0,
    });
    regroup(play, [["hero-a", "hero-b"], ["hero-c"]]);
    moveTo(play, group.id, "village");
    loadLive(play, group.id, 3);
    beginGroupTurn(play, group.id);
    endGroupTurn(play, group.id);
    commitLive(play, group.id);
    expect(goldOf(play, "hero-a")).toBe(0);
    expect(goldOf(play, "hero-b")).toBe(10);
    expect(goldOf(play, "hero-c")).toBe(10);
  });
});

describe("D5 EV-13: Continue keeps every hero's gold, paid once", () => {
  const paid = () => {
    const { play, group } = setup({ "hero-a": 1, "hero-b": 1, "hero-c": 3, "hero-d": 10 });
    regroup(play, [
      ["hero-a", "hero-b"],
      ["hero-c", "hero-d"],
    ]);
    moveTo(play, group.id, "citadel");
    loadLive(play, group.id, 3);
    expect(applyPick(play, SEED, group.id, "virtue-draw").ok).toBe(true);
    commitLive(play, group.id);
    return { play, group };
  };
  const golds = (play: PlayState) =>
    ["hero-a", "hero-b", "hero-c", "hero-d"].map((id) => goldOf(play, id));

  it("EV-03's payment as a live pick leaves 0, 0, 0, 5", () => {
    const { play } = paid();
    expect(golds(play)).toEqual([0, 0, 0, 5]);
  });

  it("(a) save and restore: the same gold, and the menu greys the draw (pool 5)", () => {
    const { play, group } = paid();
    const shell = { ...initialShellState({ sessionId: "s", seed: SEED }), play };
    const row = JSON.parse(JSON.stringify(serializeShellState(shell))) as never;
    const restored = deserializeShellState(row).play;
    if (!restored) throw new Error("the checkpoint lost the play state");
    expect(golds(restored)).toEqual([0, 0, 0, 5]);
    loadLive(restored, group.id, 3);
    expect(entry(restored, group.id, "virtue-draw").disabled).toBe(true);
    const again = applyPick(restored, SEED, group.id, "virtue-draw");
    expect(again).toEqual({ ok: false, reason: "no-gold" });
    expect(golds(restored)).toEqual([0, 0, 0, 5]);
  });

  it("(b) replaying the pick event from the log pays nothing a second time", () => {
    const { play, group } = paid();
    const log = openLog(play);
    expect(log).toHaveLength(1);
    restorePicksFromLog(play, log, { chapter: 1 });
    expect(golds(play)).toEqual([0, 0, 0, 5]);
    loadLive(play, group.id, 3);
    expect(entry(play, group.id, "virtue-draw").disabled).toBe(true);
    commitLive(play, group.id);
    expect(golds(play)).toEqual([0, 0, 0, 5]);
  });
});

const openLog = (play: PlayState) => structuredClone(ensurePicks(play).log);
