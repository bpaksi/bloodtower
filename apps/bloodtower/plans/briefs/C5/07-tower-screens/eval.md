Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 07-tower-screens — The Tower on screen: level map, room view, the iPad's doors

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-10; survival evals last (EV-09 … EV-10).

## Checks

### EV-01 — Two halves (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C5-01.
- Method: playwright
- How: enter the Tower.
- Pass evidence: map left, view right.
- Fails if: one half.

### EV-02 — Three iPad choices
- Requirement: DEC-566.
- Method: playwright
- How: a cleared room with a shrine.
- Pass evidence: Open, Rest, Retreat.
- Fails if: other.

### EV-03 — The level shown
- Requirement: DEC-364.
- Method: playwright
- How: climb.
- Pass evidence: basement, main, tower named.
- Fails if: missing.

### EV-04 — Screenshots match
- Requirement: MEC-076.
- Method: screenshot
- How: mockup `#basement`, `#stair`, `#top`.
- Pass evidence: pixel diff under 1% against `#basement`, `#stair`, `#top`.
- Fails if: any image over 1% diff.

### EV-05 — Open, Rest and Retreat do what they say
- Requirement: DEC-566, DEC-360.
- Method: playwright
- How: Open the next door; at a found shrine Rest with heroes at 5/12; then Retreat.
- Pass evidence: Open: the next room shows on the view half; Rest: each hero 7/12 and Rest disables; Retreat: the group stands on the Tower-adjacent space and the level is kept.
- Fails if: any button without its effect.

### EV-06 — The toolbar is on every state
- Requirement: every iPad state has the bottom toolbar, "?" at the left and the gear at the right (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: (iPad portrait 768×1024) stop on each state: closed door, cleared room with shrine, stair room, top level.
- Pass evidence: on each stop `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-07 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play the happy path through closed door, cleared room with shrine, stair room, top level, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: a Menu or help open is needed.

### EV-08 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (C2-04, C3 rule).
- Method: playwright
- How: on each state (closed door, cleared room with shrine, stair room, top level) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `tower-screens` and its text is exactly "Tap Open the next door to go deeper. Tap Rest at a shrine, or Retreat to fall back." (Loremaster 2026-10-31); the host receives 0 messages from the iPad while it is open and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows on the board, shows another screen's text, sends a message, pauses the game or changes state.

### EV-09 — A Tower trap shows −2 in the view
- Requirement: DEC-566.
- Method: playwright
- How: 2 heroes at 10 HP open a trap room.
- Pass evidence: the room view shows each hero's HP as exactly `8/10 HP`, and the result line reads exactly "Every hero loses 2 hit points." (locked by Loremaster; the Rocks line reused).
- Fails if: no change shown.

### EV-10 — Climb takes the stairs
- Requirement: Gamewright ruling: the Stairs state has Climb.
- Method: playwright
- How: beat the basement stair guard; press Climb.
- Pass evidence: the iPad shows **Climb** on the Stairs state; after the press the map shows the main level, room 1.
- Fails if: no Climb button, or the level does not change.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Map survives Continue
- Requirement: DEC-360.
- Method: playwright
- How: quit on main; Continue.
- Pass evidence: the same `[data-level]`, the same `[data-room][data-cleared]` set and the same group HP.
- Fails if: reset.

### EV-12 — The gear comes back closed after a restart
- Requirement: after a restart and Continue on this screen the Menu and any gear panel come back closed, the game is not paused and the toolbar is back (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear.
- Fails if: the Menu or panel reopens, the game stays paused, or the toolbar is missing.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Resolved Q-C5-01 **[Bob taste call]**: The Tower has no screen cards. What does the board show in the Tower (MEC-076)? Options: (a) reuse the Tomb's two halves (DEC-583): the level's room map left, the room view right; Gamewright files UI cards for it in a design session; (b) the room map only, full width. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
