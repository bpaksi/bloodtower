import { describe, expect, it } from "vitest";
import {
  parseShellCheckpoint,
  shellCheckpointFromState,
} from "../../../server/core/shellCheckpoint.ts";
import { initPlayState, type PlayState } from "../chapter/playState.ts";
import { ensureClock, heroSheet, setBuildingSkulls } from "../day/clock.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import { TEST_STORY } from "../session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { bindShellState, clearShellState } from "../session/shellRef.ts";
import { initialShellState, type ShellState } from "../session/state.ts";
import { refreshOffersAfterRestore, stepShell } from "../session/stepShell.ts";
import { type EncounterLocal, handleBuildingPress, openBuildingWait } from "./loop.ts";
import { buildingModel } from "./menu.ts";
import { beginGroupTurn, ensurePicks, freePickPending, turnHasEnded } from "./picks.ts";

/*
 * D6 / 01-drop-counter-and-free-pick, EV-06 to EV-11 and EV-13b: Fortunate's free pick with no moves
 * left (DEC-913, DEC-945), a free Rest (DEC-946) and Cleanse once per building per turn (DEC-572).
 * Every press goes through the encounter loop, the way the iPad does.
 *
 * Fixture note: a skull on a building removes the last offer above Cleanse (DEC-093), so a village
 * with a skull has no Rest. Where an eval reads "Rest at a village with 1 skull", the test uses a
 * citadel's Rally (same shape: a first pick, then Cleanse) or takes Cleanse first.
 */

const FORT = "~test-virtue-ids:hero-a=fortunate";

const spaceOfKind = (play: PlayState, kind: string, nth = 0): string => {
  const found = play.content.board.spaces.filter((row) => row.building === kind)[nth];
  if (!found) throw new Error(`no ${kind} #${nth}`);
  return found.id;
};

const stackAt = (state: ShellState, moves: number): void => {
  const play = state.play as PlayState;
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  group.insideBuilding = true;
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
  state.loops = {
    ...state.loops,
    stack: [
      { loopId: "group-turn", phase: "body", local: turn, finishing: false },
      { loopId: "encounter", phase: "body", local: encounter, finishing: false },
    ],
  } as ShellState["loops"];
  refreshOffersAfterRestore(state);
};

/** A game with the first group (hero-a alone, or with hero-b) inside a `kind` building. */
const inside = (
  kind: string,
  extra: string,
  moves: number,
  opts: { skulls?: number; heroes?: string[] } = {},
): ShellState => {
  const seed = `d6${extra}`;
  const play = initPlayState(seed, PROVING_GROUNDS_PLAY);
  play.dayNumber = 1;
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  group.spaceId = spaceOfKind(play, kind);
  group.heroIds = opts.heroes ?? ["hero-a"];
  const base = initialShellState({ sessionId: "s", seed, stories: [TEST_STORY] });
  const state: ShellState = { ...base, screen: "play", stage: "playing", play };
  if (opts.skulls) setBuildingSkulls(play, group.spaceId, opts.skulls);
  stackAt(state, moves);
  return state;
};

/** The same group walks to another building of `kind` (the nth) with `moves` left. */
const moveTo = (state: ShellState, kind: string, nth: number, moves: number): void => {
  const play = state.play as PlayState;
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  group.spaceId = spaceOfKind(play, kind, nth);
  stackAt(state, moves);
};

const playOf = (state: ShellState): PlayState => state.play as PlayState;
const groupId = (state: ShellState): string => playOf(state).groups[0]?.id ?? "";
const frame = (state: ShellState) => state.loops.stack.find((row) => row.loopId === "encounter");
const enc = (state: ShellState): EncounterLocal => frame(state)?.local as EncounterLocal;
const model = (state: ShellState) => buildingModel(playOf(state), enc(state), (id) => id);
const option = (state: ShellState, label: string) => {
  const found = model(state).options.find((row) => row.label === label);
  if (!found) throw new Error(`no "${label}" in ${model(state).options.map((o) => o.label)}`);
  return found;
};
const labels = (state: ShellState): string[] => model(state).options.map((row) => row.label);
const movesOf = (state: ShellState): number =>
  ensurePicks(playOf(state)).moves[groupId(state)] ?? 0;
