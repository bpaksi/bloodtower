# The Ruined Keep: script

Draft by Claude for Bob's review, chapter by chapter (DEC-833). One script for 1.0 and 1.1 in one voice (DEC-832). The 1.0 lines are 1.0's story pass, and C5 swaps them in for the `[COPY: …]` placeholders. 1.1's lines are added later in the same chapters (DEC-835).

**Tone (DEC-834):** grim and plain. Low fantasy, short and concrete, with few adjectives. A line is one or two sentences you can read aloud in one breath. Help text says what to tap, in short sentences.

**How to read it:** each row is one slot. The tag is the plan's `[COPY: …]` tag. A tag marked *new* is one the plans don't name yet; the code step adds it. "Was" shows the plan's sample line when there is one (DEC-836).

**Status:** the opening and chapter 1 are drafted. Chapters 2 and 3, the finale, the endings, the losses, the shared lines, help text and 1.1's additions are still to come.

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
