import { eventRng } from "@dark-tower/rng";
import { describe, expect, it } from "vitest";
import { deserializeShellState, serializeShellState } from "../../../server/core/serialize.ts";
import { bindPlayState, initPlayState, type PlayState } from "../../loops/chapter/playState.ts";
import {
  configureDayClock,
  ensureClock,
  heroSheet,
  isCorruptionLoss,
  setBuildingSkulls,
  setHeroSheet,
} from "../../loops/day/clock.ts";
import { rollDayMoves } from "../../loops/day/roll.ts";
import { encounterLoop } from "../../loops/encounter/loop.ts";
import {
  applyPick,
  beginGroupTurn,
  CURE_RISEN_GOLD,
  endGroupTurn,
  ensurePicks,
  openMenu,
  pickPrice,
  setHeroHp,
  setMoves,
  setPurse,
  turnHasEnded,
} from "../../loops/encounter/picks.ts";
import { groupTurnLoop } from "../../loops/group-turn/loop.ts";
import { beginQuest, chooseOption, pickHero } from "../../loops/quest/quest.ts";
import { configureQuests, ensureQuests } from "../../loops/quest/store.ts";
import type { PlainScene } from "../../loops/scene/scene.ts";
import { PROVING_GROUNDS_PLAY } from "../../loops/session/playContent.ts";
import { initialShellState } from "../../loops/session/state.ts";
import {
  CORRUPTION_IDS,
  type CorruptionId,
  drawCorruption,
  gainCorruption,
  type HeroGold,
  mayGive,
} from "./index.ts";

const SEED = "corruption";

const setup = (heroIds: string[] = ["hero-a"]) => {
  const play = initPlayState(SEED, PROVING_GROUNDS_PLAY);
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  group.heroIds = heroIds;
  return { play, group };
};

const hold = (play: PlayState, heroId: string, named: CorruptionId[]) =>
  setHeroSheet(play, heroId, { helpingVirtues: 0, corruptions: named.length, named });

const moveTo = (play: PlayState, groupId: string, building: string, kingdom?: string): void => {
  const space = play.content.board.spaces.find(
    (s) => s.building === building && (!kingdom || s.kingdom === kingdom),
  );
  const group = play.groups.find((g) => g.id === groupId);
  if (!space || !group) throw new Error(`no ${building}`);
  group.spaceId = space.id;
};

const moveToWild = (play: PlayState, groupId: string, kingdom: string): void => {
  const space = play.content.board.spaces.find((s) => !s.building && s.kingdom === kingdom);
  const group = play.groups.find((g) => g.id === groupId);
  if (!space || !group) throw new Error("no wild space");
  group.spaceId = space.id;
};

const stock = (play: PlayState, groupId: string, purse: number, moves = 3): void => {
  setPurse(play, groupId, purse);
  setMoves(play, groupId, moves);
  setHeroHp(play, "hero-a", 4, 12);
};

const purseOf = (play: PlayState, groupId: string): number => ensurePicks(play).purse[groupId] ?? 0;

/** The corruption cost scene: the hero the group picks takes one, then 7 gold is gained. */
const COST_SCENE: PlainScene = {
  id: "cost",
  options: [
    {
      id: "pay",
      label: "Pay with corruption",
      cost: { kind: "corruption" },
      effects: [{ kind: "gold", amount: 7 }],
    },
    { id: "skip", label: "Skip", effects: [{ kind: "flag", flag: "skipped" }] },
  ],
};

