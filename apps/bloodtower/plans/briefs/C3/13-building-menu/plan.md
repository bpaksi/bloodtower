Keep this a checklist; do not write a second design doc.

# Brief: C3 / 13-building-menu — The building menu on the iPad: rally, cure, rest, virtue draw, Cleanse

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 13-building-menu
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, UI-043, MEC-036
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet: the screen changes, see ./screen-spec.md. Illusionist draws ./mockup.html from it before Bob approves the evals
- Risk: Med
- Depends on: C3 feature 06 merged, C3 feature 08 merged, C2 feature 06 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/device/PlaceMenu*.tsx`, `apps/bloodtower/src/web/components/board/**` (place painting and results), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-building.spec.ts`
- Builds: UI-043
- Deps change: no
- Runs: cloud

## What it does

UI-043 on the iPad: each pick with its move and gold cost, the quest marker first (UI-043, DEC-630, DEC-083), unaffordable picks disabled; the board shows the place's painting and each result. Corruption cures show which corruption goes.

Each building shows its own offers plus Leave, and no Trade (Bob approved 2026-10-31): citadel: Rally (5 gold + 1 move), Virtue draw (10 gold + 1 move) or Cleanse (1 move, 0 gold, Bob approved 2026-10-31); sanctuary: Cure (10 gold + 1 move, first one free each chapter) or Cleanse; village: tavern Rest (+3 hit points per move; Bob approved 2026-10-31) or Cleanse; bazaar: Cleanse only (Bob approved 2026-10-31).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The gear Menu and any gear panel come back closed, the game not paused, the toolbar on every iPad, and item states recomputed (EV-19).
  - A restart or a Continue on the give-back (`#s=8`) brings back the same 5 tiles with no redraw; the 10 gold and 1 move are spent exactly once; the group holds 4 after the pick (EV-20).
  - After Continue at a building, the menu shows the same picks and prices (the free cure state included).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-20 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] UI-043: closed before coding (`decided`).
- [ ] MEC-036: closed before coding (`decided`).
- [ ] DEC-078: closed before coding (`decided`).
- [ ] DEC-083: closed before coding (`decided`).
- [ ] DEC-093: closed before coding (`decided`).
- [ ] DEC-158: closed before coding (`decided`).
- [ ] DEC-170: closed before coding (`decided`).
- [ ] DEC-174: closed before coding (`decided`).
- [ ] DEC-377: closed before coding (`decided`).
- [ ] DEC-544: closed before coding (`decided`).
- [ ] DEC-681: closed before coding (`decided`).
- [ ] DEC-700: closed before coding (`decided`).

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-12. Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `menu.title` | {Building name} | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31); the building's own name, e.g. Citadel, Sanctuary, Village, Bazaar |
| 2 | `menu.prompt` | What will you do here? | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 3 | `quest.marker` | ! | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (the quest marker, first in the list, DEC-630) |
| 4 | `offer.rally` | Rally | screen-spec (Bob approved 2026-10-31) (citadel) |
| 5 | `offer.rally.cost` | 5 gold · 1 move · heals to full | screen-spec (Bob approved 2026-10-31) (DEC-158) |
| 6 | `offer.virtue` | Virtue | screen-spec (Bob approved 2026-10-31) (citadel) |
| 7 | `offer.virtue.cost` | 10 gold · 1 move | screen-spec (Bob approved 2026-10-31) (DEC-544) |
| 8 | `offer.cure` | Cure | screen-spec (Bob approved 2026-10-31) (sanctuary) |
| 9 | `offer.cure.cost` | 10 gold · 1 move · first free per hero each chapter | screen-spec (Bob approved 2026-10-31) (DEC-170, DEC-700) |
| 10 | `offer.rest` | Rest | screen-spec (Bob approved 2026-10-31) (village tavern, MEC-075) |
| 11 | `offer.rest.cost` | tavern · +3 HP per move | screen-spec (Bob approved 2026-10-31) |
| 12 | `offer.cleanse` | Cleanse | screen-spec (Bob approved 2026-10-31) (any building, DEC-377) |
| 13 | `offer.cleanse.cost` | 1 move, no gold | screen-spec (Bob approved 2026-10-31) |
| 14 | `button.leave` | Leave | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 15 | `rally.result` | Warriors join your ranks: +{N}. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 16 | `cure.pick` | Who does this? | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (hero pick for a cure) |
| 17 | `cure.corruption` | {corruption} | one button per corruption the hero holds (Q-C3-20); the corruption's name |
| 18 | `button.next` | Next | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (after a pick that needs a confirm) |
| 19 | `cure.result` | The corruption is lifted. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 20 | `rest.prompt` | How many spaces will you move? | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 21 | `rest.moves` | 1 2 3 | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (one button per move that can be spent) |
| 22 | `rest.result` | You rest and recover. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 23 | `virtue.result` | You gain a virtue: {virtue}. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 24 | `virtue.give-back` | You can hold four virtues. Give one back. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) (DEC-544) |
| 25 | `virtue.tile` | Tile {N} | screen-spec ("Tile 1" … "Tile 5 (new)"); the fifth reads "Tile 5 (new)" |
| 26 | `cleanse.result` | The skulls are cleared from this building. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 27 | `cleanse.badge` | −1 skull · +1 day | screen-spec ("−1 skull", "+1 day") |
| 28 | `building.fallen` | This building has fallen. No one can enter. | new - Loremaster; first drawn in mockup.html (Loremaster copy, 2026-10-31) |
| 29 | `tick.auto` | Moves on by itself. | locked 2026-10-31 (Loremaster) |
| 30 | `toolbar.help` | ? | C2 feature 04 (Bob 2026-10-31 10:37); aria-label "Help" |
| 31 | `toolbar.menu` | (gear icon, aria-label "Menu") | C2 feature 04; icon, no visible text |
| 32 | `help.title` | Help | C2 feature 04 |
| 33 | `help.building-menu` | Choose what to do in this building, or Leave. | locked 2026-10-31 (Loremaster); same text in screen-spec |
| 34 | `help.close` | Close | C2 feature 04 |

## OPEN questions

- ANSWERED building menus (Bob approved 2026-10-31): citadel: Rally (5 gold + 1 move), Virtue draw (10 gold + 1 move) or Cleanse; sanctuary: Cure (10 gold + 1 move, first one free each chapter) or Cleanse; village: tavern Rest (+3 hit points per move; Bob approved 2026-10-31) or Cleanse; bazaar: Cleanse only (Bob approved 2026-10-31).

- ANSWERED Q-C3-13 (Bob approved 2026-10-31): potion and audience are out of 1.0; citadel Rally (5 gold + 1 move, heals to full), Virtue draw (10 gold + 1 move) or Cleanse; sanctuary cure (10 gold + 1 move, first free per hero each chapter) or Cleanse. Was:, Q-C3-14 (1.0 picks per building kind)
- ANSWERED Q-C3-20 (Bob approved 2026-10-31): the hero picks which corruption a cure removes.

## Eval approval

- See ./approval.md (must be filled before coding).
