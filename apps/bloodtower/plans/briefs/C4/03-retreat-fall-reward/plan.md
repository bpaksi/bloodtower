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

A won battle gives gold and one card by foe level (DEC-120). A won battle pays 2 gold × the foe's level (DEC-547). A retreat in a group's turn needs and spends a move; the foe gets its last attack and the group falls back a space, or stays at a building (DEC-313). A retreat or fall leaves the foe, which steps up 1 in 3, +1 level, up to lethal (DEC-555). All present heroes falling is a fall: the group loses 2 × the foe's level, split evenly and capped at each hero's gold (DEC-177, DEC-179); each fallen hero takes a corruption and returns at 1 HP (DEC-119). Retreat at day close needs no move.

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

## Values (filled from cards)

- Win: 2 gold × foe level; disaster double; no gold on retreat or fall (DEC-547).
- Retreat: needs a move in a group's turn (DEC-313); free at day close (DEC-670); foe's last attack; fall back a space or stay at a building.
- Fall: 2 × foe level, split, capped, shortfall not passed on (DEC-177, DEC-179); corruption, back at 1 HP (DEC-119). Answers Q-C4-12.
- Step-up: 1 in 3 per retreat or fall, +1 level, stops at lethal; waiting foes don't grow (DEC-555). Answers Q-C4-13.

## OPEN questions

- ANSWERED by DEC-177/179 (0005) Q-C4-12: A fallen group's gold loss (DEC-177): how much? Options: (a) half the purse, rounded down, as `battle.fall_gold_loss` = 0.5; (b) a flat 10 gold, never below 0. Gamewright pick: (a) (Gamewright pick, pending Bob).
- ANSWERED by DEC-555 (0005) Q-C4-13: A foe that stays and grows (DEC-016): is the growth capped? Options: (a) capped at +2 levels over its start; (b) no cap. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).
