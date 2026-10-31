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

### EV-10 — Short length deals 4–5 rooms
- Requirement: DEC-603.
- Method: unit
- How: 100 seeds at Short.
- Pass evidence: 4 or 5 rooms each, guardian's included.
- Fails if: any other count.

### EV-11 — The deal is 40/30/30
- Requirement: DEC-604.
- Method: sim
- How: 10,000 seeded tombs; count non-guardian rooms.
- Pass evidence: nothing 0.40 ± 0.02, battle 0.30 ± 0.02, trap 0.30 ± 0.02; every tomb has at least 1 battle and 1 trap.
- Fails if: any rate outside, or a tomb with no battle or no trap.

### EV-12 — Battle rooms hold the quest's foe at the quest's level
- Requirement: DEC-608.
- Method: unit
- How: enter every battle room of a level-2 quest's tomb.
- Pass evidence: each battle is the quest's foe at level 2.
- Fails if: another foe or level.

### EV-13 — Listening is free, unlimited and plays a room-kind sound
- Requirement: DEC-587, DEC-618.
- Method: unit
- How: listen 5 times down one corridor of each kind, with a seed giving true hints.
- Pass evidence: no move or gold spent; board sound `snd.listen_nothing` / `snd.listen_trap` / `snd.listen_battle` by kind, each time.
- Fails if: a cost, a refusal, or a wrong sound id.

## Survival evals (one per survival invariant in plan.md)

### EV-14 — Rooms kept across Continue
- Requirement: DEC-602.
- Method: playwright
- How: clear 3 rooms, quit, Continue, re-enter.
- Pass evidence: same layout, 3 cleared.
- Fails if: new layout.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Q-C4-07 ANSWERED by card DEC-608 (in commit 0005 "C4/C5 plans: fill the 14 [TBD] values"; not a Bob question). Card: "**Guardian:** the same foe, one level up." Source: research/game-design/cards/DEC-608.md. ~~Old option (a) level 3, as `tomb.guardian_level`; Gamewright pick (a), pending Bob~~ (struck: contradicts the card).
- Q-C4-08 ANSWERED by card DEC-603 (in commit 0005 "C4/C5 plans: fill the 14 [TBD] values"; not a Bob question). Card: "**Rooms, guardian's included:** short 4–5, standard 6–7, long 8–10, seeded within the range. / **Grid:** 4×4, 16 cells. The entrance is on an edge cell." Source: research/game-design/cards/DEC-603.md. ~~Old option (a) 7 rooms, guardian hidden in one of the last 3; Gamewright pick (a), pending Bob~~ (struck: contradicts the card).
- Q-C4-09 ANSWERED by card DEC-618 (in commit 0005 "C4/C5 plans: fill the 14 [TBD] values"; not a Bob question). Card: "**Wrong hints:** 1 in 5, seeded like the room (DEC-011)." Source: research/game-design/cards/DEC-618.md. ~~Old option (a) 1 in 4 (`tomb.listen_lie` = 0.25); Gamewright pick (a), pending Bob~~ (struck: contradicts the card).
