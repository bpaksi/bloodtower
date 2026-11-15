Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 05-move-back-fix-position — Back undoes a move-map tap until a trigger fires; "Fix my position" in the gear

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: High

Unit tests sit beside `apps/bloodtower/src/engine/loops/group-turn/loop.ts` (or in `day.test.ts`). E2E: `apps/bloodtower/src/e2e/tests/w7-move-map.spec.ts` or a new spec beside it, iPad 768x1024 portrait. The test story has a plain neighbour space and a neighbour whose arrival starts an encounter (the Ambush case in the playtest).

## Checks

### EV-01 — Back reverts a tap on a quiet space
- Requirement: PT-19, Q5.2 (Bob, 2026-11-14, adopted): each Back press reverts one tap, until a trigger plays.
- Method: unit
- How: group on space S with 3 moves; tap a plain neighbour N (no trigger); press Back.
- Pass evidence: the group's space is S; moves left 3; the offers are the same as before the tap; one log entry says the tap was undone.
- Fails if: the group stays on N, the move is not returned, or the offers show N's neighbours. The repeat case is EV-26.

### EV-02 — No Back after a trigger
- Requirement: PT-19 and DEC-209: after a trigger plays, Back is gone; a trigger is never undone.
- Method: unit
- How: tap a neighbour whose arrival starts an encounter; play it to its outcome; look at the offers and send a Back press.
- Pass evidence: no `back` offer on the move map; the forced Back press is refused; the group stays on the trigger space; moves left and the outcome are unchanged.
- Fails if: Back is still offered, or the press undoes a tap that fired a trigger.

### EV-03 — The tap before the trigger, in a mixed sequence
- Requirement: PT-19: Back works for taps made before the trigger only.
- Method: unit
- How: tap plain space P1, then Back (to S), then tap the trigger space T.
- Pass evidence: after the Back the group is on S with the original moves; after T fires, no Back is offered; the log shows tap, undo, tap, trigger in that order.
- Fails if: the undo log keeps the earlier undone tap, or lets Back reach past the trigger.

### EV-04 — Luck never re-rolls
- Requirement: DEC-209: Back never re-rolls; PT-19 keeps it.
- Method: unit
- How: record `rngSeq` and the day roll before a plain tap; tap; Back; read both again; then tap the same space again.
- Pass evidence: `rngSeq` and the day's roll for the group are equal at every point; the second tap gives the same result as the first.
- Fails if: Back draws from or rewinds the stream, or re-rolls the day's moves.

### EV-05 — Back is not offered when there is nothing to undo
- Requirement: PT-19: Back reverts a tap; with no tap it is absent or disabled, never an error.
- Method: playwright
- How: start a group's turn and open the iPad before any tap.
- Pass evidence: the Back control is absent or disabled with no toast and no logged error; after one tap it is enabled.
- Fails if: Back is enabled at turn start, or pressing it logs an error or moves the group.

### EV-06 — Fix my position moves the recorded space, free and silent
- Requirement: PT-19, Q5.3 (Bob, 2026-11-14, adopted): the gear's Game board setup gains "Fix my position": it moves the group's recorded space, charges nothing, fires nothing, logs a correction.
- Method: unit
- How: after a trigger fired on T (no Back possible), apply the correction to a neighbour N of T for the group, with 2 moves left.
- Pass evidence: the group's space is N; moves left 2; no encounter, event or foe starts; no hero stat changes; the event log has one `correction` entry with the group and the from and to spaces; the board shows one line naming the correction, equal to the Copy table's `board.fix-position-done` with that hero and space filled in.
- Fails if: it costs a move, starts the arrival trigger of N, changes hit points or gold, leaves no log entry, or shows no board line. A far space is EV-31.

### EV-07 — The gear panel carries the control
- Requirement: PT-19; DEC-229: Game board setup (gear item 2) shows "Fix my position" beside the piece check.
- Method: playwright
- How: open the gear, then Game board setup, on the iPad.
- Pass evidence: the panel still lists the setup steps and the piece check; a "Fix my position" control is present; picking a group and a space (any space of the board is offered, not only neighbours) and pressing Done updates the board's piece placement text and the move map offers for the new space.
- Fails if: the control is missing, or it removes the piece check.

### EV-08 — A bad correction is refused with its code
- Requirement: root error rule: every error is logged and shown with its code.
- Method: unit
- How: send a correction for a space id that does not exist and one for a group id that does not exist.
- Pass evidence: no state change; one error each, logged with its code, shown as a Story board toast; the iPad shows the error with the same code.
- Fails if: the correction is dropped without a log, or it moves the group anyway.

### EV-09 — Move map screenshot
- Requirement: the Back control sits where the toolbar order puts it (PT-23: Back and Replay centre).
- Method: screenshot
- How: iPad 768x1024 portrait after one plain tap; compare side by side with ./mockup.html section `#move-map`.
- Pass evidence: both images attached; neighbour picks, End turn and the toolbar order "?" left, Back and Replay centre, gear right.
- Fails if: Back is missing after a tap, or the toolbar order differs.

### EV-10 — Fix my position screenshot
- Requirement: the gear panel looks as drafted (Gamewright draft; the Illusionist replaces it).
- Method: screenshot
- How: iPad 768x1024 portrait, Game board setup open, Fix my position picked; compare side by side with ./mockup.html section `#fix-position`.
- Pass evidence: both images attached; setup list, the control, group pick, space pick, Done in the same order; the text slots show the Loremaster text from step 45 (Copy rows 7 to 12) and no placeholder text from `mockup.html` reaches the screen.
- Fails if: a pick or Done is missing, or placeholder text shows.

