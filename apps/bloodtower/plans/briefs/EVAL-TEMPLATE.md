Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: <plan-name> / <##-feature> — <title>

- Brief: ./plan.md
- Mockup: ./mockup.html | none
- Risk: Low | Med | High | Human  (High/Human: state loss, tower safety, restore, private info → add negative + restore evals)

## Checks

### EV-01 — <short name>
- Requirement: <one sentence; cite AREA/DEC/PRD id>
- Method: unit | playwright | screenshot
- How: <test file + test name, or Playwright steps, or "screenshot <state> at <viewport>, compare side by side with ./mockup.html">
- Pass evidence: <exact value/text/state; for screenshot: named elements present, order/layout match, both images attached>
- Fails if: <the wrong build this catches>

### EV-02 — <negative / guard case>
…

## Survival evals (one per survival invariant in plan.md)
### EV-1x — Continue/restore keeps <invariant>
…

## Assumptions surfaced
- <assumption the eval bakes in> → DEC/AREA id or "Bob: ?" (ask in chat before approval)

<!--
Do not copy this comment into eval.md.
Until scripts/check-briefs.mjs excludes templates (separate PR), brief:lint still
requires these headings and exactly one cutover line on every briefs/*.md file
except README.md.

## Cutover
## Survival invariants
## Done-when (e2e)
## AREA / DEC checklist
Cutover: N
-->
