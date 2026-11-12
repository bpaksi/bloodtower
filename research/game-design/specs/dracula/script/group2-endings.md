# Dracula, Group 2: endings

**Status: DRAFT** (every line pending DEC-785 / OPEN RULING 6). Loremaster, 2026-11-10. Source: D-01 "Win and loss" and "Finale and endings", main's `assets/stories/dracula/scripts/n5-ending-rescued.md`, and the Ruined Keep endings in `research/stories/ruined-keep/script.md`.

**Flow (as The Ruined Keep, C3-16/C3-17):** the boss falls (or the loss fires), then the ending's scene beats on the Story board, then the ending painting with its one Loremaster line (always the last numbered line of the ending), then the outcome and stats screens.

**Ids (Gamewright, 2026-11-10):** every ending line, beats and painting line alike, is `finale-win.<ending>.NN~vo-01` or `finale-loss.<ending>.NN~vo-01`, with scene beats first and the painting line last. A variant is `<scene>.NN~<value>.vo-NN` (one `~` per id, DEC-856), e.g. `finale-win.rescued.02~freed.vo-01`, chosen by `lenka.saved_by = lantern` (D-02 G-5). The losses drop the `n5-` prefix, since they can fire in any chapter. Everything is spoken to the whole table. Nothing is private.

**Speakers:** `narrator` (Charon, "slow, low, ominous storyteller") unless marked otherwise. Endings are narrator-led, with at most one companion line each (Gamewright). One line, `finale-win.rescued.04`, is Lenka (`lenka`, Leda, "young, earnest, stubborn"). The pool companions may be absent, so none of them speaks in an ending and no `~no-<companion>` variants are needed.

**Canon checks:** Lenka's face is shown (travelling hood, braid, mourning dress, Anton's ring; after the Tome, the violet mark — see lenka-look.md). The Count is shown only fallen, as dust in the lair. In the losses he is unseen. No ending implies a lost quest object (Gamewright: strikes take gold, health or buildings only). The retired `n5-ending-endures` and `n5-ending-taken` are not reused. The Turned loss is added as `finale-loss.turned` (D-02 G-4), rewritten from main's `n5-ending-turned.md` with no per-hunter lines.

**Estimates:** 0.40 s per word + 4.0 s, fitted to the 13 Charon masters in C5-05 (`/workspace/c5-05-art/voice/MANIFEST.md`); expect about ±3 s. Cap 20 s (about 40 words). Captions = spoken text, word for word.

## `finale-win.rescued` (rewrite of main's n5-ending-rescued.md; was scene id n5-ending-rescued)

- **D-01 beat:** `n5-ending-rescued`: The win with Lenka free: he falls, the fog lifts
- **Trigger:** Win, Lenka free: the Count falls in the lair, and Lenka is with the hunters, or the Lantern is held there and frees her (MEC-076; DEC-746, DEC-750).
- **Painting (Illusionist, one line):** Dawn through a high castle window. Sun falls on a drift of dust shaped like a kneeling man. Lenka stands among the hunters, her face clear (dark braid, mourning dress, a cord at her neck, the violet mark of the reveal). The hunters are in silhouette. Two faint figures fade into the light, their backs to us: a man with a sword and a woman with violets. Mist drains out of the valley below.

| Asset id | Speaker | Spoken text | Caption | Est. s | When | Intent (D-01) | Status |
|---|---|---|---|---|---|---|---|
| `finale-win.rescued.01~vo-01` | narrator | He falls in his own house. What is left of him is dust, and for a moment the dust keeps a shape, kneeling. | He falls in his own house. What is left of him is dust, and for a moment the dust keeps a shape, kneeling. | 13.2 | base | finale-win.rescued | DRAFT |
| `finale-win.rescued.02~vo-01` | narrator | Lenka stands with you, Anton's ring on its cord at her throat. | Lenka stands with you, Anton's ring on its cord at her throat. | 8.8 | Lenka was with the hunters; clip 1 of 2 (caption cap 120) | finale-win.rescued | DRAFT |
| `finale-win.rescued.02~vo-02` | narrator | She does not look at the dust. She looks at the window, and the morning. | She does not look at the dust. She looks at the window, and the morning. | 10.0 | clip 2 of 2, plays right after finale-win.rescued.02~vo-01 | finale-win.rescued | DRAFT |
| `finale-win.rescued.02~freed.vo-01` | narrator | The Lantern's light finds Lenka where he kept her. The cold leaves her hands. She crosses the room to you on her own. | The Lantern's light finds Lenka where he kept her. The cold leaves her hands. She crosses the room to you on her own. | 13.2 | replaces .02 when Lenka was taken and the Lantern freed her | finale-win.rescued | DRAFT |
| `finale-win.rescued.03~vo-01` | narrator | In the light stand two shapes, not quite there. | In the light stand two shapes, not quite there. | 7.6 | base; clip 1 of 2 (caption cap 120) | finale-win.rescued | DRAFT |
| `finale-win.rescued.03~vo-02` | narrator | A young man with a sword like the one you carry. A woman holding violets. Then they are gone. | A young man with a sword like the one you carry. A woman holding violets. Then they are gone. | 11.6 | clip 2 of 2, plays right after finale-win.rescued.03~vo-01 | finale-win.rescued | DRAFT |
| `finale-win.rescued.04~vo-01` | lenka | She told him no. So did I. Take me home. | She told him no. So did I. Take me home. | 8.0 | base (Lenka, voice Leda; not Charon) | finale-win.rescued | DRAFT |
| `finale-win.rescued.05~vo-01` | narrator | Down in the valley, doors open. People stand in the street and look up at a sky they have not seen since spring. | Down in the valley, doors open. People stand in the street and look up at a sky they have not seen since spring. | 13.2 | base | finale-win.rescued | DRAFT |
| `finale-win.rescued.06~vo-01` | narrator | The mist lifts off Vellmoor. The road out is there again, and nobody takes it today. | The mist lifts off Vellmoor. The road out is there again, and nobody takes it today. | 10.4 | Ending line, over the painting | finale-win.rescued | DRAFT |

