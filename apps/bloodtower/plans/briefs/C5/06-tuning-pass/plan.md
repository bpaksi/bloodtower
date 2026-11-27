Keep this a checklist; do not write a second design doc.

# Brief: C5 / 06-tuning-pass — The tuning pass: placeholder numbers become 1.0 numbers

## Meta

- Plan: [C5-finale-polish.md](../../../C5-finale-polish.md)
- Feature: 06-tuning-pass
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, DEC-500, DEC-131, DEC-959, DEC-699 to DEC-703, DEC-823, DEC-815, DEC-816, DEC-817
- Evals: ./eval.md
- Screen spec: none (engine only; screens are in this cycle's screen features)
- Mockup: none (no screen change)
- Depends on: 04, and its `approval.md` on `main`
- Touches: `packs/base/tuning.yaml`, `apps/bloodtower/src/sim/**` (report only)
- Builds: DEC-500, DEC-131, DEC-959
- Deps change: no
- Runs: cloud

## What it does

300 headless games in all: 100 at 2 heroes, 100 at 3, and 100 at 4. No solo. Length unset is Standard, at normal difficulty (DEC-959, Gamewright, 2026-11-27, under Bob's delegation via Warden). The win-rate band is DEC-823's: about 80% is the floor, and a cell above about 95% is flagged, not tuned down. The pass lifts only a cell below about 80%. Length and falls are reported and are not a pass or a fail. The two table playtests are G-C3 (#617) and G-C4 (#618), not new games. A number moves only when the sim and those gates agree (Q-C5-05), and any 1.0 change is listed for Bob before merge (DEC-817).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - Tuning is still fixed at Begin; a game begun before the pass keeps its numbers.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-04 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; 1.1 work (DEC-502).

## AREA / DEC checklist

- [ ] DEC-500: closed before coding (`decided`).
- [ ] DEC-131: closed before coding (`decided`).
- [ ] DEC-959: closed before coding (`decided`).
- [ ] DEC-699 to DEC-703: closed before coding (`decided`).

## OPEN questions

- Resolved Q-C5-05: How is the tuning pass (DEC-500) run? Options: (a) 300 headless simulator games at 2, 3 and 4 heroes, then two table playtests; numbers move only on both; (b) table playtests only. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Eval approval

- See ./approval.md (must be filled before coding).
