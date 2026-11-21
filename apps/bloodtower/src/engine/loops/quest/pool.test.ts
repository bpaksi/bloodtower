import { describe, expect, it } from "vitest";
import { initPlayState, type PlayState } from "../chapter/playState.ts";
import { ensureClock, heroSheet, setHeroSheet } from "../day/clock.ts";
import { commitLive, loadLive } from "../encounter/picks.ts";
import type { PlainScene } from "../scene/scene.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { beginQuest, chooseOption } from "./quest.ts";
import { configureQuests, ensureQuests } from "./store.ts";

/** D5 / 01-pool-pays, EV-11: a quest option's gold price uses the pool (DEC-944, DEC-911). */

const SCENE: PlainScene = {
  id: "toll-gate",
  options: [
    {
      id: "buy",
      label: "Buy passage",
      cost: { kind: "gold", amount: 10 },
      effects: [{ kind: "flag", flag: "passed" }],
    },
  ],
};

const setup = (gold: Record<string, number>) => {
  const play = initPlayState("d5-quest", PROVING_GROUNDS_PLAY);
  play.groups.forEach((group, i) => {
    group.heroIds = i === 0 ? ["hero-a"] : i === 1 ? ["hero-b"] : [];
  });
  for (const [id, amount] of Object.entries(gold)) {
    setHeroSheet(play, id, { helpingVirtues: 0, corruptions: 0, gold: amount });
  }
  configureQuests(play, {
    defs: [{ id: "toll-gate", chapter: 1, scene: SCENE }],
    tuning: { questGold: 0 },
  });
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  return { play, group };
};

const goldOf = (play: PlayState, id: string): number | undefined =>
  heroSheet(ensureClock(play), id).gold;

describe("D5 EV-11: a quest option's gold price uses the pool", () => {
  it("hero-a 0, hero-b (another group) 10: the option is enabled and hero-b pays the 10", () => {
    const { play, group } = setup({ "hero-a": 0, "hero-b": 10 });
    loadLive(play, group.id, 3);
    const view = beginQuest(play, group.id, "toll-gate");
    expect(view.ok && view.view.options).toEqual([
      { id: "buy", label: "Buy passage", disabled: false },
    ]);
    const chosen = chooseOption(play, group.id, "toll-gate", "buy");
    expect(chosen.ok).toBe(true);
    commitLive(play, group.id);
    expect(goldOf(play, "hero-a")).toBe(0);
    expect(goldOf(play, "hero-b")).toBe(0);
    expect(ensureQuests(play).log).toContain("cost-gold:10");
    expect(ensureQuests(play).log).toContain("flag:passed");
  });

  it("a pool one coin short greys the option and takes nothing", () => {
    const { play, group } = setup({ "hero-a": 4, "hero-b": 5 });
    loadLive(play, group.id, 3);
    const view = beginQuest(play, group.id, "toll-gate");
    expect(view.ok && view.view.options[0]?.disabled).toBe(true);
    expect(chooseOption(play, group.id, "toll-gate", "buy")).toEqual({
      ok: false,
      reason: "disabled",
    });
    commitLive(play, group.id);
    expect(goldOf(play, "hero-a")).toBe(4);
    expect(goldOf(play, "hero-b")).toBe(5);
  });
});
