Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 11-remove-ipad-enable-sound — No iPad plays sound: remove the per-iPad Enable sound step

- Brief: ./plan.md
- Mockup: none
- Risk: Med (tower safety and restore: EV-11 to EV-13)

## Checks

### EV-01 — No iPad shows an unlock step, on either track
- Requirement: DEC-903, DEC-201: no iPad ever asks to enable sound.
- Method: playwright
- How: update `c2-session-enter.spec.ts` (the test "Pick story starts with Enable sound on each iPad, then levels, Keep and the story list" is rewritten) and `support/acceptance.ts` (line pressing `sound-enable` removed). Two iPad contexts reach Pick story on the connect track and on Play without Tower; read each iPad's body text and button labels.
- Pass evidence: connect track: each iPad's first body labels are exactly "Volume 0", "Volume 1", "Volume 2" (Keep and Try another as C2/05 EV-16 says); no text "Enable sound" or "Tap once to turn on this iPad's sound." anywhere on either iPad. Without tower: the story list is the first body.
- Fails if: the old line or button still shows on any iPad or track, or the spec still presses `sound-enable`.

### EV-02 — The removed code is gone, not hidden
- Requirement: the step and its copy leave code, specs and tests (step 60).
- Method: unit
- How: a source check (new test beside `sound.test.ts`) that greps `apps/bloodtower/src` and `apps/bloodtower/spec.md` for `sound-enable`, `enable-sound`, `ENABLE_SOUND_LINE`, `turn on this iPad`, `Enable sound`, `volume-line-off`, `volumeLineLive` outside the test's own file and the old-event tolerance (EV-12).
- Pass evidence: zero matches; `spec.md` §3 v2 no longer describes the Enable sound button and says no iPad plays sound.
- Fails if: the button is only hidden by CSS or a flag, or a string survives in a help table, comment or spec.

### EV-03 — The volume step still works on the connect track
- Requirement: DEC-903: the tower volume step is unchanged (SCR-006).
- Method: playwright
- How: the C2/05 EV-09 and EV-17 specs, run unchanged: press Volume 1, Try another, Volume 2, Keep, with the mock tower.
- Pass evidence: two `sound.play-stateful` for #58 (volume 1 then 2); Keep disabled until a play is logged; after Keep the kept volume is 2 and the next move-roll cue is sent at volume 2; the board line "How loud should the tower be? Press one to hear it." is at full strength from the first view, with no `bt-row--disabled`.
- Fails if: Keep is enabled before a play, or the line is greyed until some other press.

### EV-04 — Play without Tower has no volume step and no volume line
- Requirement: DEC-903 (replaces the 6:15 PM board-line rule for the no-tower track).
- Method: playwright
- How: choose Play without Tower, then read the board and each iPad on Pick story; read the host's sent tower commands.
- Pass evidence: board has no line containing "How loud"; no iPad button named "Volume 0/1/2", "Keep" or "Try another"; the story list shows at once; zero `sound.play-stateful` commands.
- Fails if: any volume UI shows without a tower, or the volume step is skipped on the connect track.

### EV-05 — No iPad context plays any sound
- Requirement: DEC-201.
- Method: playwright
- How: with `AudioContext` and `HTMLMediaElement.play` instrumented in each iPad context, run the join, Pick story and a Volume press on the connect track.
- Pass evidence: zero audio plays or context resumes in any iPad context; sound plays only as tower commands or on the Story board page.
- Fails if: an iPad resumes an audio context or plays a clip on any press.

### EV-06 — The removed copy is flagged for Loremaster
- Requirement: the removed strings are signed off before merge.
- Method: unit
- How: the PR body lists the strings removed ("Tap once to turn on this iPad's sound.", "Enable sound", the gear help line "Tap Enable sound so this iPad can play the story's voice and sound.", the greyed volume-line state) and cites Loremaster's sign-off.
- Pass evidence: the four strings are in the PR body with the sign-off link; a test asserts none is in the source (EV-02).
- Fails if: a string is removed without being listed, or listed without sign-off.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Nothing physical without a press
- Amended 2026-11-15 (PT-24, Bob approved in chat): a host restart never reconnects the tower, so "exactly one `sound.play-stateful` after the press" could not hold after a restart.
- Requirement: root CLAUDE.md "Tower safety"; C2/05 EV-07, EV-19.
- Method: playwright
- How: connect track: join, reach Pick story, reload each iPad, restart the host and Continue, reading the mock tower's log throughout; separately, press Volume on the connected tower (before any restart).
- Pass evidence: zero tower commands after join, after each iPad reload, and after a host restart plus Continue, before any Volume press; a Volume press on a connected tower (before any restart) sends exactly one `sound.play-stateful`.
- Fails if: a load, restore or Continue sends a sound, or the removed unlock press was replaced by an automatic one.

