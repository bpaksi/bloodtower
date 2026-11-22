import { describe, expect, it } from "vitest";
import { initPlayState, type PlayState } from "../chapter/playState.ts";
import { ensureClock, heroSheet, setBuildingSkulls, setHeroSheet } from "../day/clock.ts";
import type { EncounterLocal } from "../encounter/loop.ts";
import { buildingModel } from "../encounter/menu.ts";
import {
  configurePicks,
  ensurePicks,
  openMenu,
  presentGold,
  setMoves,
} from "../encounter/picks.ts";
import { AMBUSH, HERALD } from "../quest/fixtures.ts";
import { openQuestAt } from "../quest/quest.ts";
import { BASE_QUEST_TUNING, configureQuests, ensureQuests } from "../quest/store.ts";
import { TEST_STORY } from "../session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { initialShellState, type ShellState } from "../session/state.ts";
import { refreshOffersAfterRestore, stepShell } from "../session/stepShell.ts";
import { projectShellView } from "../session/view.ts";
import { canEnterHere, type GroupTurnLocal } from "./loop.ts";

// F1/04 (DEC-641, DEC-951): Enter on a wild space that holds an open quest marker.

const FOREST = "N-muted-forest";
const MOUNTAINS = "N-radiant-mountains";
const VILLAGE = "N-egans-end";
const SEED = "f104~test-event:none";

const DEFS = [
  { id: "herald", chapter: 1, scene: HERALD },
  { id: "ambush", chapter: 1, scene: AMBUSH },
  { id: "last-stand", chapter: 3, scene: HERALD },
];

const build = (
  options: { at?: string; moves?: number; inside?: boolean; landed?: boolean; purse?: number } = {},
): ShellState => {
  const moves = options.moves ?? 2;
  const play = initPlayState(SEED, PROVING_GROUNDS_PLAY);
  play.dayNumber = 1;
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  group.spaceId = options.at ?? FOREST;
  group.heroIds = ["hero-a"];
  group.insideBuilding = options.inside === true;
  configurePicks(play, { chapter: 1 });
  setMoves(play, group.id, moves);
  // The sheets hold the gold: `loadLive` resets the purse to the pool when a menu opens.
  setHeroSheet(play, "hero-a", {
    ...heroSheet(ensureClock(play), "hero-a"),
    gold: options.purse ?? 15,
  });
  configureQuests(play, {
    defs: DEFS,
    markersByChapter: {
      1: { [VILLAGE]: "herald", [FOREST]: "ambush" },
      3: { "W-the-grass-sea": "last-stand" },
    },
    chapter: 1,
  });
  const base = initialShellState({ sessionId: "s", seed: SEED, stories: [TEST_STORY] });
  const turn: GroupTurnLocal = {
    groupId: group.id,
    movesLeft: moves,
    awaitingPress: false,
    encounterPending: options.inside === true,
    landedOnBuildingWithNoMoves: options.landed ?? false,
  };
  const frames: unknown[] = [
    { loopId: "group-turn", phase: "body", local: turn, finishing: false },
  ];
  if (options.inside) {
    const encounter: EncounterLocal = {
      groupId: group.id,
      movesLeft: moves,
      serial: 0,
      step: { kind: "menu" },
    };
    frames.push({ loopId: "encounter", phase: "body", local: encounter, finishing: false });
  }
  const state: ShellState = {
    ...base,
    screen: "play",
    stage: "playing",
    play,
    loops: { ...base.loops, stack: frames } as ShellState["loops"],
  };
  refreshOffersAfterRestore(state);
  return state;
};

const playOf = (state: ShellState): PlayState => {
  if (!state.play) throw new Error("no play");
  return state.play;
};
const groupOf = (state: ShellState) => {
  const group = playOf(state).groups[0];
  if (!group) throw new Error("no group");
  return group;
};
const open = (state: ShellState) => state.offered.filter((o) => o.open);
const enterId = (state: ShellState, space = groupOf(state).spaceId) =>
  `enter--${groupOf(state).id}--${space}`;
const press = (state: ShellState, promptId: string, actionId: string): ShellState =>
  stepShell(state, { kind: "press", v: 1, deviceId: "pad-1", promptId, actionId } as never).state;
const enc = (state: ShellState): EncounterLocal =>
  state.loops.stack.find((frame) => frame.loopId === "encounter")?.local as EncounterLocal;
const model = (state: ShellState) => buildingModel(playOf(state), enc(state), (id) => id);
const pressRow = (state: ShellState, label: string): ShellState => {
  const row = model(state).options.find((o) => o.label === label);
  if (!row) throw new Error(`no ${label} in ${model(state).options.map((o) => o.label)}`);
  return press(state, row.promptId, row.actionId);
};
const movesOf = (state: ShellState) => ensurePicks(playOf(state)).moves[groupOf(state).id] ?? 0;
const walkTo = (state: ShellState, space: string): ShellState => {
  const offer = open(state).find((o) => o.promptId.endsWith(`--${space}`) && o.actionId === "walk");
  if (!offer) throw new Error(`no walk to ${space}`);
  return press(state, offer.promptId, "walk");
};

