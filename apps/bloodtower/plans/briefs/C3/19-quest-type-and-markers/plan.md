Keep this a checklist; do not write a second design doc.

# Brief: C3 / 19-quest-type-and-markers — A scene quest may omit `quest_type`; quest markers go live per chapter; two quests may not share a space

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 19-quest-type-and-markers
- Kind: engine (schema, lint, quest store)
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, MEC-037
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: Med
- Depends on: C3 feature 18 merged (PR #514), and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/protocols/pack-v2/story.ts`, `apps/bloodtower/src/protocols/pack-v2/semantic.ts` (and their tests), `apps/bloodtower/src/engine/loops/quest/store.ts` (and its tests)
- Builds: DEC-662, DEC-697
- Deps change: no
- Runs: cloud

## Why this step exists

C3-18 (PR #514) left three things that block C3-03 (The Ruined Keep pack), found by its build and review:

1. `quest_type` is required, but no value fits the Herald, Ambush, Lock or Last Stand, which are plain-scene quests. Bob ruled on 2026-11-14: allow `quest_type` to be omitted.
2. `questsFromPack` loads every chapter's quest markers at once (`bySpace`), so a chapter-3 quest could open in chapter 1.
3. Two quests on the same `place.space` overwrite each other and lint does not catch it.

## What it does

- `quest_type` becomes optional on a quest. A quest that omits it must name a `scene` (lint). Existing packs that set it are unchanged.
- A quest marker is live only while its chapter is the current chapter; markers of other chapters are ignored. `bySpace` keeps its shape for the current chapter.
- Lint rejects two quests that share one `place.space` in the same story, naming both quest ids.

It does not write The Ruined Keep's content (C3-03).

## Cutover

Cutover: N

- Nothing dies or is renamed. A quest with `quest_type` set still loads exactly as before.

## Survival invariants

- Continue, restore, and restart must keep:
  - An autosave from before this step still restores whole, and its quest markers resolve to the same quests as before for the chapter it was saved in.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-06 all pass (verifier table on PR).
- Not required: a check that a quest's space lies in its chapter's kingdoms, or that every declared scene is named by some quest (parked for Gamewright); C3-03's pack content and copy scan.

## AREA / DEC checklist

- [ ] DEC-662: closed before coding (`decided`).
- [ ] DEC-697: closed before coding (`decided`).
- [ ] MEC-037: closed before coding (`decided`).

## Eval approval

- See ./approval.md (must be filled before coding).
