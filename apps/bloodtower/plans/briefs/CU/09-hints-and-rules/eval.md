Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 09-hints-and-rules — First-time hints, a Hints toggle and the Rules group in Look up

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: Med (restore: EV-11 to EV-13)

## Checks

### EV-01 — Hints is a Game settings row, default on, after the engine's rows
- Requirement: PT-16, DEC-571, DEC-639: a "Hints" toggle on Game settings (SCR-008), default on.
- Method: playwright
- How: new `c3-hints.spec.ts`. Reach Game settings for a story with its own options (iPad 768×1024 and board 1920×1080); read the row labels in order and the Hints state; press off, read the board mirror, press on.
- Pass evidence: the Hints row is present with the Copy table's label and two options; "on" is selected before any press; it comes after the engine's three rows and before the story's own; the board mirrors each choice; no new button besides the two options.
- Fails if: no row, default off, the row is missing when the story has four or more settings (`settingLevels` caps at four), or the board does not mirror it.

### EV-02 — Each hint shows once per game
- Requirement: PT-16: the first battle, building visit, event, skull drop and day's end each open with one hint, once per game.
- Method: unit
- How: engine test in `src/engine/hints/`: feed a game's loop-entered events for the five loops, each twice, with Hints on.
- Pass evidence: exactly five hint effects, in the order the loops first appear, each id once; the second entry of any loop yields none.
- Fails if: a hint repeats, fires for a sixth loop, or fires on the loop's second entry because the record is per day or per hero.

### EV-03 — The battle hint triggers off the loop-entered event
- Requirement: Bob, 2026-11-14, adopted: the registry has all five ids, the battle trigger is tested with a synthetic event (battle loop not on main; C4-02 wires it).
- Method: unit
- How: feed a synthetic `battle` loop-entered event to the registry.
- Pass evidence: `hint.first-battle` is emitted once; the registry holds exactly the five ids `hint.first-battle`, `hint.first-building`, `hint.first-event`, `hint.first-skull-drop`, `hint.first-day-end`; an unknown loop id emits none and logs nothing as an error.
- Fails if: the battle hint is hard-wired to a loop that does not exist yet, or an unknown loop throws.

