# Probe P-001: Proving Grounds v1.0, Short, 4 heroes

A scripted 1.0 game played from the cards alone (DEC-634). Each step cites the card behind it. A rules gap stops the walk and goes to Bob as a `Q-`, which his `DEC-` answers. A missing number gets a placeholder, logged below (DEC-638).

- **Story:** Proving Grounds v1.0 (DEC-635, DEC-636)
- **Settings:** Short, normal difficulty, party of 4 (DEC-637, DEC-639)
- **Heroes:** Fighter, Healer, Magic user, Scout (DEC-378)
- **Tower:** in play
- **Dice:** mulberry32. Seed 1001 is the move stream (d3), and seed 1002 is the purse wheel (d4).

## Walk

### Game loop, enter (MEC-032 .1 to .37)

| Node | What happens | Cards |
|---|---|---|
| .2 to .7 | The table picks Proving Grounds v1.0, which is playable. | SCR-007, SCR-009 |
| .14, .15 | Settings: Length Short, Difficulty normal, Party size 4. **Gap 1** stopped the walk here. | SCR-008, DEC-639 |
| .16 | The game's seed is drawn. | DEC-213 |
| .17 to .20 | Four iPads seat the Fighter, Healer, Magic user and Scout. | SCR-010, DEC-098 |
| .21, .22 | All 12 seals on the tower; 24 skulls in the supply. | SCR-011, DEC-304, AST-B04 |
| .23, .24 | "All same" start: all four heroes on the Arisilon citadel. | DEC-112, DEC-636 |
| .25 to .30 | The purse wheel stops on side 2: **20 gold** (placeholder P1). | DEC-114 |
| .31 | Proving Grounds has no setup steps of its own. | DEC-110 |
| .35 to .37 | Begin. One group of 4, autosave on. | SCR-012, DEC-112 |
| .39, .40 | Game start cue; the opening hook plays one Scroll line. | CUE-001, DEC-626 |

### Chapter 1, The Gate: enter (MEC-033 .1 to .9)

| Node | What happens | Cards |
|---|---|---|
| .2 | Bounds: Arisilon only. Challenge step 1 (placeholder P2). | DEC-133, DEC-134 |
| .3, .4 | Two quest markers: *The Herald* at a building, *The Ambush* on a wild space. | DEC-041, AST-B08, DEC-613 |
| .6 to .9 | Chapter start cue, one Scroll line, the chapter card. | CUE-004, UI-020 |

### Day 1 (MEC-034)

| Node | What happens | Cards |
|---|---|---|
| .38 to .42 | First walk: the group turn had no split or join (**gap 2**). Rerun with DEC-640's Regroup: Magic user and Scout split off as group B, the newest. Fighter and Healer stay group A. | DEC-640, DEC-148 |
| .2 | Group A rolls 2d3: 1 + 1 = 2. Group B rolls 1 + 1 = 2. The floor is 2. **2 moves each.** | DEC-615 |
| .4 | Day roll panel. | UI-021 |

Quest sites (Claude's pick for DEC-636): *The Herald* at the Egan's End village, 4 spaces from the citadel. *The Ambush* on Muted Forest, a wild space 1 step away.

### Day 1, group A's turn (MEC-035)

| Node | What happens | Cards |
|---|---|---|
| .1, .10 | Banner: group A, 2 moves. Neither the Fighter's nor the Healer's class virtues fire at turn start. | UI-019, DEC-408 |
| .2 to .6 | Walk 1 move to Muted Forest, where the Ambush's quest marker stands. The arrive hook is empty. | DEC-035, DEC-290 |
| .3 | The move map offers no Enter on a wild quest marker. **Gap 3** stops the walk. | MEC-035, DEC-089 |
| next | The Ambush is a plain scene, and no step diagram exists for it (**gap 4**). | MEC-037, DEC-063 |

## Gaps

| # | Where | Gap | Q | Ruling |
|---|---|---|---|---|
| 1 | MEC-032 .14 | SCR-008 has stories declare their own settings, but DEC-050 and DEC-059 make length and difficulty the engine's. | Q-348 | DEC-639 |
| 2 | MEC-035 | No split or join node in the group turn, and no ruling on a split-off group's moves. | Q-349 | DEC-640 |
| 3 | MEC-035 .3 | A wild quest needs a dungeon token (DEC-089), which 1.0 cuts; Enter shows only on a building, caravan or story token. | Q-350 | DEC-641 |
| 4 | MEC-037 .5 | No step diagram for the plain scene, the 1.0 quest type. | Q-351 | |

## Placeholders

| # | Number | Placeholder | Open question |
|---|---|---|---|
| P1 | The purse wheel's sides and floor | 4 sides of 10, 20, 30 and 40 gold, with a floor of 10 | DEC-114 (numbers pass) |
| P2 | What a chapter's challenge step changes | Step 1 changes nothing, so chapter 1 is the base | Q-063, Q-258 |