describe("C3-08 corruption", () => {
  it("EV-01: the third corruption loses at once and nothing after it runs", () => {
    const { play, group } = setup(["hero-a", "hero-b"]);
    hold(play, "hero-a", ["cruel", "greedy"]);
    configureQuests(play, { defs: [{ id: "cost", chapter: 1, scene: COST_SCENE }] });
    setPurse(play, group.id, 3);
    expect(beginQuest(play, group.id, "cost").ok).toBe(true);
    expect(chooseOption(play, group.id, "cost", "pay").ok).toBe(true);
    const result = pickHero(play, group.id, "cost", "hero-a", SEED);
    expect(result.ok).toBe(true);
    // The loss is on the clock, with its reason, and the quest did not go on.
    expect(ensureClock(play).outcome).toEqual({ lost: true, reason: "corruption" });
    expect(isCorruptionLoss(play)).toBe(true);
    expect(heroSheet(ensureClock(play), "hero-a").corruptions).toBe(3);
    expect(purseOf(play, group.id)).toBe(3); // the 7 gold reward never ran
    expect(ensureQuests(play).done).not.toContain("cost");
    expect(ensureQuests(play).log).not.toContain("gold:7");

    // The turn and the encounter loops stop at once; they do not wait for the day's end.
    bindPlayState(play);
    const ctx = {
      offerPrompt: () => {
        throw new Error("a stopped loop offers nothing");
      },
      startChild: () => {
        throw new Error("a stopped loop starts nothing");
      },
      getParentResult: () => undefined,
    } as never;
    const turn = {
      groupId: group.id,
      movesLeft: 3,
      awaitingPress: false,
      encounterPending: false,
      landedOnBuildingWithNoMoves: false,
    };
    expect(groupTurnLoop.body(turn, ctx).passComplete).toBe(true);
    expect(groupTurnLoop.exit(turn, ctx)).toBe(true);
    const inside = { groupId: group.id, awaitingLeave: false };
    expect(encounterLoop.body(inside, ctx).passComplete).toBe(true);
    expect(encounterLoop.exit(inside, ctx)).toBe(true);
    bindPlayState(null);
  });

  it("a second corruption does not lose", () => {
    const { play } = setup();
    hold(play, "hero-a", ["cruel"]);
    expect(gainCorruption(play, SEED, "hero-a").lost).toBe(false);
    expect(ensureClock(play).outcome).toBeNull();
  });

  it("EV-02: Uncertain ends the turn after a building pick; the moves left are lost", () => {
    const { play, group } = setup();
    hold(play, "hero-a", ["uncertain"]);
    moveTo(play, group.id, "citadel", "N");
    stock(play, group.id, 20, 3);
    beginGroupTurn(play, group.id);
    expect(applyPick(play, SEED, group.id, "rally").ok).toBe(true);
    expect(ensurePicks(play).moves[group.id]).toBe(0);
    expect(turnHasEnded(play, group.id)).toBe(true);

    bindPlayState(play);
    const ctx = { offerPrompt: () => {}, startChild: () => {}, getParentResult: () => undefined };
    const turn = {
      groupId: group.id,
      movesLeft: 2,
      awaitingPress: false,
      encounterPending: false,
      landedOnBuildingWithNoMoves: false,
    };
    const out = groupTurnLoop.body(turn, ctx as never);
    expect(out.local.movesLeft).toBe(0);
    expect(out.passComplete).toBe(true);
    bindPlayState(null);
  });

  it("EV-02: with no Uncertain holder the group keeps moving", () => {
    const { play, group } = setup();
    moveTo(play, group.id, "citadel", "N");
    stock(play, group.id, 20, 3);
    beginGroupTurn(play, group.id);
    applyPick(play, SEED, group.id, "rally");
    expect(ensurePicks(play).moves[group.id]).toBe(2);
    expect(turnHasEnded(play, group.id)).toBe(false);
  });

  it("EV-03: Feeble adds nothing to the move roll", () => {
    const shiftFor = (named: CorruptionId[]) => {
      const { play, group } = setup();
      setHeroSheet(play, "hero-a", { helpingVirtues: 1, corruptions: named.length, named });
      rollDayMoves(play, SEED);
      return ensureClock(play).shifts[group.id];
    };
    expect(shiftFor([])?.virtue).toBe(1);
    expect(shiftFor(["feeble"])?.virtue).toBe(0);
  });

  it("EV-04: Feverish blocks Cleanse at 3 skulls; at 2 it is enabled", () => {
    const { play, group } = setup();
    hold(play, "hero-a", ["feverish"]);
    moveTo(play, group.id, "village", "N");
    stock(play, group.id, 5, 3);
    const cleanse = () => {
      const opened = openMenu(play, group.id);
      if (!opened.ok) throw new Error(opened.reason);
      return opened.entries.find((entry) => entry.id === "cleanse");
    };
    setBuildingSkulls(play, group.spaceId, 3);
    expect(cleanse()?.disabled).toBe(true);
    expect(applyPick(play, SEED, group.id, "cleanse")).toEqual({ ok: false, reason: "feverish" });
    setBuildingSkulls(play, group.spaceId, 2);
    expect(cleanse()?.disabled).toBe(false);
    expect(applyPick(play, SEED, group.id, "cleanse").ok).toBe(true);
  });

  describe("EV-05: each gold-loss corruption fires on its trigger only", () => {
    const run = (
      named: CorruptionId[],
      act: (play: PlayState, groupId: string) => void,
      tuning?: unknown,
    ): number => {
      const { play, group } = setup();
      if (tuning) configureDayClock(play, { tuning });
      hold(play, "hero-a", named);
      stock(play, group.id, 10, 3);
      beginGroupTurn(play, group.id);
      act(play, group.id);
      return purseOf(play, group.id);
    };

    it("Cruel: a village pick −2; a citadel pick 0", () => {
      expect(
        run(["cruel"], (p, g) => {
          moveTo(p, g, "village", "N");
          applyPick(p, SEED, g, "rest");
        }),
      ).toBe(8);
      expect(
        run(["cruel"], (p, g) => {
          moveTo(p, g, "citadel", "N");
          setPurse(p, g, 10);
          applyPick(p, SEED, g, "virtue-draw");
        }),
      ).toBe(0); // the 10 gold draw only; no loss on top
    });

    it("Cruel reads its tuning key: 3 in a test copy gives −3", () => {
      expect(
        run(
          ["cruel"],
          (p, g) => {
            moveTo(p, g, "village", "N");
            applyPick(p, SEED, g, "rest");
          },
          { gold: { corruption: { cruel_loss: 3 } } },
        ),
      ).toBe(7);
    });

    it("Greedy: a bazaar pick −2; a village pick 0", () => {
      expect(
        run(["greedy"], (p, g) => {
          moveTo(p, g, "bazaar", "N");
          setBuildingSkulls(p, p.groups[0]?.spaceId ?? "", 1);
          applyPick(p, SEED, g, "cleanse");
        }),
      ).toBe(8);
      expect(
        run(["greedy"], (p, g) => {
          moveTo(p, g, "village", "N");
          applyPick(p, SEED, g, "rest");
        }),
      ).toBe(10);
    });

    it("Feral: the turn ends on a building's space −2; in the wild 0", () => {
      expect(
        run(["feral"], (p, g) => {
          moveTo(p, g, "citadel", "S");
          endGroupTurn(p, g);
        }),
      ).toBe(8);
      expect(
        run(["feral"], (p, g) => {
          moveToWild(p, g, "S");
          endGroupTurn(p, g);
        }),
      ).toBe(10);
    });

    it("Lost: the turn ends in the holder's home kingdom −1; elsewhere 0", () => {
      // hero-a starts in N.
      expect(
        run(["lost"], (p, g) => {
          moveToWild(p, g, "N");
          endGroupTurn(p, g);
        }),
      ).toBe(9);
      expect(
        run(["lost"], (p, g) => {
          moveToWild(p, g, "E");
          endGroupTurn(p, g);
        }),
      ).toBe(10);
    });

    it("Tempted: every gold buy costs +2; Cleanse (no gold price) takes no extra", () => {
      const { play, group } = setup();
      hold(play, "hero-a", ["tempted"]);
      moveTo(play, group.id, "citadel", "N");
      expect(pickPrice(play, group.id, "rally")).toBe(7);
      expect(pickPrice(play, group.id, "virtue-draw")).toBe(12);
      expect(pickPrice(play, group.id, "cleanse")).toBe(0);
    });
  });

  it("EV-06: a seeded draw, stored by ID, never one the hero holds", () => {
    const draw = () => {
      const { play } = setup();
      const first = gainCorruption(play, SEED, "hero-a");
      const second = gainCorruption(play, SEED, "hero-a");
      return { first, second, named: heroSheet(ensureClock(play), "hero-a").named };
    };
    const a = draw();
    const b = draw();
    expect(a.named).toEqual([a.first.id, a.second.id]);
    expect(a.first.id).not.toBe(a.second.id);
    expect(a.named).toEqual(b.named);
    expect(a.second.count).toBe(2);
  });

  it("EV-07: Selfish cannot give a card but can receive one", () => {
    const { play } = setup(["hero-a", "hero-b"]);
    hold(play, "hero-a", ["selfish"]);
    const hands: Record<string, string[]> = {
      "hero-a": ["courage", "signet"],
      "hero-b": ["mercy", "lamp"],
    };
    // A stand-in pass rule (DEC-894): 1.0 has no give action. Every card-passing rule calls mayGive.
    const pass = (from: string, to: string, card: string): boolean => {
      if (!mayGive(ensureClock(play), from)) return false;
      const at = hands[from]?.indexOf(card) ?? -1;
      if (at < 0) return false;
      hands[from]?.splice(at, 1);
      hands[to]?.push(card);
      return true;
    };
    expect(pass("hero-a", "hero-b", "courage")).toBe(false);
    expect(pass("hero-a", "hero-b", "signet")).toBe(false);
    expect(hands["hero-a"]).toEqual(["courage", "signet"]);
    expect(pass("hero-b", "hero-a", "mercy")).toBe(true);
    expect(pass("hero-b", "hero-a", "lamp")).toBe(true);
    expect(hands["hero-a"]).toEqual(["courage", "signet", "mercy", "lamp"]);
  });

  it("EV-08: 1,000 draws never give Cursed, Suspicious or Weak", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(drawCorruption(eventRng("ev-08", i), []));
    expect([...seen].sort()).toEqual([...CORRUPTION_IDS].sort());
    for (const banned of ["cursed", "suspicious", "weak"]) expect(seen.has(banned)).toBe(false);
  });

  describe("EV-11: price order", () => {
    it("two Tempted holders add +2 once: 5 + 2 = 7", () => {
      const { play, group } = setup(["hero-a", "hero-b"]);
      hold(play, "hero-a", ["tempted"]);
      hold(play, "hero-b", ["tempted"]);
      expect(pickPrice(play, group.id, "rally")).toBe(7);
    });

    it("a free first cure takes no surcharge; the second cure is the risen price plus 2", () => {
      const { play, group } = setup();
      hold(play, "hero-a", ["tempted"]);
      expect(pickPrice(play, group.id, "cure", "hero-a")).toBe(0);
      ensurePicks(play).freeCures.push(`${ensurePicks(play).chapter}:hero-a`);
      expect(pickPrice(play, group.id, "cure", "hero-a")).toBe(CURE_RISEN_GOLD + 2);
    });

    it("Silver Tongue's quarter off comes before the +2 and never cuts it", () => {
      const { play, group } = setup(["bard", "hero-b"]);
      hold(play, "hero-b", ["tempted"]);
      expect(pickPrice(play, group.id, "rally")).toBe(4 + 2);
    });
  });

  describe("EV-12: gold losses fire per holder from their own part", () => {
    const ledgerOf = (parts: Record<string, number>, trace: string[] = []): HeroGold => ({
      get: (heroId) => parts[heroId] ?? 0,
      set: (heroId, gold) => {
        trace.push(`${heroId}=${gold}`);
        parts[heroId] = gold;
      },
    });

    it("each holder pays from their own part, never below 0, never from another", () => {
      const { play, group } = setup(["hero-a", "hero-b"]);
      hold(play, "hero-a", ["cruel"]);
      hold(play, "hero-b", ["cruel"]);
      moveTo(play, group.id, "village", "N");
      stock(play, group.id, 6, 3);
      const parts = { "hero-a": 5, "hero-b": 1, "hero-c": 9 };
      expect(applyPick(play, SEED, group.id, "rest", { gold: ledgerOf(parts) }).ok).toBe(true);
      expect(parts).toEqual({ "hero-a": 3, "hero-b": 0, "hero-c": 9 });
    });

    it("order: pick losses, Uncertain's end of turn, then turn-end losses, Feral once", () => {
      const { play, group } = setup(["hero-a"]);
      hold(play, "hero-a", ["uncertain", "cruel", "feral"]);
      moveTo(play, group.id, "village", "N");
      stock(play, group.id, 6, 3);
      beginGroupTurn(play, group.id);
      const trace: string[] = [];
      const parts = { "hero-a": 6 };
      const gold = ledgerOf(parts, trace);
      expect(applyPick(play, SEED, group.id, "rest", { gold }).ok).toBe(true);
      expect(turnHasEnded(play, group.id)).toBe(true);
      expect(trace).toEqual(["hero-a=4", "hero-a=2"]); // Cruel, then Feral
      endGroupTurn(play, group.id, gold); // the loop's own end: no second Feral
      expect(trace).toHaveLength(2);
    });
  });

  describe("EV-09 and EV-10: named corruptions survive Continue and a restart", () => {
    const roundTrip = (play: PlayState): PlayState => {
      const shell = { ...initialShellState({ sessionId: "s", seed: SEED }), play };
      const row = JSON.parse(JSON.stringify(serializeShellState(shell))) as never;
      const restored = deserializeShellState(row).play;
      if (!restored) throw new Error("the checkpoint lost the play state");
      return restored;
    };

    it("EV-09: Feral still fires after Continue", () => {
      const { play, group } = setup();
      hold(play, "hero-a", ["feral"]);
      const restored = roundTrip(play);
      expect(restored).not.toBe(play);
      const again = restored.groups[0];
      if (!again) throw new Error("no group");
      moveTo(restored, again.id, "citadel", "S");
      setPurse(restored, again.id, 10);
      beginGroupTurn(restored, again.id);
      endGroupTurn(restored, again.id);
      expect(purseOf(restored, again.id)).toBe(8);
      expect(heroSheet(ensureClock(restored), "hero-a").named).toEqual(["feral"]);
      expect(group.id).toBe(again.id);
    });

    it("EV-10: Feral and Lost both survive a restart and both fire (−2 and −1)", () => {
      const { play } = setup();
      hold(play, "hero-a", ["feral", "lost"]);
      const restored = roundTrip(roundTrip(play));
      const sheet = heroSheet(ensureClock(restored), "hero-a");
      expect(sheet.named).toEqual(["feral", "lost"]);
      expect(sheet.corruptions).toBe(2);
      const group = restored.groups[0];
      if (!group) throw new Error("no group");
      moveTo(restored, group.id, "citadel", "N"); // a building in hero-a's home kingdom
      setPurse(restored, group.id, 10);
      beginGroupTurn(restored, group.id);
      endGroupTurn(restored, group.id);
      expect(purseOf(restored, group.id)).toBe(7);
    });
  });
});
