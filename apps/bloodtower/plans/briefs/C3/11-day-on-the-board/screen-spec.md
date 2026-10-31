# Screen spec: C3 / 11-day-on-the-board — The day on the board: day roll, days left, threat bar, effects panel

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: SCR-014, UI-021, UI-022, UI-028, UI-030, UI-047, DEC-686, DEC-699, DEC-115, DEC-640, DEC-092, DEC-093
- Viewports: Story board 1920×1080 (Samsung TV), iPad 768×1024 portrait (locked by Bob)
- Rules for every screen: the board is display only and never scrolls or clips (SCR-013); iPads carry choices and taps only, and every story line shows on the board (SCR-014, DEC-057); one step, one primary button on the iPad (SCR-016); Menu on every device (UI-018). Story copy stays `[COPY: ...]`.

## Purpose

Show the day as the game's clock: what the moves are, how many days are left, and what the night did, so the table feels the skull pressure (DEC-686).

## States

- **Day start, Regroup** (DEC-640): board shows the groups and "A new day. Stay together, or split up?"; iPads offer split / join.
- **Day roll** (UI-021): "Day N", each group's moves with modifiers (DEC-615, DEC-102, DEC-684). No press (DEC-108).
- **Mid-turn**: the edge band (UI-028): health and purse, chapter, Day N, days left, acting group and moves. The threat bar (UI-047) on the edge.
- **Skull placement** (DEC-064, DEC-092): the board names the kingdom; the iPad lists its buildings; a 4th skull shows the building falling (DEC-093).
- **Effects panel** (UI-022, DEC-115): one line per effect, "+1 day" for a Cleanse or a won-quest night (DEC-699).
- **Without the tower**: the drop is simulated; the board shows the kingdom it landed in (DEC-305).

## Player actions

- iPad: split or join at Regroup (DEC-640).
- iPad: pick the building for each skull, the table agreeing (DEC-092).
- iPad: Next on the effects panel.

## Mechanics behind it

The Story board shows each day's roll (UI-021), the edge band with Day N and days left (UI-028, DEC-686), the threat bar (UI-047), the end-of-day effects panel with "+1 day" lines (UI-022, DEC-115, DEC-699), and each hero's corruptions on the hero panel (UI-030). The iPad runs the Regroup step (DEC-640) and the skull placement prompts (DEC-092).

## What happens next

The effects panel's Next runs the chapter's exit check (MEC-033 .11): next day, the chapter close (feature 15) or the outcome (feature 16).

## OPEN questions

- Q-C3-04 (days left for 3–4 heroes)
- DEFAULT Q-C3-19 (Gamewright default, pending Bob's review): the threat bar shows only the coming drop.
