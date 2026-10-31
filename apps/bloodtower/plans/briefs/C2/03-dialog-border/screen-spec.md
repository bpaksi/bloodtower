# Screen spec: C2/03: Every Story board dialog keeps a border
Gamewright, 2026-10-31. Design only. Story copy and voiced words: Loremaster fills every [COPY: ...].

## Purpose
No Story board dialog fills the TV. The landing painting always shows around it (GC1-02).

## States
- Any board dialog (connect, waiting, setup, session screen, pauses): inside a frame with at least 5% of board height above and below and 5% of width at each side (DEC-705).
- Long content: the art shrinks first, then content is cut (whole items) to fit. Never scrolls, never clips mid-line (SCR-013; Bob 2026-10-31).
- Checked at 1920×1080 and 3840×2160 on the Samsung.

## Player actions
None. Layout rule only.

## Mechanics
DEC-705, SCR-013, AREA-050. Likely culprit: TowerPanel in StartupBoard (tower still + join block).

## What happens next
Every later screen spec here (05, 06, 07, 08, 11, 12) inherits this frame.

## Open questions
- The 5% is a placeholder (DEC-705); Bob tunes it at G-C2.
- Resolved: art shrinks first, then content is cut to fit (Bob 2026-10-31).
