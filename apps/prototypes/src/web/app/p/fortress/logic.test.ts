import { describe, expect, it } from "vitest";
import { createRng } from "../../../lib/rng.ts";
import {
  autoPlay,
  championStrength,
  defaults,
  duel,
  nextVisit,
  simulate,
  start,
  toggleSoften,
} from "./logic.ts";

const base = () => ({ ...defaults(), partyDice: "+0", championDice: "+0", partyWinsTies: true });

describe("fortress logic", () => {
  it("climbs on a win and finishes at the top", () => {
    const v = { ...base(), rungs: 2, duelsPerVisit: 5 };
    let s = start(v);
    s = duel(s, createRng(1), v, 99);
    expect(s.rung).toBe(2);
    s = duel(s, createRng(1), v, 99);
    expect(s.status).toBe("done");
  });
  it("drops one rung on a loss and needs Next visit", () => {
    const v = { ...base(), rungs: 3 };
    let s = { ...start(v), rung: 2 };
    s = duel(s, createRng(1), v, 0);
    expect(s.rung).toBe(1);
    expect(s.status).toBe("betweenVisits");
    expect(() => duel(s, createRng(1), v, 0)).toThrow();
    s = nextVisit(s, v);
    expect(s.visit).toBe(2);
    expect(s.status).toBe("inVisit");
  });
  it("never drops below rung 1", () => {
    const v = base();
    expect(duel(start(v), createRng(1), v, 0).rung).toBe(1);
  });
  it("a visit ends after the duels per visit", () => {
    const v = { ...base(), duelsPerVisit: 1 };
    expect(duel(start(v), createRng(1), v, 99).status).toBe("betweenVisits");
  });
  it("champions get stronger by the step", () => {
    const v = { ...base(), baseStrength: 3, stepStrength: 2 };
    expect(championStrength(3, v)).toBe(7);
  });
  it("an Advantage softens exactly one duel and is spent", () => {
    const v = { ...base(), baseStrength: 5, soften: 3, advantages: 1, duelsPerVisit: 9 };
    let s = toggleSoften(start(v));
    expect(s.softenNext).toBe(true);
    s = duel(s, createRng(1), v, 3); // 3+3 vs 5: win
    expect(s.duels[0]?.won).toBe(true);
    expect(s.duels[0]?.softened).toBe(true);
    expect(s.advantages).toBe(0);
    expect(toggleSoften(s).softenNext).toBe(false);
  });
  it("same seed replays the same simulation", () => {
    const v = { ...defaults(), simRuns: 50 };
    expect(simulate(v, "s", [3])).toEqual(simulate(v, "s", [3]));
  });
  it("more Might never needs more visits on average", () => {
    const v = { ...defaults(), simRuns: 500 };
    const r = simulate(v, "1", [1, 3, 5, 7]);
    const m = r.map((x) => x.meanVisits ?? Number.POSITIVE_INFINITY);
    expect(m[0]).toBeGreaterThanOrEqual(m[1] as number);
    expect(m[1]).toBeGreaterThanOrEqual(m[2] as number);
    expect(m[2]).toBeGreaterThanOrEqual(m[3] as number);
  });
  it("a capped run is reported as capped", () => {
    const v = { ...defaults(), visitCap: 3 };
    const s = autoPlay(createRng(1), v, 0, 3);
    expect(s.status).not.toBe("done");
    expect(s.visit).toBeLessThanOrEqual(3);
  });
});
