Keep this a checklist; do not write a second design doc.

# Brief: F1 / 04-wild-quest-enter — Enter a wild space that holds a live quest marker

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (section "Nov 12 audit fold-in"; proposed in F1/03's open question, assigned by Wright 2026-11-18)
- Feature: 04-wild-quest-enter
- Kind: fix (engine gates, one menu title, one stat guard; no new screen state, no new copy)
- Owner: Gamewright (brief, evals); Anvil (build, inspect first)
- Related AREA/docs: AREA-054; DEC-641 (Bob, 2026-10-30); DEC-951 (this brief); MEC-035, MEC-036; issue to open
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no new screen state: the existing Enter button and the existing building menu with two rows, as DEC-943)
- Risk: Med (turn flow in `group-turn/loop.ts`; the first real win)
- Depends on: its approval.md on main, and **F1/03 merged** (`docs/live-quests-brief-2026-11-18`; it needs F1/02). **It comes after D1 (#558) and D4 (#562) merge, because it edits `group-turn/loop.ts`** at the gates D4 opens and next to the lines D1 may change. It does not start before all four have merged.
- **Goes before G-C3** (Bob's Ruined Keep playthrough, queue order 26): with it, chapter 1 can be won in real play.
- Builds: DEC-641, DEC-951; MEC-035 and MEC-036 Enter "on a wild quest marker"
- Deps change: no
- Runs: cloud

### Touches (checked against main 90fb948)

**Stays out of D1 paths: NO, because** Enter is offered and taken only in `apps/bloodtower/src/engine/loops/group-turn/loop.ts`; a wild marker cannot be entered without changing it. It edits no file under `loops/chapter/**` and does not edit `loops/chapter/chapter.test.ts`. That is why it waits for D1 and D4.

"An open quest marker" below is `openQuestAt(play, spaceId)` (`loops/quest/quest.ts` ~236): the current chapter's marker there, not done. "A place to Enter" is: a standing building, or (D4) a fallen building with an open quest marker, or (this step) a space with no building that has an open quest marker. One predicate holds all three. If D4 built a helper for its case, this step widens it; otherwise this step adds `canEnterHere(play, spaceId)` in `group-turn/loop.ts` and every gate below calls it.

Edited:
- `apps/bloodtower/src/engine/loops/group-turn/loop.ts`
  - `offerMoveMap` (~128) and `offerEnterOrEndTurn` (~155): offer Enter where `canEnterHere` is true.
  - `body` (~225, the landed-with-no-moves offer) and `exit` (~257): keep the turn open for Enter where `canEnterHere` is true.
  - `applyEnter` (~289): accepts a space where `canEnterHere` is true.
  - The walk press (~398): `landedOnBuildingWithNoMoves` is also true on landing with 0 moves on a space where `canEnterHere` is true. The field keeps its name.
  - Lines on main 90fb948; after D1 and D4 the runner re-finds them by function.
- `apps/bloodtower/src/engine/loops/encounter/picks.ts`: `openMenu` (~241): a space with no building and an open quest marker gives exactly `Quest`, `Leave` (the same entries as D4's fallen branch; no Cleanse, `buildingMenu` not called). With no open marker it refuses as now (`unknown-group`).
- `apps/bloodtower/src/engine/loops/encounter/menu.ts`: `buildingNameOf` (~240): a space with no building returns the space's board `name` instead of "Building".
- `apps/bloodtower/src/engine/loops/session/stepShell.ts`: the tally (~212) counts an `enter` toward `buildings` only when the space has a building (DEC-951).

Read only: `loops/quest/quest.ts`, `loops/quest/store.ts`, `loops/encounter/loop.ts` (F1/02's quest step and turn end), `loops/event/state.ts` (`eventEligible` ~105: a wild space draws; unchanged), `loops/session/view.ts` (the Enter label ~132 already reads "Enter" with no building type; `buildPlace` ~608 shows no painting without one; the group's `fallen` flag needs a building), `loops/day/rules.ts`, `web/components/device/CoreDeviceScreen.tsx`, `web/components/device/PlaceMenu.tsx`, `web/components/board/BuildingBoardPanel.tsx`.

Tests:
- `apps/bloodtower/src/engine/loops/group-turn/wildQuest.test.ts` (new, EV-01 to EV-06)
- `apps/bloodtower/src/server/core/wildQuestWin.test.ts` (new, EV-07, EV-08, EV-10)
- Existing `group-turn/loop.test.ts`, `encounter.test.ts`, `building.test.ts`, D4's `fallenQuest.test.ts`, F1/02's `questPick.test.ts`, F1/03's `liveQuests.test.ts` and `playAgain.test.ts` are unchanged and passing.

e2e: `apps/bloodtower/src/e2e/tests/f1-04-chapter-one-win.spec.ts` (new, EV-09).

Cards: DEC-951 (new, this brief).

### Overlaps and merge order

- **DEPENDENCY D1 (#558): `group-turn/loop.ts`.** D1 may swap the `isCorruptionLoss` stops (~192, ~252, ~268) for a general loss read; ~252 sits in `exit`, which this step also edits (~257). **D1 merges first**; this step rebases on it.
- **DEPENDENCY and OVERLAP D4 (#562): `group-turn/loop.ts` (the same five gates, ~128, ~155, ~225, ~257, ~289) and `picks.ts` `openMenu` (~247 to ~262).** **D4 merges first.** This step widens D4's gate to spaces with no building and adds its wild branch next to D4's fallen branch. D4's eval.md is not edited; its EVs must still pass.
- **DEPENDENCY F1/03 (`docs/live-quests-brief-2026-11-18`):** the live Ambush marker and the chapter plan that ends the game. **No file overlap**: F1/03 touches `stepShell.ts` ~761, this step ~212.
- **DEPENDENCY F1/02 (`docs/ee01-brief-2026-11-18`, via F1/03): `picks.ts` `openMenu`, `menu.ts`, `stepShell.ts`.** F1/02's Quest row, quest step and turn end are used as they are. Different hunks (`openMenu`'s quest flag and `menu.ts` ~182, ~66, ~247 against this step's ~241 and ~240).
- **No F1/01 overlap.** The Ambush's Fight option stays hidden while `fight_enabled` is false (`visibleOptions`), as now.
- **OVERLAP D5 (`docs/d5-brief-2026-11-18`): `picks.ts`, `menu.ts`** (D5's purse read ~177 and gold helpers, not `openMenu`'s first lines or `buildingNameOf`). The Ambush's toll is D5's rule (DEC-944: a toll stays with the heroes present); this step only reaches it. Whichever lands second rebases.
- **OVERLAP D6 (`docs/d6-brief-2026-11-18`): `picks.ts`, `menu.ts`** (Fortunate state, `costLine`; different functions). D6's free pick can be a wild quest's pick. Whichever lands second rebases.
- **No C3-14 (#437) file overlap.** C3-14 draws the quest scene; its title source is the menu model's title, which now names the space.
- **No C3/15 (#438) file overlap.** A chapter won in real play now reaches C3/15's close; in C3 the game ends first (Q-C3-01).
- **README:** this step's mapping row sits after TP-04 (clear of F1/02's and F1/03's rows), and G-C3's dependency is in the "Bob gates" line; F1/03 edits G-C3's queue row. No README line is shared.
- **Merge order:** D1, D4, F1/02, F1/03 → this step → G-C3.

## What it does

1. **Enter on a wild quest marker** (DEC-641, DEC-951): while Muted Forest holds the live Ambush, a group there gets Enter, as at a building: at the turn's start, after a walk, and on landing with no moves left.
2. **The menu** is "Quest", then "Leave", titled "Muted Forest". Quest costs 1 move and plays the pack's Ambush; its visible option is the toll. When the quest is done the turn ends (DEC-821, DEC-948) and the space is plain wild again.
3. **Not a building:** no Cleanse, no "Buildings entered" count. The space stays wild for night events.
4. **Chapter 1 can be won in real play:** the Herald and the Ambush done, the day ends, and the game ends won (F1/03).

**Inspect first.** If part of this already conforms, that part lands as tests only. A contradicted rule: stop that case and report it. Do not invent a rule.

**Out of scope** (do not widen): the Tomb's game (C4; the Barrow is a wild marker in chapter 2 with no scene); battle quests (C4); caravans and story tokens (MEC-036's other places); C3-14's quest scene; any change to `loops/chapter/**` or `chapter.test.ts`; any new copy.

## Cutover

Cutover: N

- Nothing dies or is renamed.

## Survival invariants

- Continue, restore, and restart must keep:
  - A group inside a wild marker's menu: after Continue it is still inside, the menu is still Quest, Leave with the same title, and the turn's moves are as saved (EV-10).
  - A wild quest left partway: its progress stays and the space still offers Enter; a done one stays done and offers none (EV-10).
- The tower is not touched.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 to EV-08 pass (verifier table on PR).
- [ ] EV-09 (e2e, Playwright) passes.
- [ ] EV-10 (survival) passes.
- [ ] Anvil's report lists changed files, test commands and results, and any drift found, and confirms no file under `loops/chapter/**` and no `chapter.test.ts` changed.
- Not required: the Tomb; battles; C3-14's screens; a physical Tower run.

## AREA / DEC checklist

- [ ] DEC-641 and DEC-951 read; this brief follows them.
- [ ] MEC-035, MEC-036, DEC-083, DEC-630, DEC-078, DEC-943, DEC-910, DEC-948, DEC-821, DEC-017, DEC-944 read.
- [ ] **DEC-641 is Bob's own decision (2026-10-30)**; it is built as written. DEC-951 only fills in what it leaves unsaid.
- [ ] **DEC-914: DEC-821 is provisional.** The turn end after the Ambush is F1/02's, unchanged.
- [ ] No approved eval.md is edited. D4's EVs and C3/13's EV-10 (a fallen building with no quest is not enterable) still pass.
- [ ] No Bob lock is reversed. DEC-822, 824 and 826 are not touched.
- [ ] No new copy: "Enter", "Quest", "Leave", "1 move", "No moves left." and the space names are existing words or board data. Loremaster has nothing to write.

## Open questions

- None open. The readings DEC-641 leaves: DEC-951 (EV-02, EV-04, EV-05, EV-06).

## Eval approval

- See ./approval.md (must be filled before coding).
