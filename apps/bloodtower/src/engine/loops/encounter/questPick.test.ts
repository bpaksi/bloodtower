import { describe, expect, it } from "vitest";
import { initPlayState, type PlayState } from "../chapter/playState.ts";
import { ensureClock, heroSheet, isCorruptionLoss } from "../day/clock.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import { HERALD } from "../quest/fixtures.ts";
import { configureQuests, ensureQuests, type QuestDef } from "../quest/store.ts";
import type { PlainScene } from "../scene/scene.ts";
import { TEST_STORY } from "../session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { bindShellState } from "../session/shellRef.ts";
import { initialShellState, type ShellState } from "../session/state.ts";
import { refreshOffersAfterRestore, stepShell } from "../session/stepShell.ts";
import { type EncounterLocal, handleBuildingPress, openBuildingWait } from "./loop.ts";
import { buildingModel } from "./menu.ts";
import { beginGroupTurn, ensurePicks, turnHasEnded } from "./picks.ts";

// F1/02 (EE-01, DEC-821, DEC-948): the Quest row on the iPad menu, and a quest pick ends the turn.
// All fixtures: the village N-egans-end, 0 skulls, a group inside it, heroes at 0 gold and 4/12 hit points.

const VILLAGE = "N-egans-end";

const CORRUPTION_SCENE: PlainScene = {
  id: "curse",
  options: [
    {
      id: "take",
      label: "Take the curse",
      cost: { kind: "corruption" },
      effects: [{ kind: "gold", amount: 10 }],
    },
    { id: "refuse", label: "Walk away", effects: [{ kind: "flag", flag: "walked" }] },
  ],
};

type Options = {
  heroes?: string[];
  moves?: number;
  extra?: string;
  /** Hero-a's starting gold. */
  gold?: number;
  /** The quest open at the village; none when `null`. */
  open?: string | null;
};

const DEFS: QuestDef[] = [
  { id: "herald", chapter: 1, scene: HERALD },
  { id: "curse", chapter: 1, scene: CORRUPTION_SCENE },
];

