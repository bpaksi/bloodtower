import type { LoopDefinition } from "../../loop/types.ts";
import { playState } from "./playState.ts";

export type ChapterLocal = {
  awaitingDayResult: boolean;
  lastFinishedDay: number;
};

export type ChapterResult = { chapterId: string };

export const chapterLoop: LoopDefinition<ChapterLocal, ChapterResult> = {
  id: "chapter",
  enter: () => ({ awaitingDayResult: false, lastFinishedDay: 0 }),
  body: (local, ctx) => {
    const play = playState();

    if (local.awaitingDayResult) {
      const finished = ctx.getParentResult() as { dayNumber?: number } | undefined;
      if (!finished?.dayNumber || finished.dayNumber <= local.lastFinishedDay) {
        return { local, passComplete: false };
      }
      local = { ...local, awaitingDayResult: false, lastFinishedDay: finished.dayNumber };
    }

    play.childInput = null;
    ctx.startChild("day");
    return { local: { ...local, awaitingDayResult: true }, passComplete: false };
  },
  exit: () => false,
  resultUp: () => ({ chapterId: "proving-grounds" }),
};
