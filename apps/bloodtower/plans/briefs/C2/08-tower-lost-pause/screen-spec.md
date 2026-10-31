# Screen spec: C2/08: A tower lost mid-game
Gamewright, 2026-10-31. Design only. Story copy and voiced words: Loremaster fills every [COPY: ...].

## Purpose
When the tower drops once a game has started (piece setup included), the game pauses and the table picks how to go on (DEC-301, DEC-711).

## States
- Paused, tower lost: board waiting dialog (DEC-705 frame) "The tower has gone quiet. The game waits.". iPad: Reconnect, Go on without, Quit.
- Go on without confirm: asks first (DEC-301). Then the rest of the game uses no-tower stand-ins (DEC-305): tower nodes skipped, skull drop is a seeded draw, board unchanged.
- Reconnecting: progress state; on success the tower check (MEC-018) runs before play goes on (C2: as C1 built it; pictures come in feature 11). On fail: back to the three buttons.
- Quit: Quit story confirm (DEC-230) → session screen.
- Later: Reconnect tower in the iPad Menu Table group (UI-033) while playing without.

## Player actions
Reconnect (only on press) · Go on without (confirm) · Quit (confirm) · Menu → Reconnect tower later.

## Mechanics
DEC-301, DEC-305, DEC-711, MEC-018, MEC-032 (interrupts via MEC-071), UI-033, DEC-229, Q-176.

## What happens next
Reconnect ok → tower check → the node the game paused at. Go on without → same node, no tower. Quit → session screen, autosave kept (DEC-208).

## Open questions
- Does the session screen's tower state read "without the tower" after Go on without? Assumed yes (SCR-021).
- Reconnect from the Menu: does it pause the game while it runs? Not on a card.
- Seals and glyphs without the tower (Q-193) out of scope.
