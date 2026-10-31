Keep this a checklist; do not write a second design doc.

# Brief: C4 / 06-tomb-crawl — The Tomb: The Barrow's rooms, traps, listening and the hidden guardian

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 06-tomb-crawl
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, MEC-026, DEC-486 to DEC-497, DEC-583 to DEC-592, DEC-602, DEC-617, DEC-618, DEC-651, DEC-652
- Evals: ./evals.md
- Screen spec: ./screen-spec.md
- Mockup: none (no screen change)
- Depends on: 02, 03, C3 07, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/tomb/**` (new level), `packs/test/**` (The Barrow)
- Builds: MEC-026, DEC-593, DEC-488, DEC-489, DEC-490, DEC-491, DEC-586, DEC-587, DEC-590, DEC-602, DEC-652
- Deps change: no
- Runs: cloud

## What it does

MEC-026 for The Barrow: 7 rooms (Gamewright pick, pending Bob) (Q-C4-08), built on first entry and kept; each room nothing, a battle or a trap; up to 3 corridors; listening gives a hint that lies 1 in 4 (Gamewright pick, pending Bob) (Q-C4-09) and the corridor is entered on guard; the guardian is a level-3 battle (Gamewright pick, pending Bob) (Q-C4-07); its fall gives the Warden's Signet. Retreating leaves; spells come back on each visit.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A half-explored Tomb is kept: Continue and later visits show the same rooms, found and cleared.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-06 all pass (verifier table on PR).
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

## OPEN questions

- OPEN Q-C4-07: The Barrow's guardian (the dead garrison, DEC-662): what level? Options: (a) level 3, as `tomb.guardian_level` in base tuning; (b) level 4. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-08: How many rooms does a 1.0 Tomb deal (DEC-491)? Options: (a) 7 rooms, guardian hidden in one of the last 3; (b) 5 rooms; (c) 9 rooms. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-09: Listening at a corridor (DEC-586): how often does the hint lie? Options: (a) 1 in 4 (`tomb.listen_lie` = 0.25); (b) 1 in 3. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).
