Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 12-event-scene — The event scene: the painting, the words and the choice

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Risk: Low.

## Checks

### EV-01 — Hazard: two costs on the iPad
- Requirement: DEC-027, UI-041.
- Method: playwright
- How: `c3-event.spec.ts` with a seed that draws a hazard.
- Pass evidence: board: the painting and a Scroll; iPad: two cost buttons; after pressing the hit-point cost the board shows the cost line `−2 hit points each` and each present hero's hit points drop by 2 on the hero panel.
- Fails if: the cost is applied with no choice.

### EV-02 — Foes: Go around and Pay them off, no Fight
- Requirement: DEC-023.
- Method: playwright
- How: seed that draws foes.
- Pass evidence: two choices, Go around and Pay them off; no Fight button, enabled or disabled (Q-C3-02); Pay them off shows its cost from `events.pay_off` = 5 gold (Bob approved 2026-10-31) and is disabled at purse 4, enabled at purse 5.
- Fails if: Go around missing, a Fight button shows, or Pay them off is enabled below 5 gold.

### EV-03 — Only present heroes' iPads choose
- Requirement: DEC-019, MEC-003.
- Method: playwright
- How: 2 groups; group B in the wild.
- Pass evidence: group B's iPads show the choice; group A's show the waiting line.
- Fails if: an absent hero can press.

### EV-04 — Quiet shows a mood line only
- Requirement: MEC-072 .2.
- Method: playwright
- How: seed for quiet.
- Pass evidence: a Scroll, no cost and no Next; it auto-advances (EV-13).
- Fails if: a cost dialog shows.

### EV-05 — Screenshots match
- Requirement: UI-041.
- Method: screenshot
- How: board and iPad at the hazard and foes states; compare with ./mockup.html `#hazard`, `#foes`.
- Pass evidence: four images matching.
- Fails if: a part out of order.

### EV-06 — Windfall shows a Reveal
- Requirement: UI-036, DEC-029.
- Method: playwright
- How: seed for windfall, 2-hero group.
- Pass evidence: the board shows a Reveal with "+5 gold"; purse +5 on the edge band; iPad body shows no buttons; it auto-advances.
- Fails if: no Reveal, or the amount differs.

### EV-07 — The counter saved them
- Requirement: DEC-027.
- Method: playwright
- How: seed for plague with a present Healer.
- Pass evidence: the board shows the saved state `[COPY: counter saved]`; no buttons in the iPad body (it auto-advances); no hit points change.
- Fails if: cost buttons show or a cost applies.

### EV-08 — Disaster: Go around and Pay them off, no Fight
- Requirement: DEC-028, Q-C3-02.
- Method: playwright
- How: seed that draws a disaster.
- Pass evidence: exactly two choices, Go around and Pay them off; no Fight, enabled or disabled.
- Fails if: Fight shows, or either choice is missing.

### EV-09 — Two iPads press different choices: first wins
- Requirement: DEC-019.
- Method: playwright
- How: 2 present heroes on two iPads at a hazard; press cost 1 on iPad A then cost 2 on iPad B within 200 ms.
- Pass evidence: cost 1 is applied once; iPad B's press changes nothing; both iPads move on to the same next step.
- Fails if: both costs apply, or cost 2 wins.

### EV-10 — The toolbar is on every state
- Requirement: every iPad state of this screen has the bottom toolbar, "?" at the left and the gear at the right (Bob 2026-10-31 10:37 AM ET; Bob 2026-10-31 10:38 AM ET).
- Method: playwright, iPad portrait 768×1024
- How: stop on each state: event Scroll, Quiet, cost pick, Reveal, result.
- Pass evidence: on each stop, `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-11 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play this screen's happy path through event Scroll, Quiet, cost pick, Reveal, result, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: any step can only be reached through the gear or help.

### EV-12 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: on each state (event Scroll, Quiet, cost pick, Reveal, result) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `event-scene` and its text is exactly "Something happened on the road. Make a choice if one is shown; the scene moves on by itself." (Loremaster 2026-10-31); the host sends nothing and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows another screen's text, pauses the game or changes state.

### EV-13 — Next-only steps auto-advance
- Requirement: Quiet and the result step after a pick has no Next; it advances when its narration or cue ends, or after 4 s when it has no audio (Bob 2026-10-31 10:38 AM ET).
- Method: playwright, fake clock
- How: reach Quiet and the result step after a pick; once with narration (mock audio end event), once with audio off.
- Pass evidence: the iPad shows no Next button there; the screen advances on the audio end event, and 4 s (±200 ms) after it shows when there is no audio; the step's outcome is the same as the old Next.
- Fails if: a Next button shows, it advances early, or it waits for a press.

### EV-14 — Narrated steps do not advance before their audio ends
- Requirement: a Next-only step with narration advances only on its audio-end event, never on a timer (Bob 2026-10-31 10:38 AM ET).
- Method: playwright, fake clock, mock audio
- How: reach Quiet or the result step after a pick with narration longer than 4.5 s; advance the clock 4.5 s without firing the audio-end event; then fire it.
- Pass evidence: after 4.5 s the iPad and the board are still on the step; it advances only after the audio-end event fires.
- Fails if: the step advances before its audio ends, or does not advance after the audio-end event.

### EV-15 — Restart and Continue during an auto-advancing step apply its effect once
- Requirement: a restart or a Continue during an auto-advancing step resumes that step and applies its effect exactly once (Bob 2026-10-31 10:38 AM ET).
- Method: playwright, fake clock
- How: two runs: (1) on Quiet or the result step after a pick, before it advances, restart the host and Continue; (2) on the same step, quit and Continue from the session screen. In each run let the step advance.
- Pass evidence: in each run the same step shows again and auto-advances once; the event result (its gold, HP or item change) is applied exactly once (host state and event log show one application).
- Fails if: the step is skipped without its effect, repeats its effect, or stalls.

## Survival evals (one per survival invariant in plan.md)

### EV-16 — Continue keeps the open event
- Requirement: DEC-675.
- Method: playwright
- How: quit at a hazard's choice; Continue.
- Pass evidence: the same painting and two costs.
- Fails if: a new event.

### EV-17 — The gear Menu survives a restart closed
- Requirement: after a restart and Continue on this screen, the Menu and any gear panel come back closed, the game is not paused, the toolbar is back on every iPad, and every item's enabled state is recomputed (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen, open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear; the Menu's enabled and disabled items and reasons match those before the restart.
- Fails if: the Menu or panel reopens, the game stays paused, the toolbar is missing, or item states are stale.

## Assumptions surfaced

- None beyond the cards cited.

## OPEN questions

- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4.
- ANSWERED Q-C3-03 (Bob approved 2026-10-31): in 1.0 people events offer rumour and trick only; the people weight stays 10. (people offers in 1.0)
