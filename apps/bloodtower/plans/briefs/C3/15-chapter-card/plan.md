Keep this a checklist; do not write a second design doc.

# Brief: C3 / 15-chapter-card — The chapter card and the chapter end with the seal break

## Meta

- Plan: [C3-ruined-keep.md](../../../C3-ruined-keep.md)
- Feature: 15-chapter-card
- Kind: screen
- Owner: Gamewright (plan, evals); a Wright developer (build)
- Related AREA/docs: AREA-097, AREA-099, UI-020, UI-044, MEC-033
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: none yet: the screen changes, see ./screen-spec.md. Illusionist draws ./mockup.html from it before Bob approves the evals
- Risk: Med
- Depends on: C3 feature 09 merged, C2 feature 06 merged, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/ChapterCard.tsx` (new), `apps/bloodtower/src/web/components/board/SealBreak.tsx` (new), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-chapter.spec.ts`
- Builds: UI-020, UI-044
- Deps change: no
- Runs: cloud

## What it does

UI-020 at each chapter's start (painting, name, goal) and stamped won at its end; UI-044: the chapter's close on a Scroll, then the seal break on a Reveal with the glyph and its boon (DEC-303), then the freed-skull placement (DEC-409). Without the tower the seal part is skipped (DEC-306).

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - Continue does not replay a chapter card already shown (DEC-675).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-05 all pass (verifier table on PR).
- Not required: anything this feature's OPEN questions leave unruled; battle, the Tomb and the Tower (C4, C5).

## AREA / DEC checklist

- [ ] UI-020: closed before coding (`decided`).
- [ ] UI-044: closed before coding (`decided`).
- [ ] MEC-033: closed before coding (`decided`).
- [ ] DEC-303: closed before coding (`decided`).
- [ ] DEC-302: closed before coding (`decided`).
- [ ] DEC-306: closed before coding (`decided`).
- [ ] DEC-409: closed before coding (`decided`).
- [ ] CUE-004: closed before coding (`decided`).
- [ ] CUE-005: closed before coding (`decided`).

## OPEN questions

- Q-C3-17 (which boons)

## Eval approval

- See ./approval.md (must be filled before coding).
