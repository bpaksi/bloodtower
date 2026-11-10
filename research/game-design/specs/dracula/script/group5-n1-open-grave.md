# Dracula, Group 5 (3/15): `n1-open-grave` (rewrite)

**Status: DRAFT** (pending DEC-785 / OPEN RULING 6). Loremaster, 2026-11-10. Rewritten from main's `assets/stories/dracula/scripts/n1-open-grave.md` around the new plot: Lenka free (she joins at the Burgomaster's House), pool heroes, four chapters, nothing private, Short and Standard only, no Tomas. Lenka's face is never described, and the Count is unseen until his lair.

- **Where / kind:** K1 Sanctuary: the church and churchyard. Chapter 1, any time (Standard). Plain scene with a battle. Reward: the first clue, Oskar's letters (IDEA-083)
- **D-01 intent:** Oskar has risen and leaves his riddle in letters
- **D-02:** §8: Oskar's letters are a traitor clue source in Standard and Long. Each source has a line per suspect, picked by the engine's clue slot (MEC-052), not a `~` variant. §9: Agnes is asked at K1 Sanctuary (the collision rule may move her pick).
- **Painting (`painting.n1-open-grave`, Illusionist, one line):** A churchyard in mist at dusk, a fresh grave heaped outward in a ring, a split coffin lid. In the next row stands a figure in a priest's cassock black with earth, his face in shadow. Lantern light. The Count is not shown.

**Estimates:** 0.40 s per word + 4.0 s, fitted to the 13 Charon masters in C5-05 (`/workspace/c5-05-art/voice/MANIFEST.md`); expect about ±3 s. Cap 20 s (about 40 words). Captions = spoken text, word for word. A line whose speaker is not with the group is skipped (D-02 §10), and the narrator carries the plot without it. Ids: base `<scene>.NN~vo-01`, goal or lair `<scene>.NN~<value>.vo-01`, events `<scene>.<event>~vo-01`.

| Asset id | Speaker (voice) | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `n1-open-grave.01~vo-01` | narrator (Charon) | The soil around Father Oskar's grave is heaped outward, in a ring. Whatever left the coffin did not need a spade. | The soil around Father Oskar's grave is heaped outward, in a ring. Whatever left the coffin did not need a spade. | 12.4 | opening (kept from the original .01) | DRAFT |
| `n1-open-grave.02~vo-01` | wren (Erinome) (skipped if absent) | Dug from the inside. Fingers, not claws. He was a tidy man. He folded the shroud. | Dug from the inside. Fingers, not claws. He was a tidy man. He folded the shroud. | 10.4 | Wren, if with the group | DRAFT |
| `n1-open-grave.03~vo-01` | narrator (Charon) | In the vestry, letters in Oskar's hand, four lines in four margins, as if he knew he would not finish. | In the vestry, letters in Oskar's hand, four lines in four margins, as if he knew he would not finish. | 12.0 | the letters | DRAFT |
| `n1-open-grave.04~vo-01` | narrator (Charon) | He keeps the faith of the dead. He rests where the guard once stood. | He keeps the faith of the dead. He rests where the guard once stood. | 9.6 | the riddle (kept from the original inn .06; one line per lair); clip 1 of 2 (caption cap 120) | DRAFT |
| `n1-open-grave.04~vo-02` | narrator (Charon) | He lies beneath what was dug. He sleeps in the name of the first. | He lies beneath what was dug. He sleeps in the name of the first. | 9.6 | clip 2 of 2, plays right after n1-open-grave.04~vo-01 | DRAFT |
| `n1-open-grave.05~vo-01` | narrator (Charon) | Someone is standing in the next row of graves, in a priest's cassock gone black with earth. | Someone is standing in the next row of graves, in a priest's cassock gone black with earth. | 10.8 | Oskar risen | DRAFT |
| `n1-open-grave.06~vo-01` | oskar (Umbriel) | You came. I asked so many, and you are the ones who came. He will call her by another name. Don't let her answer. | You came. I asked so many, and you are the ones who came. He will call her by another name. Don't let her answer. | 13.6 | Oskar's warning (from the original .04 and .06) | DRAFT |
| `n1-open-grave.07~vo-01` | narrator (Charon) | The priest's gentle face splits into hunger, and he comes for the living. | The priest's gentle face splits into hunger, and he comes for the living. | 9.2 | into the battle (kept from the original .07) | DRAFT |
| `n1-open-grave.rest~vo-01` | narrator (Charon) | Oskar lies down in his own grave again, and this time he stays. Someone should say the words. | Oskar lies down in his own grave again, and this time he stays. Someone should say the words. | 11.2 | option Lay him to rest: the battle is won | DRAFT |
| `n1-open-grave.leave~vo-01` | narrator (Charon) | You hold the churchyard gate shut while it shakes, and bar it, and it costs you blood. Behind it, he is still standing. | You hold the churchyard gate shut while it shakes, and bar it, and it costs you blood. Behind it, he is still standing. | 13.2 | option Bar the gate: no battle; 2 hit points from the hero who bars it | DRAFT |
| `n1-open-grave.clue-jakob~vo-01` | narrator (Charon) | In the last letter, a line underscored twice: the bookkeeper knows every door in that castle. Ask him what he sold. | In the last letter, a line underscored twice: the bookkeeper knows every door in that castle. Ask him what he sold. | 12.4 | traitor clue, suspect Jakob (Standard and Long, engine clue slot) | DRAFT |
| `n1-open-grave.clue-andrei~vo-01` | narrator (Charon) | In the last letter, a line underscored twice: the son has been seen on the hill road after dark. Ask him why. | In the last letter, a line underscored twice: the son has been seen on the hill road after dark. Ask him why. | 12.8 | traitor clue, suspect Andrei | DRAFT |
| `n1-open-grave.clue-marta~vo-01` | narrator (Charon) | In the last letter, a line underscored twice: the girl who pours his wine still comes down to the village. For whom? | In the last letter, a line underscored twice: the girl who pours his wine still comes down to the village. For whom? | 12.8 | traitor clue, suspect Marta | DRAFT |
| `n1-open-grave.08~vo-01` | narrator (Charon) | Somewhere in the village the bell begins to ring, and nobody is pulling the rope. | Somewhere in the village the bell begins to ring, and nobody is pulling the rope. | 10.0 | end hook (kept from the original .09) | DRAFT |

**On-screen labels (DRAFT, not voiced):**

| Tag | Text | Effect / note |
|---|---|---|
| `n1-open-grave, option, rest` | Lay him to rest | the battle; Oskar's letters |
| `n1-open-grave, option, leave` | Bar the gate | no battle; 2 hit points from the hero who bars it (Gamewright 2026-11-10) |

**Totals:** 14 lines, est. 160.0 s (every line counted, including variants and events). Longest 13.6 s.
