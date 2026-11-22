import { describe, expect, it } from "vitest";
import { config, hero, tuning } from "./fixtures.ts";
import {
  type BattleState,
  choose,
  offers,
  pauseClock,
  pick,
  pickFor,
  resumeClock,
  startBattle,
  tick,
  waitingFor,
} from "./index.ts";

/** C4 / 02-battle-loop: EV-12 to EV-18, EV-20, EV-21 (PT-20: "Pick for <hero>" after a silent seat). */

const four = (silent = 30) =>
  startBattle(
    config({
      tuning: tuning(silent),
      heroes: [
        hero("a", { canGuard: true }),
        hero("b"),
        hero("c", { canGuard: true }),
        hero("d", { hp: 1, max: 10 }),
      ],
      script: { rolls: [false], targets: ["d"] },
    }),
  );

/** Round 1 is a lost round that fells D, so D sits out with an iPad still in the group. */
const inActions = (s: BattleState): BattleState => {
  let next = choose(s, "pad-a", "fight");
  next = pick(next, "a", { kind: "attack" });
  next = pick(next, "b", { kind: "attack" });
  next = pick(next, "c", { kind: "attack" });
  next = pick(next, "d", { kind: "attack" });
  next = choose(next, "pad-a", "fight");
  return next;
};

const forC = (s: BattleState) => offers(s).filter((o) => o.heroId === "c");

describe("EV-12 a silent seat draws 'Pick for <hero>' on the other iPads", () => {
  it("shows at 30.0 s, not 29.9 s, on A, B and D but not C", () => {
    let s = inActions(four());
    expect(s.heroes.find((h) => h.id === "d")?.out).toBe(true);
    s = pick(s, "a", { kind: "attack" });
    s = pick(s, "b", { kind: "attack" });
    s = tick(s, 29.9);
    expect(offers(s)).toEqual([]);
    s = tick(s, 0.1);
    expect(offers(s)).toEqual([
      { kind: "pick-for", heroId: "c", shownOn: ["pad-a", "pad-b", "pad-d"] },
    ]);
    expect(waitingFor(s)).toEqual(["c"]);
  });
});

describe("EV-13 pressing it sets Guard and the round goes on", () => {
  it("the first press wins; a later one changes and logs nothing", () => {
    let s = inActions(four());
    s = pick(s, "a", { kind: "attack" });
    s = pick(s, "b", { kind: "attack" });
    s = tick(s, 30);
    const pressed = pickFor(s, { deviceId: "pad-a", heroId: "c" });
    expect(pressed.log.find((e) => e.kind === "round.pick-for")?.data).toEqual({
      by: "pad-a",
      heroId: "c",
      action: "guard",
    });
    expect(pressed.log.some((e) => e.kind === "round.actions" && e.data.round === 2)).toBe(true);
    const later = pickFor(pressed, { deviceId: "pad-b", heroId: "c" });
    expect(later).toEqual(pressed);
    expect(pressed.log.filter((e) => e.kind === "round.pick-for")).toHaveLength(1);
  });
});

describe("EV-14 nothing is picked without a press", () => {
  it("300 s of silence picks nothing and hits no one", () => {
    let s = inActions(four());
    s = pick(s, "a", { kind: "attack" });
    s = pick(s, "b", { kind: "attack" });
    const hp = s.heroes.map((h) => h.hp);
    s = tick(s, 300);
    expect(forC(s)).toHaveLength(1);
    expect(s.picks.c).toBeUndefined();
    expect(s.log.filter((e) => e.kind === "round.actions")).toHaveLength(1);
    expect(s.heroes.map((h) => h.hp)).toEqual(hp);
  });
});

describe("EV-15 the seconds are a tuning value", () => {
  it("shows at 10 s and not 9.9 s when the tuning says 10", () => {
    let s = inActions(four(10));
    s = tick(s, 9.9);
    expect(offers(s)).toEqual([]);
    s = tick(s, 0.1);
    expect(offers(s).length).toBeGreaterThan(0);
  });
});

