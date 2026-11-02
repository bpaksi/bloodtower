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
- Touches: `apps/bloodtower/src/server/pack/{load,assets,camera,audio,fit}.ts` and tests (`fit.ts` and `fit.test.ts` deleted), `apps/bloodtower/src/server/pack/serve.ts` and `serve.test.ts` (the `/packs/<id>/asset/<assetId>` route is removed; v2 keeps only `/packs/<id>/assets/<file>`), `apps/bloodtower/src/server/pack/v2/**`, `apps/bloodtower/src/server/core/loadStories.ts`, `apps/bloodtower/src/server/scripts/packLint.ts`, `apps/bloodtower/src/server/events/store.ts` (autosave `format` field), `apps/bloodtower/src/server/hub/host.ts` (autosave check), `apps/bloodtower/src/protocols/{pack,storyCard,index}.ts`, `apps/bloodtower/src/engine/loops/session/pack.ts` (its local `StoryCard` type is renamed, since EV-02 bans that name), `apps/bloodtower/src/server/timing/{log,stats}.ts`, `apps/bloodtower/src/server/control/lock.ts`, `apps/bloodtower/src/server/server.test.ts`, `apps/bloodtower/src/server/events/timingEvents.test.ts`, `apps/bloodtower/src/server/scripts/timingReport.test.ts` (rewrite), `apps/bloodtower/src/e2e/tests/w3-pick-story.spec.ts` and fixture `apps/bloodtower/src/e2e/tests/w3-pick-story.main.json`
- Builds: none
- Deps change: no
- Runs: cloud

## What it does

The host and the engine read every story from pack format v2 (`server/pack/v2/load.ts`). The v1 loader and its story-card shapes go. Today's `packs/test` (already `format: 2`) keeps loading; Dracula stays listed as metadata (DEC-691): `v2/load.ts` gets a metadata-only path for packs with `playable: false`, which reads the manifest and validates no story content. `packs/dracula` and the schema are not changed. The asset half of the v1 loader is A1's job; this feature keeps today's asset serving working on v2 paths only. Asset serving does not need `server/pack/load.ts`: it moves to `server/pack/assets.ts` (already in Touches), so `load.ts` is deleted outright and no v1 file survives.

## Cutover

Cutover: Y

- `server/pack/load.ts` (deleted whole; asset serving lives in `server/pack/assets.ts`) and `protocols/pack.ts`, `storyCard.ts`: story loading reads pack format v2 only (C2 audit, "Lines for the C3 plan").
- Dead files: `server/timing/{log,stats}.ts`, `server/control/lock.ts` and their tests (C2 audit), unless a C2 feature already removed them.

## Survival invariants

- Continue, restore, and restart must keep:
  - An autosave is pre-C3 when its row has no `format: 2` (this feature adds `format` to the autosave row and writes `2`). It is dropped (Q-C3-07): it is not offered as Continue, the row is kept in the DB and ignored (Bob approved 2026-10-31), the host logs one line `save skipped: pre-C3 format {version}` at warn through `server/log/hostLog.ts` (`log.warn`), where `{version}` is the row's recorded `format` or `none`; play starts fresh, and nothing crashes (the error rule). No migration code.
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

## Change note

- 2026-11-01: unblock edits (EV-01/03/06/07 detail, Touches); small tweak to the approved plan, no re-approval (Bob's Nov 1 rule).

## Eval approval

- See ./approval.md (must be filled before coding).
