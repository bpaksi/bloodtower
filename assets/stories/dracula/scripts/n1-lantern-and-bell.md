# n1-lantern-and-bell

- **Scene ID:** n1-lantern-and-bell
- **Night:** 1 (dusk of All Hallows' Eve), set piece 1 "The mists close"
- **Kingdom slot / building:** K1 (start kingdom) / Village: the Lantern & Bell inn
- **Setting:** The only inn at the crossroads under the castle. Low beams, a roaring fire, garlic over every window. Outside, the road the hunters came in on is going white.
- **Mood:** Wary warmth, then the trap closing.
- **Cast:** Narrator, Hanne, Tomas Varga, Sister Agnes Hallow, Emeric Lutz, Wren Kessel
- **Targets:** untagged moments, lines and cues play on `dashboard` (Mac screen and speakers; tower cues fire from the Mac). Moments tagged `ipad:<hunter>` play only on that hunter's iPad, never on the dashboard. Variant moments (`scene.moment~variant`) replace the base moment of the same number when their condition holds.

## Moments

**n1-lantern-and-bell.01** [clip]
[music: low strings, wind] [sfx: distant wolves, church bell ringing six] [tower: dim-all] [tower: heartbeat]
> **Narrator:** Vellmoor has buried more of its own this year than in the ten before it. Tonight is All Hallows' Eve, and the castle on the hill is lit for the first time in a generation.

**n1-lantern-and-bell.02** [still]
[sfx: fire crackle, low murmur]
> **Hanne:** Varga. I'd heard you were dead.
> **Tomas:** *(taps the axe haft three times)* Not for lack of trying, lass.

**n1-lantern-and-bell.03** [still]
[sfx: door, rain]
> **Agnes:** You keep a fire burning all night, innkeeper. What are you afraid of?
> **Hanne:** Same as you, Sister, or you wouldn't have asked.

**n1-lantern-and-bell.04** [still]
[sfx: door bangs, satchel clinks]
> **Emeric:** I'm looking for Father Oskar? I have a letter. That is, he sent me a letter. That is, I'm expected. I think.
> **Tomas:** *(laying a black-sealed letter on the table)* So am I, lad.

**n1-lantern-and-bell.05** [still]
> **Narrator:** Agnes lays down a third letter. Then the door opens on a woman muddy to the knees, who smells the room and drops a fourth.
> **Wren:** Father Oskar's not coming. They buried him this morning.
> **Emeric:** Then who's — then he wrote these from —
> **Wren:** Before. Grave's open now. From the inside.

**n1-lantern-and-bell.06** [still]
[sfx: paper rustle] Journal (lair clues): "He keeps the faith of the dead." / "He rests where the guard once stood." / "He lies beneath what was dug." / "He sleeps in the name of the first."
> **Emeric:** He split it between us so no single one of us could — oh. That's very clever.
> **Tomas:** It's a riddle that got a priest killed.

**n1-lantern-and-bell.07** [clip]
[sfx: hoofbeats, a boy shouting] [music: strings tighten]
> **Narrator:** A stable boy stumbles in, white to the lips. The road out of the valley is gone. Not blocked. Gone. The mist has come down over it like a lid.
> **Hanne:** It does that when he wants company. Nobody leaves Vellmoor now, loves. Not since spring.

**n1-lantern-and-bell.08** [clip]
[tower: dim-all] [tower: heartbeat] [tower: drum-top] [sfx: stone grind]
> **Hanne:** You want to help this valley? Go up the hill to the burgomaster's house. Anton Morosz died last night, at his daughter's door. And the girl is gone.
> **Agnes:** Gone where, innkeeper?

**n1-lantern-and-bell.09** [still]
> **Hanne:** Up. Every night for a month her window was open in the morning, and she always shut it. This morning it was open, and her bed was empty.

**n1-lantern-and-bell.10.private.agnes** [still] `ipad:agnes`
> **Agnes (thought):** The garlic, the open window, the girl taken. Ten winters ago it began like this at Saint Ysolde. You know the shape of this. You have been walking toward it for ten years.

**n1-lantern-and-bell.10.private.tomas** [still] `ipad:tomas`
> **Tomas (thought):** The castle windows are lit in the old pattern, the one the guard used for a feast. Marta is at home, asleep, with the shutters nailed. She will wake at dusk and ask what the lights mean. You won't tell her.

**n1-lantern-and-bell.10.private.wren** [still] `ipad:wren`
> **Wren (thought):** Six cloves left. One blank bolt. The mist smells of turned earth, the way the churchyard smelled the spring your mother went up the hill.

**n1-lantern-and-bell.10.private.emeric** [still] `ipad:emeric`
> **Emeric (thought):** Gerhardt's treatise, page one: "The affliction does not spread. It is sent." The cipher page is still in your satchel. You have not dared to try it in this valley.

## Outcome / choice
Vote on each iPad:
1. **The burgomaster's house** (Citadel) → `n1-burgomasters-house` (recommended; forced at first dusk if not chosen).
2. **The churchyard** (Sanctuary) → `n1-open-grave`. Shown greyed out with "after dusk" until dusk falls; it cannot be picked before then.

**n1-lantern-and-bell.11** [still]
> **Narrator:** The mist is at the windows now. The hunt begins.

## Variants
**n1-lantern-and-bell.05~no-wren** [still] — Wren not in play
> **Narrator:** Agnes lays down a third letter. A fourth lies on the table already, sealed, addressed to someone who never came.
> **Hanne:** Your priest's not coming, loves. We buried him this morning. And his grave's open.

**n1-lantern-and-bell.02~no-tomas** [still] — Tomas not in play
> **Narrator:** In the corner, a stool by the wall stands empty, a full tankard in front of it that nobody touches.

**n1-lantern-and-bell.04~no-tomas** [still] — Tomas not in play
> **Emeric:** I'm looking for Father Oskar? I have a letter. That is, I'm expected. I think.
> **Agnes:** *(laying a black-sealed letter on the fire-ledge)* So am I.

**n1-lantern-and-bell.06~no-tomas** [still] — Tomas not in play
> **Emeric:** He split it between us so no single one of us could — oh. That's very clever.
> **Wren:** Clever got him buried.

**n1-lantern-and-bell.03~no-agnes** [still] — Agnes not in play
> **Narrator:** By the fire, a grey cloak drips on a peg. Its owner did not come down tonight.

**n1-lantern-and-bell.08~no-agnes** [clip] — Agnes not in play (same cues)
> **Hanne:** You want to help this valley? Go up the hill to the burgomaster's house. Anton Morosz died last night, at his daughter's door. And the girl is gone.
> **Tomas:** Gone where?

**n1-lantern-and-bell.04~no-emeric** [still] — Emeric not in play
> **Narrator:** The door bangs on an empty doorway. A satchel lies on the step, soaked, with a black-sealed letter on top.
> **Tomas:** *(picking up the letter)* So's he, whoever he was.

**n1-lantern-and-bell.06~no-emeric** [still] — Emeric not in play
> **Agnes:** Four lines in four margins. He split a riddle between us.
> **Tomas:** It's a riddle that got a priest killed.

Absent hunters' private moments (.10) are skipped.
