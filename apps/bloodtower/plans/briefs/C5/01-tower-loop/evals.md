Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 01-tower-loop — The Tower: three levels, dealt rooms, stair guards, retreat keeps progress

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-06; the survival eval is last (EV-06).

## Checks

### EV-01 — Locked until the unlock fires
- Requirement: DEC-645.
- Method: sim
- How: before and after The Last Stand.
- Pass evidence: Enter hidden, then offered.
- Fails if: offered early.

### EV-02 — Enter costs 1 move
- Requirement: DEC-363.
- Method: unit
- How: enter.
- Pass evidence: moves −1.
- Fails if: other.

### EV-03 — Rooms dealt once from the seed (Gamewright pick, pending Bob)
- Requirement: Q-C5-11.
- Method: unit
- How: same seed twice; revisit.
- Pass evidence: same layout; kept.
- Fails if: redealt.

### EV-04 — Up only through a won stair
- Requirement: DEC-566.
- Method: unit
- How: lose the stair battle.
- Pass evidence: still on the level.
- Fails if: goes up.

### EV-05 — Retreat costs as a battle retreat (Gamewright pick, pending Bob)
- Requirement: Q-C5-04.
- Method: unit
- How: retreat.
- Pass evidence: C4 03's retreat cost; rooms kept.
- Fails if: free or reset.

## Survival evals (one per survival invariant in plan.md)

### EV-06 — Progress survives Continue
- Requirement: DEC-360.
- Method: playwright
- How: reach main level, quit, Continue.
- Pass evidence: main level, rooms cleared.
- Fails if: reset.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C5-11: The Tower's guards and traps (DEC-566, DEC-702): fixed or dealt? Options: (a) dealt fresh on the first visit from the seed, then kept; (b) fixed by the story pack. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C5-04: The Tower's retreat (DEC-360): what does it cost? Options: (a) the same as a battle retreat (C4 feature 03); the rooms stay cleared; (b) nothing beyond the moves spent. Gamewright pick: (a) (Gamewright pick, pending Bob).
