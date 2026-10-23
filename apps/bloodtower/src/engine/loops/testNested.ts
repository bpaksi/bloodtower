import type { LoopDefinition, LoopRegistry } from "../loop/types.ts";

type InnerLocal = {
  pass: number;
};

type OuterLocal = {
  passes: number;
  childDone: boolean;
};

const innerLoop: LoopDefinition<InnerLocal, string> = {
  id: "test-inner",
  enter: () => ({ pass: 0 }),
  body: (local, ctx) => {
    if (local.pass === 0) {
      ctx.offerPrompt("inner-advance", "continue");
      return { local: { ...local, pass: 1 }, passComplete: false };
    }
    return { local, passComplete: true };
  },
  exit: (local) => local.pass >= 1,
  resultUp: () => "inner-result",
  endPoint: (_local, result) => {
    if (result !== "inner-result") {
      throw new Error("inner end point did not receive result");
    }
  },
};

const outerLoop: LoopDefinition<OuterLocal, number> = {
  id: "test-outer",
  enter: () => ({ passes: 0, childDone: false }),
  body: (local, ctx) => {
    if (local.passes === 0) {
      ctx.startChild("test-inner");
      return { local: { ...local, passes: 1 }, passComplete: false };
    }
    if (!local.childDone) {
      if (ctx.getParentResult() !== "inner-result") {
        return { local, passComplete: false };
      }
      ctx.offerPrompt("outer-advance", "continue");
      return { local: { ...local, childDone: true }, passComplete: false };
    }
    return { local, passComplete: true };
  },
  exit: (local) => local.childDone,
  resultUp: () => 42,
  endPoint: (_local, result) => {
    if (result !== 42) {
      throw new Error("outer end point did not receive result");
    }
  },
};

export const testNestedLoopRegistry: LoopRegistry = {
  "test-inner": innerLoop as LoopDefinition<unknown, unknown>,
  "test-outer": outerLoop as LoopDefinition<unknown, unknown>,
};

export const TEST_ROOT_LOOP_ID = "test-outer";
