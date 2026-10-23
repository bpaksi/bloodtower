import { eventRng } from "@dark-tower/rng";
import { describe, expect, it } from "vitest";
import type { EngineEffect } from "./effects.ts";
import type { EngineEvent } from "./events.ts";
import { initialEngineState, step } from "./step.ts";

const tracePhases = (effects: EngineEffect[], loopId: string) =>
  effects
    .filter(
      (e): e is Extract<EngineEffect, { kind: "loop-trace" }> =>
        e.kind === "loop-trace" && e.loopId === loopId,
    )
    .map((e) => e.phase);

const runEvents = (events: EngineEvent[]) => {
  let state = initialEngineState();
  const allEffects: EngineEffect[] = [];
  for (const event of events) {
    const result = step(state, event);
    state = result.state;
    allEffects.push(...result.effects);
  }
  return { state, allEffects };
};

describe("nested test loop template order", () => {
  it("runs every DEC-143 row in order, including end points that see the result", () => {
    const events: EngineEvent[] = [
      { kind: "start-test-loop", v: 1, seed: "trace-seed" },
      {
        kind: "press",
        v: 1,
        deviceId: "d1",
        promptId: "inner-advance",
        actionId: "continue",
      },
      {
        kind: "press",
        v: 1,
        deviceId: "d1",
        promptId: "outer-advance",
        actionId: "continue",
      },
    ];
    const { state, allEffects } = runEvents(events);

    expect(state.loops.stack).toHaveLength(0);
    expect(tracePhases(allEffects, "test-inner")).toEqual([
      "enter",
      "start",
      "body",
      "body",
      "exit",
      "close",
      "result",
      "end",
    ]);
    expect(tracePhases(allEffects, "test-outer")).toEqual([
      "enter",
      "start",
      "body",
      "body",
      "body",
      "exit",
      "close",
      "result",
      "end",
    ]);

    const ends = allEffects.filter((e) => e.kind === "loop-end");
    expect(ends).toEqual([
      { kind: "loop-end", v: 1, loopId: "test-inner", result: "inner-result" },
      { kind: "loop-end", v: 1, loopId: "test-outer", result: 42 },
    ]);
  });
});

describe("prompt first press wins", () => {
  it("accepts the first press and rejects a second on the same prompt with no loop change", () => {
    const start: EngineEvent[] = [{ kind: "start-test-loop", v: 1, seed: "press-seed" }];
    let state = initialEngineState();
    for (const event of start) {
      state = step(state, event).state;
    }
    expect(state.loops.prompt?.open).toBe(true);

    const first = step(state, {
      kind: "press",
      v: 1,
      deviceId: "ipad-a",
      promptId: "inner-advance",
      actionId: "continue",
    });
    expect(first.effects).toContainEqual({
      kind: "recorded-press",
      v: 1,
      deviceId: "ipad-a",
      promptId: "inner-advance",
      actionId: "continue",
      winner: true,
    });
    expect(first.state.loops.stack.length).toBeGreaterThan(0);

    const closedPrompt = {
      ...state.loops,
      prompt: { promptId: "inner-advance", actionId: "continue", open: false },
    };
    const frozen: typeof state = {
      ...state,
      eventSeq: 7,
      loops: closedPrompt,
    };

    const second = step(frozen, {
      kind: "press",
      v: 1,
      deviceId: "ipad-b",
      promptId: "inner-advance",
      actionId: "continue",
    });
    expect(second.effects).toContainEqual({
      kind: "recorded-press",
      v: 1,
      deviceId: "ipad-b",
      promptId: "inner-advance",
      actionId: "continue",
      winner: false,
    });
    expect(second.state.loops).toEqual(frozen.loops);
    expect(second.state.mode).toBe(frozen.mode);
    expect(second.state.seed).toBe(frozen.seed);
    expect(second.state.eventSeq).toBe(frozen.eventSeq);
  });
});

describe("event replay", () => {
  const prompts = ["inner-advance", "outer-advance"] as const;

  const randomRun = (seed: string, presses: number): EngineEvent[] => {
    const rng = eventRng(seed, 0);
    const events: EngineEvent[] = [{ kind: "start-test-loop", v: 1, seed: `game-${seed}` }];
    for (let i = 0; i < presses; i++) {
      const pick = rng.pick(prompts);
      events.push({
        kind: "press",
        v: 1,
        deviceId: `device-${rng.int(1, 4)}`,
        promptId: pick,
        actionId: "continue",
      });
      if (rng.chance(0.35)) {
        events.push({
          kind: "press",
          v: 1,
          deviceId: `device-${rng.int(1, 4)}`,
          promptId: pick,
          actionId: "continue",
        });
      }
    }
    return events;
  };

  it("replaying events from the first yields the same state (200 seeded runs)", () => {
    for (let i = 0; i < 200; i++) {
      const seed = `replay-${i}`;
      const events = randomRun(seed, 12);
      const live = runEvents(events).state;
      let replay = initialEngineState();
      for (const event of events) {
        replay = step(replay, event).state;
      }
      expect(replay).toEqual(live);
    }
  });
});
