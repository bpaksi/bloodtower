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

### Day 3: group A in the Barrow (MEC-026)

| Node | What happens | Cards |
|---|---|---|
| day start | No regroup (the groups are on different spaces). Group A rolls 3 + 2 = 5, group B 1 + 1 = 2. | DEC-640, DEC-615 |
| A: walk | Dayside, Greenbridge, Upper Ice Fangs, Bleak Wastes, Forest of Shades: 4 moves. Enter the marker, then pick *The Barrow* for the last move. | DEC-641 |
| .1, .2 | First visit: the layout is dealt, Short, 5 rooms (DEC-603). The non-guardian rooms are nothing, nothing, battle and trap (DEC-604), and the guardian is 3 doors deep. The story names Oreks as the Barrow's foe, at level 2 (DEC-608). | DEC-602, DEC-604 |
| room 1 | Ahead, bold: nothing. | DEC-488 |
| room 2 | Left, bold: a battle, Oreks level 2, count 9. Bold's free cut takes it to 8 (DEC-607). Round 1: the Healer's Lightning (−6, count 2); the Fighter's 3 plus Weapon Master's +1 Melee = 4 against 2 × 2, so 50%. Rolled 28: won. The cut is 2, and Shield wall makes it 1 (DEC-553), so 1 left. Round 2: strength 5, 56%, rolled 47: won. The foe falls. 4 gold, 2 each. | MEC-038, DEC-553, DEC-547 |
| room 3 | Ahead, on guard: the **guardian**, Oreks level 3, count 13. On guard gives the foe its last attack before round 1 (DEC-607). No card said how the round cards are drawn (**gap 8**, DEC-649) or what that attack is (**gap 10**, DEC-650). The shuffle opens with Sweep, 2 to each: Fighter 10, Healer 7. The battle loop had no before-round-1 step, though DEC-607 asks for one; it is drawn now as .37 to .41. | DEC-607, DEC-650 |
| round 1 | Claw. Lightning is spent: it is once per battle **or dungeon** (DEC-379), and the Healer cast it in room 2. A first draft of this walk cast it again, and this row is the corrected one. Both heroes attack: 1 + 3 + 1 = 5 against 6, 45%. Rolled 64: lost. Claw 3 hits the Fighter: 7. | DEC-649, DEC-379 |
| round 2 | Falter. Strength 5: 45%, rolled 56, lost. Falter does nothing. | |
| round 3 | Claw. Rolled 2: won. The cut is 3 − 1 = 2, so count 11. | |
| round 4 | Trait card: a Claw plus the trait's effect (+1, P5). Rolled 56: lost. The Healer takes 4: 3. | DEC-557 |
| round 5 | The group retreats (always allowed in a tomb). The last attack is the next card, Howl: the foe regrows 2 and is back at 13. The group leaves the tomb, still on its space, with no move spent. | DEC-497, DEC-650 |
| .22, .35 | The foe stays in its room, cut, and the step-up draw misses. The battle loop would have put a foe token on the board (**gap 11**); with DEC-651 it gets none. | DEC-651, DEC-314 |

Gap 9 came from Bob comparing the battle with RtDT's: Q-359, kept by DEC-648. Bob also ruled how the foe is picked (DEC-647, Q-357).

### Day 3: group B and the close

| Node | What happens | Cards |
|---|---|---|
| B: walk | Egan's End, then Outer Kinghills (over the N–E river), then the Inner Kinghills citadel: 2 moves, so none left to pick with. | DEC-146 |
| close | Group A is in the wild: rolled 70, no event. One skull falls into Brynthia, and the table puts it on the Three Rivers bazaar (the skull dump again). No loss. | DEC-080, DEC-092 |

### Day 4 (MEC-034, MEC-035)

| Node | What happens | Cards |
|---|---|---|
| .2 | Group A rolls 2 + 2 = 4, group B 3 + 3 = 6. | DEC-615 |
| A: .10 to .13 | Turn-start virtues: the Healer's Mend heals the group, +3 each (P7). Fighter 10, Healer 6. | DEC-408, DEC-380, UI-037 |
| A: walk | Forest of Shades to the Greater Tombstones sanctuary, 1 move. Enter, then pick *The Shrine*, 1 move. | DEC-641 |
| A: MEC-077 | *Pray at the altar* (a quest item) or *Leave an offering* (5 gold). The group prays: the Horn of the Elements. The diagram had no step for who takes an item; .8 to .10 now mirror the battle card's pick (MEC-038 .21). The Healer takes it. | DEC-642, DEC-447, DEC-455 |
| A: close | The Shrine is done: chapter 2 has 1 of 2. No one is corrupted, so the sanctuary's cure isn't needed, and Fortunate's free second pick has nothing to buy. 2 moves left; the group waits for B. | DEC-399 |
| B: walk | At the Inner Kinghills citadel: a virtue draw for the Scout, 10 gold (Magic user 8 → 3, Scout 7 → 2). Drawn: **Relentless**. Then Dragontooth Lake to Greater Tombstones, 2 moves; 3 left. | DEC-544, DEC-391 |
| close | Both groups are at a skull-free sanctuary, so no events. One skull falls into Durnin, a kingdom still closed, and goes on its Southern Wastes village. No loss. | DEC-080, DEC-092 |

