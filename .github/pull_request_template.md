Closes #<n>

## Feature
<plan-name>/<##-feature> — apps/bloodtower/plans/briefs/<plan-name>/<##-feature>/plan.md (or "none" for a PR outside a brief)

## Summary
<!-- What changed and why, in 3–6 bullets. Spec or DEC ids where they exist. -->

## Touches
<!-- Paths this PR changes, from the issue's Touches line. Name any file outside it and why. -->
<!-- Overlap with other open plan PRs: none | #<pr> (<files>) -->

## Review level
<!-- Pick one: product-behavior (Grok Bot + non-author agent) | test-only | docs-only | config (one Low review, non-author agent) | art (one Low review, not Grok) | design/story (none) -->

## Requirement review
<findings / "none">

## Test evidence (head `<sha>`)
<!-- Update on every push. -->
- `pnpm check`: <exit code, test counts>
- CI: <run link> — green | pending | red
- Local, targeted: <unit packages>, <e2e specs added or changed> — <counts>
- Left to CI: the full e2e suite

## Eval table  (feature PRs only; verifier only, fresh context; implementer does not fill)
Head SHA: <sha> · Verifier run: <link> · Round: <1-3>

| EV | Result | Proof (test name / CI link / screenshot pair) |
|----|--------|-----------------------------------------------|
| EV-01 | pass / FAIL | `…spec.ts › <test name>` · <CI job link> |
| EV-02 | pass / FAIL | actual: <img link> · mockup: <img link> · note |

Done = every row pass on the current head. Any code change → verifier reruns.

## Risks
<!-- What could break that the tests might not show: state, restart and restore paths, protocol or schema changes, migrations, tower hardware. -->

## Assumptions
<!-- Decisions made without asking. Each is one a reviewer could reject. "None" only if true. -->

## Not verified
<!-- Be specific, for example "real tower: mock only". "None" only if true. -->

## Round log
| Round | Head | Findings fixed (reviewer) | Tests added |
| --- | --- | --- | --- |
| 1 | `<sha>` | — | — |
