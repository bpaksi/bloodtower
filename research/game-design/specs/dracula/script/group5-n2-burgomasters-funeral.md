# Dracula, Group 5 (7/15): `n2-burgomasters-funeral` (rewrite)

**Status: DRAFT** (pending DEC-785 / OPEN RULING 6). Loremaster, 2026-11-10. Rewritten from main's `assets/stories/dracula/scripts/n2-burgomasters-funeral.md` around the new plot: Lenka free (she joins at the Burgomaster's House), pool heroes, four chapters, nothing private, Short and Standard only, no Tomas. Lenka's face is never described, and the Count is unseen until his lair.

- **Where / kind:** Kingdom A Sanctuary: the wake. Chapter 2 (Standard). Plain scene with a battle. Reward: the lid choice (IDEA-087, DEC-781). Nailing gives the nail, a Ward source, which replaces the old holy water (Gamewright 2026-11-10)
- **D-01 intent:** Dorka rises at her own wake; the lid choice; a new reason she goes up the hill
- **D-02:** Gamewright 2026-11-10: the nail is a Ward source and counts once against the Count's strikes. Lenka's loyalty rises a step automatically when the funeral ends with her present, with no choice, marked by `lenka-stays`. §9: Wren's loyalty drops if the lid is watched, not nailed.
- **Painting (`painting.n2-burgomasters-funeral`, Illusionist, one line):** A candlelit village church at a wake: a burgomaster's coffin on trestles and a second, open coffin holding a girl in a wedding dress. Every candle leans toward it. Mourners on benches, faces turned away. No Lenka face. The Count is not shown.

**Estimates:** 0.40 s per word + 4.0 s, fitted to the 13 Charon masters in C5-05 (`/workspace/c5-05-art/voice/MANIFEST.md`); expect about ±3 s. Cap 20 s (about 40 words). Captions = spoken text, word for word. A line whose speaker is not with the group is skipped (D-02 §10), and the narrator carries the plot without it. Ids: base `<scene>.NN~vo-01`, goal or lair `<scene>.NN~<value>.vo-01`, events `<scene>.<event>~vo-01`.

