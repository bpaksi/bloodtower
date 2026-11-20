Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: F1 / 03-live-quests — Quests and chapters live from the story pack in a real game

- Brief: ./plan.md
- Mockup: none
- Risk: Med (game end in real play; restore). Negative and restore evals are included.

All fixtures: the real `packs/` folder on main (`packs/test` is The Ruined Keep, `base_pack: base`, so the board is the proving grounds) loaded with `loadStoryCatalog`; tests read quest ids and spaces from the loaded story and assert them against these values on main: chapter 1 (kingdoms N): `herald` (scene `herald`) at `N-egans-end`, a village, and `ambush` (scene `ambush`) at `N-muted-forest`, wild; chapter 2 (N, E): `barrow` (no scene, a Tomb) at `E-utars-barrows`, `shrine` at `E-greater-tombstones`; chapter 3 (N, E, S, W): `lock` at `S-howling-desert`, `last-stand` at `W-the-grass-sea`. The Herald's options in order: "[COPY: Take the job]" (item `tomas-map`), "[COPY: Ask for pay first]" (10 gold). Base tuning: `c3_end_after_chapter_1: true`, `foe_level_by_chapter` 1 and 1, `seal_break.min` 0. "A real game" is a session built as the host builds it (`createCoreSession` with the catalog's stories and `defaultPlay`) and played from Pick story to the first group turn. F1/02 is merged. Tests are in `server/core/liveQuests.test.ts` unless named. Source: DEC-949, MEC-033, C3-18, C3-19, DEC-948.

## Checks

### EV-01 — The loader gives The Ruined Keep its quests and chapter plan
- Requirement: DEC-949, C3-18, MEC-033, DEC-703.
- Method: unit
- How: `server/core/storyPlay.test.ts` "EV-01". `loadStoryCatalog` on the real `packs/` folder; read each story's `play`.
- Pass evidence: story `test` has `play`. `play.quests.chapters` lists indexes 1, 2, 3 with the six quests above, each with its scene and place as above. `play.quests.scenes` ids are exactly `herald`, `ambush`, `shrine`, `lock`, `last-stand`, `tower-end`. `play.chapters` has `chapters` 1 to 3 with ids `the-roads`, `the-keep`, `the-tower`, kingdoms `[N]`, `[N, E]`, `[N, E, S, W]`, and quests `[{herald, N-egans-end}, {ambush, N-muted-forest}]`, `[{barrow, E-utars-barrows}, {shrine, E-greater-tombstones}]`, `[{lock, S-howling-desert}, {last-stand, W-the-grass-sea}]`; `seals` is `[]`; `c3EndAfterChapter1` is true; `foeLevel` is `{ chapter1: 1, perChapter: 1 }`; `sealBreakMin` is 0. The Dracula door has no `play`.
- Fails if: any field is missing or differs, a number is a literal in code rather than read from `tuning.yaml`, or the Dracula door gets a `play`.

### EV-02 — An unplaced quest is not in its chapter's goal; tuning drives the plan
- Requirement: DEC-949, DEC-703.
- Method: unit
- How: `server/core/storyPlay.test.ts` "EV-02". Copy `packs/` to a temp folder. (a) Remove `ambush`'s `place` in the copy's `test/pack.yaml`. (b) Separately, set the copy's `base/tuning.yaml` `c3_end_after_chapter_1: false` and `foe_level_by_chapter.chapter_1: 2`. Load each.
- Pass evidence: (a) chapter 1's plan quests are exactly `[{herald, N-egans-end}]`; `play.quests` still lists `ambush` with its scene. (b) `c3EndAfterChapter1` is false and `foeLevel.chapter1` is 2.
- Fails if: (a) the plan holds `ambush` or the load fails; (b) the plan keeps the old values.

