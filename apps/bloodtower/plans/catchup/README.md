# Catch-up plan: from main (dc36df3, Nov 12 2026) to the locked 1.0, with 1.1 and 1.2 outlined

First drafted 2026-11-12 by Gamewright's planning pass for Wright and Bob; **revised the same day for Gamewright's paper playtest** (`research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md`, which Anvil is publishing as its own docs PR). **Planning only.** Bob's build stop of 2026-11-12 6:47 AM ET holds: no coding, no runner jobs, no CloudAgent launches, no merges or reviews on #393, #384 or #414. Nothing here starts until Bob lifts it. This is a docs-only change.

Companion files: [design-freeze.md](design-freeze.md) (what is locked, the playtest rulings and the questions), [gap-map.md](gap-map.md) (main vs the design, and where each playtest finding lands).

## What changed with the playtest

- Gamewright's rulings (PT-01 to PT-23) are design calls and reverse no Bob lock. Warden decided that Loremaster fills the Copy tables before any 1.0 screen builds, with **no waiver**; the C3-08 ruling, the C2-07 play-again text, caravans and the 84-gap triage go to Gamewright.
- **Eight docs steps** (42 to 49, Gamewright and Loremaster, no Cursor) were added. They run in parallel with the runner queue and gate it: PT-01 card rewrite (blocks any build touching UI-051, 053, 056, 064), the DEC cards, the brief amendments and new CU briefs, the Copy tables, the C3-08 ruling, the C2-07 line, the gap triage and the P-008 probe.
- **Nine build steps** were added (50 to 58): seven from the playtest (PT-07, PT-18 with PT-06, PT-19, PT-23, PT-13, PT-15, PT-16, PT-17) and C2-11 (PT-08), which the first queue left out although it is an approved 1.0 brief waiting on Bob's tower run.
- **Seven existing steps grew** (06, 09, 11, 17, 24, 25, 28), by 2.25 weekdays in all, because they now carry PT-02/03/04/05/10, PT-21, PT-20 or PT-17.
- Step numbers are stable ids (issue titles use them). The **Order** column is the build sequence. The first queue's total was 48.75 weekdays; the new total is **65.5**.
- The existing C3/11 brief is not edited while #384 is open. PT-18 and PT-17 land as new steps (51, 57) that wait for #384 to merge.

## How the queue works

