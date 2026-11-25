# Plan format

Every plan is GitHub issues in one milestone. There is no other format. `plan.py` refuses anything that doesn't match, and `plan-run` won't start until it does.

## The plan

- A plan is an **open milestone whose title starts with `Plan:`**, for example `Plan: Guild hall v2`. Its description can link a longer plan doc.
- The **latest plan** is the open `Plan:` milestone with the highest number. Pass `--milestone "<title>"` to pick another.
- Close the milestone when the plan is done or abandoned.

## Each issue

Create plans with the `plan-write` skill. Every issue in the milestone, open or closed, needs:

1. **Exactly one kind label:**

   | Label | Work | Done by | Review (AGENTS.md) |
   | --- | --- | --- | --- |
   | `kind:code` | Product behavior | Claude on Anvil or Hammer | Grok Bot (A) + non-author coding agent (B) |
   | `kind:test` | Tests only | Claude on Anvil or Hammer | none, merge on green |
   | `kind:docs` | Docs only | Claude on Anvil or Hammer | none, merge on green |
   | `kind:art` | Images, audio, other assets | Illusionist via `ask-grok --to illusionist` | one Low review, coding agent (not Grok) |
   | `kind:story` | Story, lore, dialogue | Loremaster via `ask-grok --to loremaster` | none |
   | `kind:design` | Design docs | Claude on Anvil or Hammer (or Gamewright via `ask-grok --to gamewright`) | none |
   | `kind:config` | Build, CI and tooling config only | Claude on Anvil or Hammer | one Low review, non-author coding agent (no Grok) |

   `kind:config` is for changes to workflows, bundler or compiler settings, lint config and the like, with no change to product code. A dependency bump, or config that changes what the product does at runtime, is `kind:code`. A test or docs change that touches the config it needs stays `kind:test` or `kind:docs`.

2. **A `Depends on:` line** in the body: `Depends on: none`, or `Depends on: #12, #14`. Every number must be an issue in the same milestone. No cycles.

3. **A `## Done when` section** with at least one checkbox (`- [ ]`). This is the acceptance bar the child works to and the reviewers check.

Optional:

- `where:hammer` or `where:anvil`: the issue must run on that machine. Without it, `plan-run` picks.
- `size:long`: expected to run a long time unattended. `plan-run` prefers Hammer for it.
- **A `Touches:` line**: the paths or globs the issue may change, comma-separated, for example `Touches: src/engine/session/**, src/protocols/v2/views.ts`. List the shared files you expect to edit, not only new ones. `plan.py` won't dispatch an issue whose `Touches` overlaps an issue that's still running or awaiting merge; it reports it under `held_for_overlap` and starts it once that PR merges. Overlap is checked by the part before the first wildcard, so two globs in the same folder count as overlapping. An issue without `Touches` isn't checked (`plan.py` warns), so its PR can conflict with another plan PR.
- `plan:hitl`: needs Bob mid-way (a decision, a design review, a sign-in). `plan-run` never dispatches it; Bob works it, or removes the label once his part is done.

### Template

```markdown
Depends on: #12
Touches: src/feature/**, src/shared/state.ts

## What to build

One vertical slice, end to end.

## Done when

- [ ] …
- [ ] Tests cover …
```

## State labels

`plan-run` and its children set these. People can too.

| Label | Meaning |
| --- | --- |
| `plan:in-progress` | Claimed by a running child. Counts against the concurrency cap |
| `plan:ready` | PR is open, green and reviewed, and waits for the merge |
| `plan:blocked` | Waits on something only Bob can do. The issue's last comment says what |
| `needs-owner` | 3 reviewed heads without both approvals (AGENTS.md) |

An issue is **done** when it's closed, normally by its PR's `Closes #n`. Dependents start only after that, so they build on merged code.