const skullsAt = (state: ShellState): number =>
  ensureClock(playOf(state)).skulls[playOf(state).groups[0]?.spaceId ?? ""] ?? 0;

const pressId = (state: ShellState, promptId: string) =>
  stepShell(state, {
    kind: "press",
    v: 1,
    deviceId: "pad-1",
    promptId,
    actionId: "build",
  } as never);
const leave = (state: ShellState): ShellState =>
  stepShell(state, {
    kind: "press",
    v: 1,
    deviceId: "pad-1",
    promptId: option(state, "Leave").promptId,
    actionId: "leave",
  } as never).state;
const press = (state: ShellState, label: string): ShellState =>
  pressId(state, option(state, label).promptId).state;

/** Ends the result the last pick shows: an auto result by its wait, any other by Next. */
const finish = (state: ShellState): ShellState => {
  const wait = openBuildingWait(state.loops.stack);
  if (wait) {
    return stepShell(state, { kind: "wait-end", v: 1, waitId: wait.id, cause: "timeout" } as never)
      .state;
  }
  return press(state, "Next");
};

/** Rest by `count` moves: the Rest pick, the moves step, then the result. */
const rest = (state: ShellState, count: number): ShellState => {
  let next = press(state, "Rest");
  expect(model(next).step).toBe("rest-moves");
  next = press(next, String(count));
  return finish(next);
};

