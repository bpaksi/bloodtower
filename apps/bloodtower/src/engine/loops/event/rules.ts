/**
 * Numbers the event loop reads. Defaults match packs/base/tuning.yaml (DEC-703, DEC-669).
 * `events.pay_off` (Bob, 2026-10-31) is not in the base file yet, so a missing key keeps 5.
 */
export type GameLength = "short" | "standard" | "long";

export const EVENT_TYPES = ["quiet", "windfall", "hazard", "foes", "disaster", "people"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type EventTuning = {
  /** Percent chance a group draws, by length (DEC-669). */
  chance: { short: number; standard: number };
  weights: Record<EventType, number>;
  hazardHitPoints: number;
  windfallGold: number;
  goAroundHitPoints: number;
  goAroundMinimum: number;
  payOff: number;
  fightEnabled: boolean;
};

const BASE: EventTuning = {
  chance: { short: 30, standard: 40 },
  weights: { quiet: 30, windfall: 15, hazard: 20, foes: 20, disaster: 5, people: 10 },
  hazardHitPoints: -2,
  windfallGold: 5,
  goAroundHitPoints: -2,
  goAroundMinimum: 1,
  payOff: 5,
  fightEnabled: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const whole = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isInteger(value) ? value : fallback;

/** Reads a tuning object. Missing fields keep the base placeholders. */
export const eventTuningFrom = (source?: unknown): EventTuning => {
  const root = isRecord(source) ? source : {};
  const day = isRecord(root.day) ? root.day : {};
  const chance = isRecord(day.event_chance) ? day.event_chance : {};
  const weights = isRecord(day.event_weights) ? day.event_weights : {};
  const hazard = isRecord(day.hazard) ? day.hazard : {};
  const windfall = isRecord(day.windfall) ? day.windfall : {};
  const goAround = isRecord(day.go_around) ? day.go_around : {};
  const events = isRecord(root.events) ? root.events : {};
  return {
    chance: {
      short: whole(chance.short, BASE.chance.short),
      standard: whole(chance.standard, BASE.chance.standard),
    },
    weights: {
      quiet: whole(weights.quiet, BASE.weights.quiet),
      windfall: whole(weights.windfall, BASE.weights.windfall),
      hazard: whole(weights.hazard, BASE.weights.hazard),
      foes: whole(weights.foes, BASE.weights.foes),
      disaster: whole(weights.disaster, BASE.weights.disaster),
      people: whole(weights.people, BASE.weights.people),
    },
    hazardHitPoints: whole(hazard.hit_points, BASE.hazardHitPoints),
    windfallGold: whole(windfall.gold, BASE.windfallGold),
    goAroundHitPoints: whole(goAround.hit_points, BASE.goAroundHitPoints),
    goAroundMinimum: whole(goAround.minimum, BASE.goAroundMinimum),
    payOff: whole(events.pay_off, BASE.payOff),
    fightEnabled: typeof root.fight_enabled === "boolean" ? root.fight_enabled : BASE.fightEnabled,
  };
};

export const chanceFor = (tuning: EventTuning, length: GameLength): number =>
  // The tuning file has Short and Standard; a Long game draws at the Standard chance.
  length === "short" ? tuning.chance.short : tuning.chance.standard;
