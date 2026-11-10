# Dracula, Group 5 (8/15): `n3-fly-eaters-cell` (rewrite)

**Status: DRAFT** (pending DEC-785 / OPEN RULING 6). Loremaster, 2026-11-10. Rewritten from main's `assets/stories/dracula/scripts/n3-fly-eaters-cell.md` around the new plot: Lenka free (she joins at the Burgomaster's House), pool heroes, four chapters, nothing private, Short and Standard only, no Tomas. Lenka's face is shown from chapter 1 (travelling hood, face clear; the Tome changes it — see lenka-look.md). The Count is unseen until his lair.

- **Where / kind:** Kingdom B Citadel: the lockhouse. Chapter 2 (Standard). Plain scene. Reward: the clue that places the earth boxes (IDEA-088)
- **D-01 intent:** Jakob sells where the boxes went, for a bite or an item
- **D-02:** §8: Jakob's own story is a traitor clue source (Standard and Long), with a line per suspect. MEC-013: the blood price is guarded at 2 bites. §9: Agnes's loyalty drops if the price is paid with a bite on her hero.
- **Painting (`painting.n3-fly-eaters-cell`, Illusionist, one line):** A whitewashed cell freckled with dead flies. A thin bookkeeper sits cross-legged in the middle, plucking a fly from the air, his cupped hand held out. Ledger pages are pinned to the wall. No faces in focus. The Count is not shown.

**Estimates:** 0.40 s per word + 4.0 s, fitted to the 13 Charon masters in C5-05 (`/workspace/c5-05-art/voice/MANIFEST.md`); expect about ±3 s. Cap 20 s (about 40 words). Captions = spoken text, word for word. A line whose speaker is not with the group is skipped (D-02 §10), and the narrator carries the plot without it. Ids: base `<scene>.NN~vo-01`, goal or lair `<scene>.NN~<value>.vo-01`, events `<scene>.<event>~vo-01`.

| Asset id | Speaker (voice) | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `n3-fly-eaters-cell.01~vo-01` | narrator (Charon) | Jakob Brenner kept the castle's books for twenty years. | Jakob Brenner kept the castle's books for twenty years. | 7.6 | opening (kept from the original .01); clip 1 of 2 (caption cap 120) | DRAFT |
| `n3-fly-eaters-cell.01~vo-02` | narrator (Charon) | Then one spring he walked down the hill and asked to be locked up, for safety. Whose safety, he would not say. | Then one spring he walked down the hill and asked to be locked up, for safety. Whose safety, he would not say. | 12.8 | clip 2 of 2, plays right after n3-fly-eaters-cell.01~vo-01 | DRAFT |
| `n3-fly-eaters-cell.02~vo-01` | jakob (Puck) | Visitors! The blood is the life, friends. Flies are only a little life. One must start small. | Visitors! The blood is the life, friends. Flies are only a little life. One must start small. | 10.8 | Stoker (Renfield), kept from the original .02 | DRAFT |
| `n3-fly-eaters-cell.03~vo-01` | jakob (Puck) | You want to know where his earth went. I wrote the shipping orders. Plans cost. Debit, credit. | You want to know where his earth went. I wrote the shipping orders. Plans cost. Debit, credit. | 10.8 | the offer | DRAFT |
| `n3-fly-eaters-cell.04~vo-01` | jakob (Puck) | Something that matters. A drop of your blood on my tongue, or a thing you carry that he fears. | Something that matters. A drop of your blood on my tongue, or a thing you carry that he fears. | 11.6 | the price (kept from the original .05) | DRAFT |
| `n3-fly-eaters-cell.blood~vo-01` | jakob (Puck) | Oh, he does like you. I can taste it. Debit. | Oh, he does like you. I can taste it. Debit. | 8.0 | option Pay in blood: a bite (kept) | DRAFT |
| `n3-fly-eaters-cell.item~vo-01` | jakob (Puck) | He'll hate that I have this. Lovely. Debit. | He'll hate that I have this. Lovely. Debit. | 7.2 | option Pay with an item (kept) | DRAFT |
| `n3-fly-eaters-cell.paid~vo-01` | jakob (Puck) | Three boxes, in the last parish. One under the chapel, two on the village carts. He sleeps in one, turn and turn about. | Three boxes, in the last parish. One under the chapel, two on the village carts. He sleeps in one, turn and turn about. | 13.2 | after either payment: the box sites | DRAFT |
| `n3-fly-eaters-cell.refused~vo-01` | jakob (Puck) | He sleeps in boxes. That's all you get for nothing. Credit nothing, debit nothing. | He sleeps in boxes. That's all you get for nothing. Credit nothing, debit nothing. | 9.6 | option Refuse (kept) | DRAFT |
| `n3-fly-eaters-cell.clue-jakob~vo-01` | jakob (Puck) | Who let him in? Not me. I only kept the books. The books never open a door. | Who let him in? Not me. I only kept the books. The books never open a door. | 10.8 | traitor clue, suspect Jakob (Standard and Long, engine clue slot) | DRAFT |
| `n3-fly-eaters-cell.clue-andrei~vo-01` | jakob (Puck) | Ask the burgomaster's boy where he walks at dusk. The Master pays well for a son's grief. | Ask the burgomaster's boy where he walks at dusk. The Master pays well for a son's grief. | 10.8 | traitor clue, suspect Andrei | DRAFT |
| `n3-fly-eaters-cell.clue-marta~vo-01` | jakob (Puck) | The little maid pours his wine and counts his glasses. She counts other things too. | The little maid pours his wine and counts his glasses. She counts other things too. | 10.0 | traitor clue, suspect Marta | DRAFT |
| `n3-fly-eaters-cell.05~vo-01` | jakob (Puck) | I don't want to talk to you. You don't count now. The Master is at hand. | I don't want to talk to you. You don't count now. The Master is at hand. | 10.4 | Stoker (Renfield), kept from the original .08 | DRAFT |
| `n3-fly-eaters-cell.06~vo-01` | narrator (Charon) | Behind you, the cell fills with flies again, and Jakob is singing a counting song under his breath. | Behind you, the cell fills with flies again, and Jakob is singing a counting song under his breath. | 11.2 | end hook (kept from the original .10) | DRAFT |

**On-screen labels (DRAFT, not voiced):**

| Tag | Text | Effect / note |
|---|---|---|
| `n3-fly-eaters-cell, option, blood` | Pay in blood | a bite on one hero; disabled for a hero at 2 bites |
| `n3-fly-eaters-cell, option, item` | Pay with an item | one holy water, the host or a stake |
| `n3-fly-eaters-cell, option, refuse` | Refuse | no clue |
| `needs a hero with fewer than two bites` | Needs a hero with fewer than two bites | the disabled reason for Pay in blood |
| `needs a story item` | Needs holy water, the host or a stake | the disabled reason for Pay with an item |

**Totals:** 14 lines, est. 144.8 s (every line counted, including variants and events). Longest 13.2 s.