describe("D6 01 Fortunate's free pick", () => {
  it("EV-06 the free pick with no moves left (citadel: Rally, then a free Cleanse)", () => {
    let state = inside("citadel", `${FORT}~test-hp:hero-a=4/12~test-gold:hero-a=15`, 1, {
      skulls: 1,
    });
    const supply = ensureClock(playOf(state)).supply;
    expect(labels(state)).toEqual(["Rally", "Cleanse", "Leave"]);
    state = finish(press(state, "Rally"));
    expect(movesOf(state)).toBe(0);
    expect(freePickPending(playOf(state), groupId(state))).toBe(true);
    // The menu stays open at 0 moves; Rally and Cleanse read 0 moves.
    expect(model(state).step).toBe("menu");
    expect(option(state, "Rally").enabled).toBe(true);
    expect(option(state, "Cleanse").enabled).toBe(true);
    expect(option(state, "Rally").detail).toMatch(/^0 moves/);
    expect(option(state, "Cleanse").detail).toMatch(/^0 moves/);

    state = finish(press(state, "Cleanse"));
    expect(skullsAt(state)).toBe(0);
    expect(ensureClock(playOf(state)).supply).toBe(supply + 1);
    expect(movesOf(state)).toBe(0);
    expect(heroSheet(ensureClock(playOf(state)), "hero-a").gold).toBe(10);
    // Every pick greyed; Leave still works; no third pick.
    expect(model(state).step).toBe("menu");
    for (const row of model(state).options.filter((o) => o.actionId === "build")) {
      expect(row.enabled).toBe(false);
    }
    expect(option(state, "Rally").reason).toBe("No moves left.");
    expect(option(state, "Leave").enabled).toBe(true);
    expect(freePickPending(playOf(state), groupId(state))).toBe(false);
  });

  it("EV-07 a turn end comes first: Uncertain loses the free pick (citadel Rally)", () => {
    let state = inside(
      "citadel",
      `${FORT}~test-named:hero-a=uncertain~test-hp:hero-a=4/12~test-gold:hero-a=15`,
      2,
      { skulls: 1 },
    );
    state = press(state, "Rally");
    const play = playOf(state);
    expect(turnHasEnded(play, groupId(state))).toBe(true);
    expect(movesOf(state)).toBe(0);
    expect(freePickPending(play, groupId(state))).toBe(false);
    expect(ensurePicks(play).freePickDay?.[groupId(state)]).toBeUndefined();
    // Nothing is left to pick: the building closes or every pick is greyed.
    state = finish(state);
    if (frame(state)) {
      for (const row of model(state).options.filter((o) => o.actionId === "build")) {
        expect(row.enabled).toBe(false);
      }
    }
  });

  it("EV-08 (a) Cleanse once per building per turn, the free pick kept", () => {
    // Eval's "2 skulls, then Rest" cannot be played: a remaining skull strips Rest (DEC-093).
    // One skull lets Rest return after the first Cleanse; the second Cleanse is still refused
    // as once-per-turn ("Cleanse is not possible now."), not "There are no skulls to clear."
    let state = inside("village", `${FORT}~test-hp:hero-a=4/12`, 1, { skulls: 1 });
    const first = option(state, "Cleanse").promptId;
    state = finish(press(state, "Cleanse"));
    expect(skullsAt(state)).toBe(0);
    const row = option(state, "Cleanse");
    expect(row.enabled).toBe(false);
    expect(row.reason).toBe("Cleanse is not possible now.");
    expect(row.detail).toMatch(/^0 moves/);
    expect(option(state, "Rest").enabled).toBe(true);
    expect(option(state, "Rest").detail).toMatch(/^0 moves/);
    // The press is refused with those words; no skull returns and the free pick is not spent.
    // A closed row is not offered, so the press goes straight to the encounter's handler.
    bindShellState(state);
    try {
      expect(handleBuildingPress(enc(state), row.promptId).refusal).toBe(
        "Cleanse is not possible now.",
      );
    } finally {
      clearShellState();
    }
    expect(skullsAt(state)).toBe(0);
    expect(freePickPending(playOf(state), groupId(state))).toBe(true);
    expect(ensurePicks(playOf(state)).freePickDay?.[groupId(state)]).toBeUndefined();
    expect(first).toContain("--pick--cleanse");
    // The refused press did not spend the free pick: Rest for 1 heals +3 and takes no move.
    // Direct handleBuildingPress does not rebuild offers; refresh so Rest is an open press.
    refreshOffersAfterRestore(state);
    const hpBefore = heroSheet(ensureClock(playOf(state)), "hero-a").hp;
    expect(hpBefore).toEqual({ hp: 4, max: 12 });
    const movesBefore = movesOf(state);
    state = rest(state, 1);
    expect(heroSheet(ensureClock(playOf(state)), "hero-a").hp).toEqual({ hp: 7, max: 12 });
    expect(movesOf(state)).toBe(movesBefore);
  });

  it("EV-08 (b) no Fortunate: the same turn stays Cleansed, the next day it is open again", () => {
    let state = inside("village", "~test-hp:hero-a=4/12", 3, { skulls: 2 });
    state = finish(press(state, "Cleanse"));
    expect(skullsAt(state)).toBe(1);
    // Leave, enter again the same turn: still greyed.
    expect(freePickPending(playOf(state), groupId(state))).toBe(false);
    moveTo(state, "village", 0, 2);
    expect(skullsAt(state)).toBe(1);
    expect(option(state, "Cleanse").enabled).toBe(false);
    expect(option(state, "Cleanse").reason).toBe("Cleanse is not possible now.");
    // Next day: the turn begins again.
    beginGroupTurn(playOf(state), groupId(state));
    stackAt(state, 3);
    expect(option(state, "Cleanse").enabled).toBe(true);
  });

  it("EV-09 one free pick a day per group, spent only when taken", () => {
    let state = inside(
      "village",
      `${FORT.replace("hero-a=fortunate", "hero-a=fortunate,hero-b=fortunate")}~test-hp:hero-a=4/12`,
      6,
      {
        heroes: ["hero-a", "hero-b"],
      },
    );
    const group = groupId(state);
    // X: Rest 1, then Leave. No free pick is spent or kept.
    state = rest(state, 1);
    expect(movesOf(state)).toBe(5);
    expect(freePickPending(playOf(state), group)).toBe(true);
    state = leave(state);
    expect(freePickPending(playOf(state), group)).toBe(false);
    expect(ensurePicks(playOf(state)).freePickDay?.[group]).toBeUndefined();

    // Y: Rest 1, the lines read 0 moves, the free Rest takes none, then the lines read 1 move.
    moveTo(state, "village", 1, 5);
    state = rest(state, 1);
    expect(movesOf(state)).toBe(4);
    expect(option(state, "Cleanse").detail).toBe("0 moves");
    expect(option(state, "Rest").detail).toMatch(/^0 moves/);
    state = rest(state, 1);
    expect(movesOf(state)).toBe(4);
    expect(option(state, "Cleanse").detail).toBe("1 move");
    expect(freePickPending(playOf(state), group)).toBe(false);
    state = leave(state);

    // Z: no free pick: Rest 1 takes a move and the lines read 1 move.
    moveTo(state, "village", 2, 4);
    state = rest(state, 1);
    expect(movesOf(state)).toBe(3);
    expect(option(state, "Cleanse").detail).toBe("1 move");
    expect(freePickPending(playOf(state), group)).toBe(false);
  });

  it("EV-10 the free pick still pays its gold", () => {
    let state = inside("citadel", `${FORT}~test-hp:hero-a=4/12~test-gold:hero-a=15`, 1);
    state = finish(press(state, "Rally"));
    expect(heroSheet(ensureClock(playOf(state)), "hero-a").gold).toBe(10);
    expect(movesOf(state)).toBe(0);
    const draw = option(state, "Virtue");
    expect(draw.enabled).toBe(true);
    expect(draw.detail).toBe("0 moves · 10 gold");
    state = finish(press(state, "Virtue"));
    expect(heroSheet(ensureClock(playOf(state)), "hero-a").gold).toBe(0);
    expect(movesOf(state)).toBe(0);
    expect(ensurePicks(playOf(state)).tiles[groupId(state)]).toHaveLength(1);
  });

  it("EV-11 (a) a free Rest waives one move (Cleanse first, then the free Rest)", () => {
    let state = inside("village", `${FORT}~test-hp:hero-a=2/12`, 1, { skulls: 1 });
    state = finish(press(state, "Cleanse"));
    expect(movesOf(state)).toBe(0);
    expect(labels(state)).toEqual(["Rest", "Cleanse", "Leave"]);
    state = press(state, "Rest");
    expect(labels(state)).toEqual(["1"]);
    state = finish(press(state, "1"));
    expect(heroSheet(ensureClock(playOf(state)), "hero-a").hp).toEqual({ hp: 5, max: 12 });
    expect(movesOf(state)).toBe(0);
  });

  it("EV-11 (b) two moves: Rest 1, then a free Rest may run to 2", () => {
    let state = inside("village", `${FORT}~test-hp:hero-a=2/12`, 2);
    state = rest(state, 1);
    expect(movesOf(state)).toBe(1);
    state = press(state, "Rest");
    expect(labels(state)).toEqual(["1", "2"]);
    state = finish(press(state, "2"));
    expect(heroSheet(ensureClock(playOf(state)), "hero-a").hp).toEqual({ hp: 11, max: 12 });
    expect(movesOf(state)).toBe(0);
  });

  it("a rest past the free pick's extra move is refused", () => {
    let state = inside("village", `${FORT}~test-hp:hero-a=2/12`, 2);
    state = rest(state, 1);
    state = press(state, "Rest");
    const stale = state;
    const tooMany = pressId(stale, model(stale).options[0]?.promptId.replace(/--1$/, "--3") ?? "");
    expect(heroSheet(ensureClock(playOf(tooMany.state)), "hero-a").hp).toEqual({ hp: 5, max: 12 });
    expect(movesOf(tooMany.state)).toBe(1);
  });
});

