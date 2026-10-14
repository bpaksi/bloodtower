# n5-portrait-gallery

- **Scene ID:** n5-portrait-gallery
- **Night:** 5, set piece 7
- **Kingdom slot / building:** The tower / the long gallery below the high room's stair
- **Setting:** A gallery of the house's portraits, four hundred years of them. Every painting of Vlad is the same ageless face. At the end, a covered canvas.
- **Mood:** Eerie, then unbearable recognition.
- **Cast:** Narrator, Emeric Lutz, Wren Kessel, Sister Agnes Hallow, The Count (voice), Tomas Varga
- **Targets:** untagged moments, lines and cues play on `dashboard` (Mac screen and speakers; tower cues fire from the Mac). Moments tagged `ipad:<hunter>` play only on that hunter's iPad, never on the dashboard. Variant moments (`scene.moment~variant`) replace the base moment of the same number when their condition holds.

## Moments

**n5-portrait-gallery.01** [clip]
[music: music-box waltz] [sfx: whisper, a canvas tearing somewhere] [tower: flicker]
> **Narrator:** The eyes in the portraits follow you. That is ordinary. What is not ordinary is that some of them blink.

**n5-portrait-gallery.02** [still]
> **Emeric:** Same face. Four hundred years of fashions, and the same face. That's not a dynasty. That's a man.
> **Wren:** That one's moving.

**n5-portrait-gallery.03** [clip] — hostile portrait (gaze attack, per mechanics)
[sfx: shriek, frame splintering]
> **Narrator:** A painted lord of the house leans out of his frame, a long painted arm reaching for whoever looks at him longest.

**n5-portrait-gallery.04** [still] [prop: pressed-flower] (after)
> **Narrator:** At the end of the gallery, Agnes pulls the cloth from the last canvas. A girl in a white dress, holding mountain violets. Lenka's face.
> **Agnes:** No. Ludmila's. The paint is four hundred years old. The face came back. The girl is upstairs.

**n5-portrait-gallery.05** [still]
[tower: heartbeat] [sfx: the voice through every painted mouth at once]
> **The Count:** "Yes, I too can love; you yourselves can tell it from the past. Is it not so?" *(Stoker)*
> **Tomas:** We've read your past, my lord. It's the reason we brought a stake.

**n5-portrait-gallery.06.private.agnes** [still] `ipad:agnes`
> **Narrator (private):** Behind Ludmila's portrait, a second small painting: a grey-habited sister asleep in a chapel, a reliquary in her arms. You. Underneath: "The one who prayed."
**n5-portrait-gallery.06.private.tomas** [still] `ipad:tomas`
> **Narrator (private):** A painting of the old guard at the gate, twenty years ago. Your face, younger, looking at your boots. He had it painted the day you stopped asking.
**n5-portrait-gallery.06.private.wren** [still] `ipad:wren`
> **Narrator (private):** In a corner, a fresh portrait, the paint still tacky: a woman with chestnut hair and a funeral ribbon, in a bride's veil. Your mother. Her eyes move to you and she smiles.
**n5-portrait-gallery.06.private.emeric** [still] `ipad:emeric`
> **Narrator (private):** A scholar at a desk, a cup of wine at his elbow. Gerhardt. In the wine, a reflection with no man in it. He was poisoned with an invitation.

## Outcome
`galleryRevealSeen`. Behind Ludmila's portrait, the stair to the high room opens → `n5-final-confrontation`.

**n5-portrait-gallery.07** [still]
> **Narrator:** The wall turns. A stair goes up into the dark, and something at the top is humming, and something above that is saying, quietly, over and over: no.

## Variants
**n5-portrait-gallery.04~no-agnes** [still] [prop: pressed-flower] — Agnes not in play
> **Narrator:** At the end of the gallery, the last canvas: a girl in white, holding violets. Lenka's face, four hundred years old.
> **Wren:** Not her. Her face. She's upstairs.
**n5-portrait-gallery.05~no-tomas** [still] — Tomas not in play (same cues)
> **The Count:** "Yes, I too can love; you yourselves can tell it from the past. Is it not so?" *(Stoker)*
> **Wren:** Read it. Brought a stake.
**n5-portrait-gallery.02~no-emeric** [still] — Emeric not in play
> **Wren:** Same face. Every frame. That one's moving.
