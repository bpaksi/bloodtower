# Catch-up plan: from main (dc36df3, Nov 12 2026) to the locked 1.0 (v1.0 only)

First drafted 2026-11-12 by Gamewright's planning pass for Wright and Bob. Revised the same day three times: for Gamewright's paper playtest, for Bob's answers (finish 1.0 before 1.1; tower run Mon Nov 16) and for the Cursor calibration (Pro+, $60 a month). **Planning only.** Bob's build stop of 2026-11-12 6:47 AM ET holds: no coding, no runner jobs, no CloudAgent launches, no merges or reviews on #393, #384 or #414. Nothing here starts until Bob lifts it. This is a docs-only change.

Companion files: [design-freeze.md](design-freeze.md) (locks, rulings, questions), [gap-map.md](gap-map.md) (main vs the design, and where each playtest finding lands).

## The numbers (v1.0 only)

- **Total: 68.5 plan weekdays** for 52 queue entries. **67** of them are buildable once the stop lifts and the gates clear; **1.5** sit on the one blocked step (the C3-11 follow-up, no brief yet).
- Of the 68.5: **50.875 are runner time** (Claude Code builds, fixes and merges, not Cursor) and **17.625 are Cursor time** (Review A and B on Cursor models, plus the fix-round re-reviews).
- **Projected finish: Thu Feb 18, 2027** (weekday D69), with D1 = Mon Nov 16 and weekdays only. That date assumes one step at a time, with each step's review days in series after its build. If reviews overlap the next build, the runner-only bound is D51 = Mon Jan 25, 2027. Holidays are not removed.
- **Cursor dollars:** 17.625 review weekdays x $2.73 = **$48.12 for all of v1.0**. Per Cursor cycle (22 weekdays, resets on the 12th; I split the schedule into 22-weekday blocks, so the cycle edges are approximate): about **$12.37, $15.95, $16.89 and $2.90**. The peak is $16.89, about 28% of the $60 cycle, so **the plan does not exceed $60 per cycle**. If the runner time also ran on Cursor the plan would need $187.00 (68.5 x $2.73), which is the whole $60 every cycle with no headroom.
- Per-step Cursor cost is in the queue table (column "Cursor"). Subtotals: C3 completion, the held PRs and the new 1.0 playtest steps 36.25 (Cursor 8.625); C4 19.25 (Cursor 5.25); A1 proof and C5 13 (Cursor 3.75).
- Parked, not counted: all 1.1 and 1.2 design and planning (see the end of this file).

## What changed in this pass

- **v1.0 only.** Bob (2026-11-12, via Warden): finish 1.0 before any 1.1 design. The 1.1 and 1.2 outline and its sizing are gone from this plan. Steps and findings tagged 1.1 are parked, not closed. See "Parked".
- **PT-01 deferred to 1.1** (Gamewright, via Warden). DEC-904 is withdrawn from the rulings patch; UI-051, 053 and 056 stay as they are. #468 is parked. PT-05 (tower label, P-008 tower cell), PT-09, PT-22 and the 1.1 half of PT-08 are parked with it; the P-008 probe (#475) is parked.
- **Gamewright's section G rulings are in** (patch `0001-docs-game-design-catch-up-rulings-and-1.0-gap-triage`, DEC-894 to DEC-903, the rulings and gap-triage research notes). Steps 46, 47 and 48 are done by it; C3-08 is unblocked; C5-02 loses DEC-549; the C2/04 and C2/05 briefs lose the iPad "Enable sound" step (new step 60); 84 gaps are triaged to 15 (step 59 closes them).
- **Bob's tower run is Mon Nov 16.** C2-10 is his own time on D1. C2-11 (step 58, #484) and C2-13 (step 62, new, Gamewright) are scheduled behind it and no longer carry a "blocked on Bob's run" status.
- **Cursor calibration** replaces the share-day unit (below).
- Step numbers are stable ids (issue titles use them). The **Order** column is the build sequence.

## How the queue works

