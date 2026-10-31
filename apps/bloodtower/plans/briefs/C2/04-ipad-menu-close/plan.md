Keep this a checklist; do not write a second design doc.

# Brief: C2 / 04-ipad-menu-close — The iPad Menu has Close

## Meta

- Plan: C2 ([plan](../../../C2-session-shell.md), feature 04). G-C1 note GC1-04.
- Feature: 04-ipad-menu-close
- Owner: Claude (brief). A Wright developer builds it.
- Related AREA/docs: DEC-707, UI-033, UI-032, DEC-227, DEC-229, DEC-230; audit: `ChromeBar.tsx` closes the Menu only on Escape or after a press
- Evals: ./eval.md
- Mockup: ./mockup.html
- Risk: Low
- Touches: `apps/bloodtower/src/web/components/device/ChromeBar.tsx`, `apps/bloodtower/src/web/components/device/chromeBar.test.ts` (new), `apps/bloodtower/src/web/app/globals.css` (Menu rules only), `apps/bloodtower/src/e2e/tests/w1-chrome.spec.ts`

## Cutover

Cutover: N

- The Menu dialog gains Close and two more ways to close. Its groups and items stay.

## Survival invariants

- Continue, restore, and restart must keep: the Menu starts closed after a reload or Continue. Closing it never changes game state.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-11 all pass (verifier table on PR).
- In scope (mockup wins; Bob 2026-10-31): the Menu shows Look up (Hero panel, Roll, Items; "Nothing to look up." when empty), Table (Pause/Resume, Reconnect tower, Join another iPad, Change who holds whom) and Leave (Quit story). Unusable items are greyed, never hidden (DEC-227).

## AREA / DEC checklist

- [ ] DEC-707: closed before coding (`decided`, Bob 2026-10-31). Close always ends the dialog; a tap outside and a tap on the gear also close it; closing sends nothing; all three groups show, unusable items greyed.
- [ ] DEC-229: closed before coding (`decided`). Groups: Look up, Table, Leave.
- [ ] DEC-227: closed before coding (`decided`). An item that cannot be used is greyed, never left out.

## Mockup alignment (Bob 2026-10-31: the approved mockup wins)

- The Menu keeps Look up, Join another iPad and Change who holds whom (Bob ruling on Illusionist conflict).
- Portrait only; Back on the Quit confirm returns to the open Menu (mockup).
- Escape also closes (EV-07).

## Eval approval

- See ./approval.md (must be filled before coding).
