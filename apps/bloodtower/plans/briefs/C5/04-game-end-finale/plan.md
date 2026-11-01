Keep this a checklist; do not write a second design doc.

# Brief: C5 / 04-game-end-finale — The real end: the Tower won ends the game; the C4 end rule goes

## Meta

- Plan: [C5-finale-polish.md](../../../C5-finale-polish.md)
- Feature: 04-game-end-finale
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, MEC-032, DEC-144, DEC-356, DEC-663, DEC-664
- Evals: ./eval.md
- Screen spec: none (engine only; screens are in this cycle's screen features)
- Mockup: none (no screen change)
- Depends on: 01, 03, C4 08, and its `approval.md` on `main`
- Touches: `packs/base/tuning.yaml`, `apps/bloodtower/src/engine/loops/game/**`
- Builds: MEC-032, DEC-144, DEC-356
- Deps change: no
- Runs: cloud

## What it does

`c4_end_after_chapter_3: false`. Chapter 3 won opens the finale; a won Tower ends the game in the win scene with the line for the flag: `[COPY: finale win, seal shattered = "The shard shatters. The Tower's call goes quiet, and the roads are yours."]` or `[COPY: finale win, seal holds = "You swear his oath and take up his watch. Guard the shard well. The Tower called to him once, and it will call to you."]`. The switch and its C3 sibling are removed from the schema once green.

## Cutover

Cutover: N

- Nothing dies or is renamed beyond the tuning switches named above.

## Survival invariants

- Continue, restore, and restart must keep:
  - A game saved at chapter 3 won under C4 resumes into the finale, not the C4 end.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-05 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; 1.1 work (DEC-502).

## AREA / DEC checklist

- [ ] MEC-032: closed before coding (`decided`).
- [ ] DEC-144: closed before coding (`decided`).
- [ ] DEC-356: closed before coding (`decided`).
- [ ] DEC-663: closed before coding (`decided`).
- [ ] DEC-664: closed before coding (`decided`).

## OPEN questions

- None.

## Eval approval

- See ./approval.md (must be filled before coding).

