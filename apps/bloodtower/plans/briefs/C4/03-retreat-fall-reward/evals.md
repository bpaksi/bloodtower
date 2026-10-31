Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 03-retreat-fall-reward — Battle ends: the reward, the retreat, the group's fall

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-06; survival evals last (EV-06).

## Checks

### EV-01 — Reward by level
- Requirement: DEC-120.
- Method: unit
- How: win vs level 3.
- Pass evidence: gold = 2 × 3 = 6 (`battle.reward_gold_per_level` = 2, DEC-547, DEC-703); exactly one card, drawn from the level-3 reward deck (`battle.reward_deck[3]`).
- Fails if: any other gold, no card, or a card from another level's deck.

### EV-02 — A foe steps up 1 in 3, +1 level, stopping at lethal
- Requirement: DEC-555, DEC-703.
- Method: sim
- How: 10,000 seeded retreats and falls from a level-2 foe at status 1; then a fixture foe at lethal.
- Pass evidence: step rate 0.333 ± 0.01; each step is exactly +1 level; the lethal foe never steps.
- Fails if: rate outside, a step of 0 or 2+, or a lethal foe steps.

### EV-03 — A fall costs 2 × the foe's level, split and capped
- Requirement: DEC-177, DEC-179, DEC-703.
- Method: unit
- How: a level-3 foe; two present heroes fall holding 25 and 2 gold (`battle.fall_gold_per_level` = 2, so the loss is 6, split 3 and 3).
- Pass evidence: heroes hold 22 and 0; the 1-gold shortfall is not passed on; each fallen hero takes a corruption and returns at 1 HP (DEC-119).
- Fails if: 21 and 0, any other split, or no corruption.

### EV-04 — A retreat that fells everyone is a fall
- Requirement: DEC-671.
- Method: unit
- How: retreat with all at 0.
- Pass evidence: fall result.
- Fails if: retreat result.

### EV-05 — Retreat at day close needs no move
- Requirement: DEC-670.
- Method: unit
- How: a battle open at the day's close with 0 moves left; pick Retreat.
- Pass evidence: the retreat succeeds with moves still 0 and no `move.spent` event.
- Fails if: the retreat is refused or a move is spent.

## Survival evals (one per survival invariant in plan.md)

### EV-06 — A grown foe survives Continue
- Requirement: DEC-016.
- Method: playwright
- How: grow a foe, quit, Continue.
- Pass evidence: same level on the board.
- Fails if: reset.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- ANSWERED by DEC-177/179 (0005) Q-C4-12: A fallen group's gold loss (DEC-177): how much? Options: (a) half the purse, rounded down, as `battle.fall_gold_loss` = 0.5; (b) a flat 10 gold, never below 0. Gamewright pick: (a) (Gamewright pick, pending Bob).
- ANSWERED by DEC-555 (0005) Q-C4-13: A foe that stays and grows (DEC-016): is the growth capped? Options: (a) capped at +2 levels over its start; (b) no cap. Gamewright pick: (a) (Gamewright pick, pending Bob).
