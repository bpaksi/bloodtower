import {
  applyPickLosses,
  applyTurnEndLosses,
  cleanseBlocked,
  endsTurnAfterPick,
  groupPurseGold,
  type HeroGold,
  removeCorruption,
  temptedExtra,
} from "../../rules/corruption/index.ts";
import {
  gainOnSheets,
  payFromSheets,
  poolGold,
  sheetGoldMap,
  sheetHeroGold,
} from "../../rules/purse/index.ts";
import type { PlayState } from "../chapter/playState.ts";
import { groupById, nextPlayRng } from "../chapter/playState.ts";
import { ensureClock, heroSheet, isFallen, setHeroSheet } from "../day/clock.ts";
import { buildingMenu } from "../day/rules.ts";
import { ensureQuests } from "../quest/store.ts";

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
  /** Moves a rest spent. */
  moves?: number;
  /** The corruption a cure took off, when the hero chose one. */
  corruptionId?: string;
  /** The tile a virtue draw added. */
  tile?: string;
};

export type HeroHp = { hp: number; max: number };

export type PicksStore = {
  tuning: PickTuning;
  chapter: number;
  /**
   * The pool each group can spend (D5, DEC-911): in a running game every seated hero's gold, loaded by
   * `loadLive`. A test that sets it by hand with no sheet gold treats it as the group's own purse.
   */
  purse: Record<string, number>;
  /** Gold a group's pending choices owe the pool, and gold they gained, until `settleGold` writes both. */
  owed?: Record<string, number>;
  gained?: Record<string, number>;
  /** Moves left this turn, per group. */
  moves: Record<string, number>;
  hp: Record<string, HeroHp>;
  tiles: Record<string, string[]>;
  /** Set when a draw went past four tiles; the group must give one back. */
  giveBack: Record<string, boolean>;
  /** `${chapter}:${heroId}` for each free cure already used (DEC-700). */
  freeCures: string[];
  /** Groups whose turn has ended this day; an Uncertain pick or the loop sets it (DEC-468). */
  turnEnded?: Record<string, boolean>;
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
  | "feverish"
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

/**
 * DEC-170 / DEC-552: the free first cure (DEC-700) covers the base-price first corruption; every later
 * paid cure costs one higher price and it rises no further. pickPrice only reaches here after the free
 * cure is spent, so any remaining corruption (EV-02 start-at-2 → 1 left) is a later one. DEC-552 gives
 * no number and tuning.yaml is outside this step, so 15 is a local placeholder until the pack carries
 * the tier.
 */
export const CURE_RISEN_GOLD = 15;

const cureBase = (play: PlayState, store: PicksStore, heroId?: string): number => {
  const carried = heroId ? heroSheet(ensureClock(play), heroId).corruptions : 0;
  return carried >= 1 ? Math.max(store.tuning.cure.gold, CURE_RISEN_GOLD) : store.tuning.cure.gold;
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
  const base = kind === "cure" ? cureBase(play, store, heroId) : basePrice(store, kind);
  // DEC-896: free cure, base, Silver Tongue, then Tempted's +2 once, never discounted.
  const haggled = hasBard(play, groupId) && base > 0 ? silverTonguePrice(base) : base;
  return haggled + temptedExtra(play, groupId, haggled);
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
/** The quest id a bare test marker uses when no quest def is behind it. */
const BARE_MARKER_QUEST = "marker";

/** Puts a quest marker on a space, or takes it off: the quest store's, which `openMenu` reads (DEC-083). */
export const setQuestMarker = (play: PlayState, spaceId: string, present: boolean): void => {
  const quests = ensureQuests(play);
  if (present) quests.bySpace[spaceId] ??= BARE_MARKER_QUEST;
  else delete quests.bySpace[spaceId];
};

/** True while the space holds a quest marker of this chapter that is not done (as `openQuestAt` reads it). */
const questOpenAt = (play: PlayState, spaceId: string): boolean => {
  const quests = ensureQuests(play);
  const id = quests.bySpace[spaceId];
  return Boolean(id) && !quests.done.includes(id as string);
};

/** The Quest pick costs one move (DEC-948). */
export const QUEST_MOVES = 1;

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
    questOpenAt(play, here.space.id),
  );
  const entries: MenuEntry[] = labels.map((label) => {
    if (label === "Quest") {
      // Listed while a quest is open; greyed with no move left (DEC-948).
      return {
        id: "quest",
        label,
        price: null,
        disabled: (store.moves[groupId] ?? 0) < QUEST_MOVES,
      };
    }
    const kind = LABEL_TO_KIND[label];
    if (!kind) return { id: label.toLowerCase(), label, price: null, disabled: false };
    // A cure's price depends on the hero; the menu shows the group's cheapest.
    // Only a hero who holds a corruption can be cured, so only their price counts (UI-043).
    const curable = here.group.heroIds.filter((hero) => heroSheet(clock, hero).corruptions > 0);
    const heroPrices =
      kind === "cure"
        ? (curable.length > 0 ? curable : here.group.heroIds).map((hero) =>
            pickPrice(play, groupId, kind, hero),
          )
        : [pickPrice(play, groupId, kind)];
    const price = Math.min(...heroPrices);
    const moves = store.moves[groupId] ?? 0;
    const purse = store.purse[groupId] ?? 0;
    return {
      id: kind,
      label,
      price,
      // Cleanse on a building with no skulls has nothing to remove (still listed, EV-06).
      disabled:
        moves < movesCost(store, kind) ||
        purse < price ||
        (kind === "cleanse" && (skulls < 1 || cleanseBlocked(play, groupId, skulls))),
    };
  });
  return { ok: true, entries };
};

