Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 02-tuning-file — The tuning file holds DEC-703's numbers

- Brief: ./plan.md
- Mockup: none
- Risk: Med.

## Checks

### EV-01 — Every DEC-703 row is in the file
- Requirement: The tuning file's first values are DEC-703's tables.
- Method: unit
- How: `tuning.test.ts` "matches DEC-703": a fixture copied from DEC-703's rows (setup, day and moves, skulls, battle, heroes, gold, Tomb and Tower).
- Pass evidence: every row's key exists with the card's value, e.g. skull supply 24, move roll 2d3 floor 2, event chance Short 30 / Standard 40, won quest 5 gold, sanctuary cure 10.
- Fails if: a row is missing or a value differs from the card.

### EV-02 — No rules code holds a number
- Requirement: Numbers come from the tuning file only (DEC-500).
- Method: unit
- How: change the skull supply to 30 in a test copy; build a new game state.
- Pass evidence: the state's supply is 30.
- Fails if: a hard-coded 24 survives anywhere in the engine.

### EV-03 — A bad tuning file fails lint
- Requirement: A missing or non-numeric value is a lint issue (pack lint).
- Method: unit
- How: delete `skulls.supply` from a test copy.
- Pass evidence: lint names `tuning.yaml` and the key; the base pack does not load.
- Fails if: the engine falls back to a default silently.

## Survival evals (one per survival invariant in plan.md)

### EV-04 — Continue keeps the game's tuning
- Requirement: A game resumes with the numbers it began with.
- Method: unit
- How: start a game, autosave, change the tuning file, Continue.
- Pass evidence: the resumed state's tuning equals the one at Begin.
- Fails if: Continue reads the new file.

## Assumptions surfaced

- Tuning is stored on the game state at Begin, so a mid-game file change has no effect. Bob: OK?
- The file lives in the base pack, not the story pack; a story cannot override it in 1.0. OPEN Q-C3-08.

## OPEN questions

- Q-C3-08: can a story pack override tuning values (e.g. The Ruined Keep's Warden level 5, DEC-361), or does only the base file hold them?
