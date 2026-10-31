Keep this a checklist; do not write a second design doc.

# Brief: C5 / 07-tower-screens — The Tower on screen: level map, room view, the iPad's doors

## Meta

- Plan: [C5-finale-polish.md](../../../C5-finale-polish.md)
- Feature: 07-tower-screens
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, MEC-076, DEC-566, DEC-583
- Evals: ./evals.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 01, C4 12, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/Tower*.tsx` (new), `apps/bloodtower/src/web/components/device/TowerPicker.tsx` (new)
- Builds: MEC-076 (screens; UI cards to be filed)
- Deps change: no
- Runs: cloud

## What it does

The Tower reuses the Tomb's two halves: the level's room map and the room view (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-01). The iPad: Open the next door, Rest (at a found shrine), Retreat.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - After Continue the map shows the same level and cleared rooms.
  - After a restart and Continue, the Menu and any gear panel come back closed.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-12 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; 1.1 work (DEC-502).

## AREA / DEC checklist

- [ ] MEC-076: closed before coding (`decided`).
- [ ] DEC-566: closed before coding (`decided`).
- [ ] DEC-583: closed before coding (`decided`).

## OPEN questions

- Resolved Q-C5-01 **[Bob taste call]**: The Tower has no screen cards. What does the board show in the Tower (MEC-076)? Options: (a) reuse the Tomb's two halves (DEC-583): the level's room map left, the room view right; Gamewright files UI cards for it in a design session; (b) the room map only, full width. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Eval approval

- See ./approval.md (must be filled before coding).
