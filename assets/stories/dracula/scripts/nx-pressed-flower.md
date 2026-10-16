# nx-pressed-flower

- **Scene ID:** nx-pressed-flower (reusable; plays at dusk on nights 1–4)
- **Night:** 1–4 at dusk
- **Kingdom slot / building:** Current kingdom / the building the party is in (the flower is found there)
- **Setting:** Each dusk, a pressed mountain violet turns up where the hunters are (on night 1 it is the one found on Lenka's sill in `n1-burgomasters-house.08`). Lenka is pressing them in her prison and sending them out the only way she can; the Count lets them through because he thinks they are love-tokens for him. Each carries a clue to where she is held.
- **Mood:** Quiet, tender, a thread of hope.
- **Cast:** Narrator; one hunter's private thought per night
- **Targets:** untagged moments, lines and cues play on `storyboard` (Mac screen and speakers; tower cues fire from the Mac). Moments tagged `ipad:<hunter>` play only on that hunter's iPad, never on the Story board. Variant moments (`scene.moment~variant`) replace the base moment of the same number when their condition holds.
- **Props:** [prop: pressed-flower]; night 2 only: [prop: come-home-letter] (Marta's summons, `.00~night2`)
- **Recipient:** one hunter per night gets the private clue: night 1 Wren, night 2 Agnes, night 3 Tomas, night 4 Emeric; if that hunter is absent, the next present one in that order. The others see only the Story board still. Each private line is written for every hunter so any of them can receive it.

## Moments

**nx-pressed-flower.01~night1** [still] [prop: pressed-flower]
[music: solo violin, two notes] [sfx: wind; faint heartbeat] [tower: heartbeat]
> **Narrator:** The violet from Lenka's sill, turned over in the dusk light: a thread of white plaster is pressed into it. Castle plaster.

**nx-pressed-flower.02.private.agnes~night1** [still] `ipad:agnes` [prop: pressed-flower]
> **Agnes (thought):** She's high up. Plastered walls, not stone. A lady's rooms. *(child, I hear you.)*

**nx-pressed-flower.02.private.tomas~night1** [still] `ipad:tomas` [prop: pressed-flower]
> **Tomas (thought):** She's high up. Plastered walls, not stone. A lady's rooms. *(lass, I hear you.)*

**nx-pressed-flower.02.private.wren~night1** [still] `ipad:wren` [prop: pressed-flower]
> **Wren (thought):** She's high up. Plastered walls, not stone. A lady's rooms. *(Got it.)*

**nx-pressed-flower.02.private.emeric~night1** [still] `ipad:emeric` [prop: pressed-flower]
> **Emeric (thought):** She's high up. Plastered walls, not stone. A lady's rooms. *(noted, noted, I'm noting it.)*

**nx-pressed-flower.00~night2** [still] [prop: come-home-letter] — Marta's summons (plays before .01~night2; night 2 only)
[music: solo violin, one held note] [sfx: wind; a loose shutter knocking]
> **Narrator:** Dusk on the second night. Tomas Varga goes home first. Marta's shutters hang open, the nails pried out and laid in a neat row on the sill. Her bed is cold. On the pillow lies a letter on heavy cream paper: "Come home."

**nx-pressed-flower.00~night2~no-tomas** [still] [prop: come-home-letter] — Tomas not in play
[music: solo violin, one held note] [sfx: wind; a loose shutter knocking]
> **Narrator:** Dusk on the second night. At the edge of the village a girl's shutters hang open, the nails pried out and laid in a neat row on the sill. Marta Varga is gone. On her pillow lies a letter on heavy cream paper: "Come home."

**nx-pressed-flower.00~night2.private.tomas** [still] `ipad:tomas` [prop: come-home-letter]
> **Tomas (thought):** I nailed those shutters myself. He didn't break them. She drew the nails for him, one by one, and laid them out tidy, the way I taught her. *(I'm coming, lass.)*

**nx-pressed-flower.01~night2** [still] [prop: pressed-flower]
[music: solo violin, two notes] [sfx: wind; faint heartbeat] [tower: heartbeat]
> **Narrator:** A violet on the lintel at dusk, wrapped in a scrap of painted canvas.

**nx-pressed-flower.02.private.agnes~night2** [still] `ipad:agnes` [prop: pressed-flower]
> **Agnes (thought):** Painted canvas. She's being kept near pictures. A gallery. *(child, I hear you.)*

**nx-pressed-flower.02.private.tomas~night2** [still] `ipad:tomas` [prop: pressed-flower]
> **Tomas (thought):** Painted canvas. She's being kept near pictures. A gallery. *(lass, I hear you.)*

**nx-pressed-flower.02.private.wren~night2** [still] `ipad:wren` [prop: pressed-flower]
> **Wren (thought):** Painted canvas. She's being kept near pictures. A gallery. *(Got it.)*

**nx-pressed-flower.02.private.emeric~night2** [still] `ipad:emeric` [prop: pressed-flower]
> **Emeric (thought):** Painted canvas. She's being kept near pictures. A gallery. *(noted, noted, I'm noting it.)*

**nx-pressed-flower.01~night3** [still] [prop: pressed-flower]
[music: solo violin, two notes] [sfx: wind; faint heartbeat] [tower: heartbeat]
> **Narrator:** A violet in the dust, its stem tied with a single gold thread from a wedding veil.

**nx-pressed-flower.02.private.agnes~night3** [still] `ipad:agnes` [prop: pressed-flower]
> **Agnes (thought):** A veil. He's dressing her. Above the gallery, where the stair goes up. *(child, I hear you.)*

**nx-pressed-flower.02.private.tomas~night3** [still] `ipad:tomas` [prop: pressed-flower]
> **Tomas (thought):** A veil. He's dressing her. Above the gallery, where the stair goes up. *(lass, I hear you.)*

**nx-pressed-flower.02.private.wren~night3** [still] `ipad:wren` [prop: pressed-flower]
> **Wren (thought):** A veil. He's dressing her. Above the gallery, where the stair goes up. *(Got it.)*

**nx-pressed-flower.02.private.emeric~night3** [still] `ipad:emeric` [prop: pressed-flower]
> **Emeric (thought):** A veil. He's dressing her. Above the gallery, where the stair goes up. *(noted, noted, I'm noting it.)*

