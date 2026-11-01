Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 09-finale-and-endings — The last choice and the two endings on screen

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-14; survival evals last (EV-12 … EV-14).

## Checks

### EV-01 — Both options on every iPad
- Requirement: DEC-663.
- Method: playwright
- How: 3 heroes.
- Pass evidence: 2 buttons each.
- Fails if: fewer.

### EV-02 — Tie re-vote shown (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C5-03.
- Method: playwright
- How: split vote.
- Pass evidence: `[COPY: tie, vote again = "A tie. Vote once more."]` then a second vote.
- Fails if: no re-vote.

### EV-03 — Line for the flag
- Requirement: DEC-664.
- Method: playwright
- How: each flag.
- Pass evidence: the matching `[COPY: finale win, ...]`.
- Fails if: wrong.

### EV-04 — No credits (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C5-09.
- Method: playwright
- How: win.
- Pass evidence: outcome right after the line.
- Fails if: extra step.

### EV-05 — Screenshots match
- Requirement: SCR-018.
- Method: screenshot
- How: mockup `#vote`, `#shattered`, `#holds`.
- Pass evidence: pixel diff under 1% against `#vote`, `#shattered`, `#holds`.
- Fails if: any image over 1% diff.

### EV-06 — The win line is voiced
- Requirement: Q-C5-07 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Method: playwright
- How: win with `seal_broken`.
- Pass evidence: the board plays audio asset `vo.loremaster.finale_win_shattered` and shows the line; the beat auto-advances on its end.
- Fails if: silent, or another clip.

### EV-07 — The toolbar is on every state
- Requirement: every iPad state has the bottom toolbar, "?" at the left and the gear at the right (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: (iPad portrait 768×1024) stop on each state: vote, tie re-vote, voted and waiting, win line.
- Pass evidence: on each stop `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-08 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play the happy path through vote, tie re-vote, voted and waiting, win line, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: a Menu or help open is needed.

### EV-09 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (C2-04, C3 rule).
- Method: playwright
- How: on each state (vote, tie re-vote, voted and waiting, win line) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `finale-and-endings` and its text is exactly "Each hero taps Shatter the shard or Swear the oath. A tie means one more vote, then the app draws." (Loremaster 2026-10-31); the host receives 0 messages from the iPad while it is open and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows on the board, shows another screen's text, sends a message, pauses the game or changes state.

### EV-10 — Beats auto-advance
- Requirement: no Next on: win line; each advances when its narration or cue ends, or after 4 s when it has no audio (C2-04 rule; Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
- Method: playwright
- How: (fake clock) reach each beat (win line); once with narration (mock audio end event), once with audio off.
- Pass evidence: the iPad shows no Next button; the beat advances on the audio end event, and 4 s (±200 ms) after it shows when there is no audio.
- Fails if: a Next button shows, it advances early, or it waits for a press.

### EV-11 — Narration holds the beat past 4 s
- Requirement: a beat with audio waits for its end event (Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
- Method: playwright
- How: (fake clock) reach each beat (win line) with narration playing; advance the clock 4.5 s with no audio end event.
- Pass evidence: the screen is still on the beat; it advances only after the end event fires.
- Fails if: it advances at 4 s while narration plays.

## Survival evals (one per survival invariant in plan.md)

### EV-12 — Votes survive Continue; the outcome shows once
- Requirement: DEC-675.
- Method: playwright
- How: 1 vote, quit, Continue; finish; then reload after the outcome.
- Pass evidence: the vote is kept; after the reload the outcome scene is entered exactly once (1 `outcome.shown` event).
- Fails if: the vote is lost, or 2 `outcome.shown` events.

### EV-13 — A beat interrupted by restart applies once
- Requirement: restart or Continue during an auto-advancing beat (win line) (Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
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

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Resolved Q-C5-03 **[Bob taste call]**: Who makes the last choice in the Tower (DEC-663)? Options: (a) each present hero votes on their iPad; a tie re-votes once, then the seeded draw (DEC-011) breaks it; (b) the hero who struck the last blow chooses; (c) the vote must be unanimous; it repeats until it is. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C5-07 **[Bob taste call]**: Which lines are voiced in 1.0 (DEC-349)? Options: (a) the Loremaster's lines only (chapter cards, seal breaks, the two win lines, the loss); (b) none; all text on Scrolls. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C5-09 **[Bob taste call]**: After a finale win line, before the outcome scene: Options: (a) nothing extra: the win line, then the outcome scene; (b) a short credits Scroll `[COPY: credits]`. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

> Note (Q-C5-09): the pick is (a), no credits Scroll, so `[COPY: credits]` is not folded. If Bob picks (b): "Blood Tower: The Ruined Keep. Thank you for playing." (Credits line not folded.)
