import { describe, expect, it } from "vitest";
import { cards, config, hero, tuning } from "./fixtures.ts";
import {
  type BattleState,
  choose,
  continueBattle,
  offers,
  pick,
  saveBattle,
  startBattle,
  tick,
} from "./index.ts";

/** C4 / 02-battle-loop: EV-11 and EV-19 (engine half), EV-30 to EV-32 (Continue replays nothing). */

const restore = (s: BattleState): BattleState => continueBattle(saveBattle(s));

/** Plays a battle to its end; with `viaSave` it saves and restores at every waiting point. */
const drive = (start: BattleState, viaSave: boolean): BattleState => {
  let s = start;
  let guard = 0;
  while (!s.result) {
    if (++guard > 200) throw new Error("hung");
    if (viaSave) s = restore(s);
    if (s.node === "choice") {
      s = choose(s, "pad-a", s.round >= 2 ? "retreat" : "fight");
    } else {
      for (const h of s.heroes) if (!h.out && !s.picks[h.id]) s = pick(s, h.id, { kind: "attack" });
    }
  }
  return viaSave ? restore(s) : s;
};

describe("EV-11 Continue resumes mid-round (engine)", () => {
  it("keeps the round, the foe wounds and the one pick", () => {
    let s = startBattle(config({ script: { rolls: [true, true] } }));
    s = choose(s, "pad-a", "fight");
    s = pick(s, "a", { kind: "attack" });
    const back = restore(s);
    expect(back.round).toBe(s.round);
    expect(back.foe.wounds).toBe(s.foe.wounds);
    expect(back.picks).toEqual({ a: { kind: "attack" } });
    expect(back.node).toBe("actions");
    expect(back.deckPos).toBe(s.deckPos);
  });
});

describe("EV-19 Continue during the wait keeps picks and restarts the clock", () => {
  it("shows no stale offer, and the offer returns 30 s after Continue", () => {
    let s = startBattle(config({ tuning: tuning(30), heroes: [hero("a"), hero("b"), hero("c")] }));
    s = choose(s, "pad-a", "fight");
    s = pick(s, "a", { kind: "attack" });
    s = pick(s, "b", { kind: "attack" });
    s = tick(s, 20);
    let back = restore(s);
    expect(back.picks.a).toEqual({ kind: "attack" });
    expect(back.picks.b).toEqual({ kind: "attack" });
    expect(offers(back)).toEqual([]);
    back = tick(back, 10);
    expect(offers(back)).toEqual([]);
    back = tick(back, 20);
    expect(offers(back).map((o) => o.heroId)).toEqual(["c"]);
  });
});

describe("EV-30 Continue after an applied Bold cut", () => {
  it("does not cut again, replay the cue or repeat the ability", () => {
    const ability = { name: "fixture", kind: "hit-each" as const, amount: 1 };
    const fresh = startBattle(
      config({
        stance: "bold",
        foe: { id: "o", level: 2, wounds: 5, cards: cards(), startAbility: ability },
      }),
    );
    expect(fresh.foe.wounds).toBe(4);
    const back = restore(fresh);
    expect(back.foe.wounds).toBe(4);
    expect(back.log).toEqual(fresh.log);
    expect(back.effects).toEqual(fresh.effects);
    // A save taken after the cut, before the pending ability (hand-built from the fresh state).
    const pending: BattleState = JSON.parse(saveBattle(fresh));
    pending.abilitiesApplied = false;
    pending.node = "entry";
    pending.heroes = pending.heroes.map((h) => ({ ...h, hp: 10 }));
    pending.log = pending.log.filter((e) => e.kind !== "battle.abilities");
    const resumed = restore(pending);
    expect(resumed.foe.wounds).toBe(4);
    expect(resumed.heroes.map((h) => h.hp)).toEqual([9, 9]);
    expect(resumed.log.filter((e) => e.kind === "battle.stance")).toHaveLength(1);
    expect(resumed.log.filter((e) => e.kind === "battle.horn")).toHaveLength(1);
  });
});

describe("EV-31 Continue after an On guard attack", () => {
  it("does not draw the card or hit again", () => {
    const fresh = startBattle(
      config({
        heroes: [hero("a", { hp: 5, max: 5 })],
        stance: "on-guard",
        foe: { id: "o", level: 2, cards: cards(2) },
      }),
    );
    expect(fresh.heroes[0]?.hp).toBe(3);
    const back = restore(fresh);
    expect(back.heroes[0]?.hp).toBe(3);
    expect(back.deckPos).toBe(1);
    expect(back.log).toEqual(fresh.log);
  });
});

describe("EV-32 Continue and restore keep the entry effect", () => {
  const cases: [string, () => ReturnType<typeof config>][] = [
    [
      "after the cut",
      () => config({ stance: "bold", foe: { id: "o", level: 2, wounds: 5, cards: cards() } }),
    ],
    [
      "after the on guard attack",
      () => config({ stance: "on-guard", foe: { id: "o", level: 2, cards: cards(2) } }),
    ],
    ["after a retreat", () => config({ script: { rolls: [true, false] } })],
    [
      "after a fall",
      () =>
        config({
          heroes: [hero("a", { hp: 1, max: 5 })],
          stance: "on-guard",
          foe: { id: "o", level: 2, cards: cards(2) },
        }),
    ],
  ];
  for (const [name, make] of cases) {
    it(`matches an uninterrupted run ${name}`, () => {
      const plain = drive(startBattle(make()), false);
      const saved = drive(restore(startBattle(make())), true);
      expect(saved.heroes).toEqual(plain.heroes);
      expect(saved.foe).toEqual(plain.foe);
      expect(saved.deckPos).toBe(plain.deckPos);
      expect(saved.result).toEqual(plain.result);
      expect(saved.log).toEqual(plain.log);
      expect(saved.log.filter((e) => e.kind === "battle.stance")).toHaveLength(1);
      expect(saved.log.filter((e) => e.kind === "battle.close")).toHaveLength(1);
    });
  }
});
