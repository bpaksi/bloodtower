Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 14-fight-buttons — Fight on the event and quest scenes

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-10; survival evals last (EV-09 … EV-10).

## Checks

### EV-01 — Fight on foes and disasters (Gamewright pick, pending Bob)
- Requirement: Q-C4-02.
- Method: playwright
- How: each event type.
- Pass evidence: foes and disaster events each show Fight, Go around, Pay them off (5 gold), all enabled with purse 10.
- Fails if: Fight missing or disabled on either.

### EV-02 — Fight hands to the battle
- Requirement: MEC-038.
- Method: playwright
- How: pick Fight.
- Pass evidence: horn, foe panel, round picker.
- Fails if: nothing.

### EV-03 — The Ambush: two options
- Requirement: DEC-662.
- Method: playwright
- How: reach The Ambush.
- Pass evidence: Fight, pay the toll.
- Fails if: one.

### EV-04 — Screenshots match
- Requirement: UI-041.
- Method: screenshot
- How: iPad 768×1024; mockup `#foes`, `#ambush`.
- Pass evidence: pixel diff under 1% against `#foes`, `#ambush`.
- Fails if: any image over 1% diff.

### EV-05 — A plain-scene battle option shows Fight
- Requirement: Q-C4-02 (Gamewright pick, pending Bob); this feature owns the Fight button.
- Method: playwright
- How: a scene whose option B holds a battle.
- Pass evidence: the iPad shows Fight in B's place plus the scene's other option label.
- Fails if: no Fight, or the battle option shows under its scene label only.

### EV-06 — The toolbar is on every state
- Requirement: every iPad state has the bottom toolbar, "?" at the left and the gear at the right (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright, iPad portrait 768×1024
- How: stop on each state: foes event, disaster event, The Ambush, plain-scene battle option.
- Pass evidence: on each stop `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-07 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play the happy path through foes event, disaster event, The Ambush, plain-scene battle option, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: a Menu or help open is needed.

### EV-08 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (C2-04, C3 rule).
- Method: playwright
- How: on each state (foes event, disaster event, The Ambush, plain-scene battle option) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `fight-buttons` and its text is exactly "Tap Fight to start a battle, or Go around or Pay them off to avoid it. At The Ambush, Pay the toll instead. In a scene, Fight sits beside the scene's other choice." (Loremaster 2026-10-31); the host receives 0 messages from the iPad while it is open and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows on the board, shows another screen's text, sends a message, pauses the game or changes state.

### EV-11 — Plain scene copy
- Requirement: Loremaster copy (2026-10-31).
- Method: playwright
- How: the test plain scene.
- Pass evidence: the board reads exactly "Shapes move on the road ahead. They have seen you."; the iPad shows **Fight**, **Slip past**, **Talk them down**.
- Fails if: any other text.

## Survival evals (one per survival invariant in plan.md)

### EV-09 — Fight survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: quit at a foes event; Continue.
- Pass evidence: Fight still shown.
- Fails if: gone.

### EV-10 — The gear comes back closed after a restart
- Requirement: after a restart and Continue on this screen the Menu and any gear panel come back closed, the game is not paused and the toolbar is back (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear.
- Fails if: the Menu or panel reopens, the game stays paused, or the toolbar is missing.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C4-02: Where does Fight show once `fight_enabled` is on? Options: (a) on every foes and disaster event and on every plain-scene option that holds a battle, always enabled; (b) on foes events only; disasters stay Go around / Pay them off until C5. Gamewright pick: (a) (Gamewright pick, pending Bob).
