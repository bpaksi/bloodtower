Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 17-game-stats — Game stats: the game in numbers

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Risk: Low.

## Checks

### EV-01 — Every stat in order
- Requirement: SCR-019, DEC-627.
- Method: playwright
- How: `c3-stats.spec.ts` after fixture `c3-stats-loss` (lost on skulls, active 42 min, 12 days, 1 quest done, 2 corruptions taken, 7 gold left).
- Pass evidence: in this order: outcome "Lost", time played "42 min", days 12, quests done 1, corruptions taken 2, gold left 7, key moments (contents wait on Q-C3-18), active length "42 min" with best and average (values per EV-03), then the rating; the key-moments list sits outside the row order (it is not counted as a row and its place is not checked against the rows); there is no "Skulls on the board" row; the iPad buttons are, in DOM order, "Play again" then "Back".
- Fails if: a stat is missing, out of order, or differs from the fixture; the Outcome row or the average is missing; a "Skulls on the board" row shows; or Back comes before Play again.

### EV-02 — The rating never blocks Play again or Back
- Requirement: SCR-019.
- Method: playwright
- How: with no rating, press Back; reach the screen again and press Play again.
- Pass evidence: Back lands on the session screen; Play again starts Pick setup for the same story; neither needs a rating.
- Fails if: Back or Play again is disabled, or a Next button shows.

### EV-03 — Best and average
- Requirement: DEC-116.
- Method: unit
- How: three stored won games of this story with active lengths 40, 50 and 60 min, plus one lost game of 30 min; view the 50-min game.
- Pass evidence: best 40 min (shortest winning game, (Bob approved 2026-10-31)); average 45 min (mean of all four finished games: 40, 50, 60, 30); this game 50 min.
- Fails if: best is 30 (a loss) or 60, the average is wrong, or only this game shows.

### EV-04 — Drill-in shows the same stats
- Requirement: SCR-021, C2 07.
- Method: playwright
- How: from tonight's games, open the game.
- Pass evidence: the same numbers and the rating given.
- Fails if: different numbers.

### EV-05 — Screenshots match
- Requirement: SCR-019.
- Method: screenshot
- How: board and iPad; compare with ./mockup.html `#s=0`.
- Pass evidence: two images matching.
- Fails if: a part out of order.

### EV-06 — No Seals broken stat in C3
- Requirement: Q-C3-01 (no seal breaks in C3); DEC-627.
- Method: unit
- How: project the stats view after a C3 game won on chapter 1, and after one lost.
- Pass evidence: no Seals broken row, label or zero value in either.
- Fails if: Seals broken shows, even as 0.

### EV-07 — Drill-in Play again and Back
- Requirement: C2 07, SCR-021.
- Method: playwright
- How: from tonight's games open a finished game; press Back; open it again; press Play again.
- Pass evidence: Back returns to the session screen; Play again starts Pick setup for the same story with the same heroes.
- Fails if: either button is missing or goes elsewhere.

