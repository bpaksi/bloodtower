import type { PlayState } from "../chapter/playState.ts";
import { groupById, nextPlayRng } from "../chapter/playState.ts";
import { ensureClock, heroSheet, isFallen } from "../day/clock.ts";
import { buildingMenu } from "../day/rules.ts";

/** Prices and amounts for the 1.0 picks. Defaults match packs/base/tuning.yaml (DEC-703). */
export type PickTuning = {
  rally: { gold: number; moves: number };
  cure: { gold: number; moves: number; corruption: number };
  restHitPoints: number;
  virtueDraw: number;
  cleanse: { gold: number; moves: number };
};

export const BASE_PICK_TUNING: PickTuning = {
  rally: { gold: 5, moves: 1 },
  cure: { gold: 10, moves: 1, corruption: 1 },
  restHitPoints: 3,
  virtueDraw: 10,
  cleanse: { gold: 0, moves: 1 },
};

/** Reads the `gold` block of a tuning file; missing keys keep the base numbers. */
export const pickTuningFrom = (gold?: {
  citadel_rally?: { gold: number; moves: number };
  sanctuary_cure?: { gold: number; moves: number; corruption: number };
  tavern_rest?: { hit_points: number };
  virtue_draw?: number;
}): PickTuning => ({
  rally: gold?.citadel_rally
    ? { gold: gold.citadel_rally.gold, moves: gold.citadel_rally.moves }
    : BASE_PICK_TUNING.rally,
  cure: gold?.sanctuary_cure ?? BASE_PICK_TUNING.cure,
  restHitPoints: gold?.tavern_rest?.hit_points ?? BASE_PICK_TUNING.restHitPoints,
  virtueDraw: gold?.virtue_draw ?? BASE_PICK_TUNING.virtueDraw,
  cleanse: BASE_PICK_TUNING.cleanse,
});

/** Placeholder virtue tiles the draw picks from (seeded). */
export const VIRTUE_TILES = ["courage", "mercy", "wisdom", "honor", "fortitude", "grace"] as const;
export const MAX_VIRTUE_TILES = 4;
export const SILVER_TONGUE_HERO = "bard";

export type PickKind = "rally" | "virtue-draw" | "cure" | "rest" | "cleanse";

export type PickEvent = {
  kind: PickKind;
  groupId: string;
  heroId?: string;
  chapter: number;
  gold: number;
  free?: boolean;
};

export type HeroHp = { hp: number; max: number };

export type PicksStore = {
  tuning: PickTuning;
  chapter: number;
  /** Gold in each group's purse. */
  purse: Record<string, number>;
  /** Moves left this turn, per group. */
  moves: Record<string, number>;
  hp: Record<string, HeroHp>;
  tiles: Record<string, string[]>;
  /** Set when a draw went past four tiles; the group must give one back. */
  giveBack: Record<string, boolean>;
  /** Spaces carrying a quest marker (DEC-083). */
  quests: string[];
  /** `${chapter}:${heroId}` for each free cure already used (DEC-700). */
  freeCures: string[];
  log: PickEvent[];
};

const stores = new WeakMap<PlayState, PicksStore>();

export const ensurePicks = (play: PlayState): PicksStore => {
  const existing = stores.get(play);
  if (existing) return existing;
  const created: PicksStore = {
    tuning: BASE_PICK_TUNING,
    chapter: 1,
    purse: {},
    moves: {},
    hp: {},
    tiles: {},
    giveBack: {},
    quests: [],
    freeCures: [],
    log: [],
  };
  stores.set(play, created);
  return created;
};

export const configurePicks = (
  play: PlayState,
  options: { tuning?: PickTuning; chapter?: number },
): PicksStore => {
  const store = ensurePicks(play);
  if (options.tuning) store.tuning = options.tuning;
  if (options.chapter !== undefined) store.chapter = options.chapter;
  return store;
};

export type PickRefusal =
  | "unknown-group"
  | "not-inside"
  | "fallen"
  | "not-offered"
  | "no-moves"
  | "no-gold"
  | "no-target"
  | "give-back-first";

export type PickResult = { ok: true; event: PickEvent } | { ok: false; reason: PickRefusal };

export type MenuEntry = {
  id: string;
  label: string;
  /** Gold the pick would take, after Silver Tongue; null when it has no price. */
  price: number | null;
  /** Offered but pressing does nothing (UI-043, DEC-693). */
  disabled: boolean;
};

const ABOVE_CLEANSE: Record<string, readonly string[]> = {
  citadel: ["Rally", "Virtue draw"],
  sanctuary: ["Cure"],
  village: ["Rest"],
  bazaar: [],
};

const LABEL_TO_KIND: Record<string, PickKind> = {
  Rally: "rally",
  "Virtue draw": "virtue-draw",
  Cure: "cure",
  Rest: "rest",
  Cleanse: "cleanse",
};

