# Dracula, Group 1: opening and chapter cards (rev 2)

**Status: DRAFT** (every line pending DEC-785 / OPEN RULING 6). Loremaster, 2026-11-10. Built on four chapters: Mists, Hunt, Truth and Castle (confirmed by Bob, 2026-11-10). No counted nights anywhere in the copy.

**Rev 2 (Gamewright answers, 2026-11-10):** the chapter cards are the same at every length, with no length variants and no lieutenant quests, so `chapter-card.03~short` is dropped. Card 3 is now about the Tome and the truth, with no earth boxes. Card 2 no longer implies the first parish stays open. Each card is trimmed to about 10 s (rev 3: re-timed against the real C5-05 renders; card 1 drops the inn, which the opening already reaches. Rev 4: cards 1 and 4 trimmed to 10 s or less, and card 1 says "till dawn", not "through the night"). The Count's strikes never take a quest object, so card 4 stands.

**Speaker:** `narrator` (Charon, "slow, low, ominous storyteller", packs/dracula/cast.yaml). A voice only, lantern emblem, never on screen. Spoken to the whole table. Caption = spoken text, word for word.

**Estimates:** 0.40 s per word + 4.0 s, fitted to the 13 Charon masters in C5-05 (`/workspace/c5-05-art/voice/MANIFEST.md`); expect about ±3 s. Cap 20 s (about 40 words).

## `opening` (D-01 beat `opening`)

Intent (D-01): "A dead man's letter brings you in, and the fog shuts the road behind you". Plays before `chapter-card.01`. Does not reveal that Anton is dead or who wrote the letter; the "fine old-fashioned hand" is the only hint (same hand as the `come-home-letter` prop).

| Asset id | Speaker | Spoken text | Caption | Est. s | Intent (D-01) | Status |
|---|---|---|---|---|---|---|
| `opening.01~vo-01` | narrator | A letter brought you to Vellmoor. Heavy paper, a fine old-fashioned hand. It is signed Anton Morosz, burgomaster. | A letter brought you to Vellmoor. Heavy paper, a fine old-fashioned hand. It is signed Anton Morosz, burgomaster. | 11.6 | `opening`: A dead man's letter brings you in, and the fog shuts the road behind you | DRAFT |
| `opening.02~vo-01` | narrator | It asks for hunters. Our dead do not stay in the ground, it says. Come quickly. Come before the snow. | It asks for hunters. Our dead do not stay in the ground, it says. Come quickly. Come before the snow. | 12.0 | `opening`: A dead man's letter brings you in, and the fog shuts the road behind you | DRAFT |
| `opening.03~vo-01` | narrator | This year the valley has buried more of its own than in the ten years before. It is All Hallows' Eve. | This year the valley has buried more of its own than in the ten years before. It is All Hallows' Eve. | 12.4 | `opening`: A dead man's letter brings you in, and the fog shuts the road behind you | DRAFT |
| `opening.04~vo-01` | narrator | You come down the last hill at dusk. On the far ridge stands a castle, every window lit for the first time in years. | You come down the last hill at dusk. On the far ridge stands a castle, every window lit for the first time in years. | 13.6 | `opening`: A dead man's letter brings you in, and the fog shuts the road behind you | DRAFT |
| `opening.05~vo-01` | narrator | Behind you, the mist comes down over the road. It does not drift. It falls, like a lid. When it thins, the road is gone. | Behind you, the mist comes down over the road. It does not drift. It falls, like a lid. When it thins, the road is gone. | 14.0 | `opening`: A dead man's letter brings you in, and the fog shuts the road behind you | DRAFT |
| `opening.06~vo-01` | narrator | There is no way back. Ahead, at the crossroads, a lamp burns over the door of an inn. The Lantern and Bell. | There is no way back. Ahead, at the crossroads, a lamp burns over the door of an inn. The Lantern and Bell. | 12.8 | `opening`: A dead man's letter brings you in, and the fog shuts the road behind you | DRAFT |

## `chapter-card.01` … `.04` (D-01 beat `chapter-card.01 … .04`)

Intent (D-01): "Each chapter's name and goal, in one breath". The chapter name is on-screen card text only, not voiced (as C5-05). The VO is the goal line, the same at every length.

| Asset id | Card name (screen, not voiced) | D-01 chapter goal | Speaker | Spoken text | Caption | Est. s | Status |
|---|---|---|---|---|---|---|---|
| `chapter-card.01~vo-01` | The Mists | Reach the inn, find the dead man's house, keep Lenka through the night and hear the reading. | narrator | Find the burgomaster's house. Keep his daughter safe till dawn. Then have your fortunes read. | Find the burgomaster's house. Keep his daughter safe till dawn. Then have your fortunes read. | 10.0 | DRAFT |
| `chapter-card.02~vo-01` | The Hunt | Bring back the blade and the Lantern. | narrator | Two new parishes open. Bring back Stefan's blade and the Lantern of Saint Ysolde. | Two new parishes open. Bring back Stefan's blade and the Lantern of Saint Ysolde. | 9.6 | DRAFT |
| `chapter-card.03~vo-01` | The Truth | Burn his earth and find the Tome. | narrator | The last parish opens. Find the Tome there, and learn the truth of him. | The last parish opens. Find the Tome there, and learn the truth of him. | 9.6 | DRAFT |
| `chapter-card.04~vo-01` | The Castle | Cross to the castle with all three objects, climb it and destroy him. | narrator | Carry the blade, the Lantern and the Tome to his gate. Climb, and destroy him. | Carry the blade, the Lantern and the Tome to his gate. Climb, and destroy him. | 10.0 | DRAFT |

**Totals:** 10 lines. Est. 115.6 s (opening 76.4 s, cards 39.2 s). Longest line 14.0 s.

## Notes for the rewrites

- `opening.03` reuses the old `n1-lantern-and-bell.01` idea (more dead this year than the ten before, All Hallows' Eve, castle lit). Drop it from the inn rewrite.
- Card 1 says "his daughter", not "Lenka": the table meets her at the house. It also avoids "the dead man's house", because the inn is where they learn Anton is dead.
- Card 3 no longer mentions the earth boxes, which are a quest at some lengths only (Gamewright rule: the cards never vary by length). D-01's goal "burn his earth" is left to that quest's own opening.
- "Mist", not "fog", to match the chapter name The Mists. "Parish" is the in-world word for a kingdom. Kingdom names are never spoken.
- No mention of the Count's goal, Ludmila, Lenka's likeness, the swap, or the Count showing himself after the blade. Lenka's face is never described (her face stays hidden in the art pending Bob's ruling). The Count is unseen; the lit castle and the letter's old hand are the only hints.
- Source: the scripts on main at `assets/stories/dracula/scripts/`.

## Open questions

None left for Group 1. Gamewright answered all four on 2026-11-10.
