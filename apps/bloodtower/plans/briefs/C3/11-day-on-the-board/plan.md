Keep this a checklist; do not write a second design doc.

# Brief: C3 / 11-day-on-the-board — The day on the board: day roll, days left, threat bar, effects panel

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 11-day-on-the-board
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, SCR-014, UI-021, UI-022, UI-028, UI-030, UI-047
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet: the screen changes, see ./screen-spec.md. Illusionist draws ./mockup.html from it before Bob approves the evals
- Risk: Med
- Depends on: C3 feature 04 merged, C2 feature 06 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/**` (new day panels), `apps/bloodtower/src/web/components/device/**` (Regroup prompt), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-day.spec.ts` (new)
- Builds: UI-021, UI-022, UI-028, UI-047, UI-030 (corruptions shown)
- Deps change: no
- Runs: cloud

## What it does

The Story board shows each day's roll (UI-021), the edge band with Day N and days left (UI-028, DEC-686), the threat bar (UI-047), the end-of-day effects panel with "+1 day" lines (UI-022, DEC-115, DEC-699), and each hero's corruptions on the hero panel (UI-030). The iPad runs the Regroup step (DEC-640) and the skull placement prompts (DEC-092).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The board after Continue shows the same days left and skulls as before the quit.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-07 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] SCR-014: closed before coding (`decided`).
- [ ] UI-021: closed before coding (`decided`).
- [ ] UI-022: closed before coding (`decided`).
- [ ] UI-028: closed before coding (`decided`).
- [ ] UI-030: closed before coding (`decided`).
- [ ] UI-047: closed before coding (`decided`).
- [ ] DEC-686: closed before coding (`decided`).
- [ ] DEC-699: closed before coding (`decided`).
- [ ] DEC-115: closed before coding (`decided`).
- [ ] DEC-640: closed before coding (`decided`).
- [ ] DEC-092: closed before coding (`decided`).
- [ ] DEC-093: closed before coding (`decided`).

## OPEN questions

- Q-C3-04 (days left for 3–4 heroes)
- DEFAULT Q-C3-19 (Gamewright default, pending Bob's review): the threat bar shows only the coming drop.

## Eval approval

- See ./approval.md (must be filled before coding).
