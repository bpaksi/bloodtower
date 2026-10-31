# Screen spec: C3 / 13-building-menu — The building menu on the iPad: rally, cure, rest, virtue draw, Cleanse

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: UI-043, UI-024, MEC-036, DEC-078, DEC-083, DEC-093, DEC-158, DEC-170, DEC-174, DEC-377, DEC-544, DEC-681, DEC-700
- Viewports: Story board 1920×1080 (Samsung TV), iPad 1024×768
- Rules for every screen: the board is display only and never scrolls or clips (SCR-013); iPads carry choices and taps only, and every story line shows on the board (SCR-014, DEC-057); one step, one primary button on the iPad (SCR-016); Menu on every device (UI-018). Story copy stays `[COPY: ...]`.

## Purpose

Let a group spend moves and gold at a building (MEC-036).

## States

- **Menu** (UI-043): picks with move and gold cost, quest marker first, disabled when unaffordable, shrunk by skulls.
- **Rally** (DEC-158): heals to full; the result on the board.
- **Cure** (DEC-170, DEC-700): pick the hero, the corruption goes; free or priced.
- **Rest** (MEC-075): pick moves; hit points per move.
- **Virtue draw** (DEC-544): the tile on a Reveal; a fifth means giving one back.
- **Cleanse** (DEC-377): −1 skull, "+1 day".
- **Fallen building**: not enterable.

## Player actions

- iPad: pick, Leave; for cure, the hero (and the corruption, OPEN Q-C3-20); for rest, the number of moves; for draw, which tile to give back.

## Mechanics behind it

UI-043 on the iPad: each pick with its move and gold cost, the quest marker first (UI-024, DEC-083), unaffordable picks disabled; the board shows the place's painting and each result. Corruption cures show which corruption goes.

## What happens next

Back to the menu for the next pick, or the move map (UI-023) on Leave or no moves left (MEC-036 .15).

## OPEN questions

- Q-C3-13, Q-C3-14 (1.0 picks per building kind)
- Q-C3-20: when a hero holds several corruptions, who picks which the cure removes: the hero, the group, or the oldest first?
