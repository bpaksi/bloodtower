# nx-midnight-procession

- **Scene ID:** nx-midnight-procession (reusable; plays at the midnight beat of nights 1 to 4, wherever the party is)
- **Night:** 1–4, set piece 4
- **Kingdom slot / building:** Current kingdom / any building (floating)
- **Setting:** The bell strikes twelve. A line of dead hunters in old coats and older armour walks through walls and streets, carrying lanterns that give no light. They do not look at the living, except for one.
- **Mood:** Cold silence, grief, an accusation.
- **Cast:** Narrator; the spotlit hunter and their ghost: Mother Ursula (Agnes), Sergeant Pavel Dorn (Tomas), Jozef Kessel (Wren), Master Gerhardt Albrecht (Emeric)
- **Targets:** untagged moments, lines and cues play on `dashboard` (Mac screen and speakers; tower cues fire from the Mac). Moments tagged `ipad:<hunter>` play only on that hunter's iPad, never on the dashboard. Variant moments (`scene.moment~variant`) replace the base moment of the same number when their condition holds.
- **Spotlight:** the app picks one hunter per night (unresolved tie first, never the same hunter twice in a row). That hunter's iPad plays `.03.private.<hunter>` and `.04.private.<hunter>`; every other present hunter's iPad plays `.04.private.<hunter>-watched`.

## Moments

**nx-midnight-procession.01** [clip]
[music: cut to silence] [sfx: bell toll ×12, slow footsteps] [tower: dim-all] [tower: heartbeat] [tower: skull-drop] (story drop: counts toward the cap of 2 story drops per night; if fewer than 6 skulls remain in supply, no drop: +1 foe on night 5 instead; the app names the building)
> **Narrator:** At the twelfth stroke the dead come walking. Every hunter who ever climbed that hill is in the line. They do not stop. One of them does.

**nx-midnight-procession.02** [still]
Dashboard text: "One of the dead has stopped for one of you." (no voice)

**nx-midnight-procession.03.private.agnes** [clip] `ipad:agnes`
> **Mother Ursula:** Agnes. You slept in the chapel while we died. Why did he leave you, girl? What did you say to him?
> **Agnes:** I said nothing, Mother. I prayed.
> **Mother Ursula:** For whom?

**nx-midnight-procession.03.private.tomas** [clip] `ipad:tomas`
> **Sergeant Dorn:** Varga. You stood the gate with me three years. You heard the girls go up the stair. You looked at your boots.
> **Tomas:** I looked at my boots. Then I went over the wall.
> **Sergeant Dorn:** With one. There were forty.

**nx-midnight-procession.03.private.wren** [clip] `ipad:wren`
> **Jozef Kessel:** Wren. You did it right, girl. The stake. I felt it. Thank you.
> **Wren:** Where's Mother?
> **Jozef Kessel:** She's not in this line. The ones he keeps don't walk with us.

**nx-midnight-procession.03.private.emeric** [clip] `ipad:emeric` [prop: ludmila-tome]
> **Gerhardt:** Emeric. Did you finish it? The last page? You must read the last page before you read his book.
> **Emeric:** It's in cipher, Master. You never taught me the key.
> **Gerhardt:** I did. You weren't listening. You never listen when you're frightened.

**nx-midnight-procession.04.private.agnes** [still] `ipad:agnes` — spotlit choice
Choice on this iPad only: **Answer** (say the truth aloud to the table) or **Turn away**. Both give something.

**nx-midnight-procession.04.private.agnes~answer** [still] `ipad:agnes`
> **Mother Ursula:** You prayed for *him*. Not against him. He heard.
Journal: tie clue.

**nx-midnight-procession.04.private.agnes~turn-away** [still] `ipad:agnes` [prop: ludmila-tome]
> **Mother Ursula:** Then you are still asleep in that chapel.
> **Narrator (private):** As the ghost walks on, something drops from its lantern-hand: a stoppered vial of holy water, still cold. And a scrap of paper, in Father Oskar's hand, about the order of his book.
Gain: one holy water and a Tome-order clue (journal).

**nx-midnight-procession.04.private.agnes-watched** [still] `ipad:agnes` — another hunter is spotlit
> **Narrator (private):** The dead walk through you. It is very cold. Someone at your table is listening to a voice you cannot hear.

**nx-midnight-procession.04.private.tomas** [still] `ipad:tomas` — spotlit choice
Choice on this iPad only: **Answer** (say the truth aloud to the table) or **Turn away**. Both give something.

