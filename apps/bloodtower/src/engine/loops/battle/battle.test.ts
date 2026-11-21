import { describe, expect, it } from "vitest";
import { hintsForLoops } from "../../hints/registry.ts";
import { cards, config, hero, tuning } from "./fixtures.ts";
import {
  BATTLE_LOOP_ID,
  type BattleConfig,
  type BattleState,
  choose,
  pick,
  startBattle,
} from "./index.ts";

/** C4 / 02-battle-loop: EV-01 to EV-10 and EV-22 to EV-29 (the loop, the stance, the gates). */

const kinds = (s: BattleState): string[] => s.log.map((e) => e.kind);
const count = (s: BattleState, kind: string): number => kinds(s).filter((k) => k === kind).length;
const heroOf = (s: BattleState, id: string) => {
  const found = s.heroes.find((h) => h.id === id);
  if (!found) throw new Error(`no hero ${id}`);
  return found;
};

const fight = (s: BattleState): BattleState => choose(s, "pad-a", "fight");
const attackAll = (s: BattleState): BattleState => {
  let next = s;
  for (const h of s.heroes)
    if (!h.out && !next.picks[h.id]) next = pick(next, h.id, { kind: "attack" });
  return next;
};
const round = (s: BattleState): BattleState => attackAll(fight(s));

describe("EV-01 rounds follow MEC-038's order", () => {
  it("logs the round steps in order (stance before abilities, as MEC-038 .37 to .41 has it)", () => {
    const ability = { name: "fire-breath", kind: "hit-each" as const, amount: 1 };
    const s = round(
      startBattle(
        config({
          foe: { id: "dragon", level: 2, cards: cards(), startAbility: ability },
          script: { rolls: [true] },
        }),
      ),
    );
    const wanted = [
      "battle.stance",
      "battle.abilities",
      "round.choice",
      "round.actions",
      "round.spells",
      "round.card",
      "round.result",
    ];
    expect(kinds(s).filter((k) => wanted.includes(k))).toEqual(wanted);
  });
});

describe("EV-02 round cards never repeat before 8", () => {
  it("draws 8 distinct cards, then reshuffles", () => {
    let s = startBattle(
      config({
        heroes: [hero("a", { hp: 999, max: 999 }), hero("b", { hp: 999, max: 999 })],
        foe: { id: "oreks", level: 2, wounds: 9999, cards: cards() },
        script: { rolls: Array.from({ length: 12 }, () => false) },
      }),
    );
    for (let i = 0; i < 9; i++) s = round(s);
    const revealed = s.log.filter((e) => e.kind === "round.reveal").map((e) => e.data.card);
    expect(new Set(revealed.slice(0, 8)).size).toBe(8);
    expect(count(s, "round.reshuffle")).toBe(1);
    expect(revealed).toHaveLength(9);
  });
});

describe("EV-03 a spell kill ends the round", () => {
  it("ends won before the card lands or the roll", () => {
    const s = (() => {
      const start = startBattle(
        config({
          heroes: [hero("a", { spells: ["magic_missile"] }), hero("b")],
          foe: { id: "oreks", level: 2, wounds: 1, cards: cards() },
        }),
      );
      const picked = pick(fight(start), "a", { kind: "spell", spell: "magic_missile" });
      return pick(picked, "b", { kind: "attack" });
    })();
    expect(s.result?.kind).toBe("won");
    expect(kinds(s)).toContain("round.spells");
    expect(kinds(s)).not.toContain("round.card");
    expect(kinds(s)).not.toContain("round.result");
  });
});

describe("EV-04 a hero at 0 sits out with a corruption", () => {
  it("falls, gains one corruption, and is not asked again", () => {
    const s0 = startBattle(
      config({
        heroes: [hero("a", { hp: 1 }), hero("b", { hp: 10 })],
        script: { rolls: [false, false], targets: ["a"] },
      }),
    );
    const s1 = round(s0);
    expect(heroOf(s1, "a").out).toBe(true);
    expect(heroOf(s1, "a").corruptions).toBe(1);
    expect(s1.node).toBe("choice");
    const s2 = fight(s1);
    expect(s2.node).toBe("actions");
    expect(s2.picks.a).toBeUndefined();
    const s3 = pick(s2, "b", { kind: "attack" });
    expect(s3.node).toBe("choice");
    expect(heroOf(s3, "a").corruptions).toBe(1);
  });
});

