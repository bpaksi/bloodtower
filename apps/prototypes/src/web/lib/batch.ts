import { createRng, type Rng } from "@dark-tower/rng";

export type BatchRun<T> = { index: number; seed: string; result: T };

/**
 * Plays `runs` seeded runs. Run i gets its own generator seeded `${seed}:${i}`, so the whole batch
 * replays from one seed and any single run can be replayed alone with `runSeed(seed, i)`.
 * An error in a run is not caught: it stops the batch, so it cannot hide in the numbers.
 */
export function runBatch<T>(
  runs: number,
  seed: string | number,
  play: (rng: Rng, index: number) => T,
): BatchRun<T>[] {
  if (!Number.isInteger(runs) || runs < 0) {
    throw new Error(`runBatch needs a whole number of runs, got ${runs}.`);
  }
  const out: BatchRun<T>[] = [];
  for (let index = 0; index < runs; index++) {
    const s = runSeed(seed, index);
    out.push({ index, seed: s, result: play(createRng(s), index) });
  }
  return out;
}

export function runSeed(seed: string | number, index: number): string {
  return `${seed}:${index}`;
}

/** Mean of a number picked from each run. An empty batch gives null (unavailable), never 0. */
export function mean<T>(runs: BatchRun<T>[], pick: (result: T) => number): number | null {
  if (runs.length === 0) return null;
  return runs.reduce((s, r) => s + pick(r.result), 0) / runs.length;
}

/** Share (0 to 1) of runs where the test holds. An empty batch gives null. */
export function share<T>(runs: BatchRun<T>[], test: (result: T) => boolean): number | null {
  if (runs.length === 0) return null;
  return runs.filter((r) => test(r.result)).length / runs.length;
}

/** Counts runs by a label, for outcomes such as finish / leave / dead. */
export function tally<T>(
  runs: BatchRun<T>[],
  label: (result: T) => string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of runs) {
    const key = label(r.result);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
