# n5-final-confrontation

- **Scene ID:** n5-final-confrontation
- **Night:** 5, set piece 10
- **Kingdom slot / building:** The tower / the high room (the lair room the fortune laid face up)
- **Setting:** The high room where Ludmila stepped from the window four hundred years ago. The window is shut. Lenka, in a white dress, sits bound by nothing at all before it: she cannot stand while he is in the room. On the stair, three brides: two pale sisters of the house (the Striga minis) and Ilka Kessel (app only).
- **Mood:** Dread to fury to a single held breath.
- **Cast:** Narrator, Ilka Kessel, Wren Kessel, The Count, Sister Agnes Hallow, Lenka Morosz
- **Targets:** untagged moments, lines and cues play on `storyboard` (the Story board: Mac screen and speakers, display only; tower cues fire from the Mac; all taps and votes are on the iPads). Moments tagged `ipad:<hunter>` play only on that hunter's iPad, never on the Story board. Variant moments (`scene.moment~variant`) replace the base moment of the same number when their condition holds.
- **Win (D-DRA-10):** rescuing Lenka and destroying Vlad are one goal. She is freed in this battle; her refusal plus Sergiu's sword breaks him.

## Moments

**n5-final-confrontation.01** [clip]
[music: full theme, drums] [sfx: thunder, bat swarm] [tower: dim-all] [tower: heartbeat] [tower: break-seal]
> **Narrator:** The brides come down the stair together, barefoot, silent, and the third one is humming.

**n5-final-confrontation.02** [clip]
> **Ilka:** Wren. My little Wren. You've cut your hair. Come and let me fix it.
> **Wren:** You hid her, Mother. You hid Lenka from him. That's why.

