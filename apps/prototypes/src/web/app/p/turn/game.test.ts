import { createRng } from "@dark-tower/rng";
import { describe, expect, it } from "vitest";
import {
  act,
  BOARD,
  DEFAULTS,
  endTurn,
  newGroups,
  readTuning,
  rollMoves,
  simulate,
  VILLAGE,
  walk,
} from "./game.ts";

const t = readTuning(DEFAULTS);

describe("rollMoves (DEC-102)", () => {
  it("adds virtues, takes away corruption and shows each part", () => {
    const r = rollMoves(createRng("a"), { ...t, dice: "+3", virtues: [2], corruption: [1] }, 0);
    expect(r).toMatchObject({
      diceTotal: 3,
      virtues: 2,
      corruption: 1,
      raw: 4,
      total: 4,
      floored: false,
    });
  });
  it("never goes below the floor", () => {
    const r = rollMoves(
      createRng("a"),
      { ...t, dice: "+1", virtues: [0], corruption: [5], floor: 2 },
      0,
    );
    expect(r).toMatchObject({ raw: -4, total: 2, floored: true });
  });
  it("is the same for the same seed", () => {
    expect(rollMoves(createRng("s"), t, 0)).toEqual(rollMoves(createRng("s"), t, 0));
  });
});

describe("spending moves (DEC-078)", () => {
  const g = () => newGroups(createRng("x"), { ...t, dice: "+4" }, [3, 11])[0]!;
  it("a space costs 1 move", () => {
    const r = walk(g(), 1);
    expect(r.group).toMatchObject({ at: 4, movesLeft: 3, spent: 1 });
  });
  it("a building action costs 1 move, once each, only on the menu", () => {
    const tt = { ...t, dice: "+4" };
    const inVillage = { ...g(), at: VILLAGE };
    const a = act(inVillage, "Tavern", tt);
    expect(a.group.movesLeft).toBe(3);
    expect(act(a.group, "Tavern", tt).error).toMatch(/already/);
    expect(act(inVillage, "Nope", tt).error).toMatch(/not on the menu/);
    expect(act(g(), "Tavern", tt).error).toMatch(/not on the menu/);
  });
  it("2 in, 1 tavern, 2 out is 5 moves", () => {
    const tt = { ...t, dice: "+5" };
    let x = { ...newGroups(createRng("x"), tt, [VILLAGE - 2, 11])[0]! };
    x = walk(walk(x, 1).group, 1).group;
    x = act(x, "Tavern", tt).group;
    x = walk(walk(x, 1).group, 1).group;
    expect(x).toMatchObject({ spent: 5, movesLeft: 0 });
    expect(walk(x, 1).error).toBe("No moves left.");
  });
  it("cannot walk off the road or after ending", () => {
    const x = { ...newGroups(createRng("x"), { ...t, dice: "+4" }, [0, 11])[0]! };
    expect(walk(x, -1).error).toBe("End of the road.");
    expect(walk(endTurn(x), 1).error).toBe("Turn already ended.");
  });
});

describe("simulation", () => {
  it("is repeatable and uses the same tuning", () => {
    expect(simulate(1000, "1", t)).toEqual(simulate(1000, "1", t));
  });
  it("big rolls always reach and leave moves unused beyond the menu", () => {
    const s = simulate(100, "1", { ...t, dice: "+20" });
    expect(s.reachShare).toBe(1);
    expect(s.unusedMean).toBeGreaterThan(10);
  });
  it("an empty batch is unavailable, not 0", () => {
    expect(simulate(0, "1", t).reachShare).toBeNull();
  });
  it("board has one village", () => {
    expect(BOARD.filter((k) => k === "village")).toHaveLength(1);
  });
});
