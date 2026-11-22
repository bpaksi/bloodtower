import { describe, expect, it } from "vitest";
import { initPlayState } from "../chapter/playState.ts";
import { ensureClock, heroSheet } from "../day/clock.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import { AMBUSH, HERALD, LOCK } from "../quest/fixtures.ts";
import { configureQuests, ensureQuests, type QuestDef } from "../quest/store.ts";
import { TEST_STORY } from "../session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { initialShellState, type ShellState } from "../session/state.ts";
import { refreshOffersAfterRestore, stepShell } from "../session/stepShell.ts";
import { projectShellView } from "../session/view.ts";
import { type EncounterLocal, openBuildingWait } from "./loop.ts";

// C3/14 (UI-042, UI-025, UI-036, MEC-037 .9): what the quest scene carries on the building panel, and
// the two closing steps (rewards, end hook) that follow a finished quest. EV-15 (a real save and
// reload) is in server/core/questSave.test.ts, which owns the checkpoint.

const VILLAGE = "N-egans-end";
const DEFS: QuestDef[] = [
  { id: "herald", chapter: 1, scene: HERALD },
  { id: "ambush", chapter: 1, scene: AMBUSH },
  { id: "lock", chapter: 3, scene: LOCK },
];

const inQuest = (
  questId: string,
  opts: { heroes?: string[]; gold?: number; extra?: string } = {},
): ShellState => {
  const heroes = opts.heroes ?? ["hero-a"];
  const seed = `q14~test-gold:hero-a=${opts.gold ?? 0}~test-gold:hero-b=0~test-hp:hero-a=4/12~test-hp:hero-b=4/12${opts.extra ?? ""}`;
  const play = initPlayState(seed, PROVING_GROUNDS_PLAY);
  play.dayNumber = 1;
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  group.spaceId = VILLAGE;
  group.heroIds = heroes;
  group.insideBuilding = true;
  configureQuests(play, { defs: DEFS, bySpace: { [VILLAGE]: questId } });
  const base = initialShellState({ sessionId: "s", seed, stories: [TEST_STORY] });
  const turn: GroupTurnLocal = {
    groupId: group.id,
    movesLeft: 2,
    awaitingPress: false,
    encounterPending: true,
    landedOnBuildingWithNoMoves: false,
  };
  const encounter: EncounterLocal = {
    groupId: group.id,
    movesLeft: 2,
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

const panel = (state: ShellState) => projectShellView(state).table?.building ?? null;
const pressLabel = (state: ShellState, label: string): ShellState => {
  const found = panel(state)?.options.find((o) => o.label === label);
  if (!found) throw new Error(`no "${label}" in ${panel(state)?.options.map((o) => o.label)}`);
  return stepShell(state, {
    kind: "press",
    v: 1,
    deviceId: "pad-1",
    promptId: found.promptId,
    actionId: "build",
  } as never).state;
};
const endWait = (state: ShellState): ShellState => {
  const wait = openBuildingWait(state.loops.stack);
  if (!wait) throw new Error("no open wait");
  return stepShell(state, { kind: "wait-end", v: 1, waitId: wait.id, cause: "timeout" } as never)
    .state;
};
const gold = (state: ShellState, hero = "hero-a") =>
  heroSheet(ensureClock(state.play as never), hero).gold;

describe("C3/14 the quest scene on the building panel", () => {
  it("EV-01/08: the Herald's choice carries its options with their gains, and one step to come", () => {
    const state = pressLabel(inQuest("herald"), "Quest");
    const quest = panel(state)?.quest;
    expect(quest?.phase).toBe("choose");
    expect(quest?.track).toEqual({ done: 0, total: 1 });
    expect(quest?.options.map((o) => [o.optionId, o.gains])).toEqual([
      ["pay", [{ kind: "gold", amount: 10 }]],
      ["job", [{ kind: "item", item: "tomas-map" }]],
    ]);
    // The same prompt ids as the buttons.
    for (const option of quest?.options ?? []) {
      expect(panel(state)?.options.map((o) => o.promptId)).toContain(option.promptId);
    }
  });

  it("EV-02: an item option names its item, and says whether the group holds it", () => {
    const state = pressLabel(inQuest("lock"), "Quest");
    const open = panel(state)?.quest?.options.find((o) => o.optionId === "open");
    expect(open).toMatchObject({ needsItem: "signet", held: false });
    const button = panel(state)?.options.find((o) => o.promptId === open?.promptId);
    expect(button?.enabled).toBe(false);
  });

  it("EV-06: the Ambush shows no Fight and carries the toll with the purse", () => {
    const state = pressLabel(inQuest("ambush", { gold: 6, heroes: ["hero-a", "hero-b"] }), "Quest");
    const quest = panel(state)?.quest;
    expect(quest?.options.map((o) => o.optionId)).toEqual(["toll"]);
    expect(quest?.options[0]?.cost).toEqual({ kind: "toll", amount: 10, hitPoints: 2, purse: 6 });
    const button = panel(state)?.options.find((o) => o.promptId === quest?.options[0]?.promptId);
    expect(button?.enabled).toBe(true);
    expect(panel(state)?.options.map((o) => o.label)).not.toContain("Fight them");
  });

  it("EV-03: an item option asks for a hero and carries the item to reveal", () => {
    const state = pressLabel(inQuest("herald", { heroes: ["hero-a", "hero-b"] }), "Quest");
    const picked = pressLabel(state, "Take the job");
    const quest = panel(picked)?.quest;
    expect(quest).toMatchObject({ phase: "hero", pending: "item", reveal: "tomas-map" });
    expect(ensureQuests(picked.play as never).items["hero-a"]).toBeUndefined();
  });

  it("EV-04/08/09: rewards, then the end hook, then the menu; the effects ran once, before them", () => {
    let state = pressLabel(inQuest("herald", { heroes: ["hero-a", "hero-b"] }), "Quest");
    state = pressLabel(state, "Ask for pay");
    const rewards = panel(state);
    expect(rewards?.step).toBe("result");
    expect(rewards?.result?.auto).toBe(true);
    expect(rewards?.options).toEqual([]);
    expect(rewards?.quest).toMatchObject({
      phase: "rewards",
      track: { done: 1, total: 1 },
      rewards: { gold: 10, questGold: 5, items: [], presentHeroes: 2, tollShort: false },
    });
    // 10 gold shared, 5 quest gold each (DEC-700, DEC-944).
    expect(gold(state, "hero-a")).toBe(10);
    expect(gold(state, "hero-b")).toBe(10);
    state = endWait(state);
    expect(panel(state)?.quest?.phase).toBe("end");
    expect(gold(state, "hero-a")).toBe(10);
    state = endWait(state);
    expect(panel(state)?.step).toBe("menu");
    expect(panel(state)?.quest ?? null).toBeNull();
    expect(gold(state, "hero-a")).toBe(10);
  });

  it("EV-06: a paid toll and a short toll are told apart on the rewards step", () => {
    const short = pressLabel(pressLabel(inQuest("ambush", { gold: 6 }), "Quest"), "Pay the toll");
    expect(panel(short)?.quest?.rewards?.tollShort).toBe(true);
    const paid = pressLabel(pressLabel(inQuest("ambush", { gold: 12 }), "Quest"), "Pay the toll");
    expect(panel(paid)?.quest?.rewards?.tollShort).toBe(false);
  });
});
