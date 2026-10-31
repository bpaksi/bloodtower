# Screen spec: C2/04: The iPad Menu has Close
Gamewright, 2026-10-31. Design only. Story copy and voiced words: Loremaster fills every [COPY: ...].

## Purpose
The iPad Menu can always be dismissed without acting (GC1-04).

## States
- Closed: gear on the bottom bar (UI-032). Default after reload or Continue.
- Open: centered dialog (UI-033), three groups with icons: Look up (Hero panel, Roll, Items), Table (Pause/Resume, Reconnect tower, Join another iPad, Change who holds whom), Leave (Quit story). Unusable items greyed, never hidden (DEC-227). Look up may read "Nothing to look up." Version + debug toggle line at the bottom. "Close" button last, under the groups (DEC-707).
- Confirm sub-state for table-wide items (DEC-230), e.g. Quit story.

## Player actions
- Tap gear: open. Tap gear again, tap outside, or tap Close: close. Nothing is sent to the host (DEC-707).
- Tap an enabled item: does it (table-wide ones confirm first).

## Mechanics
DEC-707, DEC-229, DEC-227, DEC-230, UI-033, UI-032, UI-018 (replaced).

## What happens next
Close or Escape → the iPad screen under it, unchanged. Back on the Quit story confirm → the open Menu. Quit story confirmed → session screen (DEC-218, feature 06).

## Open questions
- Resolved: the Menu keeps Look up (Hero panel, Roll, Items), Join another iPad and Change who holds whom (Bob 2026-10-31). Portrait only.
- Which items are enabled in each C2 state (session screen, setup, play) is not listed on a card. Assumed: Reconnect tower only when tower is lost (feature 08); Pause/Resume only in a game.
