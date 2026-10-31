Keep this a checklist; do not write a second design doc.

# Brief: C3 / 07-quests-plain-scenes — Quests and plain scenes: markers, the one choice, costs, effects and items

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 07-quests-plain-scenes
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, MEC-037, MEC-077
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: High
- Depends on: C3 feature 03 merged, C3 feature 06 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/quest/**` (new level), `apps/bloodtower/src/engine/loops/scene/**` (new level), `apps/bloodtower/src/engine/loops/encounter/loop.ts` (the quest pick only)
- Builds: MEC-037, MEC-077, DEC-642, DEC-692, DEC-693, DEC-714, DEC-653, DEC-654, DEC-151, DEC-700
- Deps change: no
- Runs: cloud

## What it does

MEC-037 for the plain-scene type and MEC-077 as its one step: the scene's 2 or 3 options, one needing an item no present hero holds shown disabled (DEC-654); a cost of gold, hit points from each present hero (stopping at 1, DEC-714), or a corruption to one hero the group picks (DEC-693); 1 to 3 effects in order (DEC-692); an item goes to the hero the group picks (DEC-653). A done quest pays 5 gold to each present hero (DEC-700), counts toward the chapter (DEC-041) and marks the day for DEC-699. The Tomb type (MEC-026) and an option's battle are C4.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A quest's progress (done, or left with progress) survives Continue (DEC-151).
  - A held story item stays with its hero across Continue.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-08 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] MEC-037: closed before coding (`decided`).
- [ ] MEC-077: closed before coding (`decided`).
- [ ] DEC-041: closed before coding (`decided`).
- [ ] DEC-063: closed before coding (`decided`).
- [ ] DEC-151: closed before coding (`decided`).
- [ ] DEC-642: closed before coding (`decided`).
- [ ] DEC-653: closed before coding (`decided`).
- [ ] DEC-654: closed before coding (`decided`).
- [ ] DEC-692: closed before coding (`decided`).
- [ ] DEC-693: closed before coding (`decided`).
- [ ] DEC-714: closed before coding (`decided`).
- [ ] DEC-700: closed before coding (`decided`).
- [ ] DEC-699: closed before coding (`decided`).
- [ ] DEC-084: closed before coding (`decided`).
- [ ] DEC-672: closed before coding (`decided`).
- [ ] DEC-674: closed before coding (`decided`).

## OPEN questions

- Q-C3-02 (as feature 05): The Ambush's "Fight them" and The Last Stand are battle options (DEC-692, MEC-077 .4). In C3 is the option disabled, auto-resolved, or is C3 blocked on C4's battle?

## Eval approval

- See ./approval.md (must be filled before coding).
