Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C2 / 05-session-enter — Session Enter: the join, base board setup, and Connect Tower or Play without Tower

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: High. Tower safety and restore evals are included (EV-07, EV-08, EV-11 to EV-13).

## Checks

### EV-01 — Enter runs MEC-039's nodes in order
- Requirement: the session Enter runs .1 to .12 and .20 to .25 in order (MEC-039).
- Method: unit
- How: new engine test in `engine/loops/session/`, "enter runs MEC-039 in order": step a fresh session through both tracks with the mock tower, recording each board node and prompt.
- Pass evidence: connect track: join → first iPad → base board setup → "Board is set up" → tower choice → Connect Tower → calibrating → calibrate → volume pick → volume played → keep → body (Pick story or Pick Game). Without track: the same up to the tower choice → Play without Tower → body. Nothing else in between.
- Fails if: base board setup comes after the tower block (DEC-104), the volume test is missing, or the tower choice comes after Pick story.

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
- Pass evidence: the board shows, in order: "Set the tower on the centre of the board.", "Lay out the board with the kingdom edges: Arisilon north, Brynthia east, Durnin south, Zenon west.", "Sort the pieces: hero minis, foes, skulls and buildings." The iPad shows one primary button "Board is set up". The board has no buttons. A second iPad's press after the first is a loser and changes nothing.
- Fails if: the steps show on the iPad only, the board shows a button, or the setup needs every iPad.

### EV-04 — The session waits only for the first iPad
- Requirement: no "everyone's in" step; the join QR stays open until every hero is claimed (DEC-274, UI-010).
- Method: playwright
- How: same spec: cold start; one iPad joins; on base board setup and on the tower choice, read the board.
- Pass evidence: base board setup shows as soon as the first iPad joins. The join QR and code stay on the board through Enter and on Pick story. A second iPad can join during the tower choice.
- Fails if: the board waits for a "Start" or "Ready" press, or the QR goes away after the first join.

### EV-05 — One tower question, both buttons named
- Requirement: the board asks "Connect the tower, or play without it?" and the iPad offers "Connect Tower" and "Play without Tower" (SCR-005, DEC-275, GC1-05).
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
- How: same spec: pick volume 1, then "Try another", pick 2, then "Keep".
- Pass evidence: two `sound.play-stateful` commands for Dungeon Complete (#58), with volume 1 and then 2. After Keep, the session's kept volume is 2, and the next tower sound that takes a volume (the move-roll cue) is sent with volume 2.
- Fails if: Keep keeps the first volume, or later sounds ignore the kept volume.

### EV-10 — Screenshots match the mockup
- Requirement: the base board setup, the tower choice and the volume test on the board and the iPad (SCR-022, SCR-005, SCR-006; mockup).
- Method: screenshot
- How: screenshot the board at 1920×1080 and the iPad at 1024×768 on each of the three screens; compare side by side with ./mockup.html, sections `#board-setup`, `#tower-choice`, `#volume`.
- Pass evidence: six pairs attached. Each board dialog is inside the DEC-705 border; the iPad shows only the presses named in EV-03, EV-05 and EV-09.
- Fails if: the board shows controls, or a screen is missing.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — An old autosave still loads
- Requirement: an autosave written before this feature still loads.
- Method: unit
- How: a server test with a checkpoint fixture taken from `main` before this feature: restart the host on it.
- Pass evidence: after the new Enter, Continue (on Pick Game) resumes day and positions from the fixture. A `version-changed` event is logged if the engine version changed.
- Fails if: the old checkpoint throws, or is dropped.

### EV-12 — A restart mid-Enter sends nothing
- Requirement: a host restart during the Enter starts it again from the join and sends no tower command.
- Method: playwright
- How: connect track to "Calibrating", restart the host.
- Pass evidence: the board is back on the join QR; the mock's sent list has nothing after the restart.
- Fails if: the restart replays connect or calibrate.

### EV-13 — Without-the-tower is kept for the session
- Requirement: the session remembers it is playing without the tower.
- Method: unit
- How: engine test: Play without Tower, play a game to Quit story, start a New game.
- Pass evidence: the second game starts with no tower question and no tower command.
- Fails if: each game asks again.

## Assumptions surfaced

- SCR-022's three step texts in EV-03 are Claude's wording → Bob: OK?
- The board's line on the tower choice reads "Connect the tower, or play without it?" (MEC-039 .5) → MEC-039.
- Volume picks are labelled "0", "1" and "2", as SCR-006 names them → SCR-006.