const pickGate = (
  play: PlayState,
  groupId: string,
  kind: PickKind,
  count = 1,
): { ok: true; store: PicksStore; spaceId: string } | { ok: false; reason: PickRefusal } => {
  const opened = openMenu(play, groupId);
  if (!opened.ok) return opened;
  if (!opened.entries.some((entry) => entry.id === kind))
    return { ok: false, reason: "not-offered" };
  const store = ensurePicks(play);
  if (store.giveBack[groupId]) return { ok: false, reason: "give-back-first" };
  if ((store.moves[groupId] ?? 0) < movesCost(store, kind) * count)
    return { ok: false, reason: "no-moves" };
  const spaceId = groupById(play, groupId)?.spaceId ?? "";
  return { ok: true, store, spaceId };
};

/** Whether the group can take the Quest pick now. It changes nothing. */
export const questPickGate = (
  play: PlayState,
  groupId: string,
): { ok: true } | { ok: false; reason: PickRefusal } => {
  const opened = openMenu(play, groupId);
  if (!opened.ok) return opened;
  if (!opened.entries.some((entry) => entry.id === "quest"))
    return { ok: false, reason: "not-offered" };
  const store = ensurePicks(play);
  if (store.giveBack[groupId]) return { ok: false, reason: "give-back-first" };
  if ((store.moves[groupId] ?? 0) < QUEST_MOVES) return { ok: false, reason: "no-moves" };
  return { ok: true };
};

/** The quest pick took hold: its move is spent. */
export const spendQuestMove = (play: PlayState, groupId: string): void => {
  const store = ensurePicks(play);
  store.moves[groupId] = (store.moves[groupId] ?? 0) - QUEST_MOVES;
};

