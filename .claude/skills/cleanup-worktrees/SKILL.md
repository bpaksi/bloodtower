---
name: cleanup-worktrees
description: Clean up merged step worktrees and local branches. Use when Bob asks to tidy worktrees or branches, or runs /cleanup-worktrees. Reports first and deletes only after Bob says OK.
---

# Cleanup worktrees

Report first. Delete nothing until Bob says OK.

1. **Survey.** Run `git fetch --prune`, `git worktree list` and `git branch -vv`. Compare against `origin/main`, not the local `main`, which may be behind.
2. **Check each branch** other than `main` (and each worktree other than the main checkout):
   - Dirty: `git -C <path> status --porcelain`. Branches with no worktree count as clean.
   - Unpushed: `git log origin/<branch>..<branch>`, or all commits not in `origin/main` if the remote branch is gone.
   - PR merged: `gh pr list --state merged --head <branch> --json number,headRefOid`.
3. **Squash merges hide ancestry.** Branch commits are never ancestors of `main`, so do not use `git branch --merged`. Instead compare the branch tip with the merged PR's `headRefOid`. If they differ, run `git fetch origin pull/<n>/head` and check `git merge-base --is-ancestor <branch> FETCH_HEAD`. A tip that is not inside the PR head means unmerged work: KEEP.
4. **Table.** Show `branch | worktree path | dirty? | unpushed commits | PR merged? | proposed action`.
   - SAFE: clean, PR merged, and the tip is the PR head or inside it.
   - KEEP: anything else. Say why (for example an untracked scratch file).
5. **Odd refs.** Flag branch names that look wrong, such as a `BloodTower-work/...` branch with no worktree. Report them and leave them unless Bob names them.
6. **After OK, SAFE rows only.** `git worktree remove <path>` (never `--force`), then `git branch -D <branch>`, then `git worktree prune`.
7. **Finish.** Show the final `git worktree list` and `git branch -vv`.

Never touch `main` or the main checkout, and never delete anything on the remote.
