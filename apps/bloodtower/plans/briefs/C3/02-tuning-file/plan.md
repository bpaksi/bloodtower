Keep this a checklist; do not write a second design doc.

# Brief: C3 / 02-tuning-file — The tuning file holds DEC-703's numbers

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 02-tuning-file
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099,
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: Med
- Depends on: its approval.md on main, and its `approval.md` on `main`
- Touches: `packs/base/tuning.yaml` (new), `apps/bloodtower/src/protocols/pack-v2/base.ts` (tuning schema), `apps/bloodtower/src/server/pack/v2/load.ts`, `apps/bloodtower/src/engine/state.ts` (tuning on the state, read-only)
- Builds: DEC-703, DEC-500
- Deps change: no
- Runs: cloud

## What it does

One tuning file in the base pack carries every number in DEC-703's tables, each as a placeholder (DEC-500, DEC-131). The engine reads numbers only from it; no rules feature hard-codes a number. Battle, Tomb and Tower rows are loaded now but used from C4 and C5.

Holds the two C3 switches Bob ruled (2026-10-31): `c3_end_after_chapter_1: true` (Q-C3-01) and `fight_enabled: false` (Q-C3-02). C4 and C5 flip them.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A saved game keeps the tuning values it started with: Continue does not pick up a changed tuning file mid-game.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-04 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] DEC-703: closed before coding (`decided`).
- [ ] DEC-500: closed before coding (`decided`).
- [ ] DEC-131: closed before coding (`decided`).
- [ ] DEC-699: closed before coding (`decided`).
- [ ] DEC-700: closed before coding (`decided`).
- [ ] DEC-701: closed before coding (`decided`).
- [ ] DEC-702: closed before coding (`decided`).
- [ ] AST-B04: closed before coding (`decided`).

## OPEN questions

- Q-C3-08: can a story pack override tuning values (e.g. The Ruined Keep's Warden level 5, DEC-361), or does only the base file hold them?

## Eval approval

- See ./approval.md (must be filled before coding).
