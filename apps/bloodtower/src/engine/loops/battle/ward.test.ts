import { describe, expect, it } from "vitest";
import { cards, config, hero } from "./fixtures.ts";
import {
  type Action,
  type BattleConfig,
  type BattleState,
  choose,
  continueBattle,
  pick,
  type SpellId,
  saveBattle,
  startBattle,
} from "./index.ts";

/** D3 / 01: R04 EV-01 to EV-06 and EV-11 (the Ward, DEC-908). */

const striga = (over: Partial<BattleConfig["foe"]> = {}): BattleConfig["foe"] => ({
  id: "striga",
  level: 2,
  wounds: 10,
  ward: true,
  cards: cards(0),
  ...over,
});
const caster = (id: string, spells: SpellId[]) =>
  hero(id, { spells, deviceId: `pad-${id}`, fight: 1 });
const make = (over: Partial<BattleConfig> = {}) =>
  startBattle(config({ foe: striga(), script: { rolls: Array(20).fill(false) }, ...over }));

/** Heroes pick in the order given (the tap order); the round resolves on the last pick. */
const round = (s: BattleState, picks: [string, Action][]): BattleState => {
  let next = choose(s, "pad-a", "fight");
  for (const [id, action] of picks) next = pick(next, id, action);
  return next;
};
const spell = (name: SpellId): Action => ({ kind: "spell", spell: name });
const atk: Action = { kind: "attack" };
const lastSpells = (s: BattleState) => {
  const entry = [...s.log].reverse().find((e) => e.kind === "round.spells");
  if (!entry) throw new Error("no round.spells entry");
  return entry.data as {
    cuts: { heroId: string; spell: SpellId; cut: number }[];
    total: number;
    cancelled: { heroId: string; spell: SpellId } | null;
  };
};

describe("R04-D3-EV-01 two spells in one round: the smaller is cancelled", () => {
  const lm = ["lightning", "magic_missile"] as const;
  const run = (seatA: SpellId, seatB: SpellId, tapFirst: "a" | "b") => {
    const picks: [string, Action][] = [
      ["a", spell(seatA)],
      ["b", spell(seatB)],
    ];
    if (tapFirst === "b") picks.reverse();
    return round(make({ heroes: [caster("a", [seatA]), caster("b", [seatB])] }), picks);
  };
  it.each([
    ["A Lightning, B Missile, A taps first", lm[0], lm[1], "a"],
    ["seats swapped", lm[1], lm[0], "a"],
    ["B taps first", lm[0], lm[1], "b"],
  ] as const)("%s: count 6, Missile cancelled, Ward used", (_n, sa, sb, tap) => {
    const s = run(sa, sb, tap);
    expect(s.foe.wounds).toBe(6);
    expect(lastSpells(s).cancelled?.spell).toBe("magic_missile");
    expect(s.foe.wardUsed).toBe(true);
    const lightning = s.heroes.find((h) => h.spells.includes("lightning"));
    expect(lightning?.usedSpells).toEqual(["lightning"]);
  });
});

describe("R04-D3-EV-02 one spell alone draws the Ward; a later spell lands in full", () => {
  it("round 1 Missile cancelled, round 2 Lightning cuts 4", () => {
    const heroes = [caster("a", ["magic_missile", "lightning"]), caster("b", [])];
    const s1 = round(make({ heroes }), [
      ["a", spell("magic_missile")],
      ["b", atk],
    ]);
    expect(s1.foe.wounds).toBe(10);
    expect(s1.foe.wardUsed).toBe(true);
    const s2 = round(s1, [
      ["a", spell("lightning")],
      ["b", atk],
    ]);
    expect(s2.foe.wounds).toBe(6);
    expect(lastSpells(s2).cancelled).toBeNull();
  });
});

describe("R04-D3-EV-03 a cancelled once-a-battle spell is spent", () => {
  it("Fireball cancelled in round 1 cannot be cast in round 2", () => {
    const heroes = [caster("a", ["fireball"]), caster("b", [])];
    const s1 = round(make({ heroes }), [
      ["a", spell("fireball")],
      ["b", atk],
    ]);
    expect(s1.foe.wounds).toBe(10);
    const s2 = choose(s1, "pad-a", "fight");
    expect(() => pick(s2, "a", spell("fireball"))).toThrow(/once a battle/);
  });
});

describe("R04-D3-EV-04 equal cuts: the same result; the caption names the first seat", () => {
  it.each([
    ["a", "b"],
    ["b", "a"],
  ])("seat order %s then %s: count 8, one Missile cancelled, first seat named", (first, second) => {
    const heroes = [caster(first, ["magic_missile"]), caster(second, ["magic_missile"])];
    const s = round(make({ heroes }), [
      [second, spell("magic_missile")],
      [first, spell("magic_missile")],
    ]);
    expect(s.foe.wounds).toBe(8);
    expect(lastSpells(s).cuts).toHaveLength(1);
    expect(lastSpells(s).cancelled?.heroId).toBe(first);
  });
});

describe("R04-D3-EV-05 order: cancel, then flat cuts, then halving", () => {
  it("Ward and Colossus: Missile cancelled, Lightning halved to 2, count 8", () => {
    const heroes = [caster("a", ["lightning"]), caster("b", ["magic_missile"])];
    const s = round(make({ heroes, foe: striga({ colossus: true }) }), [
      ["a", spell("lightning")],
      ["b", spell("magic_missile")],
    ]);
    expect(lastSpells(s).cancelled?.spell).toBe("magic_missile");
    expect(lastSpells(s).cuts.map((c) => c.cut)).toEqual([2]);
    expect(s.foe.wounds).toBe(8);
  });
});

describe("R04-D3-EV-06 the Ward is per battle", () => {
  it("a new battle with the same foe has a fresh Ward", () => {
    const heroes = () => [caster("a", ["magic_missile", "lightning"]), caster("b", [])];
    const one = round(make({ heroes: heroes() }), [
      ["a", spell("magic_missile")],
      ["b", atk],
    ]);
    const two = round(one, [
      ["a", spell("lightning")],
      ["b", atk],
    ]);
    expect(two.foe.wardUsed).toBe(true);
    const left = choose(two, "pad-a", "retreat");
    expect(left.result?.kind).toBe("retreated");
    const next = round(make({ heroes: heroes() }), [
      ["a", spell("magic_missile")],
      ["b", atk],
    ]);
    expect(next.foe.wounds).toBe(10);
    expect(next.foe.wardUsed).toBe(true);
  });
});

describe("R04-D3-EV-11 continue after the Ward", () => {
  it("a restored battle keeps the Ward used and the spell spent", () => {
    const heroes = [caster("a", ["magic_missile", "lightning"]), caster("b", [])];
    const s1 = round(make({ heroes }), [
      ["a", spell("magic_missile")],
      ["b", atk],
    ]);
    const restored = continueBattle(saveBattle(s1));
    expect(restored.foe.wardUsed).toBe(true);
    expect(restored.heroes[0]?.usedSpells).toEqual(["magic_missile"]);
    const s2 = round(restored, [
      ["a", spell("lightning")],
      ["b", atk],
    ]);
    const straight = round(s1, [
      ["a", spell("lightning")],
      ["b", atk],
    ]);
    expect(s2.foe.wounds).toBe(6);
    expect(s2.foe.wounds).toBe(straight.foe.wounds);
  });
});
