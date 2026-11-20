Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: F1 / 02-quest-ends-turn — The Quest row on the iPad menu, and a quest pick ends the turn

- Brief: ./plan.md
- Mockup: none
- Risk: Med (turn end, quest progress; restore). Negative and restore evals are included.

All fixtures: the proving-grounds board; the village `N-egans-end` with 0 skulls (menu Rest, Cleanse, Leave); quest defs from `loops/quest/fixtures.ts` (`herald`: "Ask for pay" +10 gold, "Take the job" the item `tomas-map`; quest gold 5 per present hero, DEC-700); "open" means the quest store's marker at the space, this chapter, not done. One group inside the village unless named, its heroes at 0 gold and 4/12 hit points, no corruption. Tests are in `questPick.test.ts` unless named. Source: DEC-821, DEC-948, R01's quest clause.

## Checks

### EV-01 — The Quest row is first while a quest is open
- Requirement: DEC-083, DEC-630, DEC-948, UI-043.
- Method: unit
- How: "EV-01". `herald` open at `N-egans-end`; the group has 2 moves. Read the building model.
- Pass evidence: the options in order are Quest, Rest, Cleanse, Leave. The Quest row's label is exactly "Quest", its detail exactly "1 move", and it is enabled.
- Fails if: Quest is missing, not first, or reads any other label or cost.

### EV-02 — No row without an open quest of this chapter
- Requirement: DEC-948, DEC-083; C3-19 (markers per chapter).
- Method: unit
- How: "EV-02". (a) No marker at the space. (b) A chapter-2 marker at the space while chapter 1 is current (`configureQuests` with `markersByChapter`). (c) `herald` open, then marked done.
- Pass evidence: in all three the options are Rest, Cleanse, Leave only.
- Fails if: a Quest row shows in any case.

### EV-03 — With no move left the row is greyed and the press opens nothing
- Requirement: DEC-948, MEC-036 .8.
- Method: unit
- How: "EV-03". `herald` open; 0 moves. Read the model; press the Quest pick.
- Pass evidence: the Quest row is listed, disabled, reason "No moves left."; the press is refused with "There are not enough moves left for that."; `herald` has no progress; the step is still the menu.
- Fails if: the row is enabled or hidden, or the press opens the quest.

### EV-04 — The pick takes 1 move and opens the quest
- Requirement: DEC-948, DEC-084, MEC-036 .8 and .11.
- Method: unit
- How: "EV-04". `herald` open; 2 moves. Press the Quest pick; read the model.
- Pass evidence: moves 1; `herald` has progress with no option chosen; the step is the quest step; its buttons are exactly "Ask for pay", "Take the job", "Leave", all enabled; the day number and supply are unchanged.
- Fails if: no move or 2 moves are taken, the quest is not opened, or the buttons differ.