const roundTrip = (state: ShellState): ShellState => {
  const row = JSON.parse(JSON.stringify(shellCheckpointFromState(state))) as unknown;
  const restored = parseShellCheckpoint(row);
  refreshOffersAfterRestore(restored);
  return restored;
};

describe("D6 01 survival", () => {
  it("EV-13b Continue keeps the free pick and the Cleansed building; a replay changes nothing", () => {
    let state = inside("village", `${FORT}~test-hp:hero-a=4/12`, 1, { skulls: 2 });
    const firstCleanse = option(state, "Cleanse").promptId;
    state = finish(press(state, "Cleanse"));
    const restored = roundTrip(state);
    const group = groupId(restored);
    expect(skullsAt(restored)).toBe(1);
    expect(option(restored, "Cleanse").enabled).toBe(false);
    expect(option(restored, "Cleanse").detail).toMatch(/^0 moves/);
    expect(freePickPending(playOf(restored), group)).toBe(true);

    // Replaying the first Cleanse's press, and the live one, changes nothing.
    for (const promptId of [firstCleanse, option(restored, "Cleanse").promptId]) {
      const again = pressId(restored, promptId).state;
      expect(skullsAt(again)).toBe(1);
      expect(freePickPending(playOf(again), group)).toBe(true);
      expect(movesOf(again)).toBe(0);
    }
  });
});
