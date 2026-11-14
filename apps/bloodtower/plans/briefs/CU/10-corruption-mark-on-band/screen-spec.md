# Screen spec: CU / 10-corruption-mark-on-band — The mark on the edge band

- Brief: ./plan.md
- Evals: ./eval.md
- Cards: UI-028, UI-030, DEC-043, DEC-676, PT-17
- Viewports: Story board 1920x1080 (Samsung TV). The iPad does not change (768x1024 portrait; the iPad shows no band).
- Rules: the board is display only and never scrolls or clips (SCR-013); the band hides during full-screen visuals (DEC-190); unknown values are shown as unavailable, never as zero.

## Purpose

Let a first-time table see, before a Fight or Retreat choice, that one hero is a fall from losing the game.

## States

- **No hero at 2 corruptions:** the band as today. No mark.
- **One hero at 2:** a mark beside that hero's health mark, not on other heroes.
- **Two heroes at 2:** a mark on each.
- **Corruption count not known** (`table.corruptions` absent): no mark. The health mark keeps showing "unavailable".

## Player actions

- None. Display only.

## Decided (was OPEN)

- The mark is an icon with an aria-label and no visible words (the words belong to C4-09, LQ-2), and is per hero inside the lead's span. Bob, 2026-11-14, adopted. See plan.md.
