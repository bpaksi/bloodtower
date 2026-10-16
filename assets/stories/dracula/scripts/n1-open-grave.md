# n1-open-grave

- **Scene ID:** n1-open-grave
- **Night:** 1 (after dusk, before midnight), set piece 5
- **Kingdom slot / building:** K1 / Sanctuary: the church and churchyard
- **Setting:** Father Oskar's fresh grave, dug open from below, the coffin lid split outward. His study in the vestry, ransacked. A map pinned under the altar cloth.
- **Mood:** Investigation, then sorrow turning to horror.
- **Cast:** Narrator, Wren Kessel, Emeric Lutz, Sister Agnes Hallow, Father Oskar, Tomas Varga (variants)
- **Targets:** untagged moments, lines and cues play on `storyboard` (the Story board: Mac screen and speakers, display only; tower cues fire from the Mac; all taps and votes are on the iPads). Moments tagged `ipad:<hunter>` play only on that hunter's iPad, never on the Story board. Variant moments (`scene.moment~variant`) replace the base moment of the same number when their condition holds.

## Moments

**n1-open-grave.01** [clip]
[music: none] [sfx: wind in yews, earth trickling] [tower: dim-all] [tower: flicker]
> **Narrator:** The soil around Father Oskar's grave is heaped outward, in a ring. Whatever left the coffin did not need a spade.

**n1-open-grave.02** [still]
> **Wren:** Dug from the inside. Fingers, not claws. He was a tidy man. Look, he folded the shroud.
> **Emeric:** That's the most horrible thing I've ever heard.

**n1-open-grave.03** [still]
[sfx: paper rustle] Journal: Oskar's map of the valley's four parishes, three marked with a bell, one inked out.
> **Emeric:** A map. Three parishes marked with a bell, the fourth blotted out. And a note: "The fortune-woman reads true. Take her something of the girl's."
> **Agnes:** Then we take her at dawn. If we live to it.

