import { type GameRecordPayloadV1, parseHostPayload } from "./kinds.ts";
import type { EventStore, StoredHostEvent } from "./store.ts";

/*
 * Everything the game's record, the hero totals, the tap counts and the active length say is
 * read from the append-only log (DEC-107, DEC-627). Nothing here keeps a count in memory, so a
 * host restart and a rebuilt log give the same numbers (PT-10, EV-18, EV-19).
 */

/** One game's record as the app reads it: the latest `game-record` for the game id (PT-03). */
export type GameRecord = GameRecordPayloadV1 & {
  /** The seq of the row it came from. */
  seq: number;
  atWall: string;
};

/** The latest `game-record` of one game's log, or null when it has none. */
export const latestRecordOf = (rows: readonly StoredHostEvent[]): GameRecord | null => {
  let found: GameRecord | null = null;
  for (const row of rows) {
    if (row.kind !== "game-record") continue;
    found = { ...parseHostPayload("game-record", row.payload), seq: row.seq, atWall: row.atWall };
  }
  return found;
};

/** One record per game id, oldest game first. A quit that was later finished reads as the finish. */
export const projectGameRecords = (store: EventStore): GameRecord[] => {
  const records: GameRecord[] = [];
  for (const gameId of store.listGameIds()) {
    const record = latestRecordOf(store.listEvents(gameId));
    if (record) records.push(record);
  }
  return records;
};

/** Won and lost records only: a plain quit is neither played nor won (PT-03, EV-14). */
export const finishedRecords = (records: readonly GameRecord[]): GameRecord[] =>
  records.filter((record) => record.outcome === "won" || record.outcome === "lost");

export type HeroTotals = { played: number; won: number };

/** Each seated hero's played and won counts over won and lost records (DEC-117). */
export const heroTotals = (records: readonly GameRecord[]): Record<string, HeroTotals> => {
  const totals: Record<string, HeroTotals> = {};
  for (const record of finishedRecords(records)) {
    for (const heroId of new Set(record.heroIds ?? [])) {
      const row = totals[heroId] ?? { played: 0, won: 0 };
      row.played += 1;
      if (record.outcome === "won") row.won += 1;
      totals[heroId] = row;
    }
  }
  return totals;
};

/**
 * The average active length over won and lost records. Null when none has a known length:
 * an unknown length is unavailable, never zero.
 */
export const averageActiveMs = (records: readonly GameRecord[]): number | null => {
  const lengths = finishedRecords(records)
    .map((record) => record.activeMs)
    .filter((ms): ms is number => typeof ms === "number");
  if (lengths.length === 0) return null;
  return lengths.reduce((sum, ms) => sum + ms, 0) / lengths.length;
};

/** The first time the game clock ran, UTC; null when it never has. */
export const startedWallOf = (rows: readonly StoredHostEvent[]): string | null => {
  for (const row of rows) {
    if (row.kind === "play-clock" && parseHostPayload("play-clock", row.payload).running) {
      return row.atWall;
    }
  }
  return null;
};

/**
 * Active length: the sum of the stretches the game clock ran. A pause, the time between a Quit
 * and Continue, and a finished game all stop it. Null while the clock is still running: the
 * length is not known yet, and it is never read as zero.
 */
export const activeMsOf = (rows: readonly StoredHostEvent[]): number | null => {
  let total = 0;
  let since: number | null = null;
  for (const row of rows) {
    if (row.kind !== "play-clock") continue;
    const { running } = parseHostPayload("play-clock", row.payload);
    if (running && since === null) since = row.atMonoMs;
    else if (!running && since !== null) {
      total += Math.max(0, row.atMonoMs - since);
      since = null;
    }
  }
  return since === null ? total : null;
};

export type TapCounts = {
  /** Game day → presses that day. Day 0 holds the presses before the first day. */
  byDay: Record<number, { all: number; flowButton: number }>;
  total: number;
};

/**
 * Tap counts from the `control-press` rows (PT-10). A press counts when it was made on a play
 * screen and was not the Quit that ends the game: presses on the session screen belong to no
 * game's play. Both readings of "tap" come from the same rows: `all` counts every kind,
 * `flowButton` only the flow buttons. The total is the sum of the days.
 */
export const tapCounts = (rows: readonly StoredHostEvent[]): TapCounts => {
  const byDay: TapCounts["byDay"] = {};
  let total = 0;
  for (const row of rows) {
    if (row.kind !== "control-press") continue;
    // Read the fields the count needs only: a session-screen press may carry an action the
    // control schema does not list, and it is not a play press anyway.
    const payload = JSON.parse(row.payload) as {
      kind?: string;
      day?: number | null;
      press?: { action?: string; screen?: string | null };
    };
    if (!payload.kind) continue;
    if (payload.press?.action === "quit-story") continue;
    if (payload.press?.screen !== "play" && payload.press?.screen !== "pause") continue;
    const day = payload.day ?? 0;
    const entry = byDay[day] ?? { all: 0, flowButton: 0 };
    entry.all += 1;
    if (payload.kind === "flow-button") entry.flowButton += 1;
    byDay[day] = entry;
    total += 1;
  }
  return { byDay, total };
};
