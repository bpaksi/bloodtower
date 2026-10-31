Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 15-chapter-card — The chapter card and the chapter end with the seal break

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Risk: Med.

## Checks

### EV-01 — Chapter card at the start
- Requirement: UI-020.
- Method: playwright
- How: `c3-chapter.spec.ts`: Begin a game.
- Pass evidence: the card for The Roads: painting, name, goal `[COPY: ...]`; no Next on the iPad; it auto-advances.
- Fails if: no card.

### EV-02 — Stamped won, then the seal (C4+ only; not run in C3)
- Requirement: UI-044, DEC-303.
- Method: playwright
- How: fixture with `c3_end_after_chapter_1: false` (in C3 the game ends at chapter 1, Q-C3-01); win chapter 1 with the mock tower; the seed frees 2 skulls.
- Pass evidence (1.0 / C3 checks): card stamped won, the close Scroll, the lit seal prompt, a Reveal of the glyph and its boon. C4+ only (not run in C3, not a 1.0 check): then exactly 2 freed-skull prompts, each a kingdom then a building.
- Fails if: seal before the stamp.

### EV-03 — No seal without the tower
- Requirement: DEC-306.
- Method: playwright
- How: same, without the tower.
- Pass evidence: stamp and close only.
- Fails if: a seal prompt.

### EV-04 — Screenshots match
- Requirement: UI-020, UI-044.
- Method: screenshot
- How: board and iPad at start card, stamped card, seal Reveal; compare with ./mockup.html `#card`, `#stamped`, `#seal`.
- Pass evidence: six images matching.
- Fails if: a part missing.

### EV-05 — C3: stamped card and close Scroll before the outcome
- Requirement: Q-C3-01; (Bob approved 2026-10-31).
- Method: playwright
- How: C3 tuning (`c3_end_after_chapter_1: true`); win chapter 1.
- Pass evidence: in order: the card stamped won, the close Scroll reading exactly "The roads are quiet again.", then the outcome scene (feature 16); no seal prompt, no freed-skull prompt.
- Fails if: the outcome shows first, either step is skipped, or a seal or skull prompt shows.

### EV-06 — Chapter cues play
- Requirement: CUE-004 (chapter start), CUE-005 (chapter won).
- Method: playwright
- How: Begin a game; then win chapter 1 (C3 tuning); read the cue log.
- Pass evidence: CUE-004 fires once with the chapter card; CUE-005 fires once with the stamped card.
- Fails if: either cue is missing, repeated or at the wrong step.

### EV-07 — The next chapter's enter lights its kingdom
- Requirement: MEC-033 .3, DEC-662.
- Method: playwright
- How: fixture with `c3_end_after_chapter_1: false`; win chapter 1 without the tower.
- Pass evidence: after the close, Brynthia is lit on the board and chapter 2's quest tokens (The Barrow, The Shrine) are placed, then chapter 2's card shows.
- Fails if: Brynthia stays dark or tokens are missing.

### EV-08 — The toolbar is on every state
- Requirement: every iPad state of this screen has the bottom toolbar, "?" at the left and the gear at the right (Bob 2026-10-31 10:37 AM ET; Bob 2026-10-31 10:38 AM ET).
- Method: playwright, iPad portrait 768×1024
- How: stop on each state: chapter card, stamped won, close Scroll. (The freed-skulls state is C4+, not in C3.)
- Pass evidence: on each stop, `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-09 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play this screen's happy path through chapter card, stamped won, close Scroll, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: any step can only be reached through the gear or help.

### EV-10 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: on each state (chapter card, stamped won, close Scroll) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `chapter-card` and its text is exactly "This is your chapter goal. Finish it before the days run out." (Loremaster 2026-10-31); the host sends nothing and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows another screen's text, pauses the game or changes state.

### EV-11 — Next-only steps auto-advance
- Requirement: the chapter card, the stamped card and the close Scroll has no Next; it advances when its narration or cue ends, or after 4 s when it has no audio (Bob 2026-10-31 10:38 AM ET).
- Method: playwright, fake clock
- How: reach the chapter card, the stamped card and the close Scroll; once with narration (mock audio end event), once with audio off.
- Pass evidence: the iPad shows no Next button there; the screen advances on the audio end event, and 4 s (±200 ms) after it shows when there is no audio; the step's outcome is the same as the old Next.
- Fails if: a Next button shows, it advances early, or it waits for a press.

### EV-12 — Narrated steps do not advance before their audio ends
- Requirement: a Next-only step with narration advances only on its audio-end event, never on a timer (Bob 2026-10-31 10:38 AM ET).
- Method: playwright, fake clock, mock audio
- How: reach the chapter card, the stamped card or the close Scroll with narration longer than 4.5 s; advance the clock 4.5 s without firing the audio-end event; then fire it.
- Pass evidence: after 4.5 s the iPad and the board are still on the step; it advances only after the audio-end event fires.
- Fails if: the step advances before its audio ends, or does not advance after the audio-end event.

### EV-13 — Restart and Continue during an auto-advancing step apply its effect once
- Requirement: a restart or a Continue during an auto-advancing step resumes that step and applies its effect exactly once (Bob 2026-10-31 10:38 AM ET).
- Method: playwright, fake clock
- How: two runs: (1) on the chapter card, the stamped card or the close Scroll, before it advances, restart the host and Continue; (2) on the same step, quit and Continue from the session screen. In each run let the step advance.
- Pass evidence: in each run the same step shows again and auto-advances once; the chapter step (the chapter number and its cue, CUE-004 or CUE-005) is applied exactly once (host state and event log show one application).
- Fails if: the step is skipped without its effect, repeats its effect, or stalls.

## Survival evals (one per survival invariant in plan.md)

### EV-14 — No replay on Continue
- Requirement: DEC-675.
- Method: playwright
- How: quit on day 2 of chapter 1; Continue.
- Pass evidence: no chapter card.
- Fails if: the card replays.

### EV-15 — The gear Menu survives a restart closed
- Requirement: after a restart and Continue on this screen, the Menu and any gear panel come back closed, the game is not paused, the toolbar is back on every iPad, and every item's enabled state is recomputed (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen, open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear; the Menu's enabled and disabled items and reasons match those before the restart.
- Fails if: the Menu or panel reopens, the game stays paused, the toolbar is missing, or item states are stale.

## Assumptions surfaced

- None beyond the cards cited.

## OPEN questions

- ANSWERED Q-C3-17 (Bob approved 2026-10-31): the base pack supplies the boons and the app picks; The Ruined Keep names none in 1.0. (which boons)