/** One pick. Costs the tuning's moves and gold; Leave is never a pick and is free. */
export const applyPick = (
  play: PlayState,
  seed: string,
  groupId: string,
  kind: PickKind,
  options: { heroId?: string; corruptionId?: string; gold?: HeroGold; count?: number } = {},
): PickResult => {
  // A rest is one pick for `count` moves, +3 hit points a move (MEC-075); no other pick repeats.
  const count = kind === "rest" ? Math.max(1, Math.floor(options.count ?? 1)) : 1;
  const gate = pickGate(play, groupId, kind, count);
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
  if (kind === "cleanse" && (ensureClock(play).skulls[spaceId] ?? 0) < 1)
    return { ok: false, reason: "no-target" };
  if (kind === "cleanse" && cleanseBlocked(play, groupId, ensureClock(play).skulls[spaceId] ?? 0))
    return { ok: false, reason: "feverish" };
  const price = pickPrice(play, groupId, kind, heroId);
  // The pool pays (DEC-911): affordable means every seated hero's gold together.
  if ((store.purse[groupId] ?? 0) < price) return { ok: false, reason: "no-gold" };

  const clock = ensureClock(play);
  if (kind === "cure") {
    const sheet = heroSheet(clock, heroId as string);
    if (sheet.corruptions < 1) return { ok: false, reason: "no-target" };
    removeCorruption(play, heroId as string, store.tuning.cure.corruption, options.corruptionId);
    if (price === 0) store.freeCures.push(freeKey(store.chapter, heroId as string));
  } else if (kind === "rally") {
    const hp = store.hp[heroId as string];
    if (hp) hp.hp = hp.max;
  } else if (kind === "rest") {
    const hp = store.hp[heroId as string];
    if (hp) hp.hp = Math.min(hp.max, hp.hp + store.tuning.restHitPoints * count);
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

  spendGold(play, groupId, price);
  store.moves[groupId] = (store.moves[groupId] ?? 0) - movesCost(store, kind) * count;
  const event: PickEvent = {
    kind,
    groupId,
    chapter: store.chapter,
    gold: price,
    ...(heroId ? { heroId } : {}),
    ...(kind === "rest" ? { moves: count } : {}),
    ...(kind === "cure" && options.corruptionId ? { corruptionId: options.corruptionId } : {}),
    ...(kind === "virtue-draw" ? { tile: store.tiles[groupId]?.at(-1) } : {}),
    ...(kind === "cure" ? { free: price === 0 } : {}),
  };
  store.log.push(event);
  // Order (EV-12): pay, pick-triggered losses, Uncertain ends the turn, turn-end losses.
  // DEC-896: the price is paid first (in DEC-911's order), then each loss comes off its holder alone.
  settleGold(play, groupId);
  const gold = options.gold ?? ownGold(play, groupId);
  applyPickLosses(play, groupId, play.content.board.spaceById.get(group.spaceId)?.building, gold);
  if (endsTurnAfterPick(play, groupId)) {
    store.moves[groupId] = 0;
    endGroupTurn(play, groupId, gold);
  }
  return { ok: true, event };
};

/** A new turn for the group: the ended flag clears (called when the group's turn starts). */
export const beginGroupTurn = (play: PlayState, groupId: string): void => {
  const store = ensurePicks(play);
  store.turnEnded = { ...store.turnEnded, [groupId]: false };
};

export const turnHasEnded = (play: PlayState, groupId: string): boolean =>
  ensurePicks(play).turnEnded?.[groupId] === true;

/** The group's turn ends once: turn-end losses fire here and never twice (DEC-472, DEC-473). */
export const endGroupTurn = (play: PlayState, groupId: string, gold?: HeroGold): void => {
  const store = ensurePicks(play);
  if (turnHasEnded(play, groupId)) return;
  store.turnEnded = { ...store.turnEnded, [groupId]: true };
  applyTurnEndLosses(play, groupId, gold ?? ownGold(play, groupId));
};

/** A quest done or left ends the group's turn, the way Uncertain's pick does (DEC-821, DEC-948). */
export const endTurnAfterQuest = (play: PlayState, groupId: string): void => {
  ensurePicks(play).moves[groupId] = 0;
  // The gold the quest paid or won reaches the sheets before a turn-end loss reads them (DEC-896).
  settleGold(play, groupId);
  endGroupTurn(play, groupId);
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

/*
 * The live bridge (C3/13). In a running game a hero's gold and hit points live on the day clock's
 * sheets and the moves live on the group's turn; the picks store above is the model the rules read.
 * `loadLive` fills the store from the live state before a menu is read or a pick is made, and
 * `commitLive` writes what the pick changed back. A value the sheet does not know stays unknown:
 * a hero with no gold sheet adds nothing to the purse, and a hero with no hit points is no target.
 */

/** The purse of a group: the gold its heroes carry, each as the sheet states it. */
export const livePurse = (play: PlayState, groupId: string): number => {
  const group = groupById(play, groupId);
  if (!group) return 0;
  const clock = ensureClock(play);
  return group.heroIds.reduce((sum, id) => sum + (heroSheet(clock, id).gold ?? 0), 0);
};

/** True when at least one hero of the group has a gold figure. A group with none has no known purse. */
export const purseKnown = (play: PlayState, groupId: string): boolean => {
  const group = groupById(play, groupId);
  const clock = ensureClock(play);
  return Boolean(group?.heroIds.some((id) => heroSheet(clock, id).gold !== undefined));
};

export const loadLive = (play: PlayState, groupId: string, movesLeft: number): void => {
  const store = ensurePicks(play);
  const group = groupById(play, groupId);
  const clock = ensureClock(play);
  // The pool: every seated hero's gold across all groups (D5, DEC-911).
  store.purse[groupId] = poolGold(play);
  store.owed = { ...store.owed, [groupId]: 0 };
  store.gained = { ...store.gained, [groupId]: 0 };
  store.moves[groupId] = movesLeft;
  for (const heroId of group?.heroIds ?? []) {
    const hp = heroSheet(clock, heroId).hp;
    if (hp) store.hp[heroId] = { hp: hp.hp, max: hp.max };
    else delete store.hp[heroId];
  }
};

/** True when any seated hero has a gold figure: the sheets, not a test's hand-set purse, hold the gold. */
const sheetsHoldGold = (play: PlayState): boolean => Object.keys(sheetGoldMap(play)).length > 0;

/** A priced choice takes `amount` from the pool. `settleGold` writes it to the sheets. */
export const spendGold = (play: PlayState, groupId: string, amount: number): void => {
  if (amount <= 0) return;
  const store = ensurePicks(play);
  store.purse[groupId] = (store.purse[groupId] ?? 0) - amount;
  store.owed = { ...store.owed, [groupId]: (store.owed?.[groupId] ?? 0) + amount };
};

/** A gain for the heroes present (DEC-178). `settleGold` writes it to the sheets. */
export const earnGold = (play: PlayState, groupId: string, amount: number): void => {
  if (amount <= 0) return;
  const store = ensurePicks(play);
  store.purse[groupId] = (store.purse[groupId] ?? 0) + amount;
  store.gained = { ...store.gained, [groupId]: (store.gained?.[groupId] ?? 0) + amount };
};

/** The gold the heroes present hold now, counting what the pending choices have not yet written. */
export const presentGold = (play: PlayState, groupId: string): number => {
  const store = ensurePicks(play);
  if (!sheetsHoldGold(play)) return store.purse[groupId] ?? 0;
  const pending = (store.purse[groupId] ?? 0) - poolGold(play);
  return Math.max(0, livePurse(play, groupId) + pending);
};

/**
 * Writes the pending gold to the sheets: what the choices owe is paid in DEC-911's order (the heroes
 * present first, then those elsewhere); what they gained goes to the heroes present, each odd coin to
 * a hero holding least (DEC-646). Any other change to the pool since `loadLive` settles the same way.
 * With no gold on any sheet (a test that set the purse by hand) there is nothing to write.
 */
export const settleGold = (play: PlayState, groupId: string): void => {
  const store = ensurePicks(play);
  let owed = store.owed?.[groupId] ?? 0;
  let gained = store.gained?.[groupId] ?? 0;
  store.owed = { ...store.owed, [groupId]: 0 };
  store.gained = { ...store.gained, [groupId]: 0 };
  if (!sheetsHoldGold(play)) return;
  const stray = poolGold(play) - owed + gained - (store.purse[groupId] ?? 0);
  if (stray > 0) owed += stray;
  else gained -= stray;
  const unpaid = payFromSheets(play, groupId, owed);
  if (unpaid > 0) throw new Error(`The pool is ${unpaid} gold short of what the choice cost.`);
  gainOnSheets(play, groupId, gained);
};

/** Each hero's own gold: where the losses that are never covered come from (DEC-896). */
const ownGold = (play: PlayState, groupId: string): HeroGold => {
  const store = ensurePicks(play);
  if (!sheetsHoldGold(play)) return groupPurseGold(store.purse, groupId);
  return sheetHeroGold(play, (taken) => {
    store.purse[groupId] = (store.purse[groupId] ?? 0) - taken;
  });
};

/** Writes the store's gold and hit points back to the sheets and returns the moves left. */
export const commitLive = (play: PlayState, groupId: string): number => {
  const store = ensurePicks(play);
  const group = groupById(play, groupId);
  const clock = ensureClock(play);
  if (group) {
    settleGold(play, groupId);
    for (const heroId of group.heroIds) {
      const hp = store.hp[heroId];
      if (!hp) continue;
      setHeroSheet(play, heroId, { ...heroSheet(clock, heroId), hp: { hp: hp.hp, max: hp.max } });
    }
  }
  return store.moves[groupId] ?? 0;
};

/** Heroes of the group a Rally or Rest can help: those whose hit points are known. */
export const healTargets = (play: PlayState, groupId: string): string[] => {
  const clock = ensureClock(play);
  return (groupById(play, groupId)?.heroIds ?? []).filter((id) => heroSheet(clock, id).hp);
};

/** Heroes a Cure can help: those holding at least one corruption (Q-C3-20). */
export const cureTargets = (play: PlayState, groupId: string): string[] => {
  const clock = ensureClock(play);
  return (groupById(play, groupId)?.heroIds ?? []).filter(
    (id) => heroSheet(clock, id).corruptions > 0,
  );
};

/** A copy of the picks store for a checkpoint. */
export const picksSaved = (play: PlayState): PicksStore => structuredClone(ensurePicks(play));

/** Puts a saved picks store back on the play a Continue rebuilt. */
export const restorePicksStore = (play: PlayState, saved: PicksStore): void => {
  if (typeof saved !== "object" || saved === null || !Array.isArray(saved.log)) {
    throw new Error("The checkpoint's building picks are not readable.");
  }
  stores.set(play, structuredClone(saved));
};