### EV-08 — The toolbar is on every state
- Requirement: every iPad state of this screen has the bottom toolbar, "?" at the left and the gear at the right (Bob 2026-10-31 10:37 AM ET; Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: (iPad portrait 768×1024) stop on each state: stats, rating, drill-in.
- Pass evidence: on each stop, `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-09 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play this screen's happy path through stats, rating, drill-in, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: any step can only be reached through the gear or help.

### EV-10 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: on each state (stats, rating, drill-in) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `game-stats` and its text is exactly "Here's how tonight went. Rate it if you like, then tap Play again." (Loremaster 2026-10-31); the host sends nothing and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows another screen's text, pauses the game or changes state.

### EV-13 — Best is the shortest win under the whole key (PT-04)
- Requirement: PT-04: "best" is the shortest win keyed by story, length, difficulty and party size (narrows the comparison set of the 2026-10-31 approval to DEC-116's key plus party size).
- Method: unit
- How: stored won games of one story: Standard, normal, 2 heroes, 40 min; Standard, normal, 4 heroes, 25 min; Short, normal, 2 heroes, 20 min; Standard, hard, 2 heroes, 30 min. View a won Standard, normal, 2-hero game of 50 min.
- Pass evidence: best reads 40 min; the "best" figure for that game is never 20, 25 or 30.
- Fails if: any one key field is left out of the comparison.

### EV-14 — First win shows "Best: this game" (PT-04)
- Requirement: PT-04: the first win shows "Best: this game".
- Method: playwright
- How: `c3-stats.spec.ts`: fixture where the viewed game is the only win under its key (wins under other keys and a loss under its own key exist).
- Pass evidence: on board and iPad the length line carries `[COPY: Best: this game]` (Copy table `stats.best.first`) and no best minutes figure; the average still shows.
- Fails if: a minutes figure from another key shows, the line is missing, or the "No win yet" text shows.

### EV-15 — No earlier win shows "No win yet to compare" (PT-04)
- Requirement: PT-04 (Bob, 2026-11-14, adopted): "No win yet to compare" shows only when no win exists under the game's key; a lost game with an earlier win under its key shows that earlier best (keeps approved EV-01).
- Method: playwright
- How: fixtures: (a) a lost game whose key has no won game; (b) a first game ever (lost); (c) a lost game whose key holds an earlier 40 min win (the `c3-stats-loss` fixture of EV-01).
- Pass evidence: (a) and (b) the length line carries `[COPY: No win yet to compare]` (Copy table `stats.best.none`), with no minutes figure and no "Best: this game"; (c) the length line shows the earlier best (40 min) and the average, and neither `[COPY: No win yet to compare]` nor `[COPY: Best: this game]`.
- Fails if: (a) or (b) shows a zero, a dash, a blank, or "Best: this game"; (c) shows "No win yet to compare" or hides the earlier best because the game was lost.

### EV-16 — The average uses the same key and counts won and lost only (PT-03, PT-04)
- Requirement: PT-03, PT-04: the average uses the same key and counts won and lost games; quit games are listed but not counted.
- Method: unit
- How: one key: won 40, 50, 60 min, lost 30 min, a quit 20 min, and a won 10 min game of another party size. View the 50-min game.
- Pass evidence: average 45 min (40, 50, 60, 30); the quit and the other-key game are not in it.
- Fails if: the quit is counted (average 40), or the other key is counted.

### EV-17 — A quit then continued then won game shows once, as Won (PT-03)
- Requirement: PT-03: one record per game id; the final outcome overwrites the quit.
- Method: playwright
- How: Quit a game, Continue, win it; open tonight's games and drill in; also check the stats screen straight after the win.
- Pass evidence: one row for the game, marked won; the drill-in shows "Outcome: Won" (Copy table `stats.outcome.won`) and the same numbers as the stats screen; no second row reads quit.
- Fails if: two rows, a row reads quit, or the drill-in shows quit data.

### EV-18 — Time played is the record's active length, and no tap row is added (PT-10)
- Requirement: PT-10 (Bob, 2026-11-14, adopted): the game's active length and every control-press (with its kind) are logged (C3/10 EV-18); the Short and Standard targets sit read-only in the tuning file and no 1.0 screen shows them; the stats screen gets no tap row and its approved rows stay.
- Method: unit
- How: project the stats view for a game with a 30 s pause and 12 logged control-presses of mixed kinds (flow-button, menu, help); read "Time played", the row list and every rendered string for the tuning-file targets.
- Pass evidence: "Time played" equals the record's active length (pause excluded); the row list is exactly the EV-01 list, with no tap-count row and no row, line or hint showing a target or the 12 presses.
- Fails if: Time played is wall-clock time, a row not in EV-01 appears, a tap count shows, or a Short or Standard target shows.

### EV-19 — Screenshots of the two best-line states match
- Requirement: PT-04.
- Method: screenshot
- How: board 1920×1080 and iPad 768×1024 portrait for the first-win state and the no-win state; compare with ./mockup.html `#best-first` and `#best-none` (the Illusionist adds both; mockup.html is not edited by the brief PR).
- Pass evidence: four images; the length line, its position in the row order and its words (from the Copy table) match.
- Fails if: the line is missing or out of place, or the mockup state ids are missing.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — The rating is kept
- Requirement: SCR-019.
- Method: unit
- How: two iPads rate 4 and 2 (Q-C3-21 per iPad); restart the host; drill in.
- Pass evidence: both ratings are stored per iPad and shown as "4 · 2" (one value per iPad, in seat order).
- Fails if: a rating is lost, averaged into one, or only the last kept.

### EV-12 — The gear Menu survives a restart closed
- Requirement: after a restart and Continue on this screen, the Menu and any gear panel come back closed, the game is not paused, the toolbar is back on every iPad, and every item's enabled state is recomputed (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen, open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear; the Menu's enabled and disabled items and reasons match those before the restart.
- Fails if: the Menu or panel reopens, the game stays paused, the toolbar is missing, or item states are stale.

### EV-20 — Best, average and the best-line state survive a restart
- Requirement: PT-03, PT-04.
- Method: unit
- How: stats view for the EV-13, EV-14 and EV-15 fixtures; restart the host and rebuild from the log; project again.
- Pass evidence: identical best, average and best-line state before and after.
- Fails if: any value changes, or a rebuild drops the key fields.

## Assumptions surfaced

- Each iPad gives its own rating (Q-C3-21, Bob approved 2026-10-31).
- PT-04: the key's "length" is the Short or Standard setting and "party size" is the count of heroes seated at the start; both come from the record (C3/10 EV-15).
- PT-10 (Bob, 2026-11-14, adopted): the stats screen shows no tap count (EV-18). The tap log is in the event log only (C3/10 EV-18).

## OPEN questions

- ANSWERED Q-C3-18 (Bob approved 2026-10-31): key moments are quest done, item gained, building fallen, corruption taken, chapter won. (key moments)
- ANSWERED Q-C3-21 (Bob approved 2026-10-31): the fun rating is per iPad, shown per seat.
- ANSWERED (PT-04, Bob, 2026-11-14, adopted): a lost game with an earlier win under its key shows the earlier best; "No win yet to compare" only when no win exists under the key (EV-15, EV-01).
- ANSWERED (PT-10, Bob, 2026-11-14, adopted): the stats screen gets no tap row; the targets are read-only in the tuning file (EV-18).
- OPEN (PT-04, copy; Loremaster to confirm, Bob 2026-11-14 adopted: Loremaster's layout call in step 45): how the two new lines sit with `stats.length` ("Length: {L} (best {B} · average {A})") is a Loremaster layout call (step 45).