**n5-final-confrontation.03** [still]
> **Ilka:** *(the humming stops)* I hid her in the church. I hid you in the grave-rows. He never found either of you. *(beat)* Use the bolt, little one. It has my name on it. I scratched it there while you slept, the night before I went.
> **Wren:** *(turning the blank bolt; it isn't blank)* I. L. K. A.

**n5-final-confrontation.04** [clip] — battle begins (adversary battle shape, per mechanics)
[tower: drum-top] [tower: drum-middle] [tower: drum-bottom] (calibrated only; each move starts after the previous move's state reply) [tower: skull-drop] (story drops as he summons: at most 2 tonight; if fewer than 6 skulls remain, each becomes +1 foe instead)
> **The Count:** "How dare you touch him, any of you?" *(after Stoker)* She is mine. Ludmila. The window.

**n5-final-confrontation.05** [still]
> **Agnes:** I prayed for you once, traveler. I am praying for you now. Rest.
> **The Count:** *(the light holds him; he cannot look away from her)* You sound like her. You always did.

**n5-final-confrontation.06** [still] [prop: pressed-flower] — Lenka freed
> **Narrator:** While he is held, Lenka stands. In her hand, the last of her violets.
> **Lenka:** My name is Lenka Morosz. I am not her. And if I were, I would say what she said. *(she opens the window to the grey dawn)* No.

**n5-final-confrontation.07** [clip] [prop: sergiu-blade] — the stroke (on victory, sword present)
[sfx: blade ring] [tower: break-seal] [tower: all-on]
> **Narrator:** Her no goes through him like a draught through an empty house. And his brother's sword finds his heart, and for the first time in four hundred years the Count looks surprised.

**n5-final-confrontation.08.private.agnes** [still] `ipad:agnes`
> **Agnes (thought):** Finish the prayer. Say the last word for him, because nobody else in four hundred years has.
**n5-final-confrontation.08.private.tomas** [still] `ipad:tomas`
> **Tomas (thought):** Down in the courtyard, a little gate swings open, and a girl in an apron runs out of it into the mist. Out. She crossed it out.
**n5-final-confrontation.08.private.wren** [still] `ipad:wren`
> **Wren (thought):** One bolt left. The name's right. She's smiling. Load it.
**n5-final-confrontation.08.private.emeric** [still] `ipad:emeric`
> **Emeric (thought):** The last line of the treatise, in Gerhardt's hand, at last makes sense: "It ends when she says no to his face." Write it down. Write it down after.

## Outcome (ending routing)
Checked in this order:
1. **Any hunter takes a third corruption** (here or earlier) → `n5-ending-turned`.
2. **Blade check first: did `.blade-lost` play?**
   - Yes, and Lenka was freed while at least one hunter was still standing → `n5-ending-endures` (she is rescued; he is only driven off).
   - Yes, and the party then lost the battle or retreated → `n5-ending-taken`.
3. **Sword present:** battle won and Lenka freed → `n5-ending-rescued` (she is rescued and he falls). Battle lost or retreat → `n5-ending-taken` (the hunters fail; she stays with him).
"Survived" in these rules means Lenka was freed while at least one hunter was still standing.

## Event moments (play once, when they happen in battle; they replace nothing)

**n5-final-confrontation.blade-lost** [clip] [prop: sergiu-blade] — the hunter carrying Sergiu's sword falls in battle. Plays at once; the battle goes on, `.06` (Lenka freed) still plays as normal, and `.07~blade-lost` replaces `.07`.
[sfx: steel on stone] [tower: dim-all] then [tower: heartbeat]
> **Narrator:** The hunter carrying Sergiu's sword goes down, and the blade skids away across the flagstones into the dark beneath the window. Nobody can reach it now.

**n5-final-confrontation.strike-redirected** [still] — the Count's strike was aimed at a hunter at 2 corruptions. It is redirected to the hunter guarding Lenka, who takes 1 corruption. The instant-loss guard still applies: if the guarding hunter is also at 2, `~blocked` plays instead.
[sfx: a rush of wings] [tower: heartbeat-fast] then [tower: heartbeat]
> **Narrator:** He turns from you, toward the girl at the window, and whoever stands between them takes the blow.

**n5-final-confrontation.strike-redirected~blocked** [still] — the guarding hunter is also at 2 corruptions: no corruption is given, but the party loses one story item (holy water, the host, or a stake) (same cues)
> **Narrator:** He turns toward the girl at the window, and you throw the last thing you have between them. It shatters in his hand. The blow falls on nothing, and you are poorer for it.

**n5-final-confrontation.guard-chosen** [still] — at the start of the finale, the party votes on each iPad for one hunter to guard Lenka (the Story board shows the result). It can't be the hunter carrying `sergiu-blade`. The guard keeps the role for the whole finale. [prop: sergiu-blade]
[tower: heartbeat]
> **Narrator:** Someone must stand at the girl's side, and someone else must carry the sword. It cannot be the same pair of hands.

## Variants
**n5-final-confrontation.07~blade-lost** [clip] [prop: sergiu-blade] — `.blade-lost` has played (the sword is lost) (cues: [sfx: wings, glass] [tower: heartbeat-fast] then [tower: low]) [prop: sergiu-blade]
> **Narrator:** Her no goes through him like a draught through an empty house. He staggers, and there is no blade to finish it. He goes out of the window as mist, and the mist goes up the mountain.
**n5-final-confrontation.04~boxes-left** [clip] — earth boxes left standing (same cues)
> **The Count:** My earth still waits for me. I am not tired, Sister. Ludmila. The window.
**n5-final-confrontation.05~boxes-left** [still] — earth boxes left standing
> **Agnes:** I prayed for you once, traveler. I am praying for you now. Rest.
> **The Count:** Not yet. *(he shrugs off the light once; per mechanics the battle is harder)*
**n5-final-confrontation.02~no-wren** [clip] — Wren not in play; .03 is cut
> **Ilka:** *(humming, looking past you all)* Where is my little one? She'd have come.
**n5-final-confrontation.05~no-agnes** [still] — Agnes not in play
> **Narrator:** There is no one here who prayed for him. Lenka stands anyway, and every word costs her.
**n5-final-confrontation.06~no-agnes** [still] [prop: pressed-flower] — Agnes not in play
> **Narrator:** Lenka stands, against all of his will in the room. In her hand, the last of her violets.
> **Lenka:** My name is Lenka Morosz. I am not her. And if I were, I would say what she said. *(she opens the window to the grey dawn)* No.