### Day 5: the party rejoins and goes back to the Barrow

| Node | What happens | Cards |
|---|---|---|
| .38 to .42 | Regroup: both groups are on Greater Tombstones. B joins A, and A keeps its older place. | DEC-640, DEC-148 |
| .2 | One roll: 2 + 2 = 4. Doubles, so Relentless gives the Scout +1 Wild until the next roll. | DEC-615, DEC-391 |
| walk | Forest of Shades, 1 move. Enter the marker and pick *The Barrow*, 1 move: 2 left. | DEC-641 |
| MEC-026 | The tomb goes on from room 2, where group A stopped. Room 3's door is the guardian, at count 13. | DEC-151, DEC-602 |
| spells | Can the Healer cast Lightning again? It is once per battle or dungeon, and she cast it on the last visit. **Gap 12** (Q-362) stopped the walk. With DEC-652 it comes back on each visit. | DEC-379, DEC-652 |
| guardian | Oreks level 3, count 13, cut and kept from the last visit (DEC-651). Bold, so the free cut takes it to 12. A new shuffle; it opens with Sweep. | DEC-607, DEC-649 |
| round 1 | Lightning −6 and Magic Missile −2 take it to 4. The Fighter's 3 + 1 Melee and the Scout's 2 + 1 Wild (Relentless) make 7 against 6: 54%. Rolled 64: lost. Sweep 2 hits everyone: Fighter 8, Healer 4, Magic user 6, Scout 7. | DEC-123, DEC-391 |
| round 2 | Claw. Magic Missile −2 takes it to 2. Strength 8: 57%, rolled 38, won. The cut is 4 − 1 = 3: **the guardian falls**. | DEC-553 |
| rewards | 6 gold across 4 heroes: 1 each, then the 2 left over go to the heroes holding least (DEC-646): Fighter 5, Healer 4, Magic user 4, Scout 4. | DEC-547, DEC-646 |
| MEC-037 .8 to .15 | The Barrow is done, and its reward is the *Barrow Key*. No card said who holds a story item (**gap 13**). With DEC-653 the group picks a hero (the Fighter), and the quest loop gains .13 to .15. Chapter 2 has 2 of 2. | DEC-653 |
| close | 2 moves are left after the tomb, and the party stays on Forest of Shades. Wild: rolled 55, no event. Every quest is done: **chapter 2 won**. A seal breaks, and the freed skull goes on the Plains of Plovo bazaar (Zenon). | DEC-303, DEC-409 |

### Chapter 3, The Tower: enter (MEC-033)

| Node | What happens | Cards |
|---|---|---|
| .2 | The whole board opens. Challenge step 3 (P2). | DEC-134, DEC-133 |
| .3 | Quest markers: *The Lock* at the Howling Desert citadel (Durnin), *The Last Stand* on The Grass Sea (Zenon, wild, Tower-adjacent). The Tower unlocks when both are done (DEC-645). | DEC-636, DEC-645 |

### Days 6 to 8: chapter 3's quests

| Day | What happens | Cards |
|---|---|---|
| 6 | One group of four rolls 3 + 3 = 6 (doubles: Relentless +1 Wild). Mend +3 each: Fighter 11, Healer 7, Magic user 9, Scout 10. Forest of Shades, Sands of Madness, Archmont, then the Southern Wastes village, which has 1 skull: 3 moves. Enter. Its rumours are bad with a skull on it (DEC-093). Rest (1 move) for 2 more rest moves: +6 each (P8), all full. Fortunate's free second pick Cleanses the skull, so the party ends at a skull-free building: no event. | DEC-174, MEC-075, DEC-377, DEC-399 |
| 7 | Roll 2 + 2 = 4 (doubles). Azkol's Bane, then the Howling Desert citadel: 2 moves. *The Lock*: *Turn the Barrow Key* (needs the key, DEC-654; the Fighter holds it) or *Force it* (a level 2 battle). No card let an option need an item (**gap 14**). With DEC-654 the key option is open, and the key is kept. The Lock is done. 1 move to Irontops, which is wild and Tower-adjacent. Event roll 25 against 30%: **an event**. Drawn: a **windfall**. With 1.0's loot cards cut, it is 5 gold (P9), split by DEC-646. | DEC-654, MEC-072, DEC-029, DEC-500 |
| 8 | Roll 1 + 3 = 4. The Grass Sea, 1 move. Enter the marker and pick *The Last Stand*, 1 move. *Hold the line*: a level 3 battle. No foe is named, so it is a random level 3 foe: Frost Trolls (DEC-647). Count 4 × 3 + 3 = 15. Round 1: Lightning and Fireball, in no order any card set (**gap 15**). With DEC-655 the flat cut goes first: 15 − 6 = 9, halved to 4 (rounded down, P10). Fighter 4 + Scout 2 = 6 against 6: 50%, rolled 82, lost; a Claw with Crushing blow hits the Scout for 4. Round 2: Magic Missile −2, count 2; strength 7, 54%, rolled 26, won. The foe falls. 6 gold. | DEC-647, DEC-655, DEC-553 |
| 8 | Chapter 3's quests are done, so the Tower unlocks (DEC-645). As written, MEC-033 .11 would now end the finale chapter, and the game, as won before the Tower (**gap 16**). With DEC-656 the finale is won only in the Tower. | DEC-656 |

