# Screen spec: C2/01: Take Long out of the Dracula settings
Gamewright, 2026-10-31. Design only. Story copy and voiced words: Loremaster fills every [COPY: ...].

## Purpose
Game settings (SCR-008) for Dracula offers only the lengths 1.0 ships. Small change; brief says no mockup.

## States
- Dracula's settings: Length shows Short and Standard only (DEC-502, DEC-508).
- Test pack settings: unchanged.
- Dracula is `playable: false`, so the table reaches these settings only by browsing (SCR-007/SCR-009: stops on not-ready).

## Player actions
- iPad: pick Short or Standard. No Long button, not greyed: it is gone (pack data, not a disabled item).

## Mechanics
DEC-502 (Long waits for 1.1), DEC-508 (Dracula's 1.0 cut has no Long), SCR-008, SCR-009.

## What happens next
Unchanged: Game settings → Claim heroes (SCR-010).

## Open questions
- Resolved (mockup wins): Long is removed, not greyed; no summary line under Length.
