import { AUTO_ADVANCE_MS } from "../../protocols/v2/views.ts";
import {
  CHAPTER_3_WIN_COPY,
  type GameEnd,
  type LossWay,
  pickWinLine,
  type WinLineRow,
} from "../loops/game/end.ts";

/*
 * C3/16 (SCR-018, UI-046, DEC-144, DEC-627, DEC-663, DEC-664, PT-02): the outcome scene on the
 * Story board and iPad. Words come verbatim from the brief's locked Copy table (Loremaster
 * 2026-11-12). Beat order:
 * - Loss: scene (Painting + loss narration + CUE-003) -> summary -> Game stats.
 * - Win:  scene (Painting + "Chapter cleared.") -> closing (Loremaster / finale line) -> summary -> Game stats.
 */

export const OUTCOME_COPY = {
  winScene: "Chapter cleared.",
  winChapter1:
    "The roads are open. On the far hill, a fire burns in the old keep, where no one has lived for forty years.",
  winFinaleShattered: "The shard shatters. The Tower's call goes quiet, and the roads are yours.",
  winFinaleHolds:
    "You swear his oath and take up his watch. The Tower called to him once. It will call to you.",
  lossSkulls:
    "The last skull falls. The Tower's shadow covers the land, and the roads are his for good.",
  lossCorruption:
    "One of you hears the Tower call, and goes to it. Without them, the hunt is over.",
  lossBuildings:
    "Four strongholds have fallen. There is nowhere left to hold, and his raiders own the land.",
  tickAuto: "Moves on by itself.",
  summary: (days: number, questsDone: number, skullsOnBoard: number) =>
    `${days} days. ${questsDone} quests done. ${skullsOnBoard} skulls on the board.`,
} as const;

/** The two finale closing lines (DEC-663, DEC-664), matched to pack.yaml's `endings.win`. */
export const FINALE_WIN_LINES: readonly WinLineRow[] = [
  { id: "win-break", when: { type: "flag", flag: "ending-break", value: true } },
  { id: "win-oath", when: { type: "flag", flag: "ending-oath", value: true } },
];

const FINALE_TEXT_BY_ID: Record<string, string> = {
  "win-break": OUTCOME_COPY.winFinaleShattered,
  "win-oath": OUTCOME_COPY.winFinaleHolds,
};

const LOSS_TEXT_BY_WAY: Record<LossWay, string> = {
  skulls: OUTCOME_COPY.lossSkulls,
  corruption: OUTCOME_COPY.lossCorruption,
  buildings: OUTCOME_COPY.lossBuildings,
};

export type OutcomeStage = "scene" | "closing" | "summary";

export type OutcomeClosing = { id: string; text: string };

export type OutcomeSummaryCounts = {
  days: number;
  questsDone: number;
  skullsOnBoard: number;
};

export type OutcomeSnapshot = {
  stage: OutcomeStage;
  end: GameEnd;
  closing: OutcomeClosing | null;
  summary: OutcomeSummaryCounts;
  lineId: string | null;
};

export type OutcomeView = {
  stage: OutcomeStage;
  outcome: "won" | "lost";
  reason: LossWay | null;
  sceneId: string;
  caption: string | null;
  closingId: string | null;
  summary: string | null;
  /** CUE-003 plays once with the loss scene; null on win and summary (EV-07). */
  cue: "CUE-003" | null;
  tick: string;
  holdMs: number;
  lineId: string | null;
};

/**
 * Picks the win closing line (Q-C3-23, Q-C4-01, DEC-663, DEC-664).
 * A C3 chapter 1 win always plays `win.chapter-1` and never a finale line (EV-05).
 * A finale win picks by flag through `pickWinLine` (DEC-664), returning null when no flag matches.
 */
export const resolveOutcomeClosing = (
  end: GameEnd,
  context: { c3Chapter1: boolean; flags: ReadonlySet<string> },
): OutcomeClosing | null => {
  if (end.outcome !== "won") return null;
  if (end.end === "chapter_3") return { id: "win-chapter-3", text: CHAPTER_3_WIN_COPY };
  if (context.c3Chapter1) return { id: "win-chapter-1", text: OUTCOME_COPY.winChapter1 };
  const picked = pickWinLine(FINALE_WIN_LINES, context.flags);
  if (!picked) return null;
  const text = FINALE_TEXT_BY_ID[picked];
  return text ? { id: picked, text } : null;
};

/** Builds the board and iPad view for the current outcome beat (SCR-018, UI-046). */
export const buildOutcomeView = (snapshot: OutcomeSnapshot): OutcomeView => {
  const { stage, end, closing, summary, lineId } = snapshot;
  const lost = end.outcome === "lost";
  const reason: LossWay | null = lost ? (end.reason ?? "skulls") : null;
  const caption =
    stage === "summary"
      ? null
      : stage === "closing"
        ? (closing?.text ?? null)
        : lost
          ? LOSS_TEXT_BY_WAY[reason ?? "skulls"]
          : OUTCOME_COPY.winScene;
  return {
    stage,
    outcome: end.outcome,
    reason,
    sceneId: end.sceneId,
    caption,
    closingId: stage === "closing" ? (closing?.id ?? null) : null,
    summary:
      stage === "summary"
        ? OUTCOME_COPY.summary(summary.days, summary.questsDone, summary.skullsOnBoard)
        : null,
    cue: stage === "scene" && lost ? "CUE-003" : null,
    tick: OUTCOME_COPY.tickAuto,
    holdMs: AUTO_ADVANCE_MS,
    lineId,
  };
};