describe("EV-05 no timer: the round waits for a silent hero", () => {
  it("waits and picks nothing for them", () => {
    let s = fight(startBattle(config()));
    s = pick(s, "a", { kind: "attack" });
    expect(s.node).toBe("actions");
    expect(s.picks.b).toBeUndefined();
    expect(kinds(s)).not.toContain("round.actions");
  });
});

describe("EV-06 headless battles finish", () => {
  it("1,000 seeded battles each exit won, retreated or fallen", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const heroes = Array.from({ length: 1 + (i % 4) }, (_, n) =>
        hero(`h${n}`, { fight: 1 + ((i + n) % 3), hp: 4 + (i % 9), max: 12 }),
      );
      let s = startBattle(
        config({
          seed: `sim-${i}`,
          heroes,
          foe: { id: "oreks", level: 1 + (i % 4), cards: cards() },
        }),
      );
      let guard = 0;
      while (!s.result) {
        if (++guard > 400) throw new Error(`battle ${i} hung`);
        if (s.node === "choice") {
          const retreat = (guard + i) % 7 === 0 && s.round >= 2;
          s = choose(s, "pad-h0", retreat ? "retreat" : "fight");
        } else {
          for (const h of s.heroes)
            if (!h.out && !s.picks[h.id]) s = pick(s, h.id, { kind: "attack" });
        }
      }
      seen.add(s.result.kind);
    }
    for (const kind of seen) expect(["won", "retreated", "fallen"]).toContain(kind);
    expect(seen.size).toBe(3);
  });
});

describe("EV-07 foe abilities fire before round 1", () => {
  it("hits each present hero once, logged before the first round.choice", () => {
    const s = startBattle(
      config({
        foe: {
          id: "x",
          level: 2,
          cards: cards(),
          startAbility: { name: "fixture", kind: "hit-each", amount: 1 },
        },
      }),
    );
    expect(heroOf(s, "a").hp).toBe(9);
    expect(heroOf(s, "b").hp).toBe(9);
    expect(kinds(s).indexOf("battle.abilities")).toBeGreaterThan(-1);
    expect(kinds(s)).not.toContain("round.choice");
    const next = fight(s);
    expect(kinds(next).indexOf("battle.abilities")).toBeLessThan(
      kinds(next).indexOf("round.choice"),
    );
    expect(heroOf(next, "a").hp).toBe(9);
  });
});

describe("EV-08 bold and on guard apply before round 1", () => {
  it.todo(
    "NOT DONE: EV-08 says bold is +1 strength and an on-guard lost round 1 hits no one; DEC-607, MEC-038 .38/.39 and EV-22/EV-25 say bold cuts one and on guard lands the next card. Needs Bob's ruling.",
  );
  it("bold and on guard happen once, before round 1, never again (the DEC-607 reading)", () => {
    const bold = startBattle(
      config({ stance: "bold", foe: { id: "o", level: 2, wounds: 5, cards: cards() } }),
    );
    expect(bold.foe.wounds).toBe(4);
    const after = round({ ...bold, script: { ...bold.script, rolls: [false] } });
    expect(after.foe.wounds).toBe(4);
    expect(count(after, "battle.stance")).toBe(1);
  });
});

describe("EV-09 retreat by the group ends the battle", () => {
  it("ends retreated in round 2 with no actions asked and the foe wounds kept", () => {
    let s = startBattle(config({ script: { rolls: [true] } }));
    s = round(s);
    const wounds = s.foe.wounds;
    expect(s.round).toBe(1);
    s = choose(s, "pad-b", "retreat");
    expect(s.result?.kind).toBe("retreated");
    expect(count(s, "round.actions")).toBe(1);
    expect(s.foe.wounds).toBe(wounds);
    expect(s.result?.foeWounds).toBe(wounds);
  });
  it("refuses a retreat when no move is left", () => {
    const s = startBattle(config({ canRetreat: false }));
    expect(() => choose(s, "pad-a", "retreat")).toThrow(/retreat/i);
  });
  it("the first press decides; a second press changes nothing", () => {
    const s = choose(startBattle(config()), "pad-a", "fight");
    const again = choose(s, "pad-b", "retreat");
    expect(again).toEqual(s);
  });
});

