---
name: cleanup-worktrees
description: Clean up merged step worktrees, Desktop-session worktrees and local branches. Use when Bob asks to tidy worktrees or branches, or runs /cleanup-worktrees. Reports first and deletes only after Bob says OK.
---

# Cleanup worktrees

Report first. Delete nothing until Bob says OK. The checks live in `scripts/cleanup-worktrees.mjs` (docs/sdlc.md §8); do not redo them by hand.

1. **Report.** Run `pnpm cleanup:worktrees`. It runs `git fetch --prune`, compares against `origin/main` (not the local `main`), and prints one table: `action | branch | worktree | why`. Show Bob the table.
   - SAFE: clean, no open PR, and either the tip is a merged PR's head (or inside it, since a squash merge leaves no ancestry) or the branch holds no commit beyond `origin/main`.
   - KEEP: anything else, with the reason: uncommitted or untracked files, an open PR, commits that never merged, or this worktree.
2. **Check for live sessions.** An empty branch (`no commit beyond origin/main`) is also what a live session that has not committed yet looks like. When running in Claude Desktop (if `mcp__ccd_session_mgmt__list_sessions` is available), list the sessions and move any `claude/*` row that belongs to a running session to KEEP before asking. In T3 Code, check active threads with `t3_thread_list` so you do not remove a worktree belonging to a running thread.
3. **Odd refs.** Flag names that look wrong, such as a `BloodTower-work/...` branch with no worktree, or a branch checked out under another branch's folder. Report them and leave them unless Bob names them.
4. **After OK.** Run `pnpm cleanup:worktrees --apply`. It removes the SAFE rows only: `git worktree remove` (never `--force`), then `git branch -D`, then `git worktree prune`. A worktree git will not remove is reported as FAIL and its branch stays. Add the failures to the report.
5. **Finish.** Show the final `git worktree list` and `git branch -vv`.

Never touch `main` or the main checkout, and never delete anything on the remote. KEEP rows with unmerged work (such as `never merged` or `no merged PR`) are Bob's to push or drop; offer, do not decide.
