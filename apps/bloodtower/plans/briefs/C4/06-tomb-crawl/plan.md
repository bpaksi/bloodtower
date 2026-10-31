Keep this a checklist; do not write a second design doc.

# Brief: C4 / 06-tomb-crawl — The Tomb: The Barrow's rooms, traps, listening and the hidden guardian

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 06-tomb-crawl
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, MEC-026, DEC-486 to DEC-497, DEC-583 to DEC-592, DEC-602, DEC-617, DEC-618, DEC-651, DEC-652
- Evals: ./eval.md
- Screen spec: none (engine only; screens are in this cycle's screen features)
- Mockup: none (no screen change)
- Depends on: 02, 03, C3 07, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/tomb/**` (new level), `packs/test/**` (The Barrow)
- Builds: MEC-026, DEC-593, DEC-488, DEC-489, DEC-490, DEC-491, DEC-586, DEC-587, DEC-590, DEC-602, DEC-652
- Deps change: no
- Runs: cloud

## What it does

MEC-026 for The Barrow: 6–7 rooms at Standard, 4–5 at Short, on a 4×4 grid (DEC-603), built on first entry and kept; each room nothing, a battle or a trap; up to 3 corridors; listening is free and unlimited, plays a room-kind sound on the board and is wrong 1 in 5 (DEC-587, DEC-618), and a listened corridor is entered on guard; battle rooms hold the quest's foe at the quest's level and the guardian is that foe one level up (DEC-608); its fall gives the Warden's Signet. Retreating leaves; spells come back on each visit.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A half-explored Tomb is kept: Continue and later visits show the same rooms, found and cleared.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-14 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] MEC-026: closed before coding (`decided`).
- [ ] DEC-486 to DEC-497: closed before coding (`decided`).
- [ ] DEC-583 to DEC-592: closed before coding (`decided`).
- [ ] DEC-602: closed before coding (`decided`).
- [ ] DEC-617: closed before coding (`decided`).
- [ ] DEC-618: closed before coding (`decided`).
- [ ] DEC-651: closed before coding (`decided`).
- [ ] DEC-652: closed before coding (`decided`).

## Values (filled from cards)

- Rooms: Standard 6–7, Short 4–5, guardian's included, on a 4×4 grid, entrance on an edge cell; guardian 2–5 doors deep (DEC-603).
- Deal: 40% nothing, 30% battle, 30% trap; at least 1 battle and 1 trap (DEC-604).
- Battle rooms: the quest's foe at the quest's level; guardian: that foe +1 level (DEC-608). Answers Q-C4-07.
- Listen: free, unlimited, a sound on the Story board (still air / click and drip / shuffling and breathing); wrong 1 in 5, seeded; a listened corridor is entered on guard (DEC-587, DEC-618). Answers Q-C4-09.
- Traps: Pit, one hero of the group's pick −4 HP; Falling Rocks, each hero −2 HP; a short payer takes a corruption (DEC-606).

## OPEN questions

- Q-C4-07 ANSWERED by card DEC-608 (in commit 0005 "C4/C5 plans: fill the 14 [TBD] values"; not a Bob question). Card: "**Guardian:** the same foe, one level up." Source: research/game-design/cards/DEC-608.md. ~~Old option (a) level 3, as `tomb.guardian_level`; Gamewright pick (a)~~ (superseded by card DEC-608).
- Q-C4-08 ANSWERED by card DEC-603 (in commit 0005 "C4/C5 plans: fill the 14 [TBD] values"; not a Bob question). Card: "**Rooms, guardian's included:** short 4–5, standard 6–7, long 8–10, seeded within the range. / **Grid:** 4×4, 16 cells. The entrance is on an edge cell." Source: research/game-design/cards/DEC-603.md. ~~Old option (a) 7 rooms, guardian hidden in one of the last 3; Gamewright pick (a)~~ (superseded by card DEC-603).
- Q-C4-09 ANSWERED by card DEC-618 (in commit 0005 "C4/C5 plans: fill the 14 [TBD] values"; not a Bob question). Card: "**Wrong hints:** 1 in 5, seeded like the room (DEC-011)." Source: research/game-design/cards/DEC-618.md. ~~Old option (a) 1 in 4 (`tomb.listen_lie` = 0.25); Gamewright pick (a)~~ (superseded by card DEC-618).

## Eval approval

- See ./approval.md (must be filled before coding).
