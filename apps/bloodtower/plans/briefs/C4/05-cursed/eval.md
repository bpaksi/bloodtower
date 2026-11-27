Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 05-cursed — Cursed: at most 4 Advantages count in a round

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-06; survival evals last (EV-05).
- Amended 2026-11-27 (Bob, via Warden): EV-06 names which 4 Advantages counted. The board line is not this check.

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

### EV-04 — Cursed in every draw (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C4-06.
- Method: unit
- How: (sim) 10,000 seeded draws for heroes holding no corruption, from the C4 set of 6 (Cruel, Greedy, Feral, Lost, Tempted, Cursed).
- Pass evidence: Cursed rate 1/6 = 0.167 ± 0.01; 0 draws give a hero one they hold.
- Fails if: rate outside 0.157–0.177, or a duplicate.

### EV-06 — The engine names the 4 that counted (Bob, 2026-11-27, via Warden)
- Requirement: DEC-466.
- Method: unit
- How: the EV-01 hero: Advantages worth +1, +1, +1, +2, +2, +3, each with its own id.
- Pass evidence: the round record names the four that counted, and they are the +3, the +2, the other +2, and one +1; the other two +1s are not named; strength is still 10.
- Fails if: the record only has the total, names a weaker card ahead of a stronger one, or names more or fewer than 4.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Cursed survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: Curse a hero, quit, Continue.
- Pass evidence: still Cursed.
- Fails if: cleared.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Resolved Q-C4-05: Cursed (DEC-466): does the board show which 4 Advantages counted? Options: (a) yes: the hero panel shows "4 of N count" and dims the rest during the round; (b) no: the app picks silently; only the round result shows. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C4-06: Cursed in the corruption draw (Q-C3-15's seeded set): Options: (a) from C4 the set includes Cursed for every draw (battle, event, scene); (b) Cursed is drawn only when a hero falls in battle. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
