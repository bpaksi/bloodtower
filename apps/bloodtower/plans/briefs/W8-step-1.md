Keep this a checklist; do not write a second design doc.

# Brief: W8 Step 1 — Exit and quit

## Meta

- Plan: Weekend, from `research/game-design/weekend-c1-acceptance.md` §4 (Bob, Blood Tower room, 2026-10-25, on main as #218 at `570aa333`). W8 is the exit and quit step. W1 through W7 stay out of this file.
- Step: 1
- Owner: Gamewright (design). This is the Wright build-lane brief. Warden reviews it for completeness. Wright implements only after it is merged and that review passes.
- Related AREA/docs: AREA-077; AREA-052; DEC-218; DEC-219; DEC-208; DEC-214; DEC-229; DEC-155; SCR-020; SCR-021; weekend acceptance §4; `apps/bloodtower/src/e2e/tests/area-077.spec.ts`; `apps/bloodtower/src/e2e/tests/acceptance.spec.ts`; tower inventory command `lighting.all-off`.
- In scope: Quit story ends the game as quit and lands on the session screen (DEC-218). Done for tonight leaves that screen for Goodbye: teardown, the tower to idle, and the session over (DEC-219, SCR-020).
- Out of scope: W1, the iPad chrome shell. W2, the landing banner and Sound on `/`, and the Connect Tower / Play without Tower copy. W3, the Pick Story carousel and Dracula. W4, Party Pick wording and hunter count. W5, setup boards and the Begin narrative. W6, Story board layer polish. W7, the move UI (UI-023). Also out of this step: the past-games list, Play again, game stats (SCR-019), and win or loss outcome scenes. New game stays the other session-screen button and keeps today's press. This step does not redesign the screens after that press.

## Cutover

Cutover: N

- Screen ids `session` and `goodbye` stay. Action ids `quit-story`, `new-game`, and `done-for-tonight` stay. Prompt ids `menu-quit`, `pause-<n>-quit`, `session-new-game`, and `session-done-tonight` stay. No route is renamed or removed. Goodbye gains the teardown list and the idle command on these same screens.

## Survival invariants

Continue, restore, and restart must keep:

- [ ] The autosave after Quit story and after Done for tonight (DEC-208). Neither press deletes it. A later session's Pick Game still offers Continue for that game. Continue reloads the checkpoint the way main does today. This step adds no Save button.
- [ ] The quit record: one outcome `quit` for that game id, neither won nor lost. A host restart leaves that one record. Replaying the log does not write another.
- [ ] Party holds, the Proving Grounds pack, the seed, the day, and group positions, through Quit story, so Continue still resumes them. The seed stays internal and stays off the screen.
- [ ] Tower connect state. A session that never connected stays unpaused for a missing tower through quit and goodbye, and sends no tower command. A session that had connected idles the tower only on Done for tonight, and only while the link is still up. Nothing reconnects by itself.
- [ ] New game on the session screen. That press still clears the autosave and opens Pick Story, and it sends no idle command.

## Done-when (e2e)

Playwright projects `phone` (390×844), `ipad` (820×1180), and `desktop` (1440×900) in `apps/bloodtower/src/e2e/playwright.config.ts`. All three run every check below. Extend the quit walks already in `area-077.spec.ts` and `acceptance.spec.ts`. Add no new spec file.

The device hook is `main.bt-device[data-screen]`. The Story board hook is `main.bt-board[data-screen]`. On session and goodbye the board is `data-board-mode="startup"`. Quit story is `button[data-action-id="quit-story"]`. From Menu Leave the prompt id is `menu-quit`. From the pause it matches `pause-<n>-quit`. Done for tonight is `button[data-prompt-id="session-done-tonight"][data-action-id="done-for-tonight"]`. New game is `button[data-prompt-id="session-new-game"][data-action-id="new-game"]`.

The teardown list is `[data-teardown]`. It is display only. No button, no checkbox, and no tick gates the session. The same three items, in this order, on the Story board and on every joined iPad. The words reverse the physical setup this slice already names (heroes on their starts, the board, seals and skulls):

1. `data-setup-id="place-heroes"` — Take each hero off the board.
2. `data-setup-id="lay-out-board"` — Pack up the board.
3. `data-setup-id="seals-and-skulls"` — Take the seals off the tower and collect the skulls.

Add no fourth item. The thank-you card keeps the title Goodbye. The Story board waiting line stays "The evening is closing." inside `[data-next-prompt]`. Goodbye offers neither Play again nor a second Done for tonight.

Tower state on that card is `[data-tower-state]`. Its text is `idle`, `no tower`, or `unavailable`. It contains no digit.

Tower idle is one command from the Done for tonight press: `capabilityId` `lighting.all-off`, params `{}`. No other capability, no raw bytes, no drum, no sound, and no retry. The acceptance mock records it as one `{ type: "idle" }` on `tower.sent()`. The test adapter must record that command. A failed or unanswered idle is logged as `tower-command-failed` and toasted on the Story board (decision 0003). The screen stays goodbye and the session stays ended. Do not pause and do not reconnect. Replay of the log does not send the command again.

- [ ] Run: `phone`, `ipad`, and `desktop`, tower powered off, the `area-077.spec.ts` walk through play. Open Menu and press Quit story (`menu-quit`). Expect: the joined iPad and the Story board show `data-screen="session"`. The device offers exactly two open actions, New game and Done for tonight, with those labels. The board waiting line is "Waiting for an iPad to start a new game, or to be done for tonight." The screen shows no Play again, no past game, and no Quit game. No text matches `/seed/i`. The event log for this game id has one `game-record` row whose outcome is `quit`. The autosave row is still that game. `tower.sent()` has no `connect`, no `calibrate`, and no `idle`.
- [ ] Run: on that session screen, press Done for tonight. Expect: the iPad and the Story board show `data-screen="goodbye"`. The title is Goodbye. `[data-next-prompt]` reads "The evening is closing." `[data-teardown]` shows the three items above, in that order, on the board and on the iPad. `[data-tower-state]` reads `no tower`. The board has no `button`, `input`, `textarea`, or `select`. The iPad offers no `new-game`, `done-for-tonight`, `quit-story`, or Play again. `tower.sent()` still has no `idle`. Restart the host on the same database. Expect: a new session opens on splash, the autosave row is still that game, and the quit record is still the one `quit` row.
- [ ] Run: connect and calibrate, reach play with the tower still connected, open Menu, and press Quit story. Expect: `data-screen="session"`. `tower.sent()` contains the `connect` and the `calibrate`, and the idle count is 0. Then press Done for tonight. Expect: goodbye, the same teardown list, `[data-tower-state]` reads `idle`, and `tower.sent()` has exactly one `{ type: "idle" }`. Replay of that log sends no further tower command.
- [ ] Run: the `acceptance.spec.ts` path that drops the tower, pauses, and presses pause Quit story. Expect: the session screen. The pause offers Quit story and offers no control named Quit game. Done for tonight then reaches goodbye and the teardown list. `[data-tower-state]` reads `unavailable`. `tower.sent()` gains no `idle` and no reconnect. Restart the host on the same database and press Continue. Expect: play resumes at the saved day, the way that test does today, and the restart sends no `idle`.
- [ ] Run: a host test where the mock fails `lighting.all-off` once during Done for tonight on a connected session. Expect: one `tower-command-failed` error, one toast on the Story board, `[data-tower-state]` reads `unavailable`, the screen stays goodbye, the session is ended, and the idle command was sent once.
- [ ] Run: on the session screen, press New game. Expect: `data-screen="pick-story"`, the autosave for the quit game is gone, and this press added no `idle`. Stop there. Leave Pick Story, settings, and setup for their own steps.
- [ ] Run: `area-077.spec.ts` and `acceptance.spec.ts` still pass on `phone`, `ipad`, and `desktop` with the expects above. Quit story stays the Leave item. This step leaves the iPad chrome to W1.

## AREA / DEC checklist

- [ ] DEC-218: closed before coding (`decided`, Bob 2026-10-23). Quit story ends the game as quit, neither won nor lost, writes that record, keeps the autosave, and lands on the session screen. The Quit story press is the confirm. This step adds no second dialog. Menu Leave and the pause both use that press.
- [ ] DEC-219: closed before coding (`decided`, Bob 2026-10-23). The session screen shows New game and Done for tonight only. Done for tonight goes to Goodbye: teardown, tower to idle, session over. The pause has no Quit game. Past games and Play again stay later.
- [ ] DEC-208: closed before coding (`decided`). The autosave stays after quit. Continue is offered on a later Pick Game until New game replaces it.
- [ ] DEC-214: closed before coding for this slice (`decided`). Done for tonight goes to Goodbye's teardown. Goodbye has no Play again. The full past-games hub stays later (DEC-219).
- [ ] DEC-229: closed before coding for this slice (`decided`). Quit story stays the only Leave item. What that press does is this step. The Menu dialog chrome is W1.
- [ ] DEC-155: closed before coding for this slice. A session that never connected does not pause for a missing tower and receives no idle command. Idle is sent only when this session is still connected at the Done for tonight press. Nothing reconnects by itself.
- [ ] SCR-020: closed before coding for this slice. Card status on main is `proposed`. A thank-you card and the teardown checklist. It only closes the session. Tower to idle is the DEC-219 result of Done for tonight, via `lighting.all-off`.
- [ ] SCR-021: closed before coding for this slice via DEC-219. Card status on main is `proposed`. This step uses New game and Done for tonight only.
- [ ] AREA-077: closed before coding for this slice. Bob 2026-10-23 (card status on main is `open`). Exit story, then exit game. No events. The Oct 25 weekend pass for this slice is §4 of the acceptance note.
- [ ] AREA-052: closed before coding for this slice (card status on main is `open`). Goodbye is the ending this step builds. Outcome scenes and stats stay out.
