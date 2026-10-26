import { createRng } from "@dark-tower/rng";
import { describe, expect, it } from "vitest";
import {
  choose,
  DEFAULTS,
  drawSigns,
  fight,
  MAX_RUN_ROUNDS,
  newCave,
  playRun,
  readSign,
  simulate,
} from "./game.ts";

const v = DEFAULTS;

describe("cave game", () => {
  it("is the same for the same seed", () => {
    expect(newCave(createRng("a"), v)).toEqual(newCave(createRng("a"), v));
  });

  it("a right turn goes deeper; a wrong turn costs light and stays", () => {
    const rng = createRng("t");
    const s = newCave(rng, v);
    const right = s.route[0] as number;
    const wrong = (right + 1) % Number(v.branches);
    const w = choose(s, wrong, rng, v);
    expect(w.depth).toBe(0);
    expect(w.light).toBe(Number(v.light) - Number(v.wrongCost));
    expect(w.wrongTurns).toBe(1);
    const r = choose(s, right, rng, v);
    expect(r.depth).toBe(1);
    expect(r.light).toBe(Number(v.light) - Number(v.stepCost));
  });

  it("when the light runs out the beast ambushes", () => {
    const rng = createRng("t");
    let s = newCave(rng, { ...v, light: 4, wrongCost: 2 });
    for (let i = 0; i < 2; i++)
      s = choose(
        s,
        (s.route[s.depth] as number) + 1 >= 3 ? 0 : (s.route[s.depth] as number) + 1,
        rng,
        { ...v, light: 4, wrongCost: 2 },
      );
    expect(s.light).toBe(0);
    expect(s.outcome).toBe("ambush");
    expect(() => choose(s, 0, rng, v)).toThrow();
  });

  it("finding the lair first ends the hunt as a lair, even with no light left", () => {
    const vv = { ...v, depth: 1, light: 1, stepCost: 1 };
    const rng = createRng("t");
    const s = newCave(rng, vv);
    expect(choose(s, s.route[0] as number, rng, vv).outcome).toBe("lair");
  });

  it("the surprise round helps the party in the fight", () => {
    const vv = { ...v, surpriseBonus: 100, ambushBonus: 100 };
    expect(fight("lair", createRng("f"), vv).won).toBe(true);
    expect(fight("ambush", createRng("f"), vv).won).toBe(false);
  });

  it("signs are all true at 100% and all point away at 0%", () => {
    const rng = createRng("s");
    expect(drawSigns(rng, 1, { ...v, trueChance: 1 }).every((s) => s.points === 1)).toBe(true);
    expect(drawSigns(rng, 1, { ...v, trueChance: 0 }).every((s) => s.points !== 1)).toBe(true);
  });

  it("a Beast Advantage reads one sign for sure, once", () => {
    const s = newCave(createRng("b"), v);
    const r = readSign(s, 1);
    expect(r.read).toBe(1);
    expect(() => readSign(r, 0)).toThrow();
    expect(() => readSign(newCave(createRng("b"), { ...v, beastAdvantage: false }), 0)).toThrow();
  });

  it("a run always ends and replays", () => {
    const a = playRun("follows", createRng("r"), v);
    expect(a).toEqual(playRun("follows", createRng("r"), v));
    expect(["lair", "ambush"]).toContain(a.outcome);
  });

  it("a party that follows the signs finds the lair more often than one that guesses", () => {
    const r = simulate(500, "sim", v);
    expect(r.follows.lairShare as number).toBeGreaterThan(r.guesses.lairShare as number);
    expect((r.follows.lairShare as number) + (r.follows.ambushShare as number)).toBeCloseTo(1);
  });

  it("an empty simulation is unavailable, not zero", () => {
    expect(simulate(0, "x", v).follows.lairShare).toBeNull();
  });

  it("playRun terminates when trueChance=0 and wrongCost=0 (follows cannot hang)", () => {
    const vv = { ...v, trueChance: 0, wrongCost: 0, stepCost: 0 };
    const result = playRun("follows", createRng("hang-probe"), vv);
    expect(["lair", "ambush"]).toContain(result.outcome);
    expect(result.rounds).toBeLessThanOrEqual(MAX_RUN_ROUNDS);
    expect(Number.isFinite(result.rounds)).toBe(true);
  });
});
