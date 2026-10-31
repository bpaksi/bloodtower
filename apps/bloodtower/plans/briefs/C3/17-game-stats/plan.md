Keep this a checklist; do not write a second design doc.

# Brief: C3 / 17-game-stats — Game stats: the game in numbers

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 17-game-stats
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, SCR-019, SCR-021
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet: the screen changes, see ./screen-spec.md. Illusionist draws ./mockup.html from it before Bob approves the evals
- Risk: Low
- Depends on: C3 feature 16 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/GameStats.tsx` (extends C2 07's quit-game stats), `apps/bloodtower/src/web/components/device/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-stats.spec.ts`
- Builds: SCR-019, DEC-116
- Deps change: no
- Runs: cloud

## What it does

SCR-019 as its own screen after the outcome (DEC-627): outcome, time played, days, quests done, corruptions taken, gold left, key moments, and the optional 1–5 fun rating that never blocks Next; DEC-116's active length against the best and the average.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The fun rating, once given, is stored with the game and shown on drill-in from tonight's games.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-06 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] SCR-019: closed before coding (`decided`).
- [ ] DEC-116: closed before coding (`decided`).
- [ ] DEC-117: closed before coding (`decided`).
- [ ] DEC-627: closed before coding (`decided`).
- [ ] SCR-021: closed before coding (`decided`).

## OPEN questions

- Q-C3-18 (key moments)
- Q-C3-21: the fun rating: one for the table, or one per iPad?

## Eval approval

- See ./approval.md (must be filled before coding).
