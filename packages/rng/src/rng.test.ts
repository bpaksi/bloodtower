import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createRng, eventRng, parseDice } from "./rng.ts";

/** First ten `roll("1d6")` totals from `createRng("bloodtower")` on main, captured before the move. */
const BLOODTOWER_D6 = [3, 3, 5, 2, 5, 4, 2, 1, 1, 5];

describe("rng", () => {
  it("replays exactly from the same seed", () => {
    const a = createRng("abc");
    const b = createRng("abc");
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(
      Array.from({ length: 20 }, () => b.next()),
    );
  });

  it("differs for another seed and keeps the seed text", () => {
    expect(createRng("abc").next()).not.toBe(createRng("abd").next());
    expect(createRng(42).seed).toBe("42");
  });

  it("rolls 1d6 within 1..6 and hits every face", () => {
    const rng = createRng("dice");
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const r = rng.roll("1d6");
      expect(r.dice).toHaveLength(1);
      expect(r.total).toBeGreaterThanOrEqual(1);
      expect(r.total).toBeLessThanOrEqual(6);
      seen.add(r.total);
    }
    expect(seen.size).toBe(6);
  });

  it("adds the modifier and reports every die", () => {
    const r = createRng("m").roll("3d4-2");
    expect(r.dice).toHaveLength(3);
    expect(r.modifier).toBe(-2);
    expect(r.total).toBe(r.dice.reduce((s, d) => s + d, 0) - 2);
  });

  it("parses the notation forms", () => {
    expect(parseDice("d20")).toEqual({ count: 1, sides: 20, modifier: 0 });
    expect(parseDice("2d6 + 1")).toEqual({ count: 2, sides: 6, modifier: 1 });
    expect(parseDice("+2")).toEqual({ count: 0, sides: 0, modifier: 2 });
  });

  it("throws on bad notation instead of returning zero", () => {
    for (const bad of ["", "abc", "0d6", "2d0", "d", "1d6+"]) {
      expect(() => createRng("x").roll(bad)).toThrow(/dice/i);
    }
  });

  it("rejects more than 1000 dice with a clear error, and allows 1000", () => {
    expect(() => createRng("x").roll("1001d6")).toThrow(/at most 1000 dice/);
    expect(createRng("x").roll("1000d1").total).toBe(1000);
  });

  it("int, pick and shuffle stay in range and keep every item", () => {
    const rng = createRng("s");
    for (let i = 0; i < 100; i++) expect([3, 4, 5]).toContain(rng.int(3, 5));
    expect([...rng.shuffle([1, 2, 3, 4, 5])].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(() => rng.pick([])).toThrow();
    expect(() => rng.int(5, 3)).toThrow();
  });

  it("chance throws for NaN or p outside 0..1, and accepts the ends", () => {
    const rng = createRng("c");
    expect(() => rng.chance(Number.NaN)).toThrow(/rng\.chance/);
    expect(() => rng.chance(-0.1)).toThrow(/rng\.chance/);
    expect(() => rng.chance(1.5)).toThrow(/rng\.chance/);
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
  });

  it("pins seed bloodtower to the first ten 1d6 rolls from main", () => {
    const rng = createRng("bloodtower");
    expect(Array.from({ length: 10 }, () => rng.roll("1d6").total)).toEqual(BLOODTOWER_D6);
  });
});

describe("eventRng", () => {
  const take = (seed: string, seq: number): number[] => {
    const rng = eventRng(seed, seq);
    return Array.from({ length: 8 }, () => rng.roll("1d6").total);
  };

  it("returns the same draws for the same seed and seq after other draws", () => {
    const expected = take("bloodtower", 4);
    const moved = eventRng("bloodtower", 4);
    moved.roll("2d6+1");
    moved.next();
    moved.shuffle([1, 2, 3, 4]);
    createRng("bloodtower").roll("1d6");
    take("bloodtower", 3);
    take("other", 4);
    expect(take("bloodtower", 4)).toEqual(expected);
    expect(take("bloodtower", 5)).not.toEqual(expected);
    expect(take("other-seed", 4)).not.toEqual(expected);
  });

  it("rejects a sequence or seed it cannot use", () => {
    expect(() => eventRng("bloodtower", -1)).toThrow(/sequence/);
    expect(() => eventRng("bloodtower", 1.5)).toThrow(/sequence/);
    expect(() => eventRng("bloodtower", Number.NaN)).toThrow(/sequence/);
    expect(() => eventRng("bloodtower", Number.POSITIVE_INFINITY)).toThrow(/sequence/);
    expect(() => eventRng(42 as unknown as string, 0)).toThrow(/string seed/);
  });
});

describe("rng source", () => {
  it("does no I/O, reads no clock and has no unseeded fallback", () => {
    const raw = readFileSync(new URL("./rng.ts", import.meta.url), "utf8");
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const forbidden of [
      "Math.random",
      "Date.now",
      "new Date",
      "performance.now",
      "setTimeout",
      "node:",
      "crypto",
      "process",
    ]) {
      expect(src.includes(forbidden), forbidden).toBe(false);
    }
  });
});
