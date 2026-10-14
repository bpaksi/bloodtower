# n1-burgomasters-house

- **Scene ID:** n1-burgomasters-house
- **Night:** 1 (late afternoon to first dusk), set piece 2
- **Kingdom slot / building:** K1 / Citadel: the burgomaster's house
- **Setting:** A tall stone house on the hill road, black crepe on the door. Anton Morosz lies in the parlour where he fell, a poker still in his hand. Upstairs, his daughter's room: the window wide, the bed empty, pressed flowers between the pages of every book.
- **Mood:** Grief, a crime scene, the first sight of what he wants.
- **Cast:** Narrator, Sister Agnes Hallow, Tomas Varga, Wren Kessel, Emeric Lutz, Anton Morosz (dying words, remembered by the maid in a still; voiced)
- **Targets:** untagged moments, lines and cues play on `dashboard` (Mac screen and speakers; tower cues fire from the Mac). Moments tagged `ipad:<hunter>` play only on that hunter's iPad, never on the dashboard. Variant moments (`scene.moment~variant`) replace the base moment of the same number when their condition holds.
- **Story state (D-DRA-10):** Lenka Morosz was taken by the Count the night before play begins. The hunters win by rescuing her in the final confrontation; there is no mid-game snatch.

## Moments

**n1-burgomasters-house.01** [clip]
[music: solo violin] [sfx: slow heartbeat, faint] [tower: seal-sequence] (lights only, no seal broken)
> **Narrator:** Anton Morosz kept the valley's ledgers for thirty years. He found his daughter at the church door as a baby, wrapped in a shawl no one in Vellmoor had ever woven. Last night he stood at her door with a poker, and this morning the maid found him on the stair, white and still. The girl was gone.

**n1-burgomasters-house.02** [still]
> **Agnes:** *(kneeling by the body)* He fought. There's skin under his nails, and it is cold.
> **Tomas:** Anton never fought anyone in his life. He fined me twice and was right both times.

**n1-burgomasters-house.03** [still] [prop: pressed-flower]
[sfx: pages turning, wind through an open window]
> **Narrator:** Wren goes up the stairs without asking. The girl's room smells of dried violets. The window is open on the castle.
> **Wren:** Latch is scratched. From outside. She didn't go out. Something came in and carried her.

**n1-burgomasters-house.04** [still]
> **Emeric:** Her diary. Last entry: "Every morning the window is open, and I've been dreaming of a garden I've never seen." Her name was Lenka. *Is* Lenka.
> **Agnes:** Is. Keep saying is.

**n1-burgomasters-house.05** [clip]
[tower: heartbeat-fast] then [tower: heartbeat] (the app holds heartbeat-fast for about three seconds)
> **Narrator:** On the dresser lies a letter on heavy cream paper, unsigned. The hand is beautiful and very old.
> **Emeric:** *(reading)* "You have been away so long. Come home." He wrote to her. Before he came.

**n1-burgomasters-house.06** [still] — the maid's account (a still of the stair)
> **Narrator:** The maid saw the end from the kitchen door. She tells it to the floor, not to you.
> **Anton (remembered):** You will not have her. Not while I'm in this house. Lenka, run —

**n1-burgomasters-house.07** [still]
> **Tomas:** He took her up the hill. I know that road. I know that gate.
> **Agnes:** *(thumb on her scar)* Then we bring her down it.

**n1-burgomasters-house.08** [still] [prop: pressed-flower]
[music: violin resolves] [sfx: paper rustle]
> **Narrator:** On the sill, a single pressed mountain violet, laid there deliberately. Mountain violets do not grow in the valley.
> **Wren:** She left that. For whoever came after her.

**n1-burgomasters-house.09.private.agnes** [still] `ipad:agnes`
> **Agnes (thought):** The letter's hand. You have seen it before: on the fever-ledger at Saint Ysolde, where the traveler signed for his bed. He wrote his name there as "a guest."
**n1-burgomasters-house.09.private.tomas** [still] `ipad:tomas`
> **Tomas (thought):** Marta has a letter like that. You saw it in her apron and pretended you hadn't. Cream paper. Beautiful hand.
**n1-burgomasters-house.09.private.wren** [still] `ipad:wren` [prop: pressed-flower]
> **Wren (thought):** Mountain violets grew on the grave-rows your mother tended, up by the castle wall. Nowhere else.
**n1-burgomasters-house.09.private.emeric** [still] `ipad:emeric`
> **Emeric (thought):** The shawl in her chest has the weave Gerhardt sketched in the treatise's margin, labelled "the old house, before the fall." Before whose fall?

## Outcome / choice
The party's goal is set: rescue Lenka and destroy him. Vote on each iPad:
1. **Go now** to the churchyard at dusk → `n1-open-grave`.
2. **Search the house longer:** counts as one visit toward dusk; adds one clue to the journal ("She was carried, not led"); then `n1-open-grave`.

**n1-burgomasters-house.10** [still]
> **Narrator:** Below the window, in the mud, the print of a single bare foot, pointing up the hill. And beside it, smaller, the mark of a girl's heel, dragged.

## Variants
**n1-burgomasters-house.02~no-agnes** [still] — Agnes not in play
> **Tomas:** *(kneeling by the body)* He fought. Anton never fought anyone in his life.
**n1-burgomasters-house.04~no-agnes** [still] — Agnes not in play
> **Emeric:** Her diary. "Every morning the window is open, and I've been dreaming of a garden I've never seen." Her name was Lenka. *Is* Lenka.
**n1-burgomasters-house.07~no-agnes** [still] — Agnes not in play
> **Tomas:** He took her up the hill. I know that road. I know that gate. We bring her down it.
**n1-burgomasters-house.02~no-tomas** [still] — Tomas not in play
> **Agnes:** *(kneeling by the body)* He fought. There's skin under his nails, and it is cold.
**n1-burgomasters-house.07~no-tomas** [still] — Tomas not in play
> **Wren:** He took her up the hill.
> **Agnes:** *(thumb on her scar)* Then we bring her down it.
**n1-burgomasters-house.07~no-agnes-no-tomas** [still] — neither in play
> **Wren:** Up the hill. We bring her down.
**n1-burgomasters-house.03~no-wren** [still] — Wren not in play [prop: pressed-flower]
> **Narrator:** Upstairs, the girl's room smells of dried violets. The window is open on the castle, its latch scratched from outside.
**n1-burgomasters-house.08~no-wren** [still] — Wren not in play [prop: pressed-flower]
> **Narrator:** On the sill, a single pressed mountain violet, laid there deliberately. She left it for whoever came after her.
**n1-burgomasters-house.04~no-emeric** [still] — Emeric not in play
> **Narrator:** Her diary lies open: "Every morning the window is open, and I've been dreaming of a garden I've never seen." Her name is Lenka.
**n1-burgomasters-house.05~no-emeric** [clip] — Emeric not in play (same cues)
> **Narrator:** On the dresser lies a letter on heavy cream paper, unsigned: "You have been away so long. Come home."

Absent hunters' private moments (.09) are skipped.
