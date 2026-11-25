/*
 * C3/17 (SCR-019, DEC-116, DEC-117, DEC-627, PT-03, PT-04, PT-10): the Game stats screen's words
 * and layout. The numbers come from the game's stored record (the host reads the event log and
 * hands them in); nothing here reads the live play state. Words are the brief's Copy table.
 * The Story board gets the lines as text on the `game-stats` level; `parseStatsLines` is the
 * board's way back to rows, so the two ends cannot drift.
 */

/** A value the game never knew reads "unavailable", never zero. */
export const STATS_UNAVAILABLE = "unavailable";

export const STATS_COPY = {
  title: "Tonight's tale",
  outcomeWon: "Won",
  outcomeLost: "Lost",
  momentsTitle: "Key moments",
  ratingLabel: "How was tonight?",
  bestFirst: "Best: this game",
  bestNone: "No win yet to compare",
  /** A seat that gave no rating. */
  noRating: "–",
} as const;

/** The first word of the one row the key moments sit before. */
const LENGTH_LABEL = "Length";
/** A key-moment line carries this mark so the board can tell it from a stat row. */
const MOMENT_MARK = "• ";

/** The best-line state of PT-04 (the same shape the host's read-out gives). */
export type StatsBest =
  | { state: "earlier"; ms: number }
  | { state: "this-game" }
  | { state: "none" };

/** One key moment (Q-C3-18): its kind, its day and the names the line needs. */
export type StatsMoment = {
  moment: "quest-done" | "item-gained" | "building-fallen" | "corruption-taken" | "chapter-won";
  day: number | null;
  quest?: string;
  questId?: string;
  hero?: string;
  heroId?: string;
  item?: string;
  itemId?: string;
  building?: string;
  spaceId?: string;
};

/** One finished game's stored stats. A null is unknown. */
export type GameStatsInput = {
  outcome: "won" | "lost";
  /** Time played: the record's active length (PT-10): a pause is not in it. */
  activeMs: number | null;
  days: number | null;
  questsDone: number | null;
  corruptionsTaken: number | null;
  goldLeft: number | null;
  keyMoments: readonly StatsMoment[];
  best: StatsBest;
  averageMs: number | null;
};

const count = (value: number | null): string => (value === null ? STATS_UNAVAILABLE : `${value}`);

/** Whole minutes. A game that ran at all never reads as 0 min. */
export const minutesText = (ms: number | null): string => {
  if (ms === null) return STATS_UNAVAILABLE;
  const minutes = Math.round(ms / 60_000);
  return `${ms > 0 ? Math.max(1, minutes) : 0} min`;
};

const named = (name: string | undefined, id: string | undefined): string =>
  name ?? id ?? STATS_UNAVAILABLE;

const momentLine = (moment: StatsMoment): string => {
  const day = moment.day === null ? STATS_UNAVAILABLE : `${moment.day}`;
  const hero = named(moment.hero, moment.heroId);
  switch (moment.moment) {
    case "quest-done":
      return `Day ${day}: ${named(moment.quest, moment.questId)} done.`;
    case "corruption-taken":
      return `Day ${day}: ${hero} took a corruption.`;
    case "item-gained":
      return `Day ${day}: ${hero} gained ${named(moment.item, moment.itemId)}.`;
    case "building-fallen":
      return `Day ${day}: ${named(moment.building, moment.spaceId)} fell.`;
    case "chapter-won":
      return `Day ${day}: Chapter won.`;
  }
};

const bestText = (best: StatsBest): string => {
  if (best.state === "this-game") return STATS_COPY.bestFirst;
  if (best.state === "none") return STATS_COPY.bestNone;
  return `best ${minutesText(best.ms)}`;
};

/**
 * The stats rows the board shows, one line each (SCR-019, DEC-627), in this order: outcome, time
 * played, days, quests done, corruptions, gold, key moments, length against the best and the
 * average, then the ratings. `ratings` is one value per seat in seat order; the line is left out
 * when no seat rated. There is no skulls row, no Seals broken row and no tap row.
 */
export const gameStatsLines = (
  stats: GameStatsInput,
  ratings: readonly (number | null)[],
): string[] => {
  const lines = [
    `Outcome: ${stats.outcome === "won" ? STATS_COPY.outcomeWon : STATS_COPY.outcomeLost}`,
    `Time played: ${minutesText(stats.activeMs)}`,
    `Days: ${count(stats.days)}`,
    `Quests done: ${count(stats.questsDone)}`,
    `Corruptions: ${count(stats.corruptionsTaken)}`,
    `Gold: ${count(stats.goldLeft)}`,
  ];
  if (stats.keyMoments.length > 0) {
    lines.push(
      STATS_COPY.momentsTitle,
      ...stats.keyMoments.map((moment) => `${MOMENT_MARK}${momentLine(moment)}`),
    );
  }
  lines.push(
    `${LENGTH_LABEL}: ${minutesText(stats.activeMs)} (${bestText(stats.best)} · average ${minutesText(stats.averageMs)})`,
  );
  if (ratings.some((rating) => rating !== null)) {
    lines.push(
      `${STATS_COPY.ratingLabel}: ${ratings.map((rating) => (rating === null ? STATS_COPY.noRating : rating)).join(" · ")}`,
    );
  }
  return lines;
};

export type ParsedStats = {
  rows: { label: string; value: string }[];
  moments: string[];
  /** How many rows come before the key moments. */
  momentsAfter: number;
};

/** The board's read of the `game-stats` lines: "Label: value" rows, and the key moments apart. */
export const parseStatsLines = (shows: string): ParsedStats => {
  const rows: ParsedStats["rows"] = [];
  const moments: string[] = [];
  let momentsAfter = 0;
  let seenMoments = false;
  for (const line of shows.split("\n")) {
    if (line === STATS_COPY.momentsTitle) {
      seenMoments = true;
      momentsAfter = rows.length;
      continue;
    }
    if (line.startsWith(MOMENT_MARK)) {
      moments.push(line.slice(MOMENT_MARK.length));
      continue;
    }
    const at = line.indexOf(": ");
    if (at > 0) rows.push({ label: line.slice(0, at), value: line.slice(at + 2) });
  }
  if (!seenMoments) momentsAfter = rows.length;
  return { rows, moments, momentsAfter };
};