### EV-03 — When play begins, chapter 1 is entered and its markers are open
- Requirement: DEC-949, C3-19, MEC-033 (enter, start).
- Method: unit
- How: "EV-03". A real game with seed `f103-a`, party of 4, to the first group turn of day 1. Read the quest store and the chapter store.
- Pass evidence: `openQuestAt(play, "N-egans-end")` is `herald`; `openQuestAt(play, "N-muted-forest")` is `ambush`; `openQuestAt` is null at `E-greater-tombstones`, `E-utars-barrows`, `S-howling-desert`, `W-the-grass-sea`. Quest defs are exactly `herald`, `ambush`, `shrine`, `lock`, `last-stand` (no `barrow`). The chapter store's `current` is 1, `entered` is `[1]`, and `outputs` are exactly one cue, one narration and one card for chapter 1, the card with `questsDone` 0, `questsTotal` 2 and kingdoms `["N"]`.
- Fails if: no marker is open, a chapter 2 or 3 marker is open, the chapter store is missing, or enter or start ran twice.

### EV-04 — A story with no pack data plays as main does today
- Requirement: DEC-949; regression.
- Method: unit
- How: "EV-04". A shell from `initialShellState` with `stories: [TEST_STORY]` (no `play`), played to the first group turn.
- Pass evidence: the quest store has no defs and no markers; `tryChapters(play)` is null; the turn offers the same actions as on main.
- Fails if: anything is configured, or the play start throws.