describe("EV-10 a won round cuts, a lost round hits", () => {
  it("cuts 2 on a won round at strength 3, then one hero loses the foe's level", () => {
    let s = startBattle(
      config({
        heroes: [hero("a", { fight: 3 })],
        foe: { id: "o", level: 2, cards: cards() },
        script: { rolls: [true, false] },
      }),
    );
    expect(s.foe.wounds).toBe(8);
    s = round(s);
    expect(s.foe.wounds).toBe(6);
    expect(heroOf(s, "a").hp).toBe(10);
    s = round(s);
    expect(s.foe.wounds).toBe(6);
    expect(heroOf(s, "a").hp).toBe(8);
  });
  it("a guard virtue takes the hit down to 0 (EV-10's reading of DEC-319)", () => {
    let s = startBattle(
      config({
        heroes: [hero("a", { canGuard: true })],
        script: { rolls: [false] },
      }),
    );
    s = pick(fight(s), "a", { kind: "guard" });
    expect(heroOf(s, "a").hp).toBe(10);
  });
  it("a lost round's card lands on a standing hero only", () => {
    const s = round(
      startBattle(
        config({
          heroes: [hero("a", { hp: 0 }), hero("b")],
          script: { rolls: [false] },
        }),
      ),
    );
    expect(heroOf(s, "a").hp).toBe(0);
    expect(heroOf(s, "b").hp).toBe(8);
    expect(tuning().silentSeatSeconds).toBe(30);
  });
});

const stanceCfg = (over: Partial<BattleConfig>): BattleConfig =>
  config({ heroes: [hero("a", { hp: 5, max: 5 })], ...over });

describe("EV-22 bold, foe survives", () => {
  it("cuts once, draws no card, resolves no round", () => {
    const s = startBattle(
      stanceCfg({ stance: "bold", foe: { id: "o", level: 2, wounds: 5, cards: cards() } }),
    );
    expect(s.foe.wounds).toBe(4);
    expect(s.round).toBe(0);
    expect(s.deckPos).toBe(0);
    expect(kinds(s)).not.toContain("round.reveal");
    expect(count(s, "battle.stance")).toBe(1);
    expect(s.node).toBe("choice");
  });
});

describe("EV-23 bold kills the foe on entry", () => {
  it("is won with the reward once, the room cleared, no prompt", () => {
    const s = startBattle(
      stanceCfg({
        stance: "bold",
        tombRoom: true,
        foe: { id: "o", level: 3, wounds: 1, cards: cards() },
      }),
    );
    expect(s.result?.kind).toBe("won");
    expect(s.foe.wounds).toBe(0);
    expect(s.result?.roomCleared).toBe(true);
    expect(s.result?.reward).toEqual({ gold: 6, cardLevel: 3 });
    expect(count(s, "battle.close")).toBe(1);
    expect(kinds(s).some((k) => k.startsWith("round."))).toBe(false);
    expect(s.node).toBe("closed");
  });
});

describe("EV-24 bold kills a foe that has an entry ability", () => {
  for (const [name, kind, amount] of [
    ["ambush", "ambush", 0],
    ["fire-breath", "hit-each", 1],
  ] as const) {
    it(`${name} never fires`, () => {
      const s = startBattle(
        stanceCfg({
          stance: "bold",
          foe: {
            id: "o",
            level: 2,
            wounds: 1,
            cards: cards(),
            startAbility: { name, kind, amount },
          },
        }),
      );
      expect(s.result?.kind).toBe("won");
      expect(heroOf(s, "a").hp).toBe(5);
      expect(kinds(s)).not.toContain("battle.abilities");
    });
  }
});

describe("EV-25 on guard entry is survivable", () => {
  it("lands one card once and stays active", () => {
    const s = startBattle(
      stanceCfg({
        stance: "on-guard",
        foe: { id: "o", level: 2, cards: cards(2) },
        script: { cardOrder: ["card-3"] },
      }),
    );
    expect(heroOf(s, "a").hp).toBe(3);
    expect(s.deckPos).toBe(1);
    expect(s.node).toBe("choice");
    expect(s.result).toBeNull();
    expect(count(s, "battle.stance")).toBe(1);
  });
});

