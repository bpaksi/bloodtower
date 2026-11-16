import type { PlayState } from "../../loops/chapter/playState.ts";
import { ensureClock, heroSheet, setHeroSheet } from "../../loops/day/clock.ts";

/*
 * Items (CU/13, UI-013, Q7.2). A hero holds item ids; the potion is the 1.0 fixture. One rule
 * uses an item: the gear's use-item flow calls it, and the host's action is the same call, so there
 * is no second code path (EV-17). Nothing here reads the table or the tower.
 */

export const POTION = "potion";

/** Item ids and their names. An id with no name here is shown as unavailable, never as blank. */
export const ITEM_NAMES: Readonly<Record<string, string>> = {
  [POTION]: "Healing potion",
};

export const itemName = (id: string): string | null => ITEM_NAMES[id] ?? null;

export type UseRefusal =
  | { reason: "not-acting"; heroId: string }
  | { reason: "no-hero"; heroId: string }
  | { reason: "not-held"; heroId: string; itemId: string }
  | { reason: "unknown-item"; itemId: string }
  | { reason: "hp-unknown"; heroId: string };

export type UseResult = { ok: true; hp: number } | ({ ok: false } & UseRefusal);

/** Every item the hero holds, in the order they were gained. */
export const heldItems = (play: PlayState, heroId: string): string[] => [
  ...(heroSheet(ensureClock(play), heroId).items ?? []),
];

/** True when any hero in the play holds an item the rule can use. */
export const anyItemHeld = (play: PlayState): boolean =>
  play.groups.some((group) => group.heroIds.some((id) => heldItems(play, id).length > 0));

/**
 * Uses one `itemId` the hero holds. Only a hero of the acting group may use an item (EV-20), and
 * a potion needs the hero's hit points to be known. A refusal changes nothing. Hit points rise by
 * `potionHitPoints` and stop at the hero's maximum.
 */
export const useItem = (
  play: PlayState,
  actingGroupId: string | null,
  heroId: string,
  itemId: string,
): UseResult => {
  const group = play.groups.find((row) => row.heroIds.includes(heroId));
  if (!group) return { ok: false, reason: "no-hero", heroId };
  if (actingGroupId !== group.id) {
    return { ok: false, reason: "not-acting", heroId };
  }
  if (itemId !== POTION) return { ok: false, reason: "unknown-item", itemId };
  const clock = ensureClock(play);
  const sheet = heroSheet(clock, heroId);
  const held = sheet.items ?? [];
  const at = held.indexOf(itemId);
  if (at < 0) return { ok: false, reason: "not-held", heroId, itemId };
  if (!sheet.hp) return { ok: false, reason: "hp-unknown", heroId };
  const hp = Math.min(sheet.hp.max, sheet.hp.hp + clock.tuning.potionHitPoints);
  setHeroSheet(play, heroId, {
    ...sheet,
    hp: { hp, max: sheet.hp.max },
    items: held.filter((_, index) => index !== at),
  });
  return { ok: true, hp };
};

/** The words for a refusal: the log line, the toast and the iPad's message (EV-20). */
export const refusalMessage = (
  refusal: UseRefusal,
  heroName: (heroId: string) => string,
): string => {
  switch (refusal.reason) {
    case "not-acting":
      return `${heroName(refusal.heroId)} is not in the group that is acting, so cannot use an item now.`;
    case "no-hero":
      return `There is no hero "${refusal.heroId}" to use an item.`;
    case "not-held":
      return `${heroName(refusal.heroId)} does not hold "${refusal.itemId}".`;
    case "unknown-item":
      return `"${refusal.itemId}" is not an item that can be used.`;
    case "hp-unknown":
      return `${heroName(refusal.heroId)}'s hit points are not known, so a potion cannot be used.`;
  }
};
