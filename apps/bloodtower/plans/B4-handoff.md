# B4 hand-off: R1 step 10 (acceptance e2e and timing report)

Paste everything below the line into Claude Code on Bob's Mac, started at the root of the main checkout (`~/Development/Personal/DarkTower`). It runs under the **Local mode** rules in `docs/sdlc.md`.

---

You are building batch **B4** of `apps/bloodtower/plans/R1-step1-foundation.md` in the repo `bpaksi/bloodtower`. B1, B2 and B3 are merged (B3 = PR #28, commit `8e2a58d`). B4 is **step 10 only**: acceptance e2e and timing reconstruction. Step G-R1 (Bob on hardware) comes after B4 and is not yours.

## Rules

- Never edit, stash, or switch branches in the main checkout. Create a worktree: `pnpm wt cursor/bloodtower-r1-b4` (or `git fetch origin && git worktree add ../DarkTower-wt/cursor/bloodtower-r1-b4 -b cursor/bloodtower-r1-b4 origin/main`, then `pnpm install --frozen-lockfile` there). Work only inside it.
- Use pnpm, never npm. No dependency changes (`Deps change: no`): do not touch any `package.json` or `pnpm-lock.yaml`. If Playwright browsers are missing, run `pnpm -F bloodtower-e2e exec playwright install chromium`; that is not a dependency change.
- Follow `.claude/agents/developer.md`, `REVIEW.md` and `docs/sdlc.md`.
- Ports and SQLite come from `.wt.json` (e2e port, `dataDir`). Never use a shared absolute path.

## Read first

- `apps/bloodtower/plans/R1-step1-foundation.md`: Step 10, Batches (B4 row), Acceptance criteria AC-1..AC-9, Out of scope, Deviations B1..B3 (especially D16, D17 and the B3 notes on `/ws`, the join URL, the mock tower and `TOWER_URL`).
- `apps/bloodtower/spec.md`: §3 protocols contract (frozen), §5 timing rows (PRD-41, must match the funeral POC exactly), §6 tower safety, §7 traceability (the `AC-1..AC-9 | 10` row), §8 out of scope, §9 test pack.
- `docs/sdlc.md`: §4 merging and the Local mode section.
- Existing code: `apps/bloodtower/src/e2e/{playwright.config.ts,tests/smoke.spec.ts}`, `src/server/hub/**`, `src/server/timing/**`, `src/server/db/**`, `src/server/scripts/packLint.ts` (pattern for a script), `packs/test/`.

## Scope (plan step 10)

Touches: `apps/bloodtower/src/e2e/tests/**`, `apps/bloodtower/src/server/scripts/timingReport.ts` (+ its test next to it). Also allowed: the plan's Deviations/Results and `spec.md` §7 rows to record what is now proved. Anything else is a deviation: record it in the plan's `### B4 (step 10)` Deviations in the same commit, and keep it small.

1. **Playwright acceptance suite** with one Story board context and two device contexts, mock tower, running the test pack's first night end to end. Automate AC-1..AC-9 where possible:
   - AC-3: board page has no interactive elements, shows QR + six-digit code; assert on captured WS frames that the board never receives a private line or an `ipad:*` payload.
   - AC-4: join by the join URL (the QR target), pick one and several hunters, Begin blocked until every hunter is held.
   - AC-5: both devices press Continue in the same tick; exactly one wins, both screens and the board update; both rows in `control_presses` with device ids and winner flag (read the e2e SQLite under `dataDir`).
   - AC-6: a private moment reaches only the holder's device; an absent hunter's `~no-` variant plays where the test pack has one.
   - AC-7: close the only holder's context → pause at once; rejoin with the device token → resume; pause marks carry the cause.
   - AC-8: every moment, press, pause and fallback cue has a timing mark with monotonic and wall time; the timing report reconstructs the run.
   - AC-9 (mock part only): connect and calibrate from either device, first press wins, status/battery on the board, and no light/sound/drum command is sent (assert on the mock). The real-tower part is G-R1, manual.
   - AC-1 / AC-2 are already covered by check/build/smoke and `pack:lint` tests; reference them, do not duplicate.
2. **`timingReport.ts`**: given a session id (default: latest session) and the SQLite file from config, print that session's timing rows as a readable timeline (relative monotonic time, wall time, kind, moment/prompt, device, cause). Do not add a `package.json` script. `pack:lint` is `tsx scripts/packLint.ts` in `src/server/package.json` (forwarded by `apps/bloodtower`), so run the report the same way: `pnpm -F bloodtower-server exec tsx scripts/timingReport.ts [sessionId]` (pnpm runs it from `apps/bloodtower/src/server`). Put this run command in the PR body, not the README.
3. **B3 review nits are out of B4 scope.** Do not fix them in this PR; they go to a separate small follow-up PR (they touch `src/web/components/device/**` and `src/server/hub/**`, outside step 10). List them under "Follow-ups" in the PR body:
   - The join page shows the device token; it should not be displayed (rejoin still works via storage/paste).
   - The QR fails when the board is opened at `127.0.0.1`/`localhost`; the join URL must use a LAN address (pick a non-loopback IPv4 interface when the local address is loopback, or warn on the board).
4. Update `spec.md` §7 traceability: the AC rows now proved, with test file names. Add `### B4 (step 10)` under Deviations and keep Results for Bob's G-R1.

## Out of scope

- Everything in the plan's Out of scope and spec §8 (live tower effects, wizard beyond QR/holdings, choices, investigation, queue, replay, tabs, battle, advantages, quest tokens, dungeon, encounters, endings, stats summary, Dracula pack).
- **Section 11 dungeon rooms schema.** Gamewright is drafting §11.1 (room schema) and V-24/V-25 in a separate docs PR. Do not invent a schema or rules; §11 stays opaque data (D13). `crypt.`/`end.` moments are not run.
- Waiting on cue `hold_s`.
- Any protocols change (contract frozen after step 1), any dependency change, any edit under `apps/tower-poc` or `apps/burgomaster-funeral-poc`.
- Real-tower runs (G-R1, Bob).

## Exit tests (all must pass in the worktree)

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm --dir apps/bloodtower pack:lint
pnpm --dir apps/bloodtower e2e        # = pnpm -F bloodtower-e2e e2e
# timing report against the e2e session database
pnpm -F bloodtower-server exec tsx scripts/timingReport.ts [sessionId]   # same runner as pack:lint
git diff --stat origin/main -- apps/tower-poc apps/burgomaster-funeral-poc   # must be empty
git diff --stat origin/main -- '**/package.json' pnpm-lock.yaml             # must be empty
```

Manual checks (record results in the PR body; mark anything not done as "not verified"):

- `pnpm --dir apps/bloodtower dev`, open `/board` at the Mac's LAN address (not `127.0.0.1`, a known B3 issue left for the follow-up PR).
- Scan the QR with a phone or iPad on the same Wi-Fi, join, and hold a hunter.
- Run one night to the end; run the timing report and check the timeline matches what happened.

## PR

- Branch `cursor/bloodtower-r1-b4` (B3 used `cursor/bloodtower-r1-b3-…`).
- Title: `feat(bloodtower): R1 foundation batch B4 (step 10)`.
- Body: plan step id (`R1 step 10, batch B4`), what was built, AC-1..AC-9 table (automated / manual / not verified, with test names), exit-test commands with exit codes and test counts, deviations (link the plan section), Follow-ups (the two B3 nits), open questions, and review rounds used.
- Open with `gh pr create --base main`. Do not merge. Wright reviews and merges.

## Local review loop (replaces the cloud reviewers)

After the PR is open and `check` is green, run up to **3 rounds**:

1. Start two subagents on the PR branch:
   - **reviewer** (`.claude/agents/adversary-bugs.md`): bugs, edge cases, races, security/privacy, tower safety, weak or flaky tests, scope creep. Adversarial.
   - **verifier** (`.claude/agents/verifier.md` + `adversary-prd.md`): conformance to plan step 10, AC-1..AC-9, spec §3/§5/§6/§7/§8, out-of-scope list; it **runs** the exit tests above and reports exit codes.
   Each posts its report on the PR with `gh pr review --comment` (or `gh pr comment`), ending in `Blocking: none` or `Blocking: <n>`.
2. Models: round 1 default model; round 2 Opus with high effort; round 3 Opus with max effort.
3. Fix the blocking findings, push, answer each finding on the PR, start the next round.
4. Stop when both say `Blocking: none` and `check` is green. If blockers remain after round 3, `gh pr edit --add-label needs-bob`, list the open findings in a PR comment, and stop.

Finish by reporting the PR URL, rounds used, and anything not verified.
