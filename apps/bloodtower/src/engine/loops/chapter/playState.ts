import { eventRng } from "@dark-tower/rng";
import { ensureClock, heroSheet, setBuildingSkulls, setHeroSheet } from "../day/clock.ts";
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

/** A queued gear action (PT-18): Split takes the hero off; Rejoin joins the hero's group. */
export type RegroupKind = "split" | "join";

export type QueuedRegroup = {
  kind: RegroupKind;
  heroId: string;
  /** The iPad that picked it, told if it cannot apply. Null for a pick with no iPad. */
  deviceId: string | null;
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
  /**
   * Split and Rejoin picked from the gear, in pick order (PT-18, Q4.2). They apply at the next
   * day start, before the roll. Absent on a checkpoint from before CU/04: nothing queued.
   */
  regroupQueue?: QueuedRegroup[];
  /** The day whose start applied a queued change, so the board shows the groups card (Q4.1). */
  regroupCardDay?: number | null;
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

/**
 * TEST ONLY (C3-11 ruling 5, CU/04). A seed ending in this marker seats every hero in one group
 * on the first group's citadel, so an e2e can split and rejoin. Real seeds are random hex
 * (`randomBytes(8).toString("hex")`) or a story's own, and never carry it.
 */
export const TEST_SEAT_TOGETHER = "~test-seat-together";

/**
 * TEST ONLY (CU/10). A seed carrying `~test-corruption:hero-b=2,hero-c=1` starts those heroes
 * with those corruptions (whole numbers, 0 to 9), so an e2e can reach the band mark without play.
 * Put it before `~test-seat-together`, which must stay last. Real seeds never carry it.
 */
export const TEST_CORRUPTION = "~test-corruption:";

const TEST_CORRUPTION_PATTERN = /~test-corruption:([\w,=-]*)/;

const corruptionsFromTestSeed = (seed: string): [string, number][] => {
  const match = TEST_CORRUPTION_PATTERN.exec(seed);
  if (!match) return [];
  return (match[1] ?? "")
    .split(",")
    .filter((part) => part.length > 0)
    .map((part) => {
      const [heroId, count] = part.split("=");
      if (!heroId || !/^\d$/.test(count ?? "")) {
        throw new Error(`The test corruption seed needs hero=count (0 to 9), got "${part}".`);
      }
      return [heroId, Number(count)];
    });
};

/**
 * TEST ONLY (CU/13). Seed markers that give heroes items, hit points and gold at the start, so an
 * e2e can reach the items panel without play: `~test-items:hero-b=potion+potion`,
 * `~test-hp:hero-b=2/10` (hit points / most) and `~test-gold:hero-b=7`. Put them before
 * `~test-seat-together`, which must stay last. Real seeds never carry them.
 */
export const TEST_ITEMS = "~test-items:";
export const TEST_HP = "~test-hp:";
export const TEST_GOLD = "~test-gold:";
/**
 * TEST ONLY (CU/14). `~test-virtues:hero-a=infused+fortunate` gives heroes virtues at the start,
 * and `~test-skulls:N-egans-end=2` puts skulls on buildings, so an e2e reaches a turn-start virtue
 * with no play. Same placement rule as the markers above.
 */
export const TEST_VIRTUES = "~test-virtues:";
export const TEST_SKULLS = "~test-skulls:";

const testMarker = (seed: string, marker: string, shape: RegExp): [string, string][] => {
  const start = seed.indexOf(marker);
  if (start < 0) return [];
  const body = /^[\w,=+/-]*/.exec(seed.slice(start + marker.length))?.[0] ?? "";
  return body
    .split(",")
    .filter((part) => part.length > 0)
    .map((part) => {
      const [heroId, value] = part.split("=");
      if (!heroId || value === undefined || !shape.test(value)) {
        throw new Error(`The test seed marker ${marker} cannot read "${part}".`);
      }
      return [heroId, value];
    });
};

const applyHeroTestSeeds = (play: PlayState, seed: string): void => {
  const clock = ensureClock(play);
  const merge = (heroId: string, change: Partial<ReturnType<typeof heroSheet>>) =>
    setHeroSheet(play, heroId, { ...heroSheet(clock, heroId), ...change });
  for (const [heroId, value] of testMarker(seed, TEST_ITEMS, /^[\w-]+(\+[\w-]+)*$/)) {
    merge(heroId, { items: value.split("+") });
  }
  for (const [heroId, value] of testMarker(seed, TEST_HP, /^\d+\/\d+$/)) {
    const [hp, max] = value.split("/").map(Number);
    merge(heroId, { hp: { hp: hp ?? 0, max: max ?? 0 } });
  }
  for (const [heroId, value] of testMarker(seed, TEST_GOLD, /^\d+$/)) {
    merge(heroId, { gold: Number(value) });
  }
  for (const [heroId, value] of testMarker(seed, TEST_VIRTUES, /^[\w-]+(\+[\w-]+)*$/)) {
    merge(heroId, { virtues: value.split("+") });
  }
  for (const [spaceId, value] of testMarker(seed, TEST_SKULLS, /^\d$/)) {
    if (!play.content.board.spaceById.get(spaceId)?.building) {
      throw new Error(
        `The test seed marker ${TEST_SKULLS} names "${spaceId}", which is no building.`,
      );
    }
    setBuildingSkulls(play, spaceId, Number(value));
  }
};

const seatTogetherForTest = (groups: GroupState[], turnOrder: string[]): GroupState[] => {
  const ordered = turnOrder.flatMap((id) => groups.filter((group) => group.id === id));
  const lead = ordered[0];
  if (!lead) return groups;
  return [{ ...lead, heroIds: ordered.flatMap((group) => group.heroIds) }];
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
  const shuffledOrder = [...groups].sort((a, b) => a.order - b.order).map((g) => g.id);
  const seated = seed.endsWith(TEST_SEAT_TOGETHER)
    ? seatTogetherForTest(groups, shuffledOrder)
    : groups;
  const turnOrder = seated === groups ? shuffledOrder : seated.map((group) => group.id);

  const play: PlayState = {
    content,
    groups: seated,
    turnOrder,
    dayNumber: 0,
    rngSeq: 1,
    dayRolls: {},
    lastSkull: null,
    regroupQueue: [],
    regroupCardDay: null,
    booted: true,
    childInput: null,
  };
  for (const [heroId, corruptions] of corruptionsFromTestSeed(seed)) {
    setHeroSheet(play, heroId, { helpingVirtues: 0, corruptions });
  }
  applyHeroTestSeeds(play, seed);
  return play;
};

export const groupById = (play: PlayState, groupId: string): GroupState | undefined =>
  play.groups.find((g) => g.id === groupId);
