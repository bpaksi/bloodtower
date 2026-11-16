import { describe, expect, it } from "vitest";
import { ensureClock, heroSheet, setBuildingSkulls } from "../day/clock.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import {
  applyTestSeed,
  initPlayState,
  isTestSeed,
  TEST_SEAT_TOGETHER,
  TEST_SEED_MARKERS,
} from "./playState.ts";

const buildingIn = (kingdom: string, nth = 0) => {
  const found = PROVING_GROUNDS_PLAY.board.spaces.filter(
    (space) => space.building && space.kingdom === kingdom,
  )[nth];
  if (!found) throw new Error(`No building ${nth} in ${kingdom}.`);
  return found.id;
};

describe("C3/20 EV-03 the seed sets skulls per building and the next kingdom", () => {
  it("sets only what it names; a field it does not name stays unset", () => {
    const e0 = buildingIn("E");
    const w0 = buildingIn("W");
    const play = initPlayState(
      `s~test-skulls:${e0}=3,${w0}=0~test-kingdom:E+S`,
      PROVING_GROUNDS_PLAY,
    );
    const clock = ensureClock(play);
    expect(clock.skulls[e0]).toBe(3);
    expect(clock.skulls[w0]).toBe(0);
    expect(clock.skulls[buildingIn("N")]).toBeUndefined();
    expect(clock.seedKingdoms).toEqual(["E", "S"]);
    const bare = ensureClock(initPlayState("plain", PROVING_GROUNDS_PLAY));
    expect(bare.skulls).toEqual({});
    expect(bare.seedKingdoms).toEqual([]);
  });

  it("refuses a space that is not a building and a kingdom that does not exist", () => {
    expect(() => initPlayState("s~test-skulls:nowhere=1", PROVING_GROUNDS_PLAY)).toThrow(
      /not a building/,
    );
    expect(() => initPlayState("s~test-kingdom:Q", PROVING_GROUNDS_PLAY)).toThrow(/N, E, S, W/);
  });
});

describe("C3/20 EV-04 the seed sets hero sheets, and CU/10's corruption seed routes through it", () => {
  it("reads virtues, corruptions, items, hit points and gold from the one hook", () => {
    const play = initPlayState(
      "s~test-corruption:hero-b=1~test-virtues:hero-a=1~test-items:hero-a=potion~test-hp:hero-a=3/10~test-gold:hero-a=4",
      PROVING_GROUNDS_PLAY,
    );
    const clock = ensureClock(play);
    expect(heroSheet(clock, "hero-a")).toEqual({
      helpingVirtues: 1,
      corruptions: 0,
      items: ["potion"],
      hp: { hp: 3, max: 10 },
      gold: 4,
    });
    expect(heroSheet(clock, "hero-b").corruptions).toBe(1);
  });

  it("the live form changes the counts of a running game and keeps the rest of the sheet", () => {
    const play = initPlayState(
      "s~test-corruption:hero-a=1~test-virtues:hero-a=1",
      PROVING_GROUNDS_PLAY,
    );
    applyTestSeed(play, "~test-corruption:hero-a=2,hero-b=1");
    applyTestSeed(play, "~test-corruption:hero-a=2,hero-b=0");
    const clock = ensureClock(play);
    expect(heroSheet(clock, "hero-a")).toEqual({ helpingVirtues: 1, corruptions: 2 });
    expect(heroSheet(clock, "hero-b").corruptions).toBe(0);
  });

  it("skulls set live land beside a running clock", () => {
    const play = initPlayState("plain", PROVING_GROUNDS_PLAY);
    setBuildingSkulls(play, buildingIn("N"), 1);
    applyTestSeed(play, `~test-skulls:${buildingIn("N")}=2`);
    expect(ensureClock(play).skulls[buildingIn("N")]).toBe(2);
  });
});

describe("C3/20 EV-05 the marker rule", () => {
  it("seats two heroes on one space behind the marker, and a real seed never carries one", () => {
    const together = initPlayState(`s${TEST_SEAT_TOGETHER}`, PROVING_GROUNDS_PLAY);
    expect(together.groups).toHaveLength(1);
    expect(together.groups[0]?.heroIds.length).toBeGreaterThan(1);
    const apart = initPlayState("0123456789abcdef", PROVING_GROUNDS_PLAY);
    expect(apart.groups.length).toBeGreaterThan(1);
    for (const marker of TEST_SEED_MARKERS) {
      expect(isTestSeed(`s${marker}`)).toBe(true);
      expect(isTestSeed("0123456789abcdef")).toBe(false);
    }
  });
});
