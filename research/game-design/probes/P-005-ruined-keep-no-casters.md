# Probe P-005: The Ruined Keep, Long, normal, four heroes with no casters

A scripted 1.1 game played from the cards (DEC-634, DEC-803), aimed at what P-004 never reached: falls, strikes, retreats and the skull clock. A rules gap stopped the walk for one ruling from Bob. The cards are in AREA-118.

**How exact this is:** a script played the whole game with one seeded stream, using the odds, cuts and deck of DEC-703 and routes from the board graph. It plays a fixed, plain policy rather than a thinking table, so read it as a stress test. Its limits are listed below, and most of them make the heroes weaker than a real table.

- **Story:** The Ruined Keep at Long: five chapters, 14 required quests and one optional lead (DEC-792)
- **Heroes:** Fighter 12 hit points, Scout 9, Ranger 10, Bard 8
- **Foe levels:** 1, 2, 2, 3, 3 (DEC-794); The Warden 5; Tower guards 3 (DEC-702); the raider captain at chapter level +1 (DEC-775, still proposed)
- **Dice:** seed 5000 for the walk, seeds 7000 to 8999 for the batch

**Result: the walked game lost on day 26 with the skull supply empty, inside the Tower and short of The Warden. It took 80 rounds over 22 battles, with 4 falls and 5 retreats. Over 2,000 seeds, this party won 63%.**

| Over 2,000 seeds | |
|---|---|
| Wins | 63%, on about day 19, with about 9 skulls left |
| Losses | 691 supply empty, 49 third corruption |
| Per game | 69 rounds, 1.4 falls, 1.6 retreats, 1.0 strikes, 1.0 captain fights |

## Walk (seed 5000)

| Day | What happens | Supply |
|---|---|---|
| 1 to 3 | *The Ambush* in 2 rounds, then *The Raiders' Market* and *The Herald*. Chapter 1 won. | 24 |
| 4 | *Who Sold the Road?* gives the clue. | 24 |
| 5 | The raider captain, level 3, reaches the party. The Bard falls once and the Fighter twice, so the Fighter holds 2 corruptions. Retreat at count 5. | 23 |
| 6 | Cure at a building. A wild foe in 5 rounds. | 21 |
| 7 | The captain falls in 1 round from count 5, completing his quest (DEC-798). The fence is accused, rightly. Two gear bought. | 21 |
| 8, 9 | To *The Shrine*: the oath-blade, and the sergeant joins. | 20 |
| 10 | *The Barrow*: a room in 5 rounds, a trap, the guardian in 4. The Ranger ends on 1 hit point. The Warden enters (DEC-791). **Gap 1** came next: where he goes once he stands on the most-skulled building. | 19 |
| 11, 12 | *The Moat Lair*: a room, a trap, and two retreats from its level 3 guardian. | 15 |
| 13 | The guardian falls in 2 rounds from count 9. Chapter 2 won. | 15 |
| 14 to 17 | *The Oathsworn Hold* and *The Warden's Vault*, with two travel days between. Chapter 3 won. | 11 |
| 18, 19 | *The Warden Rides* and *The Three Altars*. Chapter 4 won. | 10 |
| 20 to 22 | *The Lock*, then *The Last Stand*. The sergeant takes a blow for the Fighter (DEC-800). Retreat. | 7 |
| 23 | Rally. Two skulls. | 5 |
| 24 | *The Last Stand* falls in 4 rounds, unlocking the Tower. | 4 |
| 25 | Into the Tower: two shrines and two guards won. The third guard fells the Bard, who now holds 2 corruptions. Retreat. | 1 |
| 26 | The last drops empty the supply. **Lost.** | 0 |

## Gaps

| # | Where | Gap | Ruling |
|---|---|---|---|
| 1 | The Warden's walk | Standing on the most-skulled building, he skulled it again every day | DEC-802 |
| 2 | Desk check | A curse could be a hero's third corruption, losing the game on a hidden card | DEC-804 |
| 3 | Desk check | What happens to a shop when its NPC is accused or unmasked | DEC-805 |

Gaps 2 and 3 came from reading the cards while setting up the script. The script plays neither, so neither ruling has been played.

## Checked, no gap

- **A standing foe on a building's space:** DEC-023 and DEC-320 already give the arriving group the choice, so it needs no new rule.
- **A hunter pinning a group:** it isn't a lock in the batch. The captain averaged one fight a game (worst 6) and fell in all 2,000 games.
- **The Warden or a hunter reaching a group inside a dungeon:** the script plays a dungeon inside one turn, and the cards I read have no rule keeping a group in past its turn. This is a reading of the cards, not a played result.

## Findings

1. **The clock bites with no casters.** This answers P-004's open point on DEC-776: skulls cause 93% of the losses, and the walked game ended in the Tower with the win in sight. The script likely understates a real table, since it never splits the party or plays for the clock. Numbers pass, then the playtest.
2. **Travel days are the cost.** A won quest skips that night's drop (DEC-699), so skulls land on the days between quests and on failed tries. The Moat Lair's guardian cost a whole extra night here, and a Long game has more dungeons to retry.
3. **A level 3 hunter on day 5 is harsh.** One meeting left the Fighter on 2 corruptions in chapter 2, with 13 quests to go. It comes from DEC-775's level +1, so it belongs with that ruling.
4. **Gold still outruns prices.** The walked party ended on 328 gold unspent, against 12 for gear. The script spends too little to prove the size of this, but it agrees with P-004.
5. **The strike outgrows the foes in Long.** It cuts 3 + the chapter number (DEC-775), so it reaches 8 in chapter 5 while foe levels stop at 3. Numbers pass.
6. **Battle length held up in the walk:** 80 rounds over 22 battles is about 3.6 a battle, within DEC-315's 2 to 4, though the walk is only one game.

## Reached and not reached

**Reached:** a hero's fall, a companion taking the blow (DEC-800), retreats at a dungeon and in the open, a retreat and return to a cut foe (DEC-314), a right accusation, a lieutenant falling early (DEC-798), a loss by the clock. Strikes came up in the batch but not in the walk.

**Not reached:** a wrong accusation, the fence and a curse, the sergeant's loyalty, a companion walking out or turning, a missed adversary quest, The Warden's battle in the walk, a tower drop, Tower traps in the walk, DEC-763, glyphs and drums.

## Script limits

- The party stays together, so it never plays two groups (DEC-801's spell values don't apply either, as there are no casters).
- It buys only two gear, once, and Cleanses only when it rallies with supply at 12 or less. Real tables spend more.
- Skulls that the players place land on citadels, a simplification of DEC-092.
- The hazard and event chances are simplified from MEC-072, at the 50% Long chance of DEC-703.
- The Warden's strike uses DEC-775, which Bob has not ruled.

The first script run had errors, all corrected before these numbers: a Sweep under guard hit everyone, The Three Altars had a guardian against DEC-773, and it bought and Cleansed nothing. Before those fixes it reported 53% wins.

## Placeholders

| # | What | Used |
|---|---|---|
| P1 | Lieutenant level and strike numbers | DEC-775 as proposed |
| P2 | Skull placement by the players | Citadels |
| P3 | What heroes buy and when | The fixed policy above |
