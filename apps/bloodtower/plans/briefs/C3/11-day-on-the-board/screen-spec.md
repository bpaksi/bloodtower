# Screen spec: C3 / 11-day-on-the-board — The day on the board: day roll, days left, threat bar, effects panel

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: SCR-014, UI-021, UI-022, UI-028, UI-030, UI-047, DEC-686, DEC-699, DEC-115, DEC-640, DEC-092, DEC-093
- Viewports: Story board 1920×1080 (Samsung TV), iPad 768×1024 portrait (locked by Bob)
- Rules for every screen: the board is display only and never scrolls or clips (SCR-013); iPads carry choices and taps only, and every story line shows on the board (SCR-014, DEC-057); one step, one primary button on the iPad (SCR-016); the bottom toolbar on every iPad state, "?" help at the left and the gear (Menu) at the right (C2 feature 04; Bob 2026-10-31 10:37/10:38); the happy path never needs the gear. Help text (Loremaster 2026-10-31): "A new day begins. Move your heroes, then choose where to go.". Story copy stays `[COPY: ...]`.

## Purpose

Show the day as the game's clock: what the moves are, how many days are left, and what the night did, so the table feels the skull pressure (DEC-686).

## States

- **Day start, Regroup** (DEC-640): board shows the groups and "A new day. Stay together, or split up?"; iPads offer split / join.
- **Day roll** (UI-021): "Day N", each group's moves with modifiers (DEC-615, DEC-102, DEC-684). No press (DEC-108).
- **Mid-turn**: the edge band (UI-028): health and purse, chapter, Day N, days left, acting group and moves. The threat bar (UI-047) on the edge.
- **Skull placement** (DEC-064, DEC-092): the board names the kingdom; the iPad lists its buildings; a 4th skull shows the building falling (DEC-093). This is a choice: one button per building, no auto-advance; it waits for the press.
- **Effects panel** (UI-022, DEC-115): one line per effect, "+1 day" for a Cleanse or a won-quest night (DEC-699).
- **Without the tower**: the drop is simulated; the board shows the kingdom it landed in (DEC-305).

## Player actions

- iPad: split or join at Regroup (DEC-640).
- iPad: pick the building for each skull, the table agreeing (DEC-092).
- Gear (exceptions, C2 feature 04): Split party (shows "Rejoin party" when split) and Use a potion or item. With no hero holding a potion or item, "Use a potion or item" is greyed with the reason "No potions or items to use." (Loremaster, locked). The Story board shows the panel, display only (DEC-278); the iPad shows "See the Story board", the picks as a simple list of buttons (a group choice; a hero, then an item) and Done/Back; the board mirrors each press (Gamewright pick, pending Bob Q-GEAR-1).
- Skull placement: a choice (pick a building); it never auto-advances.
- Effects panel: no button; it auto-advances when its narration or cue ends (4 s with no audio; Bob 2026-10-31 10:38 AM ET).

## Mechanics behind it

The Story board shows each day's roll (UI-021), the edge band with Day N and days left (UI-028, DEC-686), the threat bar (UI-047), the end-of-day effects panel with "+1 day" lines (UI-022, DEC-115, DEC-699), and each hero's corruptions on the hero panel (UI-030). The iPad runs the Regroup step (DEC-640) and the skull placement prompts (DEC-092).

## What happens next

The effects panel's auto-advance runs the chapter's exit check (MEC-033 .11): next day, the chapter close (feature 15) or the outcome (feature 16).

## OPEN questions

- ANSWERED Q-C3-04 (Bob approved 2026-10-31): count the actual nights the 1,2,1,2 pattern gives. (days left for 3–4 heroes)
- ANSWERED Q-C3-19 (Bob approved 2026-10-31): the threat bar shows only the coming drop.
