Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 13-seal-break-live — The seal break live on the board, chapters 1 and 2

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-13; survival evals last (EV-11 … EV-13).

## Checks

### EV-01 — Order: stamp, Scroll, seal, glyph, skulls
- Requirement: UI-044.
- Method: playwright
- How: tower; win chapter 1.
- Pass evidence: in that order.
- Fails if: out of order.

### EV-02 — Chapter's own seal line (Gamewright pick, pending Bob)
- Requirement: Q-C4-10.
- Method: playwright
- How: win chapters 1 and 2.
- Pass evidence: two different `[COPY]` keys.
- Fails if: same key.

### EV-03 — Freed skulls picked on the iPad
- Requirement: DEC-303.
- Method: playwright
- How: 2 freed skulls.
- Pass evidence: two kingdom-then-building picks.
- Fails if: auto.

### EV-04 — Screenshots match
- Requirement: UI-044.
- Method: screenshot
- How: mockup `#seal`, `#skull`.
- Pass evidence: pixel diff under 1% against `#seal`, `#skull`.
- Fails if: any image over 1% diff.

### EV-05 — Seal broken confirms the tower's seal
- Requirement: plan: the iPad confirms which seal broke on the tower.
- Method: playwright, tower mock
- How: win chapter 1; tower mock reports seal 2 broken; press Seal broken.
- Pass evidence: the state records `seal_broken: 2`; the glyph Reveal is seal 2's glyph.
- Fails if: the state records another seal or the press is not needed.

### EV-06 — The toolbar is on every state
- Requirement: every iPad state has the bottom toolbar, "?" at the left and the gear at the right (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright, iPad portrait 768×1024
- How: stop on each state: close Scroll, Seal broken, glyph and boon Reveal, skull kingdom pick, skull building pick.
- Pass evidence: on each stop `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-07 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play the happy path through close Scroll, Seal broken, glyph and boon Reveal, skull kingdom pick, skull building pick, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: a Menu or help open is needed.

### EV-08 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (C2-04, C3 rule).
- Method: playwright
- How: on each state (close Scroll, Seal broken, glyph and boon Reveal, skull kingdom pick, skull building pick) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `seal-break-live` and its text is exactly "Tap Seal broken once the tower's seal breaks. Then pick a kingdom and a building for each freed skull and tap Place skull." (Loremaster 2026-10-31); the host receives 0 messages from the iPad while it is open and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows on the board, shows another screen's text, sends a message, pauses the game or changes state.

### EV-09 — Beats auto-advance
- Requirement: no Next on: close Scroll, glyph and boon Reveal; each advances when its narration or cue ends, or after 4 s when it has no audio (C2-04 rule; Q-C4-17 (Gamewright pick, pending Bob)).
- Method: playwright, fake clock
- How: reach each beat (close Scroll, glyph and boon Reveal); once with narration (mock audio end event), once with audio off.
- Pass evidence: the iPad shows no Next button; the beat advances on the audio end event, and 4 s (±200 ms) after it shows when there is no audio.
- Fails if: a Next button shows, it advances early, or it waits for a press.

### EV-10 — Narration holds the beat past 4 s
- Requirement: a beat with audio waits for its end event (Q-C4-17 (Gamewright pick, pending Bob)).
- Method: playwright, fake clock
- How: reach each beat (close Scroll, glyph and boon Reveal) with narration playing; advance the clock 4.5 s with no audio end event.
- Pass evidence: the screen is still on the beat; it advances only after the end event fires.
- Fails if: it advances at 4 s while narration plays.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Skull placement survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: place 1 of 2, quit, Continue.
- Pass evidence: prompt for skull 2.
- Fails if: restart at 1.

### EV-12 — A beat interrupted by restart applies once
- Requirement: restart or Continue during an auto-advancing beat (close Scroll, glyph and boon Reveal) (Q-C4-17 (Gamewright pick, pending Bob)).
- Method: playwright
- How: during each beat, restart the host and Continue.
- Pass evidence: the same beat shows again, or the next one; its effect (gold, card, cut, seal, flag) is applied exactly once in the state log.
- Fails if: the beat is skipped with no effect, or its effect is applied twice.

### EV-13 — The gear comes back closed after a restart
- Requirement: after a restart and Continue on this screen the Menu and any gear panel come back closed, the game is not paused and the toolbar is back (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear.
- Fails if: the Menu or panel reopens, the game stays paused, or the toolbar is missing.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C4-10 **[Bob taste call]**: Who speaks the seal-break line at each chapter win? Options: (a) the Loremaster, one line per chapter: `[COPY: seal break ch1, Loremaster = "The roads are clear and a seal breaks. Ahead stands the Ruined Keep."]`, `[COPY: seal break ch2, Loremaster = "The Keep gives up its dead, and a second seal cracks. The Tower waits."]`; (b) the Narrator, one shared line `[COPY: seal break, Narrator]`. Gamewright pick: (a) (Gamewright pick, pending Bob).

> Note (Q-C4-10): the docs use pick (a), the Loremaster per chapter. If Bob picks (b), the Narrator line kept for it is: "A seal breaks. The tower shudders."
