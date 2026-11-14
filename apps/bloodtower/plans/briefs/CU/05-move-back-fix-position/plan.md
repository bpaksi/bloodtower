Keep this a checklist; do not write a second design doc.

# Brief: CU / 05-move-back-fix-position — Back undoes a move-map tap until a trigger fires; "Fix my position" in the gear

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (queue step 52)
- Feature: 05-move-back-fix-position
- Kind: engine
- Owner: Gamewright (brief, evals); a Wright developer, runner hammer (build)
- Related AREA/docs: GitHub issue #478; PT-19 in `research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md`; `plans/catchup/design-freeze.md` section H; DEC-035, DEC-209, DEC-220, MEC-035, UI-023, DEC-229, C2/04 (gear), W7 move map
- Evals: ./eval.md
- Screen spec: none
- Mockup: ./mockup.html (a Gamewright draft for the Illusionist to replace)
- Risk: High
- Depends on: its approval.md on main; steps 43 (#469), 44 (#470) and 45 (Loremaster Copy table) done. No story copy is written here: every string is a `[COPY: ...]` slot.
- Touches: `apps/bloodtower/src/engine/loops/group-turn/loop.ts` (undo log, back offer), `apps/bloodtower/src/engine/loops/session/gear.ts` (the correction), `apps/bloodtower/src/engine/loops/session/view.ts`, `apps/bloodtower/src/protocols/v2/views.ts` (gear panel fields), `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx`, `apps/bloodtower/src/web/components/device/ChromeBar.tsx` (Back on the move map), `apps/bloodtower/src/web/components/board/GearBoardPanel.tsx` (the Game board setup panel and the board's correction line), `apps/bloodtower/src/engine/loops/group-turn/*.test.ts` or `apps/bloodtower/src/engine/loops/day/day.test.ts`, `apps/bloodtower/src/e2e/tests/w7-move-map.spec.ts`
- Builds: PT-19 (issue #478)
- Deps change: no
- Runs: cloud

## What it does

On the move map a tap spends a move at once (`applyWalk`, `movesLeft - 1`) and the arrive trigger may fire (MEC-035 .5, .6). Today the move map offers no Back; the gear's Game board setup re-runs the piece check but gives no moves back (`gearPieceChecks`). PT-19 and section H:

- Back on the move map reverts the last tap (the group goes back, the move is returned) until a trigger plays. After a trigger it is not offered. A trigger is any arrival that starts an encounter, event, foe or quest scene; Enter and End turn also close the Back window; spending the last move does not (Back gives the move back) (Q5.1).
- Back repeats: each press undoes one tap, back to the turn start or the last trigger (Q5.2).
- The gear's Game board setup panel gains "Fix my position": it moves the group's recorded space to any space, charges nothing, fires nothing and logs a correction; it shows a line on the board; it runs only on the move map or between loops (not during a battle, scene or building menu), with no limit (Q5.3).
- It keeps DEC-209: luck never re-rolls. A Back never rewinds or consumes the seeded stream.

## Cutover

Cutover: N

- Nothing dies or is renamed. The gear panel gains one control; the move map gains Back.

## Survival invariants

- Continue, restore, and restart must keep:
  - A group's recorded space, moves left and the undo log (until a trigger) survive Continue; Back still works after Continue if no trigger fired.
  - A trigger that has played is never undone: no Back after it, and no replay of the trigger.
  - The seeded stream position (`rngSeq`) is the same after a Back as before the tapped move.
  - A correction is in the event log and survives Continue; it charges no move and starts no trigger.
  - Nothing physical happens: no tower command from Back or a correction.
  - Hero state (hit points, gold, items) is untouched by Back and by a correction.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-11, EV-21 … EV-25 and EV-26 … EV-31 all pass (verifier table on PR).
- Not required: the copy text itself (step 45).

## AREA / DEC checklist

- [ ] PT-19 ruling recorded as a DEC by step 43 (#469); closed before coding. The brief does not invent its id.
- [ ] DEC-035 (tap the space), DEC-209 (Back undoes only until the outcome shows; luck never re-rolls), DEC-220 (Enter and Leave are free), MEC-035, UI-023: read; closed before coding.
- [ ] Loremaster Copy table (step 45) holds the `[COPY: ...]` strings named in the mockup; closed before coding.
- [ ] Rulings Q5.1 to Q5.3 below written into the step-43 DEC; closed before coding.

## Rulings (Bob, 2026-11-14, adopted)

- Q5.1 Bob, 2026-11-14, adopted: a trigger is any arrival that starts an encounter, event, foe or quest scene. Enter and End turn also close the Back window. Spending the last move does not close it (Back gives the move back).
- Q5.2 Bob, 2026-11-14, adopted: Back repeats; each press undoes one tap, back to the turn start or the last trigger. Luck never re-rolls.
- Q5.3 Bob, 2026-11-14, adopted: "Fix my position" allows any space, only on the move map or between loops (not during a battle, scene or building menu), with no limit. It is logged and the board shows a line (Loremaster string, step 45).

## Eval approval

- See ./approval.md (must be filled before coding).
