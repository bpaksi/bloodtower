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
  totals,
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

describe("run summary totals", () => {
  const sumOf = (s: ReturnType<typeof fresh>, k: "hp" | "money" | "corruption") =>
    s.entered.reduce((a, e) => a + e.cost[k], 0);

  it("counts rooms and costs paid after a left run", () => {
    let s = fresh({ advantages: 0 });
    s = resolve(enter(s), false);
    s = resolve(enter(s), false);
    s = leave(s);
    const t = totals(s);
    expect(s.outcome).toBe("left");
    expect(t.rooms).toBe(2);
    expect(t.hp).toBe(sumOf(s, "hp"));
    expect(t.money).toBe(sumOf(s, "money"));
    expect(t.corruption).toBe(sumOf(s, "corruption"));
  });

  it("reports a dead run with all hit points lost and the rooms entered", () => {
    const high = Object.fromEntries(ROOMS.map((r) => [`hp_${r.id}`, 20]));
    let s = fresh({ hp: 3, ...high, depth: 12 });
    s = resolve(enter(s), false);
    const t = totals(s);
    expect(s.outcome).toBe("dead");
    expect(t.rooms).toBe(1);
    expect(t.hp).toBe(3);
  });

  it("reports a finished run covering every room on the route", () => {
    let s = fresh({ hp: 1000, money: 1000, depth: 4 });
    while (!s.outcome) s = resolve(enter(s), false);
    const t = totals(s);
    expect(s.outcome).toBe("finished");
    expect(t.rooms).toBe(4);
    expect(t.hp).toBe(sumOf(s, "hp"));
    expect(t.corruption).toBe(sumOf(s, "corruption"));
  });
});
