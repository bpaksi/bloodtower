Keep this a checklist; do not write a second design doc.

# Brief: CU / 13-items-panel-and-use-item — The party items panel and use-item flow (54a)

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (step 54a, part of #480; split from CU/07 on 2026-11-15, Bob, chat: "Split into 54a, 54b, 54c")
- Feature: 13-items-panel-and-use-item
- Kind: screen
- Owner: Gamewright (brief, evals); a Wright developer (build); Illusionist replaces the mockup
- Related AREA/docs: PT-13 in [the playtest](../../../../../../research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md); [design-freeze.md](../../../catchup/design-freeze.md) section H; UI-037, UI-013, UI-045, UI-038 (retired), DEC-408, DEC-479, DEC-481, DEC-114, DEC-196 (AREA-069, AREA-050, AREA-095, AREA-078)
- Evals: ./eval.md
- Screen spec: ./screen-spec.md (CU/07's, whole; only the states named in "What it does" belong to this part)
- Mockup: ./mockup.html (CU/07's draft, whole; only this part's sections belong to it)
- Risk: Med
- Depends on: its approval.md on main; C3 05 (merged); steps 43 (#469), 44 (#470), 45 (#471); CU/04 (merged: the host split action)
- Touches: `apps/bloodtower/src/web/components/board/PartyItemsPanel.tsx` (new), `apps/bloodtower/src/web/components/board/GearBoardPanel.tsx`, `apps/bloodtower/src/web/components/device/gearMenu.ts`, `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx` (the pick-hero, pick-item and Done flow only), `apps/bloodtower/src/protocols/v2/views.ts` (the items panel id and each hero's items on the gear view), `apps/bloodtower/src/engine/loops/session/gear.ts`, `apps/bloodtower/src/engine/loops/session/view.ts` (the gear snapshot: HP, gold and items), `apps/bloodtower/src/engine/loops/session/state.ts` and `apps/bloodtower/src/server/core/serialize.ts` (held items survive Continue), `apps/bloodtower/src/engine/rules/items/**` (new: the item and potion rule, reads `day.potion_hit_points`), `apps/bloodtower/src/engine/loops/day/**` (the use-item act only), `apps/bloodtower/src/engine/views/**`, the host-side action path that drives the use-item flow in the test story (`apps/bloodtower/src/server/core/session.ts`; the developer confirms the file; no new package), the narrow items seed, `apps/bloodtower/src/e2e/tests/c3-panels.spec.ts` (new; the items cases), `apps/bloodtower/src/e2e/tests/c3-day.spec.ts` (the `fixme` on the use-item half of EV-15 and EV-16 removed; their split half is built by CU/04)
- Builds: UI-013 (the party items panel); the use-item flow and the host use-item action behind the gear item "Use a potion or item" (Q7.2, Q7.3); the potion fixture; a narrow test-only items seed (which hero holds which item at game start)
- Deps change: no
- Runs: cloud
- Order: first of the three: step 12 (C3/20) depends on it

## What it does

The gear keeps the single route to using an item (Bob's gear rule). This part builds:

- UI-013, the party items panel (DEC-196, Q7.3): an on-demand board panel of what the party carries, opened from the gear item "Use a potion or item". "Current party" keeps its HP, gold and item count. Display only on the board; choices on the iPad.
- The use-item flow (pick a hero, then an item, Done) and the host's use-item action, behind the existing gear item, so the gear stays the single route (Q7.2). Only the acting group's heroes may use an item (EV-20).
- UI-038 (the iPad "use" icon) is not built.

What main has today: no item model. `gearSnapshot` returns the string "unavailable" for every hero's HP, gold and items (`engine/loops/session/view.ts`); the gear row "Use a potion or item" is greyed with the reason "C3+" (`gearMenu.ts`); `potion_hit_points: 4` is in `packs/base/tuning.yaml` and nothing reads it; C3-11's use-item evals are `fixme` (`c3-day.spec.ts`).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The Menu and the items panel closed, the game not paused, the toolbar on every iPad, item states recomputed (as C2 feature 04).
  - Held items and each hero's HP: an item used before the restart stays used; one not used is still held (a replay never uses a potion twice).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-05, EV-06, EV-07, EV-13 (item name), EV-17, EV-18, EV-19, EV-20 and the items part of EV-12 pass (verifier table on PR).
- Not required: the virtue panel and choice list (54b, CU/14); the spin and the purse (54c, CU/15); the round picker's Spend and Drink (C4 10); a use button or icon (UI-038); the general test seed hook and the day-loop effects wait (queue step 12, #441).

## AREA / DEC checklist

- [ ] PT-13 ruling recorded as a DEC by step 43 (#469); UI-038 retired by step 43; UI-013 and DEC-196 `decided`; Rulings Q7.2 and Q7.3 in the step-43 DEC; all closed before coding.

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-15 (step 45, #471). Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 4 | `items.title` | What the party carries | UI-013 ("What the party carries"); Loremaster confirms |
| 5 | `items.empty` | No potions or items to use. | locked 2026-10-31 (Loremaster), the gear reason line in C3 11 |
| 6 | `items.row` | {hero}: {item} | mockup.html layout (Gamewright draft); one row per held item, one hero name per row |
| 6a | `items.row.empty` | {hero}: No potions or items to use. | new - Loremaster. A hero who holds nothing: the locked line of row 5 after the hero's name (mockup, Hero C) |
| 6b | `items.paused` | Game paused. | C2 feature 04 mockup (a panel open pauses the game); unchanged |

## Rulings (Bob, 2026-11-14, adopted)
 (Bob, 2026-11-14, adopted)

- Q7.1 Bob, 2026-11-14, adopted: build the virtue choice list generic; test it with Infused (DEC-406, asks for a building). Gamewright, 2026-11-15 (DEC-934): the 1.0 deck is the 8 pool tiles (DEC-581) and Infused is the only turn-start choice; the list stays generic.
- Q7.2 Bob, 2026-11-14, adopted: the use-item host action is built here, behind the existing gear item "Use a potion or item". The host Split goes to CU/04. Queue step 12 (#441) shrinks to the day-loop effects wait and the test seed hook (see catchup/README.md row 12).
- Q7.3 Bob, 2026-11-14, adopted: UI-013 opens from "Use a potion or item"; "Current party" keeps HP, gold and the item count.
- Q7.4 Bob, 2026-11-14, adopted: with no tower the spin shows the result at once on the board and plays the coin sound on the board speakers (DEC-201, DEC-903). With the tower the chase command is sent only on the press.

## Eval approval

- See ./approval.md (must be filled before coding; it is PENDING until Bob dates a row).
