# Dracula, Group 5 (13/15): `n5-drawbridge` (rewrite)

**Status: DRAFT** (pending DEC-785 / OPEN RULING 6). Loremaster, 2026-11-10. Rewritten from main's `assets/stories/dracula/scripts/n5-drawbridge.md` around the new plot: Lenka free (she joins at the Burgomaster's House), pool heroes, four chapters, nothing private, Short and Standard only, no Tomas. Lenka's face is shown from chapter 1 (travelling hood, face clear; the Tome changes it — see lenka-look.md). The Count is unseen until his lair.

- **Where / kind:** A Tower-adjacent space: the Drawbridge (plain scene). Chapter 4. Needs all three objects; fires the Tower trigger (IDEA-091, IDEA-147, DEC-749)
- **D-01 intent:** Three objects: the loud bridge or Marta's little gate; Lenka comes
- **D-02:** §6: the options are enabled only when the present group holds all three objects (reason: 'You need the blade, the Lantern and the Tome here'). §7: the bridge costs 1 skull on the most-skulled building and sets `bridge-loud`. The little gate needs Marta as an ally: with the party and not the traitor. An unmasked traitor doesn't count (Gamewright 2026-11-10). It costs 2 hit points from each present hero (D-04 §6). Turn back leaves the quest. In Short there is no traitor, and Marta waits at the gate and counts as with the party (Gamewright 2026-11-10), so the little gate is always open to the objects there. Her `.04` line introduces her, because Short never meets her before.
- **Painting (`painting.n5-drawbridge`, Illusionist, one line):** A castle across a bottomless chasm, its drawbridge raised. A little side gate along the wall shows a lamp turned low, and a girl in a maid's apron behind it. The hunters stand on the road in silhouette. Lenka stands with them, face clear under her travelling hood, the violet mark of the reveal at her mouth and under her eyes. The battlements are dark. The Count is not shown.

**Estimates:** 0.40 s per word + 4.0 s, fitted to the 13 Charon masters in C5-05 (`/workspace/c5-05-art/voice/MANIFEST.md`); expect about ±3 s. Cap 20 s (about 40 words). Captions = spoken text, word for word. A line whose speaker is not with the group is skipped (D-02 §10), and the narrator carries the plot without it. Ids: base `<scene>.NN~vo-01`, goal or lair `<scene>.NN~<value>.vo-01`, events `<scene>.<event>~vo-01`.

| Asset id | Speaker (voice) | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `n5-drawbridge.01~vo-01` | narrator (Charon) | Three objects. A brother's blade, a saint's light, and his own book. The castle road is the only road left in Vellmoor. | Three objects. A brother's blade, a saint's light, and his own book. The castle road is the only road left in Vellmoor. | 12.8 | opening (replaces 'Five nights. Three keys.') | DRAFT |
| `n5-drawbridge.02~vo-01` | narrator (Charon) | A chasm with no bottom, and across it the drawbridge, raised. Along the wall, a little side gate the servants used. | A chasm with no bottom, and across it the drawbridge, raised. Along the wall, a little side gate the servants used. | 12.4 | the two ways | DRAFT |
| `n5-drawbridge.03~vo-01` | count (Algieba) | Welcome to my house! Enter freely and of your own will! | Welcome to my house! Enter freely and of your own will! | 8.4 | Stoker; a voice from the battlements, unseen | DRAFT |
| `n5-drawbridge.04~vo-01` | marta (Aoede) (skipped if absent) | Marta. I pour his wine up there. I'll open the little gate, if you ask. It's the slow way, but he never watches it. | Marta. I pour his wine up there. I'll open the little gate, if you ask. It's the slow way, but he never watches it. | 13.6 | Marta, if she is an ally: with the party and not the traitor. In Short she waits here and always counts | DRAFT |
| `n5-drawbridge.05~vo-01` | lenka (Leda) (skipped if absent) | And don't you dare leave me at the bottom of the hill. I'm coming up with you. | And don't you dare leave me at the bottom of the hill. I'm coming up with you. | 10.8 | Lenka insists, if with the group (DEC-741) | DRAFT |
| `n5-drawbridge.bridge~vo-01` | narrator (Charon) | The drawbridge comes down, slow as a held breath. You walk in by the front door, as guests. | The drawbridge comes down, slow as a held breath. You walk in by the front door, as guests. | 11.2 | option Cross the bridge (from the original); clip 1 of 2 (caption cap 120) | DRAFT |
| `n5-drawbridge.bridge~vo-02` | narrator (Charon) | Above you, something on the battlements turns its head. | Above you, something on the battlements turns its head. | 7.6 | clip 2 of 2, plays right after n5-drawbridge.bridge~vo-01 | DRAFT |
| `n5-drawbridge.bridge-quiet~vo-01` | narrator (Charon) | Someone inside works the chains. The drawbridge comes down without a sound. Nothing on the battlements turns its head. | Someone inside works the chains. The drawbridge comes down without a sound. Nothing on the battlements turns its head. | 11.6 | event: Cross the bridge after Marta was unmasked (D-02 G-16). It replaces .bridge: no skull, no `bridge-loud` | DRAFT |
| `n5-drawbridge.gate~vo-01` | narrator (Charon) | You go the long way, along the lip of the chasm, the way the servant girls once left. It costs you. | You go the long way, along the lip of the chasm, the way the servant girls once left. It costs you. | 12.4 | option The little gate: 2 hit points from each present hero; clip 1 of 2 (caption cap 120) | DRAFT |
| `n5-drawbridge.gate~vo-02` | narrator (Charon) | But nothing on the battlements turns its head. | But nothing on the battlements turns its head. | 7.2 | clip 2 of 2, plays right after n5-drawbridge.gate~vo-01 | DRAFT |
| `n5-drawbridge.turn-back~vo-01` | narrator (Charon) | Not yet. You turn back down the road. The castle will wait. It has always waited. | Not yet. You turn back down the road. The castle will wait. It has always waited. | 10.4 | option Turn back: the quest is left and the marker stays (D-04 §6) | DRAFT |

**On-screen labels (DRAFT, not voiced):**

| Tag | Text | Effect / note |
|---|---|---|
| `n5-drawbridge, option, bridge` | Cross the bridge | 1 skull on the most-skulled building, and the Banquet's statues strike first. If Marta was unmasked: no skull, and they don't strike first (D-02 G-16) |
| `n5-drawbridge, option, gate` | Take the little gate | needs Marta with the party and not the traitor; 2 hit points from each present hero (D-04 §6) |
| `n5-drawbridge, option, turn-back` | Turn back | the quest is left; the marker stays |
| `you need the blade, the lantern and the tome here` | You need the blade, the Lantern and the Tome here | D-02 §6's reason, kept |
| `marta isn't with you` | Marta isn't with you | the gate's second disabled reason, after the objects reason (D-04 §6) |

**Totals:** 11 lines, est. 118.4 s (every line counted, including variants and events). Longest 13.6 s.
