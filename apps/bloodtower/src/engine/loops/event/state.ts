import { eventRng } from "@dark-tower/rng";
import type { PlayState } from "../chapter/playState.ts";
import { groupById } from "../chapter/playState.ts";
import { ensureClock } from "../day/clock.ts";
import {
  chanceFor,
  EVENT_TYPES,
  type EventTuning,
  type EventType,
  type GameLength,
} from "./rules.ts";

export type HazardId = "plague" | "lost" | "storm" | "trick";

/** Each hazard names its counter, a hero class (DEC-022, DEC-027). A class is never consumed. */
export const HAZARD_COUNTER: Record<HazardId, string | null> = {
  plague: "healer",
  lost: "scout",
  storm: null,
  trick: null,
};

const HAZARD_IDS = ["plague", "lost", "storm"] as const;
/** In 1.0 meeting people offers a rumour or a trick only (Q-C3-03, DEC-502). */
const PEOPLE_OFFERS = ["rumour", "trick"] as const;

export type OptionId = "hit-points" | "lose-turn" | "go-around" | "pay-off" | "fight";
export type EventOption = { id: OptionId; enabled: boolean };

export type EventStatus = "open" | "resolved" | "battle";

export type OpenEvent = {
  groupId: string;
  day: number;
  type: EventType;
  hazard: HazardId | null;
  offer: "rumour" | "trick" | null;
  status: EventStatus;
  /** What happened, in order, for the day's effects panel. */
  log: string[];
};

export type HeroLedger = { role: string; hitPoints: number; gold: number };

type EventState = {
  open: OpenEvent | null;
  heroes: Record<string, HeroLedger>;
  /** Groups that lose their next turn (a hazard's second cost). */
  lostTurns: string[];
};

const states = new WeakMap<PlayState, EventState>();

export const eventState = (play: PlayState): EventState => {
  const existing = states.get(play);
  if (existing) return existing;
  const created: EventState = { open: null, heroes: {}, lostTurns: [] };
  states.set(play, created);
  return created;
};

export const setHeroLedger = (play: PlayState, heroId: string, ledger: HeroLedger): void => {
  if (!Number.isInteger(ledger.hitPoints) || !Number.isInteger(ledger.gold) || ledger.gold < 0) {
    throw new Error("Hit points and gold are whole numbers; gold is zero or more.");
  }
  eventState(play).heroes[heroId] = { ...ledger };
};

/** Copy for the autosave (DEC-675). */
export const captureEventState = (play: PlayState): unknown => structuredClone(eventState(play));

export const restoreEventState = (play: PlayState, saved: unknown): void => {
  states.set(play, structuredClone(saved) as EventState);
};

export const hasOpenEvent = (play: PlayState): boolean => eventState(play).open?.status === "open";

/** DEC-017, DEC-080, DEC-093: the wild, or a building with at least one skull. */
export const eventEligible = (play: PlayState, groupId: string): boolean => {
  const group = groupById(play, groupId);
  if (!group || group.insideBuilding) return false;
  const space = play.content.board.spaceById.get(group.spaceId);
  if (!space) throw new Error(`Unknown space ${group.spaceId}.`);
  if (!space.building) return true;
  return (ensureClock(play).skulls[group.spaceId] ?? 0) >= 1;
};

const pickWeighted = (weights: Record<EventType, number>, roll: number): EventType => {
  let left = roll;
  for (const type of EVENT_TYPES) {
    left -= weights[type];
    if (left < 0) return type;
  }
  throw new Error("Event weights must add up to more than zero.");
};

/** The seeded draw for one group on one day. Same seed, day and group give the same card. */
export const drawEvent = (
  seed: string,
  day: number,
  groupId: string,
  tuning: EventTuning,
  length: GameLength,
): OpenEvent | null => {
  const rng = eventRng(`${seed}:event:${day}:${groupId}`, 0);
  const chance = chanceFor(tuning, length);
  if (rng.int(1, 100) > chance) return null;
  const total = EVENT_TYPES.reduce((sum, type) => sum + tuning.weights[type], 0);
  if (total < 1) throw new Error("Event weights must add up to more than zero.");
  const type = pickWeighted(tuning.weights, rng.int(0, total - 1));
  const offer = type === "people" ? rng.pick(PEOPLE_OFFERS) : null;
  const hazard: HazardId | null =
    type === "hazard" ? rng.pick(HAZARD_IDS) : offer === "trick" ? "trick" : null;
  return { groupId, day, type, hazard, offer, status: "open", log: [] };
};

/**
 * MEC-034 .9: called when a group's turn has ended. Draws once; an event already open for the
 * group is kept, never redrawn (DEC-675). Returns the open event or null.
 */
export const eventForGroup = (
  play: PlayState,
  seed: string,
  groupId: string,
  tuning: EventTuning,
  length: GameLength = "standard",
): OpenEvent | null => {
  const state = eventState(play);
  const kept = state.open;
  if (kept?.status === "open" && kept.groupId === groupId && kept.day === play.dayNumber)
    return kept;
  if (!eventEligible(play, groupId)) return null;
  const drawn = drawEvent(seed, play.dayNumber, groupId, tuning, length);
  if (!drawn) return null;
  state.open = drawn;
  return drawn;
};
