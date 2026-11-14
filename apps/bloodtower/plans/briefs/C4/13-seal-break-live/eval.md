Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 13-seal-break-live — The seal break live on the board, chapters 1 and 2

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-24; survival evals last (EV-14 … EV-16, EV-23).

## Checks

### EV-01 — Order: stamp, Scroll, card, seal, glyph, Done, skulls (Amended 2026-11-14 (PT-21))
- Requirement: UI-044.
- Method: playwright
- How: tower; win chapter 1.
- Pass evidence: the event log holds, in order: `chapter.stamp`, `scroll.shown`, `chapter.card` (chapter 2, the story first, PT-21), then `seal.broken`, `glyph.revealed` (right after the seal break, a story beat; Bob, 2026-11-14, adopted), `table.done`, and last `skulls.placed` (the freed-skull picks come after Set the table's Done; Bob, 2026-11-14, adopted; Gamewright to confirm), each exactly once; none of the last four comes before `chapter.card`.
- Fails if: any event missing, doubled or out of order, the stamp is not first, `glyph.revealed` waits until after `table.done`, `skulls.placed` comes before `table.done`, or a chore comes before the next chapter's card.

### EV-02 — Chapter's own seal line (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C4-10.
- Method: playwright
- How: win chapters 1 and 2.
- Pass evidence: two different seal lines (Copy table: seal.line.1, seal.line.2).
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

### EV-05 — Seal broken confirms the tower's seal (Amended 2026-11-14 (PT-21))
- Requirement: plan: the iPad confirms which seal broke on the tower.
- Method: playwright
- How: (tower mock) win chapter 1; tower mock reports seal 2 broken; in Set the table tick the seal row and press Done.
- Pass evidence: after Done the state records `seal_broken: 2`; the glyph Reveal is seal 2's glyph.
- Fails if: the state records another seal, or a seal is recorded for a row that was not ticked (EV-24).

### EV-06 — The toolbar is on every state (Amended 2026-11-14 (PT-21))
- Requirement: every iPad state has the bottom toolbar, "?" at the left and the gear at the right (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: (iPad portrait 768×1024) stop on each state: close Scroll, Set the table, glyph and boon Reveal, skull kingdom pick, skull building pick.
- Pass evidence: on each stop `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-07 — The happy path never needs the gear (Amended 2026-11-14 (PT-21))
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play the happy path through close Scroll, Set the table, glyph and boon Reveal, skull kingdom pick, skull building pick, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: a Menu or help open is needed.

### EV-08 — Help matches this screen (Amended 2026-11-14 (PT-21))
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (C2-04, C3 rule).
- Method: playwright
- How: on each state (close Scroll, Set the table, glyph and boon Reveal, skull kingdom pick, skull building pick) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `seal-break-live` and its text is exactly "Tap Seal broken once the tower's seal breaks. Then pick a kingdom and a building for each freed skull and tap Place skull." (Loremaster 2026-10-31); the host receives 0 messages from the iPad while it is open and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows on the board, shows another screen's text, sends a message, pauses the game or changes state.

### EV-09 — Beats auto-advance
- Requirement: no Next on: close Scroll, glyph and boon Reveal; each advances when its narration or cue ends, or after 4 s when it has no audio (C2-04 rule; Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
- Method: playwright
- How: (fake clock) reach each beat (close Scroll, glyph and boon Reveal); once with narration (mock audio end event), once with audio off.
- Pass evidence: the iPad shows no Next button; the beat advances on the audio end event, and 4 s (±200 ms) after it shows when there is no audio.
- Fails if: a Next button shows, it advances early, or it waits for a press.

### EV-10 — Narration holds the beat past 4 s
- Requirement: a beat with audio waits for its end event (Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
- Method: playwright
- How: (fake clock) reach each beat (close Scroll, glyph and boon Reveal) with narration playing; advance the clock 4.5 s with no audio end event.
- Pass evidence: the screen is still on the beat; it advances only after the end event fires.
- Fails if: it advances at 4 s while narration plays.

### EV-11 — Seal names
- Requirement: Loremaster copy (2026-10-31).
- Method: playwright
- How: break seals 1, 2 and 3 in a fixture.
- Pass evidence: the lit seal is named exactly "The Road Seal", "The Keep Seal", "The Warden's Seal" in turn.
- Fails if: any other text.

### EV-12 — Skull picks list 4 kingdoms and 5 buildings
- Requirement: DEC-226, DEC-579.
- Method: playwright
- How: break a seal that frees 1 skull.
- Pass evidence: kingdom buttons `Arisilon (N)`, `Brynthia (E)`, `Durnin (S)`, `Zenon (W)`; then building buttons Citadel, Sanctuary, Village, Bazaar, Tavern.
- Fails if: any missing, extra or misnamed button.

### EV-13 — The Seal broken title is the seal's name (Amended 2026-11-14 (PT-21))
- Requirement: Gamewright ruling; Loremaster seal names.
- Method: playwright
- How: break seals 1, 2 and 3 in a fixture; stop on Set the table each time.
- Pass evidence: the seal row reads exactly "The Road Seal", "The Keep Seal", "The Warden's Seal" in turn.
- Fails if: a generic title or a wrong name.

### EV-17 — Set the table holds the lit seal, the freed skulls and the quest tokens, with one Done (PT-21)
- Requirement: PT-21 (1.0 half): one check per chore and one Done; same step as C3/15 EV-17, now with the tower on.
- Method: playwright
- How: (tower mock) win chapter 1 with 2 skulls freed; after chapter 2's card read Set the table; tick each row; press Done once; then make the 2 skull picks.
- Pass evidence: rows in order: the seal (named per EV-13), the freed skulls (count 2), chapter 2's quest tokens; one Done; one `table.done` event after Done, then the 2 kingdom-then-building picks (separate choices, EV-03, not rows; they come after Done), then chapter 2 day 1.
- Fails if: a chore is its own step, a row is missing or extra, a skull pick comes before Done, or more than one Done is needed.

### EV-18 — No 1.1 chores (PT-21)
- Requirement: PT-21 (1.0 half): no glyph confirm, no drum turn, no traitor step.
- Method: playwright
- How: same fixture; list the rows and the steps after chapter 2's card.
- Pass evidence: none of glyph confirm, drum or traitor appears as a row or a step. The glyph and boon Reveal of EV-01 is a story beat, not a confirm.
- Fails if: any of the three shows.

### EV-19 — Set the table waits for Done
- Requirement: PT-21; C2/04: a physical-confirm step keeps its Done.
- Method: playwright
- How: (fake clock) reach Set the table; advance 30 s.
- Pass evidence: still there; ends only on Done.
- Fails if: it advances on a timer.

### EV-20 — Chapter 2's win does the same for chapter 3
- Requirement: PT-21.
- Method: playwright
- How: win chapter 2 with the tower; read the order.
- Pass evidence: stamped, close Scroll, chapter 3's card (The Tower), then Set the table with the seal named "The Keep Seal", then chapter 3 day 1.
- Fails if: chores come before chapter 3's card, or chapter 1's rows repeat.

### EV-21 — Without the tower no seal row shows
- Requirement: DEC-306; PT-21.
- Method: playwright
- How: chapter 1 won with no tower.
- Pass evidence: Set the table lists the quest tokens only; no seal and no skull row; one Done.
- Fails if: a seal or skull row shows.

### EV-22 — Screenshots of Set the table with the seal match
- Requirement: PT-21.
- Method: screenshot
- How: board 1920×1080 and iPad 768×1024 portrait; compare with ./mockup.html `#set-table-seal` (the Illusionist adds it; mockup.html is not edited by the brief PR).
- Pass evidence: pixel diff under 1% against `#set-table-seal`; rows in order, one Done.
- Fails if: over 1% diff, or the mockup id is missing.

### EV-24 — Done is not gated on the rows (PT-21, QA.2)
- Requirement: PT-21 (Bob, 2026-11-14, adopted): Done is not gated on ticking every Set the table row; the rows are an aid and Done is the one primary button.
- Method: playwright
- How: (tower mock) win chapter 1 with 2 skulls freed; at Set the table tick no row and read Done; press it. Repeat ticking only the quest tokens row.
- Pass evidence: Done is enabled from the start in both runs; one press ends the step (one `table.done`); no seal is recorded as broken from an unticked seal row (`seal_broken` absent in the first run); the skull picks still follow Done.
- Fails if: Done is disabled until every row is ticked, a row blocks Done, or an unticked seal row is recorded as confirmed.

## Survival evals (one per survival invariant in plan.md)

### EV-14 — Skull placement survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: place 1 of 2, quit, Continue.
- Pass evidence: prompt for skull 2.
- Fails if: restart at 1.

### EV-15 — A beat interrupted by restart applies once
- Requirement: restart or Continue during an auto-advancing beat (close Scroll, glyph and boon Reveal) (Q-C4-17 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)).
- Method: playwright
- How: during each beat, restart the host and Continue.
- Pass evidence: the same beat shows again, or the next one; its effect (gold, card, cut, seal, flag) is applied exactly once in the state log.
- Fails if: the beat is skipped with no effect, or its effect is applied twice.

### EV-16 — The gear comes back closed after a restart
- Requirement: after a restart and Continue on this screen the Menu and any gear panel come back closed, the game is not paused and the toolbar is back (C3 rule, Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear.
- Fails if: the Menu or panel reopens, the game stays paused, or the toolbar is missing.

### EV-23 — A restart in Set the table resumes it and records the seal once
- Requirement: DEC-675; PT-21.
- Method: playwright
- How: tick the seal row, restart the host, Continue, press Done.
- Pass evidence: Set the table shows again; chapter 2's card does not replay; the state holds `seal_broken: 2` once and the glyph boon once; one `table.done`.
- Fails if: the seal is recorded twice, the card replays, or the step is skipped.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.
- PT-21: the "Seal broken" press of EV-05 is now the seal check inside Set the table; the `seal_broken` value is recorded when Done is pressed, for a ticked seal row only (EV-24; not ruled in terms, the reading that fits "Done is not gated"). Edited in place and marked Amended 2026-11-14 (PT-21): EV-01, EV-05, EV-06, EV-07, EV-08, EV-13.
- PT-21 (Bob, 2026-11-14, adopted): the glyph and boon Reveal stays right after the seal break as a story beat (EV-01); the ruling lists the glyph confirm as a 1.1 chore, so the Reveal is not one.

## OPEN questions

- Resolved Q-C4-10 **[Bob taste call]**: Who speaks the seal-break line at each chapter win? Options: (a) the Loremaster, one line per chapter: "The roads are clear, and a seal breaks like an old oath giving way. Ahead stands the Ruined Keep." (Copy table: seal.line.1), "The Keep gives up its dead, and a second seal cracks. The Tower waits." (Copy table: seal.line.2), "The last stand holds, and the third seal breaks. Only the Warden remains." (Copy table: seal.line.3); (b) the Narrator, one shared line "A seal breaks. The tower shudders.". Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

> Note (Q-C4-10): the docs use pick (a), the Loremaster per chapter. If Bob picks (b), the Narrator line kept for it is: "A seal breaks. The tower shudders."
- ANSWERED (PT-21, Bob, 2026-11-14, adopted; Gamewright to confirm): the freed-skull picks come after Set the table's Done (EV-01, EV-17).
- ANSWERED (PT-21, Bob, 2026-11-14, adopted): Done is not gated on ticking every row (EV-24).
- OPEN (PT-21, copy; Loremaster to confirm, adopted by Bob 2026-11-14): Loremaster rewrites `button.seal-broken` as the row label and `help.seal-break-live` for the checklist in step 45.
