Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 10-g-1-0-gate — The 1.0 gate: gaps zero and the 1.0 playtest

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-04; the survival eval is last (EV-04).

## Checks

### EV-01 — No 1.0 gap
- Requirement: DEC-696.
- Method: unit
- How: `pnpm graph gaps`.
- Pass evidence: 1.0 section empty.
- Fails if: any gap.

### EV-02 — Two table games (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C5-10.
- Method: manual
- How: Bob plays.
- Pass evidence: one win, one loss logged.
- Fails if: fewer.

### EV-03 — Every C4 and C5 eval table green
- Requirement: sdlc.
- Method: manual
- How: read PRs.
- Pass evidence: all pass.
- Fails if: a fail.

## Survival evals (one per survival invariant in plan.md)

### EV-04 — Gaps re-run on the release commit
- Requirement: DEC-696.
- Method: unit
- How: on the tag.
- Pass evidence: still empty.
- Fails if: a gap.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Resolved Q-C5-10: What does G-1.0 need? Options: (a) two full table games of The Ruined Keep, one won (either ending) and one lost, with `pnpm graph gaps` empty for 1.0; (b) three games, one per ending and one loss. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
