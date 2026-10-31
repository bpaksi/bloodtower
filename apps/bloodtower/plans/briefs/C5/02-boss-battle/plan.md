Keep this a checklist; do not write a second design doc.

# Brief: C5 / 02-boss-battle — The Warden: his own deck and three phases

## Meta

- Plan: [C5-finale-polish.md](../../../C5-finale-polish.md)
- Feature: 02-boss-battle
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, DEC-567, DEC-557, DEC-361, DEC-549, DEC-327
- Evals: ./evals.md
- Screen spec: none (engine only; screens are in this cycle's screen features)
- Mockup: none (no screen change)
- Depends on: 01, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/rules/battle/boss.ts` (new), `packs/test/**` (The Warden)
- Builds: DEC-567, DEC-361, DEC-549
- Deps change: no
- Runs: cloud

## What it does

DEC-567: The Warden (level 5, base tuning, Q-C3-08) has an 8-card deck with two Rends and no Falter; at two thirds and one third wounds left he changes phase: a new painting (three in all (Gamewright pick, pending Bob), Q-C5-02), one more Rend, a stronger ability. No false death; Inventive cannot end it.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The phase and the deck position survive Continue.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-06 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; 1.1 work (DEC-502).

## AREA / DEC checklist

- [ ] DEC-567: closed before coding (`decided`).
- [ ] DEC-557: closed before coding (`decided`).
- [ ] DEC-361: closed before coding (`decided`).
- [ ] DEC-549: closed before coding (`decided`).
- [ ] DEC-327: closed before coding (`decided`).

## Values (filled from cards)

- The Warden: level 5; wounds 4 × 5 + 1 per hero after the first (20 for one hero) (DEC-703, DEC-563).
- Phases at two thirds and one third wounds left; each adds a Rend (DEC-567).
- Crushing blow: a lost round hits +1 in phase 1, +2 in phase 2, +3 in phase 3 (DEC-688).
- Strength per phase (the round-odds level): 5 in every phase; only the deck and Crushing blow change (DEC-567, DEC-688).

## OPEN questions

- OPEN Q-C5-02 **[Bob taste call]**: The Warden's three phases (DEC-567): three paintings or one? Options: (a) three paintings, one per phase; (b) one painting, darkening at each phase. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).
