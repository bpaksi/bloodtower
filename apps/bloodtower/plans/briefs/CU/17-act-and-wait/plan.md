Keep this a checklist; do not write a second design doc.

# Brief: CU / 17-act-and-wait — e2e specs wait for the view their press leads to

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (queue step 66, order 13b)
- Feature: 17-act-and-wait
- Kind: test infrastructure (one read-only view field pair, one data attribute, shared spec helpers, a repo check, spec migration). No game rule, screen look or copy changes.
- Owner: Claude Code (brief, build); Bob approves
- Related AREA/docs: Bob's question of 2026-11-23 ("does the iPad code need refactoring, or are the tests built wrong?"); finding: the tests. Flakes it closes: #599 (fixed by #601), #590 (f1-04 hangs locally, open), the c3-hints EV-01 and c2-play-again drill-in races (#603). Root-cause notes: the e2e-local-races finding of 2026-11-23. [decision 0003](../../../../../../research/decisions/0003-error-logging.md) (never hide errors).
- Evals: ./eval.md
- Mockup: none (no screen change)
- Risk: Med (a protocol field and the host's send path; nothing physical)
- Depends on: its approval.md on main. PR 1 starts after #603 merges (it edits `c3-hints.spec.ts` and `c2-play-again.spec.ts`, which PR 2 rewrites).
- Deps change: PR 3 only (root `package.json` `check:repo` script line; no dependency added or changed)
- Runs: PR 1 and PR 2 local (protocol and host send path; the flakes show on Bob's Mac). PR 3 to PR 7 cloud.
- Model: PR 1 opus (protocol and host). The rest sonnet.

### The problem, from main (ed60eebe)

- The host sends each iPad its `deviceView` over the socket (`server/hub/host.ts` `deviceMessage` ~334, `broadcastImpl` ~348). React renders it later. A press goes through `engine.act` (`server/core/session.ts` ~727), most kinds through the async `enqueue` (~598), and the view that shows it comes on a later broadcast.
- Broadcasts also come from things that are not the press: another iPad's press, the tower watch (~381, 200 ms), hint and grace timers (session ~557, ~591, ~722), the board's `narration-ended`. So "a new view arrived" does not mean "my press was taken".
- Specs click and then read the DOM at once with reads that do not retry (`evaluateAll`, `allInnerTexts`, `getAttribute`, `count`). They read the old screen, or click a button the next view removes (`click()` has no action timeout, so it waits out the 420 s test timeout).
- In `apps/bloodtower/src/e2e/tests/` on main: 37 files define their own `clickAct`, 30 `deviceMain`, 7 `readStatus`, 5 `pressOnce` (raw socket sends from `__btLastDeviceView`). 111 `waitForTimeout` calls, about 300 non-retrying reads, 9 hand-rolled deadline loops.

### The design

1. **Two numbers on the device view** (read-only; PR 1).
   - `seq`: a per-device counter the host raises by one on every `deviceView` it sends that device. Starts at 1 for each device id in a host process.
   - `acked`: how many presses from that device the host has finished handling, taken or refused. Raised when the handling ends: after `apply` resolves for an enqueued press (with follow-up tower results `volume-result`, `piece-check-drum-result`, and `tower-result` enqueued on `applyQueue` with ack ownership forwarded to the follow-up so `acked` rises once the follow-up resolves and `applyQueue` ordering with `tower-snapshot` is preserved; in-apply `view-refresh` effects are filtered out before `runShellEffects` because the tail broadcast covers them), or at the `return` of a refused or no-op press (bad args, event refusal, unknown gear action). After it rises, the host sends that device a view, even if nothing else changed.
   - Both are stamped in `host.ts` `deviceMessage`, not in the engine's `projectDevice`, so the engine projection and its fixtures stay as they are. In the schema they are optional non-negative integers; the host always sets them (unit test). The `waiting` placeholder in `LiveDevice.tsx` has neither.
   - No new message type, no bytes, no capability or params: tower safety is unchanged. The board view is not touched.
2. **The DOM shows them** (PR 1). Both `main.bt-device` elements in `CoreDeviceScreen.tsx` (~922, ~995) get `data-view-seq` and `data-acked` from the view on screen. Absent on the placeholder.
3. **Shared helpers** in `apps/bloodtower/src/e2e/tests/support/device.ts` (PR 1):
   - `deviceMain(pad)`.
   - `act(pad, promptId, actionId, { timeout = 20_000 })`: finds `main.bt-device button[data-prompt-id][data-action-id]`, waits until enabled, reads `data-acked` (n), clicks with the same timeout, then waits until `data-acked` > n. Returns the new `seq`. On timeout it throws naming the prompt, the action, `data-screen` and the last seq, never a bare timeout.
   - `untilScreen(pad, screen, step?, { timeout })`: waits for `data-screen` (and the setup step, using the attribute the screen already renders; inspect first). For views the pad did not cause: another iPad's press, a timer, a host restart.
   - `readStatus(pad)`: reads every status attribute (day, moves, space, inside, building, acting hero, roll) and `seq` in one `evaluate`, so all fields come from the same render. Missing attributes come back `null`, never `0` or `""`.
   - `pressOpen(pad, { prefer, skip })`: replaces the five `pressOnce` copies. It picks from the buttons rendered on screen, then goes through `act`.
4. **Specs move to the helpers** and their local copies are deleted (PR 2, PR 4 to PR 7). A fixed sleep becomes a wait on a named attribute; a read straight after a press comes after `act` or `untilScreen`.
5. **A repo check** (PR 3): `scripts/check-e2e-waits.mjs`, run by `pnpm check:repo`, with `scripts/check-e2e-waits.test.mjs`. In `apps/bloodtower/src/e2e/tests/**/*.ts` it counts, per file:
   - `wait`: any `waitForTimeout(`.
   - `read-after-press`: a non-retrying read (`evaluateAll`, `allInnerTexts`, `allTextContents`, `getAttribute`, `count`, `innerText`, `textContent`, `inputValue`, `isVisible`, `isEnabled`, `isChecked`) after a press (`.click(`, `.tap(`, `clickAct(`, `pressOnce(`, a raw `send(` of an `act`) in the same function, with no wait between (`act(`, `untilScreen(`, `await expect(`, `expect.poll(`, `toPass(`, `waitFor`).
   - The allowlist `scripts/e2e-waits-allowlist.json` holds today's counts per file and rule. More than the allowlist fails. Fewer also fails, with the line to lower, so the list only shrinks. A file not in the list is allowed 0. `support/device.ts` is exempt by name.

### PRs (one branch each, in order)

| PR | Branch | What | Touches |
|---|---|---|---|
| 1 | `feat/bloodtower-cu17-view-seq` | Design 1 to 3, plus `support/device.test` spec proving the helpers (EV-01 to EV-06) | `apps/bloodtower/src/protocols/v2/views.ts`, `protocols/v2/schema.test.ts`, `src/server/hub/host.ts`, `src/server/hub/*.test.ts` (added cases), `src/server/core/session.ts` (the `acked` count and the send after a press), `src/server/core/*.test.ts` (added cases), `src/web/components/device/CoreDeviceScreen.tsx` (two attributes), `src/e2e/tests/support/device.ts` (new), `src/e2e/tests/act-and-wait.spec.ts` (new) |
| 2 | `chore/bloodtower-cu17-flaky-specs` | The specs that flaked: `c2-play-again`, `c3-hints`, `f1-04-chapter-one-win`, `w7-move-map`, `w7-fix-position`. Local copies deleted. `--repeat-each=10` evidence (EV-08) | those five spec files |
| 3 | `chore/bloodtower-cu17-e2e-waits-check` | The repo check and the allowlist at the counts left after PR 2 (EV-09 to EV-11) | `scripts/check-e2e-waits.mjs` (new), `scripts/check-e2e-waits.test.mjs` (new), `scripts/e2e-waits-allowlist.json` (new), root `package.json` (`check:repo` line only), root `CLAUDE.md` (one Commands row) |
| 4 | `chore/bloodtower-cu17-specs-w` | `w1-chrome`, `w2-step-1`, `w3-pick-story`, `w4-party`, `w5-setup`, `w6-board-layers`, `startup-frames-fit`, `sound-unlock`, `sound-dialog`, `smoke` | those spec files, `scripts/e2e-waits-allowlist.json` |
| 5 | `chore/bloodtower-cu17-specs-c2` | `c2-dialog-border`, `c2-ipad-awake`, `c2-session-enter`, `c2-session-screen`, `c2-tower-lost`, `join-hydration`, `ipad-parchment-shell`, `cu16-continue-repick` | those spec files, the allowlist |
| 6 | `chore/bloodtower-cu17-specs-c3` | `c3-building`, `c3-corruption-mark`, `c3-day`, `c3-event`, `c3-game-end`, `c3-panels`, `c3-quest`, `c3-skull-lines` | those spec files, the allowlist |
| 7 | `chore/bloodtower-cu17-specs-rest` | `a1-asset-id-label`, `a1-demo-playback`, `acceptance`, `area-077`, `c4-tuning-switches`, `d1-skull-loss`, `d4-fallen-quest`, `d5-pool`, `d6-fortunate`, `ee01-quest-pick`, `f1-03-live-quests` | those spec files, the allowlist, `support/acceptance.ts` and `support/walk.ts` if they hold copies |

- Every path above is under `apps/bloodtower/` unless it starts with `scripts/` or is a root file.
- PR 4 to PR 7 each share the allowlist, so they merge one after another (no batch runs two of them). A PR that finds a spec too large for its group (`c3-day` 1,410 lines, `w1-chrome` 1,328) may split off one file into its own PR; that updates this table in the same commit.
- The specs `playwright.config.ts` ignores (`visual-layer`, `board-look`, `backdrop-flicker`, `hunter-portraits`, `keeper-fit`, `opening-screens`, `startup-shell`, `landing`) stay as they are and stay in the allowlist.
- **The test-lock hook.** PR 2 and PR 4 to PR 7 are `chore/` branches (Bob, 2026-11-23): they change tests only and fix no app bug, so review fixes to a spec go on the same branch.

### Overlaps

- `chore/bloodtower-e2e-shards` (if still open) edits project gating in specs. Whichever lands second rebases; PR 2 to PR 7 keep each spec's `test.skip(testInfo.project.name ...)` lines as they are.
- CU/16 (`CoreDeviceScreen.tsx` ~852, ~882, ~1091 to ~1130) and C3/12 PR 2 (`web/components/device/**`): PR 1's hunks are ~922 and ~995 only. Separate hunks; the second rebases.
- #603 (`c3-hints`, `c2-play-again`): PR 1 waits for it; PR 2 rewrites the same helpers on top of it.

## What it does

1. Every iPad view carries `seq` and `acked`; the iPad's `main` shows them as `data-view-seq` and `data-acked`.
2. A spec presses with `act` and reads only after the host has handled that press and the view showing it is on screen.
3. Views a spec did not cause are waited for with `untilScreen`.
4. A new spec cannot add a fixed sleep or a read straight after a press; old ones shrink to zero file by file.

**Inspect first.** If a press path neither enqueues nor returns where design 1 says (a path that sends to the tower and waits), report it and stop that case. Do not raise `acked` before the handling ends.

**Out of scope** (do not widen): the board's own view and its specs' waits (`main.bt-board`; a later step if wanted); a global Playwright `actionTimeout`; the ignored visual specs; any app behaviour or look; the 9 deadline loops outside the five flaky specs, unless they sit in a file a PR migrates.

## Cutover

Cutover: Y

- The 37 local `clickAct`, 30 `deviceMain`, 7 `readStatus` and 5 `pressOnce` copies are deleted, each in the PR that migrates its file.

## Survival invariants

- Continue, restore, and restart must keep:
  - Every game rule and screen as on main: every existing spec's assertions keep their meaning (a migrated spec checks the same things, only waits differently).
  - Reconnect: a rejoined iPad gets a view with a `seq` higher than any it had from this host process (EV-07). After a host restart both start again; specs that restart the host use `untilScreen`, not `act`, across it.
  - Tower: no tower frame is sent by stamping, counting or the extra send after a press (EV-05).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] PR 1: EV-01 to EV-07 pass (verifier table on PR).
- [ ] PR 2: EV-08 passes: the five specs at `--repeat-each=10` on their projects, 0 failures, run on Bob's Mac and in CI, results in the PR body.
- [ ] PR 3: EV-09 to EV-11 pass.
- [ ] PR 4 to PR 7: EV-12 passes for that PR's files, and the full e2e suite is green in CI.
- [ ] Each PR: `pnpm check` passes; the PR body names the step (CU/17 PR n).
- Not required: a physical Tower run; migrating the board-side waits; zeroing the allowlist for the ignored visual specs.

## AREA / DEC checklist

- [ ] [decision 0003](../../../../../../research/decisions/0003-error-logging.md): helpers throw with the prompt, action and screen; the check prints the file, rule, count and allowed count. No error is swallowed by a helper.
- [ ] Tower safety (root `CLAUDE.md`): the UI still reaches the tower only through `command{capabilityId, params}`; `seq` and `acked` are numbers on a view.
- [ ] Approved e2e evals of other briefs keep passing unedited in meaning: a migrated spec keeps every `EV-` test title and assertion; only the waits change.

## Open questions

- **Ruled by Bob, 2026-11-23:**
  1. **The press signal. RULED (Bob, 2026-11-23, chat): `seq` and `acked`**, as above. `act` waits for `acked`, so a broadcast from a timer or another iPad cannot pass for the press. (The other choice was `seq` only, which a hint timer, the tower watch or another iPad's press could satisfy before the press is handled.)
  2. **test-lock on the migration branches. RULED (Bob, 2026-11-23, chat): `chore/bloodtower-cu17-...`** for PR 2 and PR 4 to PR 7. (The other choice was `fix/`, where test-lock allows spec changes only in the first commit.)
- **Left out. RULED (Bob, 2026-11-23):** the board side (`main.bt-board`) gets no `seq`.

## Eval approval

- See ./approval.md (must be filled before coding).
