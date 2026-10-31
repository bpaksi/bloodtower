# Screen spec: C3 / 15-chapter-card — The chapter card and the chapter end with the seal break

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: UI-020, UI-044, MEC-033, DEC-303, DEC-302, DEC-306, DEC-409, CUE-004, CUE-005
- Viewports: Story board 1920×1080 (Samsung TV), iPad 768×1024 portrait (locked by Bob)
- Rules for every screen: the board is display only and never scrolls or clips (SCR-013); iPads carry choices and taps only, and every story line shows on the board (SCR-014, DEC-057); one step, one primary button on the iPad (SCR-016); Menu on every device (UI-018). Story copy stays `[COPY: ...]`.

## Purpose

Mark the start and the end of each chapter, and show the seal and glyph the win earned (MEC-033).

## States

- **Chapter card** (UI-020): painting, `[COPY: chapter 1 name]`, `[COPY: chapter 1 goal]`.
- **Stamped won** (.15).
- **Close Scroll** (.14): "The roads are quiet again.".
- **Seal break** (.18 to .21, tower only): lit seal, break it, the glyph and `[COPY: seal break, {boon}]` (boon wording waits on Q-C3-17). (C4+ only; shown when c3_end_after_chapter_1 is off)
- **Freed skulls** (.22 to .30): kingdom for each, then the building, as after a drop.
- **C3 chapter 1 win** (Q-C3-01): the stamped card, then the close Scroll, then the outcome scene (feature 16); no seal, no freed skulls (Gamewright default, Bob to confirm).
- Story text on this screen is `[COPY: ...]` per the rule (Gamewright default, Bob to confirm).

## Player actions

- iPad: Next; confirm the seal is broken (Done) (C4+ only; shown when c3_end_after_chapter_1 is off); name the kingdom and building for each freed skull.

## Mechanics behind it

UI-020 at each chapter's start (painting, name, goal) and stamped won at its end; UI-044: the chapter's close on a Scroll, then the seal break on a Reveal with the glyph and its boon (DEC-303), then the freed-skull placement (DEC-409). Without the tower the seal part is skipped (DEC-306).

## What happens next

The next chapter's enter: place its quest tokens, the newly open kingdom lit (MEC-033 .3).

## OPEN questions

- Q-C3-17 (which boons)
