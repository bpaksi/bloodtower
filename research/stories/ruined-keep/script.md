# The Ruined Keep: script

Draft by Claude for Bob's review, chapter by chapter (DEC-833). One script for 1.0 and 1.1 in one voice (DEC-832). The 1.0 lines are 1.0's story pass, and C5 swaps them in for the `[COPY: …]` placeholders. 1.1's lines are added later in the same chapters (DEC-835).

**Tone (DEC-834):** grim and plain. Low fantasy, short and concrete, with few adjectives. A line is one or two sentences you can read aloud in one breath. Help text says what to tap, in short sentences.

**How to read it:** each row is one slot. The tag is the plan's `[COPY: …]` tag. A tag marked *new* is one the plans don't name yet; the code step adds it. "Was" shows the plan's sample line when there is one (DEC-836).

**Status:** 1.0's story lines are accepted by Bob, 2026-11-06: the opening, chapters 1 to 3, the finale and the endings, working names included. Still to come: the shared lines (regroup, events, counter saved, the battle and reward boards), help text and UI labels (DEC-836), and 1.1's additions (DEC-835).

## Names

Working names, Bob's to change.

| Name | Who or what | Cards |
|---|---|---|
| Greyford | The village at the start, in Arisilon | DEC-636 (start at the Arisilon citadel), DEC-661 |
| Tomas | The village's herald. His father drew the map of the keep's ways | DEC-661, DEC-672 |
| The Warden | The keep's last lord, gone forty years | DEC-661, DEC-667 |
| The Muted Forest | Where the raiders wait on the road | DEC-662 |

## Opening

| Tag | Line | Cards |
|---|---|---|
| `opening` *new* | The roads out of Greyford are closed. Raiders have taken every cart for a month, and the lord's men are not coming. | DEC-661, DEC-663 |

## Chapter 1: The Roads (1.0)

Arisilon only. Two quests: The Herald, then The Ambush (DEC-662).

### Chapter card

| Tag | Line | Cards |
|---|---|---|
| `chapter 1 name` | The Roads | DEC-662 |
| `chapter 1 goal` | Hear the herald in Greyford. Then open the forest road. | DEC-662, UI-020 |

### The Herald (plain scene, the village)

| Tag | Line | Cards |
|---|---|---|
| `the herald opening` | Tomas the herald meets you at the well. "They take a cart a week now. Will you go?" | DEC-662 |
| `the herald, option, take the job` *new* | Take the job | DEC-672 |
| `the herald, option, ask for pay` *new* | Ask for pay first | DEC-672 |
| `the herald, take the job` *new* | Tomas hands you a map of the keep's old ways. "My father drew it. Bring it back if you can." | DEC-672, DEC-461 (Tomas's Map) |
| `the herald, ask for pay` *new* | Tomas counts ten gold out of the village box. It doesn't take long. | DEC-672 (+10 gold) |
| `the herald end hook` | "The forest road," Tomas says. "That's where they wait." | MEC-077 |

### The Ambush (plain scene, the Muted Forest)

In C3, only the toll shows (Q-C3-02). C4 adds Fight.

| Tag | Line | Cards |
|---|---|---|
| `the ambush opening` *new* | Felled trees block the forest road. Men step out from behind them, bows drawn. Their shields have had a crest scratched off. | DEC-662 (the crest pays off in The Barrow) |
| `the ambush, option, fight` *new* | Fight | DEC-662, C4 fight-buttons |
| `the ambush, option, pay the toll` *new* | Pay the toll | DEC-662, Q-C3-22 |
| `the ambush, toll paid` *new* | "Ten gold, and you walk." You pay, and they melt back into the trees. | Q-C3-22 (toll 10 gold) |
| `the ambush, toll short` *new* | You don't have ten. They take what you have, and a beating for the rest. | Q-C3-22 (all gold and 2 hit points each, never below 1) |
| `the ambush, fight won` *new* | The last raider runs. Every scratched crest on their shields was the same shape. | DEC-662 (C4) |
| `the ambush end hook` *new* | The road is clear. Past the trees, the old keep stands on its hill. | DEC-662 |

The C4 fight-buttons spec has sample lines for a plain scene with a battle: "Shapes move on the road ahead. They have seen you.", "Slip past" and "Talk them down". The Ambush uses its own lines above. The two sample options are not part of DEC-662's choice (fight or pay).

### Chapter 1 won

