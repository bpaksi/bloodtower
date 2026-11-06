import { eventRng } from "@dark-tower/rng";
import { describe, expect, it } from "vitest";
import { initPlayState, type PlayState } from "../chapter/playState.ts";
import {
  ensureClock,
  isFallen,
  placeTargets,
  setBuildingSkulls,
  setHeroSheet,
} from "../day/clock.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import {
  applyPick,
  CURE_RISEN_GOLD,
  configurePicks,
  ensurePicks,
  giveBackTile,
  MAX_VIRTUE_TILES,
  openMenu,
  pickPrice,
  restorePicks,
  restorePicksFromLog,
  setHeroHp,
  setMoves,
  setPurse,
  setQuestMarker,
  setVirtueTiles,
  snapshotPicks,
  VIRTUE_TILES,
} from "./picks.ts";

const SEED = "picks";

const setup = (heroId?: string) => {
  const play = initPlayState(SEED, PROVING_GROUNDS_PLAY);
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  if (heroId) group.heroIds = [heroId];
  return { play, group, spaceId: group.spaceId };
};

const labels = (play: PlayState, groupId: string): string[] => {
  const opened = openMenu(play, groupId);
  if (!opened.ok) throw new Error(opened.reason);
  return opened.entries.map((e) => e.label);
};

const moveTo = (play: PlayState, groupId: string, building: string): string => {
  const space = play.content.board.spaces.find((s) => s.building === building);
  if (!space) throw new Error(`no ${building} on the board`);
  const group = play.groups.find((g) => g.id === groupId);
  if (!group) throw new Error("no group");
  group.spaceId = space.id;
  return space.id;
};