- One step at a time per runner, in Order. A step opens only when its depends-on steps are merged, its brief is on main with Bob's approval row, and its gates are clear. A brief whose eval.md changes needs a new approval row from Bob (step 44).
- Warden's order is kept: #393, then #384, then #414 (Nov 12), then the art landing PR, then C3 completion, C4, C5.
- Runner labels: **anvil** = engine, rules, state, review fixes, conflict fixes. **hammer** = screens, packs, assets, small fixes. No label = blocked, no brief yet, or a Gamewright/Loremaster/Bob step.
- Existing C3, C4 and C5 briefs (lint-green, Bob-approved 2026-10-31) are used as they stand except where the playtest amends them. Briefs [CU/01](../briefs/CU/01-join-hydration-guard/plan.md) (#414 fix and guard) and [CU/02](../briefs/CU/02-a1-demo-playback/plan.md) (A1-8b-2) are in this PR with a **Bob PENDING** approval row. CU/03 to CU/10 are **not written yet**; step 44 writes them.
- Reviews follow bt-pr-pipeline: Review A and B on different Cursor models for code PRs; docs, CI, test and pack PRs merge on green with no review. Merges pin the head SHA. Three fix rounds, then `needs-bob`.

## Cursor cost model (read this before trusting the numbers)

Bob's rule: Cursor use per weekday is capped at the even share, **remaining monthly allowance ÷ weekdays left in the cycle**. Never weekends. Work over the day's share waits for the next weekday. I do not know the allowance figure (the usage tool I can reach reports Grok Bot usage, not the Cursor monthly plan), so the unit is the **share-day**: the amount of Cursor work one weekday's cap pays for. Estimates are **uncalibrated**. Re-scale them after the first merged step shows its real use.

| Part | Weekdays |
|---|---|
| Build, risk Low / Med / High | 0.5 / 0.75 / 1.0 |
| Screen step adds | +0.25 |
| Cutover Y | build x 2 |
| Reviews A+B, per round | 0.25 (Low 1 round, Med 1.5, High 2) |
| Docs, pack and art-only PRs, no review | build only |
| Gamewright, Loremaster and Bob steps and gates | 0 Cursor |
| A playtest amendment to an existing step | +0.25 per distinct change (06 got +0.5, 09 got +0.5) |

Rounded up to a quarter day. "Done by" is the cumulative weekday on which the step is expected to finish if one runner works one step at a time at one share-day per weekday; blocked steps keep their slot. Example if D1 = Mon Nov 16: D5 = Nov 20, D20 = Dec 11, D40 = Jan 08, D66 = Feb 15, 2027. Holidays are not removed. A weekday with no Cursor left stays idle; never catch up on weekends.

## Gamewright and Loremaster track (parallel, 0 Cursor)

| Step | What | Owner | Playtest | Issue |
|---|---|---|---|---|
| 42 | Gamewright: rewrite UI-051, UI-053, UI-056 and UI-064 to words plus physical pieces (PT-01), park UI-064 (PT-09) | Gamewright | PT-01, PT-09 | #468 |
| 43 | Gamewright: record the playtest rulings as DEC cards and card edits (PT-02 to PT-23) | Gamewright | PT-02 to PT-10, PT-13, PT-15 to PT-23 | #469 |
| 44 | Gamewright: amend the affected briefs and write the new CU briefs; get Bob's re-approval of changed evals | Gamewright | PT-02 to PT-23 | #470 |
| 45 | Loremaster: fill the Copy tables for every 1.0 screen step, no waiver (and LQ-1 to LQ-7) | Loremaster | PT-16, PT-17, PT-02 (LQ-6) | #471 |
| 46 | Gamewright: rule on C3-08 corruption (EV-07 give action vs DEC-544, old-save compatibility, multi-holder order) | Gamewright | — | #472 |
| 47 | Gamewright: decide the C2-07 play-again text (main has "Play again?" and the EV-14 confirm line) | Gamewright | — | #473 |
| 48 | Gamewright: triage the 84 1.0 gaps (link or park each, with an owner) and close the caravan question | Gamewright | PT-09 | #474 |
| 49 | Gamewright: probe P-008 (tower cell, split policy, forced-concentration run) | Gamewright | PT-05, PT-06, PT-11 | #475 |

Gates they set: **42** blocks any build touching UI-051, 053, 056 or 064 (all 1.1). **43** blocks 44. **44** blocks steps 50 to 57 and the amended steps 06, 09, 11, 17, 24, 25, 28 and 58. **45** blocks every step with [COPY] slots or new copy (06 to 10, 22, 24 to 29, 40, 52, 54 to 57). **46** blocks 13, 14 and 20. **48** blocks 41. **49** sets the final split shift for step 51.

## The runner queue (v1 = release 1.0)

Total: **65.5 Cursor weekdays** for the 50 runner-queue entries (was 48.75). 7.75 of them sit on blocked steps (C3-08, C3-13, C4-05, the C3-11 follow-up, C2-11), so **57.75** could be built once the stop lifts, the docs steps are done and Bob has re-approved the amended evals. Subtotals: C3 completion, the held PRs and the new playtest steps 33.25; C4 19.25; A1 proof and C5 13. New steps 50 to 58 add 14.5; amendments add 2.25.

| Order | Step | Title | Runner | Weekdays | Done by | Playtest | Depends on / gates | Issue |
|---|---|---|---|---|---|---|---|---|
| 1 | 01 | C3-09 chapter loop: A/B review and merge of #393 (head 860e1517) | anvil | 0.5 | D1 | — | Bob lifts the stop; Cursor back | #431 |
| 2 | 02 | C3-11 day on the board: resolve merge conflicts and finish #384 | anvil | 1.5 | D2 | — | #393 merged | #432 |
| 3 | 03 | Join page hydration fix and CI guard (#414) | hammer | 0.75 | D3 | — | none | #414 |
| 4 | 04 | Art and voice landing PR (Dracula batches 1-5, Lenka, cover and glow, C5-05 art and voice) | hammer | 0.25 | D3 | — | C5-05 code follow-up if still open | #433 |
| 5 | 05 | C3-03 The Ruined Keep pack (quests, scenes, items, places) | hammer | 2 | D5 | — | C3-01, C3-02 (merged) | #434 |
| 6 | 50 | PT-07: no-tower skull drop goes to the standing building with the fewest skulls | anvil | 0.75 | D6 | PT-07 | Steps 43, 44; C3-04 (merged) | #476 |
| 7 | 51 | PT-18 and PT-06: Split and Rejoin as queued gear actions; no daily Regroup prompt; per-split-group shift | anvil | 2.25 | D8 | PT-18, PT-06 | Step 02 (#384 merged), steps 43, 44 | #477 |
| 8 | 52 | PT-19: Back undoes a move-map tap until a trigger fires; "Fix my position" gear item | hammer | 1.5 | D10 | PT-19 | Steps 43, 44, 45 | **Gates:** Copy table by Loremaster (step 45), no waiver | #478 |
| 9 | 53 | PT-23: toolbar order, "?" left, Back and Replay centre, gear right | hammer | 1.75 | D12 | PT-23 | Steps 43, 44 | #479 |
| 10 | 06 | C3-10 game end: won or lost, the record and the stats | anvil | 2 | D14 | PT-02, PT-03, PT-04, PT-05, PT-10 | C3-09 merged (#393); C2-08 merged | **Gates:** Copy table by Loremaster (step 45), no waiver; brief amendment and Bob re-approval of the changed eval.md (step 44) | #435 |
| 11 | 07 | C3-12 event scene | hammer | 1 | D15 | — | C3-05 (merged), C2-06 (merged) | **Gates:** Copy table by Loremaster (step 45), no waiver | #436 |
| 12 | 08 | C3-14 quest scene | hammer | 1.5 | D16 | — | C3-07 (merged), C2-06 | **Gates:** Copy table by Loremaster (step 45), no waiver | #437 |
| 13 | 09 | C3-15 chapter card and seal break | hammer | 2 | D18 | PT-21 | C3-09 merged | **Gates:** Copy table by Loremaster (step 45), no waiver; brief amendment and Bob re-approval of the changed eval.md (step 44) | #438 |
| 14 | 10 | C3-16 outcome scene: win or loss | hammer | 1.5 | D20 | PT-02 | C3-10 merged; C2-07 (merged) | **Gates:** Copy table by Loremaster (step 45), no waiver | #439 |
| 15 | 11 | C3-17 game stats | hammer | 1.25 | D21 | PT-03, PT-04, PT-05, PT-10 | C3-16 merged | **Gates:** brief amendment and Bob re-approval of the changed eval.md (step 44) | #440 |
| 16 | 55 | PT-15: hero cards on the Story board during Pick | hammer | 1 | D22 | PT-15 | Steps 43, 44 | **Gates:** Copy table by Loremaster (step 45), no waiver | #481 |
| 17 | 56 | PT-16: DEC-571 first-time hints, a Hints toggle on Game settings and the Rules group in Look up | hammer | 1.75 | D24 | PT-16 | Steps 43, 44, 45 | **Gates:** Copy table by Loremaster (step 45), no waiver | #482 |
| 18 | 54 | PT-13: virtue panel (UI-037), party items panel (UI-013) and game of chance (UI-045) added to C3 | hammer | 2 | D26 | PT-13 | Steps 43, 44, 45; C3-05 (merged) | **Gates:** Copy table by Loremaster (step 45), no waiver | #480 |
| 19 | 57 | PT-17: corruption mark on the edge band's health mark | hammer | 1 | D27 | PT-17 | Step 02 (#384 merged), steps 43, 44, 45 | **Gates:** Copy table by Loremaster (step 45), no waiver | #483 |
| 20 | 12 | C3-11 follow-up: day-loop effects wait, test seed hook, host split/use-item (blocked EVs of #384) | none (blocked) | 1.5 | D28 | — | #384 merged; new brief with Bob approval | #441 |
| 21 | 13 | C3-08 corruption (BLOCKED: unresolved gate items) | none (blocked) | 1.5 | D30 | — | Gamewright ruling on EV-07 give action vs DEC-544, old-save compatibility, multi-holder/Tempted/free-cure order (step 46) | **Gates:** Gamewright ruling (step 46) | #442 |
| 22 | 14 | C3-13 building menu on the iPad | none (blocked) | 1.5 | D31 | — | C3-08 merged | **Gates:** Gamewright ruling (step 46) | #443 |
| 23 | 58 | C2-11 Continue piece check: add every physical piece (PT-08); blocked on Bob's tower run | none (blocked) | 2.5 | D34 | PT-08 | Bob's tower run (C2-10 findings note on main); steps 43, 44 | **Gates:** Bob's tower run; brief amendment and Bob re-approval of the changed eval.md (step 44) | #484 |
| 24 | 15 | G-C3: Bob plays The Ruined Keep to a win and to a loss | Bob | 0 | D34 | — | C3 01-17 | — |
| 25 | 16 | C4-01 tuning switches | anvil | 0.75 | D34 | — | C3-02, C3-09, C3-10 | #444 |
| 26 | 17 | C4-02 battle loop | anvil | 1.75 | D36 | PT-20 | C4-01; step 44 (brief amendment) | #445 |
| 27 | 18 | C4-03 retreat, fall, reward | anvil | 1.25 | D37 | — | C4-02 | #446 |
| 28 | 19 | C4-04 fight in events and scenes | anvil | 1.25 | D39 | — | C4-02, C4-03 | #447 |
| 29 | 20 | C4-05 cursed | none (blocked) | 0.75 | D39 | — | C4-02, C3-08 | **Gates:** Gamewright ruling (step 46) | #448 |
| 30 | 21 | C4-06 the Tomb crawl | anvil | 1.5 | D41 | — | C4-02, C4-03, C3-07 | #449 |
| 31 | 22 | C4-07 chapters 2 and 3 and the seal break | anvil | 1.25 | D42 | — | C4-01, C4-06 | **Gates:** Copy table by Loremaster (step 45), no waiver | #450 |
| 32 | 23 | C4-08 C4 game end | anvil | 1.25 | D43 | — | C4-01, C4-07 | #451 |
| 33 | 24 | C4-09 battle on the board | hammer | 1.75 | D45 | PT-17 | C4-02, C4-05, C3-11 | **Gates:** Copy table by Loremaster (step 45), no waiver; brief amendment and Bob re-approval of the changed eval.md (step 44) | #452 |
| 34 | 25 | C4-10 round picker | hammer | 1.75 | D47 | PT-20 | C4-02, C2-06 | **Gates:** Copy table by Loremaster (step 45), no waiver; brief amendment and Bob re-approval of the changed eval.md (step 44) | #453 |
| 35 | 26 | C4-11 reward and retreat screens | hammer | 1.5 | D48 | — | C4-03, C4-09 | #454 |
| 36 | 27 | C4-12 Tomb screens | hammer | 1.75 | D50 | — | C4-06, C4-09 | #455 |
| 37 | 28 | C4-13 seal break live | hammer | 1.75 | D52 | PT-21 | C4-07, C3-15 | **Gates:** Copy table by Loremaster (step 45), no waiver; brief amendment and Bob re-approval of the changed eval.md (step 44) | #456 |
| 38 | 29 | C4-14 fight buttons | hammer | 1 | D53 | — | C4-04, C3-12, C3-14 | #457 |
| 39 | 30 | G-C4: a battle won, a battle retreated from, the Tomb cleared | Bob | 0 | D53 | — | C4 01-14 | — |
| 40 | 31 | A1-8b-2 demo playback of a packed line | hammer | 1.25 | D54 | — | A1-5, A1-7, A1-8b-1 (merged) | #458 |
| 41 | 32 | C5-01 the Tower loop | anvil | 1.5 | D56 | — | C4-02, C4-03, C4-06 | #459 |
| 42 | 33 | C5-02 the Warden: boss battle | anvil | 1.5 | D57 | — | C5-01 | #460 |
| 43 | 34 | C5-03 the last choice | anvil | 0.75 | D58 | — | C5-02, C3-07 | #461 |
| 44 | 35 | C5-04 the real game end | anvil | 1.25 | D59 | — | C5-01, C5-03, C4-08 | #462 |
| 45 | 36 | C5-05 art and voice through A1 | hammer | 1.25 | D60 | — | A1 plan, C4-09, C4-12; art landing PR; Bob art ticks | #463 |
| 46 | 37 | C5-06 tuning pass | anvil | 0.75 | D61 | — | C5-04 | #464 |
| 47 | 38 | C5-07 Tower screens | hammer | 1.5 | D63 | — | C5-01, C4-12 | #465 |
| 48 | 39 | C5-08 the Warden on screen | hammer | 1.5 | D64 | — | C5-02, C4-09 | #467 |
| 49 | 40 | C5-09 finale and endings on screen | hammer | 1.5 | D66 | — | C5-03, C5-04, C3-16 | **Gates:** Copy table by Loremaster (step 45), no waiver | #466 |
| 50 | 41 | C5-10 G-1.0 gate: gaps zero and the 1.0 playtest | Bob | 0.25 | D66 | — | C5-01 to 09 | — |

Brief paths, kind and notes per step are in the issue for that step. Briefs for the existing steps live at `apps/bloodtower/plans/briefs/C2|C3|C4|C5/<nn>-<name>/` (step 01 #393 = C3/09, step 02 #384 = C3/11, step 03 = CU/01, step 31 = CU/02, step 58 = C2/11; step 04 has no brief: art and pack PRs on lite CI need none). Steps 50 to 57 use CU/03 to CU/10, to be written in step 44.

## Playtest findings to steps

| Finding | Ruling (Gamewright) | Step and issue |
|---|---|---|
| PT-01 blocker | UI-051/053/056/064: words plus physical pieces, no map drawing | 42 #468 (gates any 1.1 build touching them) |
| PT-02 | Fallen-buildings loss is 4 anywhere; new DEC replaces DEC-044. `fallenLimit` already does this | 43 #469; eval and copy in 06 #435 and 10 #439 |
| PT-03 | One record per game id; final outcome overwrites a quit | 06 #435, 11 #440 |
| PT-04 | "Best" keyed by story, length, difficulty, party size | 06, 11 #440 |
| PT-05 | Tower label per record, shown; P-008 tower cell | 06, 11; probe 49 #475 |
| PT-06 | Splitting doubles moves: probe it, -1 move per split group | 51 #477; probe 49 |
| PT-07 | No-tower drop goes to the standing building with fewest skulls | 50 #476 |
| PT-08 | Piece check lists every physical piece | 58 #484 (blocked on Bob's tower run); 1.1 pieces in the 1.1 outline |
| PT-09 | Caravans stay parked (DEC-777 wins; UI-064 parked) | 42 #468, 48 #474 |
| PT-10 | Placeholder evening-length targets; tap counts in the event log | 43 #469; log in 06 #435, stats in 11 #440 |
| PT-13 | Keep UI-037, retire UI-038; add UI-037, 013, 045 to C3 Builds | 43; build 54 #480 |
| PT-15 | Hero cards on the Story board during Pick; copy unchanged | 55 #481 |
| PT-16 | DEC-571 hints and rules page into C3 | 56 #482 |
| PT-17 | Mark plus warning line for a hero one corruption from defeat | band mark 57 #483; warning line and foe-panel mark in 24 #452 |
| PT-18 | Split and Rejoin as queued gear actions; no daily Regroup | 51 #477 (after #384) |
| PT-19 | Back undoes a move-map tap until a trigger; "Fix my position" | 52 #478 |
| PT-20 | Seat silent for 30 s in battle: "Pick for <hero>", default Guard | 17 #445 (loop), 25 #453 (picker) |
| PT-21 | Story first, then one "Set the table" step | 09 #438, 28 #456 |
| PT-22 | Traitor deadline in the first clue and on the threat bar | 1.1 (see outline); no 1.0 step |
| PT-23 | Toolbar: ? left, Back and Replay centre, gear right | 53 #479 |

Not ruled in the list I received and **not scheduled**: PT-11 (forced-concentration run is in probe 49), PT-12 (Goodbye card, 1.1), PT-14 (card drift sweep), PT-24 (needs Bob), PT-25 to PT-28 and the fun items PT-29 to PT-35. The scheduling for these is Gamewright's follow-up.

## Brief-gate audit of what already exists

The C3, C4 and C5 briefs all pass `node scripts/check-briefs.mjs` on main and carry Bob approvals dated 2026-10-31. Left as they stand except where red or amended:

| Finding | Where | Status | Action |
|---|---|---|---|
| Blocked on unresolved decisions | C3/08 | red | Gamewright ruling, step 46 (Warden moved it from Bob). |
| `[COPY]` placeholders with no locked Copy table | C3/10, 12, 14 to 17, C4/07, 13, C5/09 and others | red (was amber) | Warden: no waiver. Loremaster fills the Copy tables, step 45, before the screen builds. |
| Evals changed by the playtest | C3/10, 15, 17; C4/02, 09, 10, 13; C2/11 | amber | Brief edit and Bob's re-approval row, step 44. |
| DEC-549 (release 1.1) listed in a 1.0 brief | C5/02 | amber | Still open (design-freeze question 7). |
| C2/12 and C2/13 parked stubs | C2 | amber | Still open (question 9). |
| "Mockup: none yet" lines that now have a mockup file | several C4, C5 | amber | Tidy in the docs PR that opens each step; no design change. |
| AREA-094, AREA-099 umbrella AREAs still open | C4/12, C3/02 | amber | The specific Q values are answered; not a blocker. |
| TBD hits in C4/03, 06, 12 | C4 | false positive | Historical "[TBD] values filled" notes. |

## Blocked and Bob-run items

- **Stop lifts:** every runner step. #393, #384 and #414 are tracked by issues #431, #432 and #414.
- **Bob:** one line on PT-01 (four bulk-accepted 2026-11-06 cards are amended to restore DEC-189 and DEC-353); PT-24 (does any iPad ever play sound? it decides the "Enable sound" copy Bob locked on 2026-10-31); re-approval rows for the amended evals and for CU/01 and CU/02; the questions in design-freeze.md that are still open (Charon, Lenka's reveal scene, DEC-549, DEC-778/780, C2-10/12/13, #384 finish or split, 1.1 timing).
- **Bob gates:** G-C3, G-C4, G-A1 (needs the art hold lifted, A1-4c render and step 31), C5-10 (G-1.0). Also Bob's tower run that unparks C2-10 and C2-11 (step 58), and Bob ticks every art final in C5-05.
- **Gamewright and Loremaster:** steps 42 to 49.

## 1.1 and 1.2 outline (not brief-gated, no issues filed)

These cannot be briefed yet. For 1.1, DEC-785 and DEC-831 order the work: the deliverables list (AREA-119, open), the numbers (AREA-120, decided), the script (AREA-121, open), then the plan. Sizes are order of magnitude (about +/-50%), in share-days, for planning only.

| Slice | What | Rough size |
|---|---|---|
| 1.1-a | Plan and deliverables: AREA-119 and AREA-121 closed, 1.1 briefs written and eval-approved. Includes the PT-01 UI card rewrite (step 42), a Goodbye card with the teardown list (PT-12), and the P-008 numbers (step 49) | docs only |
| 1.1-b | Rules not built (111 decided 1.1 DECs, 8 AREAs): companions with loyalty (DEC-066, 071), lieutenants and traitor leads (DEC-073, 183), cursed items and corruption effects (DEC-169, 467, 469), glyphs (DEC-597), shared NPC faces (DEC-333 to 348), the 4-treasure limit (DEC-424). Caravans are **out** (PT-09: DEC-777 wins). Already in: flat spell cuts (#381). Adds from the playtest: the traitor deadline in the first clue and on the threat bar (PT-22); the Continue piece check for the Warden, hunters, captain and drums (PT-08, widening step 58) | about 12 engine steps, ~16 weekdays |
| 1.1-c | UI screens (18 UI cards, 5 CUE cards; no map drawing, words and physical pieces per PT-01), the Ruined Keep script through A1 (steps 9 and 10, asset-studio 0.3: talking Portrait, studio camera moves) | about 14 screen and asset steps, ~20 weekdays |
| 1.2-a | Dracula pack: convert `packs/dracula/script.yaml` to the locked groups and the Lenka reveal at `n4-finding-the-tome` (after question 2 is settled) | ~4 weekdays |
| 1.2-b | Dracula-only rules (75 decided 1.2 DECs, 13 AREAs): the Count as a physical piece the table moves (D-04), Lenka as a lost-and-found companion (DEC-741, 746), the wight swap (DEC-751), the five Tomb games (DEC-769 to 773), castle rooms on the Tower's room kinds (DEC-780), the earth box (DEC-779), and their screens. P-007 (Dracula numbers) is specified and unrun | about 8 steps, ~12 weekdays |
| 1.2-c | Dracula art and voice: Lenka under the hood from chapter 1, Charon Loremaster voice, batches 1 to 5 land in the art PR (step 04) | ~4 weekdays plus Bob art ticks |

A full 1.0 to 1.2 run is roughly 65.5 + 36 + 20 = about 121.5 share-days. Treat 1.1 and 1.2 as a range until their briefs exist.
