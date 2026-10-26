import { createRng } from "@dark-tower/rng";
import { describe, expect, it } from "vitest";
import {
  configFrom,
  isOver,
  MAX_SIM_VISITS,
  playVisit,
  simulate,
  startVisit,
  step,
} from "./game.ts";

const cfg = configFrom();
const rng = () => createRng("t");

describe("camp rules", () => {
  it("buys at list price and spends the purse", () => {
    const s = step(startVisit(cfg, false), { type: "buy", ware: 0 }, cfg, rng());
    expect(s.purse).toBe(cfg.purse - 10);
    expect(s.wares[0]?.status).toBe("bought");
  });

  it("a haggle takes the face's discount off and raises temper", () => {
    const s = step(startVisit(cfg, false), { type: "haggle", ware: 0, face: 6 }, cfg, rng());
    expect(s.wares[0]?.price).toBe(7);
    expect(s.temper).toBe(1);
  });

  it("a low face adds extra temper; a ware is haggled once", () => {
    const s = step(startVisit(cfg, false), { type: "haggle", ware: 0, face: 1 }, cfg, rng());
    expect(s.temper).toBe(2);
    expect(() => step(s, { type: "haggle", ware: 0, face: 3 }, cfg, rng())).toThrow(/already/);
  });

  it("rejects a die face outside 1 to 6", () => {
    expect(() =>
      step(startVisit(cfg, false), { type: "haggle", ware: 0, face: 7 }, cfg, rng()),
    ).toThrow();
  });

  it("refusing adds temper", () => {
    const s = step(startVisit(cfg, false), { type: "refuse", ware: 0 }, cfg, rng());
    expect(s.temper).toBe(cfg.refuseTemper);
  });

  it("stealing: clean theft adds temper, a caught theft means attack", () => {
    const clean = step(
      startVisit(cfg, false),
      { type: "steal", ware: 0 },
      { ...cfg, catchChance: 0 },
      rng(),
    );
    expect(clean.temper).toBe(cfg.stealTemper);
    expect(clean.saved).toBe(10);
    const caught = step(
      startVisit(cfg, false),
      { type: "steal", ware: 0 },
      { ...cfg, catchChance: 1 },
      rng(),
    );
    expect(caught.attacked).toBe(true);
  });

  it("full temper attacks, plays the placeholder fight and ends the visit", () => {
    let s = startVisit({ ...cfg, maxTemper: 2 }, false);
    const c = { ...cfg, maxTemper: 2 };
    s = step(s, { type: "refuse", ware: 0 }, c, rng());
    s = step(s, { type: "refuse", ware: 1 }, c, rng());
    expect(s.attacked).toBe(true);
    expect(s.fight).not.toBeNull();
    expect(isOver(s)).toBe(true);
    expect(() => step(s, { type: "buy", ware: 2 }, c, rng())).toThrow(/over/);
  });

  it("a Humanoid Advantage calms once", () => {
    let s = startVisit(cfg, true);
    s = step(s, { type: "refuse", ware: 0 }, cfg, rng());
    s = step(s, { type: "refuse", ware: 1 }, cfg, rng());
    s = step(s, { type: "calm" }, cfg, rng());
    expect(s.temper).toBe(0);
    expect(() => step(s, { type: "calm" }, cfg, rng())).toThrow(/Advantage/);
  });

  it("cannot buy beyond the purse", () => {
    const c = { ...cfg, purse: 5 };
    expect(() => step(startVisit(c, false), { type: "buy", ware: 0 }, c, rng())).toThrow(/afford/);
  });

  it("bad tuning text throws", () => {
    expect(() => configFrom({ ...Object.fromEntries([]), wares: "nope" } as never)).toThrow();
  });
});

describe("simulation", () => {
  it("same seed gives the same numbers", () => {
    expect(simulate(cfg, "1", 200)).toEqual(simulate(cfg, "1", 200));
  });

  it("never haggling saves nothing and never angers the camp", () => {
    const never = simulate(cfg, "1", 200).find((r) => r.policy === "haggle-never");
    expect(never?.moneySaved).toBe(0);
    expect(never?.attackShare).toBe(0);
  });

  it("haggling always saves more than haggling never, and risks attacks", () => {
    const r = simulate(cfg, "1", 1000);
    const always = r.find((x) => x.policy === "haggle-always");
    expect(always?.moneySaved).toBeGreaterThan(0);
    expect(always?.attackShare).toBeGreaterThan(0);
  });

  it("a whole visit ends", () => {
    expect(isOver(playVisit(createRng("x"), cfg, "haggle-always"))).toBe(true);
  });

  it("haggle-once haggles exactly once and saves between never and always", () => {
    const visit = playVisit(createRng("x"), cfg, "haggle-once");
    expect(visit.haggles).toBe(1);
    const r = simulate(cfg, "1", 1000);
    const never = r.find((x) => x.policy === "haggle-never");
    const once = r.find((x) => x.policy === "haggle-once");
    const always = r.find((x) => x.policy === "haggle-always");
    expect(once?.moneySaved).toBeGreaterThan(never?.moneySaved ?? 0);
    expect(once?.moneySaved).toBeLessThan(always?.moneySaved ?? Number.POSITIVE_INFINITY);
  });

  it("simulate clamps visits to MAX_SIM_VISITS", () => {
    expect(MAX_SIM_VISITS).toBe(2000);
    const capped = simulate(cfg, "1", MAX_SIM_VISITS + 50_000);
    for (const row of capped) {
      expect(row.visits).toBe(MAX_SIM_VISITS);
    }
  });
});
