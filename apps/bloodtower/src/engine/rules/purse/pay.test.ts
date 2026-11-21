import { describe, expect, it } from "vitest";
import { type GoldMap, gainPresent, payPool, poolTotal } from "./index.ts";

/** D5 / 01-pool-pays, EV-01 to EV-06: who pays a priced choice (DEC-911, DEC-646). */

describe("D5 EV-01: an empty group buys from the pool", () => {
  it("hero-a holds 0, hero-b (another group) holds 10: Rally's 5 comes off hero-b", () => {
    const start: GoldMap = { "hero-a": 0, "hero-b": 10 };
    const paid = payPool(start, ["hero-a"], ["hero-b"], 5);
    expect(paid.gold).toEqual({ "hero-a": 0, "hero-b": 5 });
    expect(paid.unpaid).toBe(0);
    expect(poolTotal(start)).toBe(10);
    expect(poolTotal(paid.gold)).toBe(5);
    expect(start).toEqual({ "hero-a": 0, "hero-b": 10 }); // the input is not changed
  });
});

describe("D5 EV-02: a short present hero is covered by the present heroes", () => {
  it("A: hero-a 1, hero-b 9; B: hero-c 10; A pays 5 -> 0, 5, 10", () => {
    const paid = payPool(
      { "hero-a": 1, "hero-b": 9, "hero-c": 10 },
      ["hero-a", "hero-b"],
      ["hero-c"],
      5,
    );
    expect(paid.gold).toEqual({ "hero-a": 0, "hero-b": 5, "hero-c": 10 });
    expect(poolTotal(paid.gold)).toBe(15);
  });
});

describe("D5 EV-03: the absent heroes pay only what the present heroes lack", () => {
  it("A: 1, 1; B: hero-c 3, hero-d 10; A pays 10 -> 0, 0, 0, 5", () => {
    const paid = payPool(
      { "hero-a": 1, "hero-b": 1, "hero-c": 3, "hero-d": 10 },
      ["hero-a", "hero-b"],
      ["hero-c", "hero-d"],
      10,
    );
    expect(paid.gold).toEqual({ "hero-a": 0, "hero-b": 0, "hero-c": 0, "hero-d": 5 });
    expect(paid.unpaid).toBe(0);
  });
});

describe("D5 EV-05: the odd coins come from the heroes holding the most", () => {
  it("7, 7, 4 pay 5 -> 5, 5, 3", () => {
    const paid = payPool(
      { "hero-a": 7, "hero-b": 7, "hero-c": 4 },
      ["hero-a", "hero-b", "hero-c"],
      [],
      5,
    );
    expect(paid.gold).toEqual({ "hero-a": 5, "hero-b": 5, "hero-c": 3 });
  });
});

describe("D5 gains (DEC-178, DEC-646): the leftover coin goes to the hero holding least", () => {
  it("hero-a 3, hero-b 0 gain 5 -> 5, 3; the absent hero gains nothing", () => {
    const next = gainPresent({ "hero-a": 3, "hero-b": 0, "hero-c": 0 }, ["hero-a", "hero-b"], 5);
    expect(next).toEqual({ "hero-a": 5, "hero-b": 3, "hero-c": 0 });
  });
});

/** A small seeded generator so the fixtures repeat. */
const lcg = (seed: number) => {
  let state = seed;
  return (below: number): number => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state % below;
  };
};

const seededCase = (seed: number) => {
  const next = lcg(seed);
  const heroCount = 1 + next(4);
  const groupCount = 1 + next(Math.min(3, heroCount));
  const ids = Array.from({ length: heroCount }, (_, i) => `hero-${i}`);
  const gold: GoldMap = Object.fromEntries(ids.map((id) => [id, next(31)]));
  const groupOf = ids.map((_, i) => (i === 0 ? 0 : next(groupCount)));
  const present = ids.filter((_, i) => groupOf[i] === 0);
  const absent = ids.filter((_, i) => groupOf[i] !== 0);
  const pool = poolTotal(gold);
  const price = Math.min(next(41), pool);
  return { gold, present, absent, price };
};

describe("D5 EV-06: conservation over 500 seeded cases", () => {
  it("the pool falls by exactly the price, nobody goes below 0, absent heroes pay only on a shortfall", () => {
    for (let seed = 1; seed <= 500; seed++) {
      const { gold, present, absent, price } = seededCase(seed);
      const paid = payPool(gold, present, absent, price);
      expect(paid.unpaid, `seed ${seed}`).toBe(0);
      expect(poolTotal(paid.gold), `seed ${seed}`).toBe(poolTotal(gold) - price);
      for (const [id, amount] of Object.entries(paid.gold)) {
        expect(amount, `seed ${seed} ${id}`).toBeGreaterThanOrEqual(0);
        expect(amount, `seed ${seed} ${id}`).toBeLessThanOrEqual(gold[id] ?? 0);
      }
      if (poolTotal(Object.fromEntries(present.map((id) => [id, gold[id] ?? 0]))) >= price) {
        for (const id of absent) expect(paid.gold[id], `seed ${seed} ${id}`).toBe(gold[id]);
      }
      expect(payPool(gold, present, absent, price), `seed ${seed}`).toEqual(paid);
    }
  });

  it("a price above the pool reports what is unpaid and takes every coin", () => {
    const paid = payPool({ "hero-a": 2, "hero-b": 3 }, ["hero-a"], ["hero-b"], 9);
    expect(paid.gold).toEqual({ "hero-a": 0, "hero-b": 0 });
    expect(paid.unpaid).toBe(4);
  });
});
