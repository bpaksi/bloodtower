# Screen spec: C2/11: Continue's piece check
Gamewright, 2026-10-31. Design only. Story copy and voiced words: Loremaster fills every [COPY: ...].

## Purpose
Before a saved game resumes, the table puts back (or checks) every tracked piece, the drums and trapped skulls (AREA-100 scene 5, DEC-710).

## States (each one dialog in the SCR-011 frame; board: picture + line: 1 "Set each hero on their saved space." 2 "Put the skulls back on each building." 3 "Set the foes back where they stood." 4 "Mark the broken seals." 5 (title locked) 6 "Drop N skulls back in the top of the tower."; iPad: Done, Skip)
1. Hero minis: board picture with each hero's saved space.
2. Skulls on buildings: count per building.
3. Foes, only if the save has any.
4. Broken seals, only if any.
5. Tower only, only if a drum is off home: "Turn the drums to the saved game" (DEC-716 title). iPad: Turn the drums. Then a picture of the expected glyphs per side; Done / Skip.
6. Tower only, only if N > 0: drop N skulls back in the top (DEC-717). Done / Skip.
- Skipped step: stays unconfirmed, marked in the board's top band until the next chapter-end check (MEC-018).
- Old save with no drum field: reads "at home", step 5 hidden.
- Fallback if feature 10 shows rotate does not land: step 5 becomes one picture per drum, turned by hand, no rotate (DEC-716).

## Player actions
Done · Skip · Turn the drums (the only tower action; nothing turns without it).

## Mechanics
DEC-710, DEC-716, DEC-717, MEC-018, DEC-283, DEC-675, DEC-305/306, DEC-064, DEC-006, SCR-011, Q-032.

## What happens next
Continue → tower block if none → steps 1 to 6 → saved chapter at its saved node (DEC-675). Host restart mid-check resumes at that step.

## Open questions
- Blocked on feature 10's tower run (rotate lands?).
- What the "unconfirmed" mark in the top band looks like: no UI card.
- Picture art (board diagrams per step): no ART card yet.
