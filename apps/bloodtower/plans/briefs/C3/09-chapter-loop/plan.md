Keep this a checklist; do not write a second design doc.

# Brief: C3 / 09-chapter-loop — Chapters: open, play days, win on every quest, the seal break

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 09-chapter-loop
- Kind: engine
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, MEC-033, MEC-016, MEC-018
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change)
- Risk: High
- Depends on: C3 feature 04 merged, C3 feature 07 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/chapter/**`
- Builds: MEC-033, DEC-041, DEC-133, DEC-134, DEC-146, DEC-303, DEC-306, DEC-409, DEC-656
- Deps change: no
- Runs: cloud

## What it does

MEC-033 in full: the enter (challenge step and board bounds, DEC-133, DEC-134, DEC-146; quest tokens placed), the start (cue, narration hook, chapter card), days until every quest is done or a loss check is true (DEC-041, DEC-086; a loss on the same day as a finish is a loss), and the close: with the tower, a won chapter breaks one seal, its glyph's story boon takes effect, and any freed skulls are placed (DEC-303, DEC-409); without, seals drop out (DEC-306). The finale chapter is won only by winning the Tower (DEC-656), which is C5.

In C3, clearing chapter 1 is the win (Q-C3-01): when chapter 1 is won, the chapter returns won-and-last and the game ends (feature 10). No seal breaks and chapter 2 does not open. One tuning switch (feature 02) turns the C3 end off for C4. Chapters 2 and 3, the seal break and the finale rule are still built and proved by fixtures.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A chapter resumed by Continue skips its enter and start (DEC-283, DEC-675).
  - Broken seals and revealed glyph boons survive Continue.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-11 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] MEC-033: closed before coding (`decided`).
- [ ] DEC-041: closed before coding (`decided`).
- [ ] DEC-086: closed before coding (`decided`).
- [ ] DEC-133: closed before coding (`decided`).
- [ ] DEC-134: closed before coding (`decided`).
- [ ] DEC-135: closed before coding (`decided`).
- [ ] DEC-146: closed before coding (`decided`).
- [ ] DEC-185: closed before coding (`decided`).
- [ ] DEC-303: closed before coding (`decided`).
- [ ] DEC-302: closed before coding (`decided`).
- [ ] DEC-306: closed before coding (`decided`).
- [ ] DEC-409: closed before coding (`decided`).
- [ ] DEC-656: closed before coding (`decided`).
- [ ] DEC-676: closed before coding (`decided`).
- [ ] DEC-675: closed before coding (`decided`).
- [ ] MEC-016: closed before coding (`decided`).
- [ ] MEC-018: closed before coding (`decided`).

## OPEN questions

- ANSWERED Q-C3-01 (Bob, 2026-10-31 10:09 AM ET): clearing chapter 1 counts as the C3 win.
- Q-C3-17: which glyph boons does The Ruined Keep name for each seal break (DEC-303 "a story may name it")? Or does the app pick and the base pack supply the boons?

## Eval approval

- See ./approval.md (must be filled before coding).
