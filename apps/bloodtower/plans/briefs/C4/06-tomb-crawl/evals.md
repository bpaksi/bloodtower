Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 06-tomb-crawl — The Tomb: The Barrow's rooms, traps, listening and the hidden guardian

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-06; the survival eval is last (EV-06).

## Checks

### EV-01 — 7 rooms, guardian hidden late (Gamewright pick, pending Bob)
- Requirement: DEC-491, Q-C4-08.
- Method: unit
- How: 100 seeds.
- Pass evidence: 7 rooms; guardian in rooms 5–7; up to 3 corridors each.
- Fails if: other count.

### EV-02 — Each room is nothing, battle or trap
- Requirement: DEC-488.
- Method: unit
- How: enter every room.
- Pass evidence: one of the three per room.
- Fails if: other kind.

### EV-03 — Listening lies 1 in 4 (Gamewright pick, pending Bob)
- Requirement: DEC-586, Q-C4-09.
- Method: sim
- How: 10,000 listens.
- Pass evidence: lie rate 0.25 ± 0.02.
- Fails if: outside.

### EV-04 — A listened corridor is entered on guard
- Requirement: DEC-587.
- Method: unit
- How: listen then enter a battle room.
- Pass evidence: group on guard in round 1.
- Fails if: not.

### EV-05 — Guardian level 3 gives the Signet (Gamewright pick, pending Bob)
- Requirement: DEC-662, Q-C4-07.
- Method: sim
- How: beat the guardian.
- Pass evidence: level-3 battle; Signet to the group; quest done.
- Fails if: no Signet.

## Survival evals (one per survival invariant in plan.md)

### EV-06 — Rooms kept across Continue
- Requirement: DEC-602.
- Method: playwright
- How: clear 3 rooms, quit, Continue, re-enter.
- Pass evidence: same layout, 3 cleared.
- Fails if: new layout.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C4-07: The Barrow's guardian (the dead garrison, DEC-662): what level? Options: (a) level 3, as `tomb.guardian_level` in base tuning; (b) level 4. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-08: How many rooms does a 1.0 Tomb deal (DEC-491)? Options: (a) 7 rooms, guardian hidden in one of the last 3; (b) 5 rooms; (c) 9 rooms. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-09: Listening at a corridor (DEC-586): how often does the hint lie? Options: (a) 1 in 4 (`tomb.listen_lie` = 0.25); (b) 1 in 3. Gamewright pick: (a) (Gamewright pick, pending Bob).