### Day 8: the Tower, first visit (MEC-076)

Battles from here on are run by a small seeded simulator using OPT-010's numbers (P4). The boss deck's phases are only approximated.

| Node | What happens | Cards |
|---|---|---|
| MEC-035 .3 | The move map had no way into the Tower, because MEC-076 was called from nowhere. Drawing fix, no ruling: Enter the Tower (.14) shows on a Tower-adjacent space once it is unlocked. 1 move to enter, 1 left. | DEC-363, DEC-645 |
| .4 | Rooms dealt (DEC-566). Basement: guard, shrine. Main: shrine, shrine. Tower level: trap, shrine. A stair guard closes each of the first two levels, and the adversary waits at the top. Guards are foe level +1 per Tower level, from a base of 2 (P11). | DEC-566 |
| spells | Is the Tower a dungeon for once-per-dungeon spells? **Gap 17.** With DEC-657 it is, once per visit, so the party saves Lightning and Fireball for the adversary. | DEC-657 |
| basement | A level 3 guard (Lemures), count 15, won in 4 rounds without a hit. The shrine heals 2: Scout 7. The level 3 stair guard is won in 7 rounds: Fighter 8, Magic user 4. | MEC-038, DEC-566 |
| main | Two shrines, +2 each. The level 4 stair guard is won in 12 rounds. The Magic user falls once (first corruption) and is back at 1. Fighter 8, Healer 5, Scout 9. | DEC-119 |
| tower level | The next room's trap would hit the Magic user at 1, risking a second corruption. The group picks **Leave**. MEC-076 keeps the level reached and the cleared rooms, and the party stands on The Grass Sea. | DEC-360, DEC-566 |
| close | Wild: rolled 12, **an event**: a hazard, plague. The Healer is the counter, so it is cancelled. One skull falls into Zenon. No loss. | DEC-027, MEC-072 |

### Days 9 to 11: rest, then back up

| Day | What happens | Cards |
|---|---|---|
| 9 | Roll 2 + 1 = 3: The Grass Sea to the Anza village (Zenon), 3 moves, so none left to rest. Mend +3 each. | DEC-174 |
| 10 | Roll 2 + 3 = 5: rest 5 moves at the tavern. All full. | MEC-075 |
| 11 | Roll 2 + 2 = 4: back to The Grass Sea (3), Enter the Tower (1). The spells come back on a new visit (DEC-657). The tower level resumes: Falling Rocks, −2 each; the shrine, +2 each. | DEC-657, DEC-606 |

### Day 11: the adversary (MEC-076 .13 to .15, MEC-038)

