Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 11-reward-and-retreat — The battle's end on screen: reward, retreat and fall

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-14; survival evals last (EV-12 … EV-14).

## Checks

### EV-01 — Reward Reveal
- Requirement: UI-040.
- Method: playwright
- How: win a battle.
- Pass evidence: gold and card on a Reveal.
- Fails if: no Reveal.

### EV-02 — Who takes it is picked on the iPad
- Requirement: UI-040.
- Method: playwright
- How: 2 heroes.
- Pass evidence: iPad lists both; pick gives the card.
- Fails if: auto-given.

### EV-03 — Retreat shows the step-up
- Requirement: UI-039.
- Method: playwright
- How: retreat with a seed that steps the foe up (DEC-555).
- Pass evidence: the foe painting and the line `The foe grows stronger.`; `[data-foe-level]` reads `2 → 3`.
- Fails if: missing.

### EV-04 — Screenshots match
- Requirement: UI-039, UI-040.
- Method: screenshot
- How: board and iPad; mockup `#reward`, `#retreat`, `#fall`.
- Pass evidence: pixel diff under 1% against `#reward`, `#retreat`, `#fall`.
- Fails if: any image over 1% diff.

### EV-05 — The fall screen shows its cost
- Requirement: UI-039, DEC-177.
- Method: playwright
- How: two present heroes holding 25 and 2 gold fall to a level-3 foe.
- Pass evidence: the board shows each fallen hero's name and `It cost 5 gold.` (6 owed, 1 short, DEC-177); the heroes show 22 and 0.
- Fails if: no cost line, or a wrong amount.

### EV-06 — The first Give to press wins
- Requirement: UI-040.
- Method: playwright
- How: 2 iPads press Give to on different heroes 100 ms apart.
- Pass evidence: the card goes to the first press's hero only; the other iPad's buttons disable.
- Fails if: both get the card, or the second wins.

### EV-07 — The toolbar is on every state
- Requirement: every iPad state has the bottom toolbar, "?" at the left and the gear at the right (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright, iPad portrait 768×1024
- How: stop on each state: reward Reveal, Give to {hero}, retreat result, fall result.
- Pass evidence: on each stop `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-08 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play the happy path through reward Reveal, Give to {hero}, retreat result, fall result, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: a Menu or help open is needed.

### EV-09 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (C2-04, C3 rule).
- Method: playwright
- How: on each state (reward Reveal, Give to {hero}, retreat result, fall result) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `reward-and-retreat` and its text is exactly "Tap Give to {hero} on an iPad to choose who takes the card." (Loremaster 2026-10-31); the host receives 0 messages from the iPad while it is open and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows on the board, shows another screen's text, sends a message, pauses the game or changes state.

### EV-10 — Beats auto-advance
- Requirement: no Next on: retreat result, fall result; each advances when its narration or cue ends, or after 4 s when it has no audio (C2-04 rule; Q-C4-17 (Gamewright pick, pending Bob)).
- Method: playwright, fake clock
- How: reach each beat (retreat result, fall result); once with narration (mock audio end event), once with audio off.
- Pass evidence: the iPad shows no Next button; the beat advances on the audio end event, and 4 s (±200 ms) after it shows when there is no audio.
- Fails if: a Next button shows, it advances early, or it waits for a press.

### EV-11 — Narration holds the beat past 4 s
- Requirement: a beat with audio waits for its end event (Q-C4-17 (Gamewright pick, pending Bob)).
- Method: playwright, fake clock
- How: reach each beat (retreat result, fall result) with narration playing; advance the clock 4.5 s with no audio end event.
- Pass evidence: the screen is still on the beat; it advances only after the end event fires.
- Fails if: it advances at 4 s while narration plays.

### EV-12 — The reward Reveal waits for the Give to pick
- Requirement: Gamewright ruling: a screen with a choice waits for that choice.
- Method: playwright, fake clock
- How: reach the reward Reveal with narration ending at once; advance the clock 30 s; then press Give to {hero}.
- Pass evidence: the Reveal is still shown after 30 s; it moves on only after the Give to {hero} press.
- Fails if: it advances without the pick.

## Survival evals (one per survival invariant in plan.md)

### EV-13 — Untaken card survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: quit before pick; Continue.
- Pass evidence: picker again, same card.
- Fails if: card lost.

### EV-14 — A beat interrupted by restart applies once
- Requirement: restart or Continue during an auto-advancing beat (retreat result, fall result) (Q-C4-17 (Gamewright pick, pending Bob)).
- Method: playwright
- How: during each beat, restart the host and Continue.
- Pass evidence: the same beat shows again, or the next one; its effect (gold, card, cut, seal, flag) is applied exactly once in the state log.
- Fails if: the beat is skipped with no effect, or its effect is applied twice.

### EV-15 — The gear comes back closed after a restart
- Requirement: after a restart and Continue on this screen the Menu and any gear panel come back closed, the game is not paused and the toolbar is back (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear.
- Fails if: the Menu or panel reopens, the game stays paused, or the toolbar is missing.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- None.
