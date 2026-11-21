import { groupById, nextPlayRng, type PlayState } from "../../loops/chapter/playState.ts";
import { type DayClock, ensureClock, heroSheet } from "../../loops/day/clock.ts";
import { CORRUPTION_LOSS_LIMIT } from "../../loops/day/rules.ts";

export * from "./tuning.ts";

/*
 * Corruption (MEC-080, C3-08). A hero's corruptions are stored by ID, each a seeded draw from the
 * C3 set, never one the hero already holds (Q-C3-15). Cursed (DEC-466) is C4; Suspicious and Weak
 * (DEC-467, DEC-469) are 1.1 (DEC-718). None of the three is ever drawn here (EV-08).
 */

export const CORRUPTION_IDS = [
  "uncertain",
  "cruel",
  "greedy",
  "feral",
  "lost",
  "feeble",
  "feverish",
  "selfish",
  "tempted",
] as const;

export type CorruptionId = (typeof CORRUPTION_IDS)[number];

export const isCorruptionId = (value: string): value is CorruptionId =>
  (CORRUPTION_IDS as readonly string[]).includes(value);

/** The IDs a hero can still draw: the C3 set less what they hold. */
export const drawableCorruptions = (held: readonly string[]): CorruptionId[] =>
  CORRUPTION_IDS.filter((id) => !held.includes(id));

/** One seeded draw, never a held ID. Throws when the hero holds the whole set. */
export const drawCorruption = (
  rng: { pick: <T>(items: readonly T[]) => T },
  held: readonly string[],
): CorruptionId => {
  const open = drawableCorruptions(held);
  if (open.length === 0) throw new Error("This hero already holds every corruption in the set.");
  return rng.pick(open);
};

/** Named corruptions a hero holds (empty for a hero with only a count). */
export const namedOf = (clock: DayClock, heroId: string): readonly string[] =>
  heroSheet(clock, heroId).named ?? [];

export const holds = (clock: DayClock, heroId: string, id: CorruptionId): boolean =>
  namedOf(clock, heroId).includes(id);

export const anyHolds = (clock: DayClock, heroIds: readonly string[], id: CorruptionId): boolean =>
  heroIds.some((heroId) => holds(clock, heroId, id));

/** The count of corruptions that loses the game at once (DEC-043, DEC-676). */
export const isThirdCorruption = (count: number): boolean => count >= CORRUPTION_LOSS_LIMIT;

/**
 * DEC-476: a Selfish hero cannot give a card. Receiving is untouched. Every card-passing rule
 * must call this; 1.0 ships no give action (DEC-894, DEC-544).
 */
export const mayGive = (clock: DayClock, heroId: string): boolean =>
  !holds(clock, heroId, "selfish");

/** DEC-474: a Feeble hero's virtues and gear add nothing to the move roll. */
export const virtuesCount = (clock: DayClock, heroId: string): number =>
  holds(clock, heroId, "feeble") ? 0 : heroSheet(clock, heroId).helpingVirtues;

export type GainedCorruption = { id: CorruptionId; count: number; lost: boolean };

/**
 * A hero takes one corruption: a seeded draw, stored by ID (EV-06). The third loses the game at
 * once, wherever it lands (DEC-676): the clock's outcome says so, and every loop that reads it stops.
 */
export const gainCorruption = (play: PlayState, seed: string, heroId: string): GainedCorruption => {
  const clock = ensureClock(play);
  const sheet = heroSheet(clock, heroId);
  const held = sheet.named ?? [];
  const id = drawCorruption(nextPlayRng(seed, play), held);
  const count = sheet.corruptions + 1;
  clock.heroes[heroId] = { ...sheet, corruptions: count, named: [...held, id] };
  const lost = isThirdCorruption(count);
  if (lost) clock.outcome = { lost: true, reason: "corruption" };
  return { id, count, lost };
};

