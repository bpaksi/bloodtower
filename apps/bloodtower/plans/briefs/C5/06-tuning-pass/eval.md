Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 06-tuning-pass — The tuning pass: placeholder numbers become 1.0 numbers

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-04; survival evals last (EV-04).

## Checks

### EV-01 — Sim report at 2, 3, 4 heroes (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C5-05.
- Method: unit
- How: (sim) run the report.
- Pass evidence: win rate, length, falls per group size.
- Fails if: missing size.

### EV-02 — Every change cited
- Requirement: DEC-500.
- Method: unit
- How: diff tuning.
- Pass evidence: each changed key names its sim row and playtest.
- Fails if: uncited.

### EV-03 — No hang in 900 games
- Requirement: MEC-032.
- Method: unit
- How: (sim) 300 seeds at each of 2, 3 and 4 heroes (900 games).
- Pass evidence: all end.
- Fails if: hang.

## Survival evals (one per survival invariant in plan.md)

### EV-04 — Old game keeps its numbers
- Requirement: C3 B2.
- Method: playwright
- How: begin, change tuning, Continue.
- Pass evidence: old values.
- Fails if: new values.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Resolved Q-C5-05: How is the tuning pass (DEC-500) run? Options: (a) 300 headless simulator games at 2, 3 and 4 heroes, then two table playtests; numbers move only on both; (b) table playtests only. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
