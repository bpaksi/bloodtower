Keep this a checklist; do not write a second design doc.

# Brief: F1 / 03-live-quests — Quests and chapters live from the story pack in a real game

## Meta

- Plan: [catchup/README.md](../../../catchup/README.md) (section "Nov 12 audit fold-in"; the live-quests gap found while briefing F1/02, assigned by Wright 2026-11-18)
- Feature: 03-live-quests
- Kind: fix (engine wiring, one loader field, one save field; no new screen state, no new copy)
- Owner: Gamewright (brief, evals); Anvil (build, inspect first)
- Related AREA/docs: AREA-097; MEC-033; C3-09 (chapter loop), C3-18 (pack scene data), C3-19 (markers per chapter); DEC-949 (this brief); issue to open
- Evals: ./eval.md
- Screen spec: none
- Mockup: none (no new screen state: F1/02's Quest row and quest buttons, now with the pack's quests)
- Risk: Med (game end in real play; restore)
- Depends on: its approval.md on main, and **F1/02 merged** (`docs/ee01-brief-2026-11-18`). F1/02 gives `handleQuestPick` its live caller (the iPad Quest row), the turn end after a quest, the quest store in the checkpoint and the `loops/quest/testSeed.ts` marker. This step does not start before F1/02 merges.
- **Goes before G-C3** (Bob's Ruined Keep playthrough, queue order 26). Goes before D4's build (#504, PR #562): D4's e2e needs an open quest at a fallen building and uses no quest marker.
- Builds: DEC-949; MEC-033 and C3-19 in a real game
- Deps change: no
- Runs: cloud

### Touches (checked against main 90fb948)

**Stays out of D1 paths: YES.** It edits no file under `apps/bloodtower/src/engine/loops/chapter/**`, does not edit `apps/bloodtower/src/engine/loops/group-turn/loop.ts`, and does not edit `apps/bloodtower/src/engine/loops/chapter/chapter.test.ts`. It only calls the chapter store's existing exports (`configureChapters`, `tryChapters`, `snapshotChapters`, `restoreChapters` in `loops/chapter/chapters.ts`) and imports its `ChapterPlan` type. `PlayContent` (`loops/chapter/playState.ts`) is not changed: the pack data rides on the story, not on the play content. If the build finds a `loops/chapter/**` or `group-turn/loop.ts` change is needed, it stops and reports. It does not widen into those files.

Main today, observed: `configureQuestsFromPack` (`loops/quest/store.ts` ~147) and `configureChapters` (`loops/chapter/chapters.ts` ~86) are called only from tests. The loader (`server/core/loadStories.ts`) reads the story pack's chapters and scenes and then drops them. With no chapter store, the chapter loop (`loops/chapter/loop.ts` ~170 to ~214) only runs days: a lost day never ends the game, and no chapter is ever won. The chapter store is not in the checkpoint (`server/core/serialize.ts`).

Edited:
- `apps/bloodtower/src/engine/loops/session/storyPlay.ts` (new)
  - Type `StoryPlayData`: `{ quests: QuestPackData; chapters: ChapterPlan | null }`. `QuestPackData` is from `quest/store.ts`; `ChapterPlan` is from `chapter/chapters.ts`; both are imported as types only.
  - `configureStoryPlay(play, data)`: `configureQuestsFromPack(play, data.quests, 1)`; then, if `data.chapters` is set, `configureChapters(play, data.chapters)`. It does nothing when `data` is undefined.
- `apps/bloodtower/src/engine/loops/session/pack.ts`: `ShellStory` (~34) gains an optional `play?: StoryPlayData`. `TEST_STORY` (~54) is unchanged and has none, so every engine test built on it runs as today.
- `apps/bloodtower/src/server/core/loadStories.ts`: for a loaded story pack, the `shellStory` (~202) gets `play`:
  - `quests`: the pack's `chapters` (index, quests with `id`, `scene`, `place`) and `scenes`, as `questsFromPack` reads them.
  - `chapters`: each chapter's `id`, `index`, `kingdoms`, and its placed quests as `{ id, spaceId: place.space }` (an unplaced quest is left out, DEC-949). `seals: []`. `c3EndAfterChapter1`, `foeLevel` and `sealBreakMin` come from `loaded.base.tuning` (~186: `c3_end_after_chapter_1`, `setup.foe_level_by_chapter.chapter_1` / `per_chapter`, `day.seal_break.min`). With no base tuning, `chapters` is null and quests still load.
  - A metadata door (Dracula) and a Not-ready door get no `play`.
- `apps/bloodtower/src/engine/loops/session/stepShell.ts`: at the start of play, right after `seedHeroSheets` (~761) and before F1/02's marker reader at the same spot, calls `configureStoryPlay(next.play, story?.play)`, where `story` is the bound story already found at ~747. It runs only on a new play, not on a Continue (`!next.resumedFromAutosave`, ~746, as now).
- `apps/bloodtower/src/server/core/serialize.ts`: the checkpoint keeps the chapter store beside F1/02's quest store: the `SerializedShellState` type (~19 to ~30), `rehydratePlay` (~48 to ~58), the write (~80, `tryChapters` and then `snapshotChapters`, null when there is none), and the read (~101, ~153, `restoreChapters`). A checkpoint without it restores no chapter store (DEC-949).
- `apps/bloodtower/src/engine/loops/quest/testSeed.ts` (F1/02's new file): when the quest store already holds pack defs, `~test-quest:<space>=<quest>` opens that pack quest at that space and loads no fixture defs. An id the pack lacks throws, naming it. With no pack defs it behaves as F1/02 wrote it.
- `apps/bloodtower/src/e2e/tests/c3-building.spec.ts` (test only): `VILLAGE` (~169) moves from `N-egans-end` to `E-duwani`, a village with no quest. Egan's End now holds the live Herald, so its menu starts with Quest. C3/13's eval.md does not name the space and is not edited.

Read only: `loops/chapter/chapters.ts`, `loops/chapter/loop.ts`, `loops/chapter/playState.ts`, `loops/quest/store.ts`, `loops/quest/quest.ts`, `loops/encounter/loop.ts` (`handleQuestPick`, F1/02's press), `loops/game/loop.ts`, `loops/game/end.ts`, `protocols/pack-v2/story.ts`, `protocols/pack-v2/base.ts`, `server/hub/host.ts`, `server/core/session.ts`, `packs/test/pack.yaml`, `packs/base/tuning.yaml`.

Tests:
- `apps/bloodtower/src/server/core/storyPlay.test.ts` (new, EV-01, EV-02)
- `apps/bloodtower/src/server/core/liveQuests.test.ts` (new, EV-03 to EV-09, EV-11)
- Existing `markers.test.ts`, `quest.test.ts`, `chapter.test.ts`, `game/loop.test.ts`, `loadStories.test.ts`, `towerLost.test.ts` and F1/02's `questPick.test.ts`, `testSeed.test.ts`, `questSave.test.ts` are unchanged and passing.

e2e: `apps/bloodtower/src/e2e/tests/f1-03-live-quests.spec.ts` (new, EV-10).

Cards: DEC-949 (new, this brief).

### Overlaps and merge order

- **No F1/01 overlap.** F1/01 works in the battle and Tomb loops. A battle option in a live quest (the Ambush's "Fight") stays hidden while `fight_enabled` is false, as now.
- **DEPENDENCY and OVERLAP F1/02 (`docs/ee01-brief-2026-11-18`): `stepShell.ts` (~761, the same spot), `serialize.ts` (the same type and rehydrate lines) and `loops/quest/testSeed.ts` (its new file).** F1/02 merges first; this step rebases on it. The quest store's save is F1/02's; this step adds the chapter store beside it and does not save quests a second time.
- **No D1 (#558) file overlap** (stays out of D1 paths). Behaviour: with a chapter store, the chapter loop's loss branch (`loop.ts` ~182) now runs in a real game. D1's loss dispatch ends a real game. Either order; the second rebases nothing.
- **No D4 (#562) file overlap.** D4 touches `group-turn/loop.ts`, `picks.ts`, `day/rules.ts`, `session/view.ts`, `CoreDeviceScreen.tsx`, `chapter.test.ts`. Behaviour: D4's e2e (its EV-11) seeds skulls and a position only; the open Herald it needs at Egan's End comes from this step. **This step goes before D4's build.**
- **No D5 (`docs/d5-brief-2026-11-18`) file overlap.** D5 changes `quest/quest.ts` gold; this step only reads it.
- **No D6 (`docs/d6-brief-2026-11-18`) file overlap.** Behaviour: a quest won today now happens in real play, so D6's quest-win night skip (DEC-912) is reachable outside tests.
- **No C3-14 (#437) file overlap.** C3-14 draws the scene for these real quests on F1/02's quest step.
- **No C3/15 (#438) file overlap.** C3/15 works in `loops/chapter/**` and `engine/views/**`. Behaviour: the chapter start's cue and card outputs (`loop.ts` ~92 to ~101) now fill in a real game; C3/15 draws them. In C3 no seal breaks (Q-C3-01).
- **Merge order:** F1/02 → this step → D4. Independent of F1/01, D1, D2, D3, D5, D6, C3-14, C3/15.

## What it does

1. **Quests from the pack** (DEC-949, C3-18, C3-19): when play begins, chapter 1's quest markers are open: in The Ruined Keep on main, the Herald at Egan's End and the Ambush at Muted Forest.
2. **Chapters from the pack** (DEC-949, MEC-033): the chapter loop gets its plan. Chapter 1 is won when its quests are done; in C3 that ends the game with the win (Q-C3-01). A lost day ends the game with that loss.
3. **The Quest row works in a real game:** at Egan's End the iPad's first row is Quest (F1/02). Pressing it reaches `handleQuestPick` and plays the pack's Herald with its own labels.
4. **Saved:** the chapter store survives Continue (with F1/02's quest store). An older save plays on as saved (DEC-949).

**Inspect first.** If part of this already conforms, that part lands as tests only. A contradicted rule: stop that case and report it. Do not invent a rule.

**Out of scope** (do not widen): Enter on a wild quest marker (DEC-641; the Ambush at Muted Forest is wild, see Open questions); quest markers swapping at a chapter change (C4-07; in C3 the game ends after chapter 1); seals in the pack; the chapter card and narration screens (C3/15); C3-14's quest scene; quest gold tuning; any change to `loops/chapter/**` or `group-turn/loop.ts`.

## Cutover

Cutover: N

- Nothing dies or is renamed. `ShellStory.play` is new and optional.

## Survival invariants

- Continue, restore, and restart must keep:
  - Mid chapter 1: the chapter store (chapter 1 current, entered once), the quests done and the markers still open; no chapter enter or start runs again; a win after Continue still ends the game (EV-11).
  - A save from before this step: it restores without error, with no chapter store and no quest marker, and plays on (EV-09).
- The tower is not touched.

## Done-when (e2e)

Contract is ./eval.md. List EV IDs; do not restate them.

- [ ] EV-01 to EV-09 pass (verifier table on PR).
- [ ] EV-10 (e2e, Playwright) passes.
- [ ] EV-11 (survival) passes.
- [ ] Anvil's report lists changed files, test commands and results, any existing test moved off Egan's End or Muted Forest (test files only), and any drift found, and confirms no file under `loops/chapter/**`, `group-turn/loop.ts` or `chapter.test.ts` changed.
- Not required: Enter on a wild marker; a chapter 2; C3/15's or C3-14's screens; a physical Tower run.

## AREA / DEC checklist

- [ ] DEC-949 read; this brief follows it.
- [ ] MEC-033, DEC-041, DEC-133, DEC-086, DEC-703, DEC-675, DEC-151, DEC-641, DEC-948 and DEC-821 read; C3-09, C3-18 and C3-19's plans read.
- [ ] **DEC-914: DEC-821 is provisional.** F1/02 builds it. This step makes it happen in a real game and changes nothing in it.
- [ ] No approved eval.md is edited. C3/13's EV-06, EV-08 and EV-10 still pass at a quest-free village (`c3-building.spec.ts` only).
- [ ] No Bob lock is reversed. DEC-822, 824 and 826 are not touched.

## Open questions

- **For Wright and Bob (blocks G-C3's win, not this step):** chapter 1's Ambush is on a wild space (Muted Forest). Enter on a wild quest marker (DEC-641) is not built: `group-turn/loop.ts` offers Enter only on a building (~128, ~155, ~289). So in a real game the Ambush cannot be reached, and chapter 1 cannot be won. The rule is ruled; only the build is missing. It needs `group-turn/loop.ts` (a D1 path) and `openMenu` for a space with no building, on the same five gates D4 opens. Proposed: its own step after D4 (F1/04). This step stays out of D1 paths.
- Everything else: DEC-949.

## Follow-up notes

- **D4:** its EV-11 seed (`~test-skulls:`, `~test-at:`) needs no quest marker once this step lands; the Herald is live at Egan's End.
- **F1/02:** once this step lands, its EV-10 could drop `~test-quest:` and stand at Egan's End. The buttons would then read the pack's labels ("[COPY: Take the job]", "[COPY: Ask for pay first]"). That edits F1/02's eval.md, so it needs Bob's re-approval if F1/02 is approved by then. Not done here.

## Eval approval

- See ./approval.md (must be filled before coding).
