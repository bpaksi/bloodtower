Keep this a checklist; do not write a second design doc.

# Brief: CU / 14-virtue-panel-and-choice — The turn-start virtue panel and choice list (54b)

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (step 54b, part of #480; split from CU/07 on 2026-11-15, Bob, chat: "Split into 54a, 54b, 54c")
- Feature: 14-virtue-panel-and-choice
- Kind: screen
- Owner: Gamewright (brief, evals); a Wright developer (build); Illusionist replaces the mockup
- Related AREA/docs: PT-13 in [the playtest](../../../../../../research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md); [design-freeze.md](../../../catchup/design-freeze.md) section H; UI-037, UI-013, UI-045, UI-038 (retired), DEC-408, DEC-479, DEC-481, DEC-114, DEC-196 (AREA-069, AREA-050, AREA-095, AREA-078)
- Evals: ./eval.md
- Screen spec: ./screen-spec.md (CU/07's, whole; only the states named in "What it does" belong to this part)
- Mockup: ./mockup.html (CU/07's draft, whole; only this part's sections belong to it)
- Risk: Med
- Depends on: its approval.md on main; C3 05 (merged); steps 43 (#469), 44 (#470), 45 (#471); needs neither 54a nor 54c
- Touches: `apps/bloodtower/src/web/components/board/VirtuePanel.tsx` (new), `apps/bloodtower/src/web/components/board/CoreStoryBoard.tsx`, `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx` (the virtue choice list only), `apps/bloodtower/src/protocols/v2/views.ts` (the turn-start virtue lines and the choice on the views), `apps/bloodtower/src/engine/loops/group-turn/**` (the turn-start virtue step only), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/engine/loops/session/view.ts` (the virtue view only), `apps/bloodtower/src/engine/loops/session/state.ts` and `apps/bloodtower/src/server/core/serialize.ts` (only if a pending virtue choice must survive Continue), `apps/bloodtower/src/engine/rules/virtues/**` (new: the virtue lines, Infused and the generic fixture virtue), the narrow virtue seed, `apps/bloodtower/src/e2e/tests/c3-panels.spec.ts` (new, or add to it if another part landed first; the virtue cases)
- Builds: UI-037 (the turn-start virtue panel); the generic virtue choice list, tested with Infused (Q7.1); a narrow test-only seed that gives a group a virtue at game start
- Deps change: no
- Runs: cloud
- Order: independent of 54a and 54c

## What it does

PT-13 ruling (design-freeze section H): keep UI-037. This part builds:

- UI-037, the turn-start virtue panel: virtues that fire at a group's turn start are automatic and show on the Story board; the iPad gets a press only when a virtue asks a choice. The choice list is built generic and tested with Infused (DEC-406, asks for a building) (Q7.1). The 1.0 deck's Infused is the only choice-asking turn-start virtue (DEC-934).
- No use icon or UI-038 button on the iPad (EV-04).

What main has today: virtues are a count only (`helpingVirtues`, `engine/loops/day/clock.ts`) used in the day roll (`engine/loops/day/roll.ts`); no virtue has an identity, no panel, no choice.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - Virtues in effect for the group, recomputed from the game, not stored on the panel.
  - The Menu and any gear panel closed, the game not paused, the toolbar on every iPad.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01, EV-02, EV-03, EV-04, EV-16 and the virtue part of EV-12 pass (verifier table on PR).
- Not required: the items panel and use-item (54a, CU/13); the spin (54c, CU/15); any specific virtue's effect beyond showing it, except Infused's building pick; the general test seed hook (queue step 12, #441).

## AREA / DEC checklist

- [ ] PT-13 ruling recorded as a DEC by step 43 (#469); UI-037, DEC-408, DEC-406 and DEC-479 `decided`; Ruling Q7.1 in the step-43 DEC; DEC-934 confirms the 1.0 deck; all closed before coding.

## Copy

Exact player-facing text for this screen, by Loremaster, 2026-11-15 (step 45, #471). Beat order is the table order. A build shows the text below, not the sample text in mockup.html. Locked lines are copied verbatim and cite their source. Words in braces are filled in by the app. Captions equal the spoken text and stay at or under 120 characters. A source marked DRAFT is a best draft waiting on the named owner.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `virtue.title` | Virtues today | new - Loremaster. Board panel title after the whose-turn banner (UI-037) |
| 2 | `virtue.line` | {virtue}: {effect} | UI-037 (one line per virtue); `{effect}` is the virtue tile's own text, never rewritten here |
| 2a | `virtue.line` example | Infused: remove 1 skull in Brynthia | locked UI-037 (Bob accepted 2026-10-30); example of row 2 |
| 2b | `virtue.line` example | Relentless: +1 Wild until the next roll | locked UI-037; also drawn in mockup.html |
| 2c | `virtue.line` example | Fortunate: a second pick today | locked UI-037 |
| 3 | `virtue.choice.prompt` | {virtue} asks you to choose. | new - Loremaster. One generic line on the board and the iPad when a virtue asks a choice (Q7.1, tested with Infused); the buttons are the choices themselves, for Infused the building names. Replaces the mockup's "A virtue asks" |

## Rulings (Bob, 2026-11-14, adopted)
 (Bob, 2026-11-14, adopted)

- Q7.1 Bob, 2026-11-14, adopted: build the virtue choice list generic; test it with Infused (DEC-406, asks for a building). Gamewright, 2026-11-15 (DEC-934): the 1.0 deck is the 8 pool tiles (DEC-581) and Infused is the only turn-start choice; the list stays generic.
- Q7.2 Bob, 2026-11-14, adopted: the use-item host action is built here, behind the existing gear item "Use a potion or item". The host Split goes to CU/04. Queue step 12 (#441) shrinks to the day-loop effects wait and the test seed hook (see catchup/README.md row 12).
- Q7.3 Bob, 2026-11-14, adopted: UI-013 opens from "Use a potion or item"; "Current party" keeps HP, gold and the item count.
- Q7.4 Bob, 2026-11-14, adopted: with no tower the spin shows the result at once on the board and plays the coin sound on the board speakers (DEC-201, DEC-903). With the tower the chase command is sent only on the press.

## Eval approval

- See ./approval.md (must be filled before coding; it is PENDING until Bob dates a row).

## Build notes (the CU/14 developer, 2026-11-16)

- Touches extras the build needed, for the coordinator to amend: `engine/loops/day/clock.ts` (`HeroSheet.virtues`), `engine/loops/chapter/playState.ts` (the narrow seeds `~test-virtues:` and `~test-skulls:`), `engine/loops/session/stepShell.ts` (log a refused virtue press; checkpoint after a pick), `engine/loops/session/view.ts` (the virtue view), `engine/views/state.ts` (the view type), `web/components/board/board.css` (the panel's place), unit tests beside the code, `server/core/virtuesSave.test.ts`.
- A virtue option rides the existing `record` action under a `virtue-choice--<group>--<virtue>--<option>` prompt id, so `protocols/control.ts` is untouched.
- The panel shows from the turn start until the group's first move (walk, Enter, End turn) or 8 seconds (client hold); a choice still open keeps it up until answered (DEC-934: the pick never blocks the move map).
- Lines built: Infused (DEC-406, DEC-934) and Fortunate; Relentless and Mend wait for the roll's doubles and the heal state, which main does not keep. `fixture` is the test-only choice virtue (EV-03). No citadel draw: virtues come only from the seeds.
- Infused's pick removes the skull and returns it to the supply. "That building's menu gets back what the skull took" (DEC-406) is not built: no menu state exists on main.
