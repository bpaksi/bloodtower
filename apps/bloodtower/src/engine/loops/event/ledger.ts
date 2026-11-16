import type { PlayState } from "../chapter/playState.ts";
import { groupById } from "../chapter/playState.ts";
import { ensureClock, heroSheet, setHeroSheet } from "../day/clock.ts";
import { EVENT_TYPES, type EventType } from "./rules.ts";
import { eventState, type ForcedEvent, type HazardId, setHeroLedger } from "./state.ts";

/*
 * The event rules spend hit points and gold from a ledger; the game keeps them on each hero's sheet
 * (the day clock). This file moves them between the two: the sheet is read when an event opens and
 * written back when it settles. A value the game does not know stays null on both sides, never 0.
 */

/** Reads the group's heroes from their sheets into the ledger the event rules use (C3/12). */
export const loadLedger = (
  play: PlayState,
  groupId: string,
  roleOf: (heroId: string) => string,
): void => {
  const group = groupById(play, groupId);
  if (!group) throw new Error(`Unknown group ${groupId}.`);
  const clock = ensureClock(play);
  for (const id of group.heroIds) {
    const sheet = heroSheet(clock, id);
    setHeroLedger(play, id, {
      role: roleOf(id),
      hitPoints: sheet.hp ? sheet.hp.hp : null,
      gold: sheet.gold ?? null,
    });
  }
};

/**
 * Reads the group's hit points and gold again from the sheets, keeping each hero's role. A potion
 * used or gold spent while a choice is open changes the sheet; the rules must see that (C3/12).
 */
export const refreshLedger = (play: PlayState, groupId: string): void => {
  const ledgers = eventState(play).heroes;
  loadLedger(play, groupId, (heroId) => ledgers[heroId]?.role ?? "");
};

/** Writes the ledger's known hit points and gold back to the heroes' sheets. */
export const commitLedger = (play: PlayState, groupId: string): void => {
  const group = groupById(play, groupId);
  if (!group) throw new Error(`Unknown group ${groupId}.`);
  const clock = ensureClock(play);
  const ledgers = eventState(play).heroes;
  for (const id of group.heroIds) {
    const ledger = ledgers[id];
    if (!ledger) continue;
    const sheet = heroSheet(clock, id);
    setHeroSheet(play, id, {
      ...sheet,
      ...(ledger.hitPoints !== null && sheet.hp
        ? { hp: { hp: ledger.hitPoints, max: sheet.hp.max } }
        : {}),
      ...(ledger.gold !== null ? { gold: ledger.gold } : {}),
    });
  }
};

/**
 * At the start of play: each seated hero's hit points from the hero card and the starting purse
 * split across the party (the first heroes take the remainder). A value a test already seeded, or
 * that the card or purse does not give, is left alone.
 */
export const seedHeroSheets = (
  play: PlayState,
  heroes: { id: string; hitPoints?: number }[],
  purse: number | null,
): void => {
  const clock = ensureClock(play);
  heroes.forEach((hero, index) => {
    const sheet = heroSheet(clock, hero.id);
    const share =
      purse === null || heroes.length === 0
        ? undefined
        : Math.floor(purse / heroes.length) + (index < purse % heroes.length ? 1 : 0);
    setHeroSheet(play, hero.id, {
      ...sheet,
      ...(sheet.hp === undefined && hero.hitPoints !== undefined
        ? { hp: { hp: hero.hitPoints, max: hero.hitPoints } }
        : {}),
      ...(sheet.gold === undefined && share !== undefined ? { gold: share } : {}),
    });
  });
};

const FORCED_NAMES = [
  "none",
  "quiet",
  "windfall",
  "hazard-plague",
  "hazard-lost",
  "hazard-storm",
  "foes",
  "disaster",
  "people-rumour",
  "people-trick",
] as const;

/**
 * TEST ONLY (C3/12): `~test-event:<name>` makes the next eligible draw that event, `none` stops
 * every draw. `~test-event-line:<id>` gives the next event a narration line. Read by the test seed.
 */
export const forceEvent = (play: PlayState, name: string): void => {
  if (!(FORCED_NAMES as readonly string[]).includes(name)) {
    throw new Error(`The test event seed knows ${FORCED_NAMES.join(", ")}, got "${name}".`);
  }
  const state = eventState(play);
  if (name === "none") {
    state.forced = "none";
    return;
  }
  const [type, kind] = name.split("-") as [EventType, string | undefined];
  if (!EVENT_TYPES.includes(type)) throw new Error(`Unknown event type "${type}".`);
  const forced: ForcedEvent = {
    type,
    hazard:
      type === "hazard"
        ? (kind as HazardId)
        : type === "people" && kind === "trick"
          ? "trick"
          : null,
    offer: type === "people" ? (kind as "rumour" | "trick") : null,
  };
  state.forced = forced;
};

export const forceEventLine = (play: PlayState, lineId: string): void => {
  eventState(play).forcedLine = lineId === "" ? null : lineId;
};
