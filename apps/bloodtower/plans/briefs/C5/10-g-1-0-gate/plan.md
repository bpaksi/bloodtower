Keep this a checklist; do not write a second design doc.

# Brief: C5 / 10-g-1-0-gate — The 1.0 gate: gaps zero and the 1.0 playtest

## Meta

- Plan: [C5-finale-polish.md](../../../C5-finale-polish.md)
- Feature: 10-g-1-0-gate
- Kind: process
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, DEC-696, DEC-355, DEC-691
- Evals: ./evals.md
- Screen spec: none (engine only; screens are in this cycle's screen features)
- Mockup: none (no screen change)
- Depends on: 01 to 09, and its `approval.md` on `main`
- Touches: `apps/bloodtower/plans/C5-finale-polish.md` (Results), `research/game-design/release-1.0-punch-list.md`
- Builds: DEC-696
- Deps change: no
- Runs: cloud

## What it does

`pnpm graph gaps` lists no 1.0 gap; two full table games, one won and one lost (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET) (Q-C5-10); results written to the plan.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - Not applicable to state; the gap report is re-run on the release commit.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-04 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; 1.1 work (DEC-502).

## AREA / DEC checklist

- [ ] DEC-696: closed before coding (`decided`).
- [ ] DEC-355: closed before coding (`decided`).
- [ ] DEC-691: closed before coding (`decided`).

## OPEN questions

- Resolved Q-C5-10: What does G-1.0 need? Options: (a) two full table games of The Ruined Keep, one won (either ending) and one lost, with `pnpm graph gaps` empty for 1.0; (b) three games, one per ending and one loss. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Eval approval

- See ./approval.md (must be filled before coding).
