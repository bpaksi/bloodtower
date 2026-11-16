"use client";

import type { GearView } from "bloodtower-protocols";

/** Copy `items.title` (UI-013, Loremaster, step 45). */
export const ITEMS_TITLE = "What the party carries";
/** Copy `items.empty`, locked 2026-10-31: also the line after a hero who holds nothing (`items.row.empty`). */
export const ITEMS_EMPTY = "No potions or items to use.";

export type ItemRow = {
  key: string;
  heroId: string;
  /** The item's id; null for a hero who holds nothing. */
  itemId: string | null;
  text: string;
};

/**
 * One row per held item, "{hero}: {item}" (copy `items.row`); a hero who holds nothing gets
 * "{hero}: No potions or items to use." (copy `items.row.empty`). A name the game does not know
 * reads "unavailable", never blank or 0 (EV-13).
 */
export const itemRows = (party: GearView["party"]): ItemRow[] =>
  party.flatMap((hero): ItemRow[] => {
    const held = hero.heldItems ?? [];
    if (held.length === 0) {
      return [
        {
          key: `${hero.id}-none`,
          heroId: hero.id,
          itemId: null,
          text: `${hero.name}: ${ITEMS_EMPTY}`,
        },
      ];
    }
    return held.map((item, index) => ({
      key: `${hero.id}-${item.id}-${index}`,
      heroId: hero.id,
      itemId: item.id,
      text: `${hero.name}: ${item.name.length > 0 ? item.name : "unavailable"}`,
    }));
  });

/**
 * UI-013: what the party carries. Display only; the choices are on the iPad (DEC-278). The panel
 * frame (title, "Game paused.") is the gear board panel's.
 */
export function PartyItemsPanel({ party }: { party: GearView["party"] }) {
  return (
    <ul data-items-list>
      {itemRows(party).map((row) => (
        <li
          key={row.key}
          data-hero={row.heroId}
          data-item={row.itemId ?? undefined}
          data-empty={row.itemId === null ? "" : undefined}
        >
          {row.text}
        </li>
      ))}
    </ul>
  );
}