### EV-11 — No tower command
- Requirement: CLAUDE.md tower safety.
- Method: unit
- How: mock tower linked; a tap, Back, and a correction.
- Pass evidence: zero commands received.
- Fails if: any command is sent.

### EV-26 — Back repeats to the turn start
- Requirement: Q5.2 (Bob, 2026-11-14, adopted): each press undoes one tap, back to the turn start.
- Method: unit
- How: group on S with 4 moves; tap plain P1, P2, P3; press Back three times; press Back a fourth time.
- Pass evidence: after press 1 the group is on P2 with 2 moves left, after 2 on P1 with 3, after 3 on S with 4; the fourth press is refused (no `back` offer, no state change, no error logged); one log entry per undone tap; `rngSeq` is the same throughout.
- Fails if: Back undoes only the last tap and then vanishes, undoes all taps at once, or goes before the turn start.

### EV-27 — Back stops at the last trigger
- Requirement: Q5.1, Q5.2: Back repeats back to the last trigger and no further.
- Method: unit
- How: tap plain P1, then trigger space T (an encounter, played to its outcome), then plain P2 and P3; press Back until refused.
- Pass evidence: two presses work (P3 to P2, P2 to T); the third is refused; the group stays on T; the encounter is not replayed and its outcome is unchanged.
- Fails if: Back reaches P1 or undoes the trigger.

### EV-28 — Enter and End turn close the window; the last move does not
- Requirement: Q5.1 (Bob, 2026-11-14, adopted).
- Method: unit
- How: three cases. (a) tap a plain space, press Enter on a building there, then return to the move map. (b) tap a plain space, press End turn, then start the group's next turn. (c) with 1 move left tap a plain space (the last move).
- Pass evidence: in (a) and (b) no Back is offered and a forced Back press is refused; in (c) Back is offered and returns the group to its space with 1 move left.
- Fails if: Enter or End turn leaves Back available, or spending the last move removes it.

### EV-29 — Quest and event arrivals are triggers too
- Requirement: Q5.1: a trigger is any arrival that starts an encounter, event, foe or quest scene.
- Method: unit
- How: four test spaces, each whose arrival starts one of: an encounter, an event, a foe, a quest scene; for each, tap it and read the offers.
- Pass evidence: for all four no Back is offered after the scene starts and a forced Back press is refused.
- Fails if: any one of the four kinds leaves Back available.

### EV-30 — "Fix my position" runs only on the move map or between loops
- Requirement: Q5.3 (Bob, 2026-11-14, adopted): not during a battle, scene or building menu; no limit.
- Method: unit
- How: send a correction in each state: a battle, an open scene, a building menu, the move map, and between loops; then apply three corrections in a row on the move map.
- Pass evidence: refused in the first three with one logged error each, shown with its code and as a Story board toast, and no state change; accepted in the last two; the three in a row are all accepted, each logged.
- Fails if: it is accepted during a battle, scene or building menu, or a limit stops the second or third.

## Survival evals (one per survival invariant in plan.md)

### EV-21 — Continue keeps the undo window
- Requirement: the recorded space, moves left and undo log survive Continue.
- Method: playwright
- How: tap a quiet neighbour, quit, Continue, press Back.
- Pass evidence: after Continue the group is on the tapped space with moves minus one; Back returns it to S with the move.
- Fails if: Continue clears the undo log or the group's space.

### EV-22 — A played trigger is not replayed or undone after Continue
- Requirement: no Back after a trigger, also after Continue.
- Method: playwright
- How: tap the trigger space, play it, quit, Continue.
- Pass evidence: no Back offered; the trigger does not play again; the outcome is as before.
- Fails if: Continue offers Back again or replays the arrival.

### EV-23 — Stream position unchanged by Back
- Requirement: luck never re-rolls (DEC-209).
- Method: unit
- How: as EV-04, then save, restore and compare `rngSeq`.
- Pass evidence: equal before the tap, after Back and after restore.
- Fails if: any differs.

### EV-24 — A correction survives Continue and costs nothing
- Requirement: the correction is in the event log and charges no move.
- Method: unit
- How: apply a correction, save, restore from the log.
- Pass evidence: the restored group is on the corrected space with the same moves left; the log has the one `correction` entry; no trigger entry follows it.
- Fails if: a replay of the log drops the correction or fires a trigger on the corrected space.

### EV-25 — Hero state untouched
- Requirement: Back and a correction change no hit points, gold, items or corruptions.
- Method: unit
- How: snapshot hero sheets; run a tap, Back, a correction; snapshot again.
- Pass evidence: the two snapshots are equal.
- Fails if: any hero stat differs.

### EV-31 — A correction may go to any space
- Requirement: Q5.3: any space, not only a neighbour.
- Method: unit
- How: group on S; apply a correction to a space four steps away that is not reachable by its own taps, and to a space on another kingdom.
- Pass evidence: each time the group's recorded space is the chosen space, moves left unchanged, no trigger fires, one `correction` entry logged with the from and to spaces.
- Fails if: the correction is limited to neighbours or to the tap history's reach.

## Assumptions surfaced

- What counts as a trigger; Back repeats; the valid spaces for a correction; where it may run; no limit → decided, Q5.1 to Q5.3 (Bob, 2026-11-14, adopted) and pinned by EV-26 to EV-31.
- The PT-19 DEC id → step 43 (#469); not invented here.
- All copy, including the board's correction line, is in the Loremaster Copy table in plan.md (step 45, filled 2026-11-15); EV-10 requires that text. Row 13 is a DRAFT until Gamewright rules on greyed or refused.