| Asset id | Speaker (voice) | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `n2-burgomasters-funeral.01~vo-01` | narrator (Charon) | Vellmoor buries its burgomaster without a priest. Hanne reads the words, badly, from Oskar's book. | Vellmoor buries its burgomaster without a priest. Hanne reads the words, badly, from Oskar's book. | 10.0 | opening (from the original .01) | DRAFT |
| `n2-burgomasters-funeral.02~vo-01` | narrator (Charon) | Beside Anton lies a second coffin. Dorka Halasz, nineteen, in her wedding dress. | Beside Anton lies a second coffin. Dorka Halasz, nineteen, in her wedding dress. | 9.2 | Dorka (from the original .01); clip 1 of 2 (caption cap 120) | DRAFT |
| `n2-burgomasters-funeral.02~vo-02` | narrator (Charon) | Her mother said she had waited long enough. | Her mother said she had waited long enough. | 7.2 | clip 2 of 2, plays right after n2-burgomasters-funeral.02~vo-01 | DRAFT |
| `n2-burgomasters-funeral.03~vo-01` | narrator (Charon) | She went up the hill alone, the week before you came. She meant to offer herself, if he would leave her friend alone. | She went up the hill alone, the week before you came. She meant to offer herself, if he would leave her friend alone. | 13.2 | the new reason she went up the hill | DRAFT |
| `n2-burgomasters-funeral.04~vo-01` | lenka (Leda) (skipped if absent) | She never told me. She just went. He found me on the church step, and now I'm putting him in the ground beside it. | She never told me. She just went. He found me on the church step, and now I'm putting him in the ground beside it. | 13.6 | Lenka, if with the group | DRAFT |
| `n2-burgomasters-funeral.05~vo-01` | narrator (Charon) | The lid of the second coffin is not nailed. Every candle in the church leans toward it. | The lid of the second coffin is not nailed. Every candle in the church leans toward it. | 10.8 | into the lid choice (from the original lid-choice) | DRAFT |
| `n2-burgomasters-funeral.nailed~vo-01` | narrator (Charon) | The hammer is very loud in the little church. Her mother does not scream. She just stops breathing for a while. | The hammer is very loud in the little church. Her mother does not scream. She just stops breathing for a while. | 12.4 | option Nail the lid (kept from the original) | DRAFT |
| `n2-burgomasters-funeral.nailed-after~vo-01` | narrator (Charon) | Under the nails, something knocks, once, and then is still. | Under the nails, something knocks, once, and then is still. | 8.0 | after Nail the lid: no battle; the nail (a Ward source, counts once); clip 1 of 2 (caption cap 120) | DRAFT |
| `n2-burgomasters-funeral.nailed-after~vo-02` | narrator (Charon) | Her mother pulls one bent nail from the lid and presses it into your hand. Keep it. It held her. | Her mother pulls one bent nail from the lid and presses it into your hand. Keep it. It held her. | 12.0 | clip 2 of 2, plays right after n2-burgomasters-funeral.nailed-after~vo-01 | DRAFT |
| `n2-burgomasters-funeral.watched~vo-01` | narrator (Charon) | You wait, to be sure. Nobody looks away from the coffin, so nobody sees the candles go out along the back wall. | You wait, to be sure. Nobody looks away from the coffin, so nobody sees the candles go out along the back wall. | 12.8 | option Watch and wait (kept from the original) | DRAFT |
| `n2-burgomasters-funeral.06~vo-01` | narrator (Charon) | Then Dorka Halasz sits up in her wedding dress, and it is the sweetest smile anyone in the room has ever seen. | Then Dorka Halasz sits up in her wedding dress, and it is the sweetest smile anyone in the room has ever seen. | 12.8 | Watch and wait only: Dorka rises (kept from the original .04) | DRAFT |
| `n2-burgomasters-funeral.07~vo-01` | dorka (Laomedeia) | Come to me. Leave these others and come to me. He's so kind. He's so patient. He'll wait for her as long as it takes. | Come to me. Leave these others and come to me. He's so kind. He's so patient. He'll wait for her as long as it takes. | 14.0 | adapted from Stoker (Lucy); the battle starts | DRAFT |
| `n2-burgomasters-funeral.won~vo-01` | narrator (Charon) | When it is done, Dorka is only a girl in a wedding dress again, with a peace on her face she did not have a minute ago. | When it is done, Dorka is only a girl in a wedding dress again, with a peace on her face she did not have a minute ago. | 14.8 | the battle is won (kept from the original .07) | DRAFT |
| `n2-burgomasters-funeral.lenka-stays~vo-01` | lenka (Leda) (skipped if absent) | You stayed to the end. Not everyone stays, for me. | You stayed to the end. Not everyone stays, for me. | 8.0 | event at the funeral's end, only if Lenka is present: her loyalty +1 automatically (no choice) | DRAFT |
| `n2-burgomasters-funeral.08~vo-01` | narrator (Charon) | They bury Anton Morosz at dawn, properly. On the lid, someone has left a pressed violet. No one saw who. | They bury Anton Morosz at dawn, properly. On the lid, someone has left a pressed violet. No one saw who. | 12.0 | end hook (kept from the original .10) | DRAFT |

**On-screen labels (DRAFT, not voiced):**

| Tag | Text | Effect / note |
|---|---|---|
| `n2-burgomasters-funeral, option, nail` | Nail the lid | no battle; the nail, a Ward that counts once against his strike |
| `n2-burgomasters-funeral, option, watch` | Watch and wait | the battle; Wren's loyalty -1 |

**Totals:** 15 lines, est. 170.8 s (every line counted, including variants and events). Longest 14.8 s.
