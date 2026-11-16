import { describe, expect, it } from "vitest";
import { initPlayState } from "../chapter/playState.ts";
import { ensureClock } from "../day/clock.ts";
import { TEST_STORY } from "../session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../session/playContent.ts";
import { initialShellState, type ShellState } from "../session/state.ts";
import { refreshOffersAfterRestore, stepShell } from "../session/stepShell.ts";
import { projectShellView } from "../session/view.ts";
import { type GroupTurnLocal, virtuePromptId } from "./loop.ts";

const SEED =
  "s~test-virtue-ids:hero-a=infused+fortunate,hero-b=fixture~test-skulls:N-egans-end=2,N-dayside=1,N-upper-ice-fangs=0";

/** A game in play at the start of `acting`'s turn, offers built as after a restore. */
const turnStart = (acting: string, virtue: GroupTurnLocal["virtue"] | undefined): ShellState => {
  const play = initPlayState(SEED, PROVING_GROUNDS_PLAY);
  play.dayNumber = 1;
  const base = initialShellState({ sessionId: "s", seed: SEED, stories: [TEST_STORY] });
  const local: GroupTurnLocal = {
    groupId: acting,
    movesLeft: 2,
    awaitingPress: false,
    encounterPending: false,
    landedOnBuildingWithNoMoves: false,
    ...(virtue ? { virtue } : {}),
  };
  const state: ShellState = {
    ...base,
    screen: "play",
    stage: "playing",
    play,
    loops: {
      ...base.loops,
      stack: [{ loopId: "group-turn", phase: "body", local, finishing: false }],
    } as ShellState["loops"],
  };
  refreshOffersAfterRestore(state);
  return state;
};

const press = (state: ShellState, promptId: string, actionId: string) =>
  stepShell(state, { kind: "press", v: 1, deviceId: "pad-1", promptId, actionId } as never);

const localOf = (state: ShellState) => state.loops.stack.at(-1)?.local as GroupTurnLocal;

describe("turn-start virtue step (CU/14)", () => {
  it("EV-01: the panel lists the virtue lines and the move map is offered with no press", () => {
    const state = turnStart("hero-a", { open: true, picks: {} });
    const view = projectShellView(state);
    expect(view.table?.virtue?.title).toBe("Virtues today");
    expect(view.table?.virtue?.lines.map((l) => l.text)).toEqual([
      "Infused: remove 1 skull in Arisilon",
      "Fortunate: a second pick today",
    ]);
    expect(view.actions.some((a) => a.actionId === "walk")).toBe(true);
    expect(view.actions.some((a) => a.actionId === "end-turn")).toBe(true);
  });

  it("EV-02: no virtue, no panel", () => {
    const state = turnStart("hero-c", { open: false, picks: {} });
    expect(projectShellView(state).table?.virtue).toBeNull();
  });

  it("a turn saved before CU/14 (no virtue field) shows no panel and no choice", () => {
    const state = turnStart("hero-a", undefined);
    const view = projectShellView(state);
    expect(view.table?.virtue).toBeNull();
    expect(view.actions.some((a) => a.promptId.startsWith("virtue-choice--"))).toBe(false);
  });

  it("EV-16: Infused offers one button per pressable building; first press wins; the board mirrors", () => {
    let state = turnStart("hero-a", { open: true, picks: {} });
    const offered = projectShellView(state).actions.filter((a) =>
      a.promptId.startsWith("virtue-choice--"),
    );
    expect(offered.map((a) => a.promptId)).toEqual([
      virtuePromptId("hero-a", "infused", "N-egans-end"),
      virtuePromptId("hero-a", "infused", "N-dayside"),
    ]);
    const choice = projectShellView(state).table?.virtue?.choice;
    expect(choice?.prompt).toBe("Infused asks you to choose.");
    expect(choice?.options.map((o) => o.enabled)).toEqual([true, true, false, false]);

    const first = offered[0]!.promptId;
    const second = offered[1]!.promptId;
    const result = press(state, first, "record");
    expect(result.effects.some((e) => e.kind === "press-error")).toBe(false);
    state = result.state;
    expect(ensureClock(state.play!).skulls["N-egans-end"]).toBe(1);
    const view = projectShellView(state);
    expect(view.table?.virtue?.choice).toBeNull();
    expect(view.table?.virtue?.picked).toEqual([
      expect.objectContaining({ virtueId: "infused", name: "Infused" }),
    ]);
    expect(view.actions.some((a) => a.promptId.startsWith("virtue-choice--") && a.open)).toBe(
      false,
    );
    // A second press on the other building changes nothing.
    const late = press(state, second, "record");
    expect(ensureClock(late.state.play!).skulls["N-dayside"]).toBe(1);
  });

  it("the first move closes the panel; the move map was never held back", () => {
    let state = turnStart("hero-a", {
      open: true,
      picks: { infused: { optionId: "x", label: "X" } },
    });
    const walk = projectShellView(state).actions.find((a) => a.actionId === "walk");
    expect(walk).toBeDefined();
    state = press(state, walk!.promptId, "walk").state;
    expect(localOf(state).virtue?.open).toBe(false);
    expect(projectShellView(state).table?.virtue).toBeNull();
  });

  it("EV-03: the fixture virtue offers three buttons through the same list", () => {
    const state = turnStart("hero-b", { open: true, picks: {} });
    const view = projectShellView(state);
    expect(view.table?.virtue?.choice?.options).toHaveLength(3);
    expect(view.actions.filter((a) => a.promptId.startsWith("virtue-choice--"))).toHaveLength(3);
  });

  it("a choice left open keeps the panel after the first move, and survives a restore", () => {
    let state = turnStart("hero-b", { open: true, picks: {} });
    const walk = projectShellView(state).actions.find((a) => a.actionId === "walk")!;
    state = press(state, walk.promptId, "walk").state;
    expect(projectShellView(state).table?.virtue?.choice).not.toBeNull();
    refreshOffersAfterRestore(state);
    expect(
      projectShellView(state).actions.filter((a) => a.promptId.startsWith("virtue-choice--")),
    ).toHaveLength(3);
  });

  it("a virtue press the turn cannot take is logged as an error and changes nothing", () => {
    const state = turnStart("hero-a", { open: true, picks: {} });
    const result = press(state, virtuePromptId("hero-a", "infused", "N-upper-ice-fangs"), "record");
    expect(ensureClock(result.state.play!).skulls["N-upper-ice-fangs"]).toBe(0);
  });
});
