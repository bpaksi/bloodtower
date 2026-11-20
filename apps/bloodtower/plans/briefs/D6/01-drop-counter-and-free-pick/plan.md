Keep this a checklist; do not write a second design doc.

# Brief: D6 / 01-drop-counter-and-free-pick — One counter of drop nights; Fortunate's free pick with no moves left

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (section "Nov 12 audit fold-in", decision D6; the F2 and F3 rows of the mapping)
- Feature: 01-drop-counter-and-free-pick
- Kind: fix (engine; no new screen state, no new copy)
- Owner: Gamewright (brief, evals); Anvil (build, inspect first)
- Related AREA/docs: issue #503; findings LC-03 and BE-02, fix groups F2 and F3, tests R02 and R03 (schedule part) in [docs/audits/2026-11-12-dark-tower-consolidated-audit.md](../../../../../../docs/audits/2026-11-12-dark-tower-consolidated-audit.md); rulings DEC-912, DEC-913 (#509); DEC-945, DEC-946, DEC-947 (this brief); index [research/game-design/audit-rulings-2026-11-13.md](../../../../../../research/game-design/audit-rulings-2026-11-13.md) section D6
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no new screen state: the cost line's existing "N moves" words with N = 0, the existing greyed row and its fallback line)
- Risk: High (the game clock; restore). Negative and restore evals are included.
- Depends on: its approval.md on main (normal brief approval), including Bob's acceptance of the three superseded approved EVs (AREA / DEC checklist). No step dependency for EV-01 to EV-14. The quest fixtures wait (Follow-up).
- Builds: DEC-912 and DEC-947 (LC-03, F3's core schedules; R03's schedule fixture); DEC-913, DEC-945, DEC-946 (BE-02, F2's free pick; R02); DEC-572's once-per-visit Cleanse (EE-02's half that main lacks)
- Deps change: no
- Runs: cloud

### Touches (checked against main 618a0ff)

**Drop counter (DEC-912, DEC-947)**
- `apps/bloodtower/src/engine/loops/day/clock.ts`: `DayClock` (line ~41) and `blankClock` (~78) gain the saved counter N of counted nights (0 at the start); `restoreClock` (~299) keeps it.
- `apps/bloodtower/src/engine/loops/day/rules.ts`: `dropsThisNight` (~115) takes N, not the calendar night: 1 or 2 heroes drop `dropOneOrTwo` on a due night (solo: odd N; pair: N not a multiple of 4) and 0 otherwise; 3 or 4 heroes as now (`dropThreeOrFourEach` on odd N, `dropThreeOrFourOther` on even N). `daysLeft` (~130) counts from N + 1 per DEC-947: a 0-drop night counts as a day, so the "at least one skull" throws and the `ceil` shortcut for 1 or 2 heroes go. The skull counts stay in the tuning file; the solo and pair pattern is DEC-822's and DEC-824's, coded beside the 3-or-4 pattern.
- `apps/bloodtower/src/engine/loops/day/loop.ts`: `startClose` (~210 to ~221): a won-quest night (the existing `questsWon > 0 && questSkips` branch) leaves N as it is; any other night adds 1 to N, then takes `dropsThisNight(heroes, N)`. The tower prompt and `simulateDrops` already use that one count.
- `apps/bloodtower/src/engine/views/day.ts`: days left (~17) and tonight's drop (~61) read N + 1.
- `apps/bloodtower/src/engine/loops/session/view.ts`: the band's `daysLeft` (~311) reads N + 1 and adds 1 when a quest was won today and `questSkips` holds (DEC-947).

**Free pick and Cleanse (DEC-913, DEC-945, DEC-946, DEC-572)**
- `apps/bloodtower/src/engine/loops/encounter/picks.ts`: `PicksStore` (~84 to ~106) saves, per group, the day of the last free pick taken, the pending free pick's building, and the buildings Cleansed this turn. `movesCost` (~176), `openMenu`'s moves check (~277), `pickGate` (~297) and `applyPick`'s moves line (~359) take 0 moves for a pending free pick (a Rest: count − 1). After a first pick, a group holding Fortunate (`groupVirtueIds`) that has not taken its free pick today gets it pending, unless the pick ended the turn (~374). Any turn end (`endGroupTurn` ~391) clears it. Cleanse is refused for a building already Cleansed this turn; `beginGroupTurn` (~382) clears that list.
- `apps/bloodtower/src/engine/loops/encounter/loop.ts`: `handleEncounterLeave` (~109) ends the pending free pick; the rest-moves bound (~293, `count > movesOf(local)`) allows moves left + 1 while the free pick is pending; Cleanse's refusal uses the existing fallback words.
- `apps/bloodtower/src/engine/loops/encounter/menu.ts`: `costLine` (~139) shows 0 moves while the free pick is pending; `refusalReason` (~157) keeps "No moves left." for 0 moves only when no free pick is pending; the rest-moves choices (~309) run 1 to moves left + 1 then; a Cleansed building's Cleanse row is greyed with "Cleanse is not possible now." (the existing fallback).
- `apps/bloodtower/src/engine/rules/virtues/index.ts`: read only (`groupVirtueIds`, the `fortunate` id). Its line "Fortunate: a second pick today" is unchanged.

**Tests**
- `apps/bloodtower/src/engine/loops/day/dropCounter.test.ts` (new, EV-01 to EV-05, EV-13a); `apps/bloodtower/src/engine/loops/encounter/freePick.test.ts` (new, EV-06 to EV-11, EV-13b).
- Changed, because D6 supersedes their approved numbers (AREA / DEC checklist): `apps/bloodtower/src/engine/loops/day/day.test.ts` "EV-02 drops one skull a night for two heroes…" (~479, the 2-hero line becomes 1,1,1,0) and "EV-04 days left follows the night pattern…" (~527, 2 heroes at supply 12 becomes 15); `apps/bloodtower/src/e2e/tests/c3-day.spec.ts` (~485 to ~494: "24 days left" becomes "31 days left", "23 days left" becomes "30 days left"). `apps/bloodtower/src/engine/views/day.test.ts` only if a fixture uses 1 or 2 heroes on a 0-drop night.
- e2e: `apps/bloodtower/src/e2e/tests/d6-fortunate.spec.ts` (new, EV-12), using `~test-virtue-ids:`, `~test-at:`, `~test-skulls:`, `~test-hp:`, `~test-event:none` and `~test-seat-together`; EV-05's band check runs in the changed `c3-day.spec.ts`.
- Cards: DEC-945, DEC-946, DEC-947 (new, this brief). DEC-912's and DEC-913's card edits were made in #509.

### Overlaps and merge order

- **No F1 overlap in files.** F1 left out EE-01 (the quest turn-end); see Follow-up.
- **OVERLAP D1 (#558): `loops/day/clock.ts`** (D1 adds a loss check after each skull and a general loss read; D6 adds the counter field) **and `loops/day/loop.ts`** (D1: `simulateDrops` and the stops at ~353 and ~479; D6: `startClose` ~210 to ~221). Separate hunks; whichever lands second rebases. **Tests:** D1's `skullLoss.test.ts` fixtures need "2 due skulls"; after D6 that is 3 or 4 heroes on an even N, so if D6 lands first, D1 sets N, not the day number. Both touch `day.test.ts` (D1: the C3/04 EV-05 node assertion, only if needed; D6: the EV-02 and EV-04 tests).
- **No D2 (#559) or D3 (`docs/d3-brief-2026-11-18`) overlap.**
- **OVERLAP D4 (`docs/d4-brief-2026-11-18`):** `loops/day/rules.ts` (D4: `buildingMenu` ~160; D6: ~115 to ~155); `loops/encounter/picks.ts` `openMenu` (D4: the fallen refusal and labels ~247 to ~262; D6: the moves check ~277); `loops/session/view.ts` (D4 ~602; D6 ~311). Separate hunks; whichever lands second rebases.
- **OVERLAP D5 (`docs/d5-brief-2026-11-18`):** `loops/encounter/picks.ts` (D5: the gold lines of `openMenu`, `applyPick`, `livePurse`, `loadLive`, `commitLive`, `endGroupTurn`'s ledger; D6: the moves lines, the store, `beginGroupTurn`, `endGroupTurn`'s clear) and `loops/encounter/menu.ts` (D5: the purse read ~177; D6: `costLine`, `refusalReason`, rest choices). Whichever lands second rebases.
- **Merge order:** independent of F1, D2 and D3. With D1, D4 and D5, any order; the second rebases. F2's EE-02 dispatch half and F3's Long overlay (1.1) are not in D6.

### Follow-up

- **R02's quest fixtures** (a quest taken first: no free pick; a quest taken second: the turn ends after it, DEC-913) cannot run on main: the Quest row is skipped on the iPad menu (`menu.ts` ~182), `handleQuestPick` has no live caller, and a quest pick does not end the turn (DEC-821, EE-01). D6 clears the pending free pick on any turn end, so they need no D6 change. They are a test-only D6 follow-up PR in, or after, the step that makes the quest pick live and end the turn.
- **R02's Inspiring fixture** (the free pick does not heal twice, DEC-548) waits for Inspiring, which main does not build (`rules/virtues` has Infused and Fortunate only). The step that builds Inspiring carries it.

## What it does

1. **One counter N** (DEC-912). A won-quest night drops nothing and leaves N alone; any other night adds 1 to N. Solo: 1 skull on odd N. Pair: 1 skull unless N is a multiple of 4. Three or four heroes: 1 on odd N, 2 on even N.
2. **One due count** goes to the tower's placement prompts, the simulated drop, and the band.
3. **Days left** counts every night from N + 1, a no-drop night included; a quest won today adds tonight (DEC-947).
4. **Fortunate's free pick** (DEC-913, DEC-945): after a first pick at a building, the group may take one more there for no move, even at 0 moves; once a day per group; spent only when taken; a turn end or Leave ends the pending one; gold is still paid.
5. **A free Rest** waives one move; the cost line reads 0 moves while it is pending (DEC-946).
6. **Cleanse once per building per turn** (DEC-572 as DEC-946 reads it): a second press is refused with the existing words.

**Inspect first.** If part of this already conforms, that part lands as tests only. A contradicted rule: stop that case and report it. Do not invent a rule.

**Out of scope** (do not widen): the Long overlay (DEC-826, 1.1); DEC-822's solo +2 fight and +4 hit points, DEC-821's quest turn-end and DEC-827's quest gold (AREA-120's code session); Inspiring; any tuning value; new copy.

## Cutover

Cutover: N

- Nothing dies or is renamed. `dropsThisNight` keeps its name; its second argument becomes N.

## Survival invariants

- Continue, restore, and restart must keep:
  - The counter N; after a restore the next night's drop and the band match an uninterrupted run (EV-13a).
  - The day's free-pick use, the pending free pick and the turn's Cleansed buildings; a restore or replay never grants a second free pick or a second Cleanse (EV-13b).
- The tower is not touched beyond the existing placement prompts.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 to EV-11 pass (verifier table on PR).
- [ ] EV-12 (e2e, Playwright) passes; EV-05's band check passes in `c3-day.spec.ts`.
- [ ] EV-13 (survival) passes.
- [ ] The changed C3/04 and C3/11 tests pass with the new numbers and nothing else in them changes.
- [ ] Anvil's report lists changed files, test commands and results, and any drift found.
- Not required: a physical Tower run; the quest and Inspiring fixtures (Follow-up); new art or copy.

## AREA / DEC checklist

- [ ] DEC-912, DEC-913, DEC-945, DEC-946 and DEC-947 read; this brief follows them.
- [ ] DEC-699, DEC-822, DEC-824, DEC-826 (parked), DEC-564, DEC-686, DEC-305, MEC-034, DEC-399, DEC-548, DEC-572, DEC-468, DEC-821, DEC-477, MEC-036, MEC-075, Q-C3-04 read.
- [ ] **Approved evals superseded (Bob's call).** DEC-824 (Bob) gives a pair a 0-drop night, which these approved EVs predate: C3/04 EV-02 ("2 heroes: 1,1,1,1", becomes 1,1,1,0), C3/04 EV-04 ("days left 12 for 2 heroes", becomes 15), C3/11 EV-02 ("days left 23" after day 1 with 2 heroes, becomes 30). Their eval.md files are not edited. Bob's approval of this eval.md accepts the new numbers and the test changes listed in Touches; if he declines, D6's LC-03 half stops.
- [ ] **DEC-914 cards touched.** D6 builds the drop parts of DEC-822 and DEC-824 as written (provisional, built as written, no number moved). DEC-826's Long overlay stays parked. DEC-913 relies on DEC-821 and changes nothing in it. No Bob lock is reversed.
- [ ] DEC-912's note "check the solo and 3 or 4 hero counts against P-006's script; if a cell moves more than about 3 points, Bob picks (DEC-817)" is for the next probe run; it does not block this build.
- [ ] AREA-120 planned DEC-822 and DEC-824 code for its own session; D6 takes only their drop schedules. The rest stays with AREA-120.

## Open questions

- None open for design. Fortunate's holders, the day's use and gold: DEC-945 (EV-09, EV-10). A free Rest, the cost line, a second Cleanse: DEC-946 (EV-08, EV-11). Days left: DEC-947 (EV-04, EV-05).
- For Wright (sequencing, not design): D6 builds BE-02 and LC-03's core schedules, which the mapping filed under F2 and F3. F2 keeps EE-02's dispatch half (Cleanse is already in `startPick` on main; inspect, test only) and F3 keeps the Long overlay (1.1). EE-01's quest turn-end has no step: the mapping puts it in F1 and F1's brief leaves it out.

## Eval approval

- See ./approval.md (must be filled before coding).
