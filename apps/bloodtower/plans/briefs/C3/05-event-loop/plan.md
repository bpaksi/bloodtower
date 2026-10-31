Keep this a checklist; do not write a second design doc.

# Brief: C3 / 05-event-loop — Events in the wild: the seeded draw and its six tracks

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 05-event-loop
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, MEC-072, MEC-013
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: Med
- Depends on: C3 feature 04 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/event/**` (new level), `apps/bloodtower/src/engine/loops/day/loop.ts` (the .9 call only)
- Builds: MEC-072, DEC-017, DEC-022, DEC-027, DEC-029, DEC-018, DEC-669
- Deps change: no
- Runs: cloud

## What it does

MEC-072 for each group that ended its turn in the wild or at a skulled building (DEC-017, DEC-080, DEC-093): a seeded draw at the length's chance (Short 30%, Standard 40%, DEC-669) and DEC-022's weights, then the type's track: quiet, windfall (5 gold), hazard (two costs, −2 hit points each hero), foes or disaster (Fight, Go around, Pay them off), people (trade, rumour, companion, trick). In 1.0 NPCs and shops wait (DEC-502), and the battle is C4.

In C3, Fight is hidden (Q-C3-02): a foes or disaster event offers Go around and Pay them off only, and the battle loop is never called. Fight returns in C4 by one tuning switch (feature 02).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - An event in progress (its choice not yet made) resumes on Continue with the same draw.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-09 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] MEC-072: closed before coding (`decided`).
- [ ] DEC-017: closed before coding (`decided`).
- [ ] DEC-019: closed before coding (`decided`).
- [ ] DEC-022: closed before coding (`decided`).
- [ ] DEC-023: closed before coding (`decided`).
- [ ] DEC-024: closed before coding (`decided`).
- [ ] DEC-027: closed before coding (`decided`).
- [ ] DEC-028: closed before coding (`decided`).
- [ ] DEC-029: closed before coding (`decided`).
- [ ] DEC-018: closed before coding (`decided`).
- [ ] DEC-080: closed before coding (`decided`).
- [ ] DEC-669: closed before coding (`decided`).
- [ ] DEC-502: closed before coding (`decided`).
- [ ] DEC-703: closed before coding (`decided`).
- [ ] MEC-013: closed before coding (`decided`).

## OPEN questions

- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4.
- ANSWERED Q-C3-03 (Bob approved 2026-10-31): in 1.0 people events offer rumour and trick only; the people weight stays 10. Was: DEC-502 cuts NPCs and shops from 1.0, but the people track draws trade, rumour, companion or trick (DEC-024). Which offers are in 1.0? Does the people weight (10) move to another type?
- ANSWERED Q-C3-12 (Bob approved 2026-10-31): no placeholder; Fight is hidden, so the disaster offers Go around and Pay them off only. Was: does the disaster event's boss-level foe (DEC-028) need a C3 placeholder, as P-003 day 11 met one?

## Eval approval

- See ./approval.md (must be filled before coding).
