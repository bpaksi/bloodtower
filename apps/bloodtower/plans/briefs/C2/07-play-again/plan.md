Keep this a checklist; do not write a second design doc.

# Brief: C2 / 07-play-again — Play again and a quit game's stats

## Meta

- Plan: C2 ([plan](../../../C2-session-shell.md), feature 07). AREA-100 scene 3.
- Feature: 07-play-again
- Owner: Claude (brief). A Wright developer builds it.
- Related AREA/docs: DEC-708, DEC-216, DEC-213, DEC-629, DEC-709, DEC-217, SCR-021, SCR-019, SCR-010, SCR-011
- Evals: ./eval.md
- Mockup: ./mockup.html
- Risk: High (seed, claims, autosave)
- Touches: `apps/bloodtower/src/engine/loops/{session,game}/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/protocols/v2/**`, `apps/bloodtower/src/server/core/**`, `apps/bloodtower/src/web/components/board/StartupBoard.tsx`, `apps/bloodtower/src/web/components/board/board.css`, `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx`, `apps/bloodtower/src/e2e/tests/c2-play-again.spec.ts` (new)

## Cutover

Cutover: N

- Adds the drill-in and Play again. The session screen from feature 06 keeps its layout.

## Survival invariants

- Continue, restore, and restart must keep:
  - Each game's own seed. Play again's new seed is the one Continue resumes; it is never shown (DEC-217).
  - A game's stats after a host restart.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-08 all pass (verifier table on PR).
- Not required: the full stats screen for won and lost games (C3, with SCR-018). Play again on a past session's game (DEC-629: tonight only).

## AREA / DEC checklist

- [ ] DEC-708: closed before coding (`decided`). New seed; same story, length, difficulty and heroes; Pick story and Game settings skipped; claims prefilled; piece setup again.
- [ ] DEC-216: closed before coding (`decided`). Claims prefilled from the last game where the same iPads are joined; one press confirms.
- [ ] DEC-709: closed before coding (`decided`). Play again asks before it replaces an autosave.
- [ ] SCR-019: closed before coding for this slice. C2 shows what the day slice records; an unrecorded value shows as unavailable.

## Mockup alignment (Bob 2026-10-31: the approved mockup wins)

- Prefilled claims confirm with "Confirm" (mockup).
- Optional 1–5 fun rating on the iPad is in C2 scope; it never blocks.
- Stats title is the list label ("Game N").

## Eval approval

- See ./approval.md (must be filled before coding).
