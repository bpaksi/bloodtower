Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 08-boss-screen — The Warden on screen: phases and the tower show

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-12; survival evals last (EV-10 … EV-12).

## Checks

### EV-01 — Phase painting changes (Gamewright pick, pending Bob)
- Requirement: Q-C5-02.
- Method: playwright
- How: cross 2/3.
- Pass evidence: painting 2.
- Fails if: same.

### EV-02 — Board-only show without tower (Gamewright pick, pending Bob)
- Requirement: Q-C5-08.
- Method: playwright
- How: no tower; cross a phase.
- Pass evidence: painting change, shake, board sound.
- Fails if: nothing.

### EV-03 — Tower show with tower
- Requirement: DEC-327.
- Method: playwright
- How: tower; arrival and each phase.
- Pass evidence: 3 shows sent.
- Fails if: missing.

### EV-04 — Screenshots match
- Requirement: UI-026.
- Method: screenshot
- How: mockup `#phase1`..`#phase3`.
- Pass evidence: pixel diff under 1% against `#phase1`, `#phase2`, `#phase3`.
- Fails if: any image over 1% diff.

### EV-05 — The toolbar is on every state
- Requirement: every iPad state has the bottom toolbar, "?" at the left and the gear at the right (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright, iPad portrait 768×1024
- How: stop on each state: Warden arrives, round picking, phase 2 show, phase 3 show, Warden falls.
- Pass evidence: on each stop `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-06 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play the happy path through Warden arrives, round picking, phase 2 show, phase 3 show, Warden falls, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: a Menu or help open is needed.

### EV-07 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (C2-04, C3 rule).
- Method: playwright
- How: on each state (Warden arrives, round picking, phase 2 show, phase 3 show, Warden falls) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `boss-screen` and its text is exactly "The Warden's last battle. Pick Fight or Retreat on your iPad, then your action." (Loremaster 2026-10-31); the host receives 0 messages from the iPad while it is open and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows on the board, shows another screen's text, sends a message, pauses the game or changes state.

### EV-08 — Beats auto-advance
- Requirement: no Next on: phase show, round result, The Warden falls; each advances when its narration or cue ends, or after 4 s when it has no audio (C2-04 rule; Q-C4-17 (Gamewright pick, pending Bob)).
- Method: playwright, fake clock
- How: reach each beat (phase show, round result, The Warden falls); once with narration (mock audio end event), once with audio off.
- Pass evidence: the iPad shows no Next button; the beat advances on the audio end event, and 4 s (±200 ms) after it shows when there is no audio.
- Fails if: a Next button shows, it advances early, or it waits for a press.

### EV-09 — Narration holds the beat past 4 s
- Requirement: a beat with audio waits for its end event (Q-C4-17 (Gamewright pick, pending Bob)).
- Method: playwright, fake clock
- How: reach each beat (phase show, round result, The Warden falls) with narration playing; advance the clock 4.5 s with no audio end event.
- Pass evidence: the screen is still on the beat; it advances only after the end event fires.
- Fails if: it advances at 4 s while narration plays.

### EV-10 — The Warden's Melee and Humanoid chips show
- Requirement: DEC-688, UI-026.
- Method: playwright
- How: open the boss battle.
- Pass evidence: exactly 2 `[data-foe-trait]` chips: Melee, Humanoid.
- Fails if: missing or other chips.

### EV-11 — "The Warden falls" waits for its narration
- Requirement: Gamewright ruling: The Warden falls auto-advances when its narration ends.
- Method: playwright, fake clock
- How: win the last round with narration playing; advance the clock 4.5 s with no audio end event, then fire it.
- Pass evidence: still on "The Warden falls" at 4.5 s; advances only after the end event.
- Fails if: it advances before narration ends, or shows a Next.

## Survival evals (one per survival invariant in plan.md)

### EV-12 — Phase redrawn after Continue
- Requirement: DEC-675.
- Method: playwright
- How: phase 3, quit, Continue.
- Pass evidence: phase 3 painting.
- Fails if: phase 1.

### EV-13 — A beat interrupted by restart applies once
- Requirement: restart or Continue during an auto-advancing beat (phase show, round result, The Warden falls) (Q-C4-17 (Gamewright pick, pending Bob)).
- Method: playwright
- How: during each beat, restart the host and Continue.
- Pass evidence: the same beat shows again, or the next one; its effect (gold, card, cut, seal, flag) is applied exactly once in the state log.
- Fails if: the beat is skipped with no effect, or its effect is applied twice.

### EV-14 — The gear comes back closed after a restart
- Requirement: after a restart and Continue on this screen the Menu and any gear panel come back closed, the game is not paused and the toolbar is back (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear.
- Fails if: the Menu or panel reopens, the game stays paused, or the toolbar is missing.

### EV-15 — A restart during "The Warden falls" applies the win once
- Requirement: Gamewright ruling; restart or Continue during an auto-advancing beat.
- Method: playwright
- How: during "The Warden falls", restart the host and Continue.
- Pass evidence: "The Warden falls" or the next beat shows; `boss.defeated` appears exactly once in the state log.
- Fails if: the beat is skipped with no win, or the win is applied twice.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C5-02 **[Bob taste call]**: The Warden's three phases (DEC-567): three paintings or one? Options: (a) three paintings, one per phase; (b) one painting, darkening at each phase. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C5-08: The boss's full tower show (DEC-567, DEC-327) with no tower connected: Options: (a) a board-only show: the painting change, a shake and the sound on the board speakers; (b) skip the show. Gamewright pick: (a) (Gamewright pick, pending Bob).
