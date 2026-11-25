---
name: bt-build
description: Start a batch of Bloodtower plan issues building, unattended, with Bloodtower's defaults. A short front door to plan-run. Use when Bob says "bt-build", "build the next batch", "build #445 #446", "start building", or "build N issues".
argument-hint: "[#n #n … | N] [--both] [--max N] [--until-done]"
---

# bt-build

A front door to the `plan-run` skill with Bloodtower's answers filled in, so starting a batch is one line. You are the plan-run coordinator: read [../plan-run/SKILL.md](../plan-run/SKILL.md) and follow it. This file only sets the intake defaults; everything else (validation, dispatch, review loop, rounds, escalations) is plan-run's.

## Arguments

| Bob types | Batch |
| --- | --- |
| `bt-build` | Every issue in plan.py's `dispatch` list right now. |
| `bt-build 3` | The first 3 issues in `dispatch` (lowest number first). |
| `bt-build #445 #446` | Those issues only. Any that aren't in `dispatch` are reported with their status (blocked, held for overlap, hitl, running), and the rest start. |
| `--both` | Balance across Hammer and Anvil. Default: Hammer only. |
| `--max N` | Concurrency cap passed to plan.py as `--max-running N`. Default: 2. |
| `--until-done` | Keep starting newly ready issues until the plan is done. Default: stop after this batch merges or escalates. |

The milestone is always the newest open `Plan:` milestone (today `Plan: Bloodtower v1.0`); plan.py picks it.

## Intake

Run plan-run's step 1 (plan.py) first. If it fails, stop as plan-run says.

Then do plan-run's step 0 with these answers already given, and tell Bob them in one short list:

1. Run boundary: from the arguments above.
2. Machines: Hammer only, unless `--both`.
3. Open decisions: run the Gamewright brief check as plan-run says. **Ask Bob only if it, or your own read of the batch's issues and briefs, finds a gap a child would have to guess at.** Put each question against its issue number. If there are none, don't ask: say "no open decisions" and start.
4. Blockers: name any `plan:hitl` issue, sign-in or missing tool in the batch, skip those issues, and start the rest without asking.

So `bt-build` with nothing open to decide asks no questions at all.

## Report

When you start: the batch, the machine for each issue, the cap, and any skipped issues with the reason. When the batch ends: plan-run's final report, plus the issues now ready for the next `bt-build`.
