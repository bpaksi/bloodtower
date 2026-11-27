Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 06-tuning-pass — The tuning pass: placeholder numbers become 1.0 numbers

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-04; survival evals last (EV-04).

## Checks

### EV-01 — Sim report at 2, 3 and 4 heroes, 100 each (Gamewright, 2026-11-27, under Bob's delegation via Warden)
- Requirement: Q-C5-05. 300 games in all. No solo (1-hero) games.
- Method: unit
- How: (sim) run the report: 100 games at 2 heroes, 100 at 3, 100 at 4.
- Pass evidence: win rate, length and falls for 2, 3 and 4 heroes, and no 1-hero row.
- Fails if: a size is missing, a solo row is present, or the total is not 300.

### EV-02 — Every change cited
- Requirement: DEC-500.
- Method: unit
- How: diff tuning.
- Pass evidence: each changed key names its sim row and playtest.
- Fails if: uncited.

### EV-03 — No hang in 300 games
- Requirement: MEC-032. Gamewright, 2026-11-27, under Bob's delegation via Warden: 100 games at each of 2, 3 and 4 heroes. Not 900. No solo.
- Method: unit
- How: (sim) 100 seeds at 2 heroes, 100 at 3, 100 at 4.
- Pass evidence: all 300 end. No 1-hero game is run.
- Fails if: a hang, a solo game, or a count other than 300.

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
- Amended (Gamewright, 2026-11-27, under Bob's delegation via Warden): the 300 are 100 at 2 heroes, 100 at 3 and 100 at 4. No solo. The two table playtests are the existing gates G-C3 (#617) and G-C4 (#618). No new playtests are added.
- Blocker, targets unset: C5/06, DEC-131 and DEC-500 do not state numeric v1.0 calibration bands. DEC-131 keeps OPT-010 as placeholders until Bob tunes them. DEC-500 does not list targets. This brief says bands are proposed in the sim report. No number is locked here, and none is guessed.
