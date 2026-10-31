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
7. Volume (.20 to .25, SCR-006, SND-058): moved to the start of Pick story, after Enable sound (Bob 2026-10-31 10:30 AM ET; see "Sound first on Pick story"). Board "How loud should the tower be? Press one to hear it."; iPad Volume 0 / 1 / 2, each plays Dungeon Complete once only on press; Keep and Try another show with them (mockup). Keep is disabled until a volume has been played.
8. Without tower: states 5 and 6 skipped (DEC-275, DEC-305); Enable sound and the levels still run on Pick story, for the iPad's level only.
- Glyphs and facing (.13 to .19) left out until feature 12.

## Sound first on Pick story (Bob 2026-10-31 10:30 AM ET)
Browsers block audio until a tap, so sound is the first thing on Pick story:
1. State 7a, Enable sound: each iPad shows only the prompt "Tap once to turn on this iPad's sound." and one primary button "Enable sound", plus the chrome (bottom toolbar: "?" at the left, Menu gear at the right; feature 04); nothing else (locked copy, Bob 2026-10-31 10:33 ET). Its tap unlocks that iPad's browser audio. Every iPad needs its own tap; one iPad's tap never unlocks another. No sound plays before it. The Story board during 7a shows the Pick story backdrop with the volume line "How loud should the tower be? Press one to hear it." greyed out; it shows at full strength from 7b on (Bob 2026-10-31 6:15 PM ET; reverses the earlier no-line default). Mockup note: the 7a Story board frame in mockup.html/mockup.png still shows no volume line and needs an Illusionist update to show it greyed out.
2. State 7b, set levels: right after its unlock, that iPad shows the volume step (state 7). Keep stays disabled until a volume has been played.
3. After Keep: the story list.

## Player actions
Scan QR; Board is set up (any iPad); Connect Tower / Play without Tower; Enable sound (each iPad, on Pick story); Volume 0/1/2; Keep (disabled until a volume has played) / Try another. Nothing physical without a press (SCR-005).

## Mechanics
MEC-039, DEC-273, DEC-274, DEC-152, DEC-275, DEC-104 (board before tower), DEC-278, SCR-015, SCR-022, SCR-005, SCR-006, UI-010, CUE-011, AREA-100.

- Restart: mid-Enter starts again from the join; after the Enter, on a restart the session resumes with tonight's tower choice and no Enter (no tower question) (Bob 2026-10-31).

## What happens next
Today: Pick story (SCR-007) for the first game, starting with Enable sound and levels. After feature 06: the session screen (SCR-021).

## Open questions
- Resolved: the three step texts above ship (mockup wins). Art per step still has no ART card.
- Splash pair (Continue / Connect Tower) is removed; where does Continue live before feature 06 lands? Assumed Pick story (DEC-283).
- What the iPad shows while waiting (states 1, 5) is not on a card. Assumed: a waiting line, no buttons.
