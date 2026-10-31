Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 05-cursed — Cursed: at most 4 Advantages count in a round

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-05; the survival eval is last (EV-05).

## Checks

### EV-01 — Only 4 count
- Requirement: DEC-466.
- Method: unit
- How: Cursed hero with 6 matching Advantages.
- Pass evidence: strength uses the best 4.
- Fails if: 6 or the wrong 4.

### EV-02 — Below 4 is untouched
- Requirement: DEC-466.
- Method: unit
- How: 3 Advantages.
- Pass evidence: all 3 count.
- Fails if: fewer.

### EV-03 — −1 move
- Requirement: DEC-365.
- Method: unit
- How: Cursed hero rolls 4.
- Pass evidence: 3 moves.
- Fails if: 4.

### EV-04 — Cursed in every draw (Gamewright pick, pending Bob)
- Requirement: Q-C4-06.
- Method: sim
- How: 10,000 seeded draws.
- Pass evidence: Cursed appears; never to a hero holding it.
- Fails if: absent or doubled.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Cursed survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: Curse a hero, quit, Continue.
- Pass evidence: still Cursed.
- Fails if: cleared.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C4-05: Cursed (DEC-466): does the board show which 4 Advantages counted? Options: (a) yes: the hero panel shows "4 of N count" and dims the rest during the round; (b) no: the app picks silently; only the round result shows. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-06: Cursed in the corruption draw (Q-C3-15's seeded set): Options: (a) from C4 the set includes Cursed for every draw (battle, event, scene); (b) Cursed is drawn only when a hero falls in battle. Gamewright pick: (a) (Gamewright pick, pending Bob).
