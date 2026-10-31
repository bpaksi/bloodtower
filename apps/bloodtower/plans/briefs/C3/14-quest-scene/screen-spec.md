# Screen spec: C3 / 14-quest-scene — The quest scene: the track, the choice, the item hand-off

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: UI-042, UI-025, UI-036, MEC-037, MEC-077, DEC-642, DEC-653, DEC-654, DEC-692, DEC-693, DEC-714, DEC-700
- Viewports: Story board 1920×1080 (Samsung TV), iPad 1024×768
- Rules for every screen: the board is display only and never scrolls or clips (SCR-013); iPads carry choices and taps only, and every story line shows on the board (SCR-014, DEC-057); one step, one primary button on the iPad (SCR-016); Menu on every device (UI-018). Story copy stays `[COPY: ...]`.

## Purpose

Play a quest's one choice and its outcome (MEC-037, MEC-077).

## States

- **Opening** (.3): narration "A herald waits by the well. His horse is gone, and his message is torn." (The Herald) on a Scroll.
- **Track** (UI-025): steps done and to come (one step for a plain scene).
- **Choice** (UI-042, MEC-077 .1): 2–3 options, costs shown, missing-item options disabled.
- **Corruption cost**: pick the hero who takes it (DEC-693).
- **Item** (UI-036): Reveal, then pick who takes it (DEC-653).
- **Rewards** (.9): gold, quest gold, items.
- **Battle option**: OPEN Q-C3-02.

## Player actions

- iPad (present heroes, DEC-019): pick an option; pick a hero for a cost or an item; Next.

## Mechanics behind it

UI-042: the quest's painting and narration on a Scroll, the 2 or 3 options on the iPad with their costs, a disabled option for a missing item (DEC-654), the item Reveal and the hero pick (UI-036, DEC-653), the rewards (MEC-037 .9) and the quest track (UI-025).

## What happens next

The quest's end hook ("The herald rides on. The road ahead is a little clearer."), back to the building menu; a done quest may end the chapter at the day's close.

## OPEN questions

- Q-C3-02 (battle options before C4)
