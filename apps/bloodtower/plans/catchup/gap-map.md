# Gap map: main (dc36df3, 2026-11-12) against the locked design

Drafted 2026-11-12 by Gamewright's planning pass (revised the same day for the paper playtest, the rulings patch and Bob's v1.0-first call; v1.0 is the only release planned, 1.1 and 1.2 are parked) from the commit history, the code, the briefs' EV IDs in test files, and `pnpm graph gaps`. "Built" means a merged PR whose test names carry the brief's EV IDs; I did not re-run the suites. "In PR" means open and not on main. Evidence is the PR number or file.

## v1 (release 1.0)

### C2 — session, hub, iPad flow (14 briefs)

| Brief | Status | Evidence |
|---|---|---|
| 01 session start / 02 / 03 / 04 / 05 / 06 | built | #353, #345, #344, #351, #356, #358 |
| 07 Play again and hub | built | #361; `PLAY_AGAIN_TITLE` in `hub.ts`; `c2-play-again.spec.ts` |
| 08 tower lost / reconnect | built | #362, #364; `c2-tower-lost.spec.ts` |
| 09 join and iPad session screens | built | #342; hydration warning is #414 (CU/01) |
| 10 tower setup check | partial | `tower-poc` setup-check page (#349); Bob's tower run is Mon Nov 16 |
| 11 Continue piece check | unbuilt | behind Bob's tower run on Mon Nov 16 (step 58) |
| 12 parked stub | unbuilt | parked |
| 13 iPad corners | parked stub, likely done | Theme B corners #229; ART-080 #366; Gamewright checks it after Bob's run (step 62) |
| 14 dialog border and awake | built | #363 |

### C3 — The Ruined Keep, chapter 1 (17 briefs)

| Brief | Status | Evidence |
|---|---|---|
| 01 chapter and pack format | built | #373 |
| 02 tuning file (DEC-703) | built | #350 |
| 03 The Ruined Keep pack | **unbuilt** | `packs/test/pack.yaml` has `quests: []` and the old day-slice tagline (title already The Ruined Keep via #413). Step 05 |
| 04 day loop | built | #352 |
| 05 events | built | #382 (landed as a work commit; EV IDs present in `event.test.ts`) |
| 06 | built | #378 |
| 07 quests | built | #386 (`quest.test.ts`, `scene.test.ts`) |
| 08 corruption | unbuilt, **unblocked** | Gamewright's rulings DEC-894 to DEC-896 resolve the gate items; its changed eval needs Bob's re-approval (step 13) |
| 09 chapter loop | **in PR #393** | open and clean, head 860e1517; waits for A/B review |
| 10 game end | unbuilt | step 06 |
| 11 day on the board | **in PR #384** | draft, dirty, head 90f4ca18; EV-19 restore fix landed in #391 |
| 12 event scene / 14 quest scene / 15 chapter card / 16 outcome scene / 17 game stats | unbuilt | steps 07 to 11 |
| 13 building menu | unbuilt, blocked by 08 | step 14 |

### C4 — battle and the Tomb (14 briefs), C5 — finale and polish (10 briefs)

All unbuilt. `battle` and `tomb` appear in the repo only in protocol and schema files (`protocols/pack-v2/base.ts`, `server/db/schema.ts`, `protocols/timing.ts`), the pack loader and tuning tests; there is no battle loop, retreat, Tomb crawl, Tower or boss code. C4-05 waits on C3-08. C5-05 art and voice needs Bob's art ticks and the art landing PR; staged art is not on main (`packs/test/assets` holds the four places and the cover only).

### A1 — asset adapter (asset-studio 0.2)

| Step | Status | Evidence |
|---|---|---|
| 1 to 5, 6a, 7, 8 | built | #392, #398, #400, #399, #404, #401, #406, #405 |
| 4c real render of the Ruined Keep | pending | art hold (Bob) |
| 6b | pending Bob | |
| 8b-1 demo pack and job | built | #413 |
| 8b-2 demo playback | **unbuilt** | step 31; brief CU/02 |
| G-A1 | pending Bob | needs the art hold lifted, 4c and 8b-2 |
| 9, 10, G-A1b | release 1.1 | |

### Other open work

- #414 hydration warning on /join: open, brief CU/01, step 03.
- #72 wishlist: open, out of scope.

### 1.0 gap tool (`pnpm graph gaps`)

Main shows **84 gaps** for 1.0: 59 mechanics with no screen, UI piece or cue, 19 AREAs with nothing decided, 3 open Qs (Q-451, Q-452, Q-453), 3 decided rulings no deliverable reaches (DEC-718, DEC-801, DEC-809). Gamewright's triage (DEC-901, in the rulings patch, not yet on main) sorts them: **31 needed for 1.0** (each mapped to a build step), **16 moved to 1.1** (parked), **37 closed** (15 parked mechanics, 3 answered questions, 19 tower catalogue areas settled by DEC-900). After the patch `pnpm graph gaps` reports **15 gaps for 1.0**, all parked mechanics; they close with a one-line fix in `packages/workbench/src/gaps.ts` that skips parked cards (step 59, brief CU/12). The G-1.0 gate (C5-10) needs the list empty. Card counts: DEC 887, Q 451, AREA 123, IDEA 162.

## v1.1 and v1.2: PARKED (Bob 11-12: finish 1.0 before any 1.1 design)

No 1.1 or 1.2 gap map, sizing or planning is kept here. Reference only, from the first draft: on main nothing of the 1.1 rules is built except the flat spell cuts (#381, DEC-801), and `packs/dracula/` is the older five-night pack. 16 gaps moved to 1.1 by the triage and the 1.2 gaps view (15 after the triage) wait with them. When 1.0 ships, 1.1 starts from DEC-785 and DEC-831.

## Playtest findings against main (2026-11-12)

Source: `research/game-design/playtests/2026-11-12-paper-playtest-v1-v1.2.md`. Where I could check the code I say so; the rest is the playtest document's reading of the cards and plans, not re-verified in code. The step column is the queue step in README.md.

| Finding | On main today | Gap | Step |
|---|---|---|---|
| PT-01 | The 1.1 UI cards UI-051, 053, 056, 064 are cards only; nothing is built | **Parked (1.1).** Deferred by Gamewright via Warden; DEC-904 withdrawn | step 42 parked |
| PT-02 | `fallenLimit` in `engine/loops/day/clock.ts` counts buildings with 4 skulls board-wide (checked) | Cards and DEC-044 disagree with the code; no code change | 43, 06, 10 |
| PT-03 | Records and Continue's reopen are unbuilt (C3-10, C3-17) | Overwrite rule not in the C3-10 eval | 06, 11 |
| PT-04, PT-10 | Stats screen and record fields unbuilt | "Best" key, tap counts and active length not in C3-10 or C3-17. PT-05's tower label is parked | 06, 11 |
| PT-06 | P-006 is a no-tower, never-split probe | No per-split-group shift in the tuning file. PT-05 and the P-008 probe are parked (1.1) | 51 |
| PT-07 | The day loop has a simulated drop (`simulated_drop: kingdom_die d4`; checked) and the C2/08 line; the building rule is not in the cards | A rule for which building | 50 |
| PT-08 | C2-11 is an approved brief, unbuilt, behind Bob's tower run on Mon Nov 16 | The brief lists hero minis, skulls, foes and seals only; the 1.0 pieces are added (the Warden, hunters and drums half is parked) | 58 |
| PT-09 | No caravan code (checked: no hits) | Parked by the rulings (DEC-090, UI-064); nothing to build | none |
| PT-13 | No C3 brief builds UI-037, UI-013 or UI-045 | Virtue, items and chance panels unscheduled | 54 |
| PT-15 | The Pick screen is built (C2/05); the board's hero cards are not specified | Hero cards on the board | 55 |
| PT-16 | DEC-571 decided, no brief builds it | Hints, toggle, Rules page | 56 |
| PT-17 | Battle code does not exist; the band exists in #384 (open) | Mark and warning line | 57, 24 |
| PT-18 | `engine/loops/day/regroup.ts` and the daily prompt exist on main (checked); the C3-11 board prompt is in #384; the gear's Split and Rejoin exist (C2/04) | The daily prompt is the exception on the happy path | 51 |
| PT-19 | The move map is built (W7, C2-06); no Back revert or "Fix my position" found | New behaviour | 52 |
| PT-20 | No battle loop yet | Add the timer and "Pick for <hero>" to C4-02 and C4-10 | 17, 25 |
| PT-21 | The chapter loop is in #393 (open); the chapter card screen is unbuilt | Order of the chapter end | 09, 28 |
| PT-22 | No traitor code | 1.1: parked | none |
| PT-23 | W1 chrome and its e2e check pin the centred Back, Replay, Menu trio (per the playtest) | Toolbar order differs from C2/04 | 53 |
| PT-24 | The Enter step "Enable sound", its e2e specs and help text key `enable-sound` are on main | No iPad plays sound (DEC-903): remove the step and its copy; the C2/05 mockup tab goes to Illusionist | 60 |

Gap tool: the playtest adds no counts to `pnpm graph gaps`. The triage is done (see above).
