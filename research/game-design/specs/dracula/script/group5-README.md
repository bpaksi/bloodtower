# Dracula, Group 5: the 15 rewritten scenes (index)

**Status: DRAFT** (pending DEC-785 / OPEN RULING 6). Loremaster, 2026-11-10 (rev 5, Lenka's face shown from ch.1; reveal changes it). There is one file per scene, `group5-<scene>.md`, and all the lines are combined in `group5.json`. Estimates use 0.40 s/word + 4.0 s. Captions = spoken text.

| Scene | Lines | Est. s |
|---|---|---|
| n1-lantern-and-bell | 8 | 83.6 |
| n1-burgomasters-house | 11 | 125.6 |
| n1-open-grave | 14 | 160.0 |
| n1-fortune-reading | 16 | 152.4 |
| n23-sergius-blade | 8 | 85.2 |
| n23-catacombs-of-saint-ysolde | 8 | 89.6 |
| n2-burgomasters-funeral | 15 | 170.8 |
| n3-fly-eaters-cell | 14 | 144.8 |
| n4-earth-boxes | 13 | 142.0 |
| n4-finding-the-tome | 14 | 162.0 |
| nx-pressed-flower | 4 | 47.2 |
| nx-midnight-procession | 8 | 94.8 |
| n5-drawbridge | 11 | 118.4 |
| n5-portrait-gallery | 7 | 78.8 |
| n5-final-confrontation | 11 | 123.6 |
| **Total** | **162** | **1778.8** (longest 14.8) |

## Gamewright answers applied (2026-11-10)
- **Tomas** is out for good. No lines.
- **Open Grave, Bar the gate:** costs 2 HP from the hero who bars it, with no battle. The line no longer mentions the letters.
- **Funeral:**
  - The nail is a Ward source that counts once, and it **replaces** the funeral's holy water. `nailed-after` hands over a bent nail, and no funeral line or note grants holy water. Group 3's Ward reason is now "Needs the nail, holy water, or the host" (the order a Ward spends them, G-12), and group 6's help line matches.
  - Lenka's loyalty +1 is automatic at the funeral's end when she is present. It is marked by the new event `n2-burgomasters-funeral.lenka-stays~vo-01` (Lenka).
- **Pressed flower:** plays only with Lenka in the party.
- **Procession:**
  - The ghost is seeded at Begin (DEC-849) and revealed here.
  - The seeded list is Ursula, Jozef and Gerhardt (confirmed).
  - Each reveal line speaks *of* its companion ("Tell Sister Agnes…"), so it works when that companion is absent.
- **Drawbridge:** Marta opens the little gate only if she is with the party and not the traitor. In Short there is no traitor; she waits at the gate and counts as with the party, so her `.04` line introduces her ("Marta. I pour his wine up there…").
- **The traitor** plays at Standard and Long. The clue notes say so.
- **Clue ids:** `<scene>.clue-<suspect>~vo-NN`, as they already were.
- **The Fly-Eater's list** includes the host, as it already did.
- **Party of 1–4:** no line names or counts the hunters, who are addressed as "you". Fixed across all groups, see the parent report.
- **"Children of the dark"** stays (Bob).
- **Andrei's voice:** Orus is proposed, and the Illusionist decides.

## Calls made
0. **Captions are 120 characters at most** (A1-13, D-06). A line that ran over is either cut or split into two consecutive clips of the same moment, `…~vo-01` then `…~vo-02` (the `vo-NN` clip slot of DEC-856, as in the old `script.yaml`). Splitting this way means no later line has to be renumbered. The Drawbridge also gains `bridge-quiet` for an unmasked Marta (G-16).
1. At the blade door the Count is a silhouette only. The `his-study` lair pays off the opening's letter.
2. Ludmila's portrait stays covered. Lenka's face is shown from chapter 1 (travelling hood, face clear). The Tome is the reveal: her face changes (violet mark; see lenka-look.md); it is not unveiled. "Lenka's face" in the Tome line is that statement of the returned soul.
3. Dorka gets a new reason: she went to offer herself.
4. The earth-box clips are events: `box-1`, `box-2` and `box-last`.
5. The Reading, Tome and Blade lines don't name a building, because the board names the sites.
6. The Drawbridge has **Turn back** (D-04 §6), with an optional line `n5-drawbridge.turn-back~vo-01`.
7. The ids `n1-long-night` and `nx-midnight-procession` are engine ids, and they keep "night".

## Open for Gamewright
- None. Every group 5 question is answered.
