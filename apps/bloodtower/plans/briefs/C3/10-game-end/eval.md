Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 10-game-end — The game ends: won or lost, the record and the stats

- Brief: ./plan.md
- Mockup: none
- Risk: High. Restore evals included.

## Checks

### EV-01 — A lost chapter ends the game
- Requirement: MEC-032 .42.
- Method: unit
- How: `game/loop.test.ts`: chapter 2 lost on skulls.
- Pass evidence: the game exits lost; no chapter 3; the loss scene for `skulls` is picked (DEC-144).
- Fails if: the next chapter opens.

### EV-02 — The loss scene matches the way it was lost
- Requirement: DEC-144, DEC-043.
- Method: unit
- How: losses by skulls, by corruption, by fallen buildings.
- Pass evidence: each picks its own scene ID.
- Fails if: one loss scene for all.

### EV-03 — The win scene's line follows the last choice
- Requirement: DEC-664.
- Method: unit
- How: drive a finished finale through a test fixture that sets each flag.
- Pass evidence: each flag plays its own closing line ID.
- Fails if: the same line for both.

### EV-04 — The record is written
- Requirement: DEC-116, DEC-117.
- Method: unit
- How: finish a game.
- Pass evidence: start and end time, active length, outcome and how it ended stored; each seated hero's games played +1, won +1 on a win.
- Fails if: the record is not written on a loss.

### EV-05 — Stats come from stored stats
- Requirement: SCR-019, DEC-627.
- Method: unit
- How: project the stats view after a game.
- Pass evidence: outcome, time played, days, quests done, corruptions taken, gold left and key moments, all read from the event log.
- Fails if: any number is computed from live state only.

### EV-06 — Tonight's games shows the outcome
- Requirement: DEC-214, SCR-021.
- Method: playwright
- How: finish a game (test fixture) and reach the session screen.
- Pass evidence: the row is marked won or lost, not quit.
- Fails if: marked quit.

## Survival evals (one per survival invariant in plan.md)

### EV-07 — No Continue after a finished game
- Requirement: DEC-208, DEC-709.
- Method: unit
- How: finish a game; read the session view.
- Pass evidence: no autosave; Continue absent.
- Fails if: Continue resumes a finished game.

### EV-08 — The record survives a restart
- Requirement: DEC-116.
- Method: unit
- How: finish, restart, rebuild.
- Pass evidence: the record and tonight's row are intact.
- Fails if: the row is lost.

## Assumptions surfaced

- The win path is tested through a fixture that ends the finale, until C5 builds the Tower. OPEN Q-C3-01.

## OPEN questions

- Q-C3-01 (as feature 09)
- Q-C3-18: "key moments" on the stats screen (SCR-019): which events count as one? No card lists them.
