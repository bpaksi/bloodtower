Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 10-game-end — The game ends: won or lost, the record and the stats

- Brief: ./plan.md
- Mockup: none
- Risk: High. Restore evals included.

## Checks

### EV-01 — A lost chapter ends the game
- Requirement: MEC-032 .42.
- Method: unit
- How: `game/loop.test.ts`, fixture with `c3_end_after_chapter_1: false`: chapter 2 lost on skulls.
- Pass evidence: the game exits lost; no chapter 3; the loss scene for `skulls` is picked (DEC-144).
- Fails if: the next chapter opens.

### EV-02 — The loss scene matches the way it was lost (Amended 2026-11-14 (PT-02))
- Requirement: DEC-144, DEC-043.
- Method: unit
- How: losses by skulls, by a third corruption, by 4 fallen buildings anywhere on the board, PT-02 (count: Bob approved 2026-10-31, Q-C3-05); EV-10 holds the spread-board runs.
- Pass evidence: each picks its own scene ID.
- Fails if: one loss scene for all.

### EV-03 — The win scene's line follows the last choice
- Requirement: DEC-664 (finale, from C5).
- Method: unit
- How: drive a finished finale through a test fixture that sets each flag.
- Pass evidence: each flag plays its own closing line ID.
- Fails if: the same line for both.

### EV-04 — The record is written
- Requirement: DEC-116, DEC-117.
- Method: unit
- How: two runs with 2 seated heroes: one lost, one won; each with a 30 s pause mid-game.
- Pass evidence: both store start and end time, active length, outcome and how it ended. Loss: each seated hero's played +1, won unchanged. Win: played +1 and won +1. Active length = sum of unpaused time (±1 s), excluding the pause.
- Fails if: the record is not written on a loss, a loss adds a win, or the pause counts toward active length.

### EV-05 — Stats come from stored stats
- Requirement: SCR-019, DEC-627.
- Method: unit
- How: project the stats view after a game.
- Pass evidence: outcome, time played, days, quests done, corruptions taken, gold left and key moments, all read from the event log; after the end, mutate the live state (purse +50, day counter +3) and re-project: the stats view is unchanged.
- Fails if: any stats value changes after the live state is mutated.

### EV-06 — Tonight's games shows the outcome
- Requirement: DEC-214, SCR-021.
- Method: playwright
- How: finish a game (test fixture) and reach the session screen.
- Pass evidence: the row is marked won or lost, not quit.
- Fails if: marked quit.

### EV-07 — The C3 game is won by clearing chapter 1
- Requirement: Q-C3-01 (Bob, 2026-10-31).
- Method: unit
- How: `game/loop.test.ts`, C3 tuning: win chapter 1.
- Pass evidence: the game exits won; the record's outcome is won; each seated hero's won +1; no chapter 2.
- Fails if: chapter 2 opens, or the game is recorded lost or quit.

### EV-10 — Four fallen buildings anywhere lose the game (PT-02)
- Requirement: PT-02 (Gamewright, 2026-11-12): the loss is 4 fallen buildings anywhere on the board, not 4 in one kingdom; replaces DEC-044's wording. `fallenLimit` already counts board-wide (`day/rules.ts`, `day/clock.ts`); this check proves the game end honours it.
- Method: unit
- How: `game/loop.test.ts`, three runs on one seeded board: (a) 4 fallen buildings in 4 different kingdoms (one each); (b) 4 fallen buildings split 2 and 2 across two kingdoms; (c) 3 fallen buildings in 3 different kingdoms, supply above 0.
- Pass evidence: (a) and (b) exit lost with reason `buildings` and pick the buildings loss scene (DEC-144); (c) the game goes on. In no run does a whole kingdom have to fall.
- Fails if: the game needs 4 buildings in one kingdom, counts per kingdom, or loses at 3 fallen.

### EV-11 — One record per game id; a quit stamps it `quit` (PT-03)
- Requirement: PT-03: one record per game id; Quit stamps it `quit` provisionally; quit still writes a record (DEC-218).
- Method: unit
- How: `game/loop.test.ts` plus the session projection: start a game, play 2 days, Quit; read the record list and tonight's games.
- Pass evidence: exactly one record for the game id with outcome `quit`; tonight's row reads quit and Continue is offered (DEC-208, DEC-709); no `played` or `won` count of any seated hero changed (EV-14).
- Fails if: Quit writes no record, writes a second record later, or counts as played.

