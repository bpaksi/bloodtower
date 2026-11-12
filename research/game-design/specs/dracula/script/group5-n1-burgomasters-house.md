# Dracula, Group 5 (2/15): `n1-burgomasters-house` (rewrite)

**Status: DRAFT** (pending DEC-785 / OPEN RULING 6). Loremaster, 2026-11-10. Rewritten from main's `assets/stories/dracula/scripts/n1-burgomasters-house.md` around the new plot: Lenka free (she joins at the Burgomaster's House), pool heroes, four chapters, nothing private, Short and Standard only, no Tomas. Lenka's face is shown from chapter 1 (travelling hood, face clear; the Tome changes it — see lenka-look.md). The Count is unseen until his lair.

- **Where / kind:** K1 Citadel: the burgomaster's house. Chapter 1, second quest (plain scene). Reward: Lenka joins as a companion (IDEA-081)
- **D-01 intent:** The writer is dead; Andrei asks you to keep his sister; Lenka chooses to come
- **D-02:** §4: Lenka joins here as a quest reward (DEC-065). The group picks her hero on the iPads, one button per present hero. She starts steady. Andrei is a traitor suspect in Standard and Long (DEC-854).
- **Painting (`painting.n1-burgomasters-house`, Illusionist, one line):** A tall stone house with black crepe on the door. On the stair, a tired young man in shirtsleeves. Lenka stands above him, face clear under a travelling hood: about nineteen, dark braid, mourning dress, a seal ring on a cord. A pressed violet lies on the sill of an open window that looks toward the castle.

**Estimates:** 0.40 s per word + 4.0 s, fitted to the 13 Charon masters in C5-05 (`/workspace/c5-05-art/voice/MANIFEST.md`); expect about ±3 s. Cap 20 s (about 40 words). Captions = spoken text, word for word. A line whose speaker is not with the group is skipped (D-02 §10), and the narrator carries the plot without it. Ids: base `<scene>.NN~vo-01`, goal or lair `<scene>.NN~<value>.vo-01`, events `<scene>.<event>~vo-01`.

| Asset id | Speaker (voice) | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `n1-burgomasters-house.01~vo-01` | narrator (Charon) | A tall stone house on the hill road, black crepe on the door. Anton Morosz kept the valley's ledgers for thirty years. | A tall stone house on the hill road, black crepe on the door. Anton Morosz kept the valley's ledgers for thirty years. | 12.8 | opening (from the original .01) | DRAFT |
| `n1-burgomasters-house.02~vo-01` | narrator (Charon) | He found his daughter on the church step as a baby. When the mist came, he stood at her door with a poker, and stayed. | He found his daughter on the church step as a baby. When the mist came, he stood at her door with a poker, and stayed. | 14.0 | Anton's death | DRAFT |
| `n1-burgomasters-house.03~vo-01` | anton (Iapetus, processed, remembered) | You will not have her. Not while I'm in this house. | You will not have her. Not while I'm in this house. | 8.4 | Anton, remembered (the maid's account; kept from the original .06) | DRAFT |
| `n1-burgomasters-house.04~vo-01` | narrator (Charon) | His son Andrei meets you on the stair, still in his shirtsleeves. He has not slept. | His son Andrei meets you on the stair, still in his shirtsleeves. He has not slept. | 10.4 | Andrei | DRAFT |
| `n1-burgomasters-house.05~vo-01` | andrei (NEW: no cast voice yet; proposed Orus, 'young, tired, earnest') | Father wrote no letter. But you came, so stay. Keep my sister. I can't, not against that. | Father wrote no letter. But you came, so stay. Keep my sister. I can't, not against that. | 10.8 | Andrei asks you to keep his sister | DRAFT |
| `n1-burgomasters-house.06~vo-01` | narrator (Charon) | On the sill of her room, a pressed mountain violet. Mountain violets do not grow in the valley. | On the sill of her room, a pressed mountain violet. Mountain violets do not grow in the valley. | 11.2 | the violet (kept from the original .08) | DRAFT |
| `n1-burgomasters-house.07~vo-01` | narrator (Charon) | On her dresser, a letter on cream paper, in the same old hand as yours. Come home, it says. You have been away so long. | On her dresser, a letter on cream paper, in the same old hand as yours. Come home, it says. You have been away so long. | 14.0 | the come-home letter (same hand as the opening's letter) | DRAFT |
| `n1-burgomasters-house.08~vo-01` | narrator (Charon) | Lenka comes down in her travelling hood and mourning black, her father's seal ring on a cord at her neck. | Lenka comes down in her travelling hood and mourning black, her father's seal ring on a cord at her neck. | 12.0 | Lenka arrives; travelling hood, face clear | DRAFT |
| `n1-burgomasters-house.09~vo-01` | lenka (Leda) (skipped if absent) | He has written to me since spring. I burned every letter. They kept coming. I won't sit in this house and wait for him. | He has written to me since spring. I burned every letter. They kept coming. I won't sit in this house and wait for him. | 13.6 | Lenka chooses | DRAFT |
| `n1-burgomasters-house.10~vo-01` | lenka (Leda) (skipped if absent) | I'm coming with you. Choose which of you I walk beside. | I'm coming with you. Choose which of you I walk beside. | 8.4 | into the companion pick | DRAFT |
| `n1-burgomasters-house.11~vo-01` | narrator (Charon) | Outside, the light is going. On the road below, the wolves have begun to gather. | Outside, the light is going. On the road below, the wolves have begun to gather. | 10.0 | end hook: points at n1-long-night | DRAFT |

**On-screen labels (DRAFT, not voiced):**

| Tag | Text | Effect / note |
|---|---|---|
| `n1-burgomasters-house, lenka pick, prompt` | Who keeps Lenka close? | the screen prompt over one button per present hero (the button text is the hero's name) |

**Totals:** 11 lines, est. 125.6 s (every line counted, including variants and events). Longest 14.0 s.