const inVillage = (options: Options = {}): ShellState => {
  const heroes = options.heroes ?? ["hero-a"];
  const moves = options.moves ?? 2;
  const seed = `q~test-gold:hero-a=${options.gold ?? 0}~test-hp:hero-a=4/12~test-gold:hero-b=0${options.extra ?? ""}`;
  const play = initPlayState(seed, PROVING_GROUNDS_PLAY);
  play.dayNumber = 1;
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  group.spaceId = VILLAGE;
  group.heroIds = heroes;
  group.insideBuilding = true;
  const open = options.open === undefined ? "herald" : options.open;
  configureQuests(play, { defs: DEFS, bySpace: open ? { [VILLAGE]: open } : {} });
  const base = initialShellState({ sessionId: "s", seed, stories: [TEST_STORY] });
  const turn: GroupTurnLocal = {
    groupId: group.id,
    movesLeft: moves,
    awaitingPress: false,
    encounterPending: true,
    landedOnBuildingWithNoMoves: false,
  };
  const encounter: EncounterLocal = {
    groupId: group.id,
    movesLeft: moves,
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

const playOf = (state: ShellState): PlayState => {
  if (!state.play) throw new Error("no play");
  return state.play;
};
const enc = (state: ShellState): EncounterLocal =>
  state.loops.stack.find((frame) => frame.loopId === "encounter")?.local as EncounterLocal;
const groupId = (state: ShellState): string => enc(state).groupId;
const model = (state: ShellState) => buildingModel(playOf(state), enc(state), (id) => id);
const labels = (state: ShellState): string[] => model(state).options.map((o) => o.label);
const option = (state: ShellState, label: string) => {
  const found = model(state).options.find((o) => o.label === label);
  if (!found) throw new Error(`no "${label}" in ${labels(state).join(", ")}`);
  return found;
};
/** C3/14: a finished quest shows its rewards, then its end hook, each ended by the host's wait-end. */
const endWait = (state: ShellState): ShellState => {
  const wait = openBuildingWait(state.loops.stack);
  if (!wait) throw new Error("no open wait");
  return stepShell(state, { kind: "wait-end", v: 1, waitId: wait.id, cause: "timeout" } as never)
    .state;
};
const closeQuest = (state: ShellState): ShellState => {
  const rewards = model(state);
  if (rewards.result?.quest?.phase !== "rewards") throw new Error("not on the rewards step");
  const hook = endWait(state);
  if (model(hook).result?.quest?.phase !== "end") throw new Error("not on the end hook");
  return endWait(hook);
};
const press = (state: ShellState, label: string): ShellState => {
  const found = option(state, label);
  return stepShell(state, {
    kind: "press",
    v: 1,
    deviceId: "pad-1",
    promptId: found.promptId,
    actionId: found.actionId,
  } as never).state;
};
const gold = (state: ShellState, heroId = "hero-a") =>
  heroSheet(ensureClock(playOf(state)), heroId).gold;
const movesOf = (state: ShellState): number =>
  ensurePicks(playOf(state)).moves[groupId(state)] ?? 0;

describe("the Quest row and the quest pick (F1/02)", () => {
  it("EV-01: the Quest row is first while a quest is open", () => {
    const state = inVillage();
    expect(labels(state)).toEqual(["Quest", "Rest", "Cleanse", "Leave"]);
    const quest = option(state, "Quest");
    expect(quest.label).toBe("Quest");
    expect(quest.detail).toBe("1 move");
    expect(quest.enabled).toBe(true);
  });

  it("EV-02: no row without an open quest of this chapter", () => {
    // (a) no marker at the space
    expect(labels(inVillage({ open: null }))).toEqual(["Rest", "Cleanse", "Leave"]);
    // (b) a chapter-2 marker while chapter 1 is current
    const other = inVillage({ open: null });
    configureQuests(playOf(other), {
      defs: DEFS,
      markersByChapter: { 1: {}, 2: { [VILLAGE]: "herald" } },
      chapter: 1,
    });
    expect(labels(other)).toEqual(["Rest", "Cleanse", "Leave"]);
    // (c) open, then done
    const done = inVillage();
    expect(labels(done)[0]).toBe("Quest");
    ensureQuests(playOf(done)).done.push("herald");
    expect(labels(done)).toEqual(["Rest", "Cleanse", "Leave"]);
  });

  it("EV-03: with no move left the row is greyed and the press opens nothing", () => {
    const state = inVillage({ moves: 0 });
    const quest = option(state, "Quest");
    expect(quest.enabled).toBe(false);
    expect(quest.reason).toBe("No moves left.");
    bindShellState(state);
    const after = handleBuildingPress(enc(state), quest.promptId);
    expect(after.refusal).toBe("There are not enough moves left for that.");
    expect(ensureQuests(playOf(state)).progress.herald).toBeUndefined();
    expect(after.step?.kind ?? "menu").toBe("menu");
  });

  it("EV-04: the pick takes 1 move and opens the quest", () => {
    let state = inVillage({ moves: 2 });
    const clock = ensureClock(playOf(state));
    const before = { day: playOf(state).dayNumber, supply: clock.supply };
    state = press(state, "Quest");
    expect(enc(state).movesLeft).toBe(1);
    expect(ensurePicks(playOf(state)).moves[groupId(state)]).toBe(1);
    expect(ensureQuests(playOf(state)).progress.herald).toEqual({
      optionId: null,
      costPaid: false,
      next: 0,
    });
    const now = model(state);
    expect(now.step).toBe("quest");
    expect(now.options.map((o) => [o.label, o.enabled])).toEqual([
      ["Ask for pay", true],
      ["Take the job", true],
      ["Leave", true],
    ]);
    expect(playOf(state).dayNumber).toBe(before.day);
    expect(ensureClock(playOf(state)).supply).toBe(before.supply);
  });

  it("EV-05: a won quest ends the turn at once, losses once", () => {
    let state = inVillage({ moves: 2, extra: "~test-named:hero-a=feral" });
    state = press(state, "Quest");
    state = press(state, "Ask for pay");
    const play = playOf(state);
    expect(ensureQuests(play).done).toEqual(["herald"]);
    expect(ensureClock(play).questsWon).toBe(1);
    expect(turnHasEnded(play, groupId(state))).toBe(true);
    expect(movesOf(state)).toBe(0);
    expect(enc(state).movesLeft).toBe(0);
    expect(gold(state)).toBe(18);
    // C3/14: the rewards step, then the end hook, then the menu; the effects ran once, before them.
    expect(model(state).step).toBe("result");
    expect(model(state).result?.quest).toMatchObject({
      phase: "rewards",
      questId: "herald",
      gold: 10,
      questGold: 10,
      presentHeroes: 1,
    });
    state = closeQuest(state);
    expect(gold(state)).toBe(18);
    const now = model(state);
    expect(now.step).toBe("menu");
    expect(labels(state)).toEqual(["Rest", "Cleanse", "Leave"]);
    for (const label of ["Rest", "Cleanse"]) {
      expect(option(state, label).enabled).toBe(false);
      expect(option(state, label).reason).toBe("No moves left.");
    }
    expect(option(state, "Leave").enabled).toBe(true);
    // The group leaves and its turn closes: Feral's loss is not taken a second time.
    state = press(state, "Leave");
    expect(gold(state)).toBe(18);
  });

  it("EV-06: leaving the quest partway is a retreat: the turn ends, the progress stays", () => {
    let state = inVillage({ moves: 2 });
    state = press(state, "Quest");
    state = press(state, "Leave");
    const play = playOf(state);
    expect(ensureQuests(play).done).toEqual([]);
    expect(ensureQuests(play).progress.herald).toBeDefined();
    expect(turnHasEnded(play, groupId(state))).toBe(true);
    expect(movesOf(state)).toBe(0);
    expect(model(state).step).toBe("menu");
    const row = option(state, "Quest");
    expect(row.enabled).toBe(false);
    expect(row.reason).toBe("No moves left.");
    expect(play.groups.find((g) => g.id === groupId(state))?.insideBuilding).toBe(true);

    // The next turn: 3 moves, the Quest row is back and opens the same three buttons.
    beginGroupTurn(play, groupId(state));
    const frame = state.loops.stack.find((f) => f.loopId === "encounter");
    if (!frame) throw new Error("no encounter");
    frame.local = { ...enc(state), movesLeft: 3 };
    refreshOffersAfterRestore(state);
    expect(option(state, "Quest").enabled).toBe(true);
    state = press(state, "Quest");
    expect(enc(state).movesLeft).toBe(2);
    expect(model(state).options.map((o) => o.label)).toEqual([
      "Ask for pay",
      "Take the job",
      "Leave",
    ]);
  });

  it("EV-07: a reward's hero pick, then the turn ends", () => {
    let state = inVillage({ heroes: ["hero-a", "hero-b"], moves: 2 });
    state = press(state, "Quest");
    state = press(state, "Take the job");
    const pick = model(state);
    expect(pick.prompt).toBe("Who takes the reward?");
    expect(pick.options.map((o) => o.label)).toEqual(["hero-a", "hero-b"]);
    expect(turnHasEnded(playOf(state), groupId(state))).toBe(false);
    state = press(state, "hero-b");
    const play = playOf(state);
    expect(ensureQuests(play).items["hero-b"]).toEqual(["tomas-map"]);
    expect(ensureQuests(play).items["hero-a"]).toBeUndefined();
    expect(ensureQuests(play).done).toEqual(["herald"]);
    expect(gold(state, "hero-a")).toBe(5);
    expect(gold(state, "hero-b")).toBe(5);
    expect(turnHasEnded(play, groupId(state))).toBe(true);
    expect(movesOf(state)).toBe(0);
    expect(model(state).result?.quest).toMatchObject({ phase: "rewards", items: ["tomas-map"] });
    state = closeQuest(state);
    expect(model(state).step).toBe("menu");
  });

  it("EV-08: a third corruption in the quest loses at once", () => {
    let state = inVillage({
      moves: 2,
      open: "curse",
      gold: 7,
      extra: "~test-named:hero-a=feral+cruel",
    });
    state = press(state, "Quest");
    state = press(state, "Take the curse");
    expect(model(state).prompt).toBe("Who takes the corruption?");
    const group = groupId(state);
    state = press(state, "hero-a");
    const play = playOf(state);
    expect(isCorruptionLoss(play)).toBe(true);
    expect(ensureClock(play).outcome).toEqual({ lost: true, reason: "corruption" });
    expect(gold(state)).toBe(7);
    expect(ensureQuests(play).done).toEqual([]);
    expect(turnHasEnded(play, group)).toBe(false);
    expect(
      state.offered.filter((offer) => offer.open && offer.promptId.startsWith("bld--")),
    ).toEqual([]);
  });
});
