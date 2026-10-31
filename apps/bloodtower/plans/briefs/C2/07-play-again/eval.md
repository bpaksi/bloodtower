Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C2 / 07-play-again — Play again and a quit game's stats

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: High. Seed and restore evals included (EV-04, EV-11, EV-12).

## Checks

### EV-01 — A game in the list drills in to its stats
- Requirement: a game in tonight's list drills in to its stats (SCR-021, DEC-629).
- Method: playwright
- How: new `c2-play-again.spec.ts`, "drill in to a quit game": play 2 days (walk, enter one building, record the skull drop at the end of each day), then quit on day 3; on the session screen pick that game on the iPad.
- Pass evidence: the board shows the game's stats: title "Game 1", story "Proving Grounds", Outcome 'quit', time played, quit on day 3, moves taken (the sum of the walks made), buildings entered 1, skull drops recorded 2 (one per day ended). The iPad offers Play again and Back. For a quit game, time played reads "—" (Bob 2026-10-31, as in the mockup).
- Fails if: the counts do not match the game played, or the drill-in happens on the board.

### EV-02 — Unrecorded values show as unavailable
- Requirement: unknown values are shown as unavailable, never as zero (root CLAUDE.md).
- Method: unit
- How: engine view test "stats before the first skull prompt": a game quit on day 1 before the day's skull prompt, and a game quit after one.
- Pass evidence: the first reads skull drops `unavailable`; the second reads 1. Time played for a quit game reads "—" (Bob 2026-10-31).
- Fails if: the first game shows 0.

### EV-03 — Play again keeps the story, settings and heroes
- Requirement: Play again keeps the story, length and difficulty and the heroes; it skips Pick story and Game settings (DEC-708).
- Method: playwright
- How: same spec: from the stats, Play again (no autosave, so no confirm).
- Pass evidence: the next screen is claim-heroes with the same heroes held by the same iPads, prefilled; one Confirm press confirms. Then setup runs its pack steps again, then Begin. Pick story and Game settings never show.
- Fails if: claims start empty, or Game settings shows.

### EV-04 — Play again takes a new seed
- Requirement: Play again's seed is new, so the world and the draws differ (DEC-708).
- Method: unit
- How: engine test "play again gets a new seed": two Play agains from the same game.
- Pass evidence: three different seeds (the original and two new); same story id, settings and held heroes in all three. No view carries a seed (DEC-217).
- Fails if: the seed repeats, or shows in a view.

### EV-05 — An iPad that left loses its prefill
- Requirement: the claims come prefilled where the same iPads are joined (DEC-216).
- Method: playwright
- How: same spec: two iPads holding two heroes each; close one iPad; Play again.
- Pass evidence: the remaining iPad's two heroes are prefilled; the other two are unclaimed and claimable; the Confirm press is closed until all four are held.
- Fails if: the left iPad's heroes stay claimed with no device.

### EV-06 — Play again asks before replacing the autosave
- Requirement: while an autosave exists, Play again asks before it replaces it (DEC-709).
- Method: playwright
- How: same spec: with an autosave from another quit game, Play again; answer No, then Yes.
- Pass evidence: No keeps the autosave and returns to the stats. Yes goes to claim-heroes; the old autosave is replaced at the new game's Begin.
- Fails if: Play again replaces the save without asking.

### EV-07 — Back returns to the session screen
- Requirement: the stats are a drill-in from the session screen (SCR-021).
- Method: playwright
- How: same spec: from the stats press Back.
- Pass evidence: the session screen, unchanged (Continue still first if there was an autosave).
- Fails if: Back goes anywhere else.

### EV-08 — Screenshots match the mockup
- Requirement: the stats drill-in and the prefilled claims (SCR-019 slice, DEC-216; mockup).
- Method: screenshot
- How: screenshot the board at 1920×1080 and an iPad at 1024×768 on the stats and on the prefilled claim step; compare side by side with ./mockup.html mockup.html#s=N (tab names per EV-13 and EV-15).
- Pass evidence: four images attached, matching rows and buttons.
- Fails if: a row or button is missing.

### EV-13 — Stats screen matches mockup (M "Game stats")
- Requirement: SCR-019 slice per the mockup.
- Method: playwright
- How: (board 1920×1080, iPad 768×1024) open a quit game from the list.
- Pass evidence: board title = the list label ("Game N"); rows "Outcome" = "quit", "Time played" = "—" for a quit game (Bob 2026-10-31), every slice stat row from EV-01; an unrecorded value renders "unavailable" (never "0" or blank; "—" only for Time played on a quit game); board 0 buttons. iPad body buttons "Play again" (primary), "Back", plus an optional 1–5 fun rating that never blocks.
- Fails if: a row is missing, an unrecorded value is not "unavailable", or the rating blocks Play again.

### EV-14 — Play again confirm (M "Replace-save confirm")
- Requirement: DEC-709.
- Method: playwright
- How: Play again with an autosave.
- Pass evidence: line "This replaces the saved game. Are you sure?"; buttons "Play again" (primary), "Back"; Back = EV-06 decline.
- Fails if: labels differ.

### EV-15 — Prefilled claims (M "Claim heroes, prefilled")
- Requirement: DEC-216.
- Method: playwright
- How: Play again with one iPad gone.
- Pass evidence: each hero held by this iPad is selected and marked "this iPad"; a hero whose iPad left reads "unclaimed"; counter `/^\d+ of \d+ picked$/`; one primary "Confirm" button, disabled until all heroes are held; board shows the same counter.
- Fails if: label differs or Confirm is enabled early.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Continue after Play again resumes the new game's seed
- Requirement: the new seed is the one Continue resumes.
- Method: playwright
- How: Play again, walk on day 1, quit, restart the host, Continue.
- Pass evidence: the autosave's seed ≠ the original game's seed (DB read), and positions plus next move roll match the replay of the new game's log.
- Fails if: Continue resumes with the original seed.

### EV-12 — Stats survive a restart
- Requirement: a game's stats survive a host restart.
- Method: unit
- How: server test: rebuild the stats from the event log after a restart.
- Pass evidence: story, ended, time played ("—"), day ended, moves taken, buildings entered and skull drops are equal before and after the restart.
- Fails if: stats are kept only in memory.

## Assumptions surfaced

- The slice's stats rows (time played, the day it ended on, moves taken, buildings entered, skull drops recorded) are Claude's pick from SCR-019 (time played) and from what the day slice records → Bob: OK? C3 builds SCR-019 in full.
- The drill-in is picked on the iPad; the board shows it (DEC-278).
