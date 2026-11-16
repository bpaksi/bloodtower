import { describe, expect, it } from "vitest";
import { initPlayState } from "../../engine/loops/chapter/playState.ts";
import { ensureClock, heroSheet } from "../../engine/loops/day/clock.ts";
import type { EncounterLocal } from "../../engine/loops/encounter/loop.ts";
import { ensurePicks } from "../../engine/loops/encounter/picks.ts";
import { TEST_STORY } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { initialShellState, type ShellState } from "../../engine/loops/session/state.ts";
import { refreshOffersAfterRestore, stepShell } from "../../engine/loops/session/stepShell.ts";
import { projectShellView } from "../../engine/loops/session/view.ts";
import { parseShellCheckpoint, shellCheckpointFromState } from "./shellCheckpoint.ts";

// C3/13 survival (EV-17, EV-18, EV-20): a Continue brings back the same step, the same tiles and
// the same prices, and a payment is not made twice.
const SEED = "c3-13-save~test-gold:hero-a=20~test-tiles:hero-a=courage+mercy+wisdom+honor";

const roundTrip = (state: ShellState): ShellState => {
  const row = JSON.parse(JSON.stringify(shellCheckpointFromState(state))) as unknown;
  const restored = parseShellCheckpoint(row);
  refreshOffersAfterRestore(restored);
  return restored;
};

const inCitadel = (): ShellState => {
  const play = initPlayState(SEED, PROVING_GROUNDS_PLAY);
  play.dayNumber = 1;
  const group = play.groups[0];
  const space = play.content.board.spaces.find((row) => row.building === "citadel");
  if (!group || !space) throw new Error("no citadel group");
  group.spaceId = space.id;
  group.insideBuilding = true;
  const base = initialShellState({ sessionId: "s", seed: SEED, stories: [TEST_STORY] });
  const encounter: EncounterLocal = {
    groupId: group.id,
    movesLeft: 3,
    serial: 0,
    step: { kind: "menu" },
  };
  const state = {
    ...base,
    screen: "play",
    stage: "playing",
    play,
    loops: {
      ...base.loops,
      stack: [
        {
          loopId: "group-turn",
          phase: "body",
          local: {
            groupId: group.id,
            movesLeft: 3,
            awaitingPress: false,
            encounterPending: true,
            landedOnBuildingWithNoMoves: false,
          },
          finishing: false,
        },
        { loopId: "encounter", phase: "body", local: encounter, finishing: false },
      ],
    },
  } as ShellState;
  refreshOffersAfterRestore(state);
  return state;
};

type WaitLocal = EncounterLocal & { step: { result: { wait: { id: string } } } };
const waitIdOf = (state: ShellState): string => {
  const frame = state.loops.stack.at(-1);
  if (!frame) throw new Error("no frame");
  return (frame.local as WaitLocal).step.result.wait.id;
};

const press = (state: ShellState, promptId: string) =>
  stepShell(state, { kind: "press", v: 1, deviceId: "pad", promptId, actionId: "build" } as never)
    .state;

describe("a save and the building menu", () => {
  it("EV-20: the give-back comes back with the same five tiles and one payment", () => {
    let state = inCitadel();
    const virtue = projectShellView(state).table?.building?.options.find(
      (o) => o.label === "Virtue",
    );
    state = press(state, virtue?.promptId ?? "");
    const waitId = waitIdOf(state);
    state = stepShell(state, { kind: "wait-end", v: 1, waitId, cause: "timeout" } as never).state;
    const before = projectShellView(state).table?.building;
    expect(before?.step).toBe("give-back");

    const restored = roundTrip(state);
    const after = projectShellView(restored).table?.building;
    expect(after?.step).toBe("give-back");
    expect(after?.options.map((o) => o.label)).toEqual(before?.options.map((o) => o.label));
    expect(after?.options.map((o) => o.detail)).toEqual(before?.options.map((o) => o.detail));
    expect(ensurePicks(restored.play as never).tiles["hero-a"]).toEqual(
      ensurePicks(state.play as never).tiles["hero-a"],
    );
    expect(heroSheet(ensureClock(restored.play as never), "hero-a").gold).toBe(10);
    expect(
      ensurePicks(restored.play as never).log.filter((e) => e.kind === "virtue-draw"),
    ).toHaveLength(1);
  });

  it("an auto-advancing result comes back as the same result and still advances once", () => {
    let state = inCitadel();
    const virtue = projectShellView(state).table?.building?.options.find(
      (o) => o.label === "Virtue",
    );
    // three tiles so there is no give-back
    ensurePicks(state.play as never).tiles["hero-a"] = ["courage"];
    state = press(state, virtue?.promptId ?? "");
    const restored = roundTrip(state);
    const local = restored.loops.stack.at(-1)?.local as EncounterLocal & {
      step: { result: { wait: { id: string } } };
    };
    expect(projectShellView(restored).table?.building?.result?.auto).toBe(true);
    const done = stepShell(restored, {
      kind: "wait-end",
      v: 1,
      waitId: local.step.result.wait.id,
      cause: "timeout",
    } as never).state;
    expect(projectShellView(done).table?.building?.step).toBe("menu");
    expect(heroSheet(ensureClock(done.play as never), "hero-a").gold).toBe(10);
  });
});
