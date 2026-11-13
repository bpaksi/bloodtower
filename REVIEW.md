# Review guide

The `adversary-bugs` agent (which replaced the `reviewer` agent) runs these passes on every PR, against this file, the app's `spec.md` and the plan step the PR implements, and then attacks the change further. Every "Important" here is a blocking finding in the adversarial loop (docs/sdlc.md). It reads and reports. It never edits.

## Passes, in order

1. **Bugs.** Wrong logic, unhandled errors, races, leaked resources (sockets, timers, processes), and tests that cannot fail.
2. **Physical-action safety** (tower apps). Each of these is Important:
   - a path from the UI to the tower that bypasses the command executor
   - a message type or parameter that can carry raw bytes to the tower
   - a physical action that runs automatically: on connect, on reconnect, on restore, or as a retry
   - mechanics available before calibration
   - an unknown or stale value shown as current, or as zero
3. **Spec and plan compliance.** The diff does what the plan step says and no more. Any deviation is recorded in the plan or spec in the same branch. Decision-log entries (D1…) are respected.
4. **Repo rules.** No imports across app folders. Dependencies are exact pins. `ultimatedarktower` and `scripts/pinned-versions.json` are unchanged. No edits under `apps/*/intent/`: check the diff itself, because the hook that guards intent reads shell commands only on a best-effort basis. No secrets.

## What blocks, and the report

These follow the review loop in [docs/sdlc.md](docs/sdlc.md) §4, which was trimmed on 2026-10-19 (PR #102). Where an older habit and that section differ, the section wins.

- **Blocking.** Only what §4 "What blocks" lists: a regression against `main`; a `Done when` item not met, or not proven by a test that can fail; a broken standing rule (pass 2 above, privacy, a message-type rule, an unknown shown as zero, an edit to intent, an error eaten or hidden); a change outside the step's `Touches` or an undeclared dependency change. An "Important" in the passes above is a blocking finding.
- **Non-blocking.** Nits (at most 5, most useful first), spec holes for Bob or Gamewright, and follow-ups marked `Follow-up:`.
- **Report.** The format is in [.claude/agents/adversary-bugs.md](.claude/agents/adversary-bugs.md), "Post on the PR": the round and head sha first, findings with file, line, what breaks and how to reproduce, and a last line that is exactly `Blocking: none` or `Blocking: <count>`. Say what was not reviewed, and why.

A finding needs evidence from the code. If something is only a suspicion, say so and label it a question, not a finding.
