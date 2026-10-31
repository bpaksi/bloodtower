Keep this a checklist; do not write a second design doc.

# Brief: C4 / 03-retreat-fall-reward — Battle ends: the reward, the retreat, the group's fall

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 03-retreat-fall-reward
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, DEC-120, DEC-016, DEC-177, DEC-670, DEC-671
- Evals: ./evals.md
- Screen spec: none (engine only; screens are in this cycle's screen features)
- Mockup: none (no screen change)
- Depends on: 02, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/battle/close.ts`, `apps/bloodtower/src/engine/rules/battle/reward.ts`
- Builds: DEC-120, DEC-016, DEC-177, DEC-670, DEC-671
- Deps change: no
- Runs: cloud

## What it does

A won battle gives gold and one card by foe level (DEC-120). A retreat leaves the foe, which grows +1 level, capped at +2 (Gamewright pick, pending Bob) (Q-C4-13). All present heroes falling is a fall: the group loses half its purse (Gamewright pick, pending Bob) (Q-C4-12). Retreat at day close needs no move.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A grown foe keeps its level across Continue and across days.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-06 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] DEC-120: closed before coding (`decided`).
- [ ] DEC-016: closed before coding (`decided`).
- [ ] DEC-177: closed before coding (`decided`).
- [ ] DEC-670: closed before coding (`decided`).
- [ ] DEC-671: closed before coding (`decided`).

## OPEN questions

- OPEN Q-C4-12: A fallen group's gold loss (DEC-177): how much? Options: (a) half the purse, rounded down, as `battle.fall_gold_loss` = 0.5; (b) a flat 10 gold, never below 0. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-13: A foe that stays and grows (DEC-016): is the growth capped? Options: (a) capped at +2 levels over its start; (b) no cap. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).
