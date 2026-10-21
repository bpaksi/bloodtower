# Jev finding triage: plan

Status: approved by Bob on 2026-10-21 (G-plan). Step 1 in progress. Repo-wide work on `chore/jev-finding-triage`.

## Goal

Find out whether Jev (TypeSafe's decision model, which returns probabilities instead of text) can tell, from a review finding, whether that finding blocks under [docs/sdlc.md](../../docs/sdlc.md) §4 "What blocks". If it can, the coordinator uses a disagreement between Jev and the reviewer to ask the reviewer to justify the label before the developer spends a round on it.

Rule for every step: **Jev informs, code decides.** Jev never merges, never clears or adds a blocker by itself, and never touches anything physical.

## Why this decision first

Blocking findings and rounds per PR are already in the SDLC metrics, so the effect can be measured. Reviewers adding requirements beyond `Done when` is the problem §4 was trimmed for in #102.

## What we have

- 218 review reports with a `Blocking` line, across 63 merged PRs (counted 2026-10-21).
- Only 17 of them come after #102 (2026-10-19), when §4's "What blocks" list was added. Older reports were written under looser rules, so the labeled set judges every finding against **today's** §4. That also shows how much the old rules over-blocked.

## Steps

### Step 1: labeled set of past findings
- Depends on: G-plan
- Touches: research/jev/**
- Deps change: no
- Runs: local
- Model: opus
- Makes no Jev calls and needs no key. Reads PRs with `gh` only.
- Method:
  1. Pick about 25 reports, stratified: rounds 1 and 2–3, several apps, before and after #102, with at least 3 PRs that ended in `needs-bob` (#25, #78) or a Bob override.
  2. Split each report into findings: one entry per numbered finding.
  3. For each finding, record what the reviewer said and what happened next (fixed in the next round, disputed, overridden by Bob, carried to `needs-bob`, or never acted on).
  4. Label each finding against today's §4 with the rubric below, with a reason of one line.
  5. Bob checks a sample of 20 labels, one question at a time. Record his answers.
- Done when:
  - `research/jev/findings.jsonl` has at least 50 findings, each matching the schema below.
  - At least 20 have `reviewer_blocking: true` and at least 20 have `false`. They come from at least 10 PRs and at least 2 apps.
  - Every finding links to its source comment (`source_url`) so it can be rechecked.
  - `research/jev/labels-check.md` records Bob's 20 answers and the agreement rate. If Bob and Claude agree on fewer than 18 of 20, the rubric is fixed and those labels are redone before step 2.
  - `research/jev/README.md` gives the counts per label, per app and per period, and how many findings were blocking under the reviewer's label but not under today's §4.
  - Not required: a script to extract findings (this is a one-off, done by hand with `gh`), and any finding text beyond what the source comment says.

### Step 2: offline Jev test
- Depends on: 1, a Jev key on the Mac (kept in the OS keychain, not `.env*`)
- Touches: scripts/jev.mjs, scripts/jev.test.mjs, research/jev/**
- Deps change: no (plain `fetch`)
- Runs: local
- Pins `jev-1.13.0`. Sends the finding text, the §4 list and the step's `Done when` only, not file contents.
- Done when: the precision of "non-blocking" and the agreement at 3 confidence thresholds are reported against step 1's labels, together with the token count and cost.

### G1: Bob decides go or no-go for shadow mode

### Step 3: shadow mode for one batch
- The coordinator logs Jev's label next to each finding and changes nothing. Compare rounds used and `needs-bob` counts with the batch before.

### G2: Bob decides whether disagreements trigger the justify step

### Step 4: justify step on
- Update §4 in `docs/sdlc.md` and `.claude/agents/coordinator.md` in the same PR.

## Labeling rubric (today's §4)

| `label` | When |
|---|---|
| `regression` | Something that works on `main` breaks |
| `done-when` | A `Done when` item is not met, or no test that can fail proves it |
| `standing-rule` | Tower safety, privacy, D7-style message rules, or an unknown value shown as zero |
| `touches` | A change outside the step's `Touches`, or a dependency change the step does not flag |
| `non-blocking` | Anything else: a nit, a spec hole for Bob, a follow-up, or an edge case or viewport that `Done when` does not name |

If a finding fits more than one blocking label, use the first that applies in the table's order.

## Schema: one line of `findings.jsonl`

```json
{
  "id": "F-001",
  "pr": 99,
  "round": 1,
  "app": "bloodtower",
  "period": "pre-102",
  "source_url": "https://github.com/bpaksi/bloodtower/pull/99#issuecomment-…",
  "finding": "the text of the finding, as the reviewer wrote it",
  "done_when": "the step's Done when items, or null if the PR has none",
  "reviewer_blocking": true,
  "outcome": "fixed | disputed | overridden | needs-bob | ignored | unknown",
  "label": "done-when",
  "reason": "one line",
  "bob_checked": false,
  "pr_escalated": false
}
```

Deviations in step 1 (2026-10-21):
- `finding` is the reviewer's words, shortened to the claim and its proof. Long repros are cut; `source_url` has the full text.
- `done_when` is `null` on every row. Most of these PRs predate measurable `Done when` fields, and the rest cite runbook steps. Step 2 fills it from the plan or runbook step the PR names, before any Jev call.
- `outcome` adds `unknown` for a finding whose fate the reports do not show. `ignored` means nothing in this PR changed for it; a follow-up issue may exist.
- `pr_escalated` marks findings from PRs that reached `needs-bob` (#25, #78) or that Bob let run past round 3 (#99).
- The 20 labels for Bob are not a random sample. They are the 14 findings where today's label and the reviewer's call disagree, plus 6 agreements spread over the labels. So the agreement rate tests the labels most likely to be wrong.

## Open questions for Bob

1. ~~Who labels?~~ Answered (Bob, 2026-10-21): Claude labels all of them and Bob checks 20.
2. ~~Include findings from before #102?~~ Answered (Bob, 2026-10-21): yes, judged against today's §4.
3. ~~Where does the plan live?~~ Answered (Bob, 2026-10-21): here in `research/jev/`, with its data. The step 2 script goes in `scripts/`.