/** A cure removes one corruption: the one named, else the newest. A count-only hero just loses one. */
export const removeCorruption = (
  play: PlayState,
  heroId: string,
  amount: number,
  which?: string,
): void => {
  const clock = ensureClock(play);
  const sheet = heroSheet(clock, heroId);
  const named = sheet.named ? [...sheet.named] : undefined;
  if (named) {
    for (let i = 0; i < amount && named.length > 0; i++) {
      const at = which ? named.indexOf(which) : named.length - 1;
      named.splice(at < 0 ? named.length - 1 : at, 1);
    }
  }
  clock.heroes[heroId] = {
    ...sheet,
    corruptions: Math.max(0, sheet.corruptions - amount),
    ...(named ? { named } : {}),
  };
};

/** Where gold losses are taken from: a hero's own part of the purse (DEC-176, DEC-896). */
export type HeroGold = {
  get: (heroId: string) => number;
  set: (heroId: string, gold: number) => void;
};

/**
 * Test-only fallback (D5): a running game reads each hero's own sheet gold (`sheetHeroGold` in the
 * purse rules). Only a test that sets a group purse by hand, with no gold on any sheet, lands here:
 * the one purse stands for every hero of the group, so each loss comes off it, never below 0.
 */
export const groupPurseGold = (purse: Record<string, number>, groupId: string): HeroGold => ({
  get: () => purse[groupId] ?? 0,
  set: (_heroId, gold) => {
    purse[groupId] = gold;
  },
});

const lose = (gold: HeroGold, heroId: string, amount: number): void => {
  gold.set(heroId, Math.max(0, gold.get(heroId) - amount));
};

/**
 * After a pick at a building (DEC-470, DEC-471): Cruel after a village pick, Greedy after a
 * bazaar pick, each holder paying from their own part.
 */
export const applyPickLosses = (
  play: PlayState,
  groupId: string,
  building: string | undefined,
  gold: HeroGold,
): void => {
  const clock = ensureClock(play);
  const group = groupById(play, groupId);
  if (!group) return;
  const tuning = clock.tuning.corruption;
  for (const heroId of group.heroIds) {
    if (building === "village" && holds(clock, heroId, "cruel"))
      lose(gold, heroId, tuning.cruelLoss);
    if (building === "bazaar" && holds(clock, heroId, "greedy"))
      lose(gold, heroId, tuning.greedyLoss);
  }
};

/**
 * When a group's turn ends (DEC-472, DEC-473): Feral on a building's space, Lost in the holder's
 * home kingdom. The kingdom of a hero's start seat is their home (the pack's start assignments).
 */
export const applyTurnEndLosses = (play: PlayState, groupId: string, gold: HeroGold): void => {
  const clock = ensureClock(play);
  const group = groupById(play, groupId);
  if (!group) return;
  const space = play.content.board.spaceById.get(group.spaceId);
  if (!space) return;
  const tuning = clock.tuning.corruption;
  for (const heroId of group.heroIds) {
    if (space.building && holds(clock, heroId, "feral")) lose(gold, heroId, tuning.feralLoss);
    const home = play.content.start.assignments.find((row) => row.hero === heroId)?.kingdom;
    if (home && space.kingdom === home && holds(clock, heroId, "lost"))
      lose(gold, heroId, tuning.lostLoss);
  }
};

/** DEC-468: an Uncertain holder in the group ends the turn after a building pick. */
export const endsTurnAfterPick = (play: PlayState, groupId: string): boolean => {
  const group = groupById(play, groupId);
  return group ? anyHolds(ensureClock(play), group.heroIds, "uncertain") : false;
};

/** DEC-475: no Cleanse at 3 skulls while a Feverish hero is present. */
export const cleanseBlocked = (play: PlayState, groupId: string, skulls: number): boolean => {
  const group = groupById(play, groupId);
  return Boolean(group && skulls >= 3 && anyHolds(ensureClock(play), group.heroIds, "feverish"));
};

/** DEC-477, DEC-896: +2 once on a buy that costs gold, however many Tempted holders are present. */
export const temptedExtra = (play: PlayState, groupId: string, price: number): number => {
  const group = groupById(play, groupId);
  if (!group || price <= 0) return 0;
  const clock = ensureClock(play);
  return anyHolds(clock, group.heroIds, "tempted") ? clock.tuning.corruption.temptedBuyExtra : 0;
};
