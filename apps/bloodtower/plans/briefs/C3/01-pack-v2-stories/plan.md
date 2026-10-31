Keep this a checklist; do not write a second design doc.

# Brief: C3 / 01-pack-v2-stories — Stories load from pack v2; the v1 loader goes

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 01-pack-v2-stories
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, MEC-078, MEC-079
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: High
- Depends on: its approval.md on main, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/server/pack/{load,assets,camera,audio}.ts` and tests, `apps/bloodtower/src/server/pack/v2/**`, `apps/bloodtower/src/protocols/{pack,storyCard,control}.ts`, `apps/bloodtower/src/engine/loops/session/pack.ts` (the read of the story card only), `apps/bloodtower/src/server/timing/{log,stats}.ts`, `apps/bloodtower/src/server/control/lock.ts`
- Builds: none
- Deps change: no
- Runs: cloud

## What it does

The host and the engine read every story from pack format v2 (`server/pack/v2/load.ts`). The v1 loader and its story-card shapes go. Today's `packs/test` (already `format: 2`) keeps loading; Dracula stays listed as metadata (DEC-691). The asset half of the v1 loader is A1's job; this feature keeps today's asset serving working on v2 paths only. Asset serving does not need `server/pack/load.ts`: it moves to `server/pack/assets.ts` (already in Touches), so `load.ts` is deleted outright and no v1 file survives.

## Cutover

Cutover: Y

- `server/pack/load.ts` (deleted whole; asset serving lives in `server/pack/assets.ts`) and `protocols/pack.ts`, `storyCard.ts`: story loading reads pack format v2 only (C2 audit, "Lines for the C3 plan").
- Dead files: `server/timing/{log,stats}.ts`, `server/control/lock.ts` and their tests (C2 audit), unless a C2 feature already removed them.

## Survival invariants

- Continue, restore, and restart must keep:
  - An autosave written before this feature by the v1 path is dropped (Q-C3-07): it is not offered as Continue, the row is kept in the DB and ignored (Bob approved 2026-10-31), the host logs one line `save skipped: pre-C3 format` with the old version, and nothing crashes (the error rule). No migration code.
  - Pick story lists the same stories, in the same order, before and after.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-07 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] AREA-097: closed before coding (`decided`).
- [ ] DEC-691: closed before coding (`decided`).
- [ ] DEC-660: closed before coding (`decided`).
- [ ] DEC-666: closed before coding (`decided`).
- [ ] MEC-078: closed before coding (`decided`).
- [ ] MEC-079: closed before coding (`decided`).

## OPEN questions

- ANSWERED Q-C3-07 (Bob, 2026-10-31): yes, pre-C3 saves are dropped, not migrated.

## Eval approval

- See ./approval.md (must be filled before coding).