describe("building picks", () => {
  it("EV-01: every pick costs one move and Leave is free", () => {
    const { play, group, spaceId } = setup();
    setMoves(play, group.id, 3);
    setPurse(play, group.id, 20);
    setHeroHp(play, group.id, 4, 12);
    setBuildingSkulls(play, spaceId, 1);
    expect(applyPick(play, SEED, group.id, "rally").ok).toBe(true);
    expect(ensurePicks(play).moves[group.id]).toBe(2);
    expect(applyPick(play, SEED, group.id, "cleanse").ok).toBe(true);
    expect(ensurePicks(play).moves[group.id]).toBe(1);
    // Opening the menu (Enter) and Leave spend nothing.
    openMenu(play, group.id);
    expect(ensurePicks(play).moves[group.id]).toBe(1);
  });

  it("EV-02: the first cure each chapter is free, per hero", () => {
    const { play, group } = setup("fighter");
    const sanctuary = moveTo(play, group.id, "sanctuary");
    expect(sanctuary).toBeTruthy();
    setMoves(play, group.id, 5);
    setPurse(play, group.id, 30);
    setHeroSheet(play, "fighter", { helpingVirtues: 0, corruptions: 3 });
    expect(applyPick(play, SEED, group.id, "cure", { heroId: "fighter" }).ok).toBe(true);
    expect(ensurePicks(play).purse[group.id]).toBe(30);
    // Carrying two: the DEC-170/DEC-552 rising price.
    expect(pickPrice(play, group.id, "cure", "fighter")).toBe(CURE_RISEN_GOLD);
    expect(applyPick(play, SEED, group.id, "cure", { heroId: "fighter" }).ok).toBe(true);
    expect(ensurePicks(play).purse[group.id]).toBe(30 - CURE_RISEN_GOLD);
    // Carrying one: back to the base price.
    expect(pickPrice(play, group.id, "cure", "fighter")).toBe(10);
    expect(applyPick(play, SEED, group.id, "cure", { heroId: "fighter" }).ok).toBe(true);
    expect(ensurePicks(play).purse[group.id]).toBe(30 - CURE_RISEN_GOLD - 10);
    ensurePicks(play).purse[group.id] = 20;
    // Chapter 2: the first is free again.
    setHeroSheet(play, "fighter", { helpingVirtues: 0, corruptions: 1 });
    ensurePicks(play).chapter = 2;
    expect(pickPrice(play, group.id, "cure", "fighter")).toBe(0);
    expect(applyPick(play, SEED, group.id, "cure", { heroId: "fighter" }).ok).toBe(true);
    expect(ensurePicks(play).purse[group.id]).toBe(20);
    // Another hero's free cure is separate.
    expect(pickPrice(play, group.id, "cure", "ranger")).toBe(0);
  });

  it("EV-03: Silver Tongue takes a quarter off only with the Bard present", () => {
    const withBard = setup("bard");
    expect(pickPrice(withBard.play, withBard.group.id, "rally")).toBe(4);
    const without = setup("fighter");
    expect(pickPrice(without.play, without.group.id, "rally")).toBe(5);
    // The Bard in another group does not discount this group.
    const other = setup("fighter");
    const second = other.play.groups[1];
    if (second) second.heroIds = ["bard"];
    expect(pickPrice(other.play, other.group.id, "rally")).toBe(5);
  });

  it("EV-04: an unaffordable pick shows disabled with its price and does nothing", () => {
    const { play, group } = setup();
    setMoves(play, group.id, 3);
    setPurse(play, group.id, 3);
    const opened = openMenu(play, group.id);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const rally = opened.entries.find((e) => e.id === "rally");
    const draw = opened.entries.find((e) => e.id === "virtue-draw");
    expect(rally).toMatchObject({ price: 5, disabled: true });
    expect(draw).toMatchObject({ price: 10, disabled: true });
    expect(applyPick(play, SEED, group.id, "rally")).toEqual({ ok: false, reason: "no-gold" });
    expect(applyPick(play, SEED, group.id, "virtue-draw")).toEqual({
      ok: false,
      reason: "no-gold",
    });
    expect(ensurePicks(play).purse[group.id]).toBe(3);
    expect(ensurePicks(play).moves[group.id]).toBe(3);
  });

  it("EV-05: Cleanse removes a skull, adds supply and reads +1 day", () => {
    const { play, group, spaceId } = setup();
    setMoves(play, group.id, 3);
    setBuildingSkulls(play, spaceId, 2);
    const supply = ensureClock(play).supply;
    expect(applyPick(play, SEED, group.id, "cleanse").ok).toBe(true);
    expect(ensureClock(play).skulls[spaceId]).toBe(1);
    expect(ensureClock(play).supply).toBe(supply + 1);
    expect(ensureClock(play).effects).toContain("+1 day");
  });

  it("EV-05b: Cleanse at 0 skulls is listed but disabled, refused, and buys no day", () => {
    const { play, group, spaceId } = setup();
    setMoves(play, group.id, 3);
    setBuildingSkulls(play, spaceId, 0);
    const clock = ensureClock(play);
    const supply = clock.supply;
    const opened = openMenu(play, group.id);
    expect(opened.ok && opened.entries.find((e) => e.id === "cleanse")?.disabled).toBe(true);
    expect(applyPick(play, SEED, group.id, "cleanse")).toEqual({ ok: false, reason: "no-target" });
    expect(clock.supply).toBe(supply);
    expect(clock.effects).not.toContain("+1 day");
    expect(ensurePicks(play).moves[group.id]).toBe(3);
    // Removing the last skull still grants the day.
    setBuildingSkulls(play, spaceId, 1);
    expect(applyPick(play, SEED, group.id, "cleanse").ok).toBe(true);
    expect(ensureClock(play).supply).toBe(supply + 1);
  });

  it("EV-06: skulls shrink the citadel menu; Cleanse and Leave stay, Quest first", () => {
    const { play, group, spaceId } = setup();
    const expected = [
      ["Rally", "Virtue draw", "Cleanse", "Leave"],
      ["Rally", "Cleanse", "Leave"],
      ["Cleanse", "Leave"],
      ["Cleanse", "Leave"],
    ];
    for (const [skulls, menu] of expected.entries()) {
      setBuildingSkulls(play, spaceId, skulls);
      expect(labels(play, group.id)).toEqual(menu);
    }
    setQuestMarker(play, spaceId, true);
    expect(labels(play, group.id)[0]).toBe("Quest");
  });

  it("EV-07: rest heals 3 a move up to full; the opening move is not refunded", () => {
    const { play, group } = setup("fighter");
    moveTo(play, group.id, "village");
    setMoves(play, group.id, 3);
    setHeroHp(play, "fighter", 4, 12);
    expect(applyPick(play, SEED, group.id, "rest", { heroId: "fighter" }).ok).toBe(true);
    expect(applyPick(play, SEED, group.id, "rest", { heroId: "fighter" }).ok).toBe(true);
    expect(ensurePicks(play).hp.fighter?.hp).toBe(10);
    // A third rest, then Back: the move stays spent and the heal is capped at full.
    expect(applyPick(play, SEED, group.id, "rest", { heroId: "fighter" }).ok).toBe(true);
    expect(ensurePicks(play).hp.fighter?.hp).toBe(12);
    expect(ensurePicks(play).moves[group.id]).toBe(0);
  });

  it("EV-08: rally heals to full and takes the price from the purse", () => {
    const { play, group } = setup("fighter");
    setHeroHp(play, "fighter", 4, 12);
    setPurse(play, group.id, 12);
    setMoves(play, group.id, 3);
    expect(applyPick(play, SEED, group.id, "rally", { heroId: "fighter" }).ok).toBe(true);
    expect(ensurePicks(play).hp.fighter?.hp).toBe(12);
    expect(ensurePicks(play).purse[group.id]).toBe(7);
    expect(ensurePicks(play).moves[group.id]).toBe(2);
  });

  it("EV-09: virtue draw adds one seeded tile; a fifth forces a give-back", () => {
    const { play, group } = setup();
    setVirtueTiles(play, group.id, ["courage", "mercy", "wisdom"]);
    setPurse(play, group.id, 25);
    setMoves(play, group.id, 4);
    const expected = eventRng(SEED, play.rngSeq).pick([...VIRTUE_TILES]);
    expect(applyPick(play, SEED, group.id, "virtue-draw").ok).toBe(true);
    const tiles = ensurePicks(play).tiles[group.id] ?? [];
    expect(tiles).toHaveLength(4);
    expect(tiles.at(-1)).toBe(expected);
    expect(ensurePicks(play).purse[group.id]).toBe(15);
    expect(applyPick(play, SEED, group.id, "virtue-draw").ok).toBe(true);
    expect(ensurePicks(play).purse[group.id]).toBe(5);
    expect(ensurePicks(play).giveBack[group.id]).toBe(true);
    expect(ensurePicks(play).tiles[group.id]).toHaveLength(MAX_VIRTUE_TILES + 1);
    // Nothing else is allowed until the give-back is answered.
    expect(applyPick(play, SEED, group.id, "cleanse")).toEqual({
      ok: false,
      reason: "give-back-first",
    });
    expect(giveBackTile(play, group.id, "courage")).toBe(true);
    expect(ensurePicks(play).tiles[group.id]).toHaveLength(MAX_VIRTUE_TILES);
  });

  it("EV-10: a fallen building offers nothing, not even Cleanse", () => {
    const { play, group, spaceId } = setup();
    setMoves(play, group.id, 3);
    setBuildingSkulls(play, spaceId, 4);
    expect(isFallen(play, spaceId)).toBe(true);
    expect(placeTargets(play)).not.toContain(spaceId);
    expect(openMenu(play, group.id)).toEqual({ ok: false, reason: "fallen" });
    expect(applyPick(play, SEED, group.id, "cleanse")).toEqual({ ok: false, reason: "fallen" });
    expect(ensureClock(play).skulls[spaceId]).toBe(4);
  });

  it("EV-11: Cleanse costs 1 move and 0 gold, even with an empty purse", () => {
    const { play, group, spaceId } = setup();
    setMoves(play, group.id, 3);
    setPurse(play, group.id, 8);
    setBuildingSkulls(play, spaceId, 2);
    expect(applyPick(play, SEED, group.id, "cleanse").ok).toBe(true);
    expect(ensureClock(play).skulls[spaceId]).toBe(1);
    expect(ensurePicks(play).moves[group.id]).toBe(2);
    expect(ensurePicks(play).purse[group.id]).toBe(8);

    setPurse(play, group.id, 0);
    expect(applyPick(play, SEED, group.id, "cleanse").ok).toBe(true);
    expect(ensureClock(play).skulls[spaceId]).toBe(0);
  });

  it("EV-12: the free cure is remembered through Continue", () => {
    const { play, group } = setup("fighter");
    moveTo(play, group.id, "sanctuary");
    setMoves(play, group.id, 5);
    setPurse(play, group.id, 30);
    setHeroSheet(play, "fighter", { helpingVirtues: 0, corruptions: 2 });
    expect(applyPick(play, SEED, group.id, "cure", { heroId: "fighter" }).ok).toBe(true);
    const saved = snapshotPicks(play);

    const continued = initPlayState(SEED, PROVING_GROUNDS_PLAY);
    restorePicks(continued, saved);
    expect(pickPrice(continued, group.id, "cure", "fighter")).toBe(10);
  });

  it("EV-13: the free cure survives a host restart (rebuilt from the log)", () => {
    const { play, group } = setup("fighter");
    moveTo(play, group.id, "sanctuary");
    setMoves(play, group.id, 5);
    setPurse(play, group.id, 30);
    setHeroSheet(play, "fighter", { helpingVirtues: 0, corruptions: 2 });
    configurePicks(play, { chapter: 1 });
    expect(applyPick(play, SEED, group.id, "cure", { heroId: "fighter" }).ok).toBe(true);
    const log = JSON.parse(JSON.stringify(ensurePicks(play).log));

    const restarted = initPlayState(SEED, PROVING_GROUNDS_PLAY);
    const store = restorePicksFromLog(restarted, log, { chapter: 1 });
    expect(store.freeCures).toEqual(["1:fighter"]);
    expect(pickPrice(restarted, group.id, "cure", "fighter")).toBe(10);
  });
});
