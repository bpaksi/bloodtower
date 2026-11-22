import { describe, expect, it } from "vitest";
import { initPlayState, type PlayState } from "../../engine/loops/chapter/playState.ts";
import { ensureClock, heroSheet } from "../../engine/loops/day/clock.ts";
import {
  type EncounterLocal,
  handleBuildingPress,
  openBuildingWait,
} from "../../engine/loops/encounter/loop.ts";
import { buildingModel } from "../../engine/loops/encounter/menu.ts";
import { beginGroupTurn, ensurePicks, turnHasEnded } from "../../engine/loops/encounter/picks.ts";
import type { GroupTurnLocal } from "../../engine/loops/group-turn/loop.ts";
import { HERALD } from "../../engine/loops/quest/fixtures.ts";
import { configureQuests, ensureQuests } from "../../engine/loops/quest/store.ts";
import { TEST_STORY } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { bindShellState } from "../../engine/loops/session/shellRef.ts";
import { initialShellState, type ShellState } from "../../engine/loops/session/state.ts";
import { refreshOffersAfterRestore, stepShell } from "../../engine/loops/session/stepShell.ts";
import { parseShellCheckpoint, shellCheckpointFromState } from "./shellCheckpoint.ts";

// F1/02 survival (EV-11): a Continue keeps the quest's progress, its result and the spent turn.
const VILLAGE = "N-egans-end";
const SEED = "ee01-save~test-gold:hero-a=0~test-hp:hero-a=4/12~test-named:hero-a=feral";

const roundTrip = (state: ShellState): ShellState => {
  const row = JSON.parse(JSON.stringify(shellCheckpointFromState(state))) as unknown;
  const restored = parseShellCheckpoint(row);
  refreshOffersAfterRestore(restored);
  return restored;
};

const endWait = (state: ShellState): ShellState => {
  const wait = openBuildingWait(state.loops.stack);
  if (!wait) throw new Error("no open wait");
  return stepShell(state, { kind: "wait-end", v: 1, waitId: wait.id, cause: "timeout" } as never)
    .state;
};

const inVillage = (moves: number): ShellState => {
  const play = initPlayState(SEED, PROVING_GROUNDS_PLAY);
  play.dayNumber = 1;
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  group.spaceId = VILLAGE;
  group.heroIds = ["hero-a"];
  group.insideBuilding = true;
  configureQuests(play, {
    defs: [{ id: "herald", chapter: 1, scene: HERALD }],
    bySpace: { [VILLAGE]: "herald" },
  });
  const base = initialShellState({ sessionId: "s", seed: SEED, stories: [TEST_STORY] });
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
const frameOf = (state: ShellState) => {
  const frame = state.loops.stack.find((row) => row.loopId === "encounter");
  if (!frame) throw new Error("no encounter");
  return frame;
};
const enc = (state: ShellState): EncounterLocal => frameOf(state).local as EncounterLocal;
const model = (state: ShellState) => buildingModel(playOf(state), enc(state), (id) => id);
const optionOf = (state: ShellState, label: string) => {
  const found = model(state).options.find((o) => o.label === label);
  if (!found) throw new Error(`no "${label}"`);
  return found;
};
const press = (state: ShellState, label: string): ShellState => {
  const found = optionOf(state, label);
  return stepShell(state, {
    kind: "press",
    v: 1,
    deviceId: "pad-1",
    promptId: found.promptId,
    actionId: found.actionId,
  } as never).state;
};

describe("a save and a quest pick (F1/02)", () => {
  it("EV-11 (a): a quest left partway comes back with its progress, the spent turn and the same buttons", () => {
    let state = inVillage(2);
    state = press(state, "Quest");
    state = press(state, "Leave");
    const restored = roundTrip(state);
    const play = playOf(restored);
    const group = enc(restored).groupId;
    expect(ensureQuests(play).done).toEqual([]);
    expect(ensureQuests(play).progress.herald).toBeDefined();
    expect(turnHasEnded(play, group)).toBe(true);
    expect(model(restored).step).toBe("menu");
    expect(optionOf(restored, "Quest").enabled).toBe(false);
    expect(optionOf(restored, "Quest").reason).toBe("No moves left.");

    // The next turn: the quest resumes where it was.
    beginGroupTurn(play, group);
    frameOf(restored).local = { ...enc(restored), movesLeft: 3 };
    refreshOffersAfterRestore(restored);
    expect(optionOf(restored, "Quest").enabled).toBe(true);
    const opened = press(restored, "Quest");
    expect(model(opened).options.map((o) => o.label)).toEqual([
      "Ask for pay",
      "Take the job",
      "Leave",
    ]);
  });

  it("EV-11 (b): a won quest is done once and a replayed press changes nothing", () => {
    let state = inVillage(2);
    state = press(state, "Quest");
    const oldPress = optionOf(state, "Ask for pay").promptId;
    state = press(state, "Ask for pay");

    const restored = roundTrip(state);
    const play = playOf(restored);
    expect(ensureQuests(play).done).toEqual(["herald"]);
    expect(ensureClock(play).questsWon).toBe(1);
    expect(heroSheet(ensureClock(play), "hero-a").gold).toBe(13);
    // C3/14: a Continue on the rewards step shows it again; the effects above ran once.
    expect(model(restored).step).toBe("result");
    expect(turnHasEnded(play, enc(restored).groupId)).toBe(true);
    expect(ensurePicks(play).moves[enc(restored).groupId]).toBe(0);

    // Both closing steps end on the host's wait-end; then the same menu as before C3/14, same gold.
    const closed = endWait(endWait(restored));
    expect(model(closed).options.map((o) => o.label)).toEqual(["Rest", "Cleanse", "Leave"]);
    expect(heroSheet(ensureClock(playOf(closed)), "hero-a").gold).toBe(13);
    expect(ensureQuests(playOf(closed)).done).toEqual(["herald"]);

    bindShellState(restored);
    const replay = handleBuildingPress(enc(restored), oldPress);
    expect(replay.refusal).toBe("That press is for a step the building has moved past.");
    expect(ensureQuests(play).done).toEqual(["herald"]);
    expect(ensureClock(play).questsWon).toBe(1);
    expect(heroSheet(ensureClock(play), "hero-a").gold).toBe(13);
  });

  it("C3/14 EV-15: a save and reload on the end hook shows it again and the quest is paid once", () => {
    let state = inVillage(2);
    state = press(state, "Quest");
    state = press(state, "Ask for pay");
    state = endWait(state);
    expect(model(state).result?.quest?.phase).toBe("end");
    const log = ensureQuests(playOf(state)).log.length;

    const restored = roundTrip(state);
    const play = playOf(restored);
    expect(model(restored).result?.quest?.phase).toBe("end");
    expect(ensureQuests(play).log.length).toBe(log);
    expect(ensureQuests(play).done).toEqual(["herald"]);
    expect(ensureClock(play).questsWon).toBe(1);
    expect(heroSheet(ensureClock(play), "hero-a").gold).toBe(13);

    const closed = endWait(restored);
    expect(model(closed).step).toBe("menu");
    expect(ensureClock(playOf(closed)).questsWon).toBe(1);
    expect(heroSheet(ensureClock(playOf(closed)), "hero-a").gold).toBe(13);
    expect(ensureQuests(playOf(closed)).log.length).toBe(log);
  });
});
