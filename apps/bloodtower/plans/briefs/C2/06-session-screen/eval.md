Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C2 / 06-session-screen — The session screen and Done for tonight

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: High. Restore and tower-safety evals included (EV-07, EV-08, EV-11 to EV-13).

## Checks

### EV-01 — The session screen's five parts, in order
- Requirement: the session screen shows Continue (only while an autosave exists), New game, tonight's games, Done for tonight, and the tower's state, top to bottom (SCR-021, DEC-709).
- Method: playwright
- How: new `c2-session-screen.spec.ts`, "session screen after a quit": play to day 2, Menu → Quit story, confirm.
- Pass evidence: the board lists, in order: Continue, New game, Tonight's games (one row, "Proving Grounds", marked quit), Done for tonight, and the tower line ("Tower in play" or "Without the tower"). The iPad offers Continue, New game and Done for tonight as buttons, Continue first. The board has no buttons.
- Fails if: Continue is missing after a quit, sits below New game, or the list is empty.

### EV-02 — No autosave, no Continue
- Requirement: Continue shows only while an autosave exists (DEC-709).
- Method: unit
- How: engine test "no autosave hides Continue": a fresh session, then a session whose autosave was replaced and then cleared.
- Pass evidence: no Continue offer and no Continue line on the board view in either case.
- Fails if: Continue shows greyed (it is left out, not greyed: it is not a Menu item).

### EV-03 — Pick Game is gone; Pick story keeps Continue
- Requirement: Pick Game goes; Continue sits on the session screen and on Pick story (DEC-709, DEC-283).
- Method: playwright
- How: same spec: restart the host with an autosave, run the Enter, reach the body.
- Pass evidence: the first screen after the Enter is Pick story (never `pick-game`), and it offers Continue above the stories. No view anywhere carries the screen id `pick-game`.
- Fails if: Pick Game still shows, or Pick story has no Continue.

### EV-04 — New game asks before replacing the save
- Requirement: while an autosave exists, New game asks "This replaces the saved game. Are you sure?" first (DEC-709).
- Method: playwright
- How: same spec: on the session screen with an autosave, press New game; first answer No, then press again and answer Yes.
- Pass evidence: No returns to the session screen with Continue still there and the autosave unchanged. Yes goes to Pick story; Continue is gone; the next game writes a new autosave only at its Begin.
- Fails if: New game clears the autosave without asking, or clears it on No.

### EV-05 — Done for tonight asks, then ends the session
- Requirement: Done for tonight asks "Are you sure?"; then the board returns to the landing painting, and the iPads show "The session is over" with no buttons and leave (DEC-713, DEC-628).
- Method: playwright
- How: same spec: press Done for tonight; answer No once, then Yes.
- Pass evidence: No returns to the session screen. Yes: the board shows the landing painting (SCR-002) with no dialog; every iPad shows "The session is over" and no button; the host lists no joined device. The autosave row is still in the database.
- Fails if: a Goodbye screen shows, an iPad keeps a button, or the autosave is dropped.

### EV-06 — A new session after Done for tonight starts at the join
- Requirement: a new session from the landing painting starts at the join again, with base board setup and the tower block (DEC-713, MEC-039 .1).
- Method: playwright
- How: same spec: after EV-05, open the board again from `/` and join one iPad.
- Pass evidence: the join QR, then base board setup, then the tower choice, as feature 05's EV-01.
- Fails if: the new session skips straight to Pick story.

### EV-07 — Tower to idle, once, only if in play
- Requirement: the tower settles to idle if it is in play; it stays connected; nothing more is sent (DEC-713, CUE-012).
- Method: playwright
- How: two runs: connect track, then Done for tonight; and without-the-tower track, then Done for tonight.
- Pass evidence: connect run: exactly one idle command (`lighting.all-off`, as today's idle) after Yes, none before, no disconnect. Without run: no tower command at all.
- Fails if: idle is sent on No, sent twice, or sent to a tower that is not in play.

### EV-08 — Tower lost between games
- Requirement: a tower lost between games shows "Tower lost"; nothing reconnects on its own; the next New game or Continue runs the tower block again first (DEC-711).
- Method: playwright
- How: same spec: connect track, play, quit to the session screen, drop the mock tower. Wait 5 s. Press New game.
- Pass evidence: the tower line reads "Tower lost"; no command is sent during the wait; there is no Reconnect button on the session screen. After New game, the tower choice (Connect Tower or Play without Tower) shows before Pick story.
- Fails if: a Reconnect button is offered, the tower reconnects itself, or New game goes straight to Pick story.

### EV-09 — Every iPad dropped between games: the join QR
- Requirement: between games a drop blocks nothing; if every iPad has dropped, the board shows the join QR until one joins (DEC-712, DEC-274).
- Method: playwright
- How: same spec: on the session screen, close one of two iPads, then the other; then rejoin one.
- Pass evidence: after the first drop the session screen stays, with no pause. After the second, the board shows the join QR and code. After a rejoin the session screen is back with Continue still offered.
- Fails if: a drop between games pauses, or the session ends.

### EV-10 — Screenshots match the mockup
- Requirement: the session screen, the New game confirm, Done for tonight's end state and "Tower lost" (SCR-021, DEC-709, DEC-711, DEC-713; mockup).
- Method: screenshot
- How: screenshot the board at 1920×1080 and an iPad at 1024×768 for each; compare side by side with ./mockup.html sections `#session`, `#confirm-new`, `#session-over`, `#tower-lost`.
- Pass evidence: eight images attached, each matching its section's parts and order.
- Fails if: a part is missing or out of order.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — The autosave survives Done for tonight and a restart
- Requirement: an autosave left by a quit stays after Done for tonight; Continue resumes it (DEC-208, DEC-713).
- Method: playwright
- How: walk once, quit, Done for tonight, restart the host, new session through the Enter, Continue on Pick story.
- Pass evidence: day, group positions, purse and claims match the quit game; the seed is the same and not shown.
- Fails if: Continue is missing, or the game restarts at day 1.

### EV-12 — Tonight's games survive a host restart
- Requirement: tonight's games stay listed after a host restart in the same session.
- Method: unit
- How: server test: two quit games, restart the host, rebuild the session from the event log.
- Pass evidence: the session view lists both games, newest first, each marked quit.
- Fails if: the list is kept only in memory.

### EV-13 — "Tower lost" survives a restart
- Requirement: a tower lost between games stays lost across a host restart until the next game's start runs the tower block.
- Method: unit
- How: server test: tower lost on the session screen, restart, read the session view.
- Pass evidence: the tower line reads "Tower lost"; no tower command is sent on restart.
- Fails if: a restart reports the tower in play, or reconnects.

## Assumptions surfaced

- The tower line wording: "Tower in play", "Without the tower", "Tower lost" → SCR-021 names the three states; the exact words are Claude's. Bob: OK?
- Continue is left out (not greyed) when there is no autosave. DEC-227's "greyed, never left out" is for Menu items → DEC-709 says "only while an autosave exists".
- The idle command stays `lighting.all-off`, as C1 built it for Goodbye → CUE-012.
