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

### EV-02 — The loss scene matches the way it was lost
- Requirement: DEC-144, DEC-043.
- Method: unit
- How: losses by skulls, by a third corruption, by 4 fallen buildings (count: Gamewright proposal, pending Bob, Q-C3-05).
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

## Assumptions surfaced

- The C3 win is chapter 1 won (Q-C3-01). The finale's win lines (EV-03) are tested by fixture until C5.

## OPEN questions

- ANSWERED Q-C3-01 (Bob, 2026-10-31 10:09 AM ET): clearing chapter 1 counts as the C3 win.
- Q-C3-23: which win scene and line play for the C3 win? DEC-663 and DEC-664 write the win for the finale, after the last choice, which C3 never reaches. Use a placeholder `[COPY: chapter 1 win]`, or the finale's win scene without the line?
- Q-C3-18: "key moments" on the stats screen (SCR-019): which events count as one? No card lists them.
