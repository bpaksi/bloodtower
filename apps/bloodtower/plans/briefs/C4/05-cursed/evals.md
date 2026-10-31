Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 05-cursed — Cursed: at most 4 Advantages count in a round

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-05; survival evals last (EV-05).

## Checks

### EV-01 — Only 4 count
- Requirement: DEC-466.
- Method: unit
- How: Cursed hero, fight number 2, 6 matching Advantages worth +1, +1, +1, +2, +2, +3.
- Pass evidence: round strength 2 + (3 + 2 + 2 + 1) = 10.
- Fails if: strength 12 (all 6), or any value but 10.

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
- How: 10,000 seeded draws for heroes holding no corruption, from the C4 set of 6 (Cruel, Greedy, Feral, Lost, Tempted, Cursed).
- Pass evidence: Cursed rate 1/6 = 0.167 ± 0.01; 0 draws give a hero one they hold.
- Fails if: rate outside 0.157–0.177, or a duplicate.

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
