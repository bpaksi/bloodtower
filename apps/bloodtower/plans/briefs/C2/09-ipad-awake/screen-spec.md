# Screen spec: C2/09: Joined iPads stay awake
Gamewright, 2026-10-31. Design only. Story copy and voiced words: Loremaster fills every [COPY: ...].

## Purpose
Mostly invisible. The only screen change: an iPad whose keep-awake request is refused says so (DEC-712).

## States
- Normal: no change on the device page (SCR-016).
- Refused: a notice on that iPad only "This iPad may dim and sleep. Keep it awake in Settings to stay in the game.", logged. Non-blocking.
- Slept anyway: it is a drop. Mid-game: pause until every hero has a device (DEC-154). Between games: nothing blocks (DEC-712).

## Player actions
None required. Dismiss the notice (assumed).

## Mechanics
DEC-712, DEC-154, DEC-153, SCR-016.

## What happens next
No flow change.

## Open questions
- Resolved (mockup): one DeviceErrorBanner with this copy and the error code, above the bottom bar, clear of the corners (DEC-706), dismissible.
