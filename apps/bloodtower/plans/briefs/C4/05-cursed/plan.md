Keep this a checklist; do not write a second design doc.

# Brief: C4 / 05-cursed — Cursed: at most 4 Advantages count in a round

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 05-cursed
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, DEC-466, DEC-324, DEC-365, MEC-080
- Evals: ./evals.md
- Screen spec: none (engine only; screens are in this cycle's screen features)
- Mockup: none (no screen change)
- Depends on: 02, C3 08, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/rules/corruption/cursed.ts`, `apps/bloodtower/src/engine/rules/battle/strength.ts`
- Builds: DEC-466
- Deps change: no
- Runs: cloud

## What it does

DEC-466: in each battle round at most 4 of the holder's Advantages count, the 4 that help most, plus the −1 move every corruption gives. Cursed joins the seeded set for every draw (Gamewright pick, pending Bob) (Q-C4-06). The hero panel shows "4 of N count" (Gamewright pick, pending Bob) (Q-C4-05).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A Cursed hero keeps Cursed and its count across Continue.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-05 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] DEC-466: closed before coding (`decided`).
- [ ] DEC-324: closed before coding (`decided`).
- [ ] DEC-365: closed before coding (`decided`).
- [ ] MEC-080: closed before coding (`decided`).

## OPEN questions

- OPEN Q-C4-05: Cursed (DEC-466): does the board show which 4 Advantages counted? Options: (a) yes: the hero panel shows "4 of N count" and dims the rest during the round; (b) no: the app picks silently; only the round result shows. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C4-06: Cursed in the corruption draw (Q-C3-15's seeded set): Options: (a) from C4 the set includes Cursed for every draw (battle, event, scene); (b) Cursed is drawn only when a hero falls in battle. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).
