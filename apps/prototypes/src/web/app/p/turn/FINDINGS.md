# P-08 A day's turn loop: findings

**Status: awaiting Bob's play-through.** Nothing below is final until he has played at least three turns at `/p/turn`.

## What was built

DEC-077's four beats on a made-up 12-space road (village at space 4, sanctuary at 8, the rest wild), one or two groups (A starts at 0, B at 11). Roll (DEC-102: dice, +1 per helping virtue, -1 per corruption, floor; roll, each modifier and total shown), a story placeholder, each group spends moves (1 a space, 1 a building action, each action once a turn, DEC-078), then events where each group stopped. Rules are in `game.ts` (pure, unit-tested) and shared by the page and the simulation.

## Simulation (seed "1", 1,000 turns per row, group starts on a random non-village space, village menu of 3)

The policy: head for the village; if a move is spare on arrival, take each village menu action it can afford. It never spends leftovers at the sanctuary. "Reach" is the share of turns that get to the village and take at least one action. "Unused" is therefore an **upper bound** for this policy: average moves left after the village menu is exhausted (or 0 if the group ran out walking), without sanctuary spend. The board distance is invented (average start distance to the village about 3.4 spaces), so read the numbers as relative.

Defaults (1d6, floor 1, no virtues, no corruption): **reach 45.0%, average moves left unused 0.12** (average roll 3.48).

| Dice | Virtues | Corruption | Floor | Reach | Unused | Mean moves |
|---|---|---|---|---|---|---|
| 1d6 | 0 | 0 | 1 | 45.0% | 0.12 | 3.48 |
| 1d6 | 2 | 0 | 1 | 73.1% | 0.61 | 5.49 |
| 1d6 | 0 | 2 | 1 | 17.7% | 0.00 | 2.00 |
| 2d6 | 0 | 0 | 1 | 82.9% | 1.57 | 7.03 |
| 2d6 | 2 | 0 | 1 | 95.5% | 2.95 | 9.03 |
| 2d6 | 0 | 2 | 1 | 64.0% | 0.65 | 5.06 |
| 2d6 | 0 | 4 | 2 | 44.5% | 0.19 | 3.59 |
| 2d6+1 | 0 | 0 | 1 | 90.4% | 2.21 | 8.03 |
| 2d4 | 0 | 0 | 1 | 68.4% | 0.41 | 5.03 |

Reproduce: the page's "Run 1,000 seeded turns" button, with the tuning panel set to the row.

## Proposed numbers for Q-043 (awaiting Bob's play-through)

- Dice: **2d6** (a hero with no help reaches the village about 83% of turns on this board, with about 1.6 moves to spare, so a turn rarely feels wasted and rarely overflows).
- Floor: **2**, so a heavily corrupted group can still step into a village or take one action. At 2d6 the floor changes little until corruption is 4 or more; it matters mostly with 1d6.
- Helping virtue: **+1** each (about 6 reach points per virtue at 2d6; ~12 for two), corruption **-1** each (about 19 points per 2 at 2d6): corruption bites harder than virtue helps near the middle of the curve, which suits its role.
- Building menu: 3 actions in a village is the cap that decides "unused": at 2d6 with 2 virtues a group wastes about 3 moves, so larger menus or sub-locations are worth testing.

Open for the play-through: does a turn feel right, and is there enough to do with the moves rolled?

## Card IDs to update (after the play-through)

Q-043 (dice, floor, which virtues), DEC-102 (record the numbers), DEC-078 (building menu size).