### EV-05 — A won quest ends the turn at once, losses once
- Requirement: DEC-821, DEC-948, DEC-149, DEC-472, DEC-700.
- Method: unit
- How: "EV-05". As EV-04, the hero also holds Feral. Press "Ask for pay". Read the model. Then press Leave and let the group's turn close (`resultUp`).
- Pass evidence: `herald` is done; the clock's quests won is 1; `turnHasEnded` is true; moves 0; the hero's sheet gold is 13 (10 + 5 − Feral's 2) after the quest and still 13 after the turn closes; the step is the menu with no Quest row, Rest and Cleanse disabled with "No moves left.", Leave enabled.
- Fails if: the turn goes on with 1 move, any pick is enabled, the gold is not on the sheet, or Feral's loss is taken twice (11).

### EV-06 — Leaving the quest partway is a retreat: the turn ends, the progress stays
- Requirement: DEC-821, DEC-948, DEC-151; R01's quest clause.
- Method: unit
- How: "EV-06". As EV-04 (2 moves). Press the quest step's Leave. Read the model. Then start the group's next turn (`beginGroupTurn`) with 3 moves, open the menu and press Quest.
- Pass evidence: after Leave: `herald` not done, its progress kept; `turnHasEnded` true; moves 0; the step is the menu; the Quest row is listed, disabled, "No moves left."; the group is still inside the building. Next turn: the Quest row is enabled; the press takes 1 move and the quest step shows the same three buttons.
- Fails if: the turn goes on, the progress is dropped or the quest is marked done, or the quest's Leave leaves the building.

### EV-07 — A reward's hero pick, then the turn ends
- Requirement: DEC-653, DEC-948, DEC-821.
- Method: unit
- How: "EV-07". The group is hero-a and hero-b; 2 moves. Quest, then "Take the job". Read the model. Press hero-b.
- Pass evidence: the hero-pick step's prompt is exactly "Who takes the reward?" with exactly two buttons, the two heroes' names, and no Leave; the turn has not ended yet. After the press: hero-b holds `tomas-map`; `herald` done; each hero's gold 5; turn ended, moves 0, back on the menu.
- Fails if: the item goes to anyone else or to no one, the turn ends before the pick, or the prompt differs.

### EV-08 — A third corruption in the quest loses at once
- Requirement: DEC-676, DEC-693, DEC-948.
- Method: unit
- How: "EV-08". A test scene open at the village with one option whose cost is a corruption; the group's only hero holds 2 corruptions and Feral. Quest, the option, then the hero.
- Pass evidence: the game outcome is lost, reason `corruption`; no turn-end loss runs (gold unchanged); no further step or prompt is offered; the quest is not marked done.
- Fails if: the turn-end path runs, a menu is offered again, or the quest pays out.

### EV-09 — The test marker opens a quest, and only with the marker
- Requirement: test seam for EV-10 (TEST ONLY).
- Method: unit
- How: `loops/quest/testSeed.test.ts` "EV-09". Apply (a) `~test-quest:N-egans-end=herald`; (b) a seed with no marker; (c) `~test-quest:N-egans-end=nope`.
- Pass evidence: (a) `openQuestAt(play, "N-egans-end")` is `herald` and its def is the fixture's; (b) nothing in the quest store changes; (c) it throws an error naming `nope`.
- Fails if: (b) changes the store, or (c) is silently ignored.

### EV-10 — End to end: Quest on the iPad, won, the turn spent
- Requirement: DEC-948, DEC-821, DEC-083; the D4 dependency (the Quest row on the iPad when a quest is open).
- Method: playwright
- How: `apps/bloodtower/src/e2e/tests/ee01-quest-pick.spec.ts`, iPad 768x1024 portrait. Seed `ee01~test-event:none~test-at:N-egans-end~test-quest:N-egans-end=herald~test-hp:hero-a=4/12~test-seat-together`. Play to the group's menu at the village. Read the rows; press Quest; read the buttons; press "Ask for pay"; read the rows; press Leave.
- Pass evidence: the first row reads "Quest" with "1 move" and is enabled. After the press, the buttons read exactly "Ask for pay", "Take the job", "Leave". After "Ask for pay", the menu shows Rest and Cleanse disabled with "No moves left.", no Quest row, and Leave enabled. After Leave, the acting group gets no move map again this day.
- Fails if: no Quest row, the press does nothing, the menu after the quest offers an enabled pick or a Quest row, or the group can walk on.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Continue keeps the quest's progress, its result and the spent turn
- Requirement: survival invariants 1 and 2; DEC-675, DEC-151.
- Method: unit
- How: `apps/bloodtower/src/server/core/questSave.test.ts`. Serialize and rehydrate the shell (a) after EV-06's Leave; (b) after EV-05's quest; then in (b) send the "Ask for pay" press again with its old serial.
- Pass evidence: (a) `herald` progress kept and not done; the turn still ended; the menu's Quest row disabled with "No moves left."; on the next turn the quest step shows the same three buttons. (b) `herald` done once; quests won 1; gold 13; no Quest row; the old press is refused ("That press is for a step the building has moved past.") and changes nothing.
- Fails if: the quest store is lost or reset, the quest reopens or pays twice, or the turn is live again.

## Assumptions surfaced
- In a real game no quest marker is open until quests are loaded from the pack (not this step); EV-10 uses the test marker.
- The quest step's buttons are a stand-in drawn by the existing building step layout; C3-14 replaces them with its scene and keeps the turn end.
- "Quest", "1 move", "No moves left.", "Leave", "Who takes the reward?" and "Who takes the corruption?" are existing words; nothing new is written.