**nx-pressed-flower.01~night4** [still] [prop: pressed-flower]
[music: solo violin, two notes] [sfx: wind; faint heartbeat] [tower: heartbeat]
> **Narrator:** The last violet, pressed flat into a page torn from a book in an old girl's hand.

**nx-pressed-flower.02.private.agnes~night4** [still] `ipad:agnes` [prop: pressed-flower]
> **Agnes (thought):** The page says: 'the high room, the window I opened.' She's in the room where Ludmila fell. *(child, I hear you.)*

**nx-pressed-flower.02.private.tomas~night4** [still] `ipad:tomas` [prop: pressed-flower]
> **Tomas (thought):** The page says: 'the high room, the window I opened.' She's in the room where Ludmila fell. *(lass, I hear you.)*

**nx-pressed-flower.02.private.wren~night4** [still] `ipad:wren` [prop: pressed-flower]
> **Wren (thought):** The page says: 'the high room, the window I opened.' She's in the room where Ludmila fell. *(Got it.)*

**nx-pressed-flower.02.private.emeric~night4** [still] `ipad:emeric` [prop: pressed-flower]
> **Emeric (thought):** The page says: 'the high room, the window I opened.' She's in the room where Ludmila fell. *(noted, noted, I'm noting it.)*

## Outcome
The clue goes into the recipient's journal (they may share it aloud). By night 4 the four clues point to the lair room, matching the fortune's lair card. No snatch: Lenka has been taken since before play began (D-DRA-10).
