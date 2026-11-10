# Dracula, Group 5 (4/15): `n1-fortune-reading` (rewrite)

**Status: DRAFT** (pending DEC-785 / OPEN RULING 6). Loremaster, 2026-11-10. Rewritten from main's `assets/stories/dracula/scripts/n1-fortune-reading.md` around the new plot: Lenka free (she joins at the Burgomaster's House), pool heroes, four chapters, nothing private, Short and Standard only, no Tomas. Lenka's face is never described, and the Count is unseen until his lair.

- **Where / kind:** K1 Bazaar: Berta's wagon. Chapter 1, always last; it closes the chapter and seeds the game (IDEA-084)
- **D-01 intent:** Berta turns the cards: the sites, the lair, and one cryptic line per goal (`~<goal>` variants)
- **D-02:** §2: the reading reveals `blade-site`, `lantern-site` and `tome-site` (the board names each site and the players set the marker), gives the `lair` hint (`~<lair>`) and the `count-goal` line (`~<goal>`). §3: the Count's piece enters at the Tower when this scene ends (DEC-859). No building variants: the board names the sites, so the VO stays building-neutral.
- **Painting (`painting.n1-fortune-reading`, Illusionist, one line):** A painted wagon sunk in mud at the market's edge, candles inside, worn cards laid face up on a cloth. An old woman with a husky smile turns the last card. The hunters crowd in, in silhouette. Lenka, if shown, is turned away. `painting.n1-fortune-reading~<lair>` may show the lair card's picture.

**Estimates:** 0.40 s per word + 4.0 s, fitted to the 13 Charon masters in C5-05 (`/workspace/c5-05-art/voice/MANIFEST.md`); expect about ±3 s. Cap 20 s (about 40 words). Captions = spoken text, word for word. A line whose speaker is not with the group is skipped (D-02 §10), and the narrator carries the plot without it. Ids: base `<scene>.NN~vo-01`, goal or lair `<scene>.NN~<value>.vo-01`, events `<scene>.<event>~vo-01`.

| Asset id | Speaker (voice) | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `n1-fortune-reading.01~vo-01` | narrator (Charon) | Old Berta came into the valley before the mist, and could not leave after. She has read cards for every burgomaster. | Old Berta came into the valley before the mist, and could not leave after. She has read cards for every burgomaster. | 12.4 | opening (from the original .01; Vadoma renamed Berta) | DRAFT |
| `n1-fortune-reading.02~vo-01` | vadoma (Gacrux) | Sit down. I have been expecting you since spring. Cut the cards. He is listening. | Sit down. I have been expecting you since spring. Cut the cards. He is listening. | 10.0 | Berta (cast id vadoma) | DRAFT |
| `n1-fortune-reading.03~vo-01` | vadoma (Gacrux) | A sword that was a brother's. It still remembers the sun. Look for it where the board shows you. | A sword that was a brother's. It still remembers the sun. Look for it where the board shows you. | 11.6 | card 1: the blade; the board names the site | DRAFT |
| `n1-fortune-reading.04~vo-01` | vadoma (Gacrux) | A saint's light, carried out of a burning house and lost among the dead. It is waiting to be carried again. | A saint's light, carried out of a burning house and lost among the dead. It is waiting to be carried again. | 12.4 | card 2: the Lantern | DRAFT |
| `n1-fortune-reading.05~vo-01` | vadoma (Gacrux) | His own book, in his own hand. Do not open it until you hold the other two. | His own book, in his own hand. Do not open it until you hold the other two. | 10.8 | card 3: the Tome | DRAFT |
| `n1-fortune-reading.06~family-crypt.vo-01` | vadoma (Gacrux) | He waits below, among his fathers. Where the dead of his house are kept. | He waits below, among his fathers. Where the dead of his house are kept. | 9.6 | lair hint: family-crypt | DRAFT |
| `n1-fortune-reading.06~ludmilas-chapel.vo-01` | vadoma (Gacrux) | He waits where he prays, though he has nothing left to pray to. | He waits where he prays, though he has nothing left to pray to. | 9.2 | lair hint: ludmilas-chapel | DRAFT |
| `n1-fortune-reading.06~the-height.vo-01` | vadoma (Gacrux) | He waits high up, where the guard once stood watch over the valley. | He waits high up, where the guard once stood watch over the valley. | 9.2 | lair hint: the-height | DRAFT |
| `n1-fortune-reading.06~his-study.vo-01` | vadoma (Gacrux) | He waits among his letters, at the desk where he writes in that fine old hand. | He waits among his letters, at the desk where he writes in that fine old hand. | 10.4 | lair hint: his-study | DRAFT |
| `n1-fortune-reading.07~replace-a-hero.vo-01` | vadoma (Gacrux) | He wants a seat at your table. Count the chairs. | He wants a seat at your table. Count the chairs. | 8.0 | goal line: replace-a-hero (kept from the original obj2) | DRAFT |
| `n1-fortune-reading.07~win-lenka.vo-01` | vadoma (Gacrux) | He wants her to open the last door herself. | He wants her to open the last door herself. | 7.6 | goal line: win-lenka (from the original obj1) | DRAFT |
| `n1-fortune-reading.07~destroy-the-blade.vo-01` | vadoma (Gacrux) | He wants a brother's grief buried again. | He wants a brother's grief buried again. | 6.8 | goal line: destroy-the-blade (kept from the original obj3) | DRAFT |
| `n1-fortune-reading.07~darkness.vo-01` | vadoma (Gacrux) | He wants the whole valley on its knees. | He wants the whole valley on its knees. | 7.2 | goal line: darkness (kept from the original obj4) | DRAFT |
| `n1-fortune-reading.08~vo-01` | emeric (Fenrir) (skipped if absent) | Is that a metaphor? Please tell me that's a metaphor. | Is that a metaphor? Please tell me that's a metaphor. | 8.0 | Emeric, if with the group | DRAFT |
| `n1-fortune-reading.09~vo-01` | vadoma (Gacrux) | Everything is a metaphor, little scholar, until it bites you. | Everything is a metaphor, little scholar, until it bites you. | 8.0 | kept from the original .10 | DRAFT |
| `n1-fortune-reading.10~vo-01` | narrator (Charon) | The sun comes up grey and warms nothing. On the hill, a door opens. He is walking now. | The sun comes up grey and warms nothing. On the hill, a door opens. He is walking now. | 11.2 | end hook: the Count enters the board (replaces 'Five nights. No more will be given.') | DRAFT |

**On-screen labels:** none needed beyond the engine's standard screens.

**Totals:** 16 lines, est. 152.4 s (every line counted, including variants and events). Longest 12.4 s.
