import { describe, expect, it } from "vitest";
import { initPlayState, type PlayState } from "../chapter/playState.ts";
import {
  captureClock,
  ensureClock,
  isFallen,
  placeTargets,
  restoreClock,
  setBuildingSkulls,
} from "../day/clock.ts";
import { simulateSkullDrop } from "../day/skull.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import { HERALD } from "../quest/fixtures.ts";
import { beginQuest, chooseOption, leaveQuest, openQuestAt, pickHero } from "../quest/quest.ts";
import {
  chapterProgress,
  configureQuests,
  ensureQuests,
  restoreQuests,
  snapshotQuests,
} from "../quest/store.ts";
import { TEST_STORY } from "../session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { initialShellState, type ShellState } from "../session/state.ts";
import { refreshOffersAfterRestore, stepShell } from "../session/stepShell.ts";
import { projectShellView } from "../session/view.ts";
import type { EncounterLocal } from "./loop.ts";
import { buildingModel } from "./menu.ts";
import {
  applyPick,
  configurePicks,
  ensurePicks,
  openMenu,
  restorePicks,
  setMoves,
  setPurse,
  snapshotPicks,
} from "./picks.ts";

// D4/01 (DEC-910, DEC-942, DEC-943): a fallen building keeps its open quest.
// Fixtures: the village N-egans-end holding `herald` (chapter 1), one hero, one fallen building in all.
// "Open" is `openQuestAt`, the one source the menu, the Enter gates and the view all read.

const VILLAGE = "N-egans-end";
const OTHER_VILLAGE = "E-greater-tombstones";
const SEED = "d4~test-at:N-egans-end";

const DEFS = [
  { id: "herald", chapter: 1, scene: HERALD },
  { id: "shrine", chapter: 2, scene: HERALD },
];

type Mode = "map" | "inside";

