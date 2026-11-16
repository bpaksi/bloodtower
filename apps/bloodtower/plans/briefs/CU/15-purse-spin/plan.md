Keep this a checklist; do not write a second design doc.

# Brief: CU / 15-purse-spin — The game of chance (the Spin and the starting purse) (54c)

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (step 54c, part of #480; split from CU/07 on 2026-11-15, Bob, chat: "Split into 54a, 54b, 54c")
- Feature: 15-purse-spin
- Kind: screen
- Owner: Gamewright (brief, evals); a Wright developer (build); Illusionist replaces the mockup
- Related AREA/docs: PT-13 in [the playtest](../../../../../../research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md); [design-freeze.md](../../../catchup/design-freeze.md) section H; UI-037, UI-013, UI-045, UI-038 (retired), DEC-408, DEC-479, DEC-481, DEC-114, DEC-196 (AREA-069, AREA-050, AREA-095, AREA-078)
- Evals: ./eval.md
- Screen spec: ./screen-spec.md (CU/07's, whole; only the states named in "What it does" belong to this part)
- Mockup: ./mockup.html (CU/07's draft, whole; only this part's sections belong to it)
- Risk: Med
- Depends on: its approval.md on main; C3 05 (merged); steps 43 (#469), 44 (#470), 45 (#471); 54a (CU/13) merged, because EV-14 opens the items panel
- Touches: `apps/bloodtower/src/web/components/board/ChanceSpin.tsx` (new), `apps/bloodtower/src/web/components/board/CoreStoryBoard.tsx`, `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx` (the Spin button only), `apps/bloodtower/src/protocols/v2/views.ts` (the chance step and result on the views), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/engine/loops/game/setupFlow.ts` and `apps/bloodtower/src/engine/loops/session/screens.ts` (the starting-purse step), `apps/bloodtower/src/engine/loops/session/view.ts` and `state.ts` (the chance view and the set purse), `apps/bloodtower/src/engine/rules/purse/**` (new: the seeded draw, reads `setup.purse_wheel`), `apps/bloodtower/src/server/core/serialize.ts` and `session.ts` (the purse survives Continue; a replay never re-spins), `apps/bloodtower/src/server/core/effects.ts` (the chase and sound as `command{capabilityId, params}`, only on the press), the board speakers' coin cue (the file the developer names; board audio only), `apps/bloodtower/src/e2e/tests/c3-panels.spec.ts` (new, or add to it if another part landed first; the chance cases); Touches amended 2026-11-16 by the coordinator under Bob's standing delegation (Bob accepted the coordinator's Touches amendments in chat; Bob to review this one in the PR): `apps/bloodtower/src/engine/loops/game/loop.ts` (the Spin press, the seeded draw, the stale-Continue block), `apps/bloodtower/src/engine/sim/runner.ts` (the simulator's scripted press list gains the purse step), `apps/bloodtower/src/protocols/control.ts` (the `spin` control action), `apps/bloodtower/src/server/tower/{types,mock,testAdapter}.ts` (the mock tower double records `lighting.sequence`; no raw bytes), `apps/bloodtower/src/web/lib/audio/{boardAudio,coinCue}.ts` (the board coin cue; no sound file), and the existing tests and e2e specs that walk the setup steps, changed only to spin first, plus the new test files `engine/rules/purse/purse.test.ts`, `engine/loops/session/purse.test.ts`, `server/core/purseSave.test.ts`, `server/pack/purseWheel.test.ts` and `web/components/board/ChanceSpin.test.ts`
- Builds: UI-045 (the game of chance: the Spin button, the starting-purse step that hosts it, the seeded draw, the tower command on the press, the board result and the no-tower coin sound); a narrow test-only seed if an eval needs one
- Deps change: no
- Runs: cloud
- Order: last of the three

## What it does

PT-13 ruling (design-freeze section H): add UI-045 to C3 `Builds:`. This part builds:

- UI-045, the game of chance: a Spin button on the iPad, the tower's lights chase and stop, the board shows the result (DEC-114 starting purse). The tower gets only a command by `command{capabilityId, params}`, only on the press; nothing spins by itself. With no tower the board shows the result at once and plays the coin sound on the board speakers (Q7.4; DEC-201, DEC-903).

What main has today: no starting-purse step and no spin. `setup.purse_wheel` is in `packs/base/tuning.yaml` and nothing reads it; `setPurse` only sets a number in tests.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A spin's result: a purse already set is not re-spun; the draw is seeded, so a replay matches (DEC-114).
  - Nothing physical runs unasked: no spin, light or sound after a restart without a new press.
  - The Menu and any gear panel closed, the game not paused, the toolbar on every iPad, item states recomputed (as C2 feature 04).

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-08, EV-09, EV-10, EV-11, EV-13 (amount), EV-14, EV-15 and the chance part of EV-12 pass (verifier table on PR).
- Not required: the items panel (54a, CU/13); the virtue panel (54b, CU/14); a general test seed hook (queue step 12, #441).

## AREA / DEC checklist

- [ ] PT-13 ruling recorded as a DEC by step 43 (#469); UI-045, DEC-114, DEC-110 and DEC-201 `decided`; Ruling Q7.4 in the step-43 DEC; all closed before coding.

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-15 (step 45, #471). Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 6c | `chance.title` | Starting purse | mockup.html heading (Gamewright draft); DEC-110 names the purse step |
| 7 | `chance.spin` | Spin | UI-045 and DEC-114 name the button; Loremaster confirms. Checked against the spec: kept |
| 8 | `chance.result` | The lights stop on {N} gold. | new - Loremaster. Board line as the result lands with the tower (UI-045, DEC-114); `{N}` is the purse |
| 9 | `chance.notower` | The wheel stops on {N} gold. | new - Loremaster. Board line with no tower: shown at once, no "tower" or "lights" words (EV-10, Q7.4); the coin sound is a cue, not words |

## Rulings (Bob, 2026-11-14, adopted)
 (Bob, 2026-11-14, adopted)

- Q7.1 Bob, 2026-11-14, adopted: build the virtue choice list generic; test it with Infused (DEC-406, asks for a building). Gamewright, 2026-11-15 (DEC-934): the 1.0 deck is the 8 pool tiles (DEC-581) and Infused is the only turn-start choice; the list stays generic.
- Q7.2 Bob, 2026-11-14, adopted: the use-item host action is built here, behind the existing gear item "Use a potion or item". The host Split goes to CU/04. Queue step 12 (#441) shrinks to the day-loop effects wait and the test seed hook (see catchup/README.md row 12).
- Q7.3 Bob, 2026-11-14, adopted: UI-013 opens from "Use a potion or item"; "Current party" keeps HP, gold and the item count.
- Q7.4 Bob, 2026-11-14, adopted: with no tower the spin shows the result at once on the board and plays the coin sound on the board speakers (DEC-201, DEC-903). With the tower the chase command is sent only on the press.

## Eval approval

- See ./approval.md (must be filled before coding; it is PENDING until Bob dates a row).
