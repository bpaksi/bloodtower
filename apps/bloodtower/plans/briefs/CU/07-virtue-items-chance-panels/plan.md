Keep this a checklist; do not write a second design doc.

# Brief: CU / 07-virtue-items-chance-panels — The virtue panel, the party items panel and the game of chance

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (step 54, #480)
- Feature: 07-virtue-items-chance-panels
- Kind: screen
- Owner: Gamewright (brief, evals); a Wright developer (build); Illusionist replaces the mockup
- Related AREA/docs: PT-13 in [the playtest](../../../../../../research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md); [design-freeze.md](../../../catchup/design-freeze.md) section H; UI-037, UI-013, UI-045, UI-038 (retired), DEC-408, DEC-479, DEC-481, DEC-114, DEC-196 (AREA-069, AREA-050, AREA-095, AREA-078); C2 feature 04
- Evals: ./eval.md
- Screen spec: ./screen-spec.md
- Mockup: ./mockup.html (a Gamewright draft for the Illusionist to replace)
- Risk: Med
- Depends on: its approval.md on main; C3 05 (merged); step 43 (#469) PT-13 DEC and UI-038 retired; step 45 Copy table
- Touches: `apps/bloodtower/src/web/components/board/VirtuePanel.tsx` (new), `apps/bloodtower/src/web/components/board/PartyItemsPanel.tsx` (new), `apps/bloodtower/src/web/components/board/ChanceSpin.tsx` (new), `apps/bloodtower/src/web/components/board/GearBoardPanel.tsx`, `apps/bloodtower/src/web/components/board/CoreStoryBoard.tsx`, `apps/bloodtower/src/web/components/device/gearMenu.ts`, `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx` (the choice list and Spin button), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/engine/loops/group-turn/**` (the turn-start virtue step only), `apps/bloodtower/src/protocols/v2/views.ts`, `apps/bloodtower/src/engine/loops/day/**` and `apps/bloodtower/src/engine/loops/session/gear.ts` (the use-item action and its potion fixture), the host-side action path that drives the use-item flow in the test story (the developer names the file; no new package), `apps/bloodtower/src/e2e/tests/c3-panels.spec.ts` (new), `apps/bloodtower/src/e2e/tests/c3-day.spec.ts` (the `fixme` on EV-15 and EV-16 removed; their split half is built by CU/04)
- Builds: UI-037, UI-013, UI-045; the use-item host action and its potion fixture that C3-11 Ruling 3 left without an owner (Bob, 2026-11-14, adopted, Q7.2)
- Deps change: no
- Runs: cloud

## What it does

PT-13 ruling (design-freeze section H): keep UI-037; retire UI-038; add UI-037, UI-013 and UI-045 to C3 `Builds:`. The gear keeps the single route to using an item (Bob's gear rule: exceptions go through the gear).

- UI-037, the turn-start virtue panel: virtues that fire at a group's turn start are automatic and show on the Story board; the iPad gets a press only when a virtue asks a choice. The choice list is built generic and tested with Infused (DEC-406, asks for a building) (Q7.1).
- UI-013, the party items panel: an on-demand board panel of what the party carries, opened from the gear item "Use a potion or item" (DEC-196, Q7.3). "Current party" keeps its HP, gold and item count. Display only on the board; choices on the iPad.
- The use-item flow (pick a hero, then an item, Done) and the host's use-item action are built here, behind the existing gear item, so the gear stays the single route (Q7.2).
- UI-045, the game of chance: a Spin button on the iPad, the tower's lights chase and stop, the board shows the result (DEC-114 starting purse). The tower gets only a command by `command{capabilityId, params}`, only on the press; nothing spins by itself. With no tower the board shows the result at once and plays the coin sound on the board speakers (Q7.4; DEC-201, DEC-903).
- UI-038 (the iPad "use" icon) is not built. The round picker's Spend and Drink stay with C4 10.

What main does today: no virtue panel, items panel or spin exists. The gear lists "Current party" (a board panel with HP, gold, item count) and "Use a potion or item", greyed with the reason "C3+" (`gearMenu.ts`). C3-11's use-item evals are marked `fixme` ("the host's split and use-item actions go to their own step", `c3-day.spec.ts`). Turn-start virtues are counted in the day roll only (`engine/loops/day/roll.ts`).

The Illusionist's `mockup.html` replaces the Gamewright draft before Bob approves.

## Cutover

Cutover: N

- Nothing dies or is renamed. (UI-038 was never built; step 43 retires its card.)

## Survival invariants

- Continue, restore, and restart must keep:
  - The Menu and any gear panel closed, the game not paused, the toolbar on every iPad, item states recomputed (as C2 feature 04).
  - A spin's result: a purse already set is not re-spun; the draw is seeded, so a replay matches (DEC-114).
  - Virtues in effect for the group, recomputed from the game, not stored on the panel.
  - Nothing physical runs unasked: no spin, light or sound after a restart without a new press.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-15 and EV-16 … EV-20 all pass (verifier table on PR).
- Not required: the round picker's Spend and Drink (C4 10); a use button or icon (UI-038); the Rules and hints pages (CU 09); any specific virtue's effect beyond showing it; the day-loop effects wait and the general test seed hook (queue step 12, #441).

## AREA / DEC checklist

- [ ] PT-13 ruling recorded as a DEC by step 43 (#469); closed before coding.
- [ ] UI-038 retired by step 43 (#469); closed before coding.
- [ ] UI-037: closed before coding (`decided`).
- [ ] UI-013: closed before coding (`decided`).
- [ ] UI-045: closed before coding (`decided`).
- [ ] DEC-408: closed before coding (`decided`).
- [ ] DEC-114: closed before coding (`decided`).
- [ ] DEC-196: closed before coding (`decided`).
- [ ] Rulings Q7.1 to Q7.4 below written into the step-43 DEC; closed before coding. The 1.0 deck's virtue list is confirmed by DEC-934 (Gamewright, 2026-11-15), closed.

## Copy

Exact player-facing text is Loremaster's, step 45. A build fills every `[COPY: ...]` row from the final table, never from the mockup.

| # | Slot | Exact text | Source |
|---|------|------------|--------|
| 1 | `virtue.title` | [COPY: panel title] | Loremaster, step 45 |
| 2 | `virtue.line` | [COPY: one line per virtue, {virtue} and {effect}] | Loremaster; examples in UI-037 |
| 3 | `virtue.choice.prompt` | [COPY: the choice a virtue asks, {virtue}] | Loremaster |
| 4 | `items.title` | [COPY: party items panel title] | Loremaster |
| 5 | `items.empty` | No potions or items to use. | locked 2026-10-31 (Loremaster), the gear reason line in C3 11 |
| 6 | `items.row` | [COPY: {hero}, {item}] | Loremaster |
| 7 | `chance.spin` | Spin | UI-045 and DEC-114 name the button; Loremaster confirms |
| 8 | `chance.result` | [COPY: the amount, {N}] | Loremaster |
| 9 | `chance.notower` | [COPY: result line with no tower] | Loremaster |

## Rulings (Bob, 2026-11-14, adopted)

- Q7.1 Bob, 2026-11-14, adopted: build the virtue choice list generic; test it with Infused (DEC-406, asks for a building). Gamewright, 2026-11-15 (DEC-934): the 1.0 deck is the 8 pool tiles (DEC-581) and Infused is the only turn-start choice; the list stays generic.
- Q7.2 Bob, 2026-11-14, adopted: the use-item host action is built here, behind the existing gear item "Use a potion or item". The host Split goes to CU/04. Queue step 12 (#441) shrinks to the day-loop effects wait and the test seed hook (see catchup/README.md row 12).
- Q7.3 Bob, 2026-11-14, adopted: UI-013 opens from "Use a potion or item"; "Current party" keeps HP, gold and the item count.
- Q7.4 Bob, 2026-11-14, adopted: with no tower the spin shows the result at once on the board and plays the coin sound on the board speakers (DEC-201, DEC-903). With the tower the chase command is sent only on the press.

## Eval approval

- See ./approval.md (must be filled before coding).
