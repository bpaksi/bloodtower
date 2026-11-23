import { AUTO_ADVANCE_MS } from "../../protocols/v2/views.ts";
import { tryChapters } from "../loops/chapter/chapters.ts";
import type { PlayState } from "../loops/chapter/playState.ts";

/*
 * C3/15 (UI-020, UI-044, PT-21): the chapter card, the stamped won card, the close Scroll, the
 * seal's Reveal and Set the table. The words are the brief's Copy table (Loremaster 2026-11-12,
 * rows 19-24 2026-11-18). The board and the iPad get the same words from here.
 */

/** Copy `chapter.N.name` and `chapter.N.goal`, by the story pack's chapter id. */
export const CHAPTER_COPY: Record<string, { name: string; goal: string }> = {
  "the-roads": {
    name: "The Roads",
    goal: "Hear the herald in Greyford. Then open the forest road.",
  },
  "the-keep": {
    name: "The Keep",
    goal: "Go down into the barrow under the old keep. Find the shrine on the road beside it.",
  },
  "the-tower": {
    name: "The Tower",
    goal: "Open the sealed gate on the Tower road. Break his guard on the Grass Sea. Then climb.",
  },
};

/** The close line Bob approved 2026-10-31 (`chapter.close-scroll`); only chapter 1 has one. */
export const CLOSE_COPY: Record<string, string> = {
  "the-roads": "The roads are quiet again.",
};

/** Quest token names for `table.row.tokens` (EV-07, EV-17). */
export const QUEST_TOKEN_NAMES: Record<string, string> = {
  barrow: "The Barrow",
  shrine: "The Shrine",
};

export const CHAPTER_COPY_LINES = {
  label: (n: number) => `Chapter ${n}`,
  tickAuto: "Moves on by itself.",
  stampWon: "Cleared",
  sealBoon: (boon: string) => `Its glyph lends you strength: ${boon}.`,
  tableTitle: "Set the table",
  tableTokens: (quests: string[]) => `Quest tokens: ${quests.join(", ")}`,
  tableSkulls: (n: number) => `Freed skulls: ${n}`,
  tableDone: "Done",
} as const;

export type ChapterBeatStage = "card" | "stamp" | "close" | "reveal" | "table";

export type ChapterTableRowView = { id: "seal" | "skulls" | "tokens"; label: string };

export type ChapterBeatView = {
  stage: ChapterBeatStage;
  chapter: number;
  chapterId: string;
  label: string;
  /** Null when the story's Copy table has no name for this chapter. */
  name: string | null;
  goal: string | null;
  /** The stamp on the won card, on the stamp and close beats. */
  stamp: string | null;
  /** The close Scroll's line, on the close beat only. */
  close: string | null;
  /** The cue that plays with this beat: CUE-004 with the card, CUE-005 with the stamp. */
  cue: "CUE-004" | "CUE-005" | null;
  /** The auto-advance line on a beat with no Next; null on Set the table (EV-19). */
  tick: string | null;
  holdMs: number;
  /** The narration line whose audio end ends the beat, or null for the 4 s timer. */
  lineId: string | null;
  seal: { name: string; glyph: string; boon: string } | null;
  table: {
    title: string;
    rows: ChapterTableRowView[];
    done: string;
    promptId: string;
  } | null;
};

const questName = (id: string): string => QUEST_TOKEN_NAMES[id] ?? id;

/** The chapter beat on screen now, or null on the days (or with no chapter plan). */
export const buildChapterBeat = (
  play: PlayState | null | undefined,
  topLoopId: string | undefined,
): ChapterBeatView | null => {
  if (!play || topLoopId !== "chapter") return null;
  const store = tryChapters(play);
  const stage = store?.stage;
  if (
    !store ||
    (stage !== "card" &&
      stage !== "stamp" &&
      stage !== "close" &&
      stage !== "reveal" &&
      stage !== "table")
  ) {
    return null;
  }
  const chapter = store.current;
  const def = store.plan.chapters.find((row) => row.index === chapter);
  if (!def) return null;
  const copy = CHAPTER_COPY[def.id];
  const auto = stage !== "table";
  const seal = stage === "reveal" ? (store.pending?.seal ?? null) : null;
  const rows = store.table
    ? ([
        ...(store.table.seal ? [{ id: "seal", label: store.table.seal.name }] : []),
        ...(store.table.skulls > 0
          ? [{ id: "skulls", label: CHAPTER_COPY_LINES.tableSkulls(store.table.skulls) }]
          : []),
        {
          id: "tokens",
          label: CHAPTER_COPY_LINES.tableTokens(store.table.quests.map(questName)),
        },
      ] as ChapterTableRowView[])
    : [];
  return {
    stage,
    chapter,
    chapterId: def.id,
    label: CHAPTER_COPY_LINES.label(chapter),
    name: copy?.name ?? null,
    goal: copy?.goal ?? null,
    stamp: stage === "stamp" || stage === "close" ? CHAPTER_COPY_LINES.stampWon : null,
    close: stage === "close" ? (CLOSE_COPY[def.id] ?? null) : null,
    cue: stage === "card" ? "CUE-004" : stage === "stamp" ? "CUE-005" : null,
    tick: auto ? CHAPTER_COPY_LINES.tickAuto : null,
    holdMs: AUTO_ADVANCE_MS,
    lineId: auto ? (store.wait?.lineId ?? null) : null,
    seal: seal
      ? { name: seal.name, glyph: seal.glyph, boon: CHAPTER_COPY_LINES.sealBoon(seal.boon) }
      : null,
    table:
      stage === "table" && store.table
        ? {
            title: CHAPTER_COPY_LINES.tableTitle,
            rows,
            done: CHAPTER_COPY_LINES.tableDone,
            promptId: `table-done--${chapter}`,
          }
        : null,
  };
};
