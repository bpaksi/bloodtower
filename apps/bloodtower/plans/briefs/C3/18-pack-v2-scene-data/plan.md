Keep this a checklist; do not write a second design doc.

# Brief: C3 / 18-pack-v2-scene-data — Pack v2 holds quests with places, plain scenes, items and endings, and lint enforces DEC-692 and DEC-693

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 18-pack-v2-scene-data
- Kind: engine (schema and lint)
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, MEC-037, MEC-077
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: High
- Model: opus
- Depends on: C3 feature 01 merged, C3 feature 07 merged (its `PlainScene` types are the shape to mirror), and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/protocols/pack-v2/**`, `apps/bloodtower/src/server/scripts/packLint.ts`, `apps/bloodtower/src/server/pack/v2/**`, `apps/bloodtower/src/engine/loops/scene/scene.ts` and `apps/bloodtower/src/engine/loops/quest/store.ts` (read the pack's data in place of fixtures; no rule change), `packs/base/**` and `packs/dracula/**` (only to keep them lint-clean)
- Builds: DEC-692, DEC-693, DEC-697
- Deps change: no
- Runs: cloud

## Why this step exists

The coordinator's first run of C3-03 (The Ruined Keep pack) stopped before code on 2026-11-13: `storyPackSchema` is strict and has no place on a quest, no village or wild quest type, no scenes, options, costs, items, loss scenes or win lines, and no gold, hit-point, corruption, item or battle effect. C3-07 built the scene engine on fixtures (`engine/loops/quest/fixtures.ts`). Lint checks only flags and schema validity, so the DEC-692 and DEC-693 rules have nothing to run on. C3-03 can only fill pack files once this step lands (Bob chose a schema step first, 2026-11-13).

## What it does

Gives pack v2 the fields C3-03 needs and nothing more, mirroring the shapes C3-07 already uses (`PlainScene`, `SceneOption`, `SceneCost`, `SceneEffect`):

- A quest gains its place and a village or wild type, so EV-02 of C3-03 can state each quest's space.
- A pack declares plain scenes (2 or 3 options; the one C3 exception for a scene whose other options are all hidden battles), options with an optional cost (gold, hit points, corruption, the Ambush toll), an optional needed item, 1 to 3 effects, and a battle flag.
- A pack declares items, each with its giving quest and option, and win lines and loss scenes with the flag condition they read.
- Lint enforces: 1 to 3 effects and at most one battle per option (DEC-692); costs only gold, hit points or corruption, never an item (DEC-693); exactly the declared items given by a real quest; an unlisted new string field fails the copy scan's field-list check.
- The scene and quest stores read these fields from the loaded pack. The fixtures stay for unit tests only.

It does not write The Ruined Keep's content. That is C3-03.

## Cutover

Cutover: N

- Nothing dies or is renamed. New fields are optional, so `packs/base` and `packs/dracula` load unchanged.

## Survival invariants

- Continue, restore, and restart must keep:
  - A pack without the new fields loads and plays as before.
  - A pre-existing autosave still loads or is dropped by feature 01's rule; this step adds no save field.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-08 all pass (verifier table on PR).
- Not required: The Ruined Keep's content (C3-03), battle, the Tomb and the Tower (C4, C5), story copy.

## AREA / DEC checklist

- [ ] DEC-692: closed before coding (`decided`).
- [ ] DEC-693: closed before coding (`decided`).
- [ ] DEC-697: closed before coding (`decided`).
- [ ] MEC-037: closed before coding (`decided`).
- [ ] MEC-077: closed before coding (`decided`).

## Build notes (2026-11-14)

- Layout: a quest takes `place: {space, type: village|wild}` and `scene: <id>`; the story takes `scenes`, `items` (`from: {quest, option?}`; `option` only when that quest is a plain scene) and `endings` (`win` lines with `id`, `when`, `text`; `loss` with `way`, `text`). A battle is the effect `{kind: battle}`; the engine converter (`sceneFromPack`) turns it into `battle: true`.
- Lint runs in the loader (`pack/v2/load.ts`), so `packLint.ts` needed no change. A quest whose `place.space` is not on the base board is also a P2-2 issue.
- Copy scan: it is C3-03's (EV-05, `lint.test.ts`). The new player-facing strings use only keys on its list (`label`, `text`).
- `quest_type` stays required with its six values; C3-03 must pick one for each plain-scene quest or raise it.
- A quest with no plain scene (the Tomb) gets no quest def in the store until C4.

## Eval approval

- See ./approval.md (must be filled before coding).
