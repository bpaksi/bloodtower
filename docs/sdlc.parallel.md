
## Parallel work (several developer agents at once)

The loop above runs one step at a time unless a plan says otherwise. This section is how a milestone runs steps in parallel without agents colliding. Merging stays serial and stays Bob's.

### 1. Plans declare dependencies and touch-sets

Every step in `apps/<app>/plans/Mx-*.md` carries three fields:

```markdown
### Step 3: <title>
- Depends on: 1            # step numbers, or "none"
- Touches: apps/game/src/combat/**, packages/dice/**
- Deps change: no          # yes if it edits any package.json or pnpm-lock.yaml
```

A **batch** is a set of steps whose dependencies are already merged, whose `Touches` globs do not overlap, and where at most one has `Deps change: yes`. The plan lists its batches and landing order:

```markdown
## Batches
- B1: 1
- B2: 2, 3, 4   (land order: 3, 2, 4)
- B3: 5
```

**Gate (Bob):** approving the plan approves its batches. A step may not start before its batch is approved. Deviations that change `Touches` or dependencies update the plan in the same commit, as now.

### 2. One worktree per step

- `pnpm wt <branch>` runs `git worktree add ../DarkTower-wt/<branch> -b <branch> main`, then `pnpm install --frozen-lockfile` there and writes a `.wt.json` with the step's port offset and DB path.
- `pnpm wt:rm <branch>` removes the worktree after landing.
- A developer agent works only inside its own worktree. It never touches the main checkout or another worktree.
- Hooks resolve the branch and repo root from the folder the command runs in (`git rev-parse --show-toplevel`, `--abbrev-ref HEAD`), never from the main checkout. Add a hook test that runs the main-commit guard from inside a worktree.
- Guardrail: a PreToolUse hook blocks edits and shell writes outside the agent's own worktree path (exit 2).

### 3. No shared runtime state

| Resource | Rule |
|---|---|
| Dev server / Playwright ports | Base port + `.wt.json` offset (e.g. 3000 + 10·n). Playwright config reads it. |
| SQLite files | One per worktree, path in `.wt.json`; never a shared absolute path. |
| `pnpm-lock.yaml` / any `package.json` | Only the one step per batch marked `Deps change: yes`; `pnpm check` fails a branch that changes the lockfile without that flag. |
| Generated files / snapshots | Stay inside the worktree; never written to the main checkout. |

### 4. Landing stays serial: rebase, recheck, merge

`pnpm land <branch>` (Bob only, as now) becomes:

1. Rebase the branch on the current `main`.
2. Rerun `pnpm check` on the rebased result.
3. Merge only if both pass. On a conflict or a failed check, stop: the branch goes back to its developer agent with the error, and Bob lands the next branch in the batch order.

Batches land in the order the plan lists. Later branches in the same batch are rebased as each earlier one lands.

### 5. Evidence per batch

Verifier and reviewer still run per branch, in that branch's worktree. When a batch finishes, the coordinator hands Bob one summary: per branch the check output, verifier result, reviewer Important findings, and the proposed landing order. Bob judges the batch and lands in order.

### 6. Coordinator

`.claude/agents/coordinator.md` (or a `/batch` skill):

- reads the approved plan and the next batch,
- runs `pnpm wt` for each step and starts one developer agent per worktree,
- collects each branch's evidence and writes the batch summary,
- never merges, never runs `pnpm land`, never edits intent, and never starts a step outside the approved batch.

Start with two or three agents per batch. Raise the cap once first-pass `pnpm check` success stays high.

### Metrics to add

- Rebase conflicts per landed branch (leading). Recurring ones mean the touch-sets are too coarse.
- Batch wall-clock time vs. the same steps run serially (lagging).
