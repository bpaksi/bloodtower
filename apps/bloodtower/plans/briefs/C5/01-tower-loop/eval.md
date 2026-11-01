Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 01-tower-loop — The Tower: three levels, dealt rooms, stair guards, retreat keeps progress

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-07; survival evals last (EV-07).

## Checks

### EV-01 — Locked until the unlock fires
- Requirement: DEC-645.
- Method: unit
- How: (sim) before and after The Last Stand.
- Pass evidence: Enter hidden, then offered.
- Fails if: offered early.

### EV-02 — Enter costs 1 move
- Requirement: DEC-363.
- Method: unit
- How: enter.
- Pass evidence: moves exactly −1.
- Fails if: any change but −1.

### EV-03 — Rooms dealt once from the seed (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
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

### EV-05 — Retreat costs as a battle retreat (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C5-04.
- Method: unit
- How: retreat.
- Pass evidence: C4 03's retreat cost; rooms kept.
- Fails if: free or reset.

### EV-06 — Each level deals guard, trap or shrine, then a stair guard
- Requirement: DEC-566.
- Method: unit
- How: 100 seeds; inspect each level.
- Pass evidence: rooms 1–2 each a guard, trap or shrine; room 3 a stair guard; level 3 room 3 is The Warden.
- Fails if: any other kind, or The Warden elsewhere.

### EV-07 — Tower guards are the adversary's level − 2
- Requirement: DEC-702.
- Method: unit
- How: 100 seeds under The Warden (level 5).
- Pass evidence: every guard and stair guard is level 3.
- Fails if: any other level.

### EV-08 — Rooms 1–2 are guard, trap or shrine at 1 in 3
- Requirement: DEC-566, DEC-703.
- Method: unit
- How: (sim) 10,000 seeded levels.
- Pass evidence: each kind 0.333 ± 0.02.
- Fails if: any rate outside.

### EV-09 — A Tower trap costs each hero 2 HP
- Requirement: DEC-566.
- Method: unit
- How: 2 heroes at 10 HP enter a trap room.
- Pass evidence: both at 8 HP.
- Fails if: any other value.

### EV-10 — A shrine heals each hero 2 HP, once
- Requirement: DEC-566.
- Method: unit
- How: 2 heroes at 5 HP use a shrine, then try again.
- Pass evidence: both at 7 HP; the second use is refused.
- Fails if: no heal, a different amount, or a second heal.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Progress survives Continue
- Requirement: DEC-360.
- Method: playwright
- How: reach main level, quit, Continue.
- Pass evidence: main level, rooms cleared.
- Fails if: reset.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Resolved Q-C5-11: The Tower's guards and traps (DEC-566, DEC-702): fixed or dealt? Options: (a) dealt fresh on the first visit from the seed, then kept; (b) fixed by the story pack. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C5-04: The Tower's retreat (DEC-360): what does it cost? Options: (a) the same as a battle retreat (C4 feature 03); the rooms stay cleared; (b) nothing beyond the moves spent. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
