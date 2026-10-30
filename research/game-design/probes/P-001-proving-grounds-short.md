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
| .3 | The move map offered no Enter on a wild quest marker (**gap 3**). With DEC-641 the group Enters, which is free. | MEC-035, DEC-641 |
| MEC-036 .1 to .11 | The menu holds only *The Ambush*. The pick costs 1 move, so 0 are left. The quest loop starts. | DEC-078, MEC-037 |
| MEC-037 .2 to .5 | Quest cue, one Scroll line, the quest track. Step .5 had no diagram for a plain scene (**gap 4**). With MEC-077 it plays its one choice. | CUE-008, MEC-077 |
| MEC-077 .1, .2 | Options: *Fight them* (battle, a level 1 Orek band) or *Pay the toll* (cost 10 gold). The group picks Fight. | DEC-642 |

### Day 1, The Ambush's battle (MEC-038)

| Node | What happens | Cards |
|---|---|---|
| .1, .2, .27 | Horn; foe panel: Oreks, level 1, count 4 + 1 = **5** (P4). Fighter 12 HP, Healer 9 HP (P4). | UI-026, OPT-010 |
| .3 to .5 | Fight. Retreat isn't offered, because the group has 0 moves left (DEC-313). | DEC-313 |
| .28 | The foe reveals card 3 of 8: **Sweep**, 1 to everyone. | DEC-323, DEC-557 |
| .6 to .8 | The Healer casts Lightning (−6, once per battle) and the Fighter makes a normal attack. The count falls to 0. | DEC-123, DEC-379 |
| .36 | The diagram had no check here, so the round would go on to Strike and the roll (**gap 5**). With DEC-643 the foe falls, and the Sweep never lands. | DEC-643 |
| .17 to .19 | Won: 2 gold (2 × level 1), split 1 each. 1.0 has no card draw (DEC-547); the treasure and potion decks wait for 1.1. | DEC-547, DEC-178 |
| .25, .26 | No one fell. The battle-ends hook is empty. | DEC-119 |
| MEC-077 .6, .7 | The quest is done. | DEC-642 |
| MEC-037 .8 to .12 | The Ambush counts toward chapter 1 (1 of 2). | DEC-041 |
| MEC-036 .15 | No moves left, so group A's turn ends on Muted Forest. | DEC-078 |

### Day 1, group B's turn (MEC-035)

| Node | What happens | Cards |
|---|---|---|
| .1 to .6 | 2 moves: Radiant Mountains, Greenbridge, then Dayside (a bazaar). The arrive hook is empty. | DEC-035 |
| .9 | Out of moves, so the turn ends at the Dayside bazaar. | DEC-149 |

Finding: in 1.0 a bazaar's menu is only Cleanse and Leave (DEC-377, DEC-502). The table loses nothing by placing skulls on it, so the bazaar becomes a free skull dump.

### Day 1, close (MEC-034 .7 to .34)

| Node | What happens | Cards |
|---|---|---|
| .7, .8 | Group A is in the wild: event chance 30% (P3), roll 42, **no event**. Group B is at a building with no skulls, so it gets no roll. | DEC-017, DEC-080 |
| .11 to .15 | Drop a skull. The tower lets **1 skull** fall, into Arisilon. | DEC-064 |
| .17 to .22 | The table puts it on the Dayside bazaar (see the finding above). | DEC-092, DEC-093 |
| .23 | The adversary moves. No card said where it starts or how far it moves (**gap 6**). With DEC-644 it waits in the locked Tower in 1.0, so this node is skipped. The unlock is the story's trigger (DEC-645). | DEC-644, DEC-645 |
| .24 to .32 | 1.0 has no lieutenants, caravans or leads (DEC-502), so nothing moves and nothing counts down. | DEC-500 |
| .33, .34 | Day's effects panel: 1 skull on Dayside, The Ambush done. | UI-022 |
| MEC-033 .11 | No loss (23 skulls left, no fallen building, no corruption). 1 of 2 quests done, so on to day 2. | DEC-086, DEC-043 |

### Day 2 (MEC-034, MEC-035)

