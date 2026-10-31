Keep this a checklist; do not write a second design doc.

# Brief: C4 / 08-c4-game-end — The C4 game end: chapter 3 won, or lost on any chapter

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 08-c4-game-end
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, MEC-032, DEC-144, DEC-116, DEC-117, Q-C3-18
- Evals: ./evals.md
- Screen spec: ./screen-spec.md
- Mockup: none (no screen change)
- Depends on: 01, 07, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/game/**`, `apps/bloodtower/src/server/timing/stats.ts`
- Builds: MEC-032, DEC-144, DEC-116
- Deps change: no
- Runs: cloud

## What it does

With `c4_end_after_chapter_3` on, chapter 3 won ends the game won: the DEC-144 win scene and `[COPY: chapter 3 win, Loremaster = "The last seal of the lowlands is broken. Vellmoor sleeps easier tonight. The Count does not."]` (Gamewright pick, pending Bob) (Q-C4-01). Losses unchanged. Stats add battles won, retreats, falls and Tomb rooms; key moments add battle won and Tomb cleared.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The finished record is written once and is unchanged after a reload.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-05 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] MEC-032: closed before coding (`decided`).
- [ ] DEC-144: closed before coding (`decided`).
- [ ] DEC-116: closed before coding (`decided`).
- [ ] DEC-117: closed before coding (`decided`).
- [ ] Q-C3-18: closed before coding (`decided`).

## OPEN questions

- OPEN Q-C4-01: What ends a C4 game won, before the C5 finale exists? Options: (a) chapter 3 won (The Lock and The Last Stand done) ends the game won, behind tuning switch `c4_end_after_chapter_3` (on in C4, off in C5), with the DEC-144 win scene and `[COPY: chapter 3 win, Loremaster = "The last seal of the lowlands is broken. Vellmoor sleeps easier tonight. The Count does not."]`; (b) chapter 3 has no end: the game plays until it is lost, and the win is tested only by fixture until C5. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).
