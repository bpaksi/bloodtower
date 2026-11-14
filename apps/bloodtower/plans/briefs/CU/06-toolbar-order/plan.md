Keep this a checklist; do not write a second design doc.

# Brief: CU / 06-toolbar-order — Toolbar order: "?" left, Back and Replay centre, gear right

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (step 53, #479)
- Feature: 06-toolbar-order
- Kind: fix
- Owner: Gamewright (brief, evals); a Wright developer (build)
- Related AREA/docs: PT-23 in [the playtest](../../../../../../research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md); [design-freeze.md](../../../catchup/design-freeze.md) section H; UI-032, DEC-227 (AREA-078); C2 feature 04
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no screen change: main already draws this order, this step pins it, see "What main does today")
- Risk: Low
- Depends on: its approval.md on main; step 43 (#469) has recorded the PT-23 ruling
- Touches: `apps/bloodtower/src/web/components/device/ChromeBar.tsx`, `apps/bloodtower/src/web/components/device/chromeBar.test.ts`, `apps/bloodtower/src/web/app/globals.css` (bottom-bar rules only), `apps/bloodtower/src/e2e/tests/w1-chrome.spec.ts`
- Builds: PT-23
- Deps change: no
- Runs: cloud

## What it does

PT-23 ruling: the iPad bottom toolbar reads "?" at the left, Back and Replay in the centre, the gear (Menu) at the right. A control that cannot be used stays visible and greyed (DEC-227).

What main does today: `ChromeBar.tsx` already renders `?`, then a `.bt-bar-mid` holding Back and Replay, then the gear, and `w1-chrome.spec.ts` `expectBar` already pins that order and equal margins at both ends. Nothing pins that Back and Replay sit in the centre, and the "centred trio" wording in UI-032 and DEC-227 is fixed by step 43, not here. This step adds the missing centre check and the greyed-state check, and fixes the CSS only if the check fails.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - The toolbar on every iPad screen in the same order, with the gear Menu closed and the game not paused.
  - A Back or Replay that cannot be used still shown, greyed; it is never hidden and the bar never shifts.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-08 all pass (verifier table on PR).
- Not required: a Replay action (Replay stays disabled in 1.0, as on main); the Story board (the toolbar is iPad chrome).

## AREA / DEC checklist

- [ ] PT-23 ruling recorded as a DEC by step 43 (#469); closed before coding.
- [ ] UI-032: reworded by step 43 to the new order; closed before coding.
- [ ] DEC-227: its note updated by step 43; closed before coding.
- [ ] AREA-078: closed before coding (`decided`).

## Rulings (Bob, 2026-11-14, adopted)

- Q6.1 Bob, 2026-11-14, adopted: Replay stays visible and greyed (DEC-227) with no action in 1.0.

## Eval approval

- See ./approval.md (must be filled before coding).