| Node | What happens | Cards |
|---|---|---|
| .38 to .42 | Regroup is offered, since both groups have 2 heroes. No change. | DEC-640 |
| .2 | Group A rolls 2 + 3 = 5. Group B rolls 2 + 3 = 5. | DEC-615 |
| A: .2 to .6 | Muted Forest to Radiant Mountains, 1 move. Enter the citadel, free. | DEC-220 |
| A: MEC-074 | The buy pick (1 move): a virtue draw for the Fighter, 10 gold. Group A held 6 + 6, and pays 5 each. The draw is 3 of the 8 tiles 1.0 keeps: **Fortunate**. | DEC-544, DEC-581, DEC-399 |
| A: .2 to .6 | Greenbridge, then Dayside, 2 moves; 1 left. Enter the bazaar. Cleanse (1 move) takes its skull back to the supply. Fortunate offers a second free pick, but the bazaar has nothing else in 1.0. | DEC-377, DEC-399 |
| B: .2 to .6 | Dayside to The Tundra to Egan's End, 2 moves. Enter the village. *The Herald* is the first, highlighted pick (1 move). | UI-043, DEC-630 |
| B: MEC-077 | *Hear him out* (5 gold and a flag) or *Send him away* (nothing). The group hears him out. With 5 gold for 2 heroes, the split has no rule for the odd coin (**gap 7**). With DEC-646 the odd coin goes to the hero holding least, by seat order on a tie: Magic user 8, Scout 7. | DEC-642, DEC-646 |
| B: MEC-037 | The Herald is done. Chapter 1 now has 2 of 2. | DEC-041 |
| B: .9 | 2 moves left, but the group has nothing to buy or heal, so it ends its turn. The moves are lost. | DEC-149 |
| close | Both groups stand at skull-free buildings, so neither gets an event roll. The drop lets no skull fall; it stays inside. Nothing else moves in 1.0. | DEC-080, DEC-064, DEC-644 |
| MEC-033 .11 | No loss, and every quest is done: **chapter 1 won**. | DEC-041 |

### Chapter 1 close and chapter 2 enter (MEC-033)

| Node | What happens | Cards |
|---|---|---|
| .17 to .21 | The tower is in play, so the app lights one seal and the table breaks it. 1.0 shows no glyph boon. | DEC-303, DEC-601 |
| .22 to .30 | One held skull falls, into Arisilon. The table puts it on the Dayside bazaar again. | DEC-409, DEC-092 |
| .12 to .16 | Chapter won cue, one Scroll line, the card stamped won. | CUE-005, UI-020 |
| .2 | Brynthia opens, and Arisilon stays walkable. Challenge step 2 (P2). | DEC-146, DEC-133 |
| .3, .4 | Quest markers: *The Barrow* (a Tomb) on Forest of Shades, which is wild and Tower-adjacent. *The Shrine* at the Greater Tombstones sanctuary. | DEC-641, DEC-636 |

## Gaps

| # | Where | Gap | Q | Ruling |
|---|---|---|---|---|
| 1 | MEC-032 .14 | SCR-008 has stories declare their own settings, but DEC-050 and DEC-059 make length and difficulty the engine's. | Q-348 | DEC-639 |
| 2 | MEC-035 | No split or join node in the group turn, and no ruling on a split-off group's moves. | Q-349 | DEC-640 |
| 3 | MEC-035 .3 | A wild quest needs a dungeon token (DEC-089), which 1.0 cuts; Enter shows only on a building, caravan or story token. | Q-350 | DEC-641 |
| 4 | MEC-037 .5 | No step diagram for the plain scene, the 1.0 quest type. | Q-351 | DEC-642, MEC-077 |
| 5 | MEC-038 .8 | Spells can cut the foe to 0 before the roll, and no check skips the roll and the card. | Q-353 | DEC-643 |
| 6 | MEC-034 .23 | Nothing places the adversary at setup or says how far it moves. | Q-354, Q-355 | DEC-644, DEC-645 |
| 7 | MEC-077 (gold) | No rule for the odd coin when gold doesn't split evenly. | Q-356 | DEC-646 |

## Findings (no ruling needed)

- **The 1.0 bazaar is a free skull dump.** Its menu is only Cleanse and Leave (DEC-377, DEC-502), so the table loses nothing by putting skulls there. The numbers pass might weigh a fallen bazaar the same as any other building for the loss check (Q-029).
- **Spare moves have little use in chapter 1.** On day 2, group B had 2 moves left and nothing to spend them on.

## Placeholders

| # | Number | Placeholder | Open question |
|---|---|---|---|
| P1 | The purse wheel's sides and floor | 4 sides of 10, 20, 30 and 40 gold, with a floor of 10 | DEC-114 (numbers pass) |
| P2 | What a chapter's challenge step changes | Step 1 changes nothing, so chapter 1 is the base | Q-063, Q-258 |
| P3 | Event chance in the wild | 30% | DEC-017, R-RE-8 |
| P4 | Combat numbers: foe count, hit points, fight numbers, odds, spells | OPT-010's first guesses | Q-023, OPT-010 |
