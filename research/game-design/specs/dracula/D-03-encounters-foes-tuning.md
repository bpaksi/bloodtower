# Dracula D-03: encounters, foes and tuning

**Status:** decided by Gamewright, 2026-11-10, under Bob's standing rule that design rulings are Gamewright's (relayed by Warden, 2026-11-10). To be checked by the Dracula numbers pass and playtests. Design tables only, no code.
**Stacks on** [D-01](D-01-arc-and-chapters.md) and [D-02](D-02-rules-deltas.md).
**Scope:** Short and Standard only (DEC-866). The Long-only quests (`n23-third-bride`, `n4-eldest-witch`) are left out of every number here.
**Baseline:** The Ruined Keep's numbers. These are [`packs/base/tuning.yaml`](../../../../packs/base/tuning.yaml) (DEC-703, C3-02), the 1.1 numbers pass [P-006](../../probes/P-006-numbers-pass.md) (DEC-814 to DEC-830), and the 1.1 adversary and companion cards (DEC-774, DEC-775, DEC-825, DEC-828).
**Cards:** DEC-869 to DEC-874.

## Decisions

| Card | Decision (one line) |
|---|---|
| DEC-873 | Dracula changes no number in `packs/base/tuning.yaml`; every Dracula-only number is pack data, as The Ambush's toll is (Q-C3-08, Q-C3-22) |
| DEC-869 | Foe levels by chapter are 1, 2, 3, 3. Each chapter has its own roster of IDEA-127's reskins and IDEA-128's two story foes. The Heart of Sorrow is level 4, the Count level 5 |
| DEC-870 | An earth box adds at most 1 skull a day, never on a night a quest is won (DEC-699's rule carried over) |
| DEC-871 | The Darkness goal's extra skull comes at the ends of chapters 2 and 3 only (2 a game) |
| DEC-872 | Wards come from fixed sources: Short has about 3 a game, Standard about 5 |
| DEC-874 | The five corruptions are renamed as bites, keeping The Ruined Keep's gold values |
| (D-01 updated) | Day targets per length and party size replace D-01's placeholders (§6) |

## 1. Foes (DEC-869)

**Levels.** DEC-794 spreads every game's foes from 1 to 3 in whole steps. For Dracula's four chapters the last chapter repeats the top step, as Long's 1, 2, 2, 3, 3 ends: **1, 2, 3, 3**.
- Difficulty adds its offset: easy −1 and hard +1 (base `setup.difficulty`). The level is capped at 4, as in The Ruined Keep.
- Chapter 4's chapter level only matters for its wild events. The castle's foes are set by the Tower's rules below.

| Who | Level | Rule | Engine type (traits stay the engine's) |
|---|---|---|---|
| **Chapter 1: The Mists** | 1 | Chapter step | Wolves (Shadow Wolves), bat swarms (Widowmade Spiders), castle carters (Brigands) |
| **Chapter 2: The Hunt** | 2 | Chapter step | Zombies (Lemures), wights (Mormos), risen castle guard (Oreks), Werewolf (story foe: Beast and Stealth, regrows on a lost round, Shadow Wolves token) |
| **Chapter 3: The Truth** | 3 | Chapter step | Witches (Neuri), brides (Striga), Vampire Spawn (story foe: Undead and Stealth, one listed ability, Mormos token) |
| **Chapter 4 wild events** | 3 | Chapter step | Animated armour (Frost Trolls), brides |
| Tomb guardian (the blade, the Lantern) | 3 | Chapter 2 + 1 (`tomb.guardian.level_up`) | Werewolf at the blade's Tomb, wights at the Catacombs |
| Lieutenants on the board (Standard; guard and hunter, DEC-783) | 3 in ch2, 4 in ch3 | Chapter + 1 (DEC-828), capped at 4 | The third bride (brides) as the hunter, the eldest witch (witches) as the guard |
| Castle guards (every room) | 3 | Adversary − 2 (DEC-702) | Flooded Room: zombies. Swap: a wight. Banquet: the great statue (Titan). Stair rooms: animated armour |
| The Heart of Sorrow | 4 | Castle guard + 1, its own named foe (IDEA-098) | Story foe (DEC-326): Undead, one listed ability. D-04 picks it |
| **The Count** | 5 | `tower.warden.level`, the adversary's level, the same key as the Warden's (Q-C3-08) | Story adversary. The blade gives +3 Wild against him (floor +1), the Tome +1 (DEC-750) |

- **Out of Dracula's event tables:** Spine Fiends and the Dragon are taken out (DEC-498 lets a story remove content). They break the tone, and IDEA-127 only ever kept them rare.
- **Foe counts** follow the base (`battle.foe_count`: 4 a level, +1 a hero). The Funeral's nailed lid takes 1 foe off, down to a minimum of 1.
- **Reskins:** 10 types plus 2 story foes, above MEC-058's targets of 4 and 6.

## 2. Wild events per chapter

The base rate and weights are unchanged: `day.event_chance` is 30% at Short and 40% at Standard, and `event_weights` are quiet 30, windfall 15, hazard 20, foes 20, disaster 5 and people 10. People events offer rumour and trick only (Q-C3-03). Only the names and pictures change (IDEA-132). Loremaster writes them.

| Track | Chapter 1 | Chapter 2 | Chapter 3 | Chapter 4 |
|---|---|---|---|---|
| Quiet | Fog at noon | A shuttered farm | Church bells, no one ringing | Wind off the castle rock |
| Windfall (+5 gold) | A dead traveller's purse | Coin in a robbed grave | A widow's thanks | Supplies left at a wayside shrine |
| Hazard (−2 hit points) | Bloodless livestock and a frightened herd | A knocking coffin | The fog bank closes on the road | Falling stone |
| Foes | Wolves on the road | The dead walk | Brides singing on the road | The castle's watchers |
| Disaster | A burned farmstead, its dead risen | Grave robbers who are not robbers | The coven's fire | The bridge guard |
| People | Rumour or trick (the traitor's clue at Standard, DEC-854) | Same | Same | Same |

## 3. The Count's strikes per chapter

Strikes fire only in chapters 2 and 3 (D-02 G-7): he enters at the end of The Reading and waits in the Tower in chapter 4. He moves 1 space a day (DEC-825) and strikes at most once a day (DEC-775).

| | Chapter 2 | Chapter 3 |
|---|---|---|
| Expected strikes (2 heroes, Standard) | 2 to 3 | 1 to 2 |
| Default hit-point loss: 3 + the chapter number (DEC-828), never fells (DEC-775) | 5 | 6 |
| With the Lantern present (−2) | 3 | 4 |
| With Lenka on the hit hero (−2), stacking | 3, or 1 with both | 4, or 2 with both |
| Skirmish (DEC-778) | Up to 3 rounds against level 5. Winning one round sends him back to the Tower | Same |
| Arrival skull (DEC-775) | 1 a building reached | Same |

The goal's strike effects are D-02 §3 (DEC-850). Each strike scene opens with one of its goal's two `enc-*` openings, used in turn (DEC-858). Over a game there are about 3 to 5 strikes, so each goal's two openings each play once or twice. The guard and Lantern lines are event moments (D-02 G-9).

## 4. Gold, bites and story items

**Gold:** all base values (DEC-873):
- A won battle pays 2 a level, doubled for a disaster.
- A won quest pays the group 10 (DEC-827).
- Rally costs 5 and 1 move.
- A cure costs 10 and 1 move, and the first each chapter is free (DEC-700).
- A virtue draw costs 10. The tavern rest heals 3.
- A hire costs 20 (DEC-774).
- A story companion's ask costs 0 gold and 1 move (DEC-855).

The Ruined Keep's run ends with gold to spare at 3 and 4 heroes (P-006 finding 4), so Dracula adds no gold sinks.

**Bites (DEC-874).** The engine's corruption cards are renamed as the Count's bites (IDEA-131). The values are The Ruined Keep's (Q-C3-16): Cruel, Greedy and Feral each cost 2 gold on their trigger, Lost costs 1, and Tempted adds 2 to each buy. The names are working names for Loremaster.

| Engine | Dracula | Value |
|---|---|---|
| Cruel | The Thirst | −2 gold on its trigger |
| Greedy | The Hoard | −2 gold |
| Feral | The Wolf Within | −2 gold |
| Lost | The Fog in the Head | −1 gold |
| Tempted | The Invitation | +2 on each buy |

Cures follow D-DRA-6: a Sanctuary cure, holy water or the host (IDEA-137, IDEA-138). Each cure removes one bite. The guard: a third bite comes only in a player's own turn (DEC-565, MEC-013).

**Ward items (DEC-872).** Holy water and the host are story items (DEC-752). Each one is spent on a Ward, on a cure, or as holy water's +1 Undead Advantage.

| Source | Gives | Short | Standard |
|---|---|---|---|
| `nx-midnight-procession`, turning away (once a chapter, chapters 1 to 3) | 1 holy water | up to 3 | up to 3 |
| `n23-catacombs-of-saint-ysolde`, the guardian's fall | The host | 1 | 1 |
| `n2-burgomasters-funeral`: the nail (D-02 G-12), once, when the lid is nailed | The nail (a Ward only) | — | 1 |
| Jakob unmasked, when he is not the traitor's trick (DEC-854) | 1 holy water | — | 0 or 1 |
| **About a game** | | **3 to 4** | **5 to 6** |

Against about 3 to 5 strikes, there are enough Wards to turn about two thirds of them. Spending one on a cure instead is a real choice.

**Check with the nail (D-02 G-12, rechecked):** the Funeral now gives the nail in place of holy water, and the nail still counts as one Ward, once a game. So the counts hold: Short 3 to 4 Wards, Standard 5 to 6. What changes is the cures. The nail can't cure, so Standard has one cure-capable item fewer: 4 to 5 holy water or host. Watching the lid gives no nail (−1 Ward). Paying the Fly-Eater with holy water or the host costs one more. So a Standard table that does both has about 3 to 4.

## 5. Dracula's own numbers (pack data, DEC-873)

| What | Value | Source |
|---|---|---|
| The blade | +3 Wild against the Count; −1 for each landed blade strike; floor +1 | DEC-750, DEC-853 |
| The Tome | +1 Wild against the Count | DEC-750 |
| The Lantern | The goal's strike doesn't land for its group; −2 on the hit-point loss | DEC-850 |
| Lenka | −2 on her hero's strike loss | DEC-782 |
| Agnes, Wren, Emeric | Heal 2 at the end of each turn / +2 Undead / 1 clue a chapter (Tomas removed, D-02 G-10) | DEC-782 |
| Devoted companion | +1 on the effect's number | DEC-774 |
| Ward | 1 holy water or the host: he withdraws | DEC-858 |
| The earth box | 1 skull a day on a K4 building while any box stands; none on a quest-won night | DEC-779, DEC-870 |
| Darkness | 1 skull on the most-skulled building at the ends of chapters 2 and 3 | DEC-748, DEC-871 |
| The Open Grave | Bar the gate: 2 hit points to the hero the group picks. Or the battle | D-02 G-11 |
| The Long Night (a trap, D-04) | Hold them back: wolves at level 1. Talk them down: 1 skull on K1's Village. Lift the latch: 1 bite on a present hero the group picks (guarded), no battle | IDEA-082, DEC-875, DEC-876 |
| The Fly-Eater's price | 1 bite (guarded), or 1 holy water or the host | IDEA-088, D-02 G-18 |
| The Funeral's lid | Nail it: 1 foe fewer, and a loss costs 1 story item. Watch it: full strength, and a loss costs 1 bite (guarded) | rulings.md, DEC-781 |
| The Drawbridge | The bridge: 1 skull on the most-skulled building, and the Banquet's foes strike first; neither applies if Marta was unmasked. The little gate: 2 hit points from each present hero, with Marta an ally | DEC-857, DEC-883 |
| The Portrait | Look away: every hero loses 2 hit points. Cover it: 1 potion | IDEA-094 |
| The Lift | Ride it: each rider loses 3 hit points. Climb: 2 gold each. Under Darkness, ride only | IDEA-097 |
| The Swap | The hero returns at half their hit points, rounded up. A retreat brings them back next time, with 1 bite (guarded) | DEC-751 |
| Traitor tricks (Standard) | Jakob: a strike with no Ward offered. Andrei: Lenka is taken, or 2 skulls on K1's Citadel. Marta: the gate is barred | DEC-854 |
| Tomb size | Short 4–5 rooms, Standard 6–7 (`tomb.rooms`) | DEC-603 |
| Castle | The layout fixed by DEC-851. Shrine +2 once. Dealt traps −2 | `tower.*`, DEC-566 |

## 6. Day counts per length (replaces D-01's placeholders)

**Method:** P-006's days to win for The Ruined Keep, scaled by Dracula's quest count. The marginal cost of a quest is taken from P-006's Short to Standard step: about 1.5, 1.25, 0.75 and 0.75 days a quest for 1 to 4 heroes. Each count adds a day for Dracula's second Tomb and its fixed chapter 1 order. These are estimates. The Dracula numbers pass (§8) measures them.

| Days to win | 1 hero | 2 heroes | 3 heroes | 4 heroes |
|---|---|---|---|---|
| The Ruined Keep Short, 6 quests (P-006) | 25 | 23 | 16 | 14 |
| **Dracula Short, 8 quests** | **29** | **26** | **18** | **16** |
| The Ruined Keep Standard, 10 quests (P-006) | 31 | 28 | 19 | 17 |
| **Dracula Standard, 12 quests** | **35** | **31** | **21** | **19** |

**By chapter, for 2 heroes** (scale by about 0.7 for 3 or 4 heroes, and about 1.1 for a solo hero):

| Chapter | Short | Standard |
|---|---|---|
| 1. The Mists (one kingdom, 4 or 5 quests close together) | 7 | 8 |
| 2. The Hunt (two Tombs across two kingdoms; plus the Funeral and the Fly-Eater at Standard) | 9 | 10 |
| 3. The Truth (the Tome; plus three boxes at Standard) | 4 | 6 |
| 4. The Castle (the Drawbridge, nine rooms, the lair) | 6 | 7 |
| **Total** | **26** | **31** |

**Clock check (24 skulls, base `skulls.supply`).** Drops are counted on the nights with no quest won (DEC-699), at the party's rate:
- 1 hero: every other night (DEC-822).
- 2 heroes: 3 nights in 4 (DEC-824).
- 3 or 4 heroes: 1, then 2 on alternate nights (DEC-564).

Cleanses, which give a skull back, are not counted, so this is the worst case.

| Skulls spent by the win | 1 hero | 2 heroes | 3 heroes | 4 heroes |
|---|---|---|---|---|
| Night drops, Standard | 11.5 | 14 | 13.5 | 10.5 |
| The Count's arrivals (chapters 2 and 3, about 1 in 3.5 days) | 5 | 4.5 | 3 | 3 |
| Earth boxes (DEC-870) | 3 | 2 | 2 | 2 |
| Darkness, if it is the goal (DEC-871) | 2 | 2 | 2 | 2 |
| **Standard total, with Darkness** | **21.5** | **22.5** | **20.5** | **17.5** |
| **Short total, with Darkness** (no boxes) | 15.5 | 17 | 15 | 12.5 |

Every cell stays under 24 before any Cleanse. Standard with two heroes and Darkness is the tightest cell, as pairs were for The Ruined Keep (P-006 finding 2). DEC-870's quest-night rule is what keeps it under.

## 7. Proposed `tuning.yaml` values (a design table, not code)

Dracula is the base file's second reader. Every key keeps The Ruined Keep's value (DEC-873). The 1.1 engine keys that the cards have ruled but the file doesn't hold yet are added once for every story, with no story override (Q-C3-08).

| Key | Value | Change | Source |
|---|---|---|---|
| `c3_end_after_chapter_1`, `fight_enabled` | false, true | Already flipped by C4/C5; listed for completeness | Q-C3-01, Q-C3-02 |
| `day.event_chance` | short 30, standard 40 | none | DEC-703, DEC-669 |
| `day.event_weights` | 30/15/20/20/5/10 | none | DEC-703 |
| `skulls.supply` | 24 | none | DEC-686 |
| `skulls.drops_a_night` | 1 to 2 heroes 1; 3 to 4 heroes 1, then 2 on alternate nights | none | DEC-564 |
| `skulls.solo_every_other_night`, `skulls.pair_skip_every_fourth` | true, true | add (ruled, not yet in the file) | DEC-822, DEC-824 |
| `skulls.quest_won_suppresses_drop` | true | none | DEC-699 |
| `gold.won_quest` | 10 to the group | change from 5 a hero (ruled) | DEC-827 |
| `heroes.solo` | +2 fight, +4 full hit points | change (ruled) | DEC-822 |
| `foes.level_by_chapter` | spread 1 to 3 over the game's chapters; Dracula 1, 2, 3, 3 | replaces `chapter_1: 1, per_chapter: 1` (ruled) | DEC-794, DEC-869 |
| `foes.level_cap` | 4 | add | The Ruined Keep's cap |
| `adversary.move_spaces_a_day` | 1 | add | DEC-825 |
| `adversary.arrival_skulls` | 1 | add | DEC-775 |
| `adversary.strike_hit_points` | 3 + the chapter number, stopping at 1 | add | DEC-775, DEC-828 |
| `adversary.skirmish_rounds` | 3 | add | DEC-778 |
| `tower.adversary.level` | 5 | rename from `tower.warden.level` (an engine follow-up, the same value) | Q-C3-08 |
| `lieutenant.level_offset` | +1 | add | DEC-828 |
| `companions.hire_gold`, `companions.devoted_bonus` | 20, +1 | add | DEC-774 |
| `tomb.rooms` | short 4–5, standard 6–7 | none | DEC-603 |
| `tower.*` | rooms as the file; guard adversary − 2; shrine +2 once; trap −2 | none | DEC-566, DEC-702 |
| `battle.*`, `spells.*`, `gold.*` (except `won_quest`), `corruption` values | as the file | none | DEC-703, DEC-801, Q-C3-16 |

Nothing here is Dracula-only. Every Dracula-only number is in §5 and lives in `packs/dracula`.

## 8. Next

- **The Dracula numbers pass (P-007):** P-006's throwaway script (DEC-814), extended with Dracula's quest list, the Count's goals and strikes, the boxes and the Wards. It runs Short and Standard with 1 to 4 heroes at all three difficulties, against DEC-823's 80% floor, DEC-819's easy floor and DEC-829's hard band. If a cell misses, D-03's pack numbers move first. A base number moves only through DEC-817's rule.
- **D-04:** the session flow and screens. It covers the strike scene's copy hooks (Loremaster's Fight, Ward and Endure labels, and the Ward reason line), the reading's reveal, the castle's fixed rooms, the endings, and whether "move" works as a scene cost (DEC-857).

## OPEN RULINGS (Bob), continued from D-02

None. Nothing in D-03 reverses a Bob lock or changes scope. Every call above is decided by Gamewright under the standing rule. Still with Bob from earlier: Lenka's face (she stays veiled meanwhile) and the Vellmoor cover.
