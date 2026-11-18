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
- Pass evidence: the card for The Roads: painting, name "The Roads", goal "Hear the herald in Greyford. Then open the forest road."; no Next on the iPad; it auto-advances.
- Fails if: no card.

### EV-02 — Stamped won, then the seal (C4+ only; not run in C3) (Amended 2026-11-14 (PT-21))
- Requirement: UI-044, DEC-303.
- Method: playwright
- How: fixture with `c3_end_after_chapter_1: false` (in C3 the game ends at chapter 1, Q-C3-01); win chapter 1 with the mock tower; the seed frees 2 skulls.
- Pass evidence: 1.0 / C3 checks: card stamped won, the close Scroll, then chapter 2's card, then Set the table with the lit seal as a check (PT-21), and the Reveal of the glyph and its boon right after the seal break as a story beat, not held to the end of the step (Bob, 2026-11-14, adopted). C4+ only (not run in C3, not a 1.0 check): then Done, and only after Done exactly 2 freed-skull prompts, each a kingdom then a building (Bob, 2026-11-14, adopted; Gamewright to confirm).
- Fails if: seal before the stamp, the stamp is not first, the Reveal waits until after Done, or a freed-skull prompt shows before Set the table's Done.

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
- Pass evidence: after the close, Brynthia is lit on the board and chapter 2's card shows; then Set the table lists chapter 2's quest tokens (The Barrow, The Shrine), which the table places (PT-21; the tokens are in the state from chapter 2's enter).
- Fails if: Brynthia stays dark or tokens are missing.

### EV-08 — The toolbar is on every state
- Requirement: every iPad state of this screen has the bottom toolbar, "?" at the left and the gear at the right (Bob 2026-10-31 10:37 AM ET; Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: (iPad portrait 768×1024) stop on each state: chapter card, stamped won, close Scroll. (The freed-skulls state is C4+, not in C3.)
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
- Method: playwright
- How: (fake clock) reach the chapter card, the stamped card and the close Scroll; once with narration (mock audio end event), once with audio off.
- Pass evidence: the iPad shows no Next button there; the screen advances on the audio end event, and 4 s (±200 ms) after it shows when there is no audio; the step's outcome is the same as the old Next.
- Fails if: a Next button shows, it advances early, or it waits for a press.

### EV-12 — Narrated steps do not advance before their audio ends
- Requirement: a Next-only step with narration advances only on its audio-end event, never on a timer (Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: (fake clock, mock audio) reach the chapter card, the stamped card or the close Scroll with narration longer than 4.5 s; advance the clock 4.5 s without firing the audio-end event; then fire it.
- Pass evidence: after 4.5 s the iPad and the board are still on the step; it advances only after the audio-end event fires.
- Fails if: the step advances before its audio ends, or does not advance after the audio-end event.

### EV-13 — Restart and Continue during an auto-advancing step apply its effect once
- Requirement: a restart or a Continue during an auto-advancing step resumes that step and applies its effect exactly once (Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: (fake clock) two runs: (1) on the chapter card, the stamped card or the close Scroll, before it advances, restart the host and Continue; (2) on the same step, quit and Continue from the session screen. In each run let the step advance.
- Pass evidence: in each run the same step shows again and auto-advances once; the chapter step (the chapter number and its cue, CUE-004 or CUE-005) is applied exactly once (host state and event log show one application).
- Fails if: the step is skipped without its effect, repeats its effect, or stalls.

### EV-16 — Story first, then one "Set the table" step (PT-21)
- Requirement: PT-21 (1.0 half): the chapter end shows the story first, then one "Set the table" step; no chore comes before the next chapter's card.
- Method: playwright
- How: `c3-chapter.spec.ts`: fixture with `c3_end_after_chapter_1: false` (C3 itself ends at chapter 1), mock tower; win chapter 1; read the step order from the event log and the iPad.
- Pass evidence: in order: stamped won, close Scroll, chapter 2's card (The Keep) with its opening, then `table.shown` (Set the table), then `table.done`, then chapter 2 day 1. No seal check, skull prompt or token prompt appears before chapter 2's card.
- Fails if: any chore step shows before chapter 2's card, or Set the table never shows.

### EV-17 — Set the table holds one check per 1.0 chore and one Done (PT-21)
- Requirement: PT-21: one check per chore (lit seal, freed skulls, quest tokens) and one Done; physical-confirm steps keep their Done (C2/04). Done is not gated on the rows (EV-24).
- Method: playwright
- How: same spec: (a) tower mock, seal breaks, 0 skulls freed; (b) no tower. Read the rows, tick them, press Done; count iPad presses from chapter 2's card to day 1.
- Pass evidence: (a) rows: the lit seal, then chapter 2's quest tokens naming The Barrow and The Shrine; (b) rows: the quest tokens only (DEC-306: no seal row). The freed-skulls row shows only when skulls were freed (C4+; not run in C3). Each row is one check; there is one Done; one Done press ends the step and day 1 starts (exactly one `table.done` event); no per-chore step in between.
- Fails if: a chore has its own step and press, a seal row shows with no tower, a quest token is missing or extra, or two Done presses are needed.

### EV-18 — No 1.1 chores in 1.0 (PT-21)
- Requirement: PT-21 (1.0 half): the glyph confirm, drum turn and traitor step are parked with 1.1.
- Method: playwright
- How: same fixtures as EV-17; list every row of Set the table.
- Pass evidence: no glyph, drum or traitor row; no step with those words before or after Set the table.
- Fails if: any of them shows.

### EV-19 — Set the table waits for Done
- Requirement: PT-21; C2/04's rule: a physical-confirm step keeps its Done and never auto-advances.
- Method: playwright
- How: (fake clock) reach Set the table with the audio off; advance 30 s.
- Pass evidence: still on Set the table; no `tick.auto` line; it ends only on Done.
- Fails if: it advances on a timer or audio end.

### EV-20 — The step's words come from the Copy table
- Requirement: PT-21; Copy table rows 19–24 (step 45).
- Method: playwright
- How: read the title, each row label, the Done label and the help text on the iPad and the board.
- Pass evidence: each equals its Copy table row (`table.title`, `table.row.seal`, `table.row.tokens`, `table.row.skulls`, `table.done`, `help.set-the-table`); no `[COPY:` text reaches a screen.
- Fails if: a placeholder, an invented word or a missing label shows.

### EV-21 — Set the table has the toolbar and its own help
- Requirement: every iPad state has the bottom toolbar, "?" left and gear right (Bob 2026-10-31 10:37 AM ET); help does not pause and sends nothing.
- Method: playwright
- How: (iPad portrait 768×1024) on Set the table: check the toolbar; press "?", then Close.
- Pass evidence: `footer.bt-bar--bottom` visible, first control "?", last the gear; the sheet's `data-help-screen` is `set-the-table` with the Copy table text; `paused` unchanged; the same state shows after Close.
- Fails if: the toolbar is missing, help shows another screen's text, or help pauses.

### EV-22 — Screenshots of Set the table match
- Requirement: PT-21.
- Method: screenshot
- How: board 1920×1080 and iPad 768×1024 portrait, with the seal row and without; compare with ./mockup.html `#set-table` and `#set-table-no-tower` (the Illusionist adds both; mockup.html is not edited by the brief PR).
- Pass evidence: four images; title, rows in order (seal, skulls, tokens), one Done, matching the mockup.
- Fails if: rows are out of order, a second button shows, or the mockup ids are missing.

### EV-24 — Done is not gated on the rows (PT-21, QA.2)
- Requirement: PT-21 (Bob, 2026-11-14, adopted): Done is not gated on ticking every Set the table row; the rows are an aid and Done is the one primary button.
- Method: playwright
- How: same spec and fixtures as EV-17: (a) reach Set the table with the tower mock and tick no row; (b) reach it again and tick only the quest tokens row; in each run read Done's enabled state, then press it.
- Pass evidence: in (a) and (b) Done is enabled from the moment the step shows; one press ends the step (exactly one `table.done` event) and chapter 2 day 1 starts; unticked rows leave no error and no second prompt.
- Fails if: Done is disabled, greyed or hidden until all rows are ticked, a row blocks Done, or a second press is needed.

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

### EV-23 — A restart in Set the table resumes it, applying nothing twice (PT-21)
- Requirement: DEC-675; PT-21.
- Method: playwright
- How: (fake clock) reach Set the table, restart the host, Continue; then press Done.
- Pass evidence: Set the table shows again; chapter 2's card does not replay; chapter 2's quest tokens exist once in the state; one `table.done` event after Done.
- Fails if: the card replays, the tokens are placed twice, or Done is lost.

## Assumptions surfaced

- None beyond the cards cited.
- PT-21 (Bob, 2026-11-14, adopted): the stamp stays first (EV-05, EV-02). Stamp, then close Scroll stays the order of EV-05 (Bob approved 2026-10-31). The playtest text lists the close Scroll first; the ruling does not reorder them.
- PT-21: in C3 itself (`c3_end_after_chapter_1: true`) the game ends at chapter 1, so Set the table is built and tested behind the switch with fixtures, like EV-02 and EV-07.
- EV-02 and EV-07 changed in place: the lit seal and the quest tokens move from before chapter 2's card to Set the table after it.

## OPEN questions

- ANSWERED Q-C3-17 (Bob approved 2026-10-31): the base pack supplies the boons and the app picks; The Ruined Keep names none in 1.0. (which boons)
- ANSWERED (PT-21, Bob, 2026-11-14, adopted): Done is not gated on ticking every row (EV-24).
- ANSWERED (PT-21, Bob, 2026-11-14, adopted): the glyph and boon Reveal (DEC-303) stays right after the seal break as a story beat (EV-02; C4/13 EV-01). The seal confirm is the Set the table row `{seal}` (Copy table `table.row.seal`). C3/15 help for the checklist is `help.set-the-table`; C4/13's `help.seal-break-live` is rewritten in the same pass.
- ANSWERED (PT-21, Bob, 2026-11-14, adopted; Gamewright to confirm): the freed-skull picks come after Set the table's Done (EV-02; C4 only).
