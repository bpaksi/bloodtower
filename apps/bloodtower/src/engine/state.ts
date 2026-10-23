import type { LoopRuntimeState } from "./loop/runtime.ts";
import { emptyLoopRuntime } from "./loop/runtime.ts";
import type { LoopRegistry } from "./loop/types.ts";
import { testNestedLoopRegistry } from "./loops/testNested.ts";

export const ENGINE_VERSION = "0.0.0-step3";

export type EngineMode = "idle" | "test-loop";

export type EngineState = {
  version: typeof ENGINE_VERSION;
  mode: EngineMode;
  seed: string;
  /** Number of events applied so far; the next event uses this as its sequence for rng. */
  eventSeq: number;
  loops: LoopRuntimeState;
  registry: LoopRegistry;
};

export const initialEngineState = (): EngineState => ({
  version: ENGINE_VERSION,
  mode: "idle",
  seed: "",
  eventSeq: 0,
  loops: emptyLoopRuntime(),
  registry: testNestedLoopRegistry,
});
