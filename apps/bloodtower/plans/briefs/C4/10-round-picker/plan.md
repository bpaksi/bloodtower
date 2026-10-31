Keep this a checklist; do not write a second design doc.

# Brief: C4 / 10-round-picker — The round picker on the iPad: Fight or Retreat, then one action

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 10-round-picker
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, UI-027, DEC-118, DEC-129
- Evals: ./evals.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 02, C2 06, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/device/RoundPicker*.tsx` (new), `apps/bloodtower/src/e2e/tests/c4-round.spec.ts`
- Builds: UI-027
- Deps change: no
- Runs: cloud

## What it does

UI-027: the group picks Fight or Retreat; then each present hero picks one action, all at once (Gamewright pick, pending Bob) (Q-C4-16); the board ticks each hero who has picked. No timer (Gamewright pick, pending Bob) (Q-C4-11).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A pick made before a quit is still shown after Continue.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-05 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] UI-027: closed before coding (`decided`).
- [ ] DEC-118: closed before coding (`decided`).
- [ ] DEC-129: closed before coding (`decided`).

## OPEN questions

- OPEN Q-C4-16 **[Bob taste call]**: Round actions on the iPads (DEC-129): all at once or in turn? Options: (a) all at once; the board ticks each hero who has picked, and the round runs when all have; (b) in turn order, one iPad at a time. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-11 **[Bob taste call]**: Does a battle round have a timer on the iPads? Options: (a) no timer; the round waits for every present hero; (b) 30 seconds, then a missing pick becomes a normal attack (DEC-129). Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).