## `finale-win.lenka-lost` (new; D-01 scene id n5-ending-lenka-lost)

- **D-01 beat:** `n5-ending-lenka-lost`: The win with her lost: he falls, and she does not come back
- **Trigger:** Win, Lenka lost: the Count falls, but Lenka was taken and the Lantern is not in the last room (MEC-076; DEC-746). Losing her is never a loss.
- **Painting (Illusionist, one line):** An empty stone room in morning light. A tall window stands open onto thinning mist over the valley. On the sill are a signet ring on a cord and one pressed violet. No figures.

| Asset id | Speaker | Spoken text | Caption | Est. s | When | Intent (D-01) | Status |
|---|---|---|---|---|---|---|---|
| `finale-win.lenka-lost.01~vo-01` | narrator | He falls in his own house. What is left of him is dust. The castle goes quiet around you, all at once. | He falls in his own house. What is left of him is dust. The castle goes quiet around you, all at once. | 12.8 | base | finale-win.lenka-lost | DRAFT |
| `finale-win.lenka-lost.02~vo-01` | narrator | You search for Lenka until the candles burn down. Every door opens for you now. Every room is empty. | You search for Lenka until the candles burn down. Every door opens for you now. Every room is empty. | 11.6 | base | finale-win.lenka-lost | DRAFT |
| `finale-win.lenka-lost.03~vo-01` | narrator | In the room where he kept her, the window stands open. On the sill lie Anton's ring on its cord, and one pressed violet. | In the room where he kept her, the window stands open. On the sill lie Anton's ring on its cord, and one pressed violet. | 13.6 | base | finale-win.lenka-lost | DRAFT |
| `finale-win.lenka-lost.04~vo-01` | narrator | Below, the mist pulls back off the roads. The valley is free. Whether she is, no one can say. | Below, the mist pulls back off the roads. The valley is free. Whether she is, no one can say. | 11.6 | base | finale-win.lenka-lost | DRAFT |
| `finale-win.lenka-lost.05~vo-01` | narrator | He is gone, and the sun comes back to Vellmoor. You came for the burgomaster's daughter. You go home with his ring. | He is gone, and the sun comes back to Vellmoor. You came for the burgomaster's daughter. You go home with his ring. | 12.8 | Ending line, over the painting | finale-win.lenka-lost | DRAFT |

## `finale-loss.valley-falls` (new; D-01 scene id n5-ending-valley-falls)

- **D-01 beat:** `n5-ending-valley-falls`: The last villager turns; the valley is his
- **Trigger:** Loss, The Valley Falls: the last skull drops and the supply is empty (DEC-686). Can happen in any chapter.
- **Painting (Illusionist, one line):** Night. A long line of villagers with lanterns climbs a mist-filled road toward a castle with every window lit. They are seen from behind, with no faces. The Count is not shown.

| Asset id | Speaker | Spoken text | Caption | Est. s | When | Intent (D-01) | Status |
|---|---|---|---|---|---|---|---|
| `finale-loss.valley-falls.01~vo-01` | narrator | In every parish the doors stand open, and no one stands in them. The bells have stopped. | In every parish the doors stand open, and no one stands in them. The bells have stopped. | 10.8 | base | finale-loss.valley-falls | DRAFT |
| `finale-loss.valley-falls.02~vo-01` | narrator | The people of Vellmoor walk up the hill through the mist, quiet, in their best clothes. None of them looks back. | The people of Vellmoor walk up the hill through the mist, quiet, in their best clothes. None of them looks back. | 12.4 | base | finale-loss.valley-falls | DRAFT |
| `finale-loss.valley-falls.03~vo-01` | narrator | At the castle, every window is lit. Somewhere above, someone is playing the organ. | At the castle, every window is lit. Somewhere above, someone is playing the organ. | 9.6 | base | finale-loss.valley-falls | DRAFT |
| `finale-loss.valley-falls.04~vo-01` | narrator | The last skull falls. The mist closes over Vellmoor, and the valley is his for good. | The last skull falls. The mist closes over Vellmoor, and the valley is his for good. | 10.4 | Ending line, over the painting | finale-loss.valley-falls | DRAFT |

