Keep this a checklist; do not write a second design doc.

# Brief: C4 / 02-battle-loop — The battle loop: horn, rounds, Fight or Retreat, one action each

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 02-battle-loop
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, MEC-038, MEC-024, DEC-011, DEC-015, DEC-118, DEC-119, DEC-122, DEC-128, DEC-129, DEC-130, DEC-643, DEC-649, DEC-650, DEC-655
- Evals: ./eval.md
- Screen spec: none (engine only; screens are in this cycle's screen features)
- Mockup: none (no screen change)
- Depends on: 01, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/battle/**` (new level), `apps/bloodtower/src/engine/rules/battle/**`
- Builds: MEC-038, MEC-024, DEC-118, DEC-129, DEC-130, DEC-643, DEC-649, DEC-650, DEC-655, DEC-607, DEC-553
- Deps change: no
- Runs: cloud

## What it does

MEC-038's loop as a new level: foe abilities and bold/on guard before round 1; each round Fight or Retreat together, then one action per present hero (no timer (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET), Q-C4-11), spells first, the seeded round card (8, no repeats), cut or hit, a hero at 0 takes a corruption and sits out. Exits on foe gone, retreat or all fallen.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - Continue mid-battle resumes at the saved node (DEC-675): same round, foe wounds, deck position and picks made.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-11 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] MEC-038: closed before coding (`decided`).
- [ ] MEC-024: closed before coding (`decided`).
- [ ] DEC-011: closed before coding (`decided`).
- [ ] DEC-015: closed before coding (`decided`).
- [ ] DEC-118: closed before coding (`decided`).
- [ ] DEC-119: closed before coding (`decided`).
- [ ] DEC-122: closed before coding (`decided`).
- [ ] DEC-128: closed before coding (`decided`).
- [ ] DEC-129: closed before coding (`decided`).
- [ ] DEC-130: closed before coding (`decided`).
- [ ] DEC-643: closed before coding (`decided`).
- [ ] DEC-649: closed before coding (`decided`).
- [ ] DEC-650: closed before coding (`decided`).
- [ ] DEC-655: closed before coding (`decided`).

## OPEN questions

- Resolved Q-C4-11 **[Bob taste call]**: Does a battle round have a timer on the iPads? Options: (a) no timer; the round waits for every present hero; (b) 30 seconds, then a missing pick becomes a normal attack (DEC-129). Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).

## Eval approval

- See ./approval.md (must be filled before coding).
