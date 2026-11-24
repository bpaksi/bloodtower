---
name: plan-write
description: Turn an idea, spec, or conversation into a forgekit plan — a `Plan:` GitHub milestone with one issue per thin vertical slice, in the format plan-run reads. Use when the user wants to plan a feature, break work into issues, write a plan, slice a spec, or says "plan-write" or "make a plan". The next step is plan-run.
argument-hint: "[plan name or path to a spec]"
---

# plan-write

You turn what the user wants built into a **plan**: an open GitHub milestone titled `Plan: <name>` with one issue per slice, in exactly the format in [../plan-run/PLAN-FORMAT.md](../plan-run/PLAN-FORMAT.md). `plan-run` then works it in parallel. Read PLAN-FORMAT.md and the repo's `AGENTS.md` first.

## 1. Get to shared understanding

- If the user gives a spec, doc or issue, read it. If the scope is still fuzzy, interview them (the `grilling` skill does this well) until each branch of the design is settled. Give your recommended answer with every question.
- Answer what you can from the codebase yourself instead of asking.
- Before slicing, check you've covered what applies: who uses it, data and schema changes, API surface, auth and sensitive data, failure cases, migration and backwards compatibility, UI, story and art needs, and how you'll know it works.

## 2. Draft vertical slices

Each issue is a **tracer bullet**: a thin slice through every layer it needs (schema, API, UI, tests), not one layer of many features.

- Each slice is demoable or verifiable on its own.
- Prefer many thin slices over a few thick ones. A slice a child can finish in one sitting is the right size.
- Make slices independent wherever you can. Every `Depends on` edge removes parallelism from `plan-run`.
- Split out story and art as their own `kind:story` / `kind:art` issues. They go to Grok Bot, so the code slice that uses them depends on them (or uses placeholders and doesn't).
- Mark a slice `plan:hitl` when it needs Bob mid-way (an architecture decision, a design review, a sign-in). Prefer slices that don't.
- Add `where:hammer` / `where:anvil` only when the work truly needs that machine, and `size:long` for long unattended runs.

## 3. Check the breakdown with the user

Show a numbered list. For each slice give the title, kind, `Depends on`, labels, and a one-line "Done when". Ask:

- Is the granularity right?
- Are the dependencies right, and can any be removed?
- Should any slices merge or split?
- Is the kind right for each, and is anything mis-marked `plan:hitl`?

Iterate until they approve. Don't create anything on GitHub before that.

## 4. Create the plan on GitHub

1. **Labels:** make sure the labels exist (`gh label create <name> --force` is safe to rerun): `kind:code`, `kind:test`, `kind:docs`, `kind:art`, `kind:story`, `kind:design`, `kind:config`, `where:hammer`, `where:anvil`, `size:long`, `plan:hitl`, `plan:in-progress`, `plan:ready`, `plan:blocked`, `needs-owner`.
2. **Milestone:** `gh api repos/{owner}/{repo}/milestones -f title="Plan: <name>" -f description="<one paragraph, plus a link to any spec>"`.
3. **Issues, blockers first,** so each `Depends on` can name real numbers. Use this body:

   ```markdown
   Depends on: none

   ## What to build

   The end-to-end behavior of this slice. Describe what it does, not each layer.

   ## Done when

   - [ ] …
   - [ ] Tests cover …
   ```

   `gh issue create --milestone "Plan: <name>" --label kind:<kind> [--label …] --title "…" --body-file <file>`

4. **Validate:** run `python3 .claude/skills/plan-run/plan.py --milestone "Plan: <name>"`. It must exit 0. Fix any reported error on the issue before you finish.

## 5. Hand off

Give the user the milestone link, the issue list with its dependencies, which slices can start immediately (the `dispatch` list from `plan.py` with a large `--max-running`), and say that `plan-run` will work it.

## Revising a plan

If the milestone already exists, read it with `plan.py` first. Don't touch closed issues; if a change invalidates finished work, that's a new issue. Ask before changing anything that's `plan:in-progress`. Not-started issues can be edited, split, merged or closed freely. Validate again when you're done.
