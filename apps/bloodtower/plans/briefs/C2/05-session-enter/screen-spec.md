# Screen spec: C2/05: Session Enter
Gamewright, 2026-10-31. Design only. Story copy and voiced words: Loremaster fills every [COPY: ...].

## Purpose
Start the evening once: join, base board out, tower decided and ready, before the first game (AREA-100 scene 1, MEC-039 .1 to .12, .20 to .25).

## States (board shows, iPad only presses: DEC-278; all dialogs in the DEC-705 frame)
1. Join (.1): large QR + join URL (UI-010) + "Scan with each iPad. Then pick who this iPad speaks for at the table: Pick Hero A … N of N picked.". Large until the first iPad joins, then small in a corner for the rest of the Enter (mockup wins over DEC-274/UI-010 timing).
2. First iPad joined (.2, SCR-015): session moves on; later iPads may still join.
3. Base board setup (.3, SCR-022): three steps on the board: tower on the board, board laid out with kingdom edges, RtDT pieces sorted. Step 1 "Set the tower on the board." Step 2 "Lay out the board, kingdom edges matched." Step 3 "Sort the pieces: heroes, foes, skulls.". iPad: "Board is set up".
4. Tower choice (.5, SCR-005): "Wake the tower, or play tonight without it?". iPad: Connect Tower (primary), Play without Tower.
5. Connecting / Calibrating (.8 to .10, CUE-011): board progress state. No iPad buttons.
6. Connect or calibrate failed (.11): back to state 4 (DEC-711 notes the loop). status "Tower not found", line "The tower did not answer. Try again, or play without it.".
7. Volume (.20 to .25, SCR-006, SND-058): moved to the start of Pick story, connect track only (Bob 2026-10-31 10:30 AM ET; DEC-903 removed the per-iPad Enable sound step before it; see "Sound on Pick story"). Board "How loud should the tower be? Press one to hear it."; iPad Volume 0 / 1 / 2, each plays Dungeon Complete once only on press; Keep and Try another show with them (mockup). Keep is disabled until a volume has been played.
8. Without tower: states 5, 6 and 7 skipped (DEC-275, DEC-305, DEC-903). No volume step and no volume line; Pick story opens on the story list.
- Glyphs and facing (.13 to .19) left out until feature 12.

## Sound on Pick story (DEC-903, Gamewright 2026-11-12)
No iPad plays sound, so there is no per-iPad unlock (DEC-201). The Story board's audio is unlocked by the first click or key on the landing page (SCR-003, feature 02).
1. Connect track: Pick story opens on the volume step (state 7) on every iPad. The Story board shows the line "How loud should the tower be? Press one to hear it." at full strength. Keep stays disabled until a volume has been played on the tower.
2. After Keep: the story list.
3. Without tower: no volume step, no volume line; Pick story opens on the story list.

Removed 2026-11-12 (DEC-903): state 7a, the prompt "Tap once to turn on this iPad's sound.", its button "Enable sound" (locked copy, Bob 2026-10-31 10:33 AM ET), and the greyed-out board volume line (Bob 2026-10-31 6:15 PM ET).

## Player actions
Scan QR; Board is set up (any iPad); Connect Tower / Play without Tower; Volume 0/1/2; Keep (disabled until a volume has played) / Try another. Nothing physical without a press (SCR-005).

## Mechanics
MEC-039, DEC-273, DEC-274, DEC-152, DEC-275, DEC-104 (board before tower), DEC-278, SCR-015, SCR-022, SCR-005, SCR-006, UI-010, CUE-011, AREA-100.

- Restart: mid-Enter starts again from the join; after the Enter, on a restart the session resumes with tonight's tower choice and no Enter (no tower question) (Bob 2026-10-31).

## What happens next
Today: Pick story (SCR-007) for the first game, starting with the levels (connect track only). After feature 06: the session screen (SCR-021).

## Open questions
- Resolved: the three step texts above ship (mockup wins). Art per step still has no ART card.
- Splash pair (Continue / Connect Tower) is removed; where does Continue live before feature 06 lands? Assumed Pick story (DEC-283).
- What the iPad shows while waiting (states 1, 5) is not on a card. Assumed: a waiting line, no buttons.
