import { eventRng } from "@dark-tower/rng";
import type { BoardGraph, KingdomId } from "./board.ts";
import { citadelForKingdom } from "./board.ts";

export type MoveRollConfig = {
  dice: string;
  floor: number;
};

export type StartAssignment = {
  hero: string;
  kingdom: KingdomId;
};

export type PlayContent = {
  board: BoardGraph;
  moveRoll: MoveRollConfig;
  start: {
    mode: "one-per-kingdom-citadel";
    assignments: StartAssignment[];
  };
};

export type GroupState = {
  id: string;
  heroIds: string[];
  spaceId: string;
  /** True while the encounter loop has the group inside a building (DEC-220). */
  insideBuilding: boolean;
  /** Seeded turn order slot; lower plays first (DEC-148). */
  order: number;
};

export type PlayState = {
  content: PlayContent;
  groups: GroupState[];
  /** Group ids in play order. */
  turnOrder: string[];
  dayNumber: number;
  /** Monotonic counter for eventRng draws during play. */
  rngSeq: number;
  /** Moves rolled for the current day, per group id. */
  dayRolls: Record<string, number>;
  lastSkull: { kingdom: KingdomId; spaceId: string; building: string | null } | null;
  booted: boolean;
  /** Input for the next child loop (group turn or encounter). */
  childInput:
    | { kind: "group-turn"; groupId: string; moves: number }
    | { kind: "encounter"; groupId: string }
    | null;
};

let activePlay: PlayState | null = null;

export const bindPlayState = (play: PlayState | null): void => {
  activePlay = play;
};

export const playState = (): PlayState => {
  if (!activePlay) {
    throw new Error("Play state is not bound.");
  }
  return activePlay;
};

export const tryPlayState = (): PlayState | null => activePlay;

export const nextPlayRng = (seed: string, play: PlayState) => {
  const rng = eventRng(seed, play.rngSeq);
  play.rngSeq += 1;
  return rng;
};

export const rollGroupMoves = (seed: string, play: PlayState, config: MoveRollConfig): number => {
  const rng = nextPlayRng(seed, play);
  const rolled = rng.roll(config.dice);
  return Math.max(config.floor, rolled.total);
};

const KINGDOM_ORDER = ["N", "E", "S", "W"] as const satisfies readonly KingdomId[];

/**
 * Seat the chosen heroes, one per citadel.
 * A pack assignment keeps its kingdom. Anyone else takes the next free kingdom in N, E, S, W.
 */
export const seatAtCitadels = (
  assignments: readonly StartAssignment[],
  seatedHeroIds: readonly string[],
): StartAssignment[] => {
  const preferred = new Map(assignments.map((row) => [row.hero, row.kingdom]));
  const used = new Set<KingdomId>();
  const placed = new Map<string, KingdomId>();
  const unassigned: string[] = [];
  for (const hero of seatedHeroIds) {
    const kingdom = preferred.get(hero);
    if (kingdom && !used.has(kingdom)) {
      used.add(kingdom);
      placed.set(hero, kingdom);
    } else {
      unassigned.push(hero);
    }
  }
  for (const hero of unassigned) {
    const kingdom = KINGDOM_ORDER.find((id) => !used.has(id));
    if (!kingdom) break;
    used.add(kingdom);
    placed.set(hero, kingdom);
  }
  return seatedHeroIds.flatMap((hero) => {
    const kingdom = placed.get(hero);
    return kingdom ? [{ hero, kingdom }] : [];
  });
};

export const initPlayState = (seed: string, content: PlayContent): PlayState => {
  const rng = eventRng(seed, 0);
  const assignments = content.start.assignments;
  const groups: GroupState[] = assignments.map((row, index) => {
    const citadel = citadelForKingdom(content.board, row.kingdom);
    return {
      id: row.hero,
      heroIds: [row.hero],
      spaceId: citadel.id,
      insideBuilding: false,
      order: index,
    };
  });
  const shuffled = rng.shuffle(groups.map((g) => g.id));
  const orderMap = new Map(shuffled.map((id, index) => [id, index]));
  for (const group of groups) {
    group.order = orderMap.get(group.id) ?? group.order;
  }
  const turnOrder = [...groups].sort((a, b) => a.order - b.order).map((g) => g.id);

  return {
    content,
    groups,
    turnOrder,
    dayNumber: 0,
    rngSeq: 1,
    dayRolls: {},
    lastSkull: null,
    booted: true,
    childInput: null,
  };
};

export const groupById = (play: PlayState, groupId: string): GroupState | undefined =>
  play.groups.find((g) => g.id === groupId);
