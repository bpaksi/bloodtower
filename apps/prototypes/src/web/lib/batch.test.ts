import type { Rng } from "@dark-tower/rng";
import { describe, expect, it } from "vitest";
import { mean, runBatch, runSeed, share, tally } from "./batch.ts";

describe("batch runner", () => {
  it("plays N runs and returns each result with its seed", () => {
    const runs = runBatch(50, "s", (rng) => rng.roll("1d6").total);
    expect(runs).toHaveLength(50);
    expect(runs[3]?.seed).toBe("s:3");
  });

  it("replays the batch from the same seed, and a single run alone", () => {
    const play = (rng: Rng) => rng.roll("2d6").total;
    const a = runBatch(30, "x", play).map((r) => r.result);
    expect(runBatch(30, "x", play).map((r) => r.result)).toEqual(a);
    expect(runSeed("x", 7)).toBe("x:7");
    const solo = runBatch(8, "x", play)[7];
    expect(solo?.result).toBe(a[7]);
  });

  it("summarises with mean, share and tally; an empty batch is null, not zero", () => {
    const runs = runBatch(4, "k", (_rng, i) => i);
    expect(mean(runs, (n) => n)).toBe(1.5);
    expect(share(runs, (n) => n >= 2)).toBe(0.5);
    expect(tally(runs, (n) => (n % 2 ? "odd" : "even"))).toEqual({ even: 2, odd: 2 });
    expect(mean([], (n: number) => n)).toBeNull();
    expect(share([], () => true)).toBeNull();
  });

  it("lets an error in a run through", () => {
    expect(() =>
      runBatch(3, "e", (_r, i) => {
        if (i === 1) throw new Error("boom");
        return i;
      }),
    ).toThrow("boom");
    expect(() => runBatch(-1, "e", () => 0)).toThrow();
  });
});
