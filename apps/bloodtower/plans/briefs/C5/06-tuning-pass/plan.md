Keep this a checklist; do not write a second design doc.

# Brief: C5 / 06-tuning-pass — The tuning pass: placeholder numbers become 1.0 numbers

## Meta

- Plan: [C5-finale-polish.md](../../../C5-finale-polish.md)
- Feature: 06-tuning-pass
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, DEC-500, DEC-131, DEC-699 to DEC-703
- Evals: ./evals.md
- Screen spec: none (engine only; screens are in this cycle's screen features)
- Mockup: none (no screen change)
- Depends on: 04, and its `approval.md` on `main`
- Touches: `packs/base/tuning.yaml`, `apps/bloodtower/src/sim/**` (report only)
- Builds: DEC-500, DEC-131
- Deps change: no
- Runs: cloud

## What it does

300 headless games at 2, 3 and 4 heroes, then two table playtests; a number moves only when both agree (Gamewright pick, pending Bob) (Q-C5-05). Target bands are proposed in the sim report for Bob.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - Tuning is still fixed at Begin; a game begun before the pass keeps its numbers.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-04 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; 1.1 work (DEC-502).

## AREA / DEC checklist

- [ ] DEC-500: closed before coding (`decided`).
- [ ] DEC-131: closed before coding (`decided`).
- [ ] DEC-699 to DEC-703: closed before coding (`decided`).

## OPEN questions

- OPEN Q-C5-05: How is the tuning pass (DEC-500) run? Options: (a) 300 headless simulator games at 2, 3 and 4 heroes, then two table playtests; numbers move only on both; (b) table playtests only. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).
