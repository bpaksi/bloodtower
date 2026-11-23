import type { LoopFrame } from "../../loop/types.ts";
import { endChapterWait, openChapterWait, tryChapters } from "./chapters.ts";
import {
  type ChapterLocal,
  handleChapterPress,
  TABLE_DONE_ACTION,
  tableDonePromptId,
} from "./loop.ts";
import type { PlayState } from "./playState.ts";

/**
 * TEST ONLY (C3/15). Plays through the chapter's beats as the host would: ends each open chapter
 * wait (the card, stamp, close and Reveal) and, unless `stopAtTable`, presses Set the table's Done.
 * `resume` runs the loops after each change. Unit tests with no host use it; the host never does.
 */
export const passChapterBeats = (
  runtime: { stack: LoopFrame[] },
  play: PlayState,
  resume: () => void,
  options: { stopAtTable?: boolean } = {},
): void => {
  for (let guard = 0; guard < 50; guard += 1) {
    const wait = openChapterWait(runtime.stack, play);
    if (wait) {
      endChapterWait(runtime.stack, play, wait.id);
      resume();
      continue;
    }
    const top = runtime.stack.at(-1);
    if (!options.stopAtTable && top?.loopId === "chapter" && tryChapters(play)?.stage === "table") {
      const local = top.local as ChapterLocal;
      top.local = handleChapterPress(local, tableDonePromptId(local.chapter), TABLE_DONE_ACTION);
      resume();
      continue;
    }
    return;
  }
  throw new Error("The chapter's beats never ended.");
};
