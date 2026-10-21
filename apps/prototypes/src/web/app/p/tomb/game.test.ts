import { describe, expect, it } from "vitest";
import { createRng } from "../../../lib/rng.ts";
import {
  DEFAULTS,
  enter,
  FINAL_ROOM,
  leave,
  newTomb,
  playPolicy,
  ROOMS,
  resolve,
  simulate,
  toConfig,
} from "./game.ts";

const cfg = (over: Record<string, number> = {}) => toConfig({ ...DEFAULTS, ...over });
const fresh = (over: Record<string, number> = {}, seed = "t") =>
  newTomb(createRng(seed), cfg(over));

describe("tomb rules", () => {
  it("has the 12 RtDT rooms and ends the route on the target room at the set depth", () => {
    expect(ROOMS).toHaveLength(12);
    const s = fresh({ depth: 6 });
    expect(s.route).toHaveLength(6);
    expect(s.route[5]).toBe(FINAL_ROOM);
    expect(new Set(s.route.map((r) => r.id)).size).toBe(6);
  });

  it("reveals one room at a time and charges hit points, money and corruption", () => {
    let s = fresh({ hp_ossuary: 0 });
    s = enter(s);
    expect(() => enter(s)).toThrow();
    expect(s.hp).toBe(24);
    const c = s.pending!.cost;
    s = resolve(s, false);
    expect(s.hp).toBe(24 - c.hp);
    expect(s.corruption).toBe(c.corruption);
    expect(s.entered).toHaveLength(1);
  });

  it("keeps cleared rooms cleared, lets the party leave at any doorway, and finishes on the target room", () => {
    let s = fresh({ depth: 2, hp: 99 });
    s = resolve(enter(s), false);
    expect(s.outcome).toBeNull();
    expect(() => leave(enter(s))).toThrow();
    const left = leave(s);
    expect(left.outcome).toBe("left");
    expect(left.entered).toHaveLength(1);
    s = resolve(enter(s), false);
    expect(s.outcome).toBe("finished");
    expect(s.entered.at(-1)?.room).toBe(FINAL_ROOM);
    expect(() => enter(s)).toThrow();
  });

  it("ends at 0 hit points and never goes below", () => {
    let s = fresh({ hp: 1, depth: 3 });
    s = resolve(enter(s), false);
    expect(s.hp).toBe(0);
    expect(s.outcome).toBe("dead");
  });

  it("an Undead Advantage softens one room, once", () => {
    const base = resolve(enter(fresh({ soften: 0.5 })), false);
    const soft = resolve(enter(fresh({ soften: 0.5 })), true);
    expect(24 - soft.hp).toBeLessThan(24 - base.hp);
    expect(soft.advantages).toBe(0);
    expect(() => resolve(enter(soft), true)).toThrow(/Advantage/);
  });

  it("pays a money shortfall in hit points", () => {
    let s = fresh({ money: 0, depth: 2, hp_embalming: 3, hp_offering: 2, hp_sarcophagi: 4 });
    s = { ...s, route: [ROOMS.find((r) => r.id === "offering")!, FINAL_ROOM] };
    s = resolve(enter(s), false);
    expect(s.hp).toBe(24 - 2 - 4);
    expect(s.money).toBe(0);
  });

  it("the policy leaves below the threshold, and a run replays from its seed", () => {
    const a = playPolicy(createRng("x"), cfg(), 20, 5);
    const b = playPolicy(createRng("x"), cfg(), 20, 5);
    expect(a.entered.map((e) => e.room.id)).toEqual(b.entered.map((e) => e.room.id));
    expect(a.outcome).toBe("left");
    expect(a.hp).toBeLessThan(20);
  });

  it("the simulation shares sum to 1 and are the same for the same seed", () => {
    const r = simulate("s", { ...DEFAULTS, runs: 200 })!;
    expect(r.finished + r.left + r.dead).toBeCloseTo(1);
    expect(simulate("s", { ...DEFAULTS, runs: 200 })).toEqual(r);
    expect(simulate("s", { ...DEFAULTS, runs: 0 })).toBeNull();
  });
});
