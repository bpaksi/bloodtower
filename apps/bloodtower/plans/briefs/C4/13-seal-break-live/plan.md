Keep this a checklist; do not write a second design doc.

# Brief: C4 / 13-seal-break-live — The seal break live on the board, chapters 1 and 2

## Meta

- Plan: [C4-battle-tomb.md](../../../C4-battle-tomb.md)
- Feature: 13-seal-break-live
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, UI-044, DEC-303
- Evals: ./evals.md
- Screen spec: ./screen-spec.md
- Mockup: none yet; Illusionist draws ./mockup.html from ./screen-spec.md before Bob approves the evals
- Depends on: 07, C3 15, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/SealBreak.tsx`, `apps/bloodtower/src/web/components/device/SkullPlacer.tsx`
- Builds: UI-044
- Deps change: no
- Runs: cloud

## What it does

C3 built UI-044's seal step behind the switch; C4 turns it on. The close Scroll, the lit seal, the glyph and boon on a Reveal with the Loremaster's seal line (Gamewright pick, pending Bob) (Q-C4-10), then the freed-skull prompts on the iPad (kingdom, then building). The C3 "Done" confirm becomes the real pick: the iPad confirms which seal broke on the tower.

## Cutover

Cutover: N

- Nothing dies or is renamed beyond the tuning switches named above.

## Survival invariants

- Continue, restore, and restart must keep:
  - A half-placed set of freed skulls resumes at the next skull.

## Done-when (e2e)

Contract is ./evals.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-05 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled until Bob answers; the Tower finale and A1 art (C5).

## AREA / DEC checklist

- [ ] UI-044: closed before coding (`decided`).
- [ ] DEC-303: closed before coding (`decided`).

## OPEN questions

- OPEN Q-C4-10 **[Bob taste call]**: Who speaks the seal-break line at each chapter win? Options: (a) the Loremaster, one line per chapter: `[COPY: seal break ch1, Loremaster]`, `[COPY: seal break ch2, Loremaster]`; (b) the Narrator, one shared line `[COPY: seal break, Narrator]`. Gamewright pick: (a) (Gamewright pick, pending Bob).

## Eval approval

- See ./approval.md (must be filled before coding).
