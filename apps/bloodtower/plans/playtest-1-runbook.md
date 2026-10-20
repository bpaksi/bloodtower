# Playtest 1 runbook (fixes and polish)

Bob runs one step per branch in Claude Code on the Mac. Update **Status** and **PR #** here when a step opens or merges.

**Source:** the first full playtest, 2026-10-20: [`docs/playtests/2026-10-20-1120.md`](../docs/playtests/2026-10-20-1120.md) (commit `bbcb292`, mock tower, Story board on an LG TV at 3840×2160, iPad and phone, `pnpm --dir apps/bloodtower playtest --check`). All 33 checks passed. Bob's notes hold three bugs, polish, and new play features; this runbook turns each note into an item (`PT-nn`), a bug (`B1`–`B3`) or a plan step (`P1`–`P9`).

**How a step runs:** the review loop in `docs/sdlc.md` §4 (one Opus attack, Sonnet fix-checks, trust CI, block only on the §4 list) and the merge rule in `CLAUDE.md` (squash-merge once CI is green and the latest review says `Blocking: none`). `Done when` for every step: its numbered items, its `Tests:` line and the hard constraints below.

**Hard constraints (every step):**

- Tower safety (`CLAUDE.md`): the UI reaches the tower only through `command{capabilityId, params}`; nothing physical happens on its own; unknown values read "unavailable", never 0.
- A step changes messages, engine or session state only when its prompt says so. Then it adds a decision row to `apps/bloodtower/spec.md` (next free id **D32**; take the next free one when you get there) and updates the §3 contract table in the same PR.
- The Story board stays display-only: it sends only `keeper-line-ended` (D7). The menu in this track lives on the devices (Bob, 2026-10-20).
- Board viewports are 1024×594, 1180×820, 1920×1080 **and 3840×2160** (Bob's TV). Device viewports are iPad landscape and portrait (1180×820, 820×1180) and a phone (390×844).
- Do not break camera tracks (#78), audio layers (#83), the visual layer (#99, #105), flash safety (no more than 3 brightness jumps a second) or reduced motion.
- Keep the playtest script in step: when a step changes what a check in `src/server/scripts/playtest.ts` expects, update that check and its test in the same PR.

## Playtest items

| Id | Check | Bob's note (short) | Goes to |
|---|---|---|---|
| PT-01 | A2 | The game always starts at the root (`/`) | P7 |
| PT-02 | A2, A4 | Sound settings reachable at any time: a config button on `/`, and in a menu | P7 (PQ2) |
| PT-03 | A2, A3 | The Voice test plays game music; it needs a spoken sample, like "Welcome to Blood Tower" | P9 |
| PT-04 | A5 | The landing page (`/`) has no window flicker; the Story board does | P7 |
| PT-05 | A5 | The window flicker is too fast and not random: "someone walking past the window". The path lanterns are good | P9 |
| PT-06 | B1 | iPad portrait: Game settings (length, difficulty) scrolls | P8 |
| PT-07 | B2 | On iPad and phone, option buttons are hard to tell from Continue | P8 |
| PT-08 | F1 | Doesn't like the tower volume test without a tower | P3 (ruled) |
| PT-09 | H3, I6 | There are no private moments in the game; the iPad shows "No private line" for each hunter | P2 (ruled), PQ5 |
| PT-10 | I1, K1 | At 3840×2160 the board text is too small to read | P1 |
| PT-11 | I1 | Waiting text must be explicit, like "Waiting on hunters" | P1 |
| PT-12 | I2 | The zoom into and out of a picture is too fast | P9 |
| PT-13 | I2 | "We need to work on this screen" (play) | PQ3 |
| PT-14 | I3 | The iPad always needs Back during play, in every story | P4 (PQ1) |
| PT-15 | I3 | And Replay (Bob, 2026-10-20: "both a replay and a back button") | P4 |
| PT-16 | I5 | The ambient music stopped after the Keeper and never came back | B1 |
| PT-17 | I7 | A menu option to show the join QR | P5 |
| PT-18 | J1 | Quit needs a hold-to-confirm: hold 5 s while the button fills | P5 |
| PT-19 | J1 | No closing summary after Quit | B3 |
| PT-20 | J1 | Menu: Last game summary | P6 |
| PT-21 | J1 | Menu: Statistics for past games | P6 |
| PT-22 | K1 | The Table section (join QR) shows scroll bars | B2 |

C3's note (Vellmoor shows "Not playable yet" only after Game settings) matches the design (D30); no action.

## Decisions (Bob, 2026-10-20)

| # | Topic | Decision |
|---|---|---|
| R1 | Private moments (PT-09) | Remove them entirely: engine, pack format, Proving Ground and device screens. What happens to the Dracula script's private lines is PQ5. |
| R2 | Tower volume test (PT-08) | Only when a tower is connected. After "Play without tower" the screen is skipped, for every pack. |
| R3 | Play controls (PT-14, PT-15) | The iPad gets both Replay and Back during play, in every story. How far Back goes is PQ1. |
| R4 | Menu (PT-17, PT-20, PT-21) | An always-available Menu button on the iPad (R3-UI-38). The menu is echoed on the Story board, and what is picked shows there: pick Join and the board shows the QR dialog. The board stays display-only. |
| R5 | Quit (PT-18) | Quit is held for 5 s on the device while the button fills; letting go early cancels. |

## Open questions (for Bob)

| # | Question | Default if Bob agrees |
|---|---|---|
| PQ1 | How far does Back go during play? | Back re-shows any earlier moment, one per press, without undoing anything: choices, cues and tower actions stay done. Continue moves forward again from there. |
| PQ2 | With the menu on the iPad, are sound levels set from the iPad (the board applies them), or does the Sound dialog stay a Mac-only control reached from `/`? | none yet |
| PQ3 | Play screen (I2): what besides zoom speed needs work? | none yet |
| PQ4 | Does the board keep its own Menu (R3-UI-39: a corner button and Esc on the Mac, and save-and-quit when every device has dropped), or does the iPad menu replace it? | Replace it for now; revisit with save and resume (R2-41). |
| PQ5 | The Dracula script has 159 private moments (`target: ipad:<hunter>`). Play them on the board as shared lines, or rewrite or cut them? | none yet; Dracula is `playable: false`, so nothing breaks while this is open. |

## Status

| Step | Branch | Depends on | Status | PR # |
|---|---|---|---|---|
| B1 | `fix/bloodtower-ambient-after-keeper` | none | todo | |
| B2 | `fix/bloodtower-table-panel-scroll` | none | todo | |
| B3 | `fix/bloodtower-quit-summary` | none | todo | |
| P1 | `feat/bloodtower-board-4k` | B2 merged (both edit the summary panel CSS) | todo | |
| P2 | `feat/bloodtower-no-private-moments` | none | todo | |
| P3 | `feat/bloodtower-volume-test-tower-only` | P2 merged (both edit the engine flow) | todo | |
| P4 | `feat/bloodtower-play-replay-back` | P5 merged; PQ1 answered | waiting on PQ1 | |
| P5 | `feat/bloodtower-device-menu` | P3 and P8 merged | todo | |
| P6 | `feat/bloodtower-menu-summary-stats` | P5 merged | todo | |
| P7 | `feat/bloodtower-start-at-root` | P5 merged; PQ2 and PQ4 answered | waiting on PQ2, PQ4 | |
| P8 | `feat/bloodtower-device-polish` | P2 merged (both edit `DeviceScreen.tsx`) | todo | |
| P9 | `feat/bloodtower-motion-sound-polish` | P1 merged (both edit `board.css`) | todo | |

## Order

- **Now:** B1, B2, B3 and P2, all at the same time (different files).
- **After B2:** P1. **After P2:** P3 and P8 (P3 is engine, P8 is device CSS).
- **After P3 and P8:** P5 (the menu).
- **After P5:** P6; then P4 once PQ1 is answered; P7 once PQ2 and PQ4 are answered.
- **After P1:** P9.
- **Later:** a tower run of the playtest (`--tower --only E,F`), and a second full playtest when P1–P9 are in.

---

## B. Bugs (one prompt, three branches)

```text
Fix three bugs found in the Bloodtower playtest of 2026-10-20 (apps/bloodtower/docs/playtests/2026-10-20-1120.md, commit bbcb292, mock tower, Story board on an LG TV at 3840×2160, iPad and phone). Runbook: apps/bloodtower/plans/playtest-1-runbook.md §B.

Read CLAUDE.md, docs/sdlc.md and apps/bloodtower/spec.md first. Use the bugfix skill: reproduce each bug with a failing test before fixing it. Make three branches from the latest origin/main, one per bug, each in its own worktree (pnpm wt <branch>), and open one PR per branch. Each PR body cites the playtest file and the check id, and sets that bug's Status row in the runbook.

1. fix/bloodtower-ambient-after-keeper (B1, check I5, PT-16)
   - What happened: the ambient music stopped at the Keeper and never came back. The timing report shows the Keeper clip `grey-stair.03` (kind clip, advance: clip-end) ended on its own, then the pick-card `grey-stair.door-choice` (target ipad:all) and `grey-stair.04` played, all with no bed.
   - Expected (R3-UI-60, R3-UI-64; runbook visuals step 6 audio rules): the bed fades out for a visual (about 1 s) and fades back in when play returns to a non-visual moment. It never stays silent in play, except under a dialog line, and then it comes back.
   - Code: src/web/lib/audio/layers.ts (pickLayers, isVisualMoment), boardAudio.ts, LiveBoard.tsx (audio update calls), VisualLayer.tsx (the Keeper, the zoom out).
   - Reproduce on Proving Ground: the Keeper clip, then the pick-card, then the next moment; check the active layers after each.
   - Fix the cause. Do not paper over it with a timer.

2. fix/bloodtower-table-panel-scroll (B2, check K1, PT-22)
   - What happened: the Table section where the join QR shows has scroll bars on the TV.
   - Expected: no scroll bars on any board panel at any board viewport.
   - Code: StoryBoard.tsx (SummaryPanel, the join/Table block), board.css (.bt-summary, the join panel).
   - Reproduce at 1920×1080 and 3840×2160 (page.setViewportSize) on the start-up screens with the summary filled, and on play. Assert scrollHeight <= clientHeight and scrollWidth <= clientWidth on every board panel.
   - Keep #106's fit rules at 1024×594 and 1180×820 passing.

3. fix/bloodtower-quit-summary (B3, check J1, PT-19)
   - What happened: after Quit on the iPad, the board did not show the closing summary.
   - Expected (spec D20; visuals runbook step 6): quit is not play mode; the board shows the closing summary and the join block.
   - Code: StoryBoard.tsx (the quit screen), src/web/lib/screens.ts (BOARD_MODE, boardLayer: quit is neither startup nor play), VisualLayer.tsx and WaitingDialog.tsx (whether either still covers the quit screen).
   - Reproduce by quitting from a picture moment and from a text moment.
   - Hold-to-confirm Quit is NOT part of this fix; it is plan step P5.

No change to protocols, message types, engine or session state unless the cause is there; if it is, say so plainly in the PR. Tower safety per CLAUDE.md. Run pnpm check and the affected spec files, push, and open each PR.
```

## P1. Board at 4K and explicit waiting text

**Review focus:** sizes scale with the viewport (the 2× test); no layout change at the three smaller viewports; no scroll at 4K; waiting copy uses existing state only.

```text
Build playtest-1 step P1 (board at 4K, explicit waiting text) for apps/bloodtower.

Branch: feat/bloodtower-board-4k from the latest origin/main, in its own worktree. Depends on B2 (fix/bloodtower-table-panel-scroll) being merged. Runbook: apps/bloodtower/plans/playtest-1-runbook.md §P1 and its hard constraints.

Read first: CLAUDE.md, docs/sdlc.md, the playtest notes for I1 and K1 in apps/bloodtower/docs/playtests/2026-10-20-1120.md, docs/art-direction/game-look.md (§4a type) with tokens.css. Code: board.css, StoryBoard.tsx, WaitingDialog.tsx, DialogFrame.tsx, VisualLayer.tsx, KeeperBoardCaption.tsx, SoundDialog.tsx (the board side only), src/e2e/tests (board-look, opening-screens, visual-layer, keeper-fit, sound-dialog).

Goal: on Bob's TV (3840×2160) the board looks like the 1920×1080 board at twice the size. Today type and spacing stop growing past 1080p, so text is too small from the couch (PT-10). The board also says in words who it is waiting for (PT-11).

1. Scale: make board type, spacing, frames and panels scale with the viewport so that at 3840×2160 each element renders at 2× its 1920×1080 size (±10%). Use one scale on .bt-board (for example a root size from the viewport in clamp()) with sizes in rem/em, rather than per-rule media queries. Device screens are out of scope.
2. The three smaller board viewports keep their current layout and #106's fit rules. Say in the PR if any size changes there, and why.
3. The dialog frame's border image, the QR, portraits, covers and the visual layer's 16:9 well scale too; nothing blurs that has a sharper source (use the SVG frame as now).
4. Waiting text (PT-11): wherever the board waits on a device press (start-up dialogs, the play prompt band, the waiting dialog), it says so in words, for example "Waiting on the hunters" with what to press. Use only existing state (screen, prompt, lock, holders). List the new strings in the PR.
5. Reduced motion and flash safety unchanged.

No change to protocols, message types, engine or session state.

Tests:
- A scale test: at 1920×1080 and 3840×2160, the bounding boxes of the scene title, prompt band text, a hunter cartouche, a summary row and the dialog frame grow 2× (±10%).
- No scroll on any board panel at 3840×2160.
- 3840×2160 screenshots of pick-story, game-settings, play text moment, a picture moment and the Keeper (page.setViewportSize).
- Existing board e2e at the three smaller viewports pass unchanged.
- Playtest script: K1's "Do" names 3840×2160.

Review focus (put this line in the PR body): the 2× scale test; no layout change below 4K; no scroll at 4K; waiting copy from existing state only.

When done: set the P1 Status row in the runbook, run pnpm check and the board spec files, push, and open a PR titled "feat(bloodtower): board scales to 4K, explicit waiting text (playtest-1 P1)".
```

## P2. Remove private moments

**Review focus:** no private path left in engine, messages, pack format or device UI; `ipad:all` pick-cards untouched; spec rows; Proving Ground still lints and plays.

```text
Build playtest-1 step P2 (remove private moments) for apps/bloodtower.

Branch: feat/bloodtower-no-private-moments from the latest origin/main, in its own worktree. Runbook: apps/bloodtower/plans/playtest-1-runbook.md §P2 and its hard constraints. Bob's ruling R1 (2026-10-20): there are no private moments in the game; remove them entirely.

Read first: CLAUDE.md, docs/sdlc.md, apps/bloodtower/spec.md (D4, D8, D16, D17, D23 and the §3 contract: welcome channels, deviceState private moment text, the private-on-storyboard error), packs/test/README.md (F-4, V-4 and the private moment rows), packs/test/moments.yaml, src/protocols/pack.ts and messages.ts, src/server/session/engine.ts and the hub routing, src/web/components/device/DeviceScreen.tsx ("No private line").

This step changes messages, engine and session state, and the pack format. Say so plainly in the PR.

1. Pack format: a moment's target is `storyboard` or `ipad:all` (pick-cards, D23). `ipad:<hunter>` is no longer valid; the pack lint fails it with a message naming the moment and pointing to this decision. Remove the private-moment rules (V-4 and any loader rule for them).
2. Engine and hub: remove private routing, per-hunter delivery and the private moment text in deviceState. Decide what the hunter channels in `welcome` (D16) are still for; if nothing, remove them. Remove the `private-on-storyboard` error code if nothing can raise it.
3. Devices: no private-line view, no "No private line", no per-hunter sections during play.
4. Proving Ground: remove the private moments (`proving-ground.02.private.*` and any others) and keep the flow playable from start to end; update packs/test/README.md (the moment table, F-4, V-4, readiness notes).
5. Keep `ipad:all` pick-cards and their behaviour exactly as they are.
6. Do NOT touch packs/dracula or scripts/dracula-pack-convert.py: what happens to its 159 private lines is Bob's open question PQ5. Dracula is playable: false and its script.yaml is not read by the pack loader, so it keeps loading.
7. spec.md: a new decision row (next free D id) recording R1 and what it removes, and the §3 contract table updated (welcome, deviceState, error codes). Mark the D8/D16/D17 text it supersedes.

Tests:
- Pack: ipad:<hunter> fails lint; storyboard and ipad:all pass.
- Engine/hub: no message carries per-hunter text; a pick-card still reaches every joined iPad.
- Device: no private view.
- e2e: Proving Ground plays start to end with two devices.
- Playtest script: remove check I6 and change H3's expect (no per-hunter sections), with its test.
- pnpm --dir apps/bloodtower pack:lint passes on packs/test and packs/dracula.

Review focus (put this line in the PR body): no private path left anywhere; ipad:all pick-cards unchanged; spec D row and contract table match the code; Dracula untouched.

When done: set the P2 Status row in the runbook, run pnpm check and the affected spec files, push, and open a PR titled "feat(bloodtower): remove private moments (playtest-1 P2)".
```

## P3. Tower volume test only with a tower

**Review focus:** skip only after "Play without tower"; Back paths; the stat is absent, not zero, without a tower; spec row.

```text
Build playtest-1 step P3 (tower volume test only with a tower) for apps/bloodtower.

Branch: feat/bloodtower-volume-test-tower-only from the latest origin/main, in its own worktree. Depends on P2 being merged. Runbook: apps/bloodtower/plans/playtest-1-runbook.md §P3. Bob's ruling R2 (2026-10-20): the volume test runs only when a tower is connected; after "Play without tower" it is skipped, for every pack.

Read first: CLAUDE.md (Tower safety), apps/bloodtower/spec.md (D30 and the shell step 7 rows), packs/test/README.md §6a and §14, src/server/session/engine.ts (NEXT_BEFORE_PLAY, the back map, VOLUME_TEST_STAT), src/protocols/control.ts (FLOW_SCREENS).

This step changes the flow order in engine/session state. Say so in the PR. No new message type.

1. From Connect Tower: if the tower is connected (and calibrated, as today's Continue requires), Continue goes to the tower volume test as now. If the host chose "Play without tower", Continue goes straight to Claim Hunters.
2. Back from Claim Hunters returns to the volume test only if it was shown; otherwise to Connect Tower.
3. tower: none packs keep skipping Connect Tower and the volume test.
4. Without a tower, no tower-volume-test stat is written; the debug overlay shows it as unavailable, never 0 or blank.
5. Nothing physical changes: no command is sent by the skip.
6. spec.md: a new decision row (next free D id) for R2, superseding the part of the shell step 7 row it changes.

Tests:
- Engine: with and without a tower, the next screen after Connect Tower and the Back target from Claim Hunters; tower: none unchanged; no stat without a tower; no tower command on the skip path (mock records none).
- e2e: Play without tower goes from Connect Tower to Claim Hunters.
- Playtest script: remove check F1 (no-tower volume test) and make F5 a tower-only check, with its test.

Review focus (put this line in the PR body): skip only on the no-tower path; Back targets; no stat and no command without a tower; spec row.

When done: set the P3 Status row in the runbook, run pnpm check and the affected spec files, push, and open a PR titled "feat(bloodtower): volume test only with a tower (playtest-1 P3)".
```

## P4. Replay and Back during play

Prompt to be written once Bob answers PQ1. Known so far (R3): the iPad shows Replay (the current moment again: its picture, clip or Keeper line and its audio from the start, with no state change) and Back (an earlier moment) during play, in every story, first press wins like Continue. R3-UI-39's "replay last video" is the board-menu form of the same idea. Changes messages and engine state.

## P5. Device menu, shown on the board

**Review focus:** the menu is never a flow press (no lock, no screen change); the board only displays; the quit hold sends nothing until full; reduced motion; spec rows.

```text
Build playtest-1 step P5 (device menu shown on the board) for apps/bloodtower.

Branch: feat/bloodtower-device-menu from the latest origin/main, in its own worktree. Depends on P3 and P8 being merged. Runbook: apps/bloodtower/plans/playtest-1-runbook.md §P5. Bob's rulings R4 and R5 (2026-10-20).

Read first: CLAUDE.md, docs/sdlc.md, apps/bloodtower/spec.md (D7, D20, D25 focus-story as the model of a non-press message, the §3 contract), research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-38 menu on every device screen, R3-UI-39 board menu, R3-UI-40, R2-111, R2-113), the playtest notes for I7 and J1. Code: DeviceScreen.tsx, LiveDevice.tsx, controls.ts, StoryBoard.tsx, DialogFrame.tsx, src/protocols/messages.ts and control.ts, engine.ts, the hub.

This step changes messages and session state. Say so plainly in the PR.

1. Device: a "Menu" button on every device screen, top corner, a large touch target (R3-UI-38), on iPad and phone, start-up and play. It opens a menu on the device with:
   - Join: show the join QR and code on the board;
   - Quit (play only): moves here from wherever it is now;
   - Close.
   Later steps add Last game, Statistics (P6) and Sound (P7); build the menu so an item is one entry in a list.
2. Board echo (R4): while a device has the menu open, the board shows the same menu in a compact DialogFrame (the items, and which device opened it), and shows what was picked: Join shows the QR and code large in a DialogFrame. The board has no buttons; it only displays. Closing on the device closes it on the board.
3. Server: the session holds the open menu (which device, which item) and sends it in storyboardState and deviceState. Opening, picking and closing are NOT flow presses: no lock, no screen change, like focus-story (D25). Log them for the timing report. Decide and document what happens when a second device opens the menu while one is open.
4. Quit hold (R5): Quit fills over 5 s while held; letting go early cancels and sends nothing; only a full hold sends the existing quit control. The fill is shown even with reduced motion (it is information); without reduced motion it may animate smoothly. Board and device both show "Quitting..." during the hold only if that needs no new message; otherwise leave the board out of the hold.
5. spec.md: new decision rows (next free D ids) for the menu (R4) and the quit hold (R5), and the §3 contract table.

Tests:
- Protocol/engine: menu open, pick and close round-trip; no lock and no screen change; a second device per the rule you chose.
- Device: Menu on every screen; quit sends nothing on a short hold and quits on a full hold (fake timers).
- Board e2e: the menu echo and the Join QR dialog at the four board viewports, no board buttons (acceptance check still passes).
- Playtest script: add menu checks (Join from the iPad shows the QR on the board; a short Quit hold does nothing; a full hold quits) and update J1, with their tests.

Review focus (put this line in the PR body): menu is not a flow press; board display-only; quit sends nothing before a full hold; spec rows and contract table.

When done: set the P5 Status row in the runbook, run pnpm check and the affected spec files, push, and open a PR titled "feat(bloodtower): device menu shown on the board, hold to quit (playtest-1 P5)".
```

## P6. Menu: last game summary and statistics

**Review focus:** read-only from the store; empty states; never 0 for unknown; scale at 4K.

```text
Build playtest-1 step P6 (menu: last game summary and statistics) for apps/bloodtower.

Branch: feat/bloodtower-menu-summary-stats from the latest origin/main, in its own worktree. Depends on P5 being merged. Runbook: apps/bloodtower/plans/playtest-1-runbook.md §P6.

Read first: CLAUDE.md, apps/bloodtower/spec.md (§5 timing rows, the P5 menu rows), packs/test/README.md §14 (stats), src/server/db (schema, store), src/server/scripts/timingReport.ts (formatTimingReport, readRun), the P5 menu code.

This step changes messages and session state. Say so in the PR.

1. Two new menu items on the device: "Last game" and "Statistics". Picking one shows it on the board in a DialogFrame (the device shows a short "Showing on the board" line and Close).
2. Last game: the closing summary of the most recent finished or quit session: pack, date, chosen settings, hunters and devices, total, active and paused time, nights, choices made, setup step times. Values the store does not have read "unavailable".
3. Statistics: past games, newest first: date, pack, length setting, active time, how it ended (finished or quit). At most what fits at 1180×820 without scrolling; say the count in the PR.
4. Read-only: nothing is written by viewing; reuse the timing report's store reads rather than a second query path.
5. With no past game, both say so in words.
6. spec.md: a decision row (next free D id) and the contract table for the new menu items and the data they carry.

Tests: store reads with 0, 1 and many sessions; unavailable values; board e2e for both views at the four board viewports, no scroll; playtest script checks for both items, with their tests.

Review focus (put this line in the PR body): read-only; unavailable never 0; fits without scroll; spec row.

When done: set the P6 Status row in the runbook, run pnpm check and the affected spec files, push, and open a PR titled "feat(bloodtower): last game summary and statistics in the menu (playtest-1 P6)".
```

## P7. Start at the root, Sound from anywhere

Prompt to be written once Bob answers PQ2 and PQ4. Known so far: the game always starts at `/` (PT-01); `/` gets the window flicker from visuals step 2 (PT-04, today only the Story board has it); Sound settings are reachable from `/` and from the menu (PT-02).

## P8. Device polish

**Review focus:** no scroll on iPad in either orientation on start-up screens; options and Continue clearly different; touch targets; no protocol change.

```text
Build playtest-1 step P8 (device polish) for apps/bloodtower.

Branch: feat/bloodtower-device-polish from the latest origin/main, in its own worktree. Depends on P2 being merged (both edit DeviceScreen.tsx). Runbook: apps/bloodtower/plans/playtest-1-runbook.md §P8.

Read first: CLAUDE.md, the playtest notes for B1 and B2, docs/art-direction/game-look.md with tokens.css, research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-51 devices show no images). Code: DeviceScreen.tsx, JoinScreen.tsx, formFactor.ts, the device CSS.

Goal: the iPad never scrolls on a start-up screen, and nobody mistakes an option for Continue.

1. iPad, portrait and landscape (820×1180, 1180×820, 768×1024, 1024×768): every start-up screen fits without scrolling, Game settings included (PT-06). The phone (390×844) may scroll, but Continue and Back stay reachable without scrolling (pinned at the bottom).
2. Options vs actions (PT-07): option buttons (Short/Standard/Long, Difficulty, hunters, Choose on the carousel) look like selectable choices: outlined, with a clear selected state that is not colour alone (a mark or a fill plus text). Continue, Back and Begin look like actions: the solid primary band, always in the same place. Say the rule in one line in the PR.
3. Touch targets at least 44×44 pt; text at least the current size.
4. Devices still show no images (R3-UI-51).

No change to protocols, message types, engine or session state.

Tests: e2e at the four iPad sizes and the phone on every start-up screen: no scroll on iPad (scrollHeight <= clientHeight), primary action visible on the phone; option vs action classes; screenshots in the PR.

Review focus (put this line in the PR body): no iPad scroll; option/action rule holds on every screen; targets; no images.

When done: set the P8 Status row in the runbook, run pnpm check and the device spec files, push, and open a PR titled "feat(bloodtower): device layout and option/action polish (playtest-1 P8)".
```

## P9. Motion and sound polish

**Review focus:** window passes read as someone walking past and stay flash-safe; lanterns unchanged; zoom timing in one constant with 10 (e)'s hold intact; voice sample at a stated loudness.

```text
Build playtest-1 step P9 (motion and sound polish) for apps/bloodtower.

Branch: feat/bloodtower-motion-sound-polish from the latest origin/main, in its own worktree. Depends on P1 being merged (both edit board.css). Runbook: apps/bloodtower/plans/playtest-1-runbook.md §P9.

Read first: CLAUDE.md, the playtest notes for A2, A3, A5 and I2, apps/bloodtower/public/landing/window-mask/README.md (groups a–d), docs/art-direction/game-look.md §5, the visuals runbook Status rows for steps 2, 10 and 11 (zoom rules, 10 (e) hold), docs/deliveries/2026-10-17-shell-audio-and-covers.md (levels). Code: board.css (window glow), boardWindowMask.ts, VisualLayer.tsx (zoom), SoundDialog.tsx and src/web/lib/audio (test clips).

1. Window (PT-05): group a (the tower window) changes from quick stepped flicker to "someone walking past the window": at irregular intervals of several seconds, the glow dims as a shadow crosses it (a soft dip over well under a second, then back), sometimes twice in a row, otherwise steady with a faint flicker. Groups b–d (the path lanterns) keep their current flicker (Bob: they are good). CSS only, no JS timers. This overrides game-look §5's "stepped, never smooth" for the window only; say so in the PR. Flash safety: one dip is one brightness change; no more than 3 a second; the area stays small.
2. Zoom (PT-12): slow the zoom into and out of a picture. Put the duration in one named constant; start at about 1.4 s and say the value in the PR. Keep monotonic brightness, the round 1 and 2 reversal fixes, and 10 (e)'s hold (the zoom out waits for a started zoom in), and check rapid presses still pass visual-layer.spec.ts. Reduced motion stays a 300 ms fade.
3. Voice sample (PT-03): the Sound dialog's Voice test plays a spoken line, "Welcome to Blood Tower.", instead of music. Find how the Dracula voice lines were made (#104) and make this line the same way, in the narrator's voice; if that needs Bob's API key or approval, stop and ask. Save it as apps/bloodtower/public/audio/signature/voice-sample.m4a, .m4a only (no WAV in the repo), at the loudness the Keeper lines use; state the measured loudness in the PR.

No change to protocols, message types, engine or session state.

Tests: the zoom constant drives the animation (unit); visual-layer.spec.ts passes with the new timing; sound-dialog.spec.ts checks the voice test plays voice-sample.m4a; reduced motion: no window animation, 300 ms fade. Manual: describe the window pass on the TV in the PR.

Review focus (put this line in the PR body): window reads as a passer-by and is flash-safe; lanterns unchanged; zoom constant and 10 (e) hold intact; voice sample loudness stated.

When done: set the P9 Status row in the runbook, run pnpm check and the affected spec files, push, and open a PR titled "feat(bloodtower): window passer-by, slower zoom, voice sample (playtest-1 P9)".
```
