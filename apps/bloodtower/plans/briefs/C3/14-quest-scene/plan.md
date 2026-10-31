Keep this a checklist; do not write a second design doc.

# Brief: C3 / 14-quest-scene — The quest scene: the track, the choice, the item hand-off

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 14-quest-scene
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, UI-042, UI-025, UI-036, MEC-037, MEC-077
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet: the screen changes, see ./screen-spec.md. Illusionist draws ./mockup.html from it before Bob approves the evals
- Risk: Med
- Depends on: C3 feature 07 merged, C2 feature 06 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/QuestScene.tsx` (new), `apps/bloodtower/src/web/components/device/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-quest.spec.ts`
- Builds: UI-042, UI-025, UI-036
- Deps change: no
- Runs: cloud

## What it does

UI-042: the quest's painting and narration on a Scroll, the 2 or 3 options on the iPad with their costs, a disabled option for a missing item (DEC-654), the item Reveal and the hero pick (UI-036, DEC-653), the rewards (MEC-037 .9) and the quest track (UI-025).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The gear Menu and any gear panel come back closed, the game not paused, the toolbar on every iPad, and item states recomputed (EV-15).
  - A quest left mid-choice reopens at its choice after Continue.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-15 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] UI-042: closed before coding (`decided`).
- [ ] UI-025: closed before coding (`decided`).
- [ ] UI-036: closed before coding (`decided`).
- [ ] MEC-037: closed before coding (`decided`).
- [ ] MEC-077: closed before coding (`decided`).
- [ ] DEC-642: closed before coding (`decided`).
- [ ] DEC-653: closed before coding (`decided`).
- [ ] DEC-654: closed before coding (`decided`).
- [ ] DEC-692: closed before coding (`decided`).
- [ ] DEC-693: closed before coding (`decided`).
- [ ] DEC-714: closed before coding (`decided`).
- [ ] DEC-700: closed before coding (`decided`).

## OPEN questions

- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4.
- ANSWERED Q-C3-22 (Bob approved 2026-10-31): 10 gold; a short group pays all its gold plus 2 HP per present hero, never below 1 HP, and the quest finishes. Was: with Fight hidden, The Ambush finishes only by paying the toll (DEC-662). The toll amount is not carded, and a group that cannot pay cannot win chapter 1. What is the toll, and what happens when the purse is short?

## Eval approval

- See ./approval.md (must be filled before coding).