| Node | What happens | Cards |
|---|---|---|
| .14 | Arrival show. The Warden, level 5 (P12), count 23. | DEC-567 |
| round 1 | Lightning −6, then Fireball halves (DEC-655): 23, then 17, then **8**. That crosses both phase lines (two thirds is 15, one third is 8) in one round, before any roll. **Gap 18.** Strength 5, 33%: won, −3 → 5. | DEC-655, DEC-567 |
| round 2 | Magic Missile −2 → 3. Lost: Claw −5 hits the Fighter, 7. | |
| round 3 | Magic Missile −2 → 1. Won: **the Warden falls**. | |

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
| 8 | MEC-038 .28 | No rule for how the 8 round cards are drawn: repeats, reshuffle. | Q-358 | DEC-649 |
| 9 | MEC-038 | Bob compared the battle with RtDT's resolve-the-cards model, and kept Bloodtower's rounds. Also: no rule for which foe a battle faces when the story names none. | Q-359, Q-357 | DEC-648, DEC-647 |
| 10 | MEC-038 .32, .39 | The last attack (DEC-318) predates the round cards; and DEC-607's before-round-1 step was never drawn. | Q-360 | DEC-650 |
| 11 | MEC-038 .35 | A foe standing inside a tomb room would get a board token. | Q-361 | DEC-651 |
| — | MEC-026 .2, .8 | Drift, fixed without a ruling: the diagram still rolled each room on entry, but DEC-602 builds the whole tomb on first entry. | — | DEC-602 |
| 12 | MEC-026 | Is a once-per-dungeon spell once per visit or once per tomb? Parked at first, then it stopped the walk on day 5. | Q-362 | DEC-652 |
| 13 | MEC-037 .8 | No rule for who holds a story item; the quest loop had no hero pick for a reward item. | Q-363 | DEC-653 |
| 14 | MEC-077 .1 | An option could not need an item (*The Lock* needs the Barrow Key). | Q-352 (part) | DEC-654 |
| 15 | MEC-038 .8 | No order for spells cast in the same round (flat cuts and halving). | Q-364 | DEC-655 |
| 16 | MEC-033 .11 | The finale chapter ended when its quests were done, so the game was won before the Tower. | Q-365 | DEC-656 |
| 17 | MEC-076 | Is the Tower a dungeon for once-per-dungeon spells? | Q-366 | DEC-657 |
| — | MEC-035 .14 | Drawing fix, no ruling: no node called the Tower loop. Enter the Tower is now on the move map, per DEC-363. | — | DEC-363 |
| — | MEC-077 .8 to .10 | Drawing fix, no ruling: no step for which hero takes an item a scene gives. It mirrors MEC-038 .21. | — | DEC-120 |

## Findings (no ruling needed)

- **The 1.0 bazaar is a free skull dump.** Its menu is only Cleanse and Leave (DEC-377, DEC-502), so the table loses nothing by putting skulls there. The numbers pass might weigh a fallen bazaar the same as any other building for the loss check (Q-029).
- **The guardian is a wall for two heroes.** At level 3 with a count of 13 it beat a full Fighter and Healer and ended back at full, and OPT-010 rates 2 heroes against level 3 at 97%. The difference is Shield wall's −1 cut and the trait card. The numbers pass should rerun OPT-010 with foe abilities and the round cards.
- **Once per dungeon matters.** A spell spent in an early tomb room is gone for the guardian (DEC-379). Whether it comes back on a new visit is Q-362, parked.
- **Howl as a last attack heals the foe.** Under DEC-650 a retreat that draws Howl regrows the foe and hurts no one. It's consistent, but it may read oddly on the board.
- **Skulls land in kingdoms the heroes can't reach.** On day 4 a skull fell into Durnin, which stays closed until chapter 3 (DEC-134). Its buildings fill up and can't be Cleansed, which pushes toward the fallen-buildings loss (DEC-043, Q-029).
- **Spells crush the boss.** Lightning and Fireball, saved for the adversary, took it from 23 to 8 before the first roll, and it fell in 3 rounds. OPT-010 already flagged that the Magic user's spells may be too strong. The numbers pass should cap Fireball (for example, at most 6 off) or let the boss resist halving.
- **The Tower climb is the real finale.** The stair guards (7 and 12 rounds) cost more than the boss. Leaving to rest took 3 days, during which skulls kept falling.
- **1.0's event list is thin.** With loot, merchants and companions cut (DEC-502), a windfall is only gold, hit points or a nugget, and a stranger only a rumour or a trick. The engine falls back without error (DEC-500), but the numbers pass should check that events still feel varied.
- **Fortunate plus a skulled building is a strong pair.** A free Cleanse on top of a rest let the party heal fully and come out with no event risk.
- **Spare moves have little use in chapter 1.** On day 2, group B had 2 moves left and nothing to spend them on.

## Placeholders

| # | Number | Placeholder | Open question |
|---|---|---|---|
| P1 | The purse wheel's sides and floor | 4 sides of 10, 20, 30 and 40 gold, with a floor of 10 | DEC-114 (numbers pass) |
| P2 | What a chapter's challenge step changes | Step 1 changes nothing, so chapter 1 is the base | Q-063, Q-258 |
| P3 | Event chance in the wild | 30% | DEC-017, R-RE-8 |
| P4 | Combat numbers: foe count, hit points, fight numbers, odds, spells | OPT-010's first guesses | Q-023, OPT-010 |
| P5 | A trait card's extra effect | +1 to its Claw | DEC-559 |
| P6 | The chance a standing foe steps up | 50% | DEC-314 |
| P7 | Mend's heal | +3 hit points each | Q-248, Q-276 |
| P8 | Tavern rest per move | +3 hit points | DEC-174 |
| P9 | A windfall's gold | 5 | DEC-029 |
| P10 | Fireball's halving | Rounded down | DEC-123, OPT-010 |
| P11 | Tower guard base level | 2, so levels 3, 4 and 5 | DEC-566 |
| P12 | The adversary's level and count | Level 5, count 23 | DEC-361 |