**nx-midnight-procession.04.private.tomas~answer** [still] `ipad:tomas`
> **Sergeant Dorn:** Your niece keeps his door. Ask the fly-eater what she opens.
Journal: tie clue.

**nx-midnight-procession.04.private.tomas~turn-away** [still] `ipad:tomas` [prop: ludmila-tome]
> **Sergeant Dorn:** Boots, then.
> **Narrator (private):** As the ghost walks on, something drops from its lantern-hand: a stoppered vial of holy water, still cold. And a scrap of paper, in Father Oskar's hand, about the order of his book.
Gain: one holy water and a Tome-order clue (journal).

**nx-midnight-procession.04.private.tomas-watched** [still] `ipad:tomas` — another hunter is spotlit
> **Narrator (private):** The dead walk through you. It is very cold. Someone at your table is listening to a voice you cannot hear.

**nx-midnight-procession.04.private.wren** [still] `ipad:wren` — spotlit choice
Choice on this iPad only: **Answer** (say the truth aloud to the table) or **Turn away**. Both give something.

**nx-midnight-procession.04.private.wren~answer** [still] `ipad:wren`
> **Jozef Kessel:** Three brides on the stair. The third one hums.
Journal: tie clue.

**nx-midnight-procession.04.private.wren~turn-away** [still] `ipad:wren` [prop: ludmila-tome]
> **Jozef Kessel:** Look up the stair, girl.
> **Narrator (private):** As the ghost walks on, something drops from its lantern-hand: a stoppered vial of holy water, still cold. And a scrap of paper, in Father Oskar's hand, about the order of his book.
Gain: one holy water and a Tome-order clue (journal).

**nx-midnight-procession.04.private.wren-watched** [still] `ipad:wren` — another hunter is spotlit
> **Narrator (private):** The dead walk through you. It is very cold. Someone at your table is listening to a voice you cannot hear.

**nx-midnight-procession.04.private.emeric** [still] `ipad:emeric` — spotlit choice
Choice on this iPad only: **Answer** (say the truth aloud to the table) or **Turn away**. Both give something.

**nx-midnight-procession.04.private.emeric~answer** [still] `ipad:emeric`
> **Gerhardt:** The key is the book he wrote.
Journal: tie clue.

**nx-midnight-procession.04.private.emeric~turn-away** [still] `ipad:emeric` [prop: ludmila-tome]
> **Gerhardt:** Then he wins the argument.
> **Narrator (private):** As the ghost walks on, something drops from its lantern-hand: a stoppered vial of holy water, still cold. And a scrap of paper, in Father Oskar's hand, about the order of his book.
Gain: one holy water and a Tome-order clue (journal).

**nx-midnight-procession.04.private.emeric-watched** [still] `ipad:emeric` — another hunter is spotlit
> **Narrator (private):** The dead walk through you. It is very cold. Someone at your table is listening to a voice you cannot hear.

**nx-midnight-procession.05** [still]
[sfx: last footstep] [tower: heartbeat] then [tower: low]
> **Narrator:** The line walks on into the mist toward the castle. In the morning there will be one more lantern in it, unless you are careful.

## Outcome
The spotlit hunter gains a tie clue (answer) or a Tome-order clue plus one holy water (turn away). The skull is placed (or logged as a night-5 foe). Play returns to the night's key set piece.
Tie clues feed: Agnes → `n5-portrait-gallery` and the Tome; Tomas → `n3-fly-eaters-cell`; Wren → `n5-final-confrontation`; Emeric → `n4-finding-the-tome`.
No corruption is attached to either choice, so a hunter at 2 corruptions is never at risk here.

## Variants
**nx-midnight-procession.01~night1** [clip] — night 1 (same cues)
> **Narrator:** At the twelfth stroke the dead come walking. Among them, for a moment, a girl in a nightdress who is not dead, walking up the hill, looking back. Then she is gone. One of them stops.

**nx-midnight-procession.01~no-drop** [clip] — story-drop cap reached or supply under 6 (cues as .01 minus skull-drop)
> **Narrator:** At the twelfth stroke the dead come walking. Tonight no one new joins them. One of them stops.

**nx-midnight-procession.05~night4** [still] — night 4, after the Tome (same cues) [prop: ludmila-tome]
> **Narrator:** The line does not walk toward the castle tonight. It waits at the gate. It wants to see the end.
