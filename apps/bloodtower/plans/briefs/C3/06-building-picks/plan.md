Keep this a checklist; do not write a second design doc.

# Brief: C3 / 06-building-picks — Buildings: the menu, rally, cure, rest, virtue draw and Cleanse

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 06-building-picks
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, MEC-036, MEC-019, MEC-075
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: Med
- Depends on: C3 feature 02 merged, C3 feature 04 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/encounter/**`, `apps/bloodtower/src/engine/loops/{rest,buy,talk}/**` (new levels, 1.0 picks only)
- Builds: MEC-036, MEC-075, DEC-377, DEC-158, DEC-170, DEC-172, DEC-544, DEC-700, DEC-681
- Deps change: no
- Runs: cloud

## What it does

MEC-036's menu for each 1.0 building kind, shrunk by its skulls (DEC-093), quest marker first (DEC-083). The 1.0 picks: the citadel rally (5 gold, heals to full, DEC-158) and virtue draw (10 gold, DEC-544); the sanctuary cure (10 gold, one corruption, first each chapter free, DEC-170, DEC-700); the village tavern rest (+3 hit points a move, DEC-174, MEC-075; the rest is the village's tavern rest, here and in feature 13: Bob approved 2026-10-31); Cleanse on every standing building (−1 skull, DEC-377, shown "+1 day", DEC-686). Every pick costs 1 move (DEC-078); gold leaves the purse (DEC-176). Silver Tongue takes a quarter off (DEC-681). Talk and shop goods wait for 1.1 (DEC-502).

C3 menus (Bob approved 2026-10-31), all prices from tuning:
- Citadel: Rally (5 gold + 1 move, heals to full), Virtue draw (10 gold + 1 move), or Cleanse.
- Sanctuary: cure (10 gold + 1 move, first one free each chapter per hero), or Cleanse.
- Village: tavern rest (+3 hit points per move), or Cleanse.
- Bazaar: Cleanse only.
- Cleanse costs 1 move and 0 gold (Bob approved 2026-10-31).
- A fallen building is not enterable and offers nothing, Cleanse included.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The free-cure-used flag per hero per chapter survives Continue (EV-12) and a host restart (EV-13) (DEC-700).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-13 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] MEC-036: closed before coding (`decided`).
- [ ] MEC-019: closed before coding (`decided`).
- [ ] MEC-075: closed before coding (`decided`).
- [ ] DEC-078: closed before coding (`decided`).
- [ ] DEC-083: closed before coding (`decided`).
- [ ] DEC-093: closed before coding (`decided`).
- [ ] DEC-158: closed before coding (`decided`).
- [ ] DEC-170: closed before coding (`decided`).
- [ ] DEC-172: closed before coding (`decided`).
- [ ] DEC-174: closed before coding (`decided`).
- [ ] DEC-176: closed before coding (`decided`).
- [ ] DEC-377: closed before coding (`decided`).
- [ ] DEC-544: closed before coding (`decided`).
- [ ] DEC-552: closed before coding (`decided`).
- [ ] DEC-681: closed before coding (`decided`).
- [ ] DEC-700: closed before coding (`decided`).
- [ ] DEC-502: closed before coding (`decided`).

## OPEN questions

- ANSWERED Q-C3-13 (Bob approved 2026-10-31): potion and audience are out of 1.0; citadel Rally (5 gold + 1 move, heals to full), Virtue draw (10 gold + 1 move) or Cleanse; sanctuary cure (10 gold + 1 move, first free per hero each chapter) or Cleanse. Was: which picks does each 1.0 building kind offer? DEC-158 lists a citadel potion and an audience; DEC-502 cuts NPCs and shops. Are the potion and audience out of 1.0?
- ANSWERED Q-C3-14 (Bob approved 2026-10-31): village = tavern rest (+3 HP per move) or Cleanse; bazaar = Cleanse only. Was: is there a 1.0 bazaar or village pick beyond rest and Cleanse, or are they Cleanse-only (P-003 gap 2 says "in 1.0 those sell nothing")?

## Eval approval

- See ./approval.md (must be filled before coding).
