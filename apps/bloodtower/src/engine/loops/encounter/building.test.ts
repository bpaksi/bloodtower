import { describe, expect, it } from "vitest";
import { initPlayState } from "../chapter/playState.ts";
import { ensureClock, heroSheet, setBuildingSkulls } from "../day/clock.ts";
import type { GroupTurnLocal } from "../group-turn/loop.ts";
import { TEST_STORY } from "../session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { initialShellState, type ShellState } from "../session/state.ts";
import { refreshOffersAfterRestore, stepShell } from "../session/stepShell.ts";
import { projectShellView } from "../session/view.ts";
import type { EncounterLocal } from "./loop.ts";
import { openBuildingWait } from "./loop.ts";
import { ensurePicks } from "./picks.ts";

const seedFor = (extra: string) => `s${extra}`;

/** A game with its first group inside a building of `kind`, `moves` moves left. */
const inside = (kind: string, extra: string, moves = 3): ShellState => {
  const seed = seedFor(extra);
  const play = initPlayState(seed, PROVING_GROUNDS_PLAY);
  play.dayNumber = 1;
  const group = play.groups[0];
  if (!group) throw new Error("no group");
  const space = play.content.board.spaces.find((row) => row.building === kind);
  if (!space) throw new Error(`no ${kind}`);
  group.spaceId = space.id;
  group.insideBuilding = true;
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

const press = (state: ShellState, promptId: string, actionId = "build") =>
  stepShell(state, { kind: "press", v: 1, deviceId: "pad-1", promptId, actionId } as never);

const panel = (state: ShellState) => projectShellView(state).table?.building;
const optionFor = (state: ShellState, label: string) =>
  panel(state)?.options.find((option) => option.label === label);
const enc = (state: ShellState) =>
  state.loops.stack.find((f) => f.loopId === "encounter")?.local as EncounterLocal;

describe("building menu (C3/13)", () => {
  it("EV-01/06: the citadel shows Rally, Virtue and Cleanse (Leave is its own action) with move and gold costs", () => {
    const state = inside("citadel", "~test-gold:hero-a=20~test-hp:hero-a=4/12");
    const labels = panel(state)?.options.map((o) => o.label);
    expect(labels).toEqual(["Rally", "Virtue", "Cleanse"]);
    expect(optionFor(state, "Rally")?.detail).toBe("1 move · 5 gold · heals to full");
    expect(optionFor(state, "Virtue")?.detail).toBe("1 move · 10 gold");
    expect(optionFor(state, "Cleanse")?.detail).toBe("1 move");
    expect(
      projectShellView(state)
        .actions.map((a) => a.actionId)
        .filter((a) => a === "leave"),
    ).toHaveLength(1);
  });

  it("EV-06: each kind has its own offers and no Trade", () => {
    const names = (kind: string) =>
      panel(
        inside(kind, "~test-gold:hero-a=20~test-hp:hero-a=4/12~test-named:hero-a=feral"),
      )?.options.map((o) => o.label);
    expect(names("sanctuary")).toEqual(["Cure", "Cleanse"]);
    expect(names("village")).toEqual(["Rest", "Cleanse"]);
    expect(names("bazaar")).toEqual(["Cleanse"]);
  });

  it("EV-03: an unaffordable pick is shown closed with its reason, not hidden", () => {
    const state = inside("citadel", "~test-gold:hero-a=3~test-hp:hero-a=4/12");
    const rally = optionFor(state, "Rally");
    expect(rally?.enabled).toBe(false);
    expect(rally?.reason).toBe("Not enough gold.");
    const shown = projectShellView(state).actions.find((a) => a.label === "Rally");
    expect(shown?.open).toBe(false);
  });

  it("EV-04: two skulls on a citadel leave Cleanse and Leave only", () => {
    const state = inside("citadel", "~test-gold:hero-a=20");
    setBuildingSkulls(state.play!, state.play!.groups[0]!.spaceId, 2);
    refreshOffersAfterRestore(state);
    expect(panel(state)?.options.map((o) => o.label)).toEqual(["Cleanse"]);
  });

  it("EV-02/18: the first cure reads free; after it the next shows its price; Continue keeps that", () => {
    let state = inside("sanctuary", "~test-gold:hero-a=30~test-named:hero-a=feral");
    expect(optionFor(state, "Cure")?.detail).toBe("1 move · free");
    state = press(state, optionFor(state, "Cure")!.promptId).state;
    expect(panel(state)?.step).toBe("who");
    state = press(state, panel(state)!.options[0]!.promptId).state;
    expect(panel(state)?.step).toBe("result");
    expect(panel(state)?.result?.line).toBe("The corruption is lifted.");
    state = press(state, panel(state)!.options[0]!.promptId).state;
    expect(panel(state)?.step).toBe("menu");
    expect(heroSheet(ensureClock(state.play!), "hero-a").corruptions).toBe(0);
    // another corruption; the free one is spent
    ensureClock(state.play!).heroes["hero-a"] = {
      ...heroSheet(ensureClock(state.play!), "hero-a"),
      corruptions: 1,
      named: ["lost"],
    };
    const again = optionFor(state, "Cure");
    expect(again?.detail).toMatch(/gold/);
    expect(again?.detail).not.toMatch(/free/);
    // a restore keeps the used flag (the store is what a checkpoint writes)
    expect(ensurePicks(state.play!).freeCures).toHaveLength(1);
  });

  it("EV-07: Cure lists only corrupted heroes, then the corruptions; only the chosen one goes", () => {
    let state = inside("sanctuary", "~test-gold:hero-a=30~test-named:hero-a=feral+lost");
    state = press(state, optionFor(state, "Cure")!.promptId).state;
    expect(panel(state)?.step).toBe("who");
    expect(panel(state)?.options.map((o) => o.label)).toEqual(["Hero A"]);
    state = press(state, panel(state)!.options[0]!.promptId).state;
    expect(panel(state)?.step).toBe("corruption");
    expect(panel(state)?.options.map((o) => o.label)).toEqual(["Feral", "Lost"]);
    state = press(state, panel(state)!.options[1]!.promptId).state;
    expect(heroSheet(ensureClock(state.play!), "hero-a").named).toEqual(["feral"]);
    expect(panel(state)?.result?.detail).toContain("Lost");
  });

  it("EV-08: Rest offers 1 to the moves left; two moves heal 6 and leave one move", () => {
    let state = inside("village", "~test-hp:hero-a=4/12", 3);
    state = press(state, optionFor(state, "Rest")!.promptId).state;
    expect(panel(state)?.step).toBe("rest-moves");
    expect(panel(state)?.options.map((o) => o.label)).toEqual(["1", "2", "3"]);
    state = press(state, panel(state)!.options[1]!.promptId).state;
    expect(heroSheet(ensureClock(state.play!), "hero-a").hp).toEqual({ hp: 10, max: 12 });
    expect(enc(state).movesLeft).toBe(1);
  });

  it("EV-11/15/17: Rally heals to full, spends 5 gold and 1 move once, has no Next and advances on wait-end", () => {
    let state = inside("citadel", "~test-gold:hero-a=20~test-hp:hero-a=4/12", 3);
    state = press(state, optionFor(state, "Rally")!.promptId).state;
    const sheet = heroSheet(ensureClock(state.play!), "hero-a");
    expect(sheet.hp).toEqual({ hp: 12, max: 12 });
    expect(sheet.gold).toBe(15);
    expect(enc(state).movesLeft).toBe(2);
    expect(panel(state)?.result?.auto).toBe(true);
    expect(panel(state)?.options).toHaveLength(0);
    expect(panel(state)?.result?.detail).toBe("Hero A 12/12");
    const wait = openBuildingWait(state.loops.stack);
    expect(wait).not.toBeNull();
    expect(wait?.maxMs).toBe(4000);
    const end = stepShell(state, {
      kind: "wait-end",
      v: 1,
      waitId: wait!.id,
      cause: "timeout",
    } as never);
    state = end.state;
    expect(panel(state)?.step).toBe("menu");
    // a repeated end changes nothing
    const again = stepShell(state, {
      kind: "wait-end",
      v: 1,
      waitId: wait!.id,
      cause: "timeout",
    } as never);
    expect(panel(again.state)?.step).toBe("menu");
    expect(heroSheet(ensureClock(again.state.play!), "hero-a").gold).toBe(15);
  });

  it("EV-09/20: a fifth tile goes to the give-back; it waits for a press and the group ends with 4", () => {
    let state = inside(
      "citadel",
      "~test-gold:hero-a=20~test-tiles:hero-a=courage+mercy+wisdom+honor",
      3,
    );
    state = press(state, optionFor(state, "Virtue")!.promptId).state;
    expect(panel(state)?.result?.line).toMatch(/^You gain a virtue: /);
    const wait = openBuildingWait(state.loops.stack)!;
    state = stepShell(state, {
      kind: "wait-end",
      v: 1,
      waitId: wait.id,
      cause: "timeout",
    } as never).state;
    expect(panel(state)?.step).toBe("give-back");
    expect(panel(state)?.options.map((o) => o.label)).toEqual([
      "Tile 1",
      "Tile 2",
      "Tile 3",
      "Tile 4",
      "Tile 5 (new)",
    ]);
    // no timer for it
    expect(openBuildingWait(state.loops.stack)).toBeNull();
    expect(heroSheet(ensureClock(state.play!), "hero-a").gold).toBe(10);
    state = press(state, panel(state)!.options[0]!.promptId).state;
    expect(ensurePicks(state.play!).tiles["hero-a"]).toHaveLength(4);
    expect(panel(state)?.step).toBe("menu");
    expect(enc(state).movesLeft).toBe(2);
  });

  it("Cleanse takes a skull, spends the move, and the last move returns to the move map", () => {
    let state = inside("bazaar", "", 1);
    const space = state.play!.groups[0]!.spaceId;
    setBuildingSkulls(state.play!, space, 2);
    refreshOffersAfterRestore(state);
    state = press(state, optionFor(state, "Cleanse")!.promptId).state;
    expect(ensureClock(state.play!).skulls[space]).toBe(1);
    expect(panel(state)?.result?.badge).toBe("−1 skull · +1 day");
    const wait = openBuildingWait(state.loops.stack)!;
    state = stepShell(state, {
      kind: "wait-end",
      v: 1,
      waitId: wait.id,
      cause: "timeout",
    } as never).state;
    // no moves left: the group is out of the building and the turn goes on
    expect(state.play!.groups[0]!.insideBuilding).toBe(false);
    expect(state.loops.stack.some((f) => f.loopId === "encounter")).toBe(false);
  });

  it("a press for a step the building has left is refused with words, and nothing changes", () => {
    let state = inside("citadel", "~test-gold:hero-a=20~test-hp:hero-a=4/12", 3);
    const stale = optionFor(state, "Rally")!.promptId;
    state = press(state, stale).state;
    const again = stepShell(state, {
      kind: "press",
      v: 1,
      deviceId: "pad-1",
      promptId: stale,
      actionId: "build",
    } as never);
    expect(heroSheet(ensureClock(again.state.play!), "hero-a").gold).toBe(15);
  });

  it("Leave still ends the visit and hands the moves left back to the turn", () => {
    let state = inside("citadel", "~test-gold:hero-a=20~test-hp:hero-a=4/12", 3);
    state = press(state, optionFor(state, "Rally")!.promptId).state;
    const wait = openBuildingWait(state.loops.stack)!;
    state = stepShell(state, {
      kind: "wait-end",
      v: 1,
      waitId: wait.id,
      cause: "timeout",
    } as never).state;
    state = press(state, "leave--hero-a", "leave").state;
    const turn = state.loops.stack.find((f) => f.loopId === "group-turn")?.local as GroupTurnLocal;
    expect(turn.movesLeft).toBe(2);
    expect(state.play!.groups[0]!.insideBuilding).toBe(false);
  });
});
