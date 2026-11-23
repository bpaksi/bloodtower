Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 17-act-and-wait — e2e specs wait for the view their press leads to

- Brief: ./plan.md
- Mockup: none
- Risk: Med (protocol field, host send path). Negative and reconnect evals are included.

All e2e fixtures: `startAcceptanceHost` or the suite's web server, the test pack, Play without Tower unless named. "Pad" is one iPad page.

## Checks

### EV-01 — Every device view carries seq and acked
- Requirement: plan.md design 1.
- Method: unit
- How: `server/hub` test "CU17 EV-01": join one device, press a valid action, collect the `deviceView` frames that device gets.
- Pass evidence: every frame has integer `seq` and `acked`; `seq` goes 1, 2, 3… with no gap or repeat; the schema refuses `seq: -1`, `seq: 1.5` and `acked: "1"`.
- Fails if: a frame has no `seq`, `seq` repeats or skips, or the schema takes a bad value.

### EV-02 — acked rises only after the press is handled
- Requirement: design 1.
- Method: unit
- How: `server/core` or `server/hub` test "CU17 EV-02": hold the `apply` of an enqueued press on a promise the test controls; fire a timer broadcast meanwhile; then release.
- Pass evidence: the frame from the timer broadcast has the old `acked`; the first frame after release has `acked` + 1 and shows the press's screen.
- Fails if: `acked` rises when the act message is received (before `apply` ends), or a frame with the new `acked` still shows the old screen.

### EV-03 — A refused or no-op press still acks
- Requirement: design 1.
- Method: unit
- How: test "CU17 EV-03": send (a) `hero-hold` `take` with no `heroId`, (b) an event press from an iPad that holds no present hero, (c) gear action `bogus`.
- Pass evidence: each gets a `deviceView` with `acked` + 1 to that device; (b) and (c) still log their error and (b) still sends the error frame.
- Fails if: no view follows a refused press (the helper would hang), or the existing error log or error frame goes away.

### EV-04 — acked and seq are per device
- Requirement: design 1.
- Method: unit
- How: test "CU17 EV-04": two devices; device 1 presses twice.
- Pass evidence: device 1's `acked` is 2; device 2's `acked` stays 0 while its `seq` still rises with each broadcast.
- Fails if: one counter is shared by both devices.

### EV-05 — Nothing physical, nothing on the board
- Requirement: tower safety; design 1.
- Method: unit
- How: test "CU17 EV-05": with the fake tower, press a non-tower action; inspect tower frames and the `boardView` payload.
- Pass evidence: no tower frame is sent by the press or the extra send; `boardView` has no `seq` or `acked` key.
- Fails if: a tower frame appears, or the board view gains either field.

### EV-06 — act waits for the press, not just any view
- Requirement: design 3.
- Method: playwright
- How: `act-and-wait.spec.ts` "CU17 EV-06", ipad project: on pick-story, `act` the test story's continue; right after it, read `data-screen` with a plain `getAttribute`. Then `act` a button on a second pad while the first pad is idle, and check `untilScreen` on the first pad. Then call `act` with a prompt id that is not on screen with `timeout: 2_000`.
- Pass evidence: the plain read right after `act` is `game-settings`, 50 of 50 runs (`--repeat-each=50`); `untilScreen` passes on the idle pad; the missing button fails in about 2 s with a message naming the prompt, the action and the screen.
- Fails if: the read is ever `pick-story`, the missing button waits out the test timeout, or its message is a bare Playwright timeout.

### EV-07 — Reconnect keeps seq rising; DOM shows the view on screen
- Requirement: design 1, 2; survival invariant (reconnect).
- Method: playwright
- How: `act-and-wait.spec.ts` "CU17 EV-07": read `data-view-seq`; close and reopen the pad's socket (the existing reconnect path); `untilScreen` the same screen.
- Pass evidence: the new `data-view-seq` is higher than before; `data-view-seq` and `data-acked` equal the last `deviceView` payload the page rendered; the waiting placeholder has neither attribute.
- Fails if: `seq` goes back to 1 on reconnect within a host process, or the DOM shows a number from a view not yet rendered.

### EV-08 — The flaky specs pass ten times running
- Requirement: the task (Bob, 2026-11-23); PR 2.
- Method: playwright
- How: `pnpm --dir apps/bloodtower e2e -- c2-play-again c3-hints f1-04 w7-move-map w7-fix-position --repeat-each=10`, each on the projects it runs on (c2-play-again desktop; c3-hints and f1-04 ipad; w7-* phone, ipad and desktop). Once on Bob's Mac, once in CI (a workflow_dispatch or a temporary job on the PR head).
- Pass evidence: the run summary for each, 0 failed, 0 flaky, pasted in the PR body; none of the five files defines `clickAct`, `deviceMain`, `readStatus` or `pressOnce`; none calls `waitForTimeout`.
- Fails if: any run fails or is retried, or a local copy is left.

### EV-09 — The check fails a new sleep and a read after a press
- Requirement: design 5.
- Method: unit
- How: `scripts/check-e2e-waits.test.mjs` "EV-09": fixture spec files (a) `await page.waitForTimeout(100)`; (b) `await button.click(); const n = await rows.count();`; (c) the same as (b) with `await expect(main).toHaveAttribute("data-screen", "x")` between; (d) `await act(pad, "p", "a"); const n = await rows.count();`.
- Pass evidence: (a) and (b) fail with the file, rule and line; (c) and (d) pass.
- Fails if: (a) or (b) passes, or (c) or (d) fails.

### EV-10 — The allowlist only shrinks
- Requirement: design 5.
- Method: unit
- How: `check-e2e-waits.test.mjs` "EV-10": a fixture file with 3 sleeps and an allowlist of 2, of 3 and of 4; a file missing from the allowlist with 1 sleep.
- Pass evidence: 2 fails ("3 > 2"); 3 passes; 4 fails and names the line to lower; the missing file fails ("allowed 0").
- Fails if: a count above or below the allowlist passes, or a file not listed may add a sleep.

### EV-11 — The check runs in pnpm check, and passes on main
- Requirement: design 5.
- Method: unit
- How: `pnpm check:repo` on PR 3's head; then add one `waitForTimeout` to a migrated spec locally and run it again.
- Pass evidence: first run exits 0; second exits non-zero naming that file. Output of both in the PR body.
- Fails if: the check is not part of `check:repo`, or main's current specs fail it.

### EV-12 — Each migration PR lowers the allowlist and keeps the evals
- Requirement: design 4; survival invariant (assertions keep their meaning).
- Method: playwright
- How: per PR 4 to PR 7: the repo check and `git diff` of `scripts/e2e-waits-allowlist.json`; the full e2e suite in CI; a list of each migrated file's `test(` titles before and after.
- Pass evidence: every migrated file's counts are lower or removed, none higher; no migrated file defines `clickAct`, `deviceMain`, `readStatus` or `pressOnce`; the test titles are the same set before and after; CI e2e green.
- Fails if: a count rises, a local copy stays, a test title (an EV) disappears or is renamed, or CI e2e is red.

## Survival evals (one per survival invariant in plan.md)

- Game rules and screens: EV-12 (titles kept, CI green).
- Reconnect: EV-07.
- Tower: EV-05.

## Assumptions surfaced

- `acked` is needed, not only `seq` → Bob ruled yes, 2026-11-23 (plan.md Open questions 1).
- Migration branches are `chore/`, not `fix/`, so test-lock does not block review fixes → Bob: ? (plan.md Open questions 2).
- A press that waits on the tower inside `apply` acks only when the tower answers; `act`'s 20 s default covers the fake tower in e2e. Real-tower runs are not e2e.
