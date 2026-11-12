# Dracula, Group 6: D-04 copy (traitor lines, Drawbridge labels, strike help)

**Status: DRAFT** (pending DEC-785 / OPEN RULING 6). Loremaster, 2026-11-10. Source: `/workspace/dracula/D-04/D-04-session-flow.md` §4 (strike), §5 (traitor) and §6 (Drawbridge), and D-02 §8.

## `traitor.*` (Standard and Long; event moments, D-04 §5)

The traitor lines are event moments: `traitor.<suspect>-unmasked`, `traitor.<suspect>-sprung` and `traitor.wrong`, with the suspects `jakob`, `andrei` and `marta`. Each plays over its painting. They are narrator-led, because the suspect may not be present. Each sprung line plays after `chapter-win.03`, then the trick's Reveal. The trick's mechanics stay on screen, and the lines describe no costs. **Estimates:** 0.40 s per word + 4.0 s, fitted to the 13 Charon masters in C5-05 (`/workspace/c5-05-art/voice/MANIFEST.md`); expect about ±3 s. Cap 20 s (about 40 words). Captions = spoken text, word for word.

| Asset id | Speaker (voice) | Spoken text | Caption | Est. s | When / effect | Status |
|---|---|---|---|---|---|---|
| `traitor.jakob-unmasked~vo-01` | narrator (Charon) | Jakob sets down his ledger. You found the right column, he says. He hands you holy water, and asks to be locked in. | Jakob sets down his ledger. You found the right column, he says. He hands you holy water, and asks to be locked in. | 13.2 | right accusation, Jakob: he gives one holy water (D-02 §8) | DRAFT |
| `traitor.andrei-unmasked~vo-01` | narrator (Charon) | Andrei sits down on the stair. The voice promised him his sister would be spared. He will not open a door for it again. | Andrei sits down on the stair. The voice promised him his sister would be spared. He will not open a door for it again. | 13.6 | right accusation, Andrei: Lenka's loyalty +1 (D-02 §8). Works whether or not Lenka is present | DRAFT |
| `traitor.marta-unmasked~vo-01` | narrator (Charon) | Marta turns the key over in her hand. You know, then. When you reach his bridge, it will come down without a sound. | Marta turns the key over in her hand. You know, then. When you reach his bridge, it will come down without a sound. | 13.2 | right accusation, Marta (D-02 G-16): she is no ally at the gate, and her help is the quiet bridge. The bridge places no skull and sets no `bridge-loud`, so the Banquet's foes do not strike first. The line only hints at this, and the Reveal shows the mechanics | DRAFT |
| `traitor.wrong~vo-01` | narrator (Charon) | The wrong name. The one you accused only stares at you. Somewhere on the hill, someone is laughing. | The wrong name. The one you accused only stares at you. Somewhere on the hill, someone is laughing. | 11.2 | wrong accusation, the same for every suspect (MEC-052, DEC-183) | DRAFT |
| `traitor.jakob-sprung~vo-01` | narrator (Charon) | Jakob kept his ledger open all along. He sold him your road, and he is already on it. | Jakob kept his ledger open all along. He sold him your road, and he is already on it. | 11.2 | sprung after chapter-win.03: a Count strike lands with no Ward offered (D-04 §5) | DRAFT |
| `traitor.andrei-sprung~vo-01` | narrator (Charon) | At the burgomaster's house, Andrei lifts the latch and stands aside. He was promised mercy. The mist goes in. | At the burgomaster's house, Andrei lifts the latch and stands aside. He was promised mercy. The mist goes in. | 11.6 | sprung: Lenka taken if present, otherwise 2 skulls on the K1 Citadel. Neutral on which | DRAFT |
| `traitor.marta-sprung~vo-01` | narrator (Charon) | At the castle, the little gate is barred from inside. Marta has gone up to pour his wine, and will not come down again. | At the castle, the little gate is barred from inside. Marta has gone up to pour his wine, and will not come down again. | 13.6 | sprung: the Drawbridge offers only the bridge | DRAFT |

**Totals:** 7 VO lines, est. 87.6 s. Longest 13.6 s.

## Screen copy (DRAFT, not voiced)

| Tag | Text | Where / note |
|---|---|---|
| `n5-drawbridge, option, turn-back` | Turn back | D-04 §6: the quest is left and the marker stays. Optional VO: `n5-drawbridge.turn-back~vo-01` (group 5) |
| `marta isn't with you` | Marta isn't with you | The little gate's disabled reason, after the objects reason. No full stop, matching the C3 reason style |
| `traitor, option, accuse` | Accuse | The suspect's button at their building (D-04 §5), with the standard confirm |
| `traitor, accuse, confirm` | Accuse {suspect}? You can't take it back. | The confirm sheet. `{suspect}` is the engine's name slot |

## Help (C2-04 help table, iPad sheet, not voiced)

| Help id | Text |
|---|---|
| `count-strike` | The Count has found you. **Fight**: up to three rounds. Win one and he leaves for the day. **Ward**: spend the nail, holy water, or the host, and he leaves at once. **Endure**: his strike lands now. |
