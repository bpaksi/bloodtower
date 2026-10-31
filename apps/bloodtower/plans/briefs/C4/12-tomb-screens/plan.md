Keep this a checklist; do not write a second design doc.

# Brief: C4 / 12-tomb-screens — The Tomb on screen: the map and the view, the iPad's three corridors

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 12-tomb-screens
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-094, DEC-583 to DEC-592, DEC-617 to DEC-620
- Evals: ./evals.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 06, 09, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/Tomb*.tsx` (new), `apps/bloodtower/src/web/components/device/TombPicker.tsx` (new)
- Builds: DEC-583, DEC-584, DEC-585, DEC-591, DEC-592
- Deps change: no
- Runs: cloud

## What it does

DEC-583's two halves side by side: the map (found rooms, current glowing, doorways, Exit, Undead Advantage count) and the view (the panning room view). The iPad shows up to three corridor cards plus Listen and Leave (DEC-591). A trap or battle replaces the view (DEC-592). Room art is placeholder (Gamewright pick, pending Bob) (Q-C4-15).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - After Continue the map shows the same found and cleared rooms.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-06 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] AREA-094: closed before coding (`decided`).
- [ ] DEC-583 to DEC-592: closed before coding (`decided`).
- [ ] DEC-617 to DEC-620: closed before coding (`decided`).

## OPEN questions

- OPEN Q-C4-08: How many rooms does a 1.0 Tomb deal (DEC-491)? Options: (a) 7 rooms, guardian hidden in one of the last 3; (b) 5 rooms; (c) 9 rooms. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-15 **[Bob taste call]**: Foe paintings in C4, before the A1 art run (C5): Options: (a) one placeholder painting per foe level, swapped by A1 in C5; (b) A1 draft art now, as the art lands. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).
