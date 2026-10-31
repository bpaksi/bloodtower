Keep this a checklist; do not write a second design doc.

# Brief: C3 / 04-day-clock — The day: Regroup, the move roll, the skull drop as the game clock

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 04-day-clock
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, MEC-034, MEC-035
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: High
- Depends on: C3 feature 02 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/day/**`, `apps/bloodtower/src/engine/loops/group-turn/**`, `apps/bloodtower/src/engine/views/**` (day view fields only)
- Builds: MEC-034, DEC-686, DEC-699, DEC-640, DEC-615, DEC-564, DEC-093
- Deps change: no
- Runs: cloud

## What it does

MEC-034 in full for 1.0: Regroup (.38 to .42, DEC-640), the seeded move roll 2d3 floor 2 with its shifts (DEC-615, DEC-102, DEC-684), each group's turn oldest first (DEC-148), then the close: events (feature 05), the drop (1 a night, or 1 and 2 every other night for 3 to 4 heroes, DEC-564), skipped on a night a quest was won (DEC-699), skulls on buildings with the 4th destroying it (DEC-092, DEC-093), the days-left count (DEC-686) and the day's effects panel data (DEC-115). Without the tower the drop is simulated (DEC-305). The adversary's move (.23) is skipped (DEC-644).

## Cutover

Cutover: Y

- DEC-222's slice rule (skulls have no effect) ends: DEC-686 replaces it.

## Survival invariants

- Continue, restore, and restart must keep:
  - Continue resumes a day at its saved node with the same seed: the same rolls and drops follow (DEC-675, DEC-217).
  - The days-left count and every building's skulls survive a host restart.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-14 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] MEC-034: closed before coding (`decided`).
- [ ] MEC-035: closed before coding (`decided`).
- [ ] DEC-086: closed before coding (`decided`).
- [ ] DEC-686: closed before coding (`decided`).
- [ ] DEC-699: closed before coding (`decided`).
- [ ] DEC-640: closed before coding (`decided`).
- [ ] DEC-615: closed before coding (`decided`).
- [ ] DEC-684: closed before coding (`decided`).
- [ ] DEC-564: closed before coding (`decided`).
- [ ] DEC-064: closed before coding (`decided`).
- [ ] DEC-092: closed before coding (`decided`).
- [ ] DEC-093: closed before coding (`decided`).
- [ ] DEC-305: closed before coding (`decided`).
- [ ] DEC-306: closed before coding (`decided`).
- [ ] DEC-644: closed before coding (`decided`).
- [ ] DEC-115: closed before coding (`decided`).
- [ ] DEC-148: closed before coding (`decided`).
- [ ] DEC-149: closed before coding (`decided`).

## OPEN questions

- Q-C3-04: how is "days left" counted for 3–4 heroes, whose drop alternates 1 and 2 (DEC-564)? Floor of supply ÷ 1.5, or a count of the actual nights the pattern gives?
- Q-C3-05: the fallen-buildings loss (DEC-043): how many fallen buildings lose the game? DEC-703 has no row for it. Gamewright proposal, pending Bob: 4 fallen buildings.

## Eval approval

- See ./approval.md (must be filled before coding).