/** A quarter off, rounded up so 5 becomes 4 (DEC-681, P-003). */
export const silverTonguePrice = (price: number): number => Math.ceil((price * 3) / 4);

const hasBard = (play: PlayState, groupId: string): boolean =>
  Boolean(groupById(play, groupId)?.heroIds.includes(SILVER_TONGUE_HERO));

const basePrice = (store: PicksStore, kind: PickKind): number => {
  if (kind === "rally") return store.tuning.rally.gold;
  if (kind === "virtue-draw") return store.tuning.virtueDraw;
  if (kind === "cure") return store.tuning.cure.gold;
  if (kind === "cleanse") return store.tuning.cleanse.gold;
  return 0;
};

const movesCost = (store: PicksStore, kind: PickKind): number => {
  if (kind === "rally") return store.tuning.rally.moves;
  if (kind === "cure") return store.tuning.cure.moves;
  if (kind === "cleanse") return store.tuning.cleanse.moves;
  return 1;
};

const freeKey = (chapter: number, heroId: string): string => `${chapter}:${heroId}`;

export const freeCureAvailable = (play: PlayState, heroId: string): boolean =>
  !ensurePicks(play).freeCures.includes(freeKey(ensurePicks(play).chapter, heroId));

/** What the pick costs in gold right now: Bard discount (DEC-681), free first cure (DEC-700). */
export const pickPrice = (
  play: PlayState,
  groupId: string,
  kind: PickKind,
  heroId?: string,
): number => {
  const store = ensurePicks(play);
  if (kind === "cure" && heroId && freeCureAvailable(play, heroId)) return 0;
  const base = basePrice(store, kind);
  return hasBard(play, groupId) && base > 0 ? silverTonguePrice(base) : base;
};

export const setPurse = (play: PlayState, groupId: string, gold: number): void => {
  ensurePicks(play).purse[groupId] = gold;
};
export const setMoves = (play: PlayState, groupId: string, moves: number): void => {
  ensurePicks(play).moves[groupId] = moves;
};
export const setHeroHp = (play: PlayState, heroId: string, hp: number, max: number): void => {
  ensurePicks(play).hp[heroId] = { hp, max };
};
export const setVirtueTiles = (play: PlayState, groupId: string, tiles: string[]): void => {
  ensurePicks(play).tiles[groupId] = [...tiles];
};
export const setQuestMarker = (play: PlayState, spaceId: string, present: boolean): void => {
  const store = ensurePicks(play);
  store.quests = store.quests.filter((id) => id !== spaceId);
  if (present) store.quests.push(spaceId);
};

const spaceOf = (play: PlayState, groupId: string) => {
  const group = groupById(play, groupId);
  if (!group) return null;
  return { group, space: play.content.board.spaceById.get(group.spaceId) };
};

/** Opening a menu: refused for a fallen building (EV-10). */
export const openMenu = (
  play: PlayState,
  groupId: string,
): { ok: true; entries: MenuEntry[] } | { ok: false; reason: PickRefusal } => {
  const here = spaceOf(play, groupId);
  if (!here?.space?.building) return { ok: false, reason: "unknown-group" };
  if (isFallen(play, here.space.id)) return { ok: false, reason: "fallen" };
  const store = ensurePicks(play);
  const clock = ensureClock(play);
  const skulls = clock.skulls[here.space.id] ?? 0;
  const labels = buildingMenu(
    ABOVE_CLEANSE[here.space.building] ?? [],
    skulls,
    store.quests.includes(here.space.id),
  );
  const entries: MenuEntry[] = labels.map((label) => {
    const kind = LABEL_TO_KIND[label];
    if (!kind) return { id: label.toLowerCase(), label, price: null, disabled: false };
    // A cure's price depends on the hero; the menu shows the group's cheapest.
    const heroPrices =
      kind === "cure"
        ? here.group.heroIds.map((hero) => pickPrice(play, groupId, kind, hero))
        : [pickPrice(play, groupId, kind)];
    const price = Math.min(...heroPrices);
    const moves = store.moves[groupId] ?? 0;
    const purse = store.purse[groupId] ?? 0;
    return {
      id: kind,
      label,
      price,
      disabled: moves < movesCost(store, kind) || purse < price,
    };
  });
  return { ok: true, entries };
};

const pickGate = (
  play: PlayState,
  groupId: string,
  kind: PickKind,
): { ok: true; store: PicksStore; spaceId: string } | { ok: false; reason: PickRefusal } => {
  const opened = openMenu(play, groupId);
  if (!opened.ok) return opened;
  if (!opened.entries.some((entry) => entry.id === kind))
    return { ok: false, reason: "not-offered" };
  const store = ensurePicks(play);
  if (store.giveBack[groupId]) return { ok: false, reason: "give-back-first" };
  if ((store.moves[groupId] ?? 0) < movesCost(store, kind))
    return { ok: false, reason: "no-moves" };
  const spaceId = groupById(play, groupId)?.spaceId ?? "";
  return { ok: true, store, spaceId };
};

