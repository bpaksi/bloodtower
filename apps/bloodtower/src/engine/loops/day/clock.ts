import type { KingdomId } from "../chapter/board.ts";
import type { PlayState } from "../chapter/playState.ts";
import { type DayTuning, dayTuningFrom, fallenLimit } from "./rules.ts";

export type HeroSheet = {
  helpingVirtues: number;
  corruptions: number;
};

export type MoveShift = {
  raw: number;
  virtue: number;
  corruption: number;
  total: number;
};

export type SkullDrop = {
  kingdom: KingdomId;
  spaceId: string;
};

export type DayLogEvent =
  | { kind: "drop"; spaceId: string; kingdom: KingdomId }
  | { kind: "held" }
  | { kind: "skip-drop" };

export type DayLoss = { lost: false } | { lost: true; reason: "skulls" | "buildings" };

export type DayClock = {
  tuning: DayTuning;
  supply: number;
  heroes: Record<string, HeroSheet>;
  skulls: Record<string, number>;
  held: number;
  questsWon: number;
  effects: string[];
  shifts: Record<string, MoveShift>;
  nodes: string[];
  events: { kind: string }[];
  log: DayLogEvent[];
  turns: string[];
  nightDrops: SkullDrop[];
  pendingKingdoms: KingdomId[];
  expectKingdom: KingdomId | null;
  outcome: DayLoss | null;
  resume: DayResume | null;
};

export type DayResume = {
  dayNumber: number;
  rngSeq: number;
  dayRolls: Record<string, number>;
  shifts: Record<string, MoveShift>;
  questsWon: number;
  local: unknown;
};

const clocks = new WeakMap<PlayState, DayClock>();

const blankClock = (tuning: DayTuning): DayClock => ({
  tuning,
  supply: tuning.supply,
  heroes: {},
  skulls: {},
  held: 0,
  questsWon: 0,
  effects: [],
  shifts: {},
  nodes: [],
  events: [],
  log: [],
  turns: [],
  nightDrops: [],
  pendingKingdoms: [],
  expectKingdom: null,
  outcome: null,
  resume: null,
});

export const ensureClock = (play: PlayState): DayClock => {
  const existing = clocks.get(play);
  if (existing) return existing;
  const created = blankClock(dayTuningFrom());
  clocks.set(play, created);
  return created;
};

export const configureDayClock = (
  play: PlayState,
  options: { tuning?: unknown; supply?: number },
): DayClock => {
  const tuning = dayTuningFrom(options.tuning);
  const clock = blankClock(tuning);
  if (options.supply !== undefined) {
    if (!Number.isInteger(options.supply) || options.supply < 0) {
      throw new Error("The skull supply is a whole number.");
    }
    clock.supply = options.supply;
  }
  clocks.set(play, clock);
  return clock;
};

export const setHeroSheet = (play: PlayState, heroId: string, sheet: HeroSheet): void => {
  if (
    !Number.isInteger(sheet.helpingVirtues) ||
    !Number.isInteger(sheet.corruptions) ||
    sheet.helpingVirtues < 0 ||
    sheet.corruptions < 0
  ) {
    throw new Error("Virtues and corruptions are whole numbers, zero or more.");
  }
  ensureClock(play).heroes[heroId] = {
    helpingVirtues: sheet.helpingVirtues,
    corruptions: sheet.corruptions,
  };
};

export const heroSheet = (clock: DayClock, heroId: string): HeroSheet =>
  clock.heroes[heroId] ?? { helpingVirtues: 0, corruptions: 0 };

export const markQuestWon = (play: PlayState): void => {
  ensureClock(play).questsWon += 1;
};

export const noteNode = (play: PlayState, node: string): void => {
  ensureClock(play).nodes.push(node);
};

export const heroCount = (play: PlayState): number =>
  play.groups.reduce((sum, group) => sum + group.heroIds.length, 0);

export const isFallen = (play: PlayState, spaceId: string): boolean =>
  (clocks.get(play)?.skulls[spaceId] ?? 0) >= 4;

/** Standing buildings a move can still treat as a place. */
export const placeTargets = (play: PlayState): string[] =>
  play.content.board.spaces
    .filter((space) => Boolean(space.building) && !isFallen(play, space.id))
    .map((space) => space.id);

