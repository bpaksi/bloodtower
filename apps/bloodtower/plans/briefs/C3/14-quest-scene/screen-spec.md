# Screen spec: C3 / 14-quest-scene — The quest scene: the track, the choice, the item hand-off

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: UI-042, UI-025, UI-036, MEC-037, MEC-077, DEC-642, DEC-653, DEC-654, DEC-692, DEC-693, DEC-714, DEC-700
- Viewports: Story board 1920×1080 (Samsung TV), iPad 768×1024 portrait (locked by Bob)
- Rules for every screen: the board is display only and never scrolls or clips (SCR-013); iPads carry choices and taps only, and every story line shows on the board (SCR-014, DEC-057); one step, one primary button on the iPad (SCR-016); Menu on every device (UI-018). Story copy stays `[COPY: ...]`.

## Purpose

Play a quest's one choice and its outcome (MEC-037, MEC-077).

## States

- **Opening** (.3): narration `[COPY: the herald opening]` (The Herald) on a Scroll.
- **Track** (UI-025): steps done and to come (one step for a plain scene).
- **Choice** (UI-042, MEC-077 .1): 2–3 options, costs shown, missing-item options disabled.
- **Corruption cost**: pick the hero who takes it (DEC-693).
- **Item** (UI-036): Reveal, then pick who takes it (DEC-653).
- **Rewards** (.9): gold, quest gold, items.
- **Battle option**: hidden in C3 (Q-C3-02); The Ambush shows its toll option only, a documented C3 exception to the 2–3 option rule (Gamewright default, Bob to confirm). C4 shows it. Toll 10 gold; a short group pays all its gold plus 2 hit points per present hero, never below 1 (Gamewright proposal, pending Bob).

## Player actions

- iPad (present heroes, DEC-019): pick an option; pick a hero for a cost or an item; Next.

## Mechanics behind it

UI-042: the quest's painting and narration on a Scroll, the 2 or 3 options on the iPad with their costs, a disabled option for a missing item (DEC-654), the item Reveal and the hero pick (UI-036, DEC-653), the rewards (MEC-037 .9) and the quest track (UI-025).

## What happens next

The quest's end hook (`[COPY: the herald end hook]`), back to the building menu; a done quest may end the chapter at the day's close.

## OPEN questions

- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4.
- Q-C3-22: with Fight hidden, The Ambush finishes only by paying the toll (DEC-662). The toll amount is not carded, and a group that cannot pay cannot win chapter 1. What is the toll, and what happens when the purse is short? Gamewright proposal, pending Bob: 10 gold; short group pays all + 2 HP per present hero, never below 1.