## `finale-loss.turned` (rewrite of main's n5-ending-turned.md (D-02 G-4))

- **D-01 beat:** `n5-ending-turned`: A hunter takes the third bite and turns (any chapter)
- **Trigger:** Loss, Turned: a hero takes a third bite (MEC-013, D-DRA-5). Can happen in any chapter. No strike alone can cause it (DEC-775).
- **Painting (Illusionist, one line):** Dusk. One hunter in silhouette walks up a misty road toward the lit castle, seen from behind. The rest stand at the road's edge with their lanterns lowered. No faces. The Count is not shown.

| Asset id | Speaker | Spoken text | Caption | Est. s | When | Intent (D-01) | Status |
|---|---|---|---|---|---|---|---|
| `finale-loss.turned.01~vo-01` | narrator | The third bite is not the worst one. It is only the last. Somewhere a heartbeat stops, and another starts, slower. | The third bite is not the worst one. It is only the last. Somewhere a heartbeat stops, and another starts, slower. | 12.4 | base | finale-loss.turned | DRAFT |
| `finale-loss.turned.02~vo-01` | narrator | A hunter goes very still. Then they turn, and walk out into the mist, toward the hill. | A hunter goes very still. Then they turn, and walk out into the mist, toward the hill. | 10.8 | base | finale-loss.turned | DRAFT |
| `finale-loss.turned.03~vo-01` | narrator | Nobody calls after them. On the hill, one more window is lit. | Nobody calls after them. On the hill, one more window is lit. | 8.8 | base | finale-loss.turned | DRAFT |
| `finale-loss.turned.04~vo-01` | narrator | A hunter is his now. The hunt is over, and the mist stays down. | A hunter is his now. The hunt is over, and the mist stays down. | 9.6 | Ending line, over the painting | finale-loss.turned | DRAFT |

## `finale-loss.houses-fall` (new; its own ending scene (Gamewright, 2026-11-10); D-01 scene id n5-ending-houses-fall)

- **D-01 beat:** `n5-ending-houses-fall`: Four houses have fallen to him
- **Trigger:** Loss, The Houses Fall: the fourth building falls (Q-C3-05 engine rule). Its own scene, per Gamewright (D-02 assumes OPEN RULING 4 = A).
- **Painting (Illusionist, one line):** Vellmoor's square at night. Four buildings have their shutters thrown open and dark windows, with blackened garlic on the sills. Mist pours out through the open doorways. No figures. The Count is not shown, not even as a shadow.

| Asset id | Speaker | Spoken text | Caption | Est. s | When | Intent (D-01) | Status |
|---|---|---|---|---|---|---|---|
| `finale-loss.houses-fall.01~vo-01` | narrator | The fourth house falls. Its shutters hang open, and the garlic on its sills has gone black. | The fourth house falls. Its shutters hang open, and the garlic on its sills has gone black. | 10.8 | base | finale-loss.houses-fall | DRAFT |
| `finale-loss.houses-fall.02~vo-01` | narrator | There is no door left in Vellmoor that will hold. From now on, someone is asked in, and goes. | There is no door left in Vellmoor that will hold. From now on, someone is asked in, and goes. | 11.6 | base | finale-loss.houses-fall | DRAFT |
| `finale-loss.houses-fall.03~vo-01` | narrator | Four houses have fallen. There is nowhere left to shut a door, and he walks in where he likes. | Four houses have fallen. There is nowhere left to shut a door, and he walks in where he likes. | 11.6 | Ending line, over the painting | finale-loss.houses-fall | DRAFT |

**Totals:** 25 lines (24 Charon, 1 Lenka; one of the 25 is the `~freed` variant). Est. 277.2 s all. Longest line 13.6 s. Per ending as played (base path): finale-win.rescued 82.8 s, finale-win.lenka-lost 62.4 s, finale-loss.valley-falls 43.2 s, finale-loss.turned 41.6 s, finale-loss.houses-fall 34.0 s.

## Ruined Keep mirrors

- `finale-loss.valley-falls` mirrors "The last skull falls. The Tower's shadow covers the land, and the roads are his for good."
- `finale-loss.houses-fall` mirrors "Four strongholds have fallen. There is nowhere left to hold, and his raiders own the land."
- `finale-loss.turned` mirrors "One of you hears the Tower call, and goes to it. Without them, the hunt is over." It drops "hears": the turned hunter is a pool hero, so no name and no single-hunter perception.

## Open questions

**Gamewright:** answered on 2026-11-10 (ids, order, variant form, one Lenka line, no `n5-` on the losses). One is still open: does the engine know at the ending whether Lenka was with the hunters (`.02`) or freed by the Lantern (`.02~freed`)?

**Bob:** none. Lenka-lost stays uncertain (confirmed 2026-11-10).
