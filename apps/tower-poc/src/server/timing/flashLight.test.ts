import type { UltimateDarkTower } from "ultimatedarktower";
import { describe, expect, it } from "vitest";
import { FLASH_WRITE_TIMEOUT_MS, flashEdges, flashOneLight } from "./flashLight.ts";

interface Sent {
  effect: number;
}

const towerWith = (initial: number, send: (effect: number) => Promise<void> = async () => {}) => {
  let effect = initial;
  const sent: Sent[] = [];
  const tower = {
    getCurrentTowerState: () => ({
      layer: [{ light: [{ effect, loop: false }] }],
    }),
    sendTowerState: async (state: { layer: { light: { effect: number }[] }[] }) => {
      const next = state.layer[0]?.light[0]?.effect ?? effect;
      await send(next);
      effect = next;
      sent.push({ effect: next });
    },
  };
  return { tower: tower as unknown as UltimateDarkTower, sent };
};

const clockFrom = (start: number) => {
  let now = start;
  return {
    now: () => now,
    sleep: async (ms: number) => {
      now += ms;
    },
    at: () => now,
  };
};

describe("flash edges", () => {
  it("alternates, starts by changing the light, and covers 5 seconds at each rate", () => {
    for (const rate of [2, 4, 6, 8]) {
      const edges = flashEdges(rate, 5_000, true);
      expect(edges).toHaveLength(rate * 5 * 2);
      expect(edges[0]).toEqual({ atMs: 0, on: true });
      expect(edges.at(-1)?.atMs).toBeLessThan(5_000);
      for (let i = 1; i < edges.length; i += 1) {
        expect(edges[i]?.on).toBe(!edges[i - 1]?.on);
      }
    }
  });
});

describe("flashOneLight", () => {
  it("sends a change on every write, starting from whichever state the light is in", async () => {
    for (const initial of [0, 1]) {
      const { tower, sent } = towerWith(initial);
      const clock = clockFrom(0);
      await flashOneLight(
        tower,
        { layerIndex: 0, lightIndex: 0, flashesPerSecond: 2, durationMs: 5_000 },
        clock,
      );
      expect(sent.length).toBeGreaterThan(1);
      expect(sent[0]?.effect).toBe(initial === 1 ? 0 : 1);
      for (let i = 1; i < sent.length; i += 1) {
        expect(sent[i]?.effect).not.toBe(sent[i - 1]?.effect);
      }
      expect(sent.at(-1)?.effect).toBe(0);
    }
  });

  it("abandons a write that does not finish, well short of 30 seconds", async () => {
    const { tower } = towerWith(0, () => new Promise(() => {}));
    const started = Date.now();
    await expect(
      flashOneLight(
        tower,
        { layerIndex: 0, lightIndex: 0, flashesPerSecond: 2, durationMs: 5_000 },
        { now: Date.now, sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) },
      ),
    ).rejects.toThrow(/did not finish/);
    expect(Date.now() - started).toBeLessThan(FLASH_WRITE_TIMEOUT_MS + 500);
  });
});