describe("Enter on a wild quest marker (F1/04)", () => {
  it("EV-01: Enter is offered at turn start, after a walk, and on landing with no moves", () => {
    const a = build({ at: FOREST, moves: 2 });
    const enter = open(a).find((o) => o.promptId === enterId(a));
    expect(enter?.actionId).toBe("enter");
    const label = projectShellView(a).actions.find((x) => x.promptId === enterId(a))?.label;
    expect(label).toBe("Enter");

    const b = walkTo(build({ at: MOUNTAINS, moves: 2 }), FOREST);
    expect(open(b).map((o) => o.promptId)).toContain(enterId(b));

    const c = walkTo(build({ at: MOUNTAINS, moves: 1 }), FOREST);
    const ids = open(c).map((o) => o.promptId);
    expect(ids).toContain(enterId(c));
    expect(open(c).map((o) => o.actionId)).toContain("end-turn");
    expect(groupOf(c).insideBuilding).toBe(false);
  });

  it("EV-02: no Enter on a wild space without an open marker; a forced press changes nothing", () => {
    const cases: ShellState[] = [
      build({ at: "N-broken-lands" }),
      build({ at: "W-the-grass-sea" }),
      (() => {
        const s = build({ at: FOREST });
        ensureQuests(playOf(s)).done.push("ambush");
        refreshOffersAfterRestore(s);
        return s;
      })(),
    ];
    for (const state of cases) {
      const id = enterId(state);
      expect(open(state).map((o) => o.promptId)).not.toContain(id);
      const after = press(state, id, "enter");
      expect(groupOf(after).insideBuilding).toBe(false);
      expect(movesOf(after)).toBe(movesOf(state));
    }
  });

  it("EV-03: building gates are unchanged", () => {
    const standing = build({ at: "E-greater-tombstones" });
    expect(canEnterHere(playOf(standing), "E-greater-tombstones")).toBe(true);
    const fallen = build({ at: "E-greater-tombstones" });
    setBuildingSkulls(playOf(fallen), "E-greater-tombstones", 4);
    expect(canEnterHere(playOf(fallen), "E-greater-tombstones")).toBe(false);
    expect(groupOf(press(fallen, enterId(fallen), "enter")).insideBuilding).toBe(false);
    const fallenQuest = build({ at: VILLAGE });
    setBuildingSkulls(playOf(fallenQuest), VILLAGE, 4);
    expect(canEnterHere(playOf(fallenQuest), VILLAGE)).toBe(true);
  });

  it("EV-04: the menu is Quest, then Leave, titled with the space's name", () => {
    const inside = press(build(), enterId(build()), "enter");
    expect(groupOf(inside).insideBuilding).toBe(true);
    const menu = openMenu(playOf(inside), groupOf(inside).id);
    expect(menu.ok && menu.entries.map((e) => e.id)).toEqual(["quest"]);
    const m = model(inside);
    expect(m.title).toBe("Muted Forest");
    expect(m.options.map((o) => o.label)).toEqual(["Quest", "Leave"]);
    expect(m.options[0]?.detail).toContain("1 move");
    expect(m.options[0]?.enabled).toBe(true);
    const view = projectShellView(inside);
    expect(view.table?.building?.skulls).toBe(0);
    expect(view.place ?? null).toBeNull();
  });

  it("EV-05: Quest plays the Ambush; the toll is paid; the turn ends; the space is plain wild after", () => {
    let state = build({ purse: 15 });
    const group = groupOf(state).id;
    state = press(state, enterId(state), "enter");
    expect(movesOf(state)).toBe(2);
    expect(presentGold(playOf(state), group)).toBe(15);
    state = pressRow(state, "Quest");
    expect(movesOf(state)).toBe(1);
    // The toll is the visible option; Fight stays hidden (no battles yet).
    expect(model(state).options.map((o) => o.label)).toEqual(["Pay the toll", "Leave"]);
    state = pressRow(state, "Pay the toll");
    expect(ensureQuests(playOf(state)).done).toContain("ambush");
    // 15 - the toll, then the quest gold for the one hero present (DEC-944, DEC-700).
    const { tollGold, questGold } = BASE_QUEST_TUNING;
    const expected = 15 - tollGold + questGold;
    expect(presentGold(playOf(state), group)).toBe(expected);
    expect(movesOf(state)).toBe(0);
    expect(model(state).options.map((o) => o.label)).toEqual(["Leave"]);
    state = pressRow(state, "Leave");
    expect(heroSheet(ensureClock(playOf(state)), "hero-a").gold).toBe(expected);
    expect(groupOf(state).insideBuilding).toBe(false);
    expect(openQuestAt(playOf(state), FOREST)).toBeNull();
    expect(canEnterHere(playOf(state), FOREST)).toBe(false);
  });
});
