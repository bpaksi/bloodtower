Keep this a checklist; do not write a second design doc.

# Brief: C3 / 13-building-menu — The building menu on the iPad: rally, cure, rest, virtue draw, Cleanse

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 13-building-menu
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, UI-043, UI-024, MEC-036
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet: the screen changes, see ./screen-spec.md. Illusionist draws ./mockup.html from it before Bob approves the evals
- Risk: Med
- Depends on: C3 feature 06 merged, C3 feature 08 merged, C2 feature 06 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/device/PlaceMenu*.tsx`, `apps/bloodtower/src/web/components/board/**` (place painting and results), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-building.spec.ts`
- Builds: UI-043, UI-024
- Deps change: no
- Runs: cloud

## What it does

UI-043 on the iPad: each pick with its move and gold cost, the quest marker first (UI-024, DEC-083), unaffordable picks disabled; the board shows the place's painting and each result. Corruption cures show which corruption goes.

Each building shows its own offers plus Leave, and no Trade (Bob approved 2026-10-31): citadel: Rally (5 gold + 1 move), Virtue draw (10 gold + 1 move) or Cleanse; sanctuary: Cure (10 gold + 1 move, first one free each chapter) or Cleanse; village: tavern Rest (+3 hit points per move; Bob approved 2026-10-31) or Cleanse; bazaar: Cleanse only (Bob approved 2026-10-31).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - After Continue at a building, the menu shows the same picks and prices (the free cure state included).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-12 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] UI-043: closed before coding (`decided`).
- [ ] UI-024: closed before coding (`decided`).
- [ ] MEC-036: closed before coding (`decided`).
- [ ] DEC-078: closed before coding (`decided`).
- [ ] DEC-083: closed before coding (`decided`).
- [ ] DEC-093: closed before coding (`decided`).
- [ ] DEC-158: closed before coding (`decided`).
- [ ] DEC-170: closed before coding (`decided`).
- [ ] DEC-174: closed before coding (`decided`).
- [ ] DEC-377: closed before coding (`decided`).
- [ ] DEC-544: closed before coding (`decided`).
- [ ] DEC-681: closed before coding (`decided`).
- [ ] DEC-700: closed before coding (`decided`).

## OPEN questions

- ANSWERED building menus (Bob approved 2026-10-31): citadel: Rally (5 gold + 1 move), Virtue draw (10 gold + 1 move) or Cleanse; sanctuary: Cure (10 gold + 1 move, first one free each chapter) or Cleanse; village: tavern Rest (+3 hit points per move; Bob approved 2026-10-31) or Cleanse; bazaar: Cleanse only (Bob approved 2026-10-31).

- ANSWERED Q-C3-13 (Bob approved 2026-10-31): potion and audience are out of 1.0; citadel Rally (5 gold + 1 move, heals to full), Virtue draw (10 gold + 1 move) or Cleanse; sanctuary cure (10 gold + 1 move, first free per hero each chapter) or Cleanse. Was:, Q-C3-14 (1.0 picks per building kind)
- ANSWERED Q-C3-20 (Bob approved 2026-10-31): the hero picks which corruption a cure removes.

## Eval approval

- See ./approval.md (must be filled before coding).
