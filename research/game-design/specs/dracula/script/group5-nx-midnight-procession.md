# Dracula, Group 5 (12/15): `nx-midnight-procession` (rewrite)

**Status: DRAFT** (pending DEC-785 / OPEN RULING 6). Loremaster, 2026-11-10. Rewritten from main's `assets/stories/dracula/scripts/nx-midnight-procession.md` around the new plot: Lenka free (she joins at the Burgomaster's House), pool heroes, four chapters, nothing private, Short and Standard only, no Tomas. Lenka's face is never described, and the Count is unseen until his lair.

- **Where / kind:** Recurring moment, once a chapter in chapters 1 to 3, at midnight (IDEA-077)
- **D-01 intent:** Once a chapter the dead who tried walk past, and one ghost speaks to a companion's tie (IDEA-077)
- **D-02:** §9: answering Mother Ursula raises Agnes's loyalty, and answering Jozef raises Wren's. Gamewright 2026-11-10: the ghost is a seeded value drawn at Begin (DEC-849) and revealed here. D-02 and D-04 give no list, so the seeded list is taken to be these three, one per story companion. Each reveal line works whether or not that companion is present: it speaks of them, not to them. No private lines.
- **Painting (`painting.nx-midnight-procession`, Illusionist, one line):** A village street at midnight in mist. A line of dead hunters in old coats and older armour walks through walls, carrying lanterns that give no light. One ghost has stopped and turned toward the viewer, its face lost in its hood.

**Estimates:** 0.40 s per word + 4.0 s, fitted to the 13 Charon masters in C5-05 (`/workspace/c5-05-art/voice/MANIFEST.md`); expect about ±3 s. Cap 20 s (about 40 words). Captions = spoken text, word for word. A line whose speaker is not with the group is skipped (D-02 §10), and the narrator carries the plot without it. Ids: base `<scene>.NN~vo-01`, goal or lair `<scene>.NN~<value>.vo-01`, events `<scene>.<event>~vo-01`.

| Asset id | Speaker (voice) | Spoken text | Caption | Est. s | When / intent | Status |
|---|---|---|---|---|---|---|
| `nx-midnight-procession.01~vo-01` | narrator (Charon) | At the twelfth stroke the dead come walking. | At the twelfth stroke the dead come walking. | 7.2 | opening (kept from the original .01); clip 1 of 2 (caption cap 120) | DRAFT |
| `nx-midnight-procession.01~vo-02` | narrator (Charon) | Every hunter who ever climbed that hill is in the line. They do not stop. One of them does. | Every hunter who ever climbed that hill is in the line. They do not stop. One of them does. | 11.6 | clip 2 of 2, plays right after nx-midnight-procession.01~vo-01 | DRAFT |
| `nx-midnight-procession.ursula~vo-01` | ursula (Vindemiatrix) | Sister Agnes kept my infirmary after me, and kept it badly. Tell her I am not angry. Tell her to come and ask me why. | Sister Agnes kept my infirmary after me, and kept it badly. Tell her I am not angry. Tell her to come and ask me why. | 14.0 | event ghost for Agnes: Mother Ursula | DRAFT |
| `nx-midnight-procession.jozef~vo-01` | jozef (Achird) | Tell Wren Kessel it was the right stake. She did right by her father. Tell her there is more, if she will walk with me. | Tell Wren Kessel it was the right stake. She did right by her father. Tell her there is more, if she will walk with me. | 14.0 | event ghost for Wren: Jozef Kessel | DRAFT |
| `nx-midnight-procession.gerhardt~vo-01` | gerhardt (Rasalgethi) | Tell the apothecary's boy his page one was wrong. The affliction is not sent. It is invited. | Tell the apothecary's boy his page one was wrong. The affliction is not sent. It is invited. | 10.8 | event ghost for Emeric: Gerhardt Albrecht | DRAFT |
| `nx-midnight-procession.answer~vo-01` | narrator (Charon) | You step into the line beside the ghost, and walk a while with the dead. You step out knowing something you did not. | You step into the line beside the ghost, and walk a while with the dead. You step out knowing something you did not. | 13.2 | option Answer: a tie clue; that companion's loyalty +1 | DRAFT |
| `nx-midnight-procession.turn-away~vo-01` | narrator (Charon) | You turn away. The ghost bows, and leaves a vial of water on the step, cold enough to ring. | You turn away. The ghost bows, and leaves a vial of water on the step, cold enough to ring. | 11.6 | option Turn away: one holy water | DRAFT |
| `nx-midnight-procession.02~vo-01` | narrator (Charon) | The line walks on toward the castle. By morning there may be one more lantern in it, unless you are careful. | The line walks on toward the castle. By morning there may be one more lantern in it, unless you are careful. | 12.4 | end (kept from the original .05) | DRAFT |

**On-screen labels (DRAFT, not voiced):**

| Tag | Text | Effect / note |
|---|---|---|
| `nx-midnight-procession, option, answer` | Answer | a tie clue; loyalty +1 for the ghost's companion |
| `nx-midnight-procession, option, turn-away` | Turn away | one holy water |

**Totals:** 8 lines, est. 94.8 s (every line counted, including variants and events). Longest 14.0 s.
