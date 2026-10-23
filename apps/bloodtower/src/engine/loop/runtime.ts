import type { EngineEffect } from "../effects.ts";
import type {
  BodyOutcome,
  LoopContext,
  LoopDefinition,
  LoopFrame,
  LoopPhase,
  LoopRegistry,
} from "./types.ts";

export type PromptSlot = {
  promptId: string;
  actionId: string;
  open: boolean;
};

export type LoopRuntimeState = {
  stack: LoopFrame[];
  prompt: PromptSlot | null;
  parentResult: unknown | undefined;
  childStartRequested: string | null;
};

export const emptyLoopRuntime = (): LoopRuntimeState => ({
  stack: [],
  prompt: null,
  parentResult: undefined,
  childStartRequested: null,
});

const makeCtx = (
  loopId: string,
  seed: string,
  eventSeq: number,
  effects: EngineEffect[],
  runtime: LoopRuntimeState,
): LoopContext<unknown> => ({
  loopId,
  seed,
  eventSeq,
  effects,
  tracePhase: (phase: LoopPhase) => {
    effects.push({ kind: "loop-trace", v: 1, loopId, phase });
  },
  recordEnd: (result) => {
    effects.push({ kind: "loop-end", v: 1, loopId, result });
  },
  offerPrompt: (promptId, actionId) => {
    runtime.prompt = { promptId, actionId, open: true };
  },
  startChild: (childLoopId) => {
    runtime.childStartRequested = childLoopId;
  },
  setParentResult: (result) => {
    runtime.parentResult = result;
  },
  getParentResult: () => runtime.parentResult,
});

const getDef = (registry: LoopRegistry, loopId: string): LoopDefinition<unknown, unknown> => {
  const def = registry[loopId];
  if (!def) throw new Error(`Unknown loop "${loopId}".`);
  return def;
};

const pushLoop = (runtime: LoopRuntimeState, loopId: string) => {
  runtime.stack.push({
    loopId,
    phase: "enter",
    local: undefined,
    finishing: false,
  });
};

/** Run synchronous phases until body waits on a prompt, a child start, or the stack is empty/done. */
export const advanceLoops = (
  registry: LoopRegistry,
  seed: string,
  eventSeq: number,
  runtime: LoopRuntimeState,
  effects: EngineEffect[],
): void => {
  for (;;) {
    if (runtime.childStartRequested) {
      const childId = runtime.childStartRequested;
      runtime.childStartRequested = null;
      pushLoop(runtime, childId);
      continue;
    }

    const frame = runtime.stack.at(-1);
    if (!frame) return;

    const def = getDef(registry, frame.loopId);
    const ctx = makeCtx(frame.loopId, seed, eventSeq, effects, runtime);

    switch (frame.phase) {
      case "enter": {
        ctx.tracePhase("enter");
        frame.local = def.enter(ctx);
        frame.phase = "start";
        continue;
      }
      case "start": {
        ctx.tracePhase("start");
        if (def.startPoint) {
          const next = def.startPoint(frame.local, ctx);
          if (next !== undefined) frame.local = next;
        }
        frame.phase = "body";
        continue;
      }
      case "body": {
        ctx.tracePhase("body");
        const outcome: BodyOutcome<unknown> = def.body(frame.local, ctx);
        frame.local = outcome.local;
        if (!outcome.passComplete) {
          if (runtime.childStartRequested) continue;
          return;
        }
        frame.phase = "exit";
        continue;
      }
      case "exit": {
        ctx.tracePhase("exit");
        if (!def.exit(frame.local, ctx)) {
          frame.phase = "body";
          continue;
        }
        frame.finishing = true;
        frame.phase = "close";
        continue;
      }
      case "close": {
        ctx.tracePhase("close");
        if (def.close) {
          const next = def.close(frame.local, ctx);
          if (next !== undefined) frame.local = next;
        }
        frame.phase = "result";
        continue;
      }
      case "result": {
        ctx.tracePhase("result");
        frame.pendingResult = def.resultUp(frame.local, ctx);
        frame.phase = "end";
        continue;
      }
      case "end": {
        ctx.tracePhase("end");
        const result = frame.pendingResult;
        if (def.endPoint && result !== undefined) {
          def.endPoint(frame.local, result, ctx);
        }
        if (result !== undefined) {
          ctx.recordEnd(result);
        }
        runtime.stack.pop();
        if (runtime.stack.length > 0 && result !== undefined) {
          runtime.parentResult = result;
          const parent = runtime.stack.at(-1);
          if (parent?.phase === "body") {
            continue;
          }
        }
        return;
      }
      case "done":
        return;
      default:
        return;
    }
  }
};

export const startRootLoop = (
  registry: LoopRegistry,
  seed: string,
  eventSeq: number,
  runtime: LoopRuntimeState,
  effects: EngineEffect[],
  rootLoopId: string,
): void => {
  pushLoop(runtime, rootLoopId);
  advanceLoops(registry, seed, eventSeq, runtime, effects);
};

export const resumeAfterPrompt = (
  registry: LoopRegistry,
  seed: string,
  eventSeq: number,
  runtime: LoopRuntimeState,
  effects: EngineEffect[],
): void => {
  const frame = runtime.stack.at(-1);
  if (!frame || frame.phase !== "body") return;
  advanceLoops(registry, seed, eventSeq, runtime, effects);
};
