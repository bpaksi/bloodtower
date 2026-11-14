Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 07-virtue-items-chance-panels — The virtue panel, the party items panel and the game of chance

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: Med (tower command on the spin; restore)

## Checks

### EV-01 — Turn-start virtues show on the board with no press
- Requirement: PT-13, UI-037, DEC-408, DEC-479: virtues that fire at turn start are automatic and show on the board.
- Method: playwright
- How: new `c3-panels.spec.ts`; a group holding one automatic virtue starts its turn; board 1920x1080.
- Pass evidence: after the whose-turn banner a `[data-panel="virtue"]` lists that virtue's line; the iPad shows no button for it; the move map opens without any press and the panel is gone.
- Fails if: the panel waits for a Done, the iPad shows a button for an automatic virtue, or the virtue is missing.

### EV-02 — A group with no virtue sees no panel
- Requirement: UI-037 is skipped when none applies (MEC-035 .10 to .13).
- Method: playwright
- How: a group with no virtues starts its turn.
- Pass evidence: no `[data-panel="virtue"]`; the turn goes straight to the move map.
- Fails if: an empty panel or an empty list shows.

### EV-03 — A virtue that asks a choice reaches the iPad
- Requirement: PT-13: the iPad gets a press only when a virtue asks a choice.
- Method: playwright
- How: a generic fixture virtue that asks a choice with 3 options (Q7.1); the acting group's iPad and another group's iPad. The Infused case is EV-16.
- Pass evidence: the acting group's iPad shows exactly 3 choice buttons; the board names the virtue; the other group's iPad shows none; first press wins and the board mirrors it.
- Fails if: the choice shows on the wrong iPad, a second press changes the result, or the board shows no mirror.

### EV-04 — No use icon and no UI-038 button
- Requirement: PT-13: UI-038 is retired; the gear is the single route.
- Method: playwright
- How: on the turn-start, move-map and event screens, search the iPad body and toolbar.
- Pass evidence: no use icon or button outside the gear; the toolbar buttons are only "?", Back, Replay and the gear.
- Fails if: a use button, count badge or glow icon is added to the iPad.

### EV-05 — Party items panel opens from the gear and shows what is carried
- Requirement: UI-013, DEC-196, Q7.3 (Bob, 2026-11-14, adopted): an on-demand board panel opened from the gear item "Use a potion or item".
- Method: playwright
- How: a hero holding a potion and a hero holding an item; open the gear, pick "Use a potion or item"; separately open "Current party".
- Pass evidence: after "Use a potion or item" `[data-panel]` shows each hero's items by name, display only; "Game paused." is shown; Done closes it and the game resumes. "Current party" shows each hero's HP, gold and item count and no item names.
- Fails if: items show without the gear, the panel opens from "Current party" (or "Current party" lists item names, or drops HP, gold or the count), the panel has a button on the board, or the game does not pause.

### EV-06 — Nothing carried: the locked reason
- Requirement: the locked line "No potions or items to use." (C3 11, Loremaster).
- Method: playwright
- How: no hero holds an item; open the gear.
- Pass evidence: the entry is disabled with exactly that one reason line and stays visible.
- Fails if: the entry is hidden, enabled, or the words differ.

