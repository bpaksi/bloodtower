Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 06-tomb-crawl — The Tomb: The Barrow's rooms, traps, listening and the hidden guardian

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-10; survival evals last (EV-10).

## Checks

### EV-01 — 6–7 rooms on a 4×4 grid, guardian 2–5 doors deep
- Requirement: DEC-491, DEC-603, DEC-604.
- Method: unit
- How: 100 seeds at Standard length.
- Pass evidence: 6 or 7 rooms (guardian's included) on a 4×4 grid, entrance on an edge cell; the guardian 2–5 doors from the entrance by the shortest path; at least 1 battle and 1 trap; up to 3 corridors each.
- Fails if: any count outside 6–7, the guardian outside 2–5 doors, no battle or no trap, or a room with more than 3 corridors.

### EV-02 — Each room is nothing, battle or trap
- Requirement: DEC-488.
- Method: unit
- How: enter every room.
- Pass evidence: one of the three per room.
- Fails if: other kind.

### EV-03 — Listening is wrong 1 in 5
- Requirement: DEC-586, DEC-618.
- Method: sim
- How: 10,000 seeded listens.
- Pass evidence: wrong rate 0.20 ± 0.01 (`tomb.listen_wrong` = 0.2); the hint is the room kind only (nothing, trap or battle), never which foe or trap.
- Fails if: outside.

### EV-04 — A listened corridor is entered on guard
- Requirement: DEC-587.
- Method: unit
- How: listen then enter a battle room.
- Pass evidence: group on guard in round 1.
- Fails if: not.

### EV-05 — Guardian at the quest's level +1 gives the Signet
- Requirement: DEC-662, DEC-608.
- Method: sim
- How: beat the guardian.
- Pass evidence: a battle against the quest's foe at the quest's level + 1; Signet to the group; quest done.
- Fails if: no Signet.

### EV-06 — A trap costs its flat loss
- Requirement: DEC-489, DEC-606.
- Method: unit
- How: with 2 present heroes at 10 HP, enter a Falling Rocks room, then a Pit room where the group picks hero 1.
- Pass evidence: Falling Rocks: each hero 8 HP; Pit: hero 1 loses 4 more (4 HP); a hero who can't pay in full pays what they can and takes a corruption; each room is marked cleared.
- Fails if: no loss, a battle, or the room stays live.

### EV-07 — Retreat leaves the Tomb
- Requirement: DEC-497.
- Method: unit
- How: retreat from a battle room.
- Pass evidence: the group stands on The Barrow's board space; the Tomb state is kept.
- Fails if: the group stays inside or the layout resets.

### EV-08 — Spells come back on each visit
- Requirement: DEC-652.
- Method: unit
- How: cast Fireball, leave, re-enter.
- Pass evidence: Fireball usable again.
- Fails if: still spent.

### EV-09 — The layout is built on first entry only
- Requirement: DEC-602.
- Method: unit
- How: seed S; inspect state before entry, after entry, after a second entry.
- Pass evidence: no layout before; a 7-room layout after; identical after the second.
- Fails if: a layout before entry, or a new one on re-entry.

## Survival evals (one per survival invariant in plan.md)

### EV-10 — Rooms kept across Continue
- Requirement: DEC-602.
- Method: playwright
- How: clear 3 rooms, quit, Continue, re-enter.
- Pass evidence: same layout, 3 cleared.
- Fails if: new layout.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- ANSWERED by DEC-608 (0005) Q-C4-07: The Barrow's guardian (the dead garrison, DEC-662): what level? Options: (a) level 3, as `tomb.guardian_level` in base tuning; (b) level 4. Gamewright pick: (a) (Gamewright pick, pending Bob).
- ANSWERED by DEC-603 (0005) Q-C4-08: How many rooms does a 1.0 Tomb deal (DEC-491)? Options: (a) 7 rooms, guardian hidden in one of the last 3; (b) 5 rooms; (c) 9 rooms. Gamewright pick: (a) (Gamewright pick, pending Bob).
- ANSWERED by DEC-618 (0005) Q-C4-09: Listening at a corridor (DEC-586): how often does the hint lie? Options: (a) 1 in 4 (`tomb.listen_lie` = 0.25); (b) 1 in 3. Gamewright pick: (a) (Gamewright pick, pending Bob).
