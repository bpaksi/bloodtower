import type { EngineEffect } from "./effects.ts";
import type { EngineEvent } from "./events.ts";
import { engineEventSchema } from "./events.ts";
import { advanceLoops, resumeAfterPrompt, startRootLoop } from "./loop/runtime.ts";
import { TEST_ROOT_LOOP_ID } from "./loops/testNested.ts";
import type { EngineState } from "./state.ts";
import { initialEngineState } from "./state.ts";

export type StepResult = {
  state: EngineState;
  effects: EngineEffect[];
};

const withEffects = (state: EngineState, effects: EngineEffect[]): StepResult => ({
  state,
  effects,
});

export const step = (state: EngineState, event: EngineEvent): StepResult => {
  const parsed = engineEventSchema.safeParse(event);
  if (!parsed.success) {
    throw new Error(`Invalid engine event: ${parsed.error.message}`);
  }
  const e = parsed.data;
  const effects: EngineEffect[] = [];
  const eventSeq = state.eventSeq;

  if (e.kind === "start-test-loop") {
    const next: EngineState = {
      ...state,
      mode: "test-loop",
      seed: e.seed,
      eventSeq: eventSeq + 1,
      loops: { stack: [], prompt: null, parentResult: undefined, childStartRequested: null },
    };
    startRootLoop(next.registry, e.seed, eventSeq, next.loops, effects, TEST_ROOT_LOOP_ID);
    return withEffects(next, effects);
  }

  if (e.kind === "press") {
    const prompt = state.loops.prompt;
    if (!prompt || prompt.promptId !== e.promptId || prompt.actionId !== e.actionId) {
      effects.push({
        kind: "recorded-press",
        v: 1,
        deviceId: e.deviceId,
        promptId: e.promptId,
        actionId: e.actionId,
        winner: false,
      });
      return withEffects({ ...state, eventSeq: eventSeq + 1 }, effects);
    }
    if (!prompt.open) {
      effects.push({
        kind: "recorded-press",
        v: 1,
        deviceId: e.deviceId,
        promptId: e.promptId,
        actionId: e.actionId,
        winner: false,
      });
      if (prompt.promptId === e.promptId && prompt.actionId === e.actionId) {
        return withEffects(state, effects);
      }
      return withEffects({ ...state, eventSeq: eventSeq + 1 }, effects);
    }

    const nextLoops = {
      ...state.loops,
      prompt: { ...prompt, open: false },
    };
    const next: EngineState = {
      ...state,
      eventSeq: eventSeq + 1,
      loops: nextLoops,
    };
    effects.push({
      kind: "recorded-press",
      v: 1,
      deviceId: e.deviceId,
      promptId: e.promptId,
      actionId: e.actionId,
      winner: true,
    });
    resumeAfterPrompt(next.registry, next.seed, eventSeq, next.loops, effects);
    return withEffects(next, effects);
  }

  return withEffects(state, effects);
};

export { initialEngineState };
