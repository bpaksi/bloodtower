# Dracula, Group 5 (14/15): `n5-portrait-gallery` (rewrite)

**Status: DRAFT** (pending DEC-785 / OPEN RULING 6). Loremaster, 2026-11-10. Rewritten from main's `assets/stories/dracula/scripts/n5-portrait-gallery.md` around the new plot: Lenka free (she joins at the Burgomaster's House), pool heroes, four chapters, nothing private, Short and Standard only, no Tomas. Lenka's face is never described, and the Count is unseen until his lair.

- **Where / kind:** Castle, main level, room 2: the Portrait. A fixed trap with a choice of two losses (IDEA-094, DEC-851)
- **D-01 intent:** Four hundred years of one face; the portrait holds a hero
- **D-02:** §5: 'Look away' costs every hero 2 hit points; 'Cover the canvas' costs 1 potion (placeholder numbers, DEC-500). Locked canon: Ludmila's portrait stays covered.
- **Painting (`painting.n5-portrait-gallery`, Illusionist, one line):** A long candlelit gallery of portraits spanning four centuries, every one of the same lord, young and ageless. One painted lord leans out of his frame. At the far end, a single canvas stays under a cloth. The hunters are in silhouette.

**Estimates:** 0.40 s per word + 4.0 s, fitted to the 13 Charon masters in C5-05 (`/workspace/c5-05-art/voice/MANIFEST.md`); expect about ±3 s. Cap 20 s (about 40 words). Captions = spoken text, word for word. A line whose speaker is not with the group is skipped (D-02 §10), and the narrator carries the plot without it. Ids: base `<scene>.NN~vo-01`, goal or lair `<scene>.NN~<value>.vo-01`, events `<scene>.<event>~vo-01`.

| Asset id | Speaker (voice) | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `n5-portrait-gallery.01~vo-01` | narrator (Charon) | A long gallery of the house's portraits. The eyes follow you. That is ordinary. What is not ordinary is that some blink. | A long gallery of the house's portraits. The eyes follow you. That is ordinary. What is not ordinary is that some blink. | 12.8 | opening (kept from the original .01) | DRAFT |
| `n5-portrait-gallery.02~vo-01` | emeric (Fenrir) (skipped if absent) | Same face. Four hundred years of fashions, and the same face. That's not a family. That's a man. | Same face. Four hundred years of fashions, and the same face. That's not a family. That's a man. | 11.2 | Emeric, if with the group (kept from the original .02) | DRAFT |
| `n5-portrait-gallery.03~vo-01` | narrator (Charon) | One painted lord holds your eyes and will not let go. The longer you look, the harder it is to remember why you came. | One painted lord holds your eyes and will not let go. The longer you look, the harder it is to remember why you came. | 13.6 | the portrait holds a hero; into the trap choice | DRAFT |
| `n5-portrait-gallery.look-away~vo-01` | narrator (Charon) | You tear your eyes away, and it costs you. The painted lord smiles and lets you pass. | You tear your eyes away, and it costs you. The painted lord smiles and lets you pass. | 10.8 | option Look away: every hero loses 2 hit points | DRAFT |
| `n5-portrait-gallery.cover~vo-01` | narrator (Charon) | You throw a cloth over the frame. Under it, something knocks, once, and is still. | You throw a cloth over the frame. Under it, something knocks, once, and is still. | 10.0 | option Cover the canvas: 1 potion | DRAFT |
| `n5-portrait-gallery.04~vo-01` | narrator (Charon) | At the end of the gallery hangs one canvas under a cloth that has never been lifted. You leave it be. | At the end of the gallery hangs one canvas under a cloth that has never been lifted. You leave it be. | 12.4 | Ludmila's portrait stays covered | DRAFT |
| `n5-portrait-gallery.05~vo-01` | narrator (Charon) | The wall turns. A stair goes up into the dark. | The wall turns. A stair goes up into the dark. | 8.0 | end hook (from the original .07) | DRAFT |

**On-screen labels (DRAFT, not voiced):**

| Tag | Text | Effect / note |
|---|---|---|
| `n5-portrait-gallery, option, look-away` | Look away | every hero loses 2 hit points |
| `n5-portrait-gallery, option, cover` | Cover the canvas | 1 potion |
| `needs a potion` | Needs a potion | the disabled reason for Cover the canvas |

**Totals:** 7 lines, est. 78.8 s (every line counted, including variants and events). Longest 13.6 s.
