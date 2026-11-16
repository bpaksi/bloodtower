Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 13-items-panel-and-use-item — The party items panel and the use-item flow (54a)

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: Med
- Split from CU/07 on 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Every EV below keeps its text from CU/07's eval.md (approved blob f6354c58); only the line "Moved from CU/07" and, for EV-12 and EV-13, a "Scope here" line are added. The new eval.md needs Bob's approval row.

## Checks

### EV-05 — Party items panel opens from the gear and shows what is carried
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: UI-013, DEC-196, Q7.3 (Bob, 2026-11-14, adopted): an on-demand board panel opened from the gear item "Use a potion or item".
- Method: playwright
- How: a hero holding a potion and a hero holding an item; open the gear, pick "Use a potion or item"; separately open "Current party".
- Pass evidence: after "Use a potion or item" `[data-panel]` shows each hero's items by name, display only; "Game paused." is shown; Done closes it and the game resumes. "Current party" shows each hero's HP, gold and item count and no item names.
- Fails if: items show without the gear, the panel opens from "Current party" (or "Current party" lists item names, or drops HP, gold or the count), the panel has a button on the board, or the game does not pause.

### EV-06 — Nothing carried: the locked reason
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: the locked line "No potions or items to use." (C3 11, Loremaster).
- Method: playwright
- How: no hero holds an item; open the gear.
- Pass evidence: the entry is disabled with exactly that one reason line and stays visible.
- Fails if: the entry is hidden, enabled, or the words differ.

### EV-07 — Using an item goes through the gear only
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: PT-13 gear rule; DEC-411 timing is not widened; Q7.2 (Bob, 2026-11-14, adopted): the use-item flow is built here.
- Method: playwright
- How: gear "Use a potion or item", pick the hero, pick the potion (from the test story's potion fixture), Done; then look for any other route.
- Pass evidence: the potion is used once, the hero's hit points rise by the tuned amount (`potion_hit_points`), the item is gone from the panel; no other control uses an item.
- Fails if: a second route exists or the item is used twice.

### EV-13 — Unknown values read unavailable
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Scope here: the item name missing (the items panel); the missing amount is checked in 54c.
- Requirement: root CLAUDE.md.
- Method: unit
- How: render the panels with an item name or an amount missing.
- Pass evidence: "unavailable" shows; no 0 or empty line.
- Fails if: a missing value shows as 0.

### EV-17 — The host can use an item
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: Q7.2 (Bob, 2026-11-14, adopted): the use-item host action is built here; `c3-day.spec.ts` EV-15 and EV-16 (use-item half) stop being `fixme`.
- Method: playwright
- How: with the real host and the potion fixture, the host's use-item action picks a hero and the potion; then the same through the iPad gear.
- Pass evidence: both routes give the same result (hit points up by `potion_hit_points`, the item gone, once); the host action goes through the gear's item flow, not a second code path; the `fixme` rows for the use-item half of EV-15 and EV-16 are removed and pass.
- Fails if: the host action bypasses the gear flow, uses the item twice, or the `fixme` rows remain.

### EV-18 — "Current party" keeps its numbers
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: Q7.3: "Current party" keeps HP, gold and the item count.
- Method: playwright
- How: heroes with different HP, gold and 0, 1 and 2 items; open "Current party".
- Pass evidence: each hero's row shows HP, gold and the count (0 shown as 0 held, not blank); no item names; no use button.
- Fails if: the count is dropped or the panel changes with this step.

### EV-19 — Items panel with no item
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: EV-06's locked reason also holds for the panel entry.
- Method: unit
- How: gear model with no item held; read the "Use a potion or item" entry and try to open the panel by a forced act.
- Pass evidence: entry disabled with the exact reason; the forced act is refused with no panel and no error toast.
- Fails if: the panel opens empty.

### EV-20 — The wrong iPad cannot use another group's item
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: Q7.2: the use-item flow applies to the heroes of the acting group only (DEC-411 timing is not widened).
- Method: unit
- How: a hero of a group that is not acting holds a potion; send the use-item act for that hero from the acting group's iPad and from the host.
- Pass evidence: the act is refused; one error logged with its code and shown as a toast; the item and hit points are unchanged.
- Fails if: the potion is used, or the refusal is silent.

### EV-12 — Screenshot matches the mockup
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Scope here: only the items panel on the board (`#items`, board 1920x1080) and its iPad flow; the virtue and chance pairs are 54b and 54c. 2 images here (board items panel, and the iPad item pick).
- Requirement: the three board states and two iPad states are as drawn.
- Method: screenshot
- How: board 1920x1080 at the items panel, compared side by side with `./mockup.html` section `#items`; and iPad 768x1024 at the item pick, taken as a screenshot with no mockup comparison (the mockup has no item-pick state). Two images attached.
- Pass evidence: board pair: named parts present and in the same order (panel title, lines, "Game paused." on the items panel, the toolbar). iPad screenshot: the item and hero pick buttons and the toolbar are shown, with no art.
- Amended 2026-11-16 (Bob, chat: "I approve the CU/13 EV-12 reword to compare only the board pair against the mockup, and take the iPad item pick as a screenshot with no mockup"): the Scope line said 2 images and How said ten; the mockup has no iPad item-pick state.
- Fails if: a part is missing, a panel clips, or the iPad shows art.