### EV-12 — An old autosave and an old `sound-unlock` event still load
- Requirement: no saved game is lost by the removal (cf. C2/05 EV-18).
- Method: unit
- How: load the existing C2/05 EV-18 checkpoint fixture (`server/core/fixtures/**`) and an event log containing `{ kind: "sound-unlock", v: 1, deviceId }`; restore and step.
- Pass evidence: both restore; the state has no Enable sound step; the old event is ignored with exactly one `debug` line naming it and no error log and no error toast (Bob, 2026-11-14, adopted); see EV-15 for the branch.
- Fails if: restore throws, the event is silently dropped with no log at all, or it is logged as an error for an expected case.

### EV-13 — Kept volume, tower choice and board audio unlock survive
- Amended 2026-11-15 (PT-24, Bob approved in chat): `keptVolume` resets on restore (pre-existing) and no tower is linked after a restart, so a kept volume cannot reach a cue after a restart.
- Requirement: the plan's Survival invariants.
- Method: playwright
- How: connect track: Keep volume 1 and read the game's first move-roll cue (no restart); then restart the host and Continue; then Play without Tower in a second session and restart; then open the landing page and click once.
- Pass evidence: the first move-roll cue is sent at volume 1; after the restart and Continue no tower command is sent; the no-tower session resumes without a tower question or volume step; the board plays its sound after the first landing click as before.
- Fails if: the cue ignores the kept volume, a restart or Continue sends a tower command, the tower question returns, or the board's audio needs a new unlock.

### EV-14 — The gear Volume item is greyed, not hidden, with no tower
- Requirement: Bob, 2026-11-14 (ruled): DEC-227, DEC-903; amends C2/04 EV-12.
- Method: playwright
- How: Play without Tower, in a game; open the gear Menu on an iPad (768x1024); read the Volume item; press it; then repeat on the connect track with the tower connected.
- Pass evidence: no tower: "Volume" is present in `[data-menu]` in its place under "Table", disabled, with a reason line that equals the Copy table's `gear.volume.no-tower`; pressing it sends no frame, opens no `[data-panel="volume"]`, and `paused` stays false. Connect track: Volume is enabled and opens its panel as C2/04 EV-12 says.
- Fails if: the Volume item is absent without a tower, is enabled, has no reason line, or the reason is written in code but not in the Copy table.

### EV-15 — An old `sound-unlock` has its own branch, not the unknown-event path
- Requirement: Bob, 2026-11-14, adopted: accepted and ignored with a `debug` line.
- Method: unit
- How: in `stepShell` tests, step with `{ kind: "sound-unlock", v: 1, deviceId }`, then with a made-up unknown kind; capture the log.
- Pass evidence: the old kind yields a `debug` line and no state change; the made-up kind still takes the generic unknown-event path (its existing log level, unchanged); the two paths are separate (the old kind does not reach the unknown-event handler).
- Fails if: the old kind is handled by the generic unknown-event path, is logged as an error, or the unknown-event path was loosened to let it through.

## Assumptions surfaced

- C2/05's amended eval text (EV-01, 09, 10, 14, 15, 16, 17) is the contract for what the iPad shows; C2/04 EV-11 and EV-12 were amended in place on 2026-11-14 → Bob re-approves them in his batch row as a gate.
- Gear Volume item without a tower is greyed with a reason line → decided: Bob, 2026-11-14 (ruled); EV-14; new Loremaster string `gear.volume.no-tower`.
- Old `sound-unlock` events are accepted and ignored with a `debug` line in an explicit `stepShell.ts` branch → decided: Bob, 2026-11-14, adopted; EV-12, EV-15.
