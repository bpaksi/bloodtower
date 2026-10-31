Keep this a checklist; do not write a second design doc.

# Brief: C3 / 12-event-scene — The event scene: the painting, the words and the choice

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 12-event-scene
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, UI-041, UI-035, MEC-072
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet: the screen changes, see ./screen-spec.md. Illusionist draws ./mockup.html from it before Bob approves the evals
- Risk: Low
- Depends on: C3 feature 05 merged, C2 feature 06 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/EventScene.tsx` (new), `apps/bloodtower/src/web/components/device/**` (choice list), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-event.spec.ts`
- Builds: UI-041
- Deps change: no
- Runs: cloud

## What it does

UI-041: a painting with the event's words on a Scroll (UI-035), the choices on the iPad, the present heroes choosing together (DEC-019).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - An open event shows the same card and choices after Continue.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-10 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] UI-041: closed before coding (`decided`).
- [ ] UI-035: closed before coding (`decided`).
- [ ] MEC-072: closed before coding (`decided`).
- [ ] DEC-019: closed before coding (`decided`).
- [ ] DEC-022: closed before coding (`decided`).
- [ ] DEC-027: closed before coding (`decided`).
- [ ] DEC-018: closed before coding (`decided`).
- [ ] DEC-023: closed before coding (`decided`).

## OPEN questions

- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4.
- Q-C3-03 (people offers in 1.0)

## Eval approval

- See ./approval.md (must be filled before coding).