### EV-04 — A hint is a narrator Scroll that ends itself in 4 seconds
- Requirement: PT-16, UI-035, LQ-3 option A (Bob, 2026-11-14, adopted; Loremaster to confirm).
- Method: playwright
- How: with Hints on, reach the first skull drop (or the first event); read the board and iPads; advance a fake clock 3.9 s and then 4.1 s.
- Pass evidence: the board shows one Scroll with exactly the Copy table's `hint.first-skull-drop` text (one sentence, no button), played as a narrator line; both iPads keep their prior screen with no new button; at 3.9 s it is still shown and the loop's first step is not yet on screen (the hint is the loop's first beat); at 4.1 s it is gone and the loop's first step is on screen; the 4 s is the same constant the existing auto-advance reads.
- Fails if: the hint needs a press, ends early or late, shows on an iPad, has more than one sentence, the loop's first step shows under or before the hint, or the loop's step is hidden for good.

### EV-05 — Hints off shows none
- Requirement: PT-16: the toggle switches them off.
- Method: playwright
- How: set Hints off in Game settings, play through the five loops that exist on main.
- Pass evidence: zero hint Scrolls; every loop's own first view appears at once.
- Fails if: any hint shows, or the toggle only hides the Scroll but still waits 4 seconds.

### EV-06 — The Rules group has one page per loop
- Requirement: PT-16, DEC-571, DEC-229: Look up gains a Rules group, one page per loop.
- Method: playwright
- How: in a game, open the gear's Look up on an iPad, open the Rules group, press each row in turn.
- Pass evidence: the group heading and five rows (battle, building, event, skull drop, day's end) with the Copy table's titles; each row opens `[data-panel="look-up"]` on the board with that page's Copy text and 0 `button` elements (DEC-278); Done closes; the iPad shows "See the Story board" while open.
- Fails if: fewer or more rows, a page shows on the iPad, the placeholder "Rules of the tower" or "A sample card" remains in Look up at all (the sample card is dropped), or a page has a board button.

### EV-07 — No story copy is invented
- Requirement: step 45, no waiver: copy comes from the Copy table.
- Method: unit
- How: a test that every hint, setting and Rules string in source equals the Copy table's text in plan.md (the table holds the filled text by build time), and none contains "[COPY".
- Pass evidence: no `[COPY` in `src/`; each slot id resolves to a non-empty string.
- Fails if: a placeholder ships, or a string is written in code but missing from the table.

### EV-08 — Screenshots match the mockup
- Requirement: the three states in ./mockup.html (a Gamewright draft; the Illusionist's replacement wins if it lands first).
- Method: screenshot
- How: screenshot Game settings (board 1920×1080, iPad 768×1024), a hint shown (board) and the Look up Rules list and page (iPad and board); compare side by side with ./mockup.html (`[data-state]` sections settings, hint, rules).
- Pass evidence: named elements present in order: Hints row last of the engine's rows with on selected; one Scroll with no button; Rules group heading with five rows and Done; both images attached.
- Fails if: the toggle is a different control, the hint has a button, or the Rules list is missing its group heading.

### EV-09 — Tower safety and errors
- Requirement: root CLAUDE.md.
- Method: unit
- How: assert that hint and Rules code emit no `command{capabilityId}` and no tower effect; force a missing hint text and a missing Rules page.
- Pass evidence: zero tower commands; a missing string logs an error with its code and shows a toast on the Story board, and the loop still continues.
- Fails if: a hint can reach the tower, or a missing string is skipped silently.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Continue keeps the toggle and the shown set
- Requirement: no repeated hint after Continue or restart.
- Method: playwright
- How: Hints on, see the skull-drop hint, restart the host, Continue, reach another skull drop; then repeat with Hints off.
- Pass evidence: after Continue the Hints value is unchanged; the skull-drop hint does not show again; hints for loops not yet seen still show once; with Hints off none shows.
- Fails if: the shown set or the toggle resets on restart.

### EV-12 — An older checkpoint loads
- Requirement: a save from before this feature must load.
- Method: unit
- How: restore the existing `server/core/fixtures/**` checkpoint taken before this change.
- Pass evidence: it loads with Hints on and nothing shown (decided: Bob, 2026-11-14, adopted); the first hint of each loop still shows once; no error logged.
- Fails if: restore throws, or Hints loads as off or as undefined.

### EV-13 — Play again, the gear and the board pages
- Requirement: DEC-708, DEC-278, C2/04 survival.
- Method: playwright
- How: finish a game, Play again; open a Rules page, restart the host, Continue.
- Pass evidence: Play again keeps the Hints choice and shows each hint once more in the new game; after Continue the gear Menu is closed, `paused: false`, the toolbar on every iPad.
- Fails if: Play again resets the Hints choice or carries the old shown set, or a gear panel comes back open.

### EV-14 — Hints is set at setup only
- Requirement: DEC-571 "at setup"; Bob, 2026-11-14, adopted.
- Method: playwright
- How: after setup, open the gear on an iPad: every panel and the Menu; read for a Hints row or toggle; send a Hints setting action after setup.
- Pass evidence: no Hints control anywhere in the gear; a post-setup Hints action is refused with a logged error code and the value is unchanged.
- Fails if: Hints can be switched mid-game from the gear or by a late action.

### EV-15 — During an art hold the hint is a caption
- Requirement: Bob, 2026-11-14, adopted (Loremaster to confirm): under the art hold the hint is a caption.
- Method: playwright
- How: reach a first-time loop that opens on an art hold (a full-screen visual); read the board for the hint.
- Pass evidence: the hint text shows as a caption under the art with the Copy table's text, with no Scroll element over the art; it ends on the same 4 s rule; the art is not covered.
- Fails if: a Scroll covers the art, the hint is skipped during the hold, or the caption stays past 4 s.

## Assumptions surfaced

- Hints are spoken by the narrator (LQ-3 option A) → decided: Bob, 2026-11-14, adopted; Loremaster to confirm; EV-04, EV-15.
- The loop waits for the hint (the hint is the loop's first beat on the 4 s rule); Hints setup-only; the row sits after the engine's three; Rules pages are the five hint loops; old checkpoint means Hints on and nothing shown; "A sample card" dropped → decided: Bob, 2026-11-14, adopted; EV-04, EV-14, EV-01, EV-06, EV-12.
- The first-battle hint waits on the battle loop → decided: registry ships with all five ids, C4-02 wires `hint.first-battle`; EV-03 tests the registry only.
- PT-16's new DEC is step 43's (#469) and does not exist yet → checklist item in plan.md.