const build = (
  options: {
    at?: string;
    moves?: number;
    skulls?: number;
    mode?: Mode;
    landed?: boolean;
    open?: boolean;
    heroes?: string[];
  } = {},
): ShellState => {
  const at = options.at ?? VILLAGE;
  const moves = options.moves ?? 3;
  const play = initPlayState(SEED, PROVING_GROUNDS_PLAY);
  play.dayNumber = 1;
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  group.spaceId = at;
  group.heroIds = options.heroes ?? ["hero-a"];
  group.insideBuilding = options.mode === "inside";
  configurePicks(play, { chapter: 1 });
  setMoves(play, group.id, moves);
  setPurse(play, group.id, 20);
  configureQuests(play, {
    defs: DEFS,
    markersByChapter: {
      1: options.open === false ? {} : { [VILLAGE]: "herald" },
      2: { [OTHER_VILLAGE]: "shrine" },
    },
    chapter: 1,
  });
  if (options.skulls !== undefined) setBuildingSkulls(play, at, options.skulls);
  const base = initialShellState({ sessionId: "s", seed: SEED, stories: [TEST_STORY] });
  const turn: GroupTurnLocal = {
    groupId: group.id,
    movesLeft: moves,
    awaitingPress: false,
    encounterPending: options.mode === "inside",
    landedOnBuildingWithNoMoves: options.landed ?? false,
  };
  const frames: unknown[] = [
    { loopId: "group-turn", phase: "body", local: turn, finishing: false },
  ];
  if (options.mode === "inside") {
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
const offered = (state: ShellState): string[] =>
  state.offered.filter((o) => o.open).map((o) => o.promptId);
const enterId = (state: ShellState): string =>
  `enter--${groupOf(state).id}--${groupOf(state).spaceId}`;
const enc = (state: ShellState): EncounterLocal =>
  state.loops.stack.find((frame) => frame.loopId === "encounter")?.local as EncounterLocal;
const menu = (state: ShellState) => buildingModel(playOf(state), enc(state), (id) => id).options;
const labels = (state: ShellState): string[] => menu(state).map((o) => o.label);
const pressId = (state: ShellState, promptId: string, actionId: string): ShellState =>
  stepShell(state, {
    kind: "press",
    v: 1,
    deviceId: "pad-1",
    promptId,
    actionId,
  } as never).state;
const enterIt = (state: ShellState): ShellState => pressId(state, enterId(state), "enter");
const pressRow = (state: ShellState, label: string): ShellState => {
  const row = menu(state).find((o) => o.label === label);
  if (!row) throw new Error(`no ${label} in ${labels(state).join(", ")}`);
  return pressId(state, row.promptId, row.actionId);
};
const movesOf = (state: ShellState): number =>
  ensurePicks(playOf(state)).moves[groupOf(state).id] ?? 0;
const viewActions = (state: ShellState): string[] =>
  projectShellView(state)
    .actions.filter((action) => action.open)
    .map((action) => action.promptId);
const actingGroupView = (state: ShellState) => {
  const table = projectShellView(state).table;
  const row = table?.groups.find((g) => g.spaceId === groupOf(state).spaceId);
  if (!row) throw new Error("the table band has no acting group");
  return row;
};

/** Back on the move map at the same space: the group stands outside with `moves` left. */
const toMap = (state: ShellState, moves: number, landed = false): ShellState => {
  const play = playOf(state);
  const group = groupOf(state);
  group.insideBuilding = false;
  setMoves(play, group.id, moves);
  const turn: GroupTurnLocal = {
    groupId: group.id,
    movesLeft: moves,
    awaitingPress: false,
    encounterPending: false,
    landedOnBuildingWithNoMoves: landed,
  };
  const next: ShellState = {
    ...state,
    offered: [],
    loops: {
      ...state.loops,
      stack: [{ loopId: "group-turn", phase: "body", local: turn, finishing: false }],
    } as ShellState["loops"],
  };
  refreshOffersAfterRestore(next);
  return next;
};

/** A save and a restore into a fresh play: the clock, the quests and the picks, then the map. */
const restored = (state: ShellState, moves: number): ShellState => {
  const play = playOf(state);
  const clock = captureClock(play);
  if (!clock) throw new Error("no clock to save");
  const quests = snapshotQuests(play);
  const picks = snapshotPicks(play);
  const fresh = build({ moves });
  const again = playOf(fresh);
  restoreClock(again, structuredClone(clock));
  restoreQuests(again, quests);
  restorePicks(again, picks);
  return toMap(fresh, moves);
};

const ok = <T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> => {
  if (!r.ok) throw new Error(`refused: ${JSON.stringify(r)}`);
  return r as Extract<T, { ok: true }>;
};

/** `herald` taken to its item pick and left, at the standing village; then the village falls. */
const leftMidQuestThenFallen = (): ShellState => {
  const state = build({ skulls: 0, mode: "inside", moves: 3 });
  const play = playOf(state);
  const id = groupOf(state).id;
  ok(beginQuest(play, id, "herald"));
  ok(chooseOption(play, id, "herald", "job"));
  expect(leaveQuest(play, "herald")).toBe(true);
  setBuildingSkulls(play, VILLAGE, 4);
  return toMap(state, 3);
};

describe("a fallen building keeps its quest (D4/01)", () => {
  it("EV-01: Enter is offered at a fallen building with an open quest", () => {
    const state = build({ skulls: 4 });
    expect(isFallen(playOf(state), VILLAGE)).toBe(true);
    expect(openQuestAt(playOf(state), VILLAGE)).toBe("herald");
    expect(offered(state)).toContain(enterId(state));
    expect(groupOf(enterIt(state)).insideBuilding).toBe(true);
  });

  it("EV-02: the menu is Quest, then Leave; every other pick is refused and changes nothing", () => {
    const state = enterIt(build({ skulls: 4 }));
    expect(labels(state)).toEqual(["Quest", "Leave"]);
    const play = playOf(state);
    const id = groupOf(state).id;
    const snap = () =>
      JSON.stringify([ensurePicks(play).purse, ensurePicks(play).moves, ensureClock(play).skulls]);
    const before = snap();
    for (const kind of ["rally", "cleanse", "virtue", "rest", "cure", "bless"] as const) {
      expect(applyPick(play, SEED, id, kind as never)).toEqual({
        ok: false,
        reason: "not-offered",
      });
    }
    expect(snap()).toBe(before);
  });

  it("EV-03: the quest keeps its progress; the pick costs 1 move", () => {
    const state = enterIt(leftMidQuestThenFallen());
    expect(labels(state)).toEqual(["Quest", "Leave"]);
    const before = ensureQuests(playOf(state)).progress;
    expect(before.herald).toEqual({ optionId: "job", costPaid: true, next: 0 });
    expect(movesOf(state)).toBe(3);
    const picked = pressRow(state, "Quest");
    expect(movesOf(picked)).toBe(2);
    const store = ensureQuests(playOf(picked));
    expect(store.progress).toEqual(before);
    expect(Object.keys(store.progress)).toEqual(["herald"]);
    expect(store.bySpace[VILLAGE]).toBe("herald");
    // It resumes at the item pick, not at the options.
    expect(ok(beginQuest(playOf(picked), groupOf(picked).id, "herald")).view.pending).toEqual({
      kind: "item",
      heroes: ["hero-a"],
    });
  });

  it("EV-04: done once", () => {
    const state = pressRow(enterIt(leftMidQuestThenFallen()), "Quest");
    const play = playOf(state);
    ok(pickHero(play, groupOf(state).id, "herald", "hero-a", "seed"));
    expect(ensureQuests(play).done.filter((id) => id === "herald")).toHaveLength(1);
    expect(ensureClock(play).questsWon).toBe(1);
    expect(chapterProgress(play, 1).done).toBe(1);
    // A second finish is refused, so it is never credited twice.
    expect(beginQuest(play, groupOf(state).id, "herald")).toEqual({
      ok: false,
      reason: "already-done",
    });
    expect(ensureClock(play).questsWon).toBe(1);
  });

  it("EV-05: after the quest is done the space is plain fallen", () => {
    const state = pressRow(enterIt(leftMidQuestThenFallen()), "Quest");
    const play = playOf(state);
    ok(pickHero(play, groupOf(state).id, "herald", "hero-a", "seed"));
    expect(openQuestAt(play, VILLAGE)).toBeNull();
    const again = toMap(state, 3);
    expect(offered(again).filter((id) => id.startsWith("enter--"))).toEqual([]);
    expect(openMenu(play, groupOf(again).id)).toEqual({ ok: false, reason: "fallen" });
  });

  it("EV-06: no open quest, or a marker not live this chapter: no Enter", () => {
    // (a) a fallen village with no marker
    const bare = build({ skulls: 4, open: false });
    expect(offered(bare).filter((id) => id.startsWith("enter--"))).toEqual([]);
    expect(openMenu(playOf(bare), groupOf(bare).id)).toEqual({ ok: false, reason: "fallen" });
    // (b) chapter 2's `shrine` on a fallen building while chapter 1 is current
    const later = build({ at: OTHER_VILLAGE, skulls: 4 });
    expect(openQuestAt(playOf(later), OTHER_VILLAGE)).toBeNull();
    expect(offered(later).filter((id) => id.startsWith("enter--"))).toEqual([]);
    expect(openMenu(playOf(later), groupOf(later).id)).toEqual({ ok: false, reason: "fallen" });
  });

  it("EV-07: the acting iPad's view carries no fallen note while the quest is open", () => {
    // (a) open quest: no fallen flag, and Enter is in the actions
    const open = build({ skulls: 4 });
    expect(actingGroupView(open)?.fallen).toBeUndefined();
    expect(viewActions(open)).toContain(enterId(open));
    // (b) the quest done: plain fallen
    const done = build({ skulls: 4 });
    ensureQuests(playOf(done)).done.push("herald");
    const afterDone = toMap(done, 3);
    expect(actingGroupView(afterDone)?.fallen).toBe(true);
    expect(viewActions(afterDone)).not.toContain(enterId(afterDone));
    // (c) a fallen village with no quest
    const bare = build({ skulls: 4, open: false });
    expect(actingGroupView(bare)?.fallen).toBe(true);
    expect(viewActions(bare)).not.toContain(enterId(bare));
  });

  it("EV-09: a fallen building takes no skull and still counts as fallen", () => {
    const state = build({ skulls: 4 });
    const play = playOf(state);
    expect(placeTargets(play)).not.toContain(VILLAGE);
    expect(
      Object.entries(ensureClock(play).skulls)
        .filter(([, count]) => count >= 4)
        .map(([id]) => id),
    ).toEqual([VILLAGE]);
    expect(isFallen(play, VILLAGE)).toBe(true);
    for (let i = 0; i < 20; i++) {
      const drop = simulateSkullDrop(`d4-${i}`, () => "N");
      if (drop.landed) expect(drop.spaceId).not.toBe(VILLAGE);
    }
    expect(ensureClock(play).skulls[VILLAGE]).toBe(4);
  });

  it("EV-10: landing with no moves left offers Enter and End turn; Quest is greyed", () => {
    const state = build({ skulls: 4, moves: 0, landed: true });
    const ids = offered(state);
    expect(ids).toContain(enterId(state));
    expect(ids.some((id) => id.startsWith("end-turn--") || id.includes("end"))).toBe(true);
    const inside = enterIt(state);
    expect(labels(inside)).toEqual(["Quest", "Leave"]);
    expect(menu(inside).find((o) => o.label === "Quest")?.enabled).toBe(false);
    const stuck = pressRow(inside, "Quest");
    expect(ensureQuests(playOf(stuck)).progress).toEqual({});
    expect(movesOf(stuck)).toBe(0);
    const left = pressRow(stuck, "Leave");
    expect(groupOf(left).insideBuilding).toBe(false);
  });

  it("EV-12: Continue keeps the marker and progress, and a done quest stays done once", () => {
    // (a) after the Leave, the building fallen
    const saved = restored(leftMidQuestThenFallen(), 3);
    expect(ensureClock(playOf(saved)).skulls[VILLAGE]).toBe(4);
    expect(openQuestAt(playOf(saved), VILLAGE)).toBe("herald");
    expect(ensureQuests(playOf(saved)).progress.herald).toEqual({
      optionId: "job",
      costPaid: true,
      next: 0,
    });
    expect(offered(saved)).toContain(enterId(saved));
    expect(labels(enterIt(saved))).toEqual(["Quest", "Leave"]);
    // (b) after the quest is done
    const picked = pressRow(enterIt(leftMidQuestThenFallen()), "Quest");
    ok(pickHero(playOf(picked), groupOf(picked).id, "herald", "hero-a", "seed"));
    const after = restored(picked, 3);
    expect(ensureQuests(playOf(after)).done.filter((id) => id === "herald")).toHaveLength(1);
    expect(ensureClock(playOf(after)).questsWon).toBe(1);
    expect(offered(after).filter((id) => id.startsWith("enter--"))).toEqual([]);
    expect(actingGroupView(after)?.fallen).toBe(true);
  });
});
