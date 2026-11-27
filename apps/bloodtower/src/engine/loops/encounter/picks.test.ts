import { describe, expect, it } from "vitest";
import { deserializeShellState, serializeShellState } from "../../../server/core/serialize.ts";
import { initPlayState } from "../chapter/playState.ts";
import { ensureClock, heroSheet, setHeroSheet } from "../day/clock.ts";
import { setHeroLedger } from "../event/state.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import { type ShellStory, TEST_STORY } from "../session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { initialShellState, type ShellState } from "../session/state.ts";
import { refreshOffersAfterRestore, stepShell } from "../session/stepShell.ts";
import { projectShellView } from "../session/view.ts";
import type { EncounterLocal } from "./loop.ts";
import {
  applyPick,
  BASE_HERO_ROLES,
  CURE_RISEN_GOLD,
  configurePicks,
  ensurePicks,
  openMenu,
  pickPrice,
  restorePicksFromLog,
  setHeroHp,
  setMoves,
  setPurse,
  silverTonguePrice,
} from "./picks.ts";

const SEED = "silver-tongue";

const setupGroup = (heroIds: string[], otherHeroIds?: string[]) => {
  const play = initPlayState(SEED, PROVING_GROUNDS_PLAY);
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  group.heroIds = heroIds;
  if (otherHeroIds && play.groups[1]) {
    play.groups[1].heroIds = otherHeroIds;
  }
  return { play, group };
};

const insideBuilding = (
  kind: string,
  heroIds: string[],
  story: ShellStory,
  extraSeed: string,
): ShellState => {
  const seed = `${SEED}${extraSeed}`;
  const play = initPlayState(seed, PROVING_GROUNDS_PLAY);
  play.dayNumber = 1;
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  const space = play.content.board.spaces.find((row) => row.building === kind);
  if (!space) throw new Error(`no ${kind}`);
  group.heroIds = heroIds;
  group.spaceId = space.id;
  group.insideBuilding = true;
  const base = initialShellState({ sessionId: "s", seed, stories: [story] });
  const turn: GroupTurnLocal = {
    groupId: group.id,
    movesLeft: 3,
    awaitingPress: false,
    encounterPending: true,
    landedOnBuildingWithNoMoves: false,
  };
  const encounter: EncounterLocal = {
    groupId: group.id,
    movesLeft: 3,
    serial: 0,
    step: { kind: "menu" },
  };
  const state: ShellState = {
    ...base,
    screen: "play",
    stage: "playing",
    play,
    loops: {
      ...base.loops,
      stack: [
        { loopId: "group-turn", phase: "body", local: turn, finishing: false },
        { loopId: "encounter", phase: "body", local: encounter, finishing: false },
      ],
    } as ShellState["loops"],
  };
  refreshOffersAfterRestore(state);
  return state;
};

const optionFor = (state: ShellState, label: string) => {
  const found = projectShellView(state).table?.building?.options.find(
    (option) => option.label === label,
  );
  if (!found) throw new Error(`no "${label}" option`);
  return found;
};

const playOf = (state: ShellState) => {
  if (!state.play) throw new Error("no play state");
  return state.play;
};

const pressBuild = (state: ShellState, promptId: string) =>
  stepShell(state, { kind: "press", v: 1, deviceId: "pad-1", promptId, actionId: "build" } as never)
    .state;

const basePackStory: ShellStory = {
  ...TEST_STORY,
  heroes: [
    { id: "hero-a", name: "Hero A", card: { role: "fighter" } },
    { id: "hero-b", name: "Hero B", card: { role: "healer" } },
    { id: "hero-c", name: "Hero C", card: { role: "magic-user" } },
    { id: "hero-d", name: "Hero D", card: { role: "scout" } },
    { id: "hero-e", name: "Hero E", card: { role: "ranger" } },
    { id: "hero-f", name: "Hero F", card: { role: "bard" } },
  ],
};