describe("EV-16 the clock runs only for a hero who can answer, and stops on a pause", () => {
  it("(a) a hero who picked at 20 s is never offered", () => {
    let s = inActions(four());
    s = tick(s, 20);
    s = pick(s, "c", { kind: "attack" });
    s = tick(s, 100);
    expect(forC(s)).toEqual([]);
  });
  it("(b) a sat-out hero is never offered, though its iPad sees offers", () => {
    let s = inActions(four());
    s = tick(s, 30);
    expect(offers(s).some((o) => o.heroId === "d")).toBe(false);
    expect(offers(s).every((o) => o.shownOn.includes("pad-d"))).toBe(true);
  });
  it("(c) paused time does not count", () => {
    let s = inActions(four());
    s = tick(s, 25);
    s = pauseClock(s);
    s = tick(s, 60);
    s = resumeClock(s);
    expect(offers(s)).toEqual([]);
    s = tick(s, 5);
    expect(offers(s).length).toBeGreaterThan(0);
  });
});

describe("EV-17 the hero's own pick cancels the offer", () => {
  it("withdraws the offer, and a late press does nothing", () => {
    let s = inActions(four());
    s = tick(s, 30);
    expect(forC(s)).toHaveLength(1);
    s = pick(s, "c", { kind: "attack" });
    expect(forC(s)).toEqual([]);
    const late = pickFor(s, { deviceId: "pad-a", heroId: "c" });
    expect(late.picks.c).toEqual({ kind: "attack" });
    expect(late.log).toEqual(s.log);
  });
});

describe("EV-18 pick for sends nothing to the tower", () => {
  it("adds no effect from the offer or its press", () => {
    let s = inActions(four());
    s = pick(s, "a", { kind: "attack" });
    s = pick(s, "b", { kind: "attack" });
    const before = JSON.stringify(s.effects);
    s = tick(s, 30);
    expect(JSON.stringify(s.effects)).toBe(before);
    s = pickFor(s, { deviceId: "pad-a", heroId: "c" });
    expect(JSON.stringify(s.effects)).toBe(before);
    expect(s.effects.every((e) => e.kind === "loop-trace" || e.kind === "cue")).toBe(true);
  });
});

describe("EV-20 'Pick for' a hero who cannot Guard sets a normal attack", () => {
  it("C (no guard) gets attack, A (guard) gets guard, each logged", () => {
    let s = startBattle(
      config({
        tuning: tuning(30),
        heroes: [hero("a", { canGuard: true }), hero("b"), hero("c", { canGuard: false })],
      }),
    );
    s = choose(s, "pad-a", "fight");
    s = pick(s, "b", { kind: "attack" });
    s = tick(s, 30);
    expect(offers(s).find((o) => o.heroId === "a")?.shownOn).not.toContain("pad-a");
    s = pickFor(s, { deviceId: "pad-b", heroId: "c" });
    expect(s.picks.c).toEqual({ kind: "attack" });
    s = pickFor(s, { deviceId: "pad-b", heroId: "a" });
    expect(s.log.filter((e) => e.kind === "round.pick-for").map((e) => e.data)).toEqual([
      { by: "pad-b", heroId: "c", action: "attack" },
      { by: "pad-b", heroId: "a", action: "guard" },
    ]);
  });
  it("a hero's own iPad cannot press its own offer", () => {
    let s = startBattle(config({ tuning: tuning(30) }));
    s = tick(choose(s, "pad-a", "fight"), 30);
    const same = pickFor(s, { deviceId: "pad-a", heroId: "a" });
    expect(same.picks.a).toBeUndefined();
  });
});

describe("EV-21 the offer is for the round pick only", () => {
  it("makes no offer while Fight or Retreat is unanswered, and a press still decides", () => {
    let s = startBattle(config({ tuning: tuning(30) }));
    s = tick(s, 300);
    expect(offers(s)).toEqual([]);
    expect(s.choice).toBeNull();
    s = choose(s, "pad-b", "fight");
    expect(s.node).toBe("actions");
  });
});
