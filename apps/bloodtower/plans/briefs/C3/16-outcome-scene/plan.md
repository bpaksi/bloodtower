Keep this a checklist; do not write a second design doc.

# Brief: C3 / 16-outcome-scene — The outcome scene: win or loss

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 16-outcome-scene
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, SCR-018, UI-046
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet: the screen changes, see ./screen-spec.md. Illusionist draws ./mockup.html from it before Bob approves the evals
- Risk: Med
- Depends on: C3 feature 10 merged, C2 feature 07 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/OutcomeScene.tsx` (new), `apps/bloodtower/src/web/components/device/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-outcome.spec.ts`
- Builds: SCR-018, UI-046
- Deps change: no
- Runs: cloud

## What it does

SCR-018: the story's win or loss Painting and narration (UI-046, DEC-144), the win line picked by the last choice's flag (DEC-664), a one-line summary that hands off to Game stats; it auto-advances to Game stats, no Next (DEC-627; Bob 2026-10-31 10:38 AM ET).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The gear Menu and any gear panel come back closed, the game not paused, the toolbar on every iPad, and item states recomputed (EV-15).
  - A host restart on the outcome scene lands on the session screen with the game listed with its outcome, not on a half-shown scene.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-15 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] SCR-018: closed before coding (`decided`).
- [ ] UI-046: closed before coding (`decided`).
- [ ] DEC-144: closed before coding (`decided`).
- [ ] DEC-627: closed before coding (`decided`).
- [ ] DEC-663: closed before coding (`decided`).
- [ ] DEC-664: closed before coding (`decided`).
- [ ] CUE-003: closed before coding (`decided`).

## OPEN questions

- ANSWERED Q-C3-01 (Bob, 2026-10-31 10:09 AM ET): clearing chapter 1 counts as the C3 win.
- ANSWERED Q-C3-23 (Bob approved 2026-10-31): the DEC-144 win scene plays, then the Loremaster line `[COPY: chapter 1 win, Loremaster]`. Was: which win scene and line play for the C3 win? DEC-663 and DEC-664 write the win for the finale, after the last choice, which C3 never reaches. Use a placeholder `[COPY: chapter 1 win]`, or the finale's win scene without the line?

## Eval approval

- See ./approval.md (must be filled before coding).
