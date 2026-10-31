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

In C3 a plain-scene option that holds a battle (The Ambush's "Fight them", DEC-662) is hidden (Q-C3-02); The Ambush is finished by paying the toll. The Ambush may then show one option while Fight is hidden: a documented C3 exception to DEC-692's 2–3 option rule; lint allows it only for a scene whose other options are all hidden battle options (Gamewright default, Bob to confirm). The toll is 10 gold from tuning; a group whose purse is short pays all it has plus 2 hit points per present hero, never below 1 hit point, and the quest finishes (Gamewright proposal, pending Bob, Q-C3-22).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A quest's progress (done, or left part-done with progress) survives Continue (DEC-151): EV-09 done, EV-10 part-done.
  - A held story item stays with its hero across Continue.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-10 all pass (verifier table on PR).
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

- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4. A plain-scene option that holds a battle is hidden, not disabled.
- Q-C3-22: with Fight hidden, The Ambush finishes only by paying the toll (DEC-662). The toll amount is not carded, and a group that cannot pay cannot win chapter 1. What is the toll, and what happens when the purse is short? Gamewright proposal, pending Bob: 10 gold; short group pays all + 2 HP per present hero, never below 1.

## Eval approval

- See ./approval.md (must be filled before coding).
