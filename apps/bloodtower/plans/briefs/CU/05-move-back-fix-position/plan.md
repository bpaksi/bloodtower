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
- Depends on: its approval.md on main; steps 43 (#469), 44 (#470) and 45 (Loremaster Copy table) done. Its strings are in the Copy table below (Loremaster, step 45).
- Touches: `apps/bloodtower/src/engine/loops/group-turn/loop.ts` (undo log, back offer), `apps/bloodtower/src/engine/loops/session/gear.ts` (the correction), `apps/bloodtower/src/engine/loops/session/view.ts`, `apps/bloodtower/src/protocols/v2/views.ts` (gear panel fields), `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx`, `apps/bloodtower/src/web/components/device/ChromeBar.tsx` (Back on the move map), `apps/bloodtower/src/web/components/board/GearBoardPanel.tsx` (the Game board setup panel and the board's correction line), `apps/bloodtower/src/engine/loops/group-turn/*.test.ts` or `apps/bloodtower/src/engine/loops/day/day.test.ts`, `apps/bloodtower/src/e2e/tests/w7-move-map.spec.ts`; Touches amended 2026-11-15 by the coordinator under Bob's standing delegation ("use good judgement on all questions"; Bob to review in the PR): `apps/bloodtower/src/engine/loops/session/stepShell.ts` (route the Fix my position pick so a refused correction can emit a press-error), `apps/bloodtower/src/engine/loops/session/effects.ts` (new press-error codes for a refused press and a bad space or group, EV-08 and EV-30), `apps/bloodtower/src/engine/loops/session/gear.test.ts` (the correction tests), `apps/bloodtower/src/e2e/tests/w7-fix-position.spec.ts` (new, EV-07, 10, 21, 22), and any existing test that assumed a turn auto-ends at 0 moves (`group-turn/loop.test.ts`, `day.test.ts`, e2e specs that walk out their moves), changed only so Back stays offered after the last move (EV-28c); Touches amended again 2026-11-15 by the coordinator under Bob's standing delegation (Bob to review in the PR): `apps/bloodtower/src/server/core/session.ts` (`persistGear` also saves a `fix-position` pick, so a correction survives Continue, EV-24)
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
- Copy text: the Copy table below (step 45); EV-10 checks it.

## AREA / DEC checklist

- [ ] PT-19 ruling recorded as a DEC by step 43 (#469); closed before coding. The brief does not invent its id.
- [ ] DEC-035 (tap the space), DEC-209 (Back undoes only until the outcome shows; luck never re-rolls), DEC-220 (Enter and Leave are free), MEC-035, UI-023: read; closed before coding.
- [ ] Loremaster Copy table (step 45) holds the strings named in the mockup; closed before coding. Filled 2026-11-15; row 13 confirmed by DEC-935 (no DRAFT rows).
- [ ] Rulings Q5.1 to Q5.3 below written into the step-43 DEC; closed before coding.

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-15 (step 45, #471). Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `move.moves-left` | Moves left: {N} | main (`CoreDeviceScreen.tsx`); unchanged |
| 2 | `button.walk` | {space name} | main (`view.ts` labels a walk with the space's own name); unchanged. The mockup's "Go to Neighbour N" is sample text and is not built |
| 3 | `button.end-turn` | End turn | main (`view.ts`); unchanged |
| 4 | `toolbar.back` | Back | main (`view.ts`, `ChromeBar.tsx`); the same word as on every other iPad screen. On the move map it is enabled after a tap and disabled at the turn start or after a trigger (EV-05, EV-09) |
| 5 | `toolbar.replay` | Replay | C2 feature 04 toolbar (Back and Replay centre, PT-23); unchanged |
| 6 | `gear.item.game-board-setup` | Game board setup | locked C2 feature 04 (gear item 2, Bob approved 2026-10-31); unchanged |
| 7 | `gear.fix-position` | Fix my position | Q5.3 (Bob, 2026-11-14, adopted) and DEC-229 name the control; Loremaster confirms the words |
| 8 | `fix-position.help` | Use this if a piece was moved by mistake. Pick whose group it is and where it really stands. It costs no moves and nothing starts. | new - Loremaster. Shown on the iPad panel and mirrored on the board (mockup `fix-position-help`). Says the three rules of Q5.3: any space, free, silent |
| 9 | `fix-position.group.label` | Whose group? | new - Loremaster. The options are the lead hero's name, `{hero}`, as the band names a group (CU/10). Replaces the mockup's "Hero group: Group 1" |
| 10 | `fix-position.space.label` | Where does it stand? | new - Loremaster. The options are the board's space names, as on the move map. Replaces the mockup's "Space: ..." |
| 11 | `button.done` | Done | locked C2 feature 04 (every gear panel ends on Done and the game resumes); unchanged |
| 12 | `board.fix-position-done` | {hero}'s group is set on {space}. | new - Loremaster. The one board line for the correction (EV-06). `{hero}` is the group's lead hero, one name, never the whole party. No move, battle or luck wording, because nothing happened in the story |
| 13 | `fix-position.not-now` | Only on the move map or between loops. | new - Loremaster; confirmed DEC-935. Reason line when Fix my position is greyed in a battle, a scene or a building menu, in the style of the gear's other reasons ("Only in a game."). The Game board setup gear row stays enabled (the piece check is still useful). A press that still gets through is refused under EV-30 (its own error code, no state change, logged and toasted), not EV-08. EV-08 stays the refusal for a space or group that does not exist |

## Rulings (Bob, 2026-11-14, adopted)

- Q5.1 Bob, 2026-11-14, adopted: a trigger is any arrival that starts an encounter, event, foe or quest scene. Enter and End turn also close the Back window. Spending the last move does not close it (Back gives the move back).
- Q5.2 Bob, 2026-11-14, adopted: Back repeats; each press undoes one tap, back to the turn start or the last trigger. Luck never re-rolls.
- Q5.3 Bob, 2026-11-14, adopted: "Fix my position" allows any space, only on the move map or between loops (not during a battle, scene or building menu), with no limit. It is logged and the board shows a line (Copy row 12, `board.fix-position-done`).

## Eval approval

- See ./approval.md (must be filled before coding).
