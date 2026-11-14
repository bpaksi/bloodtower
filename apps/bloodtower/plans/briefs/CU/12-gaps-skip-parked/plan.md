Keep this a checklist; do not write a second design doc.

# Brief: CU / 12-gaps-skip-parked — The mechanic-surface gap rule skips parked cards

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (step 59, issue #486)
- Feature: 12-gaps-skip-parked
- Kind: tooling
- Owner: Gamewright (brief, evals); a Wright developer (build)
- Related AREA/docs: DEC-901 (a parked mechanic is closed); DEC-625 (a parked card is out of the reach walk); `research/game-design/catchup-gap-triage-2026-11-12.md`; design-freeze.md section G (the 84-gap triage); G-1.0 gate (C5-10)
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: Low
- Depends on: its approval.md on main; the triage patch (DEC-901, #493) on main (it is)
- Touches: `packages/workbench/src/gaps.ts`, `packages/workbench/src/gaps.test.ts`
- Builds: issue #486 (step 59)
- Deps change: no
- Runs: cloud

## What it does

`pnpm graph gaps` reports every mechanic with no screen, UI piece or cue (rule `mechanic-surface`), parked or not. The conflict rule and the reach rule already skip parked cards; the mechanic rule does not. After the triage patch the 15 parked mechanics (MEC-001, 002, 004, 006, 008, 009, 011, 012, 014, 015, 020, 021, 022, 023, 025) are the only 1.0 gaps left, and they cannot be closed: they were retired and have no surface. One condition, `c.status !== "parked"`, in the `mechanic-surface` loop of `findGaps`, plus tests, makes the 1.0 gap list reachable at zero (G-1.0 needs it empty).

## Cutover

Cutover: N

- Nothing dies or is renamed. No other gap rule changes.

## Survival invariants

- Continue, restore, and restart must keep:
  - A gap stays a warning that never fails a check (the file's own contract).
  - The other four rules report exactly what they did: the skip is in the mechanic rule only.
  - `gaps.ts` stays pure functions with no Node import.
  - A mechanic that is not parked and has no surface still shows, in any status and any release.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-05 and EV-11 all pass (verifier table on PR).
- Not required: a Playwright run (no screen); closing any gap other than the 15 parked mechanics.

## AREA / DEC checklist

- [ ] DEC-901: closed before coding (`decided`; "A parked mechanic is closed").
- [ ] DEC-625: closed before coding (`decided`; parked cards are skipped by the reach walk).
- [ ] Step 59 / #486 is named in design-freeze.md section G and gap-map.md; no new DEC is needed (a tooling change that DEC-901 already rules). Closed.

## Decided (was OPEN)

- Release of a parked mechanic: the skip ignores release, so a parked mechanic with `release: 1.1` or `1.2` is skipped too (DEC-901: parked is closed, whatever its release). Bob, 2026-11-14, adopted from the Opus recommendation.

## Eval approval

- See ./approval.md (must be filled before coding).