describe("Silver Tongue role matching (#626, DEC-681, DEC-936)", () => {
  it("discounts building picks when base pack Bard hero-f is in the group", () => {
    const { play, group } = setupGroup(["hero-f"]);
    expect(pickPrice(play, group.id, "rally")).toBe(silverTonguePrice(5));
    expect(pickPrice(play, group.id, "virtue-draw")).toBe(silverTonguePrice(10));
    expect(pickPrice(play, group.id, "cleanse")).toBe(0);
    expect(pickPrice(play, group.id, "rest")).toBe(0);

    // Free first cure stays 0; later paid cure gets Silver Tongue's quarter off.
    setHeroSheet(play, "hero-f", { helpingVirtues: 0, corruptions: 2 });
    expect(pickPrice(play, group.id, "cure", "hero-f")).toBe(0);
    ensurePicks(play).freeCures.push(`${ensurePicks(play).chapter}:hero-f`);
    expect(pickPrice(play, group.id, "cure", "hero-f")).toBe(silverTonguePrice(CURE_RISEN_GOLD));
  });

  it("applies the discounted Rally and Virtue prices in openMenu and applyPick for hero-f", () => {
    const { play, group } = setupGroup(["hero-a", "hero-f"]);
    setMoves(play, group.id, 3);
    setPurse(play, group.id, 12);
    setHeroHp(play, "hero-a", 4, 12);

    const opened = openMenu(play, group.id);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.entries.find((e) => e.id === "rally")).toMatchObject({
      price: 4,
      disabled: false,
    });
    expect(opened.entries.find((e) => e.id === "virtue-draw")).toMatchObject({
      price: 8,
      disabled: false,
    });

    const rally = applyPick(play, SEED, group.id, "rally", { heroId: "hero-a" });
    expect(rally.ok).toBe(true);
    if (rally.ok) expect(rally.event.gold).toBe(4);
    expect(ensurePicks(play).purse[group.id]).toBe(8);

    const draw = applyPick(play, SEED, group.id, "virtue-draw");
    expect(draw.ok).toBe(true);
    if (draw.ok) expect(draw.event.gold).toBe(8);
    expect(ensurePicks(play).purse[group.id]).toBe(0);
  });

  it("applies Silver Tongue before Tempted's +2 surcharge for hero-f", () => {
    const { play, group } = setupGroup(["hero-f", "hero-b"]);
    setHeroSheet(play, "hero-b", { helpingVirtues: 0, corruptions: 1, named: ["tempted"] });
    expect(pickPrice(play, group.id, "rally")).toBe(silverTonguePrice(5) + 2);
  });

  it("does not discount groups with no Bard role, even if hero-f sits in another group", () => {
    for (const heroId of ["hero-a", "hero-b", "hero-c", "hero-d", "hero-e"]) {
      const { play, group } = setupGroup([heroId], ["hero-f"]);
      expect(pickPrice(play, group.id, "rally")).toBe(5);
      expect(pickPrice(play, group.id, "virtue-draw")).toBe(10);
    }
  });

  it("matches role 'bard' from story hero metadata in a live building encounter and survives Continue", () => {
    const customStory: ShellStory = {
      ...basePackStory,
      heroes: [
        ...basePackStory.heroes.filter((hero) => hero.id !== "hero-f"),
        { id: "hero-f", name: "Hero F", card: { role: "fighter" } },
        { id: "hero-custom", name: "Minstrel", card: { role: "bard" } },
      ],
    };

    // Custom hero id with role: "bard" gets the discount in view and live payment.
    let bardState = insideBuilding(
      "citadel",
      ["hero-custom"],
      customStory,
      "~test-gold:hero-custom=20~test-hp:hero-custom=4/12",
    );
    expect(optionFor(bardState, "Rally")?.detail).toBe("1 move · 4 gold · heals to full");
    expect(optionFor(bardState, "Virtue")?.detail).toBe("1 move · 8 gold");

    // Checkpoint round-trip (Continue) preserves the role-based discount without shell re-entry.
    const saved = JSON.parse(JSON.stringify(serializeShellState(bardState))) as never;
    const restored = deserializeShellState(saved);
    expect(optionFor(restored, "Rally")?.detail).toBe("1 move · 4 gold · heals to full");
    expect(optionFor(restored, "Virtue")?.detail).toBe("1 move · 8 gold");

    bardState = pressBuild(bardState, optionFor(bardState, "Rally").promptId);
    expect(heroSheet(ensureClock(playOf(bardState)), "hero-custom").gold).toBe(16);

    // hero-f given role: "fighter" in a custom story must NOT receive the Bard discount.
    const nonBardState = insideBuilding(
      "citadel",
      ["hero-f"],
      customStory,
      "~test-gold:hero-f=20~test-hp:hero-f=4/12",
    );
    expect(optionFor(nonBardState, "Rally").detail).toBe("1 move · 5 gold · heals to full");
    expect(optionFor(nonBardState, "Virtue").detail).toBe("1 move · 10 gold");
  });

  it("matches base pack hero-f in a live building encounter with pack hero metadata", () => {
    let state = insideBuilding(
      "citadel",
      ["hero-f"],
      basePackStory,
      "~test-gold:hero-f=12~test-hp:hero-f=4/8",
    );
    expect(optionFor(state, "Rally").detail).toBe("1 move · 4 gold · heals to full");
    expect(optionFor(state, "Virtue").detail).toBe("1 move · 8 gold");
    state = pressBuild(state, optionFor(state, "Rally").promptId);
    expect(heroSheet(ensureClock(playOf(state)), "hero-f").gold).toBe(8);
  });

  it("matches role 'bard' from event ledger hero metadata when present", () => {
    const { play, group } = setupGroup(["minstrel-1"]);
    expect(pickPrice(play, group.id, "rally")).toBe(5);
    setHeroLedger(play, "minstrel-1", { role: "bard", hitPoints: 8, gold: 10 });
    expect(pickPrice(play, group.id, "rally")).toBe(4);
  });

  it("keeps backward compatibility with legacy test fixtures using hero id 'bard'", () => {
    const { play, group } = setupGroup(["bard"]);
    expect(pickPrice(play, group.id, "rally")).toBe(4);
  });

  it("respects explicit heroRoles in configurePicks and restorePicksFromLog", () => {
    expect(BASE_HERO_ROLES["hero-f"]).toBe("bard");
    const { play, group } = setupGroup(["hero-f"]);
    configurePicks(play, { heroRoles: { "hero-f": "fighter", "hero-a": "bard" } });
    expect(pickPrice(play, group.id, "rally")).toBe(5);

    group.heroIds = ["hero-a"];
    expect(pickPrice(play, group.id, "rally")).toBe(4);

    // Explicit role overrides the legacy "bard" hero-id fallback.
    group.heroIds = ["bard"];
    configurePicks(play, { heroRoles: { bard: "fighter" } });
    expect(pickPrice(play, group.id, "rally")).toBe(5);

    // Host restart rebuild via restorePicksFromLog keeps configured roles.
    restorePicksFromLog(play, [], { chapter: 1, heroRoles: { "hero-a": "bard" } });
    group.heroIds = ["hero-a"];
    expect(pickPrice(play, group.id, "rally")).toBe(4);
  });
});
