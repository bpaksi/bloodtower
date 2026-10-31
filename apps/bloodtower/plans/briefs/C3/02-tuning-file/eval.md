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
- How: in a test copy change four keys: skull supply 24→30, move floor 2→3, Standard event chance 40→50, won-quest gold 5→7. Build a new game state with a fixed seed and run one day and one won quest.
- Pass evidence: supply total is 30; no move roll is below 3 over 1,000 seeded rolls; 10,000 Standard event draws give 50% ±2; the won quest adds 7 gold.
- Fails if: any of the four is still the old value (a hard-coded number survives).

### EV-03 — A bad tuning file fails lint
- Requirement: A missing or non-numeric value is a lint issue (pack lint).
- Method: unit
- How: two cases on test copies: (a) delete `skulls.supply`; (b) set `skulls.supply: 'lots'`.
- Pass evidence: in each case lint names `tuning.yaml` and `skulls.supply`; the base pack does not load.
- Fails if: the engine falls back to a default silently.

### EV-04 — The two C3 switches are present and typed
- Requirement: plan "Holds the two C3 switches" (Q-C3-01, Q-C3-02).
- Method: unit
- How: read the shipped `tuning.yaml`; then lint test copies with each switch deleted, and each set to `"yes"`.
- Pass evidence: shipped file has `c3_end_after_chapter_1: true` and `fight_enabled: false`; each broken copy gives a lint issue naming the key.
- Fails if: a switch is missing, has the wrong value, or a missing/non-boolean switch passes lint.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Continue keeps the game's tuning
- Requirement: A game resumes with the numbers it began with.
- Method: unit
- How: start a game, autosave, change skull supply 24→30 in the tuning file, Continue.
- Pass evidence: the resumed state's supply total is still 24 and its whole tuning equals the one at Begin.
- Fails if: Continue reads the new file.

## Assumptions surfaced

- Tuning is stored on the game state at Begin, so a mid-game file change has no effect. Tuning is fixed at Begin (Bob approved 2026-10-31).
- The file lives in the base pack, not the story pack; a story cannot override it in 1.0. Q-C3-08, answered.

## OPEN questions

- ANSWERED Q-C3-08 (Bob approved 2026-10-31): no story override in 1.0; only the base file holds tuning (the Warden's level 5 goes in base tuning). Was: can a story pack override tuning values (e.g. The Ruined Keep's Warden level 5, DEC-361), or does only the base file hold them?
