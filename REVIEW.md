# Review guide

The `reviewer` agent reviews a branch diff against this file, the app's `spec.md` and the plan step the branch implements. It reads and reports. It never edits.

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

## Severity

| Level | Meaning | Limit |
|---|---|---|
| Important | Must be fixed before merge: a bug, a safety problem, or an unrecorded deviation | No limit |
| Nit | Style, naming or a small simplification | At most 5, most useful first |

## Report format

Start with one line: **Ready to merge**, or **Not ready: N Important**.

Then list findings, Important first. Each finding has:

- `file:line`
- what is wrong, in one sentence
- a concrete failure: the input or state, and the wrong result

End with what was not reviewed, and why.

A finding needs evidence from the code. If something is only a suspicion, say so and label it a question, not a finding.
