Keep this a checklist; do not write a second design doc.

# Brief: C2 / 04-ipad-menu-close — The iPad toolbar, the gear Menu and help

Source of truth for the toolbar, gear and help in C2 and C3 (Bob 2026-10-31 10:37 AM ET; Bob 2026-10-31 10:38 AM ET).

> Bob, 2026-10-31 10:37 AM ET: "I iPad screen lost the toolbar at the bottom. On the toolbar is a "setting" (gear). This from here we need options to see current party, game board setup, volume, split party. use potions, .... All UI for these are done on the Story board, but it is started from the iPad settings. I want the happy path to be easy for the players. Exceptions will go through menu"

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

- The bottom toolbar is restored on every iPad screen: "?" at the left, the gear (Menu) at the right. The Menu dialog gains Close and two more ways to close, and its items become the gear list (Bob approved 2026-10-31 10:38). Item actions show as panels on the Story board.

## Survival invariants

- Continue, restore, and restart must keep: the Menu starts closed after a reload or Continue. Closing it never changes game state.
- Continue, restore, and restart must keep: a gear panel open at the restart comes back closed, with the game not paused, the toolbar on every iPad, and every item's enabled state recomputed from the restored game.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 … EV-18 all pass (verifier table on PR).
- In scope: the gear list (Bob approved 2026-10-31 10:38) in the DEC-229 groups (spec "States"); Pause/Resume stays as a direct Table action. Unusable items are greyed with a one-line reason, never hidden (DEC-227); in C2, Split party (shows "Rejoin party" when split) and Use a potion or item show greyed with the reason "C3+".
- Rules (Bob 2026-10-31 10:37 AM ET):
- The bottom toolbar is back on every iPad screen, with the gear (Menu) at its right. The toolbar is iPad chrome: it is not a body button and does not count against "one step, one primary button" (SCR-016).
- The HUD-only iPad lock stays: on the happy path the iPad body shows only the HUD (the current step's line) and its flow buttons. Nothing exceptional sits on the happy path; every exception goes through the gear.
- Each gear action starts on the iPad. The Story board shows the panel's full UI and only displays it (DEC-278 kept). Any choice in the panel is made on the iPad as a simple list of buttons, and the board mirrors each press. The iPad shows "See the Story board", plus the pick buttons when the panel needs a choice, plus Done/Back (resolved Q-GEAR-1 (a); Bob approved Q-GEAR-1 (a), 2026-10-31 6:13–6:14 PM ET)
- An item is enabled only when it works right now. A disabled item shows its reason in one line under it.
- The game pauses while a Story board panel is open and resumes on Done.
- First press wins across iPads: a second iPad's press on the same item or panel while one is open changes nothing.
- Help: a "?" button at the left end of the bottom toolbar, on every iPad screen. It opens a short help sheet on the iPad itself for the current screen: what the screen is and what to do next, from that screen's Loremaster help line (2026-10-31; the Help lines table in C2 feature 04's spec). Close returns to the same screen, unchanged. It is not a gear item, sends nothing to the host, and the game does not pause (Gamewright design, parent-approved 2026-10-31).
- Next-only iPad screens are kept to a minimum (Bob 2026-10-31 10:38 AM ET): a screen whose only action is Next is merged into the next screen or auto-advances when its narration or cue ends (4 s when it has no audio). Next stays only where a player must confirm the physical board.
- Auto-advance (4 s): none in C2.
- The gear list (Bob approved 2026-10-31 10:38):
1. Current party: heroes, HP, gold, items, corruptions and who holds whom.
2. Game board setup: shows the physical setup again and re-runs the piece check.
3. Volume: the Volume 0/1/2 step with Keep/Try another.
4. Split party: one item whose label toggles ("Split party" when together, "Rejoin party" when split).
5. Use a potion or item: pick the hero, then the item.
6. Look up: rules or a card.
7. Change who holds whom.
8. Join another iPad: shows the QR code.
9. Tower: reconnect or play without it.
10. Save and quit: the existing Quit flow (the "Save and quit" confirm, DEC-230).
- Help lines: Loremaster 2026-10-31, in the screen spec's Help lines table (C2 and C3 screens).

## AREA / DEC checklist

- [ ] DEC-707: closed before coding (`decided`, Bob 2026-10-31). Close always ends the dialog; a tap outside and a tap on the gear also close it; closing sends nothing; all three groups show, unusable items greyed.
- [ ] DEC-229: closed before coding (`decided`). Groups: Look up, Table, Leave.
- [ ] DEC-227: closed before coding (`decided`). An item that cannot be used is greyed, never left out.

## Mockup alignment (Bob 2026-10-31: the approved mockup wins)

- The Menu keeps Look up, Join another iPad and Change who holds whom (Bob ruling on Illusionist conflict). The 10:38 gear list replaces the old Look up items: Hero panel → Current party, Items → Use a potion or item; Roll moves into Look up (rules or a card) (resolved Q-GEAR-2 (a); Bob approved Q-GEAR-2 (a), 2026-10-31 6:13–6:14 PM ET).
- The mockup must be redrawn for the toolbar, the gear list and the Story board panel (Illusionist; see /workspace/gear-menu-changes.md).
- DEC-278 (board shows, iPad presses) is kept: gear panels display on the Story board; their picks are iPad buttons the board mirrors (resolved Q-GEAR-1 (a); Bob approved Q-GEAR-1 (a), 2026-10-31 6:13–6:14 PM ET).
- Portrait only; Back on the Quit confirm returns to the open Menu (mockup).
- Escape also closes (EV-07).

## Eval approval

- See ./approval.md (must be filled before coding).
