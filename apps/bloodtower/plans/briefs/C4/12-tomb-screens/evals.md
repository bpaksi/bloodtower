Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 12-tomb-screens — The Tomb on screen: the map and the view, the iPad's three corridors

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-16; survival evals last (EV-14 … EV-16).

## Checks

### EV-01 — Both halves always
- Requirement: DEC-583.
- Method: playwright
- How: enter The Barrow.
- Pass evidence: map left, view right.
- Fails if: one half.

### EV-02 — Three corridor cards
- Requirement: DEC-591.
- Method: playwright
- How: a room with 3 doorways.
- Pass evidence: 3 cards + Listen + Leave.
- Fails if: other.

### EV-03 — A battle replaces the view
- Requirement: DEC-592.
- Method: playwright
- How: enter a battle room.
- Pass evidence: battle in view half; map stays.
- Fails if: map gone.

### EV-04 — The map is the dealt 4×4 grid
- Requirement: DEC-603, DEC-583.
- Method: playwright
- How: Standard seed fixture with 7 rooms; reveal all.
- Pass evidence: 7 rooms plus the Exit on a 4×4 grid, the entrance on an edge cell; map half beside view half.
- Fails if: other.

### EV-05 — Screenshots match
- Requirement: AREA-094.
- Method: screenshot
- How: board and iPad; mockup `#tomb`, `#listen`, `#trap`.
- Pass evidence: pixel diff under 1% against `#tomb`, `#listen`, `#trap`.
- Fails if: any image over 1% diff.

### EV-06 — The map shows count, Exit and the current room
- Requirement: DEC-583, DEC-487.
- Method: playwright
- How: enter, move to room 2, with 3 Undead Advantages.
- Pass evidence: `[data-undead-advantage]` reads 3; `[data-room="2"]` has `data-current`; `[data-exit]` is visible.
- Fails if: count, Exit or glow missing.

### EV-07 — A trap replaces the view
- Requirement: DEC-592.
- Method: playwright
- How: enter a trap room.
- Pass evidence: the view half shows `[data-view="trap"]` and the line `A trap.`; the map stays.
- Fails if: the map is replaced or no trap view.

### EV-08 — The Listen hint shows
- Requirement: DEC-586.
- Method: playwright
- How: press Listen on Ahead toward a trap room, seed giving a true hint.
- Pass evidence: the board shows `You hear something behind the door.` (it names no room kind, so the iPad-only no-hint-text rule holds) and plays `snd.listen_trap` on the board speakers; the iPad shows only "You listen down the corridor."; Bold is struck out on the Ahead card.
- Fails if: no hint, or Bold still live.

### EV-09 — The toolbar is on every state
- Requirement: every iPad state has the bottom toolbar, "?" at the left and the gear at the right (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright, iPad portrait 768×1024
- How: stop on each state: room with three cards, after Listen, trap, battle room, Exit.
- Pass evidence: on each stop `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-10 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play the happy path through room with three cards, after Listen, trap, battle room, Exit, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: a Menu or help open is needed.

### EV-11 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (C2-04, C3 rule).
- Method: playwright
- How: on each state (room with three cards, after Listen, trap, battle room, Exit) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `tomb-screens` and its text is exactly "Pick Left, Ahead or Right on your iPad, then Listen, Bold or On guard on that card. Tap Leave to get out." (Loremaster 2026-10-31); the host receives 0 messages from the iPad while it is open and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows on the board, shows another screen's text, sends a message, pauses the game or changes state.

### EV-12 — Beats auto-advance
- Requirement: no Next on: Falling Rocks result; each advances when its narration or cue ends, or after 4 s when it has no audio (C2-04 rule; Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
- Method: playwright, fake clock
- How: reach each beat (Falling Rocks result); once with narration (mock audio end event), once with audio off.
- Pass evidence: the iPad shows no Next button; the beat advances on the audio end event, and 4 s (±200 ms) after it shows when there is no audio.
- Fails if: a Next button shows, it advances early, or it waits for a press.

### EV-13 — Narration holds the beat past 4 s
- Requirement: a beat with audio waits for its end event (Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
- Method: playwright, fake clock
- How: reach each beat (Falling Rocks result) with narration playing; advance the clock 4.5 s with no audio end event.
- Pass evidence: the screen is still on the beat; it advances only after the end event fires.
- Fails if: it advances at 4 s while narration plays.

### EV-14 — Trap and listen copy
- Requirement: Loremaster copy (2026-10-31).
- Method: playwright
- How: Listen down a corridor, then enter a Pit room and a Falling Rocks room.
- Pass evidence: the iPad reads exactly "You listen down the corridor."; the Pit result reads exactly "The floor gives way. Choose one hero to take the fall and lose 4 hit points." (locked by Loremaster); the Falling Rocks result reads exactly "Stones crash from the ceiling. Every hero loses 2 hit points." (locked by Loremaster).
- Fails if: any other text.

### EV-15 — The Pit waits for the pick and hurts only that hero
- Requirement: DEC-606; Sentinel recheck 4.
- Method: playwright, fake clock
- How: 3 heroes at 10 HP enter a Pit room; advance the clock 30 s; press the second hero's button.
- Pass evidence: after 30 s the Pit is still shown, its iPad title reads exactly "Who takes the fall?", with exactly 3 buttons each labeled exactly with a hero's name and the locked line; after the press that hero reads 6/10 and the other two 10/10.
- Fails if: it advances without a pick, shows a Next, or takes HP from anyone else.

## Survival evals (one per survival invariant in plan.md)

### EV-16 — Map survives Continue
- Requirement: DEC-602.
- Method: playwright
- How: clear 2 rooms, quit, Continue.
- Pass evidence: same map.
- Fails if: reset.

### EV-17 — A beat interrupted by restart applies once
- Requirement: restart or Continue during an auto-advancing beat (Falling Rocks result) (Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
- Method: playwright
- How: during each beat, restart the host and Continue.
- Pass evidence: the same beat shows again, or the next one; its effect (gold, card, cut, seal, flag) is applied exactly once in the state log.
- Fails if: the beat is skipped with no effect, or its effect is applied twice.

### EV-18 — The gear comes back closed after a restart
- Requirement: after a restart and Continue on this screen the Menu and any gear panel come back closed, the game is not paused and the toolbar is back (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear.
- Fails if: the Menu or panel reopens, the game stays paused, or the toolbar is missing.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Q-C4-08 ANSWERED by card DEC-603 (in commit 0005 "C4/C5 plans: fill the 14 [TBD] values"; not a Bob question). Card: "**Rooms, guardian's included:** short 4–5, standard 6–7, long 8–10, seeded within the range. / **Grid:** 4×4, 16 cells. The entrance is on an edge cell." Source: research/game-design/cards/DEC-603.md. ~~Old option (a) 7 rooms, guardian hidden in one of the last 3; Gamewright pick (a), approved by Bob 2026-10-31 6:16 PM ET~~ (struck: contradicts the card).
- OPEN Q-C4-15 **[Bob taste call]**: Foe paintings in C4, before the A1 art run (C5): Options: (a) one placeholder painting per foe level, swapped by A1 in C5; (b) A1 draft art now, as the art lands. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
