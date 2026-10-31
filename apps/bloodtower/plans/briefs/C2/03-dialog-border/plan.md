Keep this a checklist; do not write a second design doc.

# Brief: C2 / 03-dialog-border — Every Story board dialog keeps a border

## Meta

- Plan: C2 ([plan](../../../C2-session-shell.md), feature 03). G-C1 note GC1-02.
- Feature: 03-dialog-border
- Owner: Claude (brief). A Wright developer builds it.
- Related AREA/docs: DEC-705, SCR-013, `DialogFrame.tsx` (the board's only dialog chrome)
- Evals: ./eval.md
- Mockup: ./mockup.html
- Risk: Low
- Touches: `apps/bloodtower/src/web/components/board/{DialogFrame,WaitingDialog}.tsx`, `apps/bloodtower/src/web/components/board/board.css`, `apps/bloodtower/src/e2e/tests/board-look.spec.ts`, `apps/bloodtower/src/e2e/tests/c2-dialog-border.spec.ts` (new)

## Cutover

Cutover: N

- Dialog sizing only. No screen is added or removed.

## Survival invariants

- Continue, restore, and restart must keep: nothing new. The board after Continue draws the same dialogs under the same rule.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-06 all pass (verifier table on PR).
- Not required: tuning the 5% on the TV (DEC-705 calls it a placeholder; Bob tunes it at G-C2). The Sound dialog on `/`, which is not on the board.

## AREA / DEC checklist

- [ ] DEC-705: closed before coding (`decided`, Bob 2026-10-31). At least 5% of the board's height above and below and 5% of its width at each side. Long content: the art shrinks first, then content is cut to fit. Never scrolled, never clipped mid-line (Bob 2026-10-31).
- [ ] SCR-013: closed before coding (`decided`). The board never scrolls and never clips text.
- [ ] GC1-02 trace: the playtest note did not confirm which dialog filled the height. The likely culprit is `TowerPanel` in `StartupBoard.tsx`: a full-size tower still plus the join block. The eval covers every board dialog the e2e suite opens, so the culprit is caught whichever it was.

## Mockup alignment (Bob 2026-10-31: the approved mockup wins)

- Board dialogs never scroll. Fit order: shrink the art first, then cut content (whole items) to fit (Bob ruling on Illusionist conflict).
- EV-03 is a DOM check against M "Typical dialog" (painting visible, 0 board buttons), not a screenshot compare.

## Eval approval

- See ./approval.md (must be filled before coding).
