# Probe P-006: the 1.1 numbers pass, The Ruined Keep in 36 batch cells

This is the numbers pass of DEC-785 step 5. It's a throwaway script written from the cards (DEC-814), not repo code. It plays The Ruined Keep at every length with 1 to 4 heroes and every difficulty, and Bob ruled each number from its results, one question at a time. The cards are in AREA-120.

**How exact this is:** the script plays a plain table that spends (DEC-818). The party stays together, heads for the nearest open quest, rallies when hurt, cures when it can, and buys gear, virtue tiles, potions and a companion whenever it has 15 gold to spare. It never splits the party or plays for the clock. Read the absolute numbers as a stress test and the differences between settings as the result. Its noise is about ±2 points a cell at 2,000 seeds.

- **Story:** The Ruined Keep, Short 6 quests over 3 chapters, Standard 10 over 3, Long 15 (14 required) over 5 (DEC-792). The five non-Tomb dungeons play as Tombs (DEC-820).
- **Cells:** Short, Standard and Long with 1, 2, 3 and 4 heroes, classes seeded (DEC-816), at normal, easy and hard.
- **Dice:** mulberry32. Seeds 60000 + 7919 × game + 131 × heroes + the length name's letter count, games 0 to 1,999 in each cell.
- **Board:** `packs/base/board/spaces.json`, with routes by its neighbour graph. The game starts on the Radiant Mountains citadel.

## Result

Every normal cell clears DEC-823's 80% floor. The 1/2/3/4 columns are hero counts.

| Normal, % won | 1 | 2 | 3 | 4 | Days to win (1 to 4) |
|---|---|---|---|---|---|
| Short | 83 | 91 | 92 | 93 | 25, 23, 16, 14 |
| Standard | 89 | 89 | 85 | 93 | 31, 28, 19, 17 |
| Long | 81 | 91 | 97 | 97 | 39, 36, 27, 24 |

| % won | Easy (floor 90) | Hard (band 50 to 85) |
|---|---|---|
| Short | 100, 100, 100, 100 | 51, 62, 66, 82 |
| Standard | 100, 100, 100, 100 | 52, 45, 46, 72 |
| Long | 100, 100, 100, 100 | 47, 50, 81, 88 |

Hard's three cells at 45 to 47% count as inside the band (DEC-830).

## How it got there

Each line is one question to Bob, in order. Normal, % won for 1/2/3/4 heroes.

| Step | Ruling | Short | Standard | Long |
|---|---|---|---|---|
| Rules as written, multiple quests a day | — | 36, 83, 91, 95 | 33, 81, 96, 98 | 6, 47, 80, 92 |
| A quest pick ends the turn | DEC-821 | 30, 80, 89, 94 | 21, 64, 82, 92 | 2, 23, 43, 69 |
| Solo +2 fight, +4 hit points, drop every other night | DEC-822 | 81, 81, 89, 94 | 79, 64, 81, 92 | 43, 24, 43, 69 |
| A pair skips every fourth drop | DEC-824 | 81, 88, 89, 94 | 80, 80, 82, 92 | 46, 40, 46, 73 |
| The adversary walks 1 space a day | DEC-825 | 82, 88, 89, 93 | 82, 84, 84, 93 | 57, 58, 63, 85 |
| Long drops half | DEC-826 | 82, 89, 90, 93 | 83, 84, 84, 93 | 74, 87, 96, 96 |
| Policy adds virtue draws (DEC-544), keeps 15 gold | DEC-818 | 77, 90, 91, 94 | 82, 89, 86, 94 | 78, 91, 97, 97 |
| A won quest pays the group 10 gold | DEC-827 | 84, 90, 92, 94 | 88, 89, 86, 94 | 81, 91, 97, 97 |

The first two rows ran with no virtue draws and a 5-gold reserve.

## Findings

1. **One quest a day is the biggest rule in the clock.** The cards let a group chain quests that sit close together, and with P-005's party at Long that won 97.5% by about day 15. DEC-821 brings it to 71% by about day 22, near P-005's 63%. This explains most of the gap between this script and P-005's.
2. **Small parties were the hard games, not long ones.** A solo hero is slow: it takes about 27 days for six quests, with 3 to 4 falls a game. Strength and the clock together (DEC-822) lifted it. Strength alone or the clock alone didn't.
3. **The adversary was Long's hidden clock.** At 2 spaces a day over three roaming chapters, his arrival skulls cost 8 to 11 a game, as many as the nights did. At 1 a day (DEC-825) that roughly halves.
4. **Big parties don't need gold.** 3 and 4 heroes end with 90 to 220 gold unspent and win the same with less. A solo hero is the one short of gold, so DEC-827 moves quest pay from heroes to groups.
5. **The lieutenant's level, the strike and the hire price barely matter** in the script, at 3 points or less (DEC-828). The strike never fells and is healed off.
6. **Easy is never lost.** It wins 99 to 100% in every cell. That clears DEC-819's 90% as a floor. Whether easy should ever lose is for the playtest.
7. **Long games are long.** A solo Long game takes about 39 days and a solo hard one about 51. Days are quick at the table, but this sets the length of an evening.

## Script limits

- No foe abilities (DEC-311) and no boss abilities. The foe's 8-card deck is played (DEC-557, DEC-649, DEC-650), with trait effects (DEC-559), and the boss deck gets a Rend at each phase (DEC-567).
- An Advantage, gear or virtue tile matches the foe on a seeded coin flip each battle, worth +1 strength. A treasure is +1 always. Conditional softening (DEC-558) isn't played.
- A companion is +1 strength and takes a fall for its hero (DEC-800). Loyalty, walking out and turning aren't played.
- Events roll only for a group that ends its day in the wild (DEC-080). Hazards and disasters cost 2 hit points each and never fell. People events do nothing. Skulled buildings draw no events (DEC-093).
- Players place each skull on the nearest building in its kingdom with fewer than 3 (DEC-092). Destroyed buildings are tracked but never lose the game.
- The traitor's trick costs 1 skull in 20% of Standard and Long games, as a stand-in for a wrong accusation. No fence, curses, glyphs, drums or tower drops.
- No tower, so seals and glyphs drop out (DEC-305, DEC-306).
- Quest sites are fixed by the script: Egan's End, Muted Forest and Dayside; then Forest of Shades, Greater Tombstones, Bleak Wastes and Duwani; Southern Wastes, The Throne and Emerald Expanse; Akartus and Anza; Irontops, Howling Desert and The Grass Sea. The lieutenant starts at Irontops when chapter 2 opens.

## Placeholders

| # | What | Used |
|---|---|---|
| P1 | Guarded hit size (DEC-556) | A seeded quarter to half of the hit, rounded up |
| P2 | Gear, tile and Advantage matches | 50% a battle each |
| P3 | Tomb path | The guardian 2 to 5 doors deep; path rooms nothing 40%, battle 30%, trap 30%, at least one battle and one trap |
| P4 | Tower | 3 levels; the first 2 rooms of each are guard, trap or shrine, then a stair guard; the Warden last |
| P5 | The haggle die | 5 faces equally likely (DEC-760) |