### EV-05 — In a real game the Quest row reaches `handleQuestPick` and plays the pack's Herald
- Requirement: DEC-948, DEC-821, MEC-036 .11, DEC-949.
- Method: unit
- How: "EV-05". A real game with seed `f103-b~test-event:none~test-at:N-egans-end`, party of 1, 3 or more moves. Enter; read the building model; press Quest; read it; press "[COPY: Ask for pay first]".
- Pass evidence: the menu's first row is "Quest" with "1 move", enabled. After the press, the quest step's buttons are exactly "[COPY: Take the job]", "[COPY: Ask for pay first]", "Leave". After the option, `herald` is in the quest store's `done`, its log holds `gold:10`, the day clock counts 1 quest won today, the group's moves are 0 and the menu has no Quest row (F1/02's turn end).
- Fails if: no Quest row, F1/02's fixture labels ("Ask for pay", "Take the job") appear, or the quest is not done.

### EV-06 — Chapter 1's quests done: the game ends won at that day's end
- Requirement: MEC-033 (.11 close), Q-C3-01, DEC-041, DEC-949.
- Method: unit
- How: "EV-06". A real game with seed `f103-c~test-event:none~test-at:N-egans-end`, party of 1. (a) Do the Herald as EV-05; end the day. (b) Then mark `ambush` done (`beginQuest` and `chooseOption(…, "pay-the-toll")` with the group placed at `N-muted-forest` by the engine call; Enter on a wild marker is not built), and end that day.
- Pass evidence: (a) day 2 starts; the game is not over. (b) the game loop's result is outcome `won`, scene `win`, chapter 1; the game record is written once; no day 3 starts; the chapter store's nodes hold no `seal-break` and `skullsToPlace` is 0.
- Fails if: (a) the game ends with one quest done; (b) the game goes on, chapter 2 opens, a seal breaks, or the record is written twice.

### EV-07 — A lost day ends a real game
- Requirement: MEC-033 (.11), DEC-086, DEC-949.
- Method: unit
- How: "EV-07". A real game with seed `f103-d~test-event:none~test-skulls:N-dayside=4,E-duwani=4,S-southern-wastes=4,W-anza=4`; end day 1. Compare with the same seed on a story with no `play` (EV-04's shape, same board).
- Pass evidence: the real game ends: outcome `lost`, reason `buildings`, scene `loss-buildings`, chapter 1; no day 2 starts. The story with no `play` starts day 2 (main's behaviour, kept where no plan exists).
- Fails if: the real game starts day 2, or names another reason.

### EV-08 — F1/02's test marker opens a pack quest on a live game
- Requirement: test seam (TEST ONLY); DEC-949.
- Method: unit
- How: "EV-08". A real game with (a) `~test-quest:N-dayside=shrine`, (b) `~test-quest:N-egans-end=herald`, (c) `~test-quest:N-dayside=nope`.
- Pass evidence: (a) `openQuestAt(play, "N-dayside")` is `shrine`, and the quest defs are still exactly the five pack defs; (b) the Herald's options are the pack's two, not the fixture's; (c) throws an error naming `nope`.
- Fails if: fixture defs replace pack defs, or (c) is ignored.

### EV-09 — A save from before this step plays on as saved
- Requirement: DEC-949; survival invariant 2.
- Method: unit
- How: "EV-09". Rehydrate `server/core/fixtures/pre-c2-05-checkpoint.json` and a checkpoint from a real game with its chapter and quest stores removed; Continue; play to the end of the day.
- Pass evidence: no error; `tryChapters` is null; no quest marker is open; the next day starts.
- Fails if: it throws, or quests or chapters are loaded into it.

### EV-10 — End to end: a real Ruined Keep game, the Herald from the pack, through normal play
- Requirement: DEC-949, DEC-948, DEC-821, C3-19; the D4 and F1/02 follow-up (an open quest with no marker).
- Method: playwright
- How: `apps/bloodtower/src/e2e/tests/f1-03-live-quests.spec.ts`, iPad 768x1024 portrait. Pick The Ruined Keep on Pick story, claim heroes, set up and start as a player does. The seed has **no** `~test-quest:`, `~test-at:`, `~test-skulls:` or `~test-gold:` marker; `~test-event:none` is allowed. The runner picks a party size and seed so a group walks on the move map to Egan's End on day 1 with at least 1 move left, and names them in the spec. Walk there; press Enter; read the rows; press Quest; read the buttons; press "[COPY: Ask for pay first]"; read the rows; press Leave. Save and quit, restart the host, Continue, and play to that group's next turn at Egan's End; press Enter; read the rows.
- Pass evidence: the first row reads "Quest" with "1 move" and is enabled. The buttons read exactly "[COPY: Take the job]", "[COPY: Ask for pay first]", "Leave". After the option, the menu has no Quest row and its picks are disabled with "No moves left."; Leave is enabled. After Continue, the menu at Egan's End has no Quest row; its picks are the village's (Rest, Cleanse).
- Fails if: no Quest row on day 1, any `~test-` marker other than `~test-event:none` is in the seed, the labels are not the pack's, or the Quest row is back after Continue.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Continue mid chapter 1 keeps the chapter, runs nothing twice, and a win still ends the game
- Requirement: survival invariant 1; DEC-675, DEC-151, DEC-949.
- Method: unit
- How: "EV-11". EV-06 (a)'s game after the Herald is done. Serialize and rehydrate the shell; Continue; then do the Ambush as in EV-06 (b) and end the day.
- Pass evidence: after Continue: the chapter store's `current` 1 and `entered` `[1]`; `outputs` the same three as before the save (no second cue, narration or card); `herald` done once; `ambush` still open at `N-muted-forest`. After the Ambush and the day's end: outcome `won`, scene `win`; the record written once.
- Fails if: the chapter store is lost or reset, enter or start runs again, the Herald reopens, or the win does not end the game.

## Assumptions surfaced
- The Ambush is on a wild space; Enter on a wild quest marker (DEC-641) is not built, so EV-06 and EV-11 do the Ambush through engine calls. A real G-C3 win needs that build (plan.md, Open questions).
- The Herald's labels are the pack's `[COPY: ...]` placeholders on main; Loremaster's copy (step 45) replaces them in the pack, and the tests read them from the loaded pack.
- C3/13's `c3-building.spec.ts` moves its village to `E-duwani` (test only); C3/13's eval.md is unchanged.
