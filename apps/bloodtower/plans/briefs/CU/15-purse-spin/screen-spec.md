# Screen spec: CU / 07-virtue-items-chance-panels — Virtue panel, party items panel, game of chance

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: UI-037, UI-013, UI-045, UI-038 (retired), DEC-408, DEC-479, DEC-481, DEC-114, DEC-196, DEC-278, PT-13
- Viewports: Story board 1920x1080 (Samsung TV), iPad 768x1024 portrait (locked by Bob)
- Rules: the board is display only and never scrolls or clips (SCR-013); iPads carry choices and taps only (DEC-278); one step, one primary button (SCR-016); the toolbar on every iPad state ("?" left, Back and Replay centre, gear right); the happy path never needs the gear; unknown values are shown as unavailable, never as zero.

## Purpose

Show the group's virtues at turn start, let the table see what the party carries, and run the game of chance for the starting purse.

## States

- **Turn start, virtues fire** (UI-037): after the whose-turn banner, a board panel lists the group's virtues and what each does now. Automatic; no press; play does not wait (DEC-479). Skipped when no virtue applies.
- **Turn start, a virtue asks a choice:** the board names the virtue; the iPad shows the choice as a list of buttons.
- **Party items panel** (UI-013): opened from the gear item "Use a potion or item" ("Current party" keeps HP, gold and the item count); the board shows each hero's items, display only; the game pauses while it is open, resumes on Done (C2 feature 04 rules). With nothing held the panel's reason line reads the locked "No potions or items to use.".
- **Game of chance** (UI-045): the iPad shows Spin; on press the tower lights chase and stop (with a tower) and the board shows the result as it lands; the result is the purse. Without a tower: the result shows at once on the board and the coin sound plays on the board speakers (no chase).

## Player actions

- iPad: the choice buttons of a virtue that asks (built generic, tested with Infused, which asks a building); Spin; the gear's items flow (pick a hero, then an item, Done), which the host can also drive.
- No use icon on the iPad (UI-038 retired).

## What happens next

Turn start moves to the move map; the spin moves to the next setup step.

## OPEN questions

- None. Rulings Q7.1 to Q7.4 (Bob, 2026-11-14, adopted) are in plan.md; Gamewright confirms the 1.0 deck's choice-asking virtues.
