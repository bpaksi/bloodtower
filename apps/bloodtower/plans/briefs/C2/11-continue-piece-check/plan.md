Keep this a checklist; do not write a second design doc.

# Brief: C2 / 11-continue-piece-check — Continue's piece check: the pieces, the drums and the trapped skulls

## Meta

- Plan: C2 ([plan](../../../C2-session-shell.md), feature 11). AREA-100 scene 5.
- Feature: 11-continue-piece-check
- Owner: Claude (brief). A Wright developer builds it.
- Related AREA/docs: MEC-018, DEC-283, DEC-710, DEC-716, DEC-717, DEC-675 (Continue resumes every loop at its saved node), DEC-305 and DEC-306 (no tower), DEC-064 and `engine/loops/day/skull.ts` (a skull recorded as "inside"), DEC-006 (drums may turn in play), SCR-011 (the setup frame the check reuses), feature 10's findings note `research/tower/2026-11-setup-check-findings.md`
- Evals: ./eval.md
- Mockup: ./mockup.html
- Risk: High (autosave, tower safety)
- Touches: `apps/bloodtower/src/engine/loops/{session,game}/**`, `apps/bloodtower/src/engine/loops/day/skull.ts` (read the "inside" records only), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/protocols/v2/**`, `apps/bloodtower/src/server/{core,tower}/**`, `apps/bloodtower/src/web/components/board/{StartupBoard,CoreStoryBoard}.tsx`, `apps/bloodtower/src/web/components/board/board.css`, `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx`, `apps/bloodtower/src/e2e/tests/c2-continue-check.spec.ts` (new)
- Depends on: feature 08 merged (the session shell is serial), and feature 10's findings note on `main` with Bob's run answering "What the run must answer" item 3 (the rotate)

## Before the build

Read feature 10's findings note first. If it says `mechanics.rotate-drum` does not land where the library says, the drum step uses DEC-716's fallback: one picture per drum of its saved glyph side, which the table turns by hand, with no rotate sent. Update this brief and EV-04 to EV-06 to that fallback in the same PR, and say so in the PR body. Bob approves the changed evals before the code.

## Cutover

Cutover: Y

- Continue today reloads the checkpoint and runs the tower check (feature 06 kept that). After this feature, Continue runs the piece check between the tower block and the resumed chapter (DEC-283's board node).
- The autosave gains one field, each drum's position, kept up to date by every rotate the engine sends. The trapped-skull count is derived from the skull records already saved. An autosave written before this feature has no drum field; it reads as "at home" (the calibrated position), and the check says so.

## The check, in order

Continue (session screen or Pick story) → the tower block if this session has none (MEC-039 .5 to .25) → the piece check → the saved chapter at its saved node (DEC-675). Each step is one dialog in the SCR-011 frame: the board shows a picture and a line, and every iPad shows Done and Skip.

1. Hero minis: one picture of the board with each hero's saved space.
2. Skulls on buildings: one picture with each building's saved skull count.
3. Foes on the board, if the save has any.
4. Broken seals, if any chapter win broke one.
5. Tower only: "Turn the drums to the saved game", shown only when a drum's saved position differs from where calibration left it. One press of Turn the drums sends one `mechanics.rotate-drum` per drum that is off, in top, middle, bottom order. Then a picture shows what each side should show, and the table confirms.
6. Tower only: "Drop N skulls back into the tower", shown only when N > 0. N is the count of skull records whose target is "inside" (DEC-717).

A skipped step stays unconfirmed (MEC-018): the board marks it in the top band until the next chapter-end check.

## Survival invariants

- Continue, restore, and restart must keep:
  - The saved drum positions and the trapped count, unchanged by running the check, by skipping it, or by a host restart part-way through it.
  - The resumed game: same day, positions, purse, claims and seed as the save (DEC-675).
  - The check's progress: a host restart mid-check resumes at the step it was on, never at step 1 and never past it.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-12 all pass (verifier table on PR).
- Not required: the chapter-end check (MEC-018's short optional one; C3). Glyph boons (DEC-601: 1.1). Telling a trapped skull from one that came out (Q-032).

## AREA / DEC checklist

- [ ] MEC-018: closed before coding (`decided`). Tracked, not sensed; each piece shows unconfirmed until a picture is confirmed; a skip stays unconfirmed.
- [ ] DEC-710: closed before coding (`decided`). One check on any evening; set or check; the base board is already out from the Enter.
- [ ] DEC-716: closed before coding (`decided`). One press turns the drums; nothing turns without it; a picture confirms after.
- [ ] DEC-717: closed before coding (`decided`). The table drops the trapped count back in and confirms.
- [ ] DEC-305, DEC-306: closed before coding (`decided`). Without the tower, steps 5 and 6 drop out.
- [ ] Tower safety (root CLAUDE.md): no rotate without the press; a failed rotate is not retried on its own.
- [ ] Errors (decision 0003): a failed rotate is logged, shown on the iPad that pressed with its error code, and toasted on the Story board.

## Eval approval

- See ./approval.md (must be filled before coding).
