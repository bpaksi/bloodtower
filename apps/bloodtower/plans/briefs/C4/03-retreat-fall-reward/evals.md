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

### EV-06 — Retreat in a group's turn needs and spends a move
- Requirement: DEC-313.
- Method: unit
- How: a battle in a group's turn with 1 move left; pick Retreat; then the same battle with 0 moves.
- Pass evidence: with 1 move: retreat succeeds and moves read 0, log `move.spent`; with 0 moves: Retreat is not offered.
- Fails if: retreat with 0 moves in a group's turn, or no move spent.

### EV-07 — Retreat gives the foe its last attack
- Requirement: DEC-313, DEC-015.
- Method: unit
- How: a level-3 foe, 1 hero at 10 HP, seeded so the last attack lands on that hero; retreat.
- Pass evidence: the hero is at 7 HP (a lost round's hit, the foe's level).
- Fails if: no hit, or any other amount.

### EV-08 — Retreat falls back a space, or stays at a building
- Requirement: DEC-313.
- Method: unit
- How: retreat from a battle entered from space A into space B; then retreat from a battle at a Tavern.
- Pass evidence: first: the group is on A; second: the group is still at the Tavern.
- Fails if: any other space.

### EV-09 — A disaster win pays double
- Requirement: DEC-547.
- Method: unit
- How: win against a level-3 disaster foe.
- Pass evidence: gold = 2 × 3 × 2 = 12.
- Fails if: 6 or any other value.

### EV-10 — A foe nobody fights does not grow
- Requirement: DEC-555.
- Method: unit
- How: leave a level-2 foe unfought for 5 days.
- Pass evidence: still level 2.
- Fails if: any step.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — A grown foe survives Continue
- Requirement: DEC-016.
- Method: playwright
- How: grow a foe, quit, Continue.
- Pass evidence: same level on the board.
- Fails if: reset.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Q-C4-12 ANSWERED by card DEC-177, DEC-179 (in commit 0005 "C4/C5 plans: fill the 14 [TBD] values"; not a Bob question). Card: "DEC-177: "the app sets a loss and splits it equally across the group's heroes, each losing at most what they hold"; DEC-703 row "Lost on a fall | 2 × the foe's level, split and capped | DEC-179, DEC-177"" Source: research/game-design/cards/DEC-177.md, research/game-design/cards/DEC-179.md. ~~Old option (a) half the purse, rounded down, as `battle.fall_gold_loss` = 0.5; Gamewright pick (a), approved by Bob 2026-10-31 6:16 PM ET~~ (struck: contradicts the card).
- Q-C4-13 ANSWERED by card DEC-555 (in commit 0005 "C4/C5 plans: fill the 14 [TBD] values"; not a Bob question). Card: "**Chance:** 1 in 3 per retreat or fall, seeded (DEC-011). / **A step:** the foe's level rises by 1. / **Lethal:** the fourth and last step. A lethal foe does not step again." Source: research/game-design/cards/DEC-555.md. ~~Old option (a) capped at +2 levels over its start; Gamewright pick (a), approved by Bob 2026-10-31 6:16 PM ET~~ (struck: contradicts the card).
