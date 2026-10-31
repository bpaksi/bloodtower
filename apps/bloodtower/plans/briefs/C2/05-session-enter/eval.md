Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C2 / 05-session-enter — Session Enter: the join, base board setup, and Connect Tower or Play without Tower

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: High. Tower safety and restore evals are included (EV-07, EV-08, EV-18 to EV-20).

## Checks

### EV-01 — Enter runs MEC-039's nodes in order
- Requirement: the session Enter runs .1 to .12 and .20 to .25 in order (MEC-039).
- Method: unit
- How: new engine test in `engine/loops/session/`, "enter runs MEC-039 in order": step a fresh session through both tracks with the mock tower, recording each board node and prompt.
- Pass evidence: connect track: join → first iPad → base board setup → "Board is set up" → tower choice → Connect Tower → calibrating → calibrate → body. Without track: the same up to the tower choice → Play without Tower → body. Body (Pick story): Enable sound → volume pick → volume played → keep → story list (Bob 2026-10-31 10:30 AM ET). Nothing else in between.
- Fails if: base board setup comes after the tower block (DEC-104), the volume test is missing or still runs in the Enter, Enable sound is not the first step of Pick story, or the tower choice comes after Pick story.

### EV-02 — The game loop no longer connects the tower
- Requirement: the tower block runs once per session, in the Enter (DEC-152, MEC-039).
- Method: unit
- How: engine test "game setup has no tower step": run Enter (connect track), then a whole game setup to Begin.
- Pass evidence: the setup screens are pick-story, game-settings, claim-heroes, setup, begin. No `tower-connect`, and no tower command after Enter.
- Fails if: Connect Tower still follows Game settings.

### EV-03 — Base board setup: three steps, one press
- Requirement: the board shows the steps to put the tower on the board, lay out the board with its kingdom edges, and sort the pieces; any joined iPad presses "Board is set up" (SCR-022, DEC-278).
- Method: playwright
- How: new `c2-session-enter.spec.ts`, "base board setup shows its steps and waits for one press": cold start, one iPad joins.
- Pass evidence: the board shows, in order: "Set the tower on the board.", "Lay out the board, kingdom edges matched.", "Sort the pieces: heroes, foes, skulls." (approved mockup wording). The iPad shows one primary body button 'Board is set up'; the board has 0 `button`; a second iPad's press after the first changes nothing (one setup-done event).
- Fails if: the steps show on the iPad only, the board shows a button, or the setup needs every iPad.

### EV-04 — The session waits only for the first iPad
- Requirement: no "everyone's in" step; the join QR stays open until every hero is claimed (DEC-274, UI-010).
- Method: playwright
- How: same spec: cold start; one iPad joins; on base board setup and on the tower choice, read the board.
- Pass evidence: base board setup shows as soon as the first iPad joins. The join QR and code stay on the board through Enter and on Pick story. A second iPad can join during the tower choice. After the first iPad joins the large join QR shrinks to a small QR in a board corner and stays there (M "2 First iPad joined").
- Fails if: the board waits for a "Start" or "Ready" press, or the QR goes away after the first join.

### EV-05 — One tower question, both buttons named
- Requirement: the board asks "Wake the tower, or play tonight without it?" and the iPad offers "Connect Tower" and "Play without Tower" (SCR-005, DEC-275, GC1-05).
- Method: playwright
- How: same spec: after "Board is set up", read the board and the iPad.
- Pass evidence: the iPad shows exactly two buttons with those labels. The board names both choices in text and shows no button. The splash shows neither "Continue" nor "Connect Tower".
- Fails if: one button reads "Continue", or the choice appears on the splash.

### EV-06 — Play without Tower skips every tower node
- Requirement: Play without Tower skips the tower nodes (MEC-039 .12).
- Method: playwright
- How: same spec: press Play without Tower.
- Pass evidence: the next screen is Pick story (or Pick Game while an autosave exists). The mock tower got no command. Later, the game reaches play with no tower prompt.
- Fails if: the volume test or calibrate runs.

### EV-07 — Nothing physical without a press
- Requirement: nothing physical happens automatically (root CLAUDE.md; SCR-005, SCR-006).
- Method: playwright
- How: same spec, connect track: after each press, wait 3 s and read the mock tower's sent list.
- Pass evidence: connect is sent only on Connect Tower; calibrate only on its press; each Dungeon Complete only on a volume press; no command at any other time. No command on page load or after a restart.
- Fails if: calibrate follows connect on its own, or the volume test plays all three volumes in a row.

