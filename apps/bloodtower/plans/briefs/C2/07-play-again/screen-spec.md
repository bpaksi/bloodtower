# Screen spec: C2/07: Play again and a quit game's stats
Gamewright, 2026-10-31. Design only. Story copy and voiced words: Loremaster fills every [COPY: ...].

## Purpose
From tonight's list, see a game's stats so far and replay it with a new seed and the same heroes (DEC-708).

## States
- Game stats (SCR-019, C2 slice): board shows outcome (quit), time played, and what the day slice records. Unrecorded values show as unavailable. Optional 1-5 fun rating never blocks (SCR-019).
- iPad: Play again, Back.
- Replace-save confirm if an autosave exists (DEC-709).
- Claim heroes (SCR-010) prefilled: same heroes on the same iPads; one press confirms (DEC-216). iPads not joined now: their heroes unclaimed.

## Player actions
Open a game from the list · Play again (confirm if save) · Back · Confirm claims (or change them).

## Mechanics
DEC-708, DEC-216, DEC-709, DEC-629 (tonight only), DEC-218, SCR-019, SCR-010, SCR-011, AREA-100 scene 3.

## What happens next
Play again → (tower block if lost, DEC-711) → skips Pick story and Game settings → prefilled claims → piece setup (SCR-011) with the new seed → play. Back → session screen.

## Open questions
- Which stats the day slice records is not listed on a card; the brief says "unavailable" for the rest. Need the C2 stats list.
- Does the fun rating show for a quit game? SCR-019 does not say.