### EV-07 — Using an item goes through the gear only
- Requirement: PT-13 gear rule; DEC-411 timing is not widened; Q7.2 (Bob, 2026-11-14, adopted): the use-item flow is built here.
- Method: playwright
- How: gear "Use a potion or item", pick the hero, pick the potion (from the test story's potion fixture), Done; then look for any other route.
- Pass evidence: the potion is used once, the hero's hit points rise by the tuned amount (`potion_hit_points`), the item is gone from the panel; no other control uses an item.
- Fails if: a second route exists or the item is used twice.

### EV-08 — The spin runs only on the press
- Requirement: UI-045, DEC-114; Tower safety: nothing physical happens automatically.
- Method: playwright
- How: the starting-purse step with a tower double; wait 10 s, then press Spin.
- Pass evidence: before the press the double has received no command; after the press exactly one `command{capabilityId, params}` for the light chase and sound; no message carries raw bytes; with the tower linked the board plays no separate coin sound cue (the tower plays it, DEC-114).
- Fails if: the chase starts on arrival, repeats, or a raw-bytes message is sent.

### EV-09 — The seeded draw repeats and the result shows on the board
- Requirement: DEC-114: the draw is seeded; the amount never goes below the floor.
- Method: unit
- How: draw twice with the same seed and once with another; check the floor from `setup.purse_wheel` in the tuning file.
- Pass evidence: same seed gives the same amount; the amount is at least the floor; the board view carries the amount.
- Fails if: the draw is unseeded, below the floor, or hard-coded in the web code.

### EV-10 — Without a tower the spin still gives a result
- Requirement: Q7.4 (Bob, 2026-11-14, adopted): with no tower the board shows the result at once and plays the coin sound on the board speakers (DEC-201, DEC-903); no tower words on the board.
- Method: playwright
- How: play without the tower; press Spin; record the time from the press to the result and the board's audio cue calls.
- Pass evidence: no tower command; the board shows the result in the same frame as the press is handled (no chase animation, no wait); exactly one coin sound cue plays on the board; no "tower" words appear.
- Fails if: the step stalls waiting for the tower or says the tower is missing, a board-only chase runs first, the coin sound plays on the iPad or twice, or no sound plays.

### EV-11 — A second spin cannot overwrite the purse
- Requirement: the purse is set once (DEC-110, DEC-114).
- Method: playwright
- How: press Spin twice quickly on two iPads.
- Pass evidence: one result; the second press changes nothing; the purse equals the shown result.
- Fails if: two spins run or the purse changes after the result.

### EV-12 — Screenshot matches the mockup
- Requirement: the three board states and two iPad states are as drawn.
- Method: screenshot
- How: board 1920x1080 at the virtue panel, the items panel and the chance result, and iPad 768x1024 at the virtue choice and at Spin; compare each side by side with `./mockup.html` sections `#virtue`, `#items`, `#chance`, `#ipad-virtue`, `#ipad-chance`. Ten images attached.
- Pass evidence: named parts present and in the same order in each pair (panel title, lines, "Game paused." on the items panel, the result line, the choice buttons, Spin, the toolbar).
- Fails if: a part is missing, a panel clips, or the iPad shows art.

### EV-13 — Unknown values read unavailable
- Requirement: root CLAUDE.md.
- Method: unit
- How: render the panels with an item name or an amount missing.
- Pass evidence: "unavailable" shows; no 0 or empty line.
- Fails if: a missing value shows as 0.

### EV-16 — A choice-asking virtue (Infused) offers the buildings
- Requirement: Q7.1 (Bob, 2026-11-14, adopted): the choice list is generic, tested with Infused (DEC-406, asks for a building).
- Method: playwright
- How: the acting group holds Infused; its turn starts; read the iPad and the board; press one building; check the effect and the other iPads.
- Pass evidence: the iPad shows one button per building the Infused text allows (as DEC-406 states), no other button; the board names the virtue and mirrors the pick; the pick is used for Infused; the same list component renders EV-03's fixture without a code change.
- Fails if: the Infused choice is hard-coded outside the generic list, a building outside DEC-406's set is offered, or no button shows.

### EV-17 — The host can use an item
- Requirement: Q7.2 (Bob, 2026-11-14, adopted): the use-item host action is built here; `c3-day.spec.ts` EV-15 and EV-16 (use-item half) stop being `fixme`.
- Method: playwright
- How: with the real host and the potion fixture, the host's use-item action picks a hero and the potion; then the same through the iPad gear.
- Pass evidence: both routes give the same result (hit points up by `potion_hit_points`, the item gone, once); the host action goes through the gear's item flow, not a second code path; the `fixme` rows for the use-item half of EV-15 and EV-16 are removed and pass.
- Fails if: the host action bypasses the gear flow, uses the item twice, or the `fixme` rows remain.

### EV-18 — "Current party" keeps its numbers
- Requirement: Q7.3: "Current party" keeps HP, gold and the item count.
- Method: playwright
- How: heroes with different HP, gold and 0, 1 and 2 items; open "Current party".
- Pass evidence: each hero's row shows HP, gold and the count (0 shown as 0 held, not blank); no item names; no use button.
- Fails if: the count is dropped or the panel changes with this step.

### EV-19 — Items panel with no item
- Requirement: EV-06's locked reason also holds for the panel entry.
- Method: unit
- How: gear model with no item held; read the "Use a potion or item" entry and try to open the panel by a forced act.
- Pass evidence: entry disabled with the exact reason; the forced act is refused with no panel and no error toast.
- Fails if: the panel opens empty.

### EV-20 — The wrong iPad cannot use another group's item
- Requirement: Q7.2: the use-item flow applies to the heroes of the acting group only (DEC-411 timing is not widened).
- Method: unit
- How: a hero of a group that is not acting holds a potion; send the use-item act for that hero from the acting group's iPad and from the host.
- Pass evidence: the act is refused; one error logged with its code and shown as a toast; the item and hit points are unchanged.
- Fails if: the potion is used, or the refusal is silent.

## Survival evals (one per survival invariant in plan.md)

### EV-14 — Continue keeps a set purse and closed panels
- Requirement: purse not re-spun; Menu and panel closed; game not paused; toolbar present.
- Method: playwright
- How: spin, restart the host, Continue; open the items panel and restart again.
- Pass evidence: same purse, no second Spin offered; `[data-panel]` absent, `paused: false`; enabled states recomputed.
- Fails if: the spin is offered again, the panel reopens, or the game stays paused.

### EV-15 — A restart runs nothing physical
- Requirement: no automatic physical action after restore.
- Method: playwright
- How: restart mid-spin with a tower double; Continue.
- Pass evidence: the double gets no command until a new press; no sound plays.
- Fails if: the chase resumes or repeats after Continue.

## Assumptions surfaced

- Which virtues ask a choice → generic list tested with Infused (EV-16), Q7.1 (Bob, 2026-11-14, adopted). Gamewright confirms the 1.0 deck list from C3-06.
- The use-item flow and its host action are built here behind the gear (EV-17) → Q7.2 (Bob, 2026-11-14, adopted); the host Split is in CU/04.
- UI-013 opens from "Use a potion or item" (EV-05, EV-18) → Q7.3 (Bob, 2026-11-14, adopted).
- No-tower spin shows the result at once; coin sound on board speakers (EV-10) → Q7.4 (Bob, 2026-11-14, adopted).