describe("EV-26 on guard fells the whole group", () => {
  it("closes fallen before any prompt, restored to 1, the room not cleared", () => {
    const s = startBattle(
      stanceCfg({
        heroes: [hero("a", { hp: 1, max: 5 })],
        stance: "on-guard",
        tombRoom: true,
        foe: { id: "o", level: 2, cards: cards(2) },
      }),
    );
    expect(s.result?.kind).toBe("fallen");
    expect(heroOf(s, "a").corruptions).toBe(1);
    expect(heroOf(s, "a").hp).toBe(1);
    expect(s.result?.roomCleared).toBe(false);
    expect(s.foe.wounds).toBe(8);
    expect(kinds(s)).not.toContain("battle.last-attack");
    expect(kinds(s).some((k) => k.startsWith("round."))).toBe(false);
    expect(s.result?.goldLoss).toBe(4);
    expect(count(s, "battle.close")).toBe(1);
  });
});

describe("EV-27 a pre-round ability fells the group", () => {
  it("cuts once, breathes once, then closes fallen", () => {
    const s = startBattle(
      stanceCfg({
        heroes: [hero("a", { hp: 1, max: 5 })],
        stance: "bold",
        foe: {
          id: "dragon",
          level: 4,
          wounds: 5,
          cards: cards(),
          startAbility: { name: "fire-breath", kind: "hit-each", amount: 1 },
        },
      }),
    );
    expect(s.foe.wounds).toBe(4);
    expect(s.result?.kind).toBe("fallen");
    expect(count(s, "battle.abilities")).toBe(1);
    expect(heroOf(s, "a").corruptions).toBe(1);
    expect(kinds(s)).not.toContain("round.choice");
    expect(s.result?.roomCleared).toBe(false);
  });
});

describe("EV-28 an entry fall that is the third corruption", () => {
  it("is a game loss once, with no reward, round or second corruption", () => {
    const s = startBattle(
      stanceCfg({
        heroes: [hero("a", { hp: 1, max: 5, corruptions: 2 })],
        stance: "on-guard",
        foe: { id: "o", level: 2, cards: cards(2) },
      }),
    );
    expect(s.result?.kind).toBe("game-lost");
    expect(heroOf(s, "a").corruptions).toBe(3);
    expect(s.result?.reward).toBeNull();
    expect(s.result?.goldLoss).toBe(0);
    expect(count(s, "battle.close")).toBe(1);
    expect(kinds(s).some((k) => k.startsWith("round."))).toBe(false);
  });
  it("a game loss set outside the battle (a port) also stops it first", () => {
    const s = startBattle(
      stanceCfg({ stance: "bold", foe: { id: "o", level: 2, wounds: 1, cards: cards() } }),
      {
        gameLost: () => true,
      },
    );
    expect(s.result?.kind).toBe("game-lost");
    expect(s.result?.reward).toBeNull();
  });
});

describe("EV-29 partial entry fall", () => {
  it("the fallen hero sits out, is not hit again, and returns at battle end", () => {
    let s = startBattle(
      config({
        heroes: [hero("a", { hp: 1, max: 5 }), hero("b", { hp: 5, max: 5 })],
        stance: "on-guard",
        foe: { id: "o", level: 2, cards: cards(2) },
        script: { targets: ["a"], rolls: [false], cardOrder: ["card-1", "card-2"] },
      }),
    );
    expect(heroOf(s, "a").out).toBe(true);
    expect(heroOf(s, "a").corruptions).toBe(1);
    expect(heroOf(s, "b").hp).toBe(5);
    expect(s.node).toBe("choice");
    s = choose(s, "pad-b", "fight");
    expect(Object.keys(s.picks)).toEqual([]);
    s = pick(s, "b", { kind: "attack" });
    expect(heroOf(s, "a").hp).toBe(0);
    expect(heroOf(s, "a").corruptions).toBe(1);
    expect(heroOf(s, "b").hp).toBe(3);
    s = choose(s, "pad-b", "retreat");
    expect(s.result?.kind).toBe("retreated");
    expect(heroOf(s, "a").hp).toBe(1);
  });
});

describe("hint.first-battle (CU/09 registry)", () => {
  it("the battle loop is the registry's `battle` loop and traces its entry", () => {
    expect(BATTLE_LOOP_ID).toBe("battle");
    const s = startBattle(config());
    expect(s.effects).toContainEqual({
      kind: "loop-trace",
      v: 1,
      loopId: "battle",
      phase: "enter",
    });
    const earned = hintsForLoops({ on: true, shown: [] }, [BATTLE_LOOP_ID]);
    expect(earned.map((e) => e.hintId)).toEqual(["hint.first-battle"]);
  });
});