### EV-08 — A failed connect or calibrate goes back to the choice
- Requirement: a failed connect or calibrate in the Enter loops back to the choice (MEC-039 .11).
- Method: playwright
- How: same spec, with the mock set to fail connect; then fail calibrate on the next try.
- Pass evidence: each failure shows its error code on the iPad that pressed and a toast on the board, then the tower choice shows again with both buttons. Nothing retries on its own.
- Fails if: the failure leaves the session stuck on "Calibrating", or retries.

### EV-09 — The volume test: one volume per press, keep or try another
- Requirement: Dungeon Complete at the picked volume, then Keep or try another (SCR-006, MEC-039 .20 to .25).
- Method: playwright
- How: same spec, on Pick story after Enable sound: pick volume 1, then "Try another", pick 2, then "Keep". Also pick Volume 0 once; one `sound.play-stateful` with volume 0.
- Pass evidence: two `sound.play-stateful` commands for Dungeon Complete (#58), with volume 1 and then 2. After Keep, the session's kept volume is 2, and the next tower sound that takes a volume (the move-roll cue) is sent with volume 2.
- Fails if: Keep keeps the first volume, or later sounds ignore the kept volume.

### EV-10 — Screenshots match the mockup
- Requirement: the base board setup, the tower choice and the volume test on the board and the iPad (SCR-022, SCR-005, SCR-006; mockup).
- Method: screenshot
- How: screenshot the board at 1920×1080 and the iPad at 768×1024 portrait on each of the volume states 7a, 7b and 7c and on the base board setup and tower choice screens; compare side by side with ./mockup.html, mockup.html#s=N (tab names per EV-14).
- Pass evidence: the EV-14 DOM checks pass; ten screenshot pairs (setup, tower choice, 7a, 7b, 7c) attached for review only; the 7a pair shows the Pick story backdrop on the board with the volume line greyed.
- Fails if: the board shows controls, or a screen is missing.

### EV-11 — test pack drops lay-out-board
- Requirement: P:23.
- Method: unit
- How: load `packs/test/pack.yaml`.
- Pass evidence: setup step ids contain `place-heroes` and not `lay-out-board`.
- Fails if: `lay-out-board` remains.

### EV-12 — old screen id gone
- Requirement: P:24.
- Method: unit/grep
- How: `rg -n "'tower-connect'|\"tower-connect\"" apps/bloodtower/src`; full e2e suite.
- Pass evidence: 0 screen-id hits; full e2e passes.
- Fails if: any hit.

### EV-13 — Tonight's tower choice survives a restart after the Enter
- Requirement: after the Enter, a host restart keeps tonight's tower choice and does not re-run the Enter (Bob 2026-10-31).
- Method: playwright
- How: Play without Tower, reach Pick story, restart host; repeat with Connect Tower.
- Pass evidence: after restart the session resumes with tonight's tower choice and no Enter; it is back at Pick story; the tower question is not asked again; the mock tower got no command on restart.
- Fails if: the Enter re-runs, the tower question shows, or a tower command is sent.

### EV-14 — Enter screens match the mockup
- Requirement: DOM checks; board 1920×1080, iPad 768×1024 portrait. (Body buttons only: `[data-screen] button`, excluding the bottom toolbar's "?" and Menu gear `bt-iconbtn`.)
- Method: playwright
- How: walk M tabs 1, 2, 3, 4, 5, 6, 7a, 7b, 7c.
- Pass evidence: Join (M "1"): board QR `img|canvas|svg` and join URL `/^https?:\/\/.+\/join/`; iPad `Pick <hero>` rows and counter `/^\d+ of \d+ picked$/`. First iPad joined (M "2"): board step 1 line and a corner QR; that iPad shows a waiting line and 0 body buttons. Base board setup (M "3"): board `li` ×3 per EV-03; board 0 buttons; iPad one body button "Board is set up", primary. Tower choice (M "4"): board line "Wake the tower, or play tonight without it?"; iPad "Connect Tower" (primary) then "Play without Tower"; splash shows neither "Continue" nor "Connect Tower". Connecting (M "5"): iPad 0 body buttons; board non-empty progress line. Failed (M "6"): status "Tower not found" and line "The tower did not answer. Try again, or play without it."; iPad "Connect Tower", "Play without Tower"; error code on the pressing iPad (EV-08). Enable sound (M "7a"): board shows the Pick story backdrop and exactly one "How loud should the tower be? Press one to hear it." inside `.bt-row--disabled[aria-disabled="true"]`, visible; iPad body shows only "Tap once to turn on this iPad's sound." and one primary button "Enable sound". Levels, Keep disabled (M "7b"): board line "How loud should the tower be? Press one to hear it.", not inside `.bt-row--disabled` or `[aria-disabled="true"]`; iPad "Volume 0", "Volume 1", "Volume 2", "Keep" (primary, `disabled`), "Try another", all shown together as in the mockup. Volume played, Keep enabled (M "7c"): same line and buttons after a volume press; Keep enabled.
- Fails if: any board screen has a `button`, an iPad shows extra/missing body buttons, or a line differs.; or the volume line is missing or at full strength in 7a, or still greyed in 7b.

### EV-15 — Audio stays blocked until the Enable sound tap, per iPad
- Requirement: Bob 2026-10-31 10:30 AM ET: Enable sound is the first step on Pick story; each iPad needs its own unlock.
- Method: playwright
- How: two iPad contexts reach Pick story (launch Chromium without `--autoplay-policy=no-user-gesture-required`). Before any tap, read each iPad's `AudioContext.state` and the page's played-sound log. iPad A taps "Enable sound"; read both again.
- Pass evidence: before the tap each iPad's body shows exactly the line "Tap once to turn on this iPad's sound." and one primary button "Enable sound" (0 other body buttons, no other text, no story list; chrome only otherwise, locked copy Bob 2026-10-31 10:33 ET), `AudioContext.state` is `suspended`, and no sound has played. After A's tap: A's state is `running`; B is still `suspended` and still shows only "Enable sound".
- Fails if: the prompt or button wording differs, anything else shows in the body, audio starts or a sound plays before the tap, the story list or levels show first, or one iPad's tap unlocks another.

### EV-16 — Levels show after the unlock
- Requirement: Bob 2026-10-31 10:30 AM ET: then the player sets levels.
- Method: playwright
- How: same spec: tap "Enable sound" on one iPad.
- Pass evidence: that iPad next shows "Volume 0", "Volume 1", "Volume 2", "Keep" and "Try another" with the line "How loud should the tower be? Press one to hear it."; the story list shows only after Keep.
- Fails if: the levels are skipped, show before the tap, or the story list shows before Keep.

### EV-17 — Keep is disabled before any playback
- Requirement: Bob 2026-10-31 10:30 AM ET: Keep stays disabled until a volume has been played.
- Method: playwright
- How: same spec, run twice. With the tower (connect track): after Enable sound, read Keep and press it; then press Volume 1 and wait for the mock tower's `sound.play-stateful` command; read Keep. Without the tower (Play without Tower): the same, but wait for the iPad's played-sound log to record the Volume 1 sound.
- Pass evidence: on both tracks, before any volume press Keep has `disabled`, pressing it changes nothing and no volume is stored. With the tower: Keep turns enabled only after the mock logged `sound.play-stateful` for Volume 1. Without the tower: the mock got no command, and Keep turns enabled only after the iPad's played-sound log has the Volume 1 entry. Keep then stores volume 1.
- Fails if: Keep is enabled before the proof of playback on either track, a default volume is kept, or the no-tower track sends a tower command.

## Survival evals (one per survival invariant in plan.md)

### EV-18 — An old autosave still loads
- Requirement: an autosave written before this feature still loads.
- Method: unit
- How: a server test with a checkpoint fixture taken from `main` before this feature: restart the host on it.
- Pass evidence: the fixture's engine version differs from HEAD's; after the new Enter, Continue (on Pick Game) resumes day and positions from the fixture; exactly one `version-changed` event is logged.
- Fails if: the old checkpoint throws, or is dropped.

### EV-19 — A restart mid-Enter sends nothing
- Requirement: a host restart during the Enter starts it again from the join and sends no tower command.
- Method: playwright
- How: connect track to "Calibrating", restart the host.
- Pass evidence: the board is back on the join QR; the mock's sent list has nothing after the restart.
- Fails if: the restart replays connect or calibrate.

### EV-20 — Without-the-tower is kept for the session
- Requirement: the session remembers it is playing without the tower.
- Method: unit
- How: engine test: Play without Tower, play a game to Quit story, start a New game.
- Pass evidence: the second game starts with no tower question and no tower command.
- Fails if: each game asks again.

## Assumptions surfaced

- SCR-022's three step texts in EV-03 are the approved mockup wording.
- The board's line on the tower choice reads "Wake the tower, or play tonight without it?" (MEC-039 .5; approved mockup) → MEC-039.
- Volume picks are labelled "Volume 0/1/2" (approved mockup).
- The levels are the existing volume step (SCR-006) moved to Pick story after Enable sound; on the without-tower track they set the iPad's level only. Bob approved 2026-10-31 10:33 ET: levels = existing Volume 0/1/2 step with Keep/Try another, moved to Pick story.
