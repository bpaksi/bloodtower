Keep this a checklist; do not write a second design doc.

# Brief: F1 / 02-quest-ends-turn — The Quest row on the iPad menu, and a quest pick ends the turn

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (section "Nov 12 audit fold-in"; EE-01 moved out of F1/01 to this step, Wright 2026-11-18)
- Feature: 02-quest-ends-turn
- Kind: fix (engine, one view type line, one save field, one test-only seed marker; no new screen state, no new copy)
- Owner: Gamewright (brief, evals); Anvil (build, inspect first)
- Related AREA/docs: finding EE-01 (fix group F1) and the quest clause of test R01 in [docs/audits/2026-11-12-dark-tower-consolidated-audit.md](../../../../../../docs/audits/2026-11-12-dark-tower-consolidated-audit.md); DEC-821 (provisional, DEC-914); DEC-948 (this brief); issue #505 (F1) follow-up, its own issue to open
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no new screen state: the existing building menu with one more row, and its existing step layout for the quest's buttons)
- Risk: Med (turn end, quest progress; restore)
- Depends on: its approval.md on main (normal brief approval). No step dependency: everything it changes is on main at e27b981. **Goes ahead of D4** (#504, PR #562), which builds on its Quest row and quest source.
- Builds: DEC-821, DEC-948 (EE-01; R01's quest clause); C3/13's "the quest marker first" (UI-043, DEC-083, DEC-630), which C3/13 left out (its EV-05 amendment, Bob 2026-11-17)
- Deps change: no
- Runs: cloud

### Touches (checked against main e27b981)

**Stays out of D1 paths: YES.** It edits no file under `apps/bloodtower/src/engine/loops/chapter/**`, does not edit `apps/bloodtower/src/engine/loops/group-turn/loop.ts`, and does not edit `apps/bloodtower/src/engine/loops/chapter/chapter.test.ts`. The turn end reuses Uncertain's path, which `group-turn/loop.ts` already handles: `turnHasEnded` (~208), and `resultUp` runs the turn-end losses once (~265). The new test marker is read in a new `loops/quest/` file, not in `loops/chapter/playState.ts`. If the build finds that `group-turn/loop.ts` must change, it stops and reports. It does not widen into that file.

Main today, observed: no live caller loads quests or a chapter plan (`configureQuestsFromPack` and `configureChapters` are called only from tests); `handleQuestPick` (`loops/encounter/loop.ts` ~351) has no caller outside tests; and the quest store is not in the checkpoint. So in a real game no quest marker is open yet. Making quests live from the pack is not this step. Here the row and the turn end are built and proved with a test-only marker.

Edited:
- `apps/bloodtower/src/engine/loops/encounter/picks.ts`
  - `openMenu` (~241). Its quest flag (~254) reads the quest store's open marker for the space (`ensureQuests(play).bySpace` and not `done`, as `openQuestAt` reads it; import `quest/store.ts`, not `quest.ts`, which imports `picks.ts`). The Quest entry is `disabled` when the group has fewer than 1 move (~258).
  - `setQuestMarker` (~228) writes that same store, so the existing `encounter.test.ts` calls keep working. `PicksStore.quests` (~85) goes.
  - A quest-pick helper takes 1 move. A turn-end helper sets moves to 0 and calls `endGroupTurn` (~391), the same path as Uncertain (~374).
  - `commitLive` (~476) also writes a net gold gain to the present heroes' sheets (DEC-178, odd coin by DEC-646), so the quest's gold reaches the sheets.
- `apps/bloodtower/src/engine/loops/encounter/menu.ts`
  - The skip at ~182 becomes the Quest row: label "Quest", cost line "1 move" (the `plural` words), greyed with "No moves left." at 0 moves, first in the list.
  - `BuildingStep` (~66) gains the quest step and its hero-pick step.
  - `buildingModel` (~247) gives the quest step's buttons: the quest's visible options by the pack's labels, disabled as `quest.ts` says; a hero pick per present hero under C3/14 Copy rows 10 and 11 ("Who takes the corruption?", "Who takes the reward?"); and "Leave" (`COPY.leave`) as a build press, not the building's leave.
- `apps/bloodtower/src/engine/loops/encounter/loop.ts`
  - `handleBuildingPress` (~263) takes the Quest pick through the existing pick press: 1 move, `handleQuestPick` (~351), then the quest step.
  - It also takes the quest step's presses: an option calls `chooseOption`, a hero calls `pickHero`, and Leave keeps the progress.
  - When the quest is done or left, it calls the turn-end helper and returns to the menu step. The `loadLive`/`commitLive` pair wraps each quest press, as `applyLive` (~188) does for a pick.
  - The DEC-676 stop at ~71 is unchanged.
- `apps/bloodtower/src/engine/views/state.ts`: the building `step` union (~174) gains the two quest step kinds. The device's `PlaceMenu.tsx` and the board's `BuildingBoardPanel.tsx` already draw any step's prompt and buttons; they are read only.
- `apps/bloodtower/src/engine/loops/quest/testSeed.ts` (new): TEST ONLY marker `~test-quest:<space>=<quest>`. It loads the `quest/fixtures.ts` scenes (`HERALD`, `AMBUSH`) as defs and opens that quest at that space. A seed without the marker changes nothing. It is not added to `TEST_SEED_MARKERS` (`loops/chapter/playState.ts`, a D1 path); the e2e seeds also carry `~test-at:`.
- `apps/bloodtower/src/engine/loops/session/stepShell.ts`: calls the marker reader after `seedHeroSheets` (~761) and after `applyTestSeed` in the `test-seed` event (~415).
- `apps/bloodtower/src/server/core/serialize.ts`: the checkpoint keeps the quest store beside `picks` (type ~30, `rehydratePlay` ~49 to ~58, write ~80, read ~101 and ~153), using `quest/store.ts`'s existing `snapshotQuests`/`restoreQuests` or a plain object as `picks` does. A save from before this step has none, and the store starts blank.

Read only: `loops/quest/quest.ts` (`beginQuest`, `chooseOption`, `pickHero`, `leaveQuest`, `openQuestAt`), `loops/quest/store.ts`, `loops/quest/fixtures.ts`, `loops/group-turn/loop.ts`, `loops/chapter/playState.ts`, `web/components/device/PlaceMenu.tsx`, `web/components/board/BuildingBoardPanel.tsx`.

Tests:
- `apps/bloodtower/src/engine/loops/encounter/questPick.test.ts` (new, EV-01 to EV-08)
- `apps/bloodtower/src/engine/loops/quest/testSeed.test.ts` (new, EV-09)
- `apps/bloodtower/src/server/core/questSave.test.ts` (new, EV-11)
- Existing `encounter.test.ts`, `building.test.ts`, `quest.test.ts`, `markers.test.ts`, `group-turn/loop.test.ts` and `buildingSave.test.ts` are unchanged and passing.

e2e: `apps/bloodtower/src/e2e/tests/ee01-quest-pick.spec.ts` (new, EV-10).

Cards: DEC-948 (new, this brief).

### Overlaps and merge order

- **No F1/01 overlap in files.** F1/01 works in the battle and Tomb loops and already lists EE-01 out of scope. Its eval.md is not edited. R01's quest clause is EV-06 here. A battle quest's fall (C4) calls the same turn-end helper.
- **POSSIBLE OVERLAP D1 (#558): `loops/encounter/loop.ts`**, only if D1's build swaps the `isCorruptionLoss` stop (~71, ~85) for a general loss read. This step's hunks are ~188 to ~360. Whichever lands second rebases.
- **No D2 (#559) or D3 overlap.**
- **OVERLAP D4 (#562): `loops/encounter/picks.ts` `openMenu` (~247 to ~262, the same lines).** This step goes first (Wright). D4 rebases onto it and reads the same quest store. D4's Quest pick, its iPad Quest row (its EV-02, EV-11) and the turn end after its quest come from here. D4's EV-11 "Quest opens herald's first step" is met by this step's quest buttons. C3-14 later draws the scene.
- **OVERLAP D5 (`docs/d5-brief-2026-11-18`): `picks.ts` `commitLive`** (both write gold; D5 replaces this step's gain split with its shared helper, same DEC-646 rule) **and `menu.ts`** (D5's purse read ~177 sits next to the Quest row ~182). Whichever lands second rebases.
- **OVERLAP D6 (`docs/d6-brief-2026-11-18`): `picks.ts`** (store, moves) **and `menu.ts`** (`costLine`). The Quest pick's 1 move goes through the same moves check, so D6's free pick can be the quest (DEC-913, "take the quest second"). D6's quest follow-up fixtures can run once this step lands.
- **OVERLAP C3-14 (#437, approved, not built): `engine/views/**`** (`views/state.ts`). C3-14 draws its quest scene on this step's quest step and replaces its stand-in buttons. Its approved EV-09 (back to the building menu) matches DEC-948. Its eval.md is not edited.
- **Merge order:** before D4. Independent of F1/01, D1, D2, D3. With D5 and D6, any order; the second rebases.

## What it does

1. **The Quest row** (DEC-083, DEC-630, DEC-948): first on the menu while the space holds an open quest marker, "Quest" with "1 move"; greyed with "No moves left." at 0 moves; gone once the quest is done.
2. **The pick** takes 1 move and opens the quest (DEC-084). The iPad shows its options, any hero pick and Leave, by existing words.
3. **The turn ends** when the quest is done or the group leaves it (DEC-821, DEC-948): moves 0, turn-end losses once, back on the menu with every pick greyed and Leave open. A third corruption still stops the game at once (DEC-676).
4. **Saved:** quest progress and the done list survive Continue.

**Inspect first.** If part of this already conforms, that part lands as tests only. A contradicted rule: stop that case and report it. Do not invent a rule.

**Out of scope** (do not widen): loading quests or chapters from the pack in a real game; C3-14's quest scene (Scroll, track, rewards line, end hook, styled options, costs and "Needs {item}"); battle quests and the Tomb (C4); D4's fallen building; Fortunate (D6); any change to `loops/chapter/**` or `group-turn/loop.ts`.

## Cutover

Cutover: N

- Nothing dies or is renamed. `PicksStore.quests` goes; `setQuestMarker` keeps its name and signature.

## Survival invariants

- Continue, restore, and restart must keep:
  - A quest left partway: its progress, and the turn already ended; after a restore the Quest row is back (greyed if no moves) and the quest resumes where it was (EV-11).
  - A quest done: done once, its gold paid once, the row gone; a replayed press never pays twice (EV-11).
- The tower is not touched.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 to EV-09 pass (verifier table on PR).
- [ ] EV-10 (e2e, Playwright) passes.
- [ ] EV-11 (survival) passes.
- [ ] Anvil's report lists changed files, test commands and results, and any drift found, and confirms no file under `loops/chapter/**`, `group-turn/loop.ts` or `chapter.test.ts` changed.
- Not required: quests live from the pack; C3-14's screens; a physical Tower run.

## AREA / DEC checklist

- [ ] DEC-821 and DEC-948 read; this brief follows them.
- [ ] DEC-083, DEC-630, DEC-084, DEC-151, DEC-149, DEC-468, DEC-472, DEC-473, DEC-676, DEC-653, DEC-693, DEC-178, DEC-646, MEC-036, MEC-037 read.
- [ ] **DEC-914: DEC-821 is provisional** (picked from P-006's win rates). It is built as written; nothing in it changes. Bob's approval of this eval.md accepts building it now.
- [ ] C3/13 EV-05's amendment (Bob, 2026-11-17) said the engine skips the quest row, so the row was not required there. This step adds it; C3/13's eval.md is not edited, and its fixtures hold no quest, so its EVs stand. Its EV-01 ("the quest marker first when one is there") now has a case.
- [ ] C3/14's approved Copy rows 10 and 11 are reused verbatim; no other C3/14 copy is shown. "Quest" is the building menu's existing label (D4's DEC-943 uses the same word).
- [ ] No Bob lock is reversed. DEC-822, 824 and 826 are not touched.

## Open questions

- None open. What "resolves" means and what the iPad shows: DEC-948 (EV-03 to EV-06).

## Eval approval

- See ./approval.md (must be filled before coding).