- One step at a time per runner, in Order. A step opens only when its depends-on steps are merged, its brief is on main with Bob's approval row, and its gates are clear. A brief whose eval.md changes needs a new approval row from Bob (step 44).
- Warden's order is kept: #393, then #384, then #414, then the art landing PR, then C3 completion, C4, C5.
- Runner labels: **anvil** = engine, rules, state, review fixes, conflict fixes. **hammer** = screens, packs, assets, small fixes. No label = blocked, no brief yet, or a Gamewright/Loremaster/Bob step.
- Existing C3, C4 and C5 briefs (lint-green, Bob-approved 2026-10-31) are used as they stand except where the playtest or the rulings amend them. Briefs [CU/01](../briefs/CU/01-join-hydration-guard/plan.md) (#414 fix and guard) and [CU/02](../briefs/CU/02-a1-demo-playback/plan.md) (A1-8b-2) are in this PR with a **Bob PENDING** approval row. CU/03 to CU/12 are **not written yet**; step 44 writes them.
- Reviews follow bt-pr-pipeline: Review A and B on different Cursor models for code PRs; docs, CI, test and pack PRs merge on green with no review. Merges pin the head SHA. Three fix rounds, then `needs-bob`.

## Cursor cost model (calibrated 2026-11-12)

Bob is on Cursor Pro+, $60 a month, reset Nov 12, 22 weekdays in the cycle, so **one plan weekday = $2.73 of Cursor** ($60 / 22). His rule stands: use per weekday is capped at the even share, **remaining allowance / weekdays left in the cycle**, recomputed each day, never weekends. A day's unused share rolls into the next weekday's figure; a day that runs short waits.

Cursor is used **mainly for the A/B reviews**. The runner (Claude Code) builds on its own subscription. So each step has two parts: runner time (not Cursor) and Cursor review time. Only the second one spends the $60.

| Part | Weekdays | Pays from |
|---|---|---|
| Build, risk Low / Med / High | 0.5 / 0.75 / 1.0 | runner |
| Screen step adds | +0.25 | runner |
| Cutover Y | build x 2 | runner |
| Playtest amendment to an existing step | +0.25 per distinct change | runner |
| Reviews A+B, per round | 0.25 (Low 1 round, Med 1.5, High 2) | **Cursor** ($0.68 a round) |
| Docs, pack and art-only PRs (no review) | build only | runner |
| Gamewright, Loremaster and Bob steps and gates | 0 | neither |

Rounded to a quarter day, except that the Cursor part uses 0.125 steps for Med and 1.5 rounds. The $0.68 per round is an assumption, not a measurement: **re-scale after the first merged step shows its real Cursor use**. If a review round costs 3x that, the peak cycle is still about $50, under $60. "Done by" is the cumulative weekday on which the step is expected to finish with one runner on one step at a time, builds and reviews in series; steps are in Order and a blocked step keeps its slot. Example, D1 = Mon Nov 16: D5 = Nov 20, D20 = Dec 11, D40 = Jan 08, D69 = Feb 18, 2027. A weekday with no Cursor share left stays idle for review; never catch up on weekends.

## Gamewright and Loremaster track (parallel, 0 Cursor)

| Step | What | Owner | Playtest | Issue |
|---|---|---|---|---|
| 43 | Gamewright: record the playtest rulings as DEC cards and card edits (PT-02 to PT-23) | Gamewright | PT-02 to PT-04, PT-06 to PT-08, PT-10, PT-13, PT-15 to PT-21, PT-23 (1.0 parts only) | #469 |
| 44 | Gamewright: amend the affected briefs and write the new CU briefs; get Bob's re-approval of changed evals | Gamewright | PT-02 to PT-04, PT-06 to PT-08, PT-10, PT-13, PT-15 to PT-21, PT-23 (1.0 parts only) | #470 |
| 45 | Loremaster: fill the Copy tables for every 1.0 screen step, no waiver (1.0 questions LQ-2, 3, 5, 6) | Loremaster | PT-16, PT-17, PT-02 (LQ-6) | #471 |
| 46 | DONE: Gamewright: rule on C3-08 corruption (EV-07 give action vs DEC-544, old-save compatibility, multi-holder order) | Gamewright | — | #472 |
| 47 | DONE: Gamewright: decide the C2-07 play-again text (main has "Play again?" and the EV-14 confirm line) | Gamewright | — | #473 |
| 48 | DONE: Gamewright: triage the 84 1.0 gaps (link or park each, with an owner) and close the caravan question | Gamewright | PT-09 | #474 |
| 62 | Gamewright: check C2-13 (iPad corners) against main after Bob's run on Mon Nov 16, then close it or write its brief | Gamewright | — | #489 |

Gates: **43** blocks 44. **44** blocks steps 50 to 57, 59, 60 and the amended steps 06, 09, 11, 13, 17, 24, 25, 28, 33 and 58. **45** blocks every step with [COPY] slots or new copy (06 to 10, 14, 22, 24 to 29, 40, 52, 54 to 57, 60). **62** waits for Bob's run (Mon Nov 16). Done by the rulings patch (so the work is on main once the docs PR with it lands): **46** (C3-08), **47** (C2-07 text) and **48** (gap triage).

## Nov 12 audit fold-in (docs and issues only; Bob via Warden, Nov 13 2026)

Bob's two Dark Tower reviews of Nov 12 are folded into this plan as **docs and issues only**. No runner build, no code, no Cursor. Sources, kept in `docs/audits/`: [2026-11-12-dark-tower-consolidated-audit.md](../../../../docs/audits/2026-11-12-dark-tower-consolidated-audit.md) (30 findings, repair packages F1-F8, decisions D1-D7, tests R01-R09, H01-H03, P01) and [2026-11-12-f1-tomb-to-battle-package.md](../../../../docs/audits/2026-11-12-f1-tomb-to-battle-package.md) (the F1 package, TB-01 to TB-14). The audit itself ran no code, simulation, hardware check or human playtest: treat every "already-decided drift" item as unverified until the code is inspected.

**Sequence rule.** F1 and the rulings D1-D6 go **ahead of** the C4 and C5 loops: #445 (C4-02 battle loop), #446 (C4-03 retreat, fall, reward), #449 (C4-06 Tomb crawl), #459 (C5-01), #460 (C5-02), #461 (C5-03) and #462 (C5-04). They are not new queue steps: no weekdays, runner time or Cursor dollars are added to the totals above until Warden opens F1. The audit's own order stays: D1-D3 and F1/F2 edits in parallel -> sync diagrams -> D6, D4, D5 rulings -> inspect the code and run R01-R09 -> Bob's H01-H03 -> simulations -> human playtests (P01).

### F1: Tomb-to-battle contracts (HELD)

| Item | Status |
|---|---|
| Findings | QD-03 (stance effect applied by both caller and callee), CB-01 (entry effects bypass terminal handling), QD-01 (room cleared after retreat/fall), EE-01 (forced turn end not propagated) |
| Tests | TB-01 to TB-14 and R01 (specified, not run) |
| Gamewright confirmation 1 (Nov 13, 5:50 AM ET) | **Received.** Entry terminal gate routing as written: MEC-038 alone applies the stance once, on a genuine entry; after each entry effect the gate runs game loss first, then foe gone = won, then all fallen = fallen close; no Fight/Retreat, round card or roll after a terminal entry; Continue replays nothing |
| Gamewright confirmation 2 (Nov 13, 5:50 AM ET) | **Received.** **TB-03 is a Gamewright ruling:** a foe killed by Bold never uses its later pre-round ability (Ambush, Fire breath, or any other) |
| Build | **HELD** until Warden relays more. When it opens, one runner inspects the code first; it may end as docs and tests only if the code already conforms |
| Out of scope | Mutual Spines and trap zero/shortfall (D2), skull-loss dispatch (D1), CB-02, CB-03, QD-02, QD-04 |
| Issue | #505 |

### Rulings awaiting Gamewright (D1-D6)

All six are **awaiting Gamewright rulings**. They block the regression tests and the C4/C5 battle work named below. D7 (BE-04, BE-03 derived glyph value) is feature gated and parked with 1.1.

| Decision | Findings | Question | Blocks | Issue |
|---|---|---|---|---|
| D1 (high) | LC-01 | Generic terminal-loss dispatch and unwind outside the existing check | R03 | #499 |
| D2 (high) | QD-05, CB-06 | Trap exact-zero/shortfall recovery; mutual-terminal Spines outcome | R04; #445, #460 | #500 |
| D3 (high) | CB-04, CB-05 | Ward deterministic cancellation; boss-phase live-deck operation | R04; #445, #460 | #501 |
| D4 (high) | QD-06 | Required-marker emergency relocation: destination, bounds, identity and progress, confirmation | R05 | #504 |
| D5 (high) | BE-05 | Absent-hero funding and present-group debit scope | R06 | #502 |
| D6 (before exact tests) | LC-03, BE-02 | Pair counter through quest-win nights; Fortunate free pick versus forced turn-end | F2, F3; R02, R03 | #503 |

### Mapping of the 30 findings into the v1.0 plan

| Finding(s) | Destination | Plan hook |
|---|---|---|
| QD-03, CB-01, QD-01, EE-01 (F1) | **v1.0 now, held.** Two Gamewright confirmations received; inspect the code, then build; TB-01 to TB-14 and R01 | Before #445, #446, #449 (#505) |
| EE-02, BE-02 (F2) | v1.0 after F1; D6 first | Before the encounter-related C4 steps (#507) |
| LC-03 (F3) | v1.0 core schedules after D6; the Long overlay is 1.1 | Day loop, #441 follow-up (#507) |
| CB-02, TP-01 (F4) | v1.0 after F1 | #446, #459 (#507) |
| LC-02, LC-06, TP-03 (F5) | v1.0 | #435 (C3-10), #462 (C5-04) (#507) |
| QD-02, QD-04 (F6) | v1.0 after single stance ownership | #449 (#507) |
| BE-03 base payout (F7) | v1.0; the derived glyph text is parked 1.1 | #437 (#507) |
| LC-01 (D1) | Gamewright rules first (high); drives R03 | #499 |
| QD-05, CB-06 (D2); CB-04, CB-05 (D3) | Gamewright rules; block R04 and the C4/C5 battle work | #500, #501 -> #445, #460 |
| QD-06 (D4), BE-05 (D5) | Gamewright rules; block R05 and R06 | #504, #502 |
| LC-04 | v1.0 verification: R07 fault injection, then Bob's real-Tower run | #484 |
| TP-04, H03 | v1.0 hardware: H01 and H03 on Bob's Monday run | #484, #489 |
| EE-03 | Coverage gap, mainly 1.1. Note only: the P-006 numbers do not prove the omitted mechanics | #475 (parked) |
| BE-01, BE-04, CB-03, TP-02 (F8), D7, glyph part of BE-03, Long overlay, H02 | **Parked to 1.1**, label `parked-1.1` | #506 |
| LC-05 | Withdrawn (DEC-886/D-04 already decide it). Keep a story-specific conformance test | none |

## The runner queue (v1.0)

**Audit gate (Nov 13):** F1 (#505) and the rulings D1-D6 (#499-#504) sit ahead of orders 28 to 46 (#445, #446, #449, #459 to #462). See "Nov 12 audit fold-in" above. Order numbers and totals are unchanged until Warden opens F1.

Columns: **Weekdays** is the step total, **Runner** the build part, **Cursor** the review part in weekdays and dollars at $2.73.

| Order | Step | Title | Runner | Weekdays | Runner part | Cursor | Done by | Playtest | Depends on / gates | Issue |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 01 | C3-09 chapter loop: A/B review and merge of #393 (head 860e1517) | anvil | 0.5 | 0 | 0.5 / $1.36 | D1 | — | Bob lifts the stop; Cursor back | #431 |
| 2 | 02 | C3-11 day on the board: resolve merge conflicts and finish #384 | anvil | 1.5 | 1 | 0.5 / $1.36 | D2 | — | #393 merged | #432 |
| 3 | 03 | Join page hydration fix and CI guard (#414) | hammer | 0.75 | 0.5 | 0.25 / $0.68 | D3 | — | none | #414 |
| 4 | 04 | Art and voice landing PR (Dracula batches 1-5, Lenka, cover and glow, C5-05 art and voice) | hammer | 0.25 | 0.25 | 0 / $0.00 | D3 | — | C5-05 code follow-up if still open | #433 |
| 5 | 59 | Tooling: gaps.ts skips parked cards in the mechanic rule (one line and a test) | hammer | 0.5 | 0.25 | 0.25 / $0.68 | D4 | — | Step 44 (brief CU/12) | #486 |
| 5a | 63 | C3-18 pack v2 schema and lint: quest places, plain scenes, items, endings, DEC-692 and DEC-693 rules (found blocking step 05 on 2026-11-13) | anvil | 1.5 | 1 | 0.5 / $1.36 | D5 | — | C3-01, C3-07 (merged) | issue to open |
| 5b | 64 | C3-19 quest type optional, quest markers per chapter, one quest per space (follow-ups of step 63) | anvil | 1 | 0.75 | 0.25 / $0.68 | D5 | — | Step 63 merged (#514) | issue to open |
| 6 | 05 | C3-03 The Ruined Keep pack (quests, scenes, items, places) | hammer | 2 | 2 | 0 / $0.00 | D6 | — | C3-01, C3-02 (merged); steps 63 and 64 merged | #434 |
| 7 | 50 | PT-07: no-tower skull drop goes to the standing building with the fewest skulls | anvil | 0.75 | 0.5 | 0.25 / $0.68 | D7 | PT-07 | Steps 43, 44; C3-04 (merged) | #476 |
| 8 | 51 | PT-18 and PT-06: Split and Rejoin as queued gear actions; no daily Regroup prompt; per-split-group shift | anvil | 2.25 | 1.875 | 0.375 / $1.02 | D9 | PT-18, PT-06 | Step 02 (#384 merged), steps 43, 44 | #477 |
| 9 | 52 | PT-19: Back undoes a move-map tap until a trigger fires; "Fix my position" gear item | hammer | 1.5 | 1.125 | 0.375 / $1.02 | D10 | PT-19 | Steps 43, 44, 45 | **Gates:** Copy table by Loremaster (step 45), no waiver | #478 |
| 10 | 60 | PT-24: remove the iPad "Enable sound" step from the code and specs; mockup change goes to Illusionist | hammer | 2.5 | 2.125 | 0.375 / $1.02 | D13 | PT-24 | Step 44 (brief CU/11); Loremaster sign-off of the removed strings (step 45) | **Gates:** Bob re-approval of the changed C2/04 and C2/05 evals; Illusionist's mockup change; Loremaster sign-off of the removed strings (step 45) | #490 |
| 11 | 53 | PT-23: toolbar order, "?" left, Back and Replay centre, gear right | hammer | 1.75 | 1.5 | 0.25 / $0.68 | D15 | PT-23 | Steps 43, 44 | #479 |
| 12 | 06 | C3-10 game end: won or lost, the record and the stats | anvil | 1.75 | 1.25 | 0.5 / $1.36 | D16 | PT-02, PT-03, PT-04, PT-10 | C3-09 merged (#393); C2-08 merged | **Gates:** Copy table by Loremaster (step 45), no waiver; brief amendment and Bob re-approval of the changed eval.md (step 44) | #435 |
| 13 | 07 | C3-12 event scene | hammer | 1 | 0.75 | 0.25 / $0.68 | D17 | — | C3-05 (merged), C2-06 (merged) | **Gates:** Copy table by Loremaster (step 45), no waiver | #436 |
| 14 | 08 | C3-14 quest scene | hammer | 1.5 | 1.125 | 0.375 / $1.02 | D19 | — | C3-07 (merged), C2-06 | **Gates:** Copy table by Loremaster (step 45), no waiver | #437 |
| 15 | 09 | C3-15 chapter card and seal break | hammer | 2 | 1.625 | 0.375 / $1.02 | D21 | PT-21 | C3-09 merged | **Gates:** Copy table by Loremaster (step 45), no waiver; brief amendment and Bob re-approval of the changed eval.md (step 44) | #438 |
| 16 | 10 | C3-16 outcome scene: win or loss | hammer | 1.5 | 1.125 | 0.375 / $1.02 | D22 | PT-02 | C3-10 merged; C2-07 (merged) | **Gates:** Copy table by Loremaster (step 45), no waiver | #439 |
| 17 | 11 | C3-17 game stats | hammer | 1.25 | 1 | 0.25 / $0.68 | D24 | PT-03, PT-04, PT-10 | C3-16 merged | **Gates:** brief amendment and Bob re-approval of the changed eval.md (step 44) | #440 |
| 18 | 55 | PT-15: hero cards on the Story board during Pick | hammer | 1 | 0.75 | 0.25 / $0.68 | D25 | PT-15 | Steps 43, 44 | **Gates:** Copy table by Loremaster (step 45), no waiver | #481 |
| 19 | 56 | PT-16: DEC-571 first-time hints, a Hints toggle on Game settings and the Rules group in Look up | hammer | 1.75 | 1.25 | 0.5 / $1.36 | D26 | PT-16 | Steps 43, 44, 45 | **Gates:** Copy table by Loremaster (step 45), no waiver | #482 |
| 20 | 54 | PT-13: virtue panel (UI-037), party items panel (UI-013) and game of chance (UI-045) added to C3 | hammer | 2 | 1.5 | 0.5 / $1.36 | D28 | PT-13 | Steps 43, 44, 45; C3-05 (merged) | **Gates:** Copy table by Loremaster (step 45), no waiver | #480 |
| 21 | 57 | PT-17: corruption mark on the edge band's health mark | hammer | 1 | 0.75 | 0.25 / $0.68 | D29 | PT-17 | Step 02 (#384 merged), steps 43, 44, 45 | **Gates:** Copy table by Loremaster (step 45), no waiver | #483 |
| 22 | 12 | C3-11 follow-up: day-loop effects wait, test seed hook, host split/use-item (blocked EVs of #384) | none (blocked) | 1.5 | 1 | 0.5 / $1.36 | D31 | — | #384 merged; new brief with Bob approval | #441 |
| 23 | 13 | C3-08 corruption (unblocked by DEC-894 to DEC-896) | anvil | 1.75 | 1.25 | 0.5 / $1.36 | D33 | — | Stop lifted; C3-06 and C3-07 merged; Bob's re-approval of the amended eval (EV-11 to EV-13 added; step 44) | **Gates:** Bob re-approval row for the changed eval.md (step 44) | #442 |
| 24 | 14 | C3-13 building menu on the iPad | hammer | 1.5 | 1.125 | 0.375 / $1.02 | D34 | — | Step 13 (C3-08) merged | **Gates:** Copy table by Loremaster (step 45) | #443 |
| 25 | 58 | C2-11 Continue piece check: add every physical piece (PT-08, 1.0 pieces) | anvil | 2.5 | 2 | 0.5 / $1.36 | D37 | PT-08 | Bob's tower run on Mon Nov 16 (C2-10; D1) and its findings note on main; steps 43, 44 | **Gates:** Bob's tower run (dated Mon Nov 16); brief amendment and Bob re-approval of the changed eval.md (step 44) | #484 |
| 26 | 15 | G-C3: Bob plays The Ruined Keep to a win and to a loss | Bob | 0 | 0 | 0 / $0.00 | D37 | — | C3 01-17 | — |
| 27 | 16 | C4-01 tuning switches | anvil | 0.75 | 0.5 | 0.25 / $0.68 | D37 | — | C3-02, C3-09, C3-10 | #444 |
| 28 | 17 | C4-02 battle loop | anvil | 1.75 | 1.25 | 0.5 / $1.36 | D39 | PT-20 | C4-01; step 44 (brief amendment) | #445 |
| 29 | 18 | C4-03 retreat, fall, reward | anvil | 1.25 | 0.875 | 0.375 / $1.02 | D40 | — | C4-02 | #446 |
| 30 | 19 | C4-04 fight in events and scenes | anvil | 1.25 | 0.875 | 0.375 / $1.02 | D42 | — | C4-02, C4-03 | #447 |
| 31 | 20 | C4-05 cursed | anvil | 0.75 | 0.5 | 0.25 / $0.68 | D42 | — | C4-02, step 13 (C3-08) merged | **Gates:** Gamewright ruling (step 46) | #448 |
| 32 | 21 | C4-06 the Tomb crawl | anvil | 1.5 | 1 | 0.5 / $1.36 | D44 | — | C4-02, C4-03, C3-07 | #449 |
| 33 | 22 | C4-07 chapters 2 and 3 and the seal break | anvil | 1.25 | 0.875 | 0.375 / $1.02 | D45 | — | C4-01, C4-06 | **Gates:** Copy table by Loremaster (step 45), no waiver | #450 |
| 34 | 23 | C4-08 C4 game end | anvil | 1.25 | 0.875 | 0.375 / $1.02 | D46 | — | C4-01, C4-07 | #451 |
| 35 | 24 | C4-09 battle on the board | hammer | 1.75 | 1.375 | 0.375 / $1.02 | D48 | PT-17 | C4-02, C4-05, C3-11 | **Gates:** Copy table by Loremaster (step 45), no waiver; brief amendment and Bob re-approval of the changed eval.md (step 44) | #452 |
| 36 | 25 | C4-10 round picker | hammer | 1.75 | 1.375 | 0.375 / $1.02 | D50 | PT-20 | C4-02, C2-06 | **Gates:** Copy table by Loremaster (step 45), no waiver; brief amendment and Bob re-approval of the changed eval.md (step 44) | #453 |
| 37 | 26 | C4-11 reward and retreat screens | hammer | 1.5 | 1.125 | 0.375 / $1.02 | D51 | — | C4-03, C4-09 | #454 |
| 38 | 27 | C4-12 Tomb screens | hammer | 1.75 | 1.25 | 0.5 / $1.36 | D53 | — | C4-06, C4-09 | #455 |
| 39 | 28 | C4-13 seal break live | hammer | 1.75 | 1.375 | 0.375 / $1.02 | D55 | PT-21 | C4-07, C3-15 | **Gates:** Copy table by Loremaster (step 45), no waiver; brief amendment and Bob re-approval of the changed eval.md (step 44) | #456 |
| 40 | 29 | C4-14 fight buttons | hammer | 1 | 0.75 | 0.25 / $0.68 | D56 | — | C4-04, C3-12, C3-14 | #457 |
| 41 | 30 | G-C4: a battle won, a battle retreated from, the Tomb cleared | Bob | 0 | 0 | 0 / $0.00 | D56 | — | C4 01-14 | — |
| 42 | 31 | A1-8b-2 demo playback of a packed line | hammer | 1.25 | 0.875 | 0.375 / $1.02 | D57 | — | A1-5, A1-7, A1-8b-1 (merged) | #458 |
| 43 | 32 | C5-01 the Tower loop | anvil | 1.5 | 1 | 0.5 / $1.36 | D59 | — | C4-02, C4-03, C4-06 | #459 |
| 44 | 33 | C5-02 the Warden: boss battle | anvil | 1.5 | 1 | 0.5 / $1.36 | D60 | — | C5-01 | **Gates:** Bob re-approval row for the changed C5/02 eval | #460 |
| 45 | 34 | C5-03 the last choice | anvil | 0.75 | 0.5 | 0.25 / $0.68 | D61 | — | C5-02, C3-07 | #461 |
| 46 | 35 | C5-04 the real game end | anvil | 1.25 | 0.875 | 0.375 / $1.02 | D62 | — | C5-01, C5-03, C4-08 | #462 |
| 47 | 36 | C5-05 art and voice through A1 | hammer | 1.25 | 0.875 | 0.375 / $1.02 | D63 | — | A1 plan, C4-09, C4-12; art landing PR; Bob art ticks | #463 |
| 48 | 37 | C5-06 tuning pass | anvil | 0.75 | 0.5 | 0.25 / $0.68 | D64 | — | C5-04 | #464 |
| 49 | 38 | C5-07 Tower screens | hammer | 1.5 | 1.125 | 0.375 / $1.02 | D66 | — | C5-01, C4-12 | #465 |
| 50 | 39 | C5-08 the Warden on screen | hammer | 1.5 | 1.125 | 0.375 / $1.02 | D67 | — | C5-02, C4-09 | #467 |
| 51 | 40 | C5-09 finale and endings on screen | hammer | 1.5 | 1.125 | 0.375 / $1.02 | D69 | — | C5-03, C5-04, C3-16 | **Gates:** Copy table by Loremaster (step 45), no waiver | #466 |
| 52 | 41 | C5-10 G-1.0 gate: gaps zero and the 1.0 playtest | Bob | 0.25 | 0.25 | 0 / $0.00 | D69 | — | C5-01 to 09; step 59 (gaps.ts fix) | — |

Briefs for the existing steps live at `apps/bloodtower/plans/briefs/C2|C3|C4|C5/<nn>-<name>/` (step 01 #393 = C3/09, step 02 #384 = C3/11, step 03 = CU/01, step 31 = CU/02, step 58 = C2/11; step 04 has no brief: art and pack PRs on lite CI need none). Steps 50 to 57, 59 and 60 use CU/03 to CU/12, to be written in step 44.

## Playtest findings to steps (1.0 parts only)

| Finding | Ruling (Gamewright) | Step and issue |
|---|---|---|
| PT-02 | Fallen-buildings loss is 4 anywhere; new DEC replaces DEC-044. `fallenLimit` already does this | 43 #469; eval and copy in 06 #435 and 10 #439 |
| PT-03 | One record per game id; final outcome overwrites a quit | 06 #435, 11 #440 |
| PT-04 | "Best" keyed by story, length, difficulty, party size | 06, 11 #440 |
| PT-06 | Splitting doubles moves; -1 move per split group (placeholder) | 51 #477 (the P-008 probe is parked) |
| PT-07 | No-tower drop goes to the standing building with fewest skulls | 50 #476 |
| PT-08 | Piece check lists every physical piece (1.0 pieces only) | 58 #484, behind Bob's run on Mon Nov 16 |
| PT-10 | Placeholder Short and Standard targets; tap counts in the event log | 43 #469; log in 06 #435, stats in 11 #440 |
| PT-13 | Keep UI-037, retire UI-038; add UI-037, 013, 045 to C3 Builds | 43; build 54 #480 |
| PT-15 | Hero cards on the Story board during Pick; copy unchanged | 55 #481 |
| PT-16 | DEC-571 hints and rules page into C3 | 56 #482 |
| PT-17 | Mark plus warning line for a hero one corruption from defeat | band mark 57 #483; warning line and foe-panel mark in 24 #452 |
| PT-18 | Split and Rejoin as queued gear actions; no daily Regroup | 51 #477 (after #384) |
| PT-19 | Back undoes a move-map tap until a trigger; "Fix my position" | 52 #478 |
| PT-20 | Seat silent for 30 s in battle: "Pick for <hero>", default Guard | 17 #445 (loop), 25 #453 (picker) |
| PT-21 | Story first, then one "Set the table" step (1.0 chores only) | 09 #438, 28 #456 |
| PT-23 | Toolbar: ? left, Back and Replay centre, gear right | 53 #479 |
| PT-24 | No iPad plays sound; remove "Enable sound" (DEC-903) | 60 #490 |

Parked with 1.1 (tagged 1.1 in the playtest, or its 1.1 half): PT-01, PT-05, PT-09, PT-22, the Warden, hunters and drums half of PT-08, the Long evening target and the 4-hour warning in PT-10, the glyph and traitor chores in PT-21. Not ruled in the list I received and **not scheduled**: PT-11, PT-12, PT-14, PT-25 to PT-28 and the fun items PT-29 to PT-35.

## Brief-gate audit of what already exists

The C3, C4 and C5 briefs all pass `node scripts/check-briefs.mjs` on main and carry Bob approvals dated 2026-10-31. Left as they stand except where red or amended. Checked again 2026-11-12 on a main checkout with the rulings patch applied to a scratch copy: the amended briefs (C2/04, C2/05, C3/08, C5/02) still lint, and the new CU briefs are written by step 44.

| Finding | Where | Status | Action |
|---|---|---|---|
| Blocked on unresolved decisions | C3/08 | **cleared** | DEC-894 to DEC-896 in the rulings patch. Its changed eval.md needs Bob's re-approval row (step 44). |
| `[COPY]` placeholders with no locked Copy table | C3/10, 12, 14 to 17, C4/07, 13, C5/09 and others | red | Warden: no waiver. Loremaster fills the Copy tables, step 45, before the screen builds. |
| Evals changed by the playtest or the rulings | C2/04, C2/05, C2/11; C3/08, 10, 15, 17; C4/02, 09, 10, 13; C5/02 | amber | Brief edit and Bob's re-approval row, step 44. |
| DEC-549 (release 1.1) listed in a 1.0 brief | C5/02 | **cleared** | Removed by the rulings patch. |
| C2/12 and C2/13 parked stubs | C2 | amber | C2-13 is checked in step 62 after Bob's run; C2-12 stays a parked stub, not scheduled. |
| "Mockup: none yet" lines that now have a mockup file | several C4, C5 | amber | Tidy in the docs PR that opens each step; no design change. |
| AREA-094, AREA-099 umbrella AREAs still open | C4/12, C3/02 | amber | The specific Q values are answered; not a blocker. |
| TBD hits in C4/03, 06, 12 | C4 | false positive | Historical "[TBD] values filled" notes. |

## Blocked and Bob items

- **Stop lifts:** every runner step. #393, #384 and #414 are tracked by issues #431, #432 and #414.
- **Bob's tower run, Mon Nov 16 (D1):** C2-10, his own time. C2-11 (step 58) and C2-13 (step 62) follow it; no blocked status.
- **Bob, open:** re-approval rows for the changed evals and for CU/01 and CU/02 (a batch is fine); the three locks the rulings touch (see design-freeze.md): caravans, Charon's scope, PT-24's removal of locked copy; PT-05's tower label parked (say so if he wants it back in step 06).
- **Bob gates:** G-C3, G-C4, G-A1 (needs the art hold lifted, A1-4c render and step 31), C5-10 (G-1.0). Bob also ticks every art final in C5-05.
- **Gamewright and Loremaster:** steps 43 to 45 and 62.
- **Gamewright, audit rulings:** D1-D6 (#499-#504), awaiting. F1 (#505) is held with both Gamewright confirmations received; Warden decides when it opens.

## Parked: 1.1 after v1.0 (Bob 11-12)

Bob said to finish v1.0 before any 1.1 design, so there is **no 1.1 or 1.2 outline, sizing or planning here**. Nothing in the totals above is 1.1 or 1.2. Parked, with their issues kept open and labelled `parked-1.1`:

| Step | What | Owner | Playtest | Issue |
|---|---|---|---|---|
| 42 | PARKED (1.1): PT-01 UI-051, UI-053, UI-056 and UI-064 rewrite to words plus physical pieces | Gamewright | PT-01, PT-09 | #468 |
| 49 | PARKED (1.1): Gamewright: probe P-008 (tower cell, split policy, forced-concentration run) | Gamewright | PT-05, PT-06, PT-11 | #475 |
| 61 | PARKED (1.2): Loremaster: patch packs/dracula/script.yaml so the gallery cloth is never lifted (Lenka's reveal is at n4) | Loremaster | — | — |
| - | PARKED (1.1): Dark Tower audit items outside v1.0 (BE-01, BE-04, CB-03, TP-02, glyph parts, Long overlay, D7, H02, EE-03) | Gamewright | - | #506 |

Also parked, with no issue: the 1.1 and 1.2 sections of the design freeze and the gap map are reference only; the 16 gaps the triage moved to 1.1 wait with them. When 1.0 ships, 1.1 planning starts from DEC-785 and DEC-831, as the design freeze says.