| Tag | Line | Cards |
|---|---|---|
| `chapter 1 win, Loremaster` | The roads are open. On the far hill, a fire burns in the old keep, where no one has lived for forty years. | Q-C3-23 (C3's win line) |
| `seal break ch1, Loremaster` | The roads are clear, and a seal breaks like an old oath giving way. Ahead stands the Ruined Keep. | C4 Q-C4-10. Was: "The roads are clear and a seal breaks. Ahead stands the Ruined Keep." The oath hint sets up IDEA-179 in 1.1 |
| `seal-break-live, seal1` | The Road Seal | C4 seal-break-live (kept) |

## Chapter 2: The Keep (1.0)

Brynthia opens, and Arisilon stays walkable. Two quests in either order: The Barrow, then The Shrine (DEC-662). The reveal is in The Barrow: the raiders serve The Warden.

### Chapter card

| Tag | Line | Cards |
|---|---|---|
| `chapter 2 name` *new* | The Keep | DEC-662 |
| `chapter 2 goal` *new* | Go down into the barrow under the old keep. Find the shrine on the road beside it. | DEC-662, UI-020 |

### The Barrow (Tomb, under the keep)

The one 1.0 Tomb (MEC-026). The board lines are the Tomb's; any later Tomb story may keep them or swap its own.

| Tag | Line | Cards |
|---|---|---|
| `the barrow opening` *new* | The keep's gate hangs open. Steps go down under it, and the air that comes up is cold. | DEC-662 |
| `tomb-screens, board` | The barrow. Rooms found: {N}. / Undead Advantage: {N}. / A cold corridor. Three doors wait. / You hear something behind the door. / A trap. / Something wakes in the dark. / The way out is open. | C4 tomb-screens. Was: "The Tomb. Rooms found…" and "The Exit is open." |
| `tomb-screens, listen` | You listen down the corridor. | C4 tomb-screens (kept), DEC-618 |
| `tomb-screens, pit` | The floor gives way. Choose one hero to take the fall and lose 4 hit points. | Locked by Loremaster, 2026-10-31, DEC-606 (kept) |
| `tomb-screens, rocks` | Stones crash from the ceiling. Every hero loses 2 hit points. | Locked by Loremaster, 2026-10-31, DEC-606 (kept) |
| `the barrow, guardian` *new* | The keep's dead garrison stands up from the floor, still in its rusted mail. | DEC-662 (the guardian), DEC-608 |
| `the barrow, guardian falls` *new* | The last of the garrison falls. Its shield bears the crest the raiders scratched off: the Warden's. | DEC-662 (the reveal) |
| `the barrow, signet` *new* | On one bony hand is a ring with the same crest: the Warden's Signet. | DEC-674 (story item, opens The Lock) |
| `the barrow end hook` *new* | You climb back into the daylight. The raiders were never only raiders. | DEC-662 |
| `the barrow, the warden rides` *new*, 1.1 | At the Tower, a door shut for forty years swings open. The Warden rides out. | DEC-791 (1.1: he first appears when The Barrow is done) |

### The Shrine (plain scene, the sanctuary)

| Tag | Line | Cards |
|---|---|---|
| `the shrine opening` *new* | The shrine stands by the road, its altar cracked. An oath is cut into the stone, with the Warden's name under it. | DEC-662 (where he swore his oath) |
| `the shrine, option, pray` *new* | Pray at the altar | DEC-673 |
| `the shrine, option, rest` *new* | Rest at the altar | DEC-837 |
| `the shrine, pray` *new* | You pray. Under the altar stone lies a blade, the one he swore on. | DEC-673 (the oath-blade, +3 Wild against The Warden) |
| `the shrine, rest` *new* | You sleep beside the altar. You wake with your wounds closed, and the stone gone cold. | DEC-837 (every present hero heals to full) |
| `the shrine end hook` *new* | Whatever he swore here, he didn't keep it. | DEC-662 |

### Chapter 2 won

| Tag | Line | Cards |
|---|---|---|
| `seal break ch2, Loremaster` | The Keep gives up its dead, and a second seal cracks. The Tower waits. | C4 Q-C4-10 (kept) |
| `seal-break-live, seal2` | The Keep Seal | C4 seal-break-live (kept) |

## Chapter 3: The Tower (1.0)

The whole board opens. Two quests: The Lock and The Last Stand. When both are done, the Tower unlocks (DEC-645), and the finale is The Warden in the Tower (DEC-662).

### Chapter card

| Tag | Line | Cards |
|---|---|---|
| `chapter 3 name` *new* | The Tower | DEC-662 |
| `chapter 3 goal` *new* | Open the sealed gate on the Tower road. Break his guard on the Grass Sea. Then climb. | DEC-662, DEC-645, UI-020 |

### The Lock (plain scene, the Howling Desert citadel)

| Tag | Line | Cards |
|---|---|---|
| `the lock opening` *new* | The gate on the Tower road is sealed with iron and the Warden's crest. In the middle is a hollow the size of a ring. | DEC-662, Q-C3-10 |
| `needs the Warden's Signet` | Needs the Warden's Signet | DEC-654 (the disabled option's reason) |
| `the lock, option, signet` *new* | Turn the Signet | DEC-674 |
| `the lock, option, force` *new* | Force it | DEC-674 (a level-up battle) |
| `the lock, signet` *new* | The ring turns in the lock. The gate opens without a sound. | DEC-674 (the Signet is kept) |
| `the lock, force` *new* | You set your shoulders to the gate. Behind it, something hears you. | DEC-674 (the battle starts) |
| `the lock, force won` *new* | The gate gives. What guarded it doesn't get up. | DEC-674 |
| `the lock end hook` *new* | The Tower road is open. | DEC-662 |

