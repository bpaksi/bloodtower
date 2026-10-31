Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 03-finale-choice — The last choice: break the seal or swear the oath

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-04; the survival eval is last (EV-04).

## Checks

### EV-01 — The scene runs in the end hook
- Requirement: DEC-664.
- Method: unit
- How: Warden falls.
- Pass evidence: the scene before the game end.
- Fails if: skipped.

### EV-02 — Each option sets its flag
- Requirement: DEC-642.
- Method: unit
- How: each option.
- Pass evidence: `seal_broken` or `oath_sworn`.
- Fails if: none.

### EV-03 — Tie re-votes then seeded (Gamewright pick, pending Bob)
- Requirement: Q-C5-03.
- Method: unit
- How: 2 heroes, split twice.
- Pass evidence: one re-vote, then seeded pick.
- Fails if: other.

## Survival evals (one per survival invariant in plan.md)

### EV-04 — Votes survive Continue
- Requirement: DEC-675.
- Method: playwright
- How: 1 of 2 votes, quit, Continue.
- Pass evidence: vote kept.
- Fails if: lost.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C5-03 **[Bob taste call]**: Who makes the last choice in the Tower (DEC-663)? Options: (a) each present hero votes on their iPad; a tie re-votes once, then the seeded draw (DEC-011) breaks it; (b) the hero who struck the last blow chooses; (c) the vote must be unanimous; it repeats until it is. Gamewright pick: (a) (Gamewright pick, pending Bob).