/** One pick. Costs the tuning's moves and gold; Leave is never a pick and is free. */
export const applyPick = (
  play: PlayState,
  seed: string,
  groupId: string,
  kind: PickKind,
  options: { heroId?: string } = {},
): PickResult => {
  const gate = pickGate(play, groupId, kind);
  if (!gate.ok) return gate;
  const { store, spaceId } = gate;
  const group = groupById(play, groupId);
  if (!group) return { ok: false, reason: "unknown-group" };
  const heroId = options.heroId ?? group.heroIds[0];
  if (
    (kind === "cure" || kind === "rest" || kind === "rally") &&
    (!heroId || !group.heroIds.includes(heroId))
  ) {
    return { ok: false, reason: "no-target" };
  }
  const price = pickPrice(play, groupId, kind, heroId);
  if ((store.purse[groupId] ?? 0) < price) return { ok: false, reason: "no-gold" };

  const clock = ensureClock(play);
  if (kind === "cure") {
    const sheet = heroSheet(clock, heroId as string);
    if (sheet.corruptions < 1) return { ok: false, reason: "no-target" };
    clock.heroes[heroId as string] = {
      ...sheet,
      corruptions: Math.max(0, sheet.corruptions - store.tuning.cure.corruption),
    };
    if (price === 0) store.freeCures.push(freeKey(store.chapter, heroId as string));
  } else if (kind === "rally") {
    const hp = store.hp[heroId as string];
    if (hp) hp.hp = hp.max;
  } else if (kind === "rest") {
    const hp = store.hp[heroId as string];
    if (hp) hp.hp = Math.min(hp.max, hp.hp + store.tuning.restHitPoints);
  } else if (kind === "virtue-draw") {
    const tile = nextPlayRng(seed, play).pick([...VIRTUE_TILES]);
    const tiles = store.tiles[groupId] ?? [];
    tiles.push(tile);
    store.tiles[groupId] = tiles;
    if (tiles.length > MAX_VIRTUE_TILES) store.giveBack[groupId] = true;
  } else {
    // Cleanse: -1 skull, +1 supply, the day reads "+1 day" (DEC-377, DEC-686).
    clock.skulls[spaceId] = Math.max(0, (clock.skulls[spaceId] ?? 0) - 1);
    clock.supply += 1;
    if (!clock.effects.includes("+1 day")) clock.effects.push("+1 day");
  }

  store.purse[groupId] = (store.purse[groupId] ?? 0) - price;
  store.moves[groupId] = (store.moves[groupId] ?? 0) - movesCost(store, kind);
  const event: PickEvent = {
    kind,
    groupId,
    chapter: store.chapter,
    gold: price,
    ...(heroId ? { heroId } : {}),
    ...(kind === "cure" ? { free: price === 0 } : {}),
  };
  store.log.push(event);
  return { ok: true, event };
};

/** Resolves the give-back prompt a fifth tile opens (DEC-544). */
export const giveBackTile = (play: PlayState, groupId: string, tile: string): boolean => {
  const store = ensurePicks(play);
  const tiles = store.tiles[groupId];
  if (!store.giveBack[groupId] || !tiles) return false;
  const at = tiles.indexOf(tile);
  if (at < 0) return false;
  tiles.splice(at, 1);
  store.giveBack[groupId] = false;
  return true;
};

/** Free-cure flags rebuilt from the pick log alone (a host restart replays the event log). */
export const rebuildFreeCures = (log: readonly PickEvent[]): string[] =>
  log
    .filter((e) => e.kind === "cure" && e.free && e.heroId)
    .map((e) => freeKey(e.chapter, e.heroId as string));

export const snapshotPicks = (play: PlayState): string => JSON.stringify(ensurePicks(play));

export const restorePicks = (play: PlayState, saved: string): PicksStore => {
  const restored = JSON.parse(saved) as PicksStore;
  stores.set(play, restored);
  return restored;
};

/** Restart: nothing but the pick log survives; free-cure flags are rebuilt from it. */
export const restorePicksFromLog = (
  play: PlayState,
  log: readonly PickEvent[],
  base: { tuning?: PickTuning; chapter: number },
): PicksStore => {
  stores.delete(play);
  const store = ensurePicks(play);
  if (base.tuning) store.tuning = base.tuning;
  store.chapter = base.chapter;
  store.log = [...log];
  store.freeCures = rebuildFreeCures(log);
  return store;
};
