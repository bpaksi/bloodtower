Keep this a checklist; do not write a second design doc.

# Brief: CU / 11-remove-ipad-enable-sound — No iPad plays sound: remove the per-iPad Enable sound step

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (step 60, issue #490)
- Feature: 11-remove-ipad-enable-sound
- Kind: engine
- Owner: Gamewright (brief, evals); a Wright developer (build); the Illusionist (mockup change); Loremaster (sign-off of removed strings)
- Related AREA/docs: PT-24 in `research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md`; DEC-903 (the ruling, in `catchup-rulings-2026-11-12.md` row 9); DEC-201 (all sound on the Story board); DEC-274; C2/04, C2/05; design-freeze.md sections G and H
- Evals: ./eval.md
- Screen spec: none (the screen change is a removal; see "Gates")
- Mockup: none (no new mockup here: the Illusionist changes C2/05's mockup.html, see "Gates")
- Risk: Med
- Depends on: its approval.md on main; step 44 (this brief); Loremaster sign-off of the removed strings (step 45)
- Touches: `apps/bloodtower/src/engine/loops/session/{sound.ts,sound.test.ts,events.ts,stepShell.ts,view.ts,state.ts}`, `apps/bloodtower/src/server/core/{session.ts,serialize.ts}`, `apps/bloodtower/src/web/components/device/{CoreDeviceScreen.tsx,CoreDeviceScreen.test.ts,gearMenu.ts}`, `apps/bloodtower/src/web/components/board/CoreStoryBoard.test.ts`, `apps/bloodtower/src/web/lib/{volumeTest.ts,startupBoard.ts}`, `apps/bloodtower/src/e2e/tests/c2-session-enter.spec.ts`, `apps/bloodtower/src/e2e/tests/support/acceptance.ts`, `apps/bloodtower/spec.md` (§3 v2, the Pick story sentence)
- Builds: PT-24, DEC-903 (step 60)
- Deps change: no
- Runs: cloud

## What it does

On main today every iPad on Pick story shows only "Tap once to turn on this iPad's sound." and one "Enable sound" button (prompt `sound-enable`, event `sound-unlock`), then the volume levels. DEC-903: no iPad ever plays sound, so that step and its copy go. Pick story opens straight on the volume step on the connect track. Play without Tower has no volume step and no volume line (today the volume levels still run there and the line shows). The tower volume step keeps its press, Keep and Try another.

## Gates (all three before the build merges)

- Bob re-approves the changed C2/04 and C2/05 evals (C2/05's text was amended by #485 at 6:36 PM ET on 2026-11-12, after the 6:01 PM batch re-approval row; C2/04 EV-11 and EV-12 were amended by step 44 on 2026-11-14); his batch approval row for step 44 covers both.
- The Illusionist changes the C2/05 mockup (not drafted here).
- Loremaster signs off the removed strings (step 45): done, Bob signed off 2026-11-15 (see Copy).

## Amendments to the C2 briefs

Already amended on main by #485 (needs Bob's new approval row only): C2/05 EV-01, EV-09, EV-10, EV-14, EV-15 (new), EV-16 (new), EV-17, and C2/05 plan.md and screen-spec.md "Sound on Pick story".

Amended by step 44 on 2026-11-14 (Bob, 2026-11-14; each marked "Amended 2026-11-14 (PT-24, DEC-903)" in place; covered by Bob's batch approval row):
- C2/04 EV-11: "Pick story 7a/7b/7c" is now "Pick story 7b/7c" (7a is retired).
- C2/04 EV-12 and screen-spec "Which items are enabled": with no tower the gear Volume item stays visible and greyed with a reason line (DEC-227, DEC-903); new Loremaster string `gear.volume.no-tower`. C2/04 plan.md carries a note.

Amended 2026-11-15 (PT-24, Bob approved in chat, step 60): CU/11 EV-11 and EV-13 reworded in place, because a host restart never reconnects the tower and `keptVolume` resets on restore (pre-existing); each is marked in eval.md.

Still open, not an eval edit:
- C2/05 mockup.html keeps tab 7a ("Tap once to turn on this iPad's sound." / "Enable sound") and a greyed 7b board line until the Illusionist removes tab 7a and makes 7b's board line full strength. The mockup stays unedited here. EV-10 and EV-14 already say tab 7a is retired.

## Cutover

Cutover: Y

- The prompt `sound-enable` and its action `enable-sound` die.
- The event `sound-unlock` and the `phase: "enable"` state of a device's sound step die; `volumeLineLive` and `volume-line-off` (the greyed line) die.
- The string "Tap once to turn on this iPad's sound." (`ENABLE_SOUND_LINE`), the label "Enable sound", the `enable-sound` help line in `gearMenu.ts` and the board's greyed volume line die.
- Old autosaves and event logs that contain `sound-unlock` must still load: `stepShell.ts` ignores them in an explicit branch with a `debug` line (decided below).

## Survival invariants

- Continue, restore, and restart must keep:
  - The tower is never touched without a press: the volume step plays Dungeon Complete (#58) on the tower only on a Volume press, and nothing physical happens on load, restore or Continue.
  - A kept volume (and the tower volume the move-roll cue uses) survives as before.
  - Play without Tower: no volume step, no volume line, and tonight's tower choice survives a restart (C2/05 EV-13).
  - An autosave or checkpoint from main before this change still loads, with no Enable sound step shown.
  - The Story board's own audio unlock (first click or key on the landing page, SCR-003) is untouched.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-06, EV-11 … EV-13 and EV-14 … EV-15 all pass (verifier table on PR).
- Not required: the mockup change (Illusionist, separate); a real-tower run (Bob's run on Mon Nov 16 covers the connect track).

## AREA / DEC checklist

- [ ] PT-24 ruling recorded as a DEC by step 43 (#469) (DEC-903 already holds the ruling text; confirm any new id there); closed before coding.
- [ ] DEC-903: closed before coding (`decided`).
- [ ] DEC-201: closed before coding (`decided`; all sound on the Story board).
- [ ] DEC-274: closed before coding (`decided`; the Enter's tower block).
- [x] Loremaster sign-off of the removed strings (step 45): Bob signed off on 2026-11-15 (see Copy, Removed strings); closed.
- [x] Loremaster writes the one new string `gear.volume.no-tower` (step 45): written 2026-11-15 (see Copy row 1); closed.

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-15 (step 45, #471). Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `gear.volume.no-tower` | Only with the tower. | new - Loremaster (step 45). Reason line for the greyed gear Volume item when the table plays without the tower; same short style as the gear's other reasons ("Only in a game.", "The tower is connected."). No hero or story words |
| 2 | `volume.line` | How loud should the tower be? Press one to hear it. | locked: C2/05 screen-spec state 7 (SCR-006). Kept unchanged. Under DEC-903 it plays only on the connect track, at full strength from the first view, and never with Play without Tower |

### Removed strings (Loremaster sign-off)

Bob signed off on removing the three strings below on 2026-11-15 (6:28 AM ET), under PT-24 and DEC-903 (no iPad plays sound). Loremaster confirms nothing else in the story or help copy points at them.

| # | Slot or id | Removed text | Where it lived | Sign-off |
|---|------------|--------------|----------------|----------|
| R1 | prompt `sound-enable` (`ENABLE_SOUND_LINE`) | Tap once to turn on this iPad's sound. | iPad, first view of Pick story; locked, Bob 2026-10-31 10:33 AM ET | Bob, 2026-11-15, signed off |
| R2 | action `enable-sound` (button label) | Enable sound | iPad, Pick story; locked, Bob 2026-10-31 10:33 AM ET | Bob, 2026-11-15, signed off |
| R3 | help `enable-sound` (`gearMenu.ts`) | Tap Enable sound so this iPad can play the story's voice and sound. (the 2026-10-31 help list had: Tap once so this iPad can play the story's voice and sound.) | the iPad "?" help for the Enable sound state | Bob, 2026-11-15, signed off |

Also gone, not a separate string: the greyed copy of row 2's line on the board during the old Enable sound step (Bob 6:15 PM ET 2026-10-31; C2/05 "Removed 2026-11-12"). The kept lines are `volume.line` (row 2) and the iPad help `volume` ("Set how loud the tower is. Press a volume to hear it, then tap Keep.", locked C2/04), which now show on the connect track only.

## Decided (was OPEN)

- With no tower the gear Volume item stays visible and greyed with a reason line, never hidden (DEC-227, DEC-903). This changes approved C2/04 EV-12 (Volume was "always" enabled), amended in place by step 44 and adding the Loremaster string above. Bob, 2026-11-14 (ruled).
- Old `sound-unlock` events in saved logs are accepted and ignored with a `debug` line (an expected, fully recovered case, so not an error under CLAUDE.md); `stepShell.ts` handles them in an explicit branch, not the generic unknown-event path. Bob, 2026-11-14, adopted.

## Eval approval

- See ./approval.md (must be filled before coding).