### EV-12 — Continue reopens the quit record and the final outcome overwrites it (PT-03)
- Requirement: PT-03: Continue reopens the quit game's record; the final outcome overwrites it.
- Method: unit
- How: after EV-11's Quit, Continue, play on, and finish once as won; repeat finishing as lost.
- Pass evidence: the projected record list holds one record for the game id, outcome won (second run: lost); tonight's games shows one row, not two; the earlier `quit` event stays in the append-only log (`appendOnly.test.ts` rule) and is not read as the outcome.
- Fails if: two records for one game id, the row still reads quit, a won game is counted as quit and won, or the log row is deleted or edited in place.

### EV-13 — A new game replaces the autosave: the record stays `quit` (PT-03)
- Requirement: PT-03: the record stays `quit` only if New game or Play again replaces the autosave.
- Method: unit
- How: Quit game A; start a New game (separate run: Play again from A's session screen); finish the new game as won.
- Pass evidence: game A's record is still one record, `quit`; the new game has its own game id and its own record, won; Continue is not offered for A.
- Fails if: A's record turns won or lost, the two games share a record, or A stays continuable.

### EV-14 — Totals and averages count won and lost records only (PT-03)
- Requirement: PT-03: win and loss totals, and the average, count won and lost records only; quit records show in the list.
- Method: unit
- How: seated heroes' totals and the average length over records: won 40 min, lost 30 min, quit 20 min, plus a game quit then continued and won (50 min).
- Pass evidence: each hero's played counts the won, the lost and the continued game once each (3) and not the plain quit; won counts 2; the average is the mean of 40, 30 and 50; all four games still list tonight.
- Fails if: a quit counts as played, the continued game counts twice (once as quit, once as won), or a quit leaves the list.

### EV-15 — The record carries the "best" key (PT-04)
- Requirement: PT-04: "best" is the shortest win keyed by story, length, difficulty and party size.
- Method: unit
- How: finish four won games of one story: Standard, normal, 2 heroes, 40 min; Standard, normal, 4 heroes, 25 min; Short, normal, 2 heroes, 20 min; Standard, hard, 2 heroes, 30 min. Ask the stats read-out for the best of a fifth game (Standard, normal, 2 heroes, 50 min, won).
- Pass evidence: each record stores story, length, difficulty and the count of seated heroes at the start (DEC-116); the best is 40 min (the only earlier win under that whole key).
- Fails if: the best is 20, 25 or 30 (a key field is ignored), or a key field is missing from the record.

### EV-16 — First win under a key reads "this game" (PT-04)
- Requirement: PT-04: the first win shows "Best: this game".
- Method: unit
- How: the stats read-out for a won game that has no earlier won game under its key (other keys have wins, and an earlier loss under its own key).
- Pass evidence: the read-out's best state is `this-game` with no minutes value; the copy slot for it is `[COPY: Best: this game]` in C3/17.
- Fails if: it shows a minutes value from another key or from the earlier loss, or shows `none`.

### EV-17 — A loss, or no earlier win, reads "No win yet to compare" (PT-04)
- Requirement: PT-04 (Bob, 2026-11-14, adopted): "No win yet to compare" only when no win exists under the game's key; a lost game with an earlier win under its key still shows that earlier best.
- Method: unit
- How: the stats read-out for (a) a lost game whose key has no won game; (b) a first game ever; (c) a lost game (Standard, normal, 2 heroes) whose key holds an earlier 40 min win and an earlier 55 min win.
- Pass evidence: (a) and (b) best state `none`, no minutes value, copy slot `[COPY: No win yet to compare]` in C3/17; (c) best state `earlier` with minutes 40 (the shortest earlier win under the key), not `none`, not `this-game`.
- Fails if: (c) reads `none` or "No win yet to compare", shows a minutes value from another key, or (a) or (b) shows `this-game`, a minutes value or a zero.

### EV-18 — The event log records tap counts and the game's active length (PT-10)
- Requirement: PT-10 (Bob, 2026-11-14, adopted): every iPad control-press is logged as a `control-press` event with its kind, so either reading of "tap" can be counted; the event log also records the game's active length (DEC-107).
- Method: unit
- How: `game/loop.test.ts` over the real event log: 2 seated iPads, scripted presses: on day 1 5 flow-button presses, 1 Menu press and 1 help press; on day 2 3 flow-button presses; a 30 s pause on day 2.
- Pass evidence: all 10 presses are logged as `control-press` events, each with a `kind` (flow-button, menu, help); the counts per day (day 1: 7 of all kinds, 5 flow-button; day 2: 3), the game's total 10 and the active length (sum of unpaused time, ±1 s, the pause excluded) all derive from that log, so a rebuilt log gives the same numbers.
- Fails if: a press is not logged, an event has no kind, Menu or help presses are dropped from the log, a count is kept only in memory, a day is missing, the pause counts toward active length, or the total differs from the sum of the days.

### EV-19 — Tap counts and active length continue across a quit and Continue (PT-10, PT-03)
- Requirement: PT-10, PT-03: one game id, one set of counts.
- Method: unit
- How: 4 taps, Quit, restart the host, Continue, 3 more taps, finish.
- Pass evidence: the final record's tap total is 7 and its active length excludes the time between Quit and Continue.
- Fails if: the count restarts at 0 on Continue, the quit's taps are dropped, or the away time counts as active.

### EV-20 — No Long target and no 4-hour warning in 1.0 (PT-10)
- Requirement: PT-10 (Bob, 2026-11-14, adopted): only the Short (about 90 min) and Standard (about 2 h) placeholder targets exist in 1.0, in the tuning file, read-only; no 1.0 screen shows them; the Long target and the 4-hour warning are parked with 1.1.
- Method: unit
- How: read the tuning file's targets; render the settings view, the stats view and the session screen for a solo Standard game and for a Short game.
- Pass evidence: the tuning file holds Short and Standard targets only; no screen view or projection exposes a target value; no warning text or flag is produced for any game length.
- Fails if: a Long target or a 4-hour warning appears, a target is writable from a setting, or any 1.0 screen shows a target.

## Survival evals (one per survival invariant in plan.md)

### EV-08 — No Continue after a finished game
- Requirement: DEC-208, DEC-709.
- Method: unit
- How: finish a game; read the session view.
- Pass evidence: no autosave; Continue absent.
- Fails if: Continue resumes a finished game.

### EV-09 — The record survives a restart
- Requirement: DEC-116.
- Method: unit
- How: finish, restart, rebuild.
- Pass evidence: the record and tonight's row are intact.
- Fails if: the row is lost.

### EV-21 — One record per game id survives a restart between the quit and the final outcome
- Requirement: PT-03; the survival invariant "record survives a restart".
- Method: unit
- How: Quit; restart the host and rebuild from the log; Continue; finish as won; restart and rebuild again.
- Pass evidence: after each rebuild the projected list has one record for the game id: `quit`, then won; tonight's row matches; totals count it once.
- Fails if: a rebuild yields two records, or the quit wins over the later outcome after a rebuild.

## Assumptions surfaced

- The C3 win is chapter 1 won (Q-C3-01). The finale's win lines (EV-03) are tested by fixture until C5.
- PT-03 (Bob, 2026-11-14, adopted): the earlier `quit` row stays in the append-only log; "overwrite" is a projection rule (EV-12); the record the app reads is the latest `game-record` for the game id. A plain quit counts neither as played nor as won (EV-14).
- PT-10 (Bob, 2026-11-14, adopted): every iPad control-press is logged with its kind; "tap counts" are derived from that log, one count per day and a game total, for either reading of "tap" (EV-18).
- PT-02: EV-02 now says "anywhere on the board"; EV-10 is the check that proves it.

## OPEN questions

- ANSWERED Q-C3-01 (Bob, 2026-10-31 10:09 AM ET): clearing chapter 1 counts as the C3 win.
- ANSWERED Q-C3-23 (Bob approved 2026-10-31): the DEC-144 win scene plays, then the Loremaster line `[COPY: chapter 1 win, Loremaster]`. Was: which win scene and line play for the C3 win? DEC-663 and DEC-664 write the win for the finale, after the last choice, which C3 never reaches. Use a placeholder `[COPY: chapter 1 win]`, or the finale's win scene without the line?
- ANSWERED Q-C3-18 (Bob approved 2026-10-31): key moments are quest done, item gained, building fallen, corruption taken, chapter won. Was: "key moments" on the stats screen (SCR-019): which events count as one? No card lists them.
- ANSWERED (PT-10, Bob, 2026-11-14, adopted): the Short and Standard targets live in the tuning file, read-only; no 1.0 screen shows them; the stats screen gets no tap row (EV-20).
- ANSWERED (PT-10, Bob, 2026-11-14, adopted): every control-press is logged with its kind, so Menu and help presses are in the log and either reading of "tap" can be counted (EV-18).
- ANSWERED (PT-04, Bob, 2026-11-14, adopted): a lost game with an earlier win under its key shows the earlier best; "No win yet to compare" only when no win exists under the key (EV-17).
- OPEN (PT-03): records for a game that ended in a loss and is then reopened: not possible (a finished game clears the autosave, EV-08). No action.