export const setBuildingSkulls = (play: PlayState, spaceId: string, count: number): void => {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("Skulls on a building are a whole number.");
  }
  ensureClock(play).skulls[spaceId] = count;
};

const spendSupply = (clock: DayClock): boolean => {
  if (clock.supply <= 0) return false;
  clock.supply -= 1;
  return true;
};

/** One skull on a building. The 4th skull is what makes `isFallen` true. */
export const recordBuildingDrop = (
  play: PlayState,
  spaceId: string,
  kingdom: KingdomId,
): boolean => {
  const clock = ensureClock(play);
  if (isFallen(play, spaceId)) return false;
  if (!spendSupply(clock)) return false;
  clock.skulls[spaceId] = (clock.skulls[spaceId] ?? 0) + 1;
  const drop = { kingdom, spaceId };
  clock.nightDrops.push(drop);
  clock.log.push({ kind: "drop", spaceId, kingdom });
  clock.events.push({ kind: "skull-drop" });
  noteNode(play, ".19");
  if (clock.expectKingdom) {
    clock.pendingKingdoms.shift();
    clock.expectKingdom = clock.pendingKingdoms[0] ?? null;
  }
  return true;
};

export const recordHeldSkull = (play: PlayState): boolean => {
  const clock = ensureClock(play);
  if (clock.expectKingdom) return false;
  if (!spendSupply(clock)) return false;
  clock.held += 1;
  clock.log.push({ kind: "held" });
  clock.events.push({ kind: "held-skull" });
  return true;
};

export const recordSkippedDrop = (play: PlayState): void => {
  const clock = ensureClock(play);
  if (!clock.effects.includes("+1 day")) clock.effects.push("+1 day");
  clock.log.push({ kind: "skip-drop" });
  clock.events.push({ kind: "skip-drop" });
};

export const checkChapter = (clock: DayClock): DayLoss => {
  if (clock.supply <= 0) return { lost: true, reason: "skulls" };
  if (
    Object.values(clock.skulls).filter((count) => count >= 4).length >= fallenLimit(clock.tuning)
  ) {
    return { lost: true, reason: "buildings" };
  }
  return { lost: false };
};

export const clockSnapshot = (
  play: PlayState,
): { supply: number; skulls: Record<string, number> } => {
  const clock = ensureClock(play);
  return { supply: clock.supply, skulls: { ...clock.skulls } };
};

export const clockLog = (play: PlayState): DayLogEvent[] => [...ensureClock(play).log];

const applyLogged = (clock: DayClock, event: DayLogEvent): void => {
  if (event.kind === "skip-drop") return;
  if (clock.supply <= 0) {
    throw new Error("The event log drops a skull after the supply is empty.");
  }
  clock.supply -= 1;
  if (event.kind === "held") {
    clock.held += 1;
    return;
  }
  clock.skulls[event.spaceId] = (clock.skulls[event.spaceId] ?? 0) + 1;
};

/** Rebuild supply and skulls from the day event log. The tuning supply is the start, not the result. */
export const rebuildClock = (
  tuning: DayTuning,
  log: readonly DayLogEvent[],
): { supply: number; skulls: Record<string, number> } => {
  const clock = blankClock(tuning);
  for (const event of log) applyLogged(clock, event);
  return { supply: clock.supply, skulls: { ...clock.skulls } };
};

export const dayTrace = (play: PlayState): { nodes: string[]; events: { kind: string }[] } => {
  const clock = ensureClock(play);
  return {
    nodes: [...clock.nodes],
    events: clock.events.map((event) => ({ kind: event.kind })),
  };
};

export const captureDayResume = (play: PlayState, local: unknown): DayResume => {
  const clock = ensureClock(play);
  return {
    dayNumber: play.dayNumber,
    rngSeq: play.rngSeq,
    dayRolls: { ...play.dayRolls },
    shifts: structuredClone(clock.shifts),
    questsWon: clock.questsWon,
    local: structuredClone(local),
  };
};

export const armDayResume = (play: PlayState, resume: DayResume): void => {
  ensureClock(play).resume = structuredClone(resume);
};
