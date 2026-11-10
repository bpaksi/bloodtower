# Dracula, Group 5 (1/15): `n1-lantern-and-bell` (rewrite)

**Status: DRAFT** (pending DEC-785 / OPEN RULING 6). Loremaster, 2026-11-10. Rewritten from main's `assets/stories/dracula/scripts/n1-lantern-and-bell.md` around the new plot: Lenka free (she joins at the Burgomaster's House), pool heroes, four chapters, nothing private, Short and Standard only, no Tomas. Lenka's face is never described, and the Count is unseen until his lair.

- **Where / kind:** K1 Village: the Lantern and Bell inn. Chapter 1, first quest (plain scene)
- **D-01 intent:** The inn's fear; the four old hunters named as people who can be found
- **D-02:** §9: story companions are asked at their buildings for 0 gold and 1 move: Agnes at K1 Sanctuary, Emeric at K1 Bazaar, Tomas at kingdom A Citadel, Wren at kingdom B Village (each offered once its kingdom opens).
- **Painting (`painting.n1-lantern-and-bell`, Illusionist, one line):** A low-beamed inn at the crossroads, fire roaring, garlic strung over every window. A wry innkeeper with a cleaver in her apron leans over a letter on the table. The hunters are in silhouette. Mist presses at the panes. The Count is not shown.

**Estimates:** 0.40 s per word + 4.0 s, fitted to the 13 Charon masters in C5-05 (`/workspace/c5-05-art/voice/MANIFEST.md`); expect about ±3 s. Cap 20 s (about 40 words). Captions = spoken text, word for word. A line whose speaker is not with the group is skipped (D-02 §10), and the narrator carries the plot without it. Ids: base `<scene>.NN~vo-01`, goal or lair `<scene>.NN~<value>.vo-01`, events `<scene>.<event>~vo-01`.

| Asset id | Speaker (voice) | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `n1-lantern-and-bell.01~vo-01` | narrator (Charon) | The Lantern and Bell is the only inn at the crossroads. Low beams, a roaring fire, garlic over every window. | The Lantern and Bell is the only inn at the crossroads. Low beams, a roaring fire, garlic over every window. | 12.0 | opening | DRAFT |
| `n1-lantern-and-bell.02~vo-01` | hanne (Sulafat) | Sit by the fire, loves. Nobody comes to Vellmoor this late in the year on purpose. | Sit by the fire, loves. Nobody comes to Vellmoor this late in the year on purpose. | 10.4 | Hanne greets the table | DRAFT |
| `n1-lantern-and-bell.03~vo-01` | narrator (Charon) | You lay the letter on the table. Hanne reads the name, and her face goes still. | You lay the letter on the table. Hanne reads the name, and her face goes still. | 10.4 | the letter | DRAFT |
| `n1-lantern-and-bell.04~vo-01` | hanne (Sulafat) | That's not Anton's hand. Anton wrote like a clerk. And Anton Morosz died at dusk, at his daughter's door. | That's not Anton's hand. Anton wrote like a clerk. And Anton Morosz died at dusk, at his daughter's door. | 11.6 | the writer is dead (kept from the original .08) | DRAFT |
| `n1-lantern-and-bell.05~vo-01` | hanne (Sulafat) | There were others like you, once. Sister Agnes keeps the church. | There were others like you, once. Sister Agnes keeps the church. | 8.4 | the old hunters named as people who can be found (Tomas left out: see questions); clip 1 of 2 (caption cap 120) | DRAFT |
| `n1-lantern-and-bell.05~vo-02` | hanne (Sulafat) | The apothecary's boy, Emeric, haunts the market. Wren Kessel digs graves over the hill. | The apothecary's boy, Emeric, haunts the market. Wren Kessel digs graves over the hill. | 9.6 | clip 2 of 2, plays right after n1-lantern-and-bell.05~vo-01 | DRAFT |
| `n1-lantern-and-bell.06~vo-01` | hanne (Sulafat) | Find them, if you mean to stay. And you will stay. Nobody leaves Vellmoor now. Not since spring. | Find them, if you mean to stay. And you will stay. Nobody leaves Vellmoor now. Not since spring. | 11.2 | kept from the original .07 | DRAFT |
| `n1-lantern-and-bell.07~vo-01` | hanne (Sulafat) | Go up the hill to the burgomaster's house. His girl is still there. For now. | Go up the hill to the burgomaster's house. His girl is still there. For now. | 10.0 | end hook: points at n1-burgomasters-house | DRAFT |

**On-screen labels:** none needed beyond the engine's standard screens.

**Totals:** 8 lines, est. 83.6 s (every line counted, including variants and events). Longest 12.0 s.
