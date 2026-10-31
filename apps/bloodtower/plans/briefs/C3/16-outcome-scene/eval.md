Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 16-outcome-scene — The outcome scene: win or loss

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Risk: Med.

## Checks

### EV-01 — The loss scene for skulls
- Requirement: DEC-144.
- Method: playwright
- How: `c3-outcome.spec.ts`: a seeded game run to an empty supply (fixture shortens the supply).
- Pass evidence: scene id `loss-skulls`, its Painting and `[COPY: ...]` narration; exactly one summary line matching `/^\d+ days\. \d+ quests done\. \d+ skulls on the board\.$/` with the fixture's numbers; iPads Next only.
- Fails if: a Done button, another scene id, or the summary does not match.

### EV-02 — The corruption loss
- Requirement: DEC-676.
- Method: playwright
- How: third corruption in a scene.
- Pass evidence: the corruption loss scene at once.
- Fails if: the day finishes first.

### EV-03 — Each win ending
- Requirement: DEC-664.
- Method: playwright
- How: fixture-driven finale with each flag.
- Pass evidence: two different closing lines.
- Fails if: the same line.

### EV-04 — Screenshots match
- Requirement: SCR-018.
- Method: screenshot
- How: board and iPad at win and loss; compare with ./mockup.html `#win`, `#loss`.
- Pass evidence: four images matching.
- Fails if: a part missing.

### EV-05 — The C3 win scene
- Requirement: Q-C3-01; Q-C3-23 (Bob approved 2026-10-31).
- Method: playwright
- How: C3 tuning; win chapter 1.
- Pass evidence: in order: the DEC-144 win scene (scene id `win`) plays, then the Loremaster line `[COPY: chapter 1 win, Loremaster]` (DEC-232), then the summary line; no Next.
- Fails if: a loss scene, no scene, the Loremaster line is missing or comes before the scene, a finale line (DEC-663/664) shows, or no summary.

### EV-06 — The outcome auto-advances to Game stats
- Requirement: SCR-018, DEC-627.
- Method: playwright, fake clock
- How: on any outcome scene, fire the narration's audio-end event, then advance the clock while the summary line holds.
- Pass evidence: the summary line holds 4 s (±200 ms on the fake clock) after the audio-end event; then every device moves to Game stats (feature 17) for this game.
- Fails if: it goes to the session screen, stays, or the hold is outside 3.8–4.2 s.

### EV-07 — The defeat light plays on a loss
- Requirement: CUE-003.
- Method: playwright
- How: run to the skulls loss; then run to a C3 win; read the cue log.
- Pass evidence: CUE-003 fires once with the loss scene; it does not fire on the win.
- Fails if: missing on the loss, or fired on the win.

### EV-08 — The toolbar is on every state
- Requirement: every iPad state of this screen has the bottom toolbar, "?" at the left and the gear at the right (Bob 2026-10-31 10:37 AM ET; Bob 2026-10-31 10:38 AM ET).
- Method: playwright, iPad portrait 768×1024
- How: stop on each state: win scene, loss scene, summary line.
- Pass evidence: on each stop, `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-09 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play this screen's happy path through win scene, loss scene, summary line, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: any step can only be reached through the gear or help.

### EV-10 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: on each state (win scene, loss scene, summary line) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `outcome-scene` and its text is exactly "The chapter is over. See how it ended; the game stats come next." (Loremaster 2026-10-31); the host sends nothing and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows another screen's text, pauses the game or changes state.

### EV-11 — Next-only steps auto-advance
- Requirement: the outcome scene and its summary line has no Next; it advances when its narration or cue ends, or after 4 s when it has no audio (Bob 2026-10-31 10:38 AM ET).
- Method: playwright, fake clock
- How: reach the outcome scene and its summary line; once with narration (mock audio end event), once with audio off.
- Pass evidence: the iPad shows no Next button there; the screen advances on the audio end event, and 4 s (±200 ms) after it shows when there is no audio; the step's outcome is the same as the old Next.
- Fails if: a Next button shows, it advances early, or it waits for a press.

### EV-12 — Narrated steps do not advance before their audio ends
- Requirement: a Next-only step with narration advances only on its audio-end event, never on a timer (Bob 2026-10-31 10:38 AM ET).
- Method: playwright, fake clock, mock audio
- How: reach the outcome scene or its summary line with narration longer than 4.5 s; advance the clock 4.5 s without firing the audio-end event; then fire it.
- Pass evidence: after 4.5 s the iPad and the board are still on the step; it advances only after the audio-end event fires.
- Fails if: the step advances before its audio ends, or does not advance after the audio-end event.

### EV-13 — Restart and Continue during an auto-advancing step apply its effect once
- Requirement: a restart or a Continue during an auto-advancing step resumes that step and applies its effect exactly once (Bob 2026-10-31 10:38 AM ET).
- Method: playwright, fake clock
- How: two runs: (1) on the outcome scene or its summary line, before it advances, restart the host and Continue; (2) on the same step, quit and Continue from the session screen. In each run let the step advance.
- Pass evidence: in each run the same step shows again and auto-advances once; the game result (one finished game recorded; one move to Game stats) is applied exactly once (host state and event log show one application).
- Fails if: the step is skipped without its effect, repeats its effect, or stalls.

## Survival evals (one per survival invariant in plan.md)

### EV-14 — Restart on the outcome
- Requirement: DEC-116.
- Method: playwright
- How: restart the host on the outcome scene.
- Pass evidence: the session screen, the game listed won or lost.
- Fails if: the game shows as in progress.

### EV-15 — The gear Menu survives a restart closed
- Requirement: after a restart and Continue on this screen, the Menu and any gear panel come back closed, the game is not paused, the toolbar is back on every iPad, and every item's enabled state is recomputed (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen, open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear; the Menu's enabled and disabled items and reasons match those before the restart.
- Fails if: the Menu or panel reopens, the game stays paused, the toolbar is missing, or item states are stale.

## Assumptions surfaced

- In C3 the win is reached by clearing chapter 1 (Q-C3-01); the two finale lines (EV-03) are reached by fixture until C5.

## OPEN questions

- ANSWERED Q-C3-01 (Bob, 2026-10-31 10:09 AM ET): clearing chapter 1 counts as the C3 win.
- ANSWERED Q-C3-23 (Bob approved 2026-10-31): the DEC-144 win scene plays, then the Loremaster line `[COPY: chapter 1 win, Loremaster]`. Was: which win scene and line play for the C3 win? DEC-663 and DEC-664 write the win for the finale, after the last choice, which C3 never reaches. Use a placeholder `[COPY: chapter 1 win]`, or the finale's win scene without the line?
