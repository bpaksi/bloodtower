import type { EngineEffect } from "../effects.ts";

/** One row of DEC-143, in order, after a body pass completes. */
export type LoopPhase = "enter" | "start" | "body" | "exit" | "close" | "result" | "end" | "done";

export type LoopContext<TLocal> = {
  loopId: string;
  seed: string;
  eventSeq: number;
  effects: EngineEffect[];
  tracePhase: (phase: LoopPhase) => void;
  recordEnd: (result: unknown) => void;
  offerPrompt: (promptId: string, actionId: string) => void;
  /** Push a child loop; the parent body must return with passComplete false. */
  startChild: (loopId: string) => void;
  /** Set when this loop's parent should receive a result (after end). */
  setParentResult: (result: unknown) => void;
  getParentResult: () => unknown | undefined;
};

export type BodyOutcome<TLocal> = {
  local: TLocal;
  /** True when one pass of the body finished and exit may be checked (DEC-137). */
  passComplete: boolean;
};

export type LoopDefinition<TLocal, TResult> = {
  id: string;
  enter: (ctx: LoopContext<TLocal>) => TLocal;
  startPoint?: (local: TLocal, ctx: LoopContext<TLocal>) => TLocal | void;
  body: (local: TLocal, ctx: LoopContext<TLocal>) => BodyOutcome<TLocal>;
  exit: (local: TLocal, ctx: LoopContext<TLocal>) => boolean;
  close?: (local: TLocal, ctx: LoopContext<TLocal>) => TLocal | void;
  resultUp: (local: TLocal, ctx: LoopContext<TLocal>) => TResult;
  endPoint?: (local: TLocal, result: TResult, ctx: LoopContext<TLocal>) => void;
};

export type LoopFrame = {
  loopId: string;
  phase: LoopPhase;
  local: unknown;
  /** Result passed to end point (DEC-142). */
  pendingResult?: unknown;
  /** True after exit passed and we are unwinding. */
  finishing: boolean;
};

export type LoopRegistry = Record<string, LoopDefinition<unknown, unknown>>;
