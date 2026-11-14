Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 12-gaps-skip-parked — The mechanic-surface gap rule skips parked cards

- Brief: ./plan.md
- Mockup: none
- Risk: Low

## Checks

### EV-01 — A parked mechanic with no surface is not a gap
- Requirement: DEC-901: a parked mechanic is closed, so the mechanic rule skips it.
- Method: unit
- How: in `packages/workbench/src/gaps.test.ts`, `graphOf({ "MEC-001": { type: "mechanic", status: "parked" } })` (no `release`, so it is 1.0) and run `findGaps`.
- Pass evidence: no gap with rule `mechanic-surface` and none at all for MEC-001; `findGaps` returns `[]`.
- Fails if: the parked mechanic is still reported, or the skip is on `type` or `layer` instead of `status`.

### EV-02 — A mechanic that is not parked and has no surface still shows
- Requirement: the rule keeps finding real gaps.
- Method: unit
- How: one graph with a mechanic in each status `open`, `proposed`, `decided`, `answered`, none linked to a screen, ui or cue.
- Pass evidence: `mechanic-surface` gaps for exactly those four ids, in ID order.
- Fails if: a non-parked mechanic is skipped (for example the skip tests "not decided" or skips every status but `open`).

### EV-03 — Parked is skipped in every release
- Requirement: a parked mechanic with `release: "1.0"`, `"1.1"` or `"1.2"` is closed alike (DEC-901; Bob, 2026-11-14, adopted).
- Method: unit
- How: three parked mechanics with those releases and no links, plus one non-parked 1.1 mechanic with no links.
- Pass evidence: only the non-parked 1.1 mechanic is reported, with release "1.1".
- Fails if: the skip depends on release, or the 1.0 parked case passes only because the release field is absent.

### EV-04 — Only the mechanic rule changed
- Requirement: the other four rules are untouched.
- Method: unit
- How: (a) every existing test in `gaps.test.ts` passes with no edit to an existing assertion; (b) a new test on one graph holding an open question, an undecided area, a decided ruling no deliverable reaches and a conflict between two non-parked cards, next to a parked mechanic.
- Pass evidence: (a) the diff to `gaps.test.ts` only adds tests; (b) the three rules report the same ids as on main for the same graph.
- Fails if: an existing assertion was edited to pass, or the parked skip was added to the open-question, conflict, reach or area rule.

### EV-05 — The real card set loses exactly the 15 parked mechanics
- Requirement: the 1.0 list is reachable at zero (G-1.0, step 59).
- Method: unit
- How: if the workbench package can load `research/game-design/cards/` in a test, assert the 15 ids above are absent from `findGaps` and that every remaining `mechanic-surface` gap has a status other than `parked`. If it cannot, the PR body attaches `pnpm graph gaps` output from main and from the branch.
- Pass evidence: before, 15 gaps for 1.0, all `mechanic-surface`, all those ids; after, none of them, and the 1.0 section lists no gap (or lists only IDs named in the PR with their cause, none parked mechanics).
- Fails if: the count reaches zero by widening the skip (a gap that is not a parked mechanic disappeared), or a parked mechanic remains.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — The tool stays pure and a warning
- Requirement: `gaps.ts` imports nothing from Node and never throws or sets an exit code for a gap.
- Method: unit
- How: a source check on the first 20 lines of `gaps.ts` for `node:` imports, and the existing `graph gaps` CLI test (if any) run unchanged.
- Pass evidence: no `node:` import; the CLI exit code with gaps present is what main gives.
- Fails if: a Node import was added or a gap now fails a check.

## Assumptions surfaced

- The 15 ids are the parked mechanics in `research/game-design/cards/` on 2026-11-14 (verified by grep) → if the card set changes before the build the test reads the cards, not this list.
- Release is ignored for parked mechanics → decided: Bob, 2026-11-14, adopted (DEC-901: parked is closed); EV-03.
