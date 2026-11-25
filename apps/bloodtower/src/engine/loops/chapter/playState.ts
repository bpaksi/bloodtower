import { eventRng } from "@dark-tower/rng";
import {
  ensureClock,
  heroSheet,
  markQuestWon,
  recordHeldSkull,
  setBuildingSkulls,
  setHeroSheet,
} from "../day/clock.ts";
import { ensurePicks } from "../encounter/picks.ts";
import { forceEvent, forceEventLine } from "../event/ledger.ts";
import { ensureQuests } from "../quest/store.ts";
import type { BoardGraph, KingdomId } from "./board.ts";
import { citadelForKingdom } from "./board.ts";
import { configureChapters, tryChapters } from "./chapters.ts";

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

/** A foe standing on the physical board (DEC-710, C2-11). */
export type BoardFoe = {
  id: string;
  name: string;
  spaceId: string;
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
  /** Foes standing on the board, if any (DEC-710, C2-11). Absent in saves with none. */
  foes?: BoardFoe[];
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
    | { kind: "encounter"; groupId: string; movesLeft?: number }
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
 * TEST ONLY (CU/14). `~test-virtue-ids:hero-a=infused+fortunate` gives heroes named virtues at
 * the start (not `~test-virtues:`, which counts helping virtues), so an e2e reaches a turn-start
 * virtue with no play. Skulls come from `~test-skulls:` below. Same placement rule as the above.
 */
export const TEST_VIRTUE_IDS = "~test-virtue-ids:";
const SHAPE_IDS = /^[\w-]+(\+[\w-]+)*$/;

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

/**
 * TEST ONLY (C3/20). More markers of the same hook: `~test-virtues:hero-a=1` (helping virtues),
 * `~test-skulls:<spaceId>=3` (skulls on a building), `~test-kingdom:E+S` (the kingdoms the next
 * drops land in, in order) and `~test-effects-line:<lineId>` (the narration the effects wait ends
 * on). A field a marker does not name stays unset. Put them before `~test-seat-together`. Real
 * seeds never carry them.
 */
export const TEST_VIRTUES = "~test-virtues:";
export const TEST_SKULLS = "~test-skulls:";
export const TEST_KINGDOM = "~test-kingdom:";
export const TEST_EFFECTS_LINE = "~test-effects-line:";
/** TEST ONLY (C3/12). The next draw is this event (or `none` stops them), and its narration line. */
export const TEST_EVENT = "~test-event:";
export const TEST_EVENT_LINE = "~test-event-line:";
/**
 * TEST ONLY (C3/13). `~test-building-line:<lineId>` gives Rally, Virtue draw and Cleanse results a
 * narration line, so an e2e reaches the audio-end path with mock audio. No real clip is packed yet.
 */
export const TEST_BUILDING_LINE = "~test-building-line:";
/**
 * `~test-effect:cleanse+quest-won`, for a running game: "a Cleanse happened today" (its "+1 day"
 * line) and "a quest was won today" (the night's drop is skipped). They stand in for play.
 */
export const TEST_EFFECT = "~test-effect:";

/**
 * TEST ONLY (C3/13). `~test-named:hero-a=feral+lost` gives a hero those named corruptions (and
 * their count), so an e2e reaches the Cure's corruption pick. `~test-tiles:hero-a=courage+mercy+
 * wisdom+honor` gives the hero's group those virtue tiles for the building menu's draw. Same
 * placement rule as the others. Real seeds never carry them.
 */
export const TEST_NAMED = "~test-named:";
/**
 * TEST ONLY (C3/13). `~test-at:N-upper-ice-fangs` puts every group on that space at the start, so
 * an e2e meets each kind of building without walking to it. Same placement rule as the others.
 */
export const TEST_AT = "~test-at:";
export const TEST_TILES = "~test-tiles:";
/**
 * TEST ONLY (C3/15). `~test-chapter-line:<lineId>` gives the chapter card, stamp, close and Reveal
 * a narration line, so a test reaches the audio-end path with mock audio. No clip is packed yet.
 */
export const TEST_CHAPTER_LINE = "~test-chapter-line:";
/**
 * TEST ONLY (C3/15). `~test-seals` gives a story with no seals the three locked seals, so a test
 * reaches the seal break with the tower mock before C4/13 loads them from the pack.
 */
export const TEST_SEALS = "~test-seals";
/**
 * TEST ONLY (C3/15), for a running game: `~test-quests-done:herald+ambush` marks those quests
 * done, so a test wins the chapter at the day's end without playing each quest.
 */
export const TEST_QUESTS_DONE = "~test-quests-done:";
/**
 * TEST ONLY (C3/16): `~test-supply:<n>` shortens the skull supply; `~test-flag:<id>` sets a
 * quest/ending flag; `~test-finale` turns the running chapter into a won finale (DEC-664);
 * `~test-outcome-line:<lineId>` gives the outcome scene a narration line for audio-end tests.
 */
export const TEST_SUPPLY = "~test-supply:";
export const TEST_FLAG = "~test-flag:";
export const TEST_FINALE = "~test-finale";
export const TEST_OUTCOME_LINE = "~test-outcome-line:";
/**
 * TEST ONLY (C2-11): seed markers for Continue piece-check e2e tests.
 * `~test-foes:<id>@<spaceId>` places foes on the board, `~test-broken-seals:<sealId>` marks broken
 * seals, `~test-inside:<count>` records skulls trapped inside the tower, and `~test-drums:<t>,<m>,<b>`
 * sets saved drum positions (parsed by the shell step). Real seeds never carry them.
 */
export const TEST_FOES = "~test-foes:";
export const TEST_BROKEN_SEALS = "~test-broken-seals:";
export const TEST_INSIDE = "~test-inside:";
export const TEST_DRUMS = "~test-drums:";

/** Every marker the hook reads. A seed with none of them is a real seed. */
export const TEST_SEED_MARKERS = [
  TEST_SEAT_TOGETHER,
  TEST_CORRUPTION,
  TEST_ITEMS,
  TEST_HP,
  TEST_GOLD,
  TEST_VIRTUES,
  TEST_VIRTUE_IDS,
  TEST_SKULLS,
  TEST_KINGDOM,
  TEST_EFFECTS_LINE,
  TEST_BUILDING_LINE,
  TEST_EFFECT,
  TEST_EVENT,
  TEST_EVENT_LINE,
  TEST_NAMED,
  TEST_TILES,
  TEST_AT,
  TEST_CHAPTER_LINE,
  TEST_SEALS,
  TEST_QUESTS_DONE,
  TEST_SUPPLY,
  TEST_FLAG,
  TEST_FINALE,
  TEST_OUTCOME_LINE,
  TEST_FOES,
  TEST_BROKEN_SEALS,
  TEST_INSIDE,
  TEST_DRUMS,
] as const;

export const isTestSeed = (seed: string): boolean =>
  TEST_SEED_MARKERS.some((marker) => seed.includes(marker));

const KINGDOM_IDS: readonly string[] = ["N", "E", "S", "W"];

export const markerBody = (seed: string, marker: string, body: RegExp): string | null => {
  const start = seed.indexOf(marker);
  if (start < 0) return null;
  return body.exec(seed.slice(start + marker.length))?.[0] ?? "";
};

/**
 * The one test-seed hook (C3/20). It sets the day clock's sheets, skulls, kingdoms and items from
 * the markers in a seed string, at the start of a game (`initPlayState`) or, through the host's
 * test-only door, while one runs. CU/10's `~test-corruption:` and CU/13's items, hit points and gold
 * are read here, not beside it. A seed with no marker changes nothing.
 */
export const applyTestSeed = (play: PlayState, seed: string): void => {
  const clock = ensureClock(play);
  const merge = (heroId: string, change: Partial<ReturnType<typeof heroSheet>>) =>
    setHeroSheet(play, heroId, { ...heroSheet(clock, heroId), ...change });
  for (const [heroId, corruptions] of corruptionsFromTestSeed(seed)) {
    merge(heroId, { corruptions });
  }
  for (const [heroId, value] of testMarker(seed, TEST_VIRTUES, /^\d$/)) {
    merge(heroId, { helpingVirtues: Number(value) });
  }
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
  for (const [heroId, value] of testMarker(seed, TEST_NAMED, SHAPE_IDS)) {
    const named = value.split("+");
    merge(heroId, { named, corruptions: named.length });
  }
  for (const [heroId, value] of testMarker(seed, TEST_TILES, SHAPE_IDS)) {
    const group = play.groups.find((row) => row.heroIds.includes(heroId));
    if (!group) throw new Error(`The test tile seed names "${heroId}", who is in no group.`);
    ensurePicks(play).tiles[group.id] = value.split("+");
  }
  for (const [heroId, value] of testMarker(seed, TEST_VIRTUE_IDS, SHAPE_IDS)) {
    merge(heroId, { virtues: value.split("+") });
  }
  for (const [spaceId, value] of testMarker(seed, TEST_SKULLS, /^\d$/)) {
    if (!play.content.board.spaceById.get(spaceId)?.building) {
      throw new Error(`The test skull seed names "${spaceId}", which is not a building.`);
    }
    setBuildingSkulls(play, spaceId, Number(value));
  }
  const kingdoms = markerBody(seed, TEST_KINGDOM, /^[A-Z+]*/);
  if (kingdoms !== null) {
    const ids = kingdoms.split("+").filter((id) => id.length > 0);
    const bad = ids.find((id) => !KINGDOM_IDS.includes(id));
    if (bad || ids.length === 0) {
      throw new Error(`The test kingdom seed needs kingdoms from N, E, S, W, got "${bad ?? ""}".`);
    }
    clock.seedKingdoms = ids as KingdomId[];
  }
  const at = markerBody(seed, TEST_AT, /^[\w-]*/);
  if (at !== null) {
    if (!play.content.board.spaceById.has(at)) {
      throw new Error(`The test position seed names "${at}", which is not a space.`);
    }
    for (const group of play.groups) group.spaceId = at;
  }
  const effects = markerBody(seed, TEST_EFFECT, /^[a-z+-]*/);
  if (effects !== null) {
    for (const name of effects.split("+")) {
      if (name === "cleanse") {
        if (!clock.effects.includes("+1 day")) clock.effects.push("+1 day");
      } else if (name === "quest-won") {
        markQuestWon(play);
      } else {
        throw new Error(`The test effect seed knows cleanse and quest-won, got "${name}".`);
      }
    }
  }
  const forced = markerBody(seed, TEST_EVENT, /^[a-z-]*/);
  if (forced !== null) forceEvent(play, forced);
  const eventLine = markerBody(seed, TEST_EVENT_LINE, /^[\w.-]*/);
  if (eventLine !== null) forceEventLine(play, eventLine);
  const line = markerBody(seed, TEST_EFFECTS_LINE, /^[\w.-]*/);
  if (line !== null) {
    if (line === "") throw new Error("The test effects-line seed needs a line id.");
    clock.effectsLine = line;
  }
  const done = markerBody(seed, TEST_QUESTS_DONE, /^[\w+-]*/);
  if (done !== null) {
    const ids = done.split("+").filter((id) => id.length > 0);
    if (ids.length === 0) throw new Error("The test quests-done seed needs quest ids.");
    const quests = ensureQuests(play);
    for (const id of ids) if (!quests.done.includes(id)) quests.done.push(id);
  }
  const buildingLine = markerBody(seed, TEST_BUILDING_LINE, /^[\w.-]*/);
  if (buildingLine !== null) {
    if (buildingLine === "") throw new Error("The test building-line seed needs a line id.");
    clock.buildingLine = buildingLine;
  }
  const supply = markerBody(seed, TEST_SUPPLY, /^\d*/);
  if (supply !== null) {
    if (!/^\d+$/.test(supply)) {
      throw new Error(`The test supply seed needs a whole number, got "${supply}".`);
    }
    clock.supply = Number(supply);
  }
  const flag = markerBody(seed, TEST_FLAG, /^[\w+-]*/);
  if (flag !== null) {
    const ids = flag.split("+").filter((id) => id.length > 0);
    if (ids.length === 0) throw new Error("The test flag seed needs flag ids.");
    const quests = ensureQuests(play);
    for (const id of ids) if (!quests.flags.includes(id)) quests.flags.push(id);
  }
  if (seed.includes(TEST_FINALE)) {
    const chapters = tryChapters(play);
    if (chapters) {
      const current = chapters.plan.chapters.find((c) => c.index === chapters.current);
      if (current) {
        chapters.plan = {
          ...chapters.plan,
          chapters: [current],
          c3EndAfterChapter1: false,
          c4EndAfterChapter3: false,
        };
      }
      chapters.towerWon = true;
    }
  }
  const foes = markerBody(seed, TEST_FOES, /^[\w,@+-]*/);
  if (foes !== null) {
    const entries = foes
      .split(",")
      .filter((part) => part.length > 0)
      .map((part) => {
        const [id, spaceId] = part.split("@");
        if (!id || !spaceId || !play.content.board.spaceById.has(spaceId)) {
          throw new Error(`The test foes seed cannot read "${part}".`);
        }
        const name = id.charAt(0).toUpperCase() + id.slice(1).replaceAll("-", " ");
        return { id, name, spaceId };
      });
    play.foes = entries;
  }
  const brokenSeals = markerBody(seed, TEST_BROKEN_SEALS, /^[\w+-]*/);
  if (brokenSeals !== null) {
    const ids = brokenSeals.split("+").filter((id) => id.length > 0);
    if (ids.length === 0) throw new Error("The test broken-seals seed needs seal ids.");
    const chapters =
      tryChapters(play) ??
      configureChapters(play, {
        chapters: [{ id: "ch1", index: 1, kingdoms: ["N", "E", "S", "W"], quests: [] }],
        seals: ids.map((id) => ({
          id,
          name: id
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" "),
          glyph: id,
          boon: "+1",
        })),
        c3EndAfterChapter1: false,
        sealBreakMin: 0,
        foeLevel: { chapter1: 1, perChapter: 1 },
      });
    for (const id of ids) {
      if (!chapters.brokenSeals.includes(id)) chapters.brokenSeals.push(id);
    }
  }
  const inside = markerBody(seed, TEST_INSIDE, /^\d+/);
  if (inside !== null) {
    const count = Number(inside);
    for (let i = 0; i < count; i += 1) {
      recordHeldSkull(play);
    }
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
  applyTestSeed(play, seed);
  return play;
};

export const groupById = (play: PlayState, groupId: string): GroupState | undefined =>
  play.groups.find((g) => g.id === groupId);
