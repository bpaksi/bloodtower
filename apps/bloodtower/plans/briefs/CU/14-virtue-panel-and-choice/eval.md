Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 14-virtue-panel-and-choice — The turn-start virtue panel and the choice list (54b)

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: Med
- Split from CU/07 on 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Every EV below keeps its text from CU/07's eval.md (approved blob f6354c58); only the line "Moved from CU/07" and, for EV-12 and EV-13, a "Scope here" line are added. The new eval.md needs Bob's approval row.

## Checks

### EV-01 — Turn-start virtues show on the board with no press
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: PT-13, UI-037, DEC-408, DEC-479: virtues that fire at turn start are automatic and show on the board.
- Method: playwright
- How: new `c3-panels.spec.ts`; a group holding one automatic virtue starts its turn; board 1920x1080.
- Pass evidence: after the whose-turn banner a `[data-panel="virtue"]` lists that virtue's line; the iPad shows no button for it; the move map opens without any press and the panel is gone.
- Fails if: the panel waits for a Done, the iPad shows a button for an automatic virtue, or the virtue is missing.

### EV-02 — A group with no virtue sees no panel
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: UI-037 is skipped when none applies (MEC-035 .10 to .13).
- Method: playwright
- How: a group with no virtues starts its turn.
- Pass evidence: no `[data-panel="virtue"]`; the turn goes straight to the move map.
- Fails if: an empty panel or an empty list shows.

### EV-03 — A virtue that asks a choice reaches the iPad
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: PT-13: the iPad gets a press only when a virtue asks a choice.
- Method: playwright
- How: a generic fixture virtue that asks a choice with 3 options (Q7.1); the acting group's iPad and another group's iPad. The Infused case is EV-16.
- Pass evidence: the acting group's iPad shows exactly 3 choice buttons; the board names the virtue; the other group's iPad shows none; first press wins and the board mirrors it.
- Fails if: the choice shows on the wrong iPad, a second press changes the result, or the board shows no mirror.

### EV-04 — No use icon and no UI-038 button
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: PT-13: UI-038 is retired; the gear is the single route.
- Method: playwright
- How: on the turn-start, move-map and event screens, search the iPad body and toolbar.
- Pass evidence: no use icon or button outside the gear; the toolbar buttons are only "?", Back, Replay and the gear.
- Fails if: a use button, count badge or glow icon is added to the iPad.

### EV-16 — A choice-asking virtue (Infused) offers the buildings
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: Q7.1 (Bob, 2026-11-14, adopted): the choice list is generic, tested with Infused (DEC-406, asks for a building).
- Method: playwright
- How: the acting group holds Infused; its turn starts; read the iPad and the board; press one building; check the effect and the other iPads.
- Pass evidence: the iPad shows one button per building the Infused text allows (as DEC-406 states), no other button; the board names the virtue and mirrors the pick; the pick is used for Infused; the same list component renders EV-03's fixture without a code change.
- Fails if: the Infused choice is hard-coded outside the generic list, a building outside DEC-406's set is offered, or no button shows.

### EV-12 — Screenshot matches the mockup
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Scope here: only the virtue panel on the board (`#virtue`) and the iPad virtue choice (`#ipad-virtue`); 4 images here (two states of each side as drawn in those sections).
- Requirement: the three board states and two iPad states are as drawn.
- Method: screenshot
- How: board 1920x1080 at the virtue panel, the items panel and the chance result, and iPad 768x1024 at the virtue choice and at Spin; compare each side by side with `./mockup.html` sections `#virtue`, `#items`, `#chance`, `#ipad-virtue`, `#ipad-chance`. Ten images attached.
- Pass evidence: named parts present and in the same order in each pair (panel title, lines, "Game paused." on the items panel, the result line, the choice buttons, Spin, the toolbar).
- Fails if: a part is missing, a panel clips, or the iPad shows art.
