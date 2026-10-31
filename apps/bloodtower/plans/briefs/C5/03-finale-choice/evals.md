Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 03-finale-choice — The last choice: break the seal or swear the oath

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-04; survival evals last (EV-04).

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

### EV-03 — Tie resolution: re-vote once, then the seeded draw (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C5-03.
- Method: unit
- How: seed 4401; 2 heroes split twice (C5 09 collects the votes; this feature resolves them).
- Pass evidence: one re-vote is requested; the second tie resolves to `oath_sworn` for seed 4401.
- Fails if: no re-vote, more than one re-vote, or `seal_broken` for seed 4401.

## Survival evals (one per survival invariant in plan.md)

### EV-04 — The resolved outcome survives Continue
- Requirement: DEC-675; vote collection and its survival are owned by C5 09 (EV-06).
- Method: playwright
- How: resolve to `seal_broken`, quit before the ending scene, Continue.
- Pass evidence: `seal_broken` is still set, `oath_sworn` is not, and no new vote is asked.
- Fails if: the flag is lost or flipped, or a re-vote is asked.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C5-03 **[Bob taste call]**: Who makes the last choice in the Tower (DEC-663)? Options: (a) each present hero votes on their iPad; a tie re-votes once, then the seeded draw (DEC-011) breaks it; (b) the hero who struck the last blow chooses; (c) the vote must be unanimous; it repeats until it is. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
