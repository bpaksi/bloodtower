import type { PackCondition } from "../../../protocols/pack-v2/conditions.ts";
import type { ChapterResult } from "../chapter/loop.ts";

/*
 * MEC-032 .41 to .49: how a game ends. The chapter loop reports won or lost; this turns the
 * report into the end the close writes and the end point plays (DEC-144, DEC-664).
 */

/** The three ways to lose (DEC-043). */
export type LossWay = "corruption" | "skulls" | "buildings";

export type GameEnd = {
  outcome: "won" | "lost";
  /** Set when lost: which of the DEC-043 ways. */
  reason?: LossWay;
  /** The scene the end plays: one loss scene per way, one win scene (DEC-144). */
  sceneId: string;
  /** The chapter the game ended in. */
  chapter: number;
  /** Set when the C4 switch ended the game at chapter 3 (Q-C4-01): the record's `end`. */
  end?: "chapter_3";
};

/** Placeholder win copy for the C4 chapter 3 end (Q-C4-01); the real line replaces it. */
export const CHAPTER_3_WIN_COPY =
  '[COPY: chapter 3 win, Loremaster = "The Lock is turned and the last stand held. The Warden\'s door is open, for now."]';

export const WIN_SCENE_ID = "win";

/** One loss scene per way to lose (DEC-144). */
export const lossSceneId = (way: LossWay): string => `loss-${way}`;

/**
 * What a chapter's report does to the game. Won and not last: the next chapter opens (DEC-133).
 * A report with no outcome (a game with no chapter plan) ends nothing.
 */
export const gameEndFrom = (result: Partial<ChapterResult>): GameEnd | "next" | null => {
  if (!result.chapterId || !result.outcome) return null;
  const chapter = result.chapter ?? 0;
  if (result.outcome === "lost") {
    // A loss always names its way; a missing one is the supply running out, never silent.
    const reason: LossWay = result.reason ?? "skulls";
    return { outcome: "lost", reason, sceneId: lossSceneId(reason), chapter };
  }
  if (result.last) {
    const won: GameEnd = { outcome: "won", sceneId: WIN_SCENE_ID, chapter };
    if (result.end) won.end = result.end;
    return won;
  }
  return "next";
};

/** A win line's condition against the flags the game set. Only flag logic can pick a line (DEC-664). */
const holds = (condition: PackCondition, flags: ReadonlySet<string>): boolean => {
  switch (condition.type) {
    case "flag":
      return flags.has(condition.flag) === (condition.value ?? true);
    case "and":
      return condition.all.every((part) => holds(part, flags));
    case "or":
      return condition.any.some((part) => holds(part, flags));
    case "not":
      return !holds(condition.cond, flags);
    default:
      return false;
  }
};

export type WinLineRow = { id: string; when?: PackCondition | undefined };

/**
 * The finale's closing line, picked by the flag the last choice set (DEC-664). The first line
 * whose condition holds plays; a line with no condition plays when none before it does.
 * Null when no line applies: the caller logs that, it never plays a wrong line.
 */
export const pickWinLine = (
  lines: readonly WinLineRow[],
  flags: ReadonlySet<string>,
): string | null => {
  for (const line of lines) {
    if (line.when && holds(line.when, flags)) return line.id;
  }
  return lines.find((line) => !line.when)?.id ?? null;
};
