Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 12-tomb-screens — The Tomb on screen: the map and the view, the iPad's three corridors

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-06; the survival eval is last (EV-06).

## Checks

### EV-01 — Both halves always
- Requirement: DEC-583.
- Method: playwright
- How: enter The Barrow.
- Pass evidence: map left, view right.
- Fails if: one half.

### EV-02 — Three corridor cards
- Requirement: DEC-591.
- Method: playwright
- How: a room with 3 doorways.
- Pass evidence: 3 cards + Listen + Leave.
- Fails if: other.

### EV-03 — A battle replaces the view
- Requirement: DEC-592.
- Method: playwright
- How: enter a battle room.
- Pass evidence: battle in view half; map stays.
- Fails if: map gone.

### EV-04 — 7 rooms on the map (Gamewright pick, pending Bob)
- Requirement: Q-C4-08.
- Method: playwright
- How: reveal all.
- Pass evidence: 7 rooms.
- Fails if: other.

### EV-05 — Screenshots match
- Requirement: AREA-094.
- Method: screenshot
- How: board and iPad; mockup `#tomb`, `#listen`, `#trap`.
- Pass evidence: matching.
- Fails if: differs.

## Survival evals (one per survival invariant in plan.md)

### EV-06 — Map survives Continue
- Requirement: DEC-602.
- Method: playwright
- How: clear 2 rooms, quit, Continue.
- Pass evidence: same map.
- Fails if: reset.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C4-08: How many rooms does a 1.0 Tomb deal (DEC-491)? Options: (a) 7 rooms, guardian hidden in one of the last 3; (b) 5 rooms; (c) 9 rooms. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-15 **[Bob taste call]**: Foe paintings in C4, before the A1 art run (C5): Options: (a) one placeholder painting per foe level, swapped by A1 in C5; (b) A1 draft art now, as the art lands. Gamewright pick: (a) (Gamewright pick, pending Bob).
