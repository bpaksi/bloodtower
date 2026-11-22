import { describe, expect, it } from "vitest";
import { cards, config, hero, tuning } from "./fixtures.ts";
import {
  type BattleConfig,
  type BattleState,
  choose,
  continueBattle,
  pick,
  saveBattle,
  startBattle,
} from "./index.ts";

/** D2 / 01: R04 EV-10, EV-11, EV-12, EV-14, EV-18 (the won round: cut, then the gate, then Spines). */

const oneCutTuning = () => ({ ...tuning(), wonRoundMinimum: 1 });
const fiends = (wounds: number) => ({
  id: "spine-fiends",
  level: 2,
  wounds,
  wonRoundAbility: "spines" as const,
  cards: cards(),
});
const kinds = (s: BattleState) => s.log.map((e) => e.kind);
const heroOf = (s: BattleState, id: string) => {
  const found = s.heroes.find((h) => h.id === id);
  if (!found) throw new Error(`no hero ${id}`);
  return found;
};
/** A won round: every standing hero attacks, the roll is injected as won, the cut is 1 (fight 1). */
const wonRound = (s: BattleState, ports = {}): BattleState => {
  let next = choose(s, "pad-a", "fight", ports);
  for (const h of next.heroes)
    if (!h.out && !next.picks[h.id]) next = pick(next, h.id, { kind: "attack" }, ports);
  return next;
};
const make = (over: Partial<BattleConfig>, ports = {}) =>
  startBattle(config({ tuning: oneCutTuning(), script: { rolls: [true] }, ...over }), ports);

describe("R04-EV-10 Spines does not fire on the final cut", () => {
  it("wins at once with the hero untouched", () => {
    const s = wonRound(make({ foe: fiends(1), heroes: [hero("a", { fight: 1, hp: 1, max: 5 })] }));
    expect(s.result?.kind).toBe("won");
    expect(kinds(s)).not.toContain("round.spines");
    expect(heroOf(s, "a").hp).toBe(1);
    expect(heroOf(s, "a").corruptions).toBe(0);
    expect(s.result?.reward).toEqual({ gold: 4, cardLevel: 2 });
    expect(s.result?.goldLoss).toBe(0);
    expect(kinds(s).filter((k) => k === "battle.close")).toHaveLength(1);
    expect(s.node).toBe("closed");
  });
});

describe("R04-EV-11 Spines on a non-final cut", () => {
  it("(a) a solo hero at 1 HP falls with the foe standing: closed fallen once", () => {
    const s = wonRound(make({ foe: fiends(3), heroes: [hero("a", { fight: 1, hp: 1, max: 5 })] }));
    expect(s.foe.wounds).toBe(2);
    expect(kinds(s).filter((k) => k === "round.spines")).toHaveLength(1);
    expect(s.result?.kind).toBe("fallen");
    expect(s.result?.foeWounds).toBe(2);
    expect(s.result?.goldLoss).toBe(4);
    expect(s.result?.reward).toBeNull();
    expect(heroOf(s, "a").corruptions).toBe(1);
    expect(heroOf(s, "a").hp).toBe(1);
    expect(kinds(s).filter((k) => k === "battle.close")).toHaveLength(1);
  });

  it("(b) hits only the highest fight number; the fight goes on with one standing hero", () => {
    const s = wonRound(
      make({
        foe: fiends(6),
        heroes: [hero("a", { fight: 3, hp: 1, max: 5 }), hero("b", { fight: 1, hp: 5, max: 5 })],
      }),
    );
    expect(heroOf(s, "a").out).toBe(true);
    expect(heroOf(s, "a").corruptions).toBe(1);
    expect(heroOf(s, "b").hp).toBe(5);
    expect(s.result).toBeNull();
    expect(s.node).toBe("choice");
  });

  it("a foe with no Spines takes no extra hit after a won round", () => {
    const s = wonRound(
      make({
        foe: { id: "oreks", level: 2, wounds: 3, cards: cards() },
        heroes: [hero("a", { fight: 1, hp: 1, max: 5 })],
      }),
    );
    expect(kinds(s)).not.toContain("round.spines");
    expect(heroOf(s, "a").hp).toBe(1);
    expect(s.node).toBe("choice");
  });
});

describe("R04-EV-12 Spines' third corruption loses the game first", () => {
  it("runs no close step", () => {
    const s = wonRound(
      make({
        foe: fiends(3),
        heroes: [hero("a", { fight: 1, hp: 1, max: 5, corruptions: 2 })],
      }),
    );
    expect(s.result?.kind).toBe("game-lost");
    expect(s.result?.reward).toBeNull();
    expect(s.result?.goldLoss).toBe(0);
    expect(heroOf(s, "a").corruptions).toBe(3);
    expect(kinds(s).filter((k) => k === "battle.close")).toHaveLength(1);
  });
});

describe("R04-EV-14 Continue after Spines lands", () => {
  it("resumes at the next node and does not fire Spines or the cut again", () => {
    const heroes = [hero("a", { fight: 3, hp: 1, max: 5 }), hero("b", { fight: 1, hp: 5, max: 5 })];
    const live = wonRound(make({ foe: fiends(6), heroes }));
    const back = continueBattle(saveBattle(live));
    expect(back).toEqual({ ...live, silence: { elapsed: 0, paused: false } });
    expect(kinds(back).filter((k) => k === "round.spines")).toHaveLength(1);
    expect(back.foe.wounds).toBe(4);
    expect(back.node).toBe("choice");
    expect(heroOf(back, "a").out).toBe(true);
    expect(back.deckPos).toBe(live.deckPos);
  });
});

describe("R04-EV-18 a Spines tie is a seeded pick, no prompt", () => {
  const run = (seed: string): string => {
    const s = wonRound(
      make({
        seed,
        foe: fiends(9),
        heroes: [hero("a", { fight: 3, hp: 5, max: 5 }), hero("b", { fight: 3, hp: 5, max: 5 })],
      }),
    );
    const hurt = s.heroes.filter((h) => h.hp < 5);
    expect(hurt).toHaveLength(1);
    expect(hurt[0]?.hp).toBe(4);
    expect(s.node).toBe("choice");
    return (hurt[0] as { id: string }).id;
  };

  it("hits exactly one tied hero, the same one per seed, and both across seeds", () => {
    const hit = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const first = run(`tie-${i}`);
      expect(run(`tie-${i}`)).toBe(first);
      hit.add(first);
    }
    expect([...hit].sort()).toEqual(["a", "b"]);
  });
});
