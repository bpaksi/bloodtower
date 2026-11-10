# Dracula, Group 5 (9/15): `n4-earth-boxes` (rewrite)

**Status: DRAFT** (pending DEC-785 / OPEN RULING 6). Loremaster, 2026-11-10. Rewritten from main's `assets/stories/dracula/scripts/n4-earth-boxes.md` around the new plot: Lenka free (she joins at the Burgomaster's House), pool heroes, four chapters, nothing private, Short and Standard only, no Tomas. Lenka's face is shown from chapter 1 (travelling hood, face clear; the Tome changes it — see lenka-look.md). The Count is unseen until his lair.

- **Where / kind:** K4: two plain scenes with a battle, K4 Sanctuary then K4 Village. Chapter 3 (Standard). Reward: boxes burned, so the daily skull stops (IDEA-089, DEC-779)
- **D-01 intent:** Burn three boxes across K4; three rotating clips and a last-box clip
- **D-02:** §8: Marta is met at the K4 Village box, half-turned (Standard and Long), and the shipping orders are a traitor clue source with a line per suspect. A standing box adds 1 skull in K4 each day's close (DEC-779). Box clips are event moments, played in turn.
- **Painting (`painting.n4-earth-boxes`, Illusionist, one line):** A desecrated chapel and village carts in heavy noon mist. Long earth boxes are stencilled 'Garden soil. Handle with care.' One is burning, and bats pour out of the smoke toward the castle. A girl in a maid's apron over faded livery watches from the carts, her face turned away. The Count is not shown.

**Estimates:** 0.40 s per word + 4.0 s, fitted to the 13 Charon masters in C5-05 (`/workspace/c5-05-art/voice/MANIFEST.md`); expect about ±3 s. Cap 20 s (about 40 words). Captions = spoken text, word for word. A line whose speaker is not with the group is skipped (D-02 §10), and the narrator carries the plot without it. Ids: base `<scene>.NN~vo-01`, goal or lair `<scene>.NN~<value>.vo-01`, events `<scene>.<event>~vo-01`.

| Asset id | Speaker (voice) | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `n4-earth-boxes.01~vo-01` | narrator (Charon) | The mist is so thick now that noon looks like evening. | The mist is so thick now that noon looks like evening. | 8.4 | opening (from the original .01); clip 1 of 2 (caption cap 120) | DRAFT |
| `n4-earth-boxes.01~vo-02` | narrator (Charon) | Long boxes of black earth, nailed shut, stencilled in a neat ledger hand. Garden soil. Handle with care. | Long boxes of black earth, nailed shut, stencilled in a neat ledger hand. Garden soil. Handle with care. | 11.2 | clip 2 of 2, plays right after n4-earth-boxes.01~vo-01 | DRAFT |
| `n4-earth-boxes.02~vo-01` | emeric (Fenrir) (skipped if absent) | Grave earth, but not this valley's. They must rest in their own earth, or not at all. | Grave earth, but not this valley's. They must rest in their own earth, or not at all. | 10.8 | Emeric, if with the group (from the original .02) | DRAFT |
| `n4-earth-boxes.box-1~vo-01` | narrator (Charon) | The earth burns like peat. Somewhere up on the hill, someone feels it. | The earth burns like peat. Somewhere up on the hill, someone feels it. | 9.2 | event: the first box burned (kept) | DRAFT |
| `n4-earth-boxes.box-2~vo-01` | narrator (Charon) | This box screams as it burns. Not the wood. The earth. | This box screams as it burns. Not the wood. The earth. | 8.4 | event: the second box burned (kept) | DRAFT |
| `n4-earth-boxes.box-last~vo-01` | narrator (Charon) | The last box goes up in one breath. On the hill, for the first time in a generation, a castle window goes dark. | The last box goes up in one breath. On the hill, for the first time in a generation, a castle window goes dark. | 13.2 | event: the last box burned (kept) | DRAFT |
| `n4-earth-boxes.03~vo-01` | narrator (Charon) | By the village carts, a girl in a maid's apron and faded castle livery watches you burn his earth. She doesn't stop you. | By the village carts, a girl in a maid's apron and faded castle livery watches you burn his earth. She doesn't stop you. | 13.2 | Marta met (Standard) | DRAFT |
| `n4-earth-boxes.04~vo-01` | marta (Aoede) (skipped if absent) | I pour his wine. I've poured it for years. I still come home at dusk, when he lets me. Whose side does that put me on? | I pour his wine. I've poured it for years. I still come home at dusk, when he lets me. Whose side does that put me on? | 14.4 | Marta, half-turned | DRAFT |
| `n4-earth-boxes.05~vo-01` | count (Algieba) | You think to baffle me, with your pale faces all in a row, like sheep in a butcher's. | You think to baffle me, with your pale faces all in a row, like sheep in a butcher's. | 11.2 | Stoker, kept from the original .06; a voice from the smoke | DRAFT |
| `n4-earth-boxes.clue-jakob~vo-01` | narrator (Charon) | On the bottom of a box lid, an order slip: one extra box, sent to the lockhouse, signed J.B. | On the bottom of a box lid, an order slip: one extra box, sent to the lockhouse, signed J.B. | 12.0 | traitor clue, suspect Jakob (Standard and Long, engine clue slot) | DRAFT |
| `n4-earth-boxes.clue-andrei~vo-01` | narrator (Charon) | On the bottom of a box lid, an order slip: delivered by the burgomaster's own cart. Received by the son. | On the bottom of a box lid, an order slip: delivered by the burgomaster's own cart. Received by the son. | 12.0 | traitor clue, suspect Andrei | DRAFT |
| `n4-earth-boxes.clue-marta~vo-01` | narrator (Charon) | On the bottom of a box lid, an order slip: delivered by the little gate. Opened by M. | On the bottom of a box lid, an order slip: delivered by the little gate. Opened by M. | 11.2 | traitor clue, suspect Marta | DRAFT |
| `n4-earth-boxes.06~vo-01` | narrator (Charon) | Wherever he lies now, he lies uneasy. | Wherever he lies now, he lies uneasy. | 6.8 | end hook, all three boxes burned | DRAFT |

**On-screen labels:** none needed beyond the engine's standard screens.

**Totals:** 13 lines, est. 142.0 s (every line counted, including variants and events). Longest 14.4 s.
