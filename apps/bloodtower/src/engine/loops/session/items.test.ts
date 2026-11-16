import { describe, expect, it } from "vitest";
import { gearRows, NO_ITEMS } from "../../../web/components/device/gearMenu.ts";
import { initPlayState } from "../chapter/playState.ts";
import { TEST_STORY } from "./pack.ts";
import { PROVING_GROUNDS_PLAY } from "./playContent.ts";
import { initialShellState, type ShellState } from "./state.ts";
import { stepShell } from "./stepShell.ts";
import { projectShellView } from "./view.ts";

/** A game in play with `acting` taking its turn; hero B holds two potions at 2 of 10 HP. */
const playFor = (seed: string) => {
  const play = initPlayState(seed, PROVING_GROUNDS_PLAY);
  play.dayNumber = 1;
  return play;
};

const inPlay = (acting: string): ShellState => {
  const seed = "s~test-items:hero-b=potion+potion~test-hp:hero-b=2/10~test-gold:hero-b=7";
  const state = initialShellState({ sessionId: "s", seed, stories: [TEST_STORY] });
  return {
    ...state,
    screen: "play",
    stage: "playing",
    play: playFor(seed),
    loops: {
      ...state.loops,
      stack: [
        {
          loopId: "group-turn",
          phase: "body",
          local: { groupId: acting, movesLeft: 2, awaitingPress: true },
          finishing: false,
        },
      ],
    } as ShellState["loops"],
  };
};

const gear = (state: ShellState, fields: Record<string, unknown>) =>
  stepShell(state, {
    kind: "gear",
    v: 1,
    deviceId: "pad-1",
    action: "pick",
    ...fields,
  } as never);

const potionOf = (state: ShellState, heroId: string) =>
  projectShellView(state).gear?.party.find((hero) => hero.id === heroId);

describe("use-item through the gear (CU/13)", () => {
  it("EV-07, EV-17: open, pick the hero, pick the potion; once, same path for the host", () => {
    let state = inPlay("hero-b");
    state = stepShell(state, {
      kind: "gear",
      v: 1,
      deviceId: "pad-1",
      action: "open",
      item: "use-potion",
    }).state;
    expect(state.gearPanel).toBe("items");
    expect(state.gearPaused).toBe(true);
    state = gear(state, { pick: "Hero B", heroId: "hero-b" }).state;
    expect(state.gearFirstHero).toBe("hero-b");
    const used = gear(state, { item: "items", pick: "potion", heroId: "hero-b" });
    expect(used.effects.filter((effect) => effect.kind === "press-error")).toEqual([]);
    expect(potionOf(used.state, "hero-b")).toMatchObject({ hp: "6/10", items: "1 held" });
    // The host's action: no panel open, the same act.
    const closed = stepShell(used.state, {
      kind: "gear",
      v: 1,
      deviceId: "pad-1",
      action: "done",
    }).state;
    const host = gear(closed, { item: "items", pick: "potion", heroId: "hero-b" });
    expect(potionOf(host.state, "hero-b")).toMatchObject({ hp: "10/10", items: "0 held" });
  });

  it("EV-20: another group's hero is refused with a logged code and nothing changes", () => {
    const state = inPlay("hero-a");
    const refused = gear(state, { item: "items", pick: "potion", heroId: "hero-b" });
    const errors = refused.effects.filter((effect) => effect.kind === "press-error");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ code: "use-item-refused", deviceId: "pad-1" });
    expect(potionOf(refused.state, "hero-b")).toMatchObject({ hp: "2/10", items: "2 held" });
  });

  it("EV-19: the entry is disabled with the locked reason and a forced open shows no panel", () => {
    const state = inPlay("hero-a");
    const bare = initialShellState({ sessionId: "s", seed: "plain", stories: [TEST_STORY] });
    const noItems = {
      ...bare,
      screen: "play" as const,
      play: playFor("plain"),
    };
    const view = projectShellView(noItems).gear;
    expect(view?.party.every((hero) => (hero.heldItems ?? []).length === 0)).toBe(true);
    const rows = gearRows({
      inGame: true,
      beforeBegin: false,
      sessionScreen: false,
      towerConnected: false,
      partySplit: false,
      blockedItem: null,
      itemsHeld: false,
    });
    const entry = rows.find((row) => row.id === "use-potion");
    expect(entry).toMatchObject({ enabled: false, reason: NO_ITEMS });
    const forced = stepShell(noItems, {
      kind: "gear",
      v: 1,
      deviceId: "pad-1",
      action: "open",
      item: "use-potion",
    });
    expect(forced.state.gearPanel).toBeNull();
    expect(forced.effects.filter((effect) => effect.kind === "press-error")).toEqual([]);
    // With something held the same entry is enabled.
    const held = gearRows({
      inGame: true,
      beforeBegin: false,
      sessionScreen: false,
      towerConnected: false,
      partySplit: false,
      blockedItem: null,
      itemsHeld: true,
    });
    expect(held.find((row) => row.id === "use-potion")).toMatchObject({ enabled: true });
    expect(state.gearPanel).toBeNull();
  });

  it("EV-18: Current party keeps HP, gold and the count; 0 reads 0 held; unknown reads unavailable", () => {
    const view = projectShellView(inPlay("hero-a")).gear;
    const heroB = view?.party.find((hero) => hero.id === "hero-b");
    expect(heroB).toMatchObject({ hp: "2/10", gold: "7", items: "2 held" });
    const heroA = view?.party.find((hero) => hero.id === "hero-a");
    expect(heroA).toMatchObject({ hp: "unavailable", gold: "unavailable", items: "0 held" });
  });
});

describe("a use-item act with another panel open (round 1 blocker)", () => {
  it("applies live, as it will on replay with no panel open", () => {
    let state = inPlay("hero-b");
    state = stepShell(state, {
      kind: "gear",
      v: 1,
      deviceId: "pad-1",
      action: "open",
      item: "tower",
    }).state;
    const live = gear(state, {
      deviceId: "pad-2",
      item: "items",
      pick: "potion",
      heroId: "hero-b",
    });
    expect(potionOf(live.state, "hero-b")).toMatchObject({ hp: "6/10", items: "1 held" });
  });
});
