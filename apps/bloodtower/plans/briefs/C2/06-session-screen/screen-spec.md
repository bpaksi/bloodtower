# Screen spec: C2/06: The session screen and Done for tonight
Gamewright, 2026-10-31. Design only. Story copy and voiced words: Loremaster fills every [COPY: ...].

## Purpose
The hub between games (DEC-214, SCR-021, MEC-039 .27 to .32): go on, start fresh, or end the night.

## States
- Board, top to bottom: Continue (only while an autosave exists, DEC-709) · New game · Tonight's games, newest first, each marked won/lost/quit (C2: all quit) · Done for tonight · tower line "tower: in play" / "without the tower" / "Tower lost" (DEC-711; tower wording ruling). Rows read "Game 1", "Game 2"…
- iPad: the same choices as buttons, game rows pressable (board shows, iPad presses, DEC-278). No delete-game action.
- After New game → Yes, Continue is hidden until Begin (Bob 2026-10-31).
- Replace-save confirm: New game while an autosave exists → "This replaces the saved game. Are you sure?" (DEC-709; this line is card text).
- Done confirm: "Are you sure?" (DEC-713, DEC-230).
- Session over: board back to landing painting (SCR-002); iPads "The session is over", no buttons and no Menu gear, then leave (DEC-713).
- All iPads dropped: board shows the join QR until one joins (DEC-712).

## Player actions
Continue · New game (confirm if save) · open a game in the list (drill-in is feature 07) · Done for tonight (confirm).

## Mechanics
SCR-021, DEC-214, DEC-709, DEC-711, DEC-712, DEC-713, DEC-208, DEC-218, DEC-628, DEC-629, CUE-012, MEC-039, AREA-100 scenes 4, 6, 7.

## What happens next
- Continue → (tower block again if Tower lost, DEC-711) → saved game (today's checkpoint reload; piece check is feature 11).
- New game → (tower block if lost) → Pick story.
- Done confirmed → tower to idle if in play (CUE-012) → landing painting; next session starts at the join (MEC-039 .1). Autosave stays.

## Open questions
- Resolved: empty list reads "No games yet tonight." (mockup).
- How many games fit before the list must cut down (DEC-705, no scroll)? No ruling.