**n1-open-grave.04** [clip]
[sfx: shovel scrape] [tower: heartbeat] [tower: drum-top] (calibrated tower only: battle glyph toward the party's kingdom; skipped and logged if uncalibrated)
> **Narrator:** Someone is standing in the next row of graves, in a priest's cassock gone black with earth.
> **Oskar:** You came. All four. I asked so many, and you are the ones who came.

**n1-open-grave.05** [still]
> **Agnes:** Father Oskar. Step into the lantern light.
> **Oskar:** I can't, Sister. He says the light is not for me. *(softly)* "The blood is the life." *(Stoker, Renfield)* I used to read that as scripture. It isn't.

**n1-open-grave.06** [still]
> **Oskar:** He has little Lenka. He'll call her by another name up there. Tell her not to answer to it.
> **Wren:** What name? Oskar. *What name?*

**n1-open-grave.map.private.agnes** [still] `ipad:agnes` — plays after `.06`, on every present hunter's iPad (fellowship test 1)
> **Agnes (thought):** The fever-ledger at Saint Ysolde. The traveler wrote his home as "the high meadow." You never found it on any map. Oskar has blotted out one parish.
**n1-open-grave.map.private.tomas** [still] `ipad:tomas`
> **Tomas (thought):** One parish the guard never walked. "The lady's meadow," the old sergeants called it, and spat. Oskar has inked it out.
**n1-open-grave.map.private.wren** [still] `ipad:wren`
> **Wren (thought):** Violets. Mother's grave-rows by the castle wall, and the meadow above them she'd never let you climb to. That's the parish Oskar blotted.
**n1-open-grave.map.private.emeric** [still] `ipad:emeric`
> **Emeric (thought):** Gerhardt's margin, beside the old weave: "the high meadow, where the first house fell." One of Oskar's four parishes is blotted out. Which one?

**n1-open-grave.map-shared** [still] — Story board; auto-plays once every present hunter in it has tapped done on their `.map.private` line (before `.07`)
[sfx: paper rustle] Journal: "The blotted parish is the high meadow: the violets' home, and his."
> **Agnes:** The ink hides the high meadow. He signed my ledger from there.
> **Wren:** Violets grow up there. Nowhere else. It's where she comes from. And him.

**n1-open-grave.07** [clip]
[sfx: a snarl] [music: low drums] Battle begins (battle-card shape, per mechanics).
> **Narrator:** The priest's gentle face splits into hunger, and he comes for the living.

**n1-open-grave.08** [still] (after the fight)
> **Wren:** *(scratching a bolt)* O-S-K-A-R. He'd want it spelled right.
> **Agnes:** He'd want us to pray. You carve; I'll pray. It comes to the same.

## Outcome
Riddle fragments and map are in the journal; Oskar is laid down. Midnight → `nx-midnight-procession`, then at dawn → `n1-fortune-reading`.

**n1-open-grave.09** [still]
> **Narrator:** Somewhere in the village, the bell begins to count toward midnight, and nobody is pulling the rope.

## Variants
**n1-open-grave.08~fight-lost** [still] — the party lost the fight (outcome per mechanics)
> **Narrator:** Oskar drags himself back into his grave, sated, and the hunters' lanterns are all out.
> **Agnes:** We failed him twice now. Not a third time.

**n1-open-grave.02~no-wren** [still] — Wren not in play
> **Agnes:** Dug from the inside. With his hands.
> **Emeric:** That's the most horrible thing I've ever heard.

**n1-open-grave.08~no-wren** [still] — Wren not in play
> **Agnes:** He'd want us to pray. So we pray.

**n1-open-grave.08~fight-lost~no-wren** [still] — fight lost and Wren not in play
> **Narrator:** Oskar drags himself back into his grave, sated, and the hunters' lanterns are all out.
> **Agnes:** We failed him twice now. Not a third time.

**n1-open-grave.02~no-emeric** [still] — Emeric not in play
> **Wren:** Dug from the inside. Fingers, not claws. He folded the shroud.
> **Agnes:** He folded his life the same way. Neatly, and for us.

**n1-open-grave.03~no-emeric** [still] — Emeric not in play
> **Narrator:** Under the altar cloth, a map: three parishes marked with a bell, the fourth blotted out. A note: "The fortune-woman reads true. Take her something of the girl's."
> **Agnes:** Then we take her at dawn. If we live to it.

**n1-open-grave.03~no-agnes** [still] — Agnes not in play
> **Emeric:** A map. And a note: "The fortune-woman reads true. Take her something of the girl's."
> **Wren:** Dawn, then. If we get there.

**n1-open-grave.05~no-agnes** [still] — Agnes not in play
> **Tomas:** Father. Step into the lantern light.
> **Oskar:** I can't, Varga. He says the light is not for me. "The blood is the life." *(Stoker, Renfield)*

**n1-open-grave.06~no-wren** [still] — Wren not in play
> **Oskar:** He has little Lenka. He'll call her by another name up there. Tell her not to answer to it.
> **Agnes:** What name, Father? What name?

**n1-open-grave.08~no-agnes** [still] — Agnes not in play
> **Wren:** *(scratching a bolt)* O-S-K-A-R. He'd want it spelled right.

Private moments: `.map.private.<hunter>` only; absent hunters' are skipped. (Tomas speaks only in variants.)

**n1-open-grave.map-shared~no-agnes** [still] — Agnes not in play (same journal clue)
> **Tomas:** The ink hides the lady's meadow. The guard never went up there.
> **Wren:** Violets grow up there. Nowhere else. It's where she comes from. And him.
**n1-open-grave.map-shared~no-wren** [still] — Wren not in play (same journal clue)
> **Agnes:** The ink hides the high meadow. He signed my ledger from there.
> **Emeric:** Gerhardt marked it too. "Where the first house fell." It's his. And hers.
**n1-open-grave.map-shared~no-agnes-no-wren** [still] — neither in play (same journal clue)
> **Tomas:** The ink hides the lady's meadow. The guard never went up there.
> **Emeric:** Gerhardt marked it too. "Where the first house fell." It's his. And hers.
