import { describe, expect, it } from "vitest";
import { config, hero } from "./fixtures.ts";
import {
  addBossRend,
  type BattleConfig,
  type BattleState,
  choose,
  continueBattle,
  deckPiles,
  pick,
  saveBattle,
  startBattle,
} from "./index.ts";

/** D3 / 01: R04 EV-07, EV-08, EV-09, EV-12 (the boss deck, DEC-909). A test trigger fires each phase. */

const deckCards = () =>
  Array.from({ length: 8 }, (_, i) => ({
    id: `c${i + 1}`,
    name: `Card ${i + 1}`,
    hit: 2,
    ...(i < 2 ? { rend: true } : {}),
  }));
const boss = (seed: string): BattleConfig =>
  config({
    seed,
    foe: { id: "warden", level: 2, wounds: 1000, cards: deckCards() },
    heroes: [hero("a", { hp: 100, max: 100 }), hero("b", { hp: 100, max: 100 })],
    script: { rolls: Array(60).fill(false), targets: Array(60).fill("a") },
  });

/** One lost round with no card landing a kill: both heroes attack. */
const play = (s: BattleState): BattleState => {
  let next = choose(s, "pad-a", "fight");
  next = pick(next, "a", { kind: "attack" });
  return pick(next, "b", { kind: "attack" });
};
const until = (seed: string, drawLeft: number): BattleState => {
  let s = startBattle(boss(seed));
  while (deckPiles(s).draw.length > drawLeft) s = play(s);
  return s;
};
const reveals = (s: BattleState) =>
  s.log.filter((e) => e.kind === "round.reveal").map((e) => e.data.card as string);
const hp = (s: BattleState) => s.heroes[0]?.hp ?? -1;
const rendCount = (s: BattleState) => s.cards.filter((c) => c.rend).length;

describe("R04-D3-EV-07 a phase shuffles its Rend into the draw pile only", () => {
  it.each([5, 1, 0])("draw pile at %i", (n) => {
    for (const seed of ["s1", "s2", "s3"]) {
      const before = until(seed, n);
      const piles = deckPiles(before);
      const after = addBossRend(before);
      const now = deckPiles(after);
      expect(now.draw).toHaveLength(n + 1);
      expect(now.draw).toContain("rend-phase-1");
      expect([...now.draw].sort()).toEqual([...piles.draw, "rend-phase-1"].sort());
      expect(after.cards).toHaveLength(9);
      expect(rendCount(after)).toBe(3);
      expect(now.discards).toEqual(piles.discards);
      expect(now.faceUp).toBe(piles.faceUp);
      // Same seed, same order.
      expect(deckPiles(addBossRend(until(seed, n))).draw).toEqual(now.draw);
      if (n === 0) {
        expect(now.draw).toEqual(["rend-phase-1"]);
        expect(reveals(choose(after, "pad-a", "fight")).at(-1)).toBe("rend-phase-1");
      }
    }
  });

  it("the face-up card resolves as it would have: it lands only if the round is lost", () => {
    const base = until("s1", 5);
    const lost = (phase: boolean) => {
      let s = choose(base, "pad-a", "fight");
      if (phase) s = addBossRend(s);
      s = pick(s, "a", { kind: "attack" });
      return pick(s, "b", { kind: "attack" });
    };
    expect(hp(lost(true))).toBe(hp(lost(false)));
    expect(hp(lost(true))).toBe(hp(base) - 2);
    const won = (() => {
      const w = structuredClone(addBossRend(choose(base, "pad-a", "fight")));
      w.script.rolls = [true];
      return pick(pick(w, "a", { kind: "attack" }), "b", { kind: "attack" });
    })();
    expect(hp(won)).toBe(hp(base));
  });
});

describe("R04-D3-EV-08 two phases in one round", () => {
  it("two Rends, one shuffle each, in order; 10 cards, 4 Rends", () => {
    const before = until("s1", 4);
    const piles = deckPiles(before);
    const after = addBossRend(addBossRend(before));
    const now = deckPiles(after);
    expect(now.draw).toHaveLength(6);
    expect(after.cards).toHaveLength(10);
    expect(rendCount(after)).toBe(4);
    expect(now.discards).toEqual(piles.discards);
    expect(now.faceUp).toBe(piles.faceUp);
    expect(after.log.filter((e) => e.kind === "boss.phase").map((e) => e.data.card)).toEqual([
      "rend-phase-1",
      "rend-phase-2",
    ]);
  });
});

describe("R04-D3-EV-09 the cycle counts every card; the panel counts are right", () => {
  it("9 distinct reveals, then a reshuffle of all 9; panel counts match the pile", () => {
    let s = addBossRend(until("s1", 5));
    expect(deckPiles(s).held).toBe(9);
    while (deckPiles(s).draw.length > 0) {
      s = play(s);
      const left = s.deck.slice(s.deckPos);
      const view = deckPiles(s);
      expect(view.cardsLeft).toBe(left.length);
      expect(view.rendsLeft).toBe(
        left.filter((id) => id.startsWith("rend-") || id === "c1" || id === "c2").length,
      );
    }
    expect(new Set(reveals(s))).toHaveLength(9);
    expect(reveals(s)).toHaveLength(9);
    s = choose(s, "pad-a", "fight");
    expect(s.cycle).toBe(1);
    expect([...s.deck].sort()).toEqual(s.cards.map((c) => c.id).sort());
    expect(s.deck).toContain("rend-phase-1");
  });
});

describe("R04-D3-EV-12 continue after a phase", () => {
  it("a restored battle has the same piles and Rend count; no second Rend", () => {
    const fired = addBossRend(until("s1", 5));
    const restored = continueBattle(saveBattle(fired));
    expect(deckPiles(restored)).toEqual(deckPiles(fired));
    expect(rendCount(restored)).toBe(3);
    let a = fired;
    let b = restored;
    for (let i = 0; i < 7; i++) {
      a = play(a);
      b = play(b);
    }
    expect(b.deck).toEqual(a.deck);
    expect(reveals(b)).toEqual(reveals(a));
    expect(rendCount(b)).toBe(3);
    expect(b.cards).toHaveLength(9);
  });
});
