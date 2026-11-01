Keep this a checklist; do not write a second design doc.

# Brief: C4 / 14-fight-buttons — Fight on the event and quest scenes

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 14-fight-buttons
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, UI-041, UI-042, DEC-023, DEC-028
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 04, C3 12, C3 14, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/device/{EventChoice,SceneChoice}.tsx`
- Builds: UI-041, UI-042
- Deps change: no
- Runs: cloud

## What it does

C3 hid Fight (Q-C3-02). C4 shows it on foes and disaster events and on battle options in scenes (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C4-02); a Fight pick hands to the battle (features 09, 10).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - After Continue at an event, Fight is still offered.
  - After a restart and Continue, the Menu and any gear panel come back closed.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-11 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] UI-041: closed before coding (`decided`).
- [ ] UI-042: closed before coding (`decided`).
- [ ] DEC-023: closed before coding (`decided`).
- [ ] DEC-028: closed before coding (`decided`).

## OPEN questions

- Resolved Q-C4-02: Where does Fight show once `fight_enabled` is on? Options: (a) on every foes and disaster event and on every plain-scene option that holds a battle, always enabled; (b) on foes events only; disasters stay Go around / Pay them off until C5. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Eval approval

- See ./approval.md (must be filled before coding).