### The Last Stand (plain scene with a battle, the Grass Sea)

A random level 3 foe (Q-C3-11), read as the Warden's sworn guard.

| Tag | Line | Cards |
|---|---|---|
| `the last stand opening` *new* | On the Grass Sea, his sworn guard waits in a line, shields locked. They wear his crest openly now. | DEC-662, Q-C3-11 |
| `the last stand, option, fight` *new* | Hold the line | DEC-662 (level 3 battle) |
| `the last stand, option, fall back` *new* | Fall back | DEC-838 (leave at no cost; the quest stays open) |
| `the last stand, won` *new* | The last of his guard goes down in the grass. Nothing stands between you and the Tower. | DEC-662 |
| `the last stand, fall back` *new* | You give ground. They don't follow. They don't need to. | DEC-838 |

### Chapter 3 won

| Tag | Line | Cards |
|---|---|---|
| `chapter 3 win, Loremaster` | The gate is open and the last stand held. The Warden's door is open, for now. | C4 Q-C4-01 (C4's win line). Was: "The Lock is turned…", which misreads a forced gate |
| `seal break ch3, Loremaster` | The last stand holds, and the third seal breaks. Only the Warden remains. | C4 Q-C4-10 (kept) |
| `seal-break-live, seal3` *new* | The Tower Seal | C4 seal-break-live names only two |

## The finale: the Tower (1.0)

| Tag | Line | Cards |
|---|---|---|
| `tower opening` *new* | The Tower door stands open. Inside, the stairs climb into the dark. | MEC-076 |
| `tower-screens, board` | The Tower. Level {N}. / Rooms found: {N}. / A door, shut and cold. / A shrine. You can rest here. / The stairs climb on. | C5 tower-screens (kept) |
| `tower-screens, trap` | Every hero loses 2 hit points. | Locked by Loremaster, 2026-10-31 (kept) |
| `boss-screen, opening` *new* | The Warden waits at the top, in what is left of his armour. "I kept it forty years," he says. "Then it spoke." | DEC-661, DEC-667 |
| `boss-screen, board` | The Warden. Strength left: {N}. / The Warden changes. / The Warden falls. | C5 boss-screen (kept) |
| `last choice, Warden falls` | The Warden falls. Beneath the keep lies the shard he swore to guard. Shatter it for good, or swear his oath and guard it in his place. | DEC-663, DEC-667 (kept) |
| `option, break the seal` | Shatter the shard | DEC-663 (kept) |
| `option, swear the oath` | Swear the oath | DEC-663 (kept) |
| `finale-and-endings, board` | Choose together. / Waiting on: {hero}. / {hero} has voted. / The choice is made. | C5 Q-C5-03 (kept) |
| `tie, vote again` | A tie. Vote once more. | C5 Q-C5-03 (kept) |

## Endings (1.0)

| Tag | Line | Cards |
|---|---|---|
| `finale win, seal shattered` | The shard shatters. The Tower's call goes quiet, and the roads are yours. | DEC-663 (kept) |
| `finale win, seal holds` | You swear his oath and take up his watch. The Tower called to him once. It will call to you. | DEC-663. Was: "…Guard the shard well. The Tower called to him once, and it will call to you." Trimmed to one breath |
| `credits` | Not used | Q-C5-09 picked no credits Scroll |
| `skulls loss` | The last skull falls. The Tower's shadow covers the land, and the roads are his for good. | DEC-144 |
| `corruption loss` *new* | One of you hears the Tower call, and goes to it. Without them, the hunt is over. | DEC-144. Avoids naming the mark, since 1.1 calls it an oath-mark (IDEA-177) |
| `fallen buildings loss` *new* | Four strongholds have fallen. There is nowhere left to hold, and his raiders own the land. | DEC-144, Q-C3-05 |
