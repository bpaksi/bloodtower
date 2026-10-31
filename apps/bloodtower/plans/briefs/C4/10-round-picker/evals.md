Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 10-round-picker — The round picker on the iPad: Fight or Retreat, then one action

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-10; survival evals last (EV-09 … EV-10).

## Checks

### EV-01 — Fight or Retreat first
- Requirement: UI-027, DEC-118.
- Method: playwright
- How: start a round.
- Pass evidence: both buttons; no actions yet.
- Fails if: actions first.

### EV-02 — All pick at once (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C4-16.
- Method: playwright
- How: 3 iPads.
- Pass evidence: all three pickers open in the same frame (open timestamps within 100 ms); the board ticks each hero as they pick.
- Fails if: any picker opens only after another iPad's pick (open timestamps over 100 ms after a pick).

### EV-03 — A sat-out hero gets no picker
- Requirement: DEC-119.
- Method: playwright
- How: hero at 0.
- Pass evidence: that iPad shows `[COPY: sitting out = "You are sitting out this battle. Watch the board."]` and no buttons.
- Fails if: picker shown.

### EV-04 — Screenshots match
- Requirement: UI-027.
- Method: screenshot
- How: iPad 768×1024 portrait, mockup `#choice`, `#actions`.
- Pass evidence: pixel diff under 1% against `#choice` and `#actions`.
- Fails if: any image over 1% diff.

### EV-05 — The group's Fight or Retreat is the first press
- Requirement: the plan's rule: the first press on any present iPad decides; the others' buttons disable.
- Method: playwright
- How: 3 iPads; iPad A presses Retreat, then iPad B presses Fight 200 ms later.
- Pass evidence: the battle retreats; iPad B's press is ignored and its buttons are disabled with `[COPY: the group chose Retreat]`.
- Fails if: B's Fight wins, or both are applied.

### EV-06 — The toolbar is on every state
- Requirement: every iPad state has the bottom toolbar, "?" at the left and the gear at the right (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright, iPad portrait 768×1024
- How: stop on each state: Fight or Retreat, actions, waiting, sitting out.
- Pass evidence: on each stop `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-07 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play the happy path through Fight or Retreat, actions, waiting, sitting out, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: a Menu or help open is needed.

### EV-08 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (C2-04, C3 rule).
- Method: playwright
- How: on each state (Fight or Retreat, actions, waiting, sitting out) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `round-picker` and its text is exactly "Choose Fight or Retreat, then each hero picks Attack, Cast a spell, Spend an Advantage, Drink a potion or Guard. The round starts when everyone has picked." (Loremaster 2026-10-31); the host receives 0 messages from the iPad while it is open and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows on the board, shows another screen's text, sends a message, pauses the game or changes state.

### EV-09 — A hero can change a pick until the last hero picks (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C4-18.
- Method: playwright
- How: 2 heroes; hero 1 picks Attack, changes to Cast a spell; hero 2 picks Attack.
- Pass evidence: after picking, hero 1's iPad shows **Change pick** (label approved by Bob 2026-10-31 6:16 PM ET, Q-C4-18); tapping it brings the actions back, and the round uses hero 1's Cast a spell; once hero 2 has picked, **Change pick** is gone and hero 1's buttons are disabled.
- Fails if: the old pick is used, or a change is possible after the last pick.

### EV-10 — "All picked" goes straight to the round result
- Requirement: Gamewright ruling: All picked does not hold.
- Method: playwright, fake clock
- How: 2 heroes; the last hero picks; do not advance the clock.
- Pass evidence: the board shows the round result line in the same tick; no "All picked" hold and no Next.
- Fails if: the board holds on "All picked", waits for a timer, or shows a Next.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Pick survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: pick, quit, Continue.
- Pass evidence: pick still ticked.
- Fails if: lost.

### EV-12 — The gear comes back closed after a restart
- Requirement: after a restart and Continue on this screen the Menu and any gear panel come back closed, the game is not paused and the toolbar is back (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear.
- Fails if: the Menu or panel reopens, the game stays paused, or the toolbar is missing.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C4-16 **[Bob taste call]**: Round actions on the iPads (DEC-129): all at once or in turn? Options: (a) all at once; the board ticks each hero who has picked, and the round runs when all have; (b) in turn order, one iPad at a time. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- OPEN Q-C4-11 **[Bob taste call]**: Does a battle round have a timer on the iPads? Options: (a) no timer; the round waits for every present hero; (b) 30 seconds, then a missing pick becomes a normal attack (DEC-129). Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
