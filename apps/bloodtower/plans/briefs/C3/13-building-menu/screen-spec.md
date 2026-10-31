# Screen spec: C3 / 13-building-menu — The building menu on the iPad: rally, cure, rest, virtue draw, Cleanse

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: UI-043, UI-024, MEC-036, DEC-078, DEC-083, DEC-093, DEC-158, DEC-170, DEC-174, DEC-377, DEC-544, DEC-681, DEC-700
- Viewports: Story board 1920×1080 (Samsung TV), iPad 768×1024 portrait (locked by Bob)
- Rules for every screen: the board is display only and never scrolls or clips (SCR-013); iPads carry choices and taps only, and every story line shows on the board (SCR-014, DEC-057); one step, one primary button on the iPad (SCR-016); the bottom toolbar on every iPad state, "?" help at the left and the gear (Menu) at the right (C2 feature 04; Bob 2026-10-31 10:37/10:38); the happy path never needs the gear. Help text (Loremaster 2026-10-31): "Choose what to do in this building, or Leave.". Story copy stays `[COPY: ...]`.

## Purpose

Let a group spend moves and gold at a building (MEC-036).

## States

- **Menu** (UI-043): Each building shows its own offers plus Leave, and no Trade (Bob approved 2026-10-31): citadel: Rally (5 gold + 1 move), Virtue draw (10 gold + 1 move) or Cleanse; sanctuary: Cure (10 gold + 1 move, first one free each chapter) or Cleanse; village: tavern Rest (+3 hit points per move; Bob approved 2026-10-31) or Cleanse; bazaar: Cleanse only (Bob approved 2026-10-31). Picks with move and gold cost, quest marker first, disabled when unaffordable, shrunk by skulls.
- **Rally** (DEC-158): heals to full; the result on the board. No Next; it auto-advances when its narration or cue ends (4 s ±200 ms with no audio; Bob 2026-10-31 10:38 AM ET).
- **Cure** (DEC-170, DEC-700): pick the hero, the corruption goes; free or priced.
- **Rest** (MEC-075): the village's tavern rest (Bob approved 2026-10-31); pick moves; +3 hit points per move.
- **Virtue draw** (DEC-544; mockup `#s=7`): the tile on a Reveal. The Reveal has no Next; when the group then holds 4 or fewer tiles it auto-advances when its narration or cue ends (4 s ±200 ms with no audio; Bob 2026-10-31 10:38 AM ET); when it holds a fifth, it goes to the give-back step.
- **Virtue give-back** (DEC-544; mockup `#s=8`): its own step after the Reveal when the group holds 5 tiles. The iPad shows one button per tile held ("Tile 1" … "Tile 5 (new)"); a button choice that waits for the press and never auto-advances; after the press the group holds 4 and the screen returns to the menu.
- **Cleanse** (DEC-377; mockup `#s=9`): 1 move, 0 gold (Bob approved 2026-10-31); −1 skull, "+1 day". Its row reads "1 move" with no gold. The result has no Next; it auto-advances when its narration or cue ends (4 s ±200 ms with no audio; Bob 2026-10-31 10:38 AM ET).
- **No Trade**: no Trade, shop or NPC pick at any building (DEC-502).
- **Fallen building** (mockup `#s=10`): not enterable.

## Player actions

- iPad: pick, Leave; for cure, the hero and, when the hero holds several, the hero picks which corruption goes (Bob approved 2026-10-31); for rest, the number of moves; for draw, at the give-back step, which tile to give back (one button per tile).

## Mechanics behind it

UI-043 on the iPad: each pick with its move and gold cost, the quest marker first (UI-024, DEC-083), unaffordable picks disabled; the board shows the place's painting and each result. Corruption cures show which corruption goes.

## What happens next

Back to the menu for the next pick, or the move map (UI-023) on Leave or no moves left (MEC-036 .15).

## OPEN questions

- ANSWERED building menus (Bob approved 2026-10-31): citadel: Rally (5 gold + 1 move), Virtue draw (10 gold + 1 move) or Cleanse; sanctuary: Cure (10 gold + 1 move, first one free each chapter) or Cleanse; village: tavern Rest (+3 hit points per move; Bob approved 2026-10-31) or Cleanse; bazaar: Cleanse only (Bob approved 2026-10-31).

- ANSWERED Q-C3-13 (Bob approved 2026-10-31): potion and audience are out of 1.0; citadel Rally (5 gold + 1 move, heals to full), Virtue draw (10 gold + 1 move) or Cleanse; sanctuary cure (10 gold + 1 move, first free per hero each chapter) or Cleanse. Was:, Q-C3-14 (1.0 picks per building kind)
- ANSWERED Q-C3-20 (Bob approved 2026-10-31): the hero picks which corruption a cure removes.
