# C3 — The Ruined Keep: a full game, simple (build plan)

**Status:** draft for Bob, 2026-10-31. Gamewright plans only and writes no code. Not yet at G0.
**Source:** [1.0-milestones.md](1.0-milestones.md) (C3 row and "Unblocking", on PR #335's branch `docs/bloodtower-c2-plan`), the [C2 audit](../docs/audit/C2-audit.md)'s "Lines for the C3 plan" (same branch), the 1.0 scope (DEC-691 to DEC-697), The Ruined Keep (AREA-097, DEC-659 to DEC-667, DEC-672 to DEC-674), the probes P-001 to P-003 (AREA-096, AREA-098), the numbers pass (AREA-099, DEC-699 to DEC-703), the skull clock (DEC-686), the loops MEC-032 to MEC-037, MEC-072, MEC-077 and the screens SCR-014, SCR-018, SCR-019.
**Goal:** a whole simple game of The Ruined Keep (AREA-097, the one 1.0 story, DEC-691) on pack v2: moving, events, the skull clock, corruption, chapters, buildings, plain scenes, win and loss, with the outcome and stats screens, on DEC-703's placeholder numbers (DEC-500).
**Exit condition:** every feature's eval table is all-pass on its PR, and Bob signs off at G-C3: The Ruined Keep played to a win and to a loss. In C3, clearing chapter 1 counts as the win (Bob, 2026-10-31, Q-C3-01).

## Who does what

As in C2: Gamewright writes this plan and each feature folder `plans/briefs/C3/##-<feature>/` with `plan.md`, `eval.md` (evals first, per `docs/sdlc.md`), `screen-spec.md` where a screen changes, and `approval.md`. Illusionist draws each screen feature's `mockup.html` from its screen spec before Bob approves. Bob approves each feature's evals and mockup in chat. Wright's developers build; the verifier runs each `eval.md`.

## What C3 adds to the app

```text
game loop body (MEC-032 .41/.42): one chapter per pass                 feature 10
  chapter (MEC-033): bounds, tokens, card → days → won / lost → seal break   09, 15
    day (MEC-034): Regroup → roll → group turns → events → drop → effects    04, 11
      group turn (MEC-035) → encounter (MEC-036): rally, cure, rest, draw, Cleanse   06, 13
        quest (MEC-037) → plain scene (MEC-077): costs, effects, items        07, 14
      event (MEC-072): quiet, windfall, hazard, foes, people                  05, 12
    corruption across all of them (MEC-080, DEC-676)                          08
  outcome (SCR-018) → stats (SCR-019) → session screen (C2)                   10, 16, 17
stories from pack v2 (01), tuning file (02), The Ruined Keep pack (03)
```

## How the work is cut

Engine first, screens after. Each feature is one PR-sized slice with its tests. The engine features (01 to 10) sit outside `engine/loops/session`, so they build beside C2's serial 05 to 08 ([1.0-milestones.md](1.0-milestones.md), "Unblocking", item 3). Only feature 10 touches `engine/loops/game`, which C2 reworks, so it waits for C2 08. The screens (11 to 17) sit in the shell and wait for C2 06 (07 for the outcome and stats). Until a screen lands, its engine feature is proved by unit evals and the headless simulator. A feature over about 400 changed lines may split in review, as `docs/sdlc.md` allows.

## Viewports

Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob. Every screen spec, mockup and screenshot eval uses these.

## Out of scope

- The battle loop (MEC-024, MEC-038), the Tomb (MEC-026, The Barrow) and battle-only corruption (Cursed, DEC-466): C4.
- The Tower finale (MEC-076), its last choice's play (DEC-664) and the art through A1: C5.
- NPCs, shops and gear (DEC-502). Dracula (DEC-691). Goodbye (DEC-628).
- Fight, in events and in plain scenes: hidden until C4 (Bob, 2026-10-31, Q-C3-02). Go around, Pay them off and The Ambush's "pay the toll" stay.
- Chapters 2 and 3 in play: the C3 game ends won when chapter 1 is won (Q-C3-01). The chapter loop still builds them, proved by fixtures.
- Final story copy: every line is `[COPY: ...]` until the story pass.

## Features

| # | Feature | Kind | Depends on | Screen spec |
|---|---|---|---|---|
| 01 | [Stories load from pack v2; the v1 loader goes](briefs/C3/01-pack-v2-stories/plan.md) | engine | its approval.md on main | no |
| 02 | [The tuning file holds DEC-703's numbers](briefs/C3/02-tuning-file/plan.md) | engine | its approval.md on main | no |
| 03 | [The Ruined Keep pack: chapters, quests, scenes and endings as data](briefs/C3/03-ruined-keep-pack/plan.md) | engine (pack) | 01, 02 | no |
| 04 | [The day: Regroup, the move roll, the skull drop as the game clock](briefs/C3/04-day-clock/plan.md) | engine | 02 | no |
| 05 | [Events in the wild: the seeded draw and its six tracks](briefs/C3/05-event-loop/plan.md) | engine | 04 | no |
| 06 | [Buildings: the menu, rally, cure, rest, virtue draw and Cleanse](briefs/C3/06-building-picks/plan.md) | engine | 02, 04 | no |
| 07 | [Quests and plain scenes: markers, the one choice, costs, effects and items](briefs/C3/07-quests-plain-scenes/plan.md) | engine | 03, 06 | no |
| 08 | [Corruption: gaining it, its 1.0 effects, the third one loses](briefs/C3/08-corruption/plan.md) | engine | 06, 07 | no |
| 09 | [Chapters: open, play days, win on every quest, the seal break](briefs/C3/09-chapter-loop/plan.md) | engine | 04, 07 | no |
| 10 | [The game ends: won or lost, the record and the stats](briefs/C3/10-game-end/plan.md) | engine | 09, C2 08 | no |
| 11 | [The day on the board: day roll, days left, threat bar, effects panel](briefs/C3/11-day-on-the-board/plan.md) | screen | 04, C2 06 | yes |
| 12 | [The event scene: the painting, the words and the choice](briefs/C3/12-event-scene/plan.md) | screen | 05, C2 06 | yes |
| 13 | [The building menu on the iPad: rally, cure, rest, virtue draw, Cleanse](briefs/C3/13-building-menu/plan.md) | screen | 06, 08, C2 06 | yes |
| 14 | [The quest scene: the track, the choice, the item hand-off](briefs/C3/14-quest-scene/plan.md) | screen | 07, C2 06 | yes |
| 15 | [The chapter card and the chapter end with the seal break](briefs/C3/15-chapter-card/plan.md) | screen | 09, C2 06 | yes |
| 16 | [The outcome scene: win or loss](briefs/C3/16-outcome-scene/plan.md) | screen | 10, C2 07 | yes |
| 17 | [Game stats: the game in numbers](briefs/C3/17-game-stats/plan.md) | screen | 16 | yes |

### Feature 01: Stories load from pack v2; the v1 loader goes
- Folder: [briefs/C3/01-pack-v2-stories](briefs/C3/01-pack-v2-stories/plan.md)
- Kind: engine
- Depends on: its approval.md on main, and its `approval.md` on `main`
- C2 overlap: none (C2 has no pack work)
- Touches: `apps/bloodtower/src/server/pack/{load,assets,camera,audio}.ts` and tests, `apps/bloodtower/src/server/pack/v2/**`, `apps/bloodtower/src/protocols/{pack,storyCard,control}.ts`, `apps/bloodtower/src/engine/loops/session/pack.ts` (the read of the story card only), `apps/bloodtower/src/server/timing/{log,stats}.ts`, `apps/bloodtower/src/server/control/lock.ts`
- Builds: none
- Screen spec: none
- Deps change: no
- Runs: cloud

### Feature 02: The tuning file holds DEC-703's numbers
- Folder: [briefs/C3/02-tuning-file](briefs/C3/02-tuning-file/plan.md)
- Kind: engine
- Depends on: its approval.md on main, and its `approval.md` on `main`
- C2 overlap: none
- Touches: `packs/base/tuning.yaml` (new), `apps/bloodtower/src/protocols/pack-v2/base.ts` (tuning schema), `apps/bloodtower/src/server/pack/v2/load.ts`, `apps/bloodtower/src/engine/state.ts` (tuning on the state, read-only)
- Builds: DEC-703, DEC-500
- Screen spec: none
- Deps change: no
- Runs: cloud

### Feature 03: The Ruined Keep pack: chapters, quests, scenes and endings as data
- Folder: [briefs/C3/03-ruined-keep-pack](briefs/C3/03-ruined-keep-pack/plan.md)
- Kind: engine (pack)
- Depends on: 01, 02, and its `approval.md` on `main`
- C2 overlap: none
- Touches: `packs/test/**` (the Proving Grounds pack, DEC-666), `apps/bloodtower/src/server/pack/v2/lint.test.ts`
- Builds: AREA-097
- Screen spec: none
- Deps change: no
- Runs: cloud

### Feature 04: The day: Regroup, the move roll, the skull drop as the game clock
- Folder: [briefs/C3/04-day-clock](briefs/C3/04-day-clock/plan.md)
- Kind: engine
- Depends on: 02, and its `approval.md` on `main`
- C2 overlap: none (`engine/loops/day`, `group-turn` are C3's)
- Touches: `apps/bloodtower/src/engine/loops/day/**`, `apps/bloodtower/src/engine/loops/group-turn/**`, `apps/bloodtower/src/engine/views/**` (day view fields only)
- Builds: MEC-034, DEC-686, DEC-699, DEC-640, DEC-615, DEC-564, DEC-093
- Screen spec: none
- Deps change: no
- Runs: cloud

### Feature 05: Events in the wild: the seeded draw and its six tracks
- Folder: [briefs/C3/05-event-loop](briefs/C3/05-event-loop/plan.md)
- Kind: engine
- Depends on: 04, and its `approval.md` on `main`
- C2 overlap: none
- Touches: `apps/bloodtower/src/engine/loops/event/**` (new level), `apps/bloodtower/src/engine/loops/day/loop.ts` (the .9 call only)
- Builds: MEC-072, DEC-017, DEC-022, DEC-027, DEC-029, DEC-018, DEC-669
- Screen spec: none
- Deps change: no
- Runs: cloud

### Feature 06: Buildings: the menu, rally, cure, rest, virtue draw and Cleanse
- Folder: [briefs/C3/06-building-picks](briefs/C3/06-building-picks/plan.md)
- Kind: engine
- Depends on: 02, 04, and its `approval.md` on `main`
- C2 overlap: none
- Touches: `apps/bloodtower/src/engine/loops/encounter/**`, `apps/bloodtower/src/engine/loops/{rest,buy,talk}/**` (new levels, 1.0 picks only)
- Builds: MEC-036, MEC-075, DEC-377, DEC-158, DEC-170, DEC-172, DEC-544, DEC-700, DEC-681
- Screen spec: none
- Deps change: no
- Runs: cloud

### Feature 07: Quests and plain scenes: markers, the one choice, costs, effects and items
- Folder: [briefs/C3/07-quests-plain-scenes](briefs/C3/07-quests-plain-scenes/plan.md)
- Kind: engine
- Depends on: 03, 06, and its `approval.md` on `main`
- C2 overlap: none
- Touches: `apps/bloodtower/src/engine/loops/quest/**` (new level), `apps/bloodtower/src/engine/loops/scene/**` (new level), `apps/bloodtower/src/engine/loops/encounter/loop.ts` (the quest pick only)
- Builds: MEC-037, MEC-077, DEC-642, DEC-692, DEC-693, DEC-714, DEC-653, DEC-654, DEC-151, DEC-700
- Screen spec: none
- Deps change: no
- Runs: cloud

### Feature 08: Corruption: gaining it, its 1.0 effects, the third one loses
- Folder: [briefs/C3/08-corruption](briefs/C3/08-corruption/plan.md)
- Kind: engine
- Depends on: 06, 07, and its `approval.md` on `main`
- C2 overlap: none
- Touches: `apps/bloodtower/src/engine/rules/corruption/**` (new), `apps/bloodtower/src/engine/loops/{day,group-turn,encounter}/**` (hook calls only)
- Builds: MEC-080, DEC-676, DEC-684, DEC-468, DEC-470 to DEC-477 (the 1.0 set less DEC-467, DEC-469)
- Screen spec: none
- Deps change: no
- Runs: cloud

### Feature 09: Chapters: open, play days, win on every quest, the seal break
- Folder: [briefs/C3/09-chapter-loop](briefs/C3/09-chapter-loop/plan.md)
- Kind: engine
- Depends on: 04, 07, and its `approval.md` on `main`
- C2 overlap: none (`engine/loops/chapter` is C3's)
- Touches: `apps/bloodtower/src/engine/loops/chapter/**`
- Builds: MEC-033, DEC-041, DEC-133, DEC-134, DEC-146, DEC-303, DEC-306, DEC-409, DEC-656
- Screen spec: none
- Deps change: no
- Runs: cloud

### Feature 10: The game ends: won or lost, the record and the stats
- Folder: [briefs/C3/10-game-end](briefs/C3/10-game-end/plan.md)
- Kind: engine
- Depends on: 09, C2 08, and its `approval.md` on `main`
- C2 overlap: C2 08 (touches `engine/loops/game`, which C2 05 to 08 rework)
- Touches: `apps/bloodtower/src/engine/loops/game/**` (body .41, .42, close .43, end .44 to .49), `apps/bloodtower/src/server/events/**` (stats read-out), `apps/bloodtower/src/engine/loops/game/*.test.ts` (new, per the C2 audit)
- Builds: MEC-032, DEC-116, DEC-117, DEC-144, DEC-627, DEC-676
- Screen spec: none
- Deps change: no
- Runs: cloud

### Feature 11: The day on the board: day roll, days left, threat bar, effects panel
- Folder: [briefs/C3/11-day-on-the-board](briefs/C3/11-day-on-the-board/plan.md)
- Kind: screen
- Depends on: 04, C2 06, and its `approval.md` on `main`
- C2 overlap: C2 06 (the play screen sits in the shell)
- Touches: `apps/bloodtower/src/web/components/board/**` (new day panels), `apps/bloodtower/src/web/components/device/**` (Regroup prompt), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-day.spec.ts` (new)
- Builds: UI-021, UI-022, UI-028, UI-047, UI-030 (corruptions shown)
- Screen spec: [screen-spec.md](briefs/C3/11-day-on-the-board/screen-spec.md)
- Deps change: no
- Runs: cloud

### Feature 12: The event scene: the painting, the words and the choice
- Folder: [briefs/C3/12-event-scene](briefs/C3/12-event-scene/plan.md)
- Kind: screen
- Depends on: 05, C2 06, and its `approval.md` on `main`
- C2 overlap: C2 06
- Touches: `apps/bloodtower/src/web/components/board/EventScene.tsx` (new), `apps/bloodtower/src/web/components/device/**` (choice list), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-event.spec.ts`
- Builds: UI-041
- Screen spec: [screen-spec.md](briefs/C3/12-event-scene/screen-spec.md)
- Deps change: no
- Runs: cloud

### Feature 13: The building menu on the iPad: rally, cure, rest, virtue draw, Cleanse
- Folder: [briefs/C3/13-building-menu](briefs/C3/13-building-menu/plan.md)
- Kind: screen
- Depends on: 06, 08, C2 06, and its `approval.md` on `main`
- C2 overlap: C2 06
- Touches: `apps/bloodtower/src/web/components/device/PlaceMenu*.tsx`, `apps/bloodtower/src/web/components/board/**` (place painting and results), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-building.spec.ts`
- Builds: UI-043, UI-024
- Screen spec: [screen-spec.md](briefs/C3/13-building-menu/screen-spec.md)
- Deps change: no
- Runs: cloud

### Feature 14: The quest scene: the track, the choice, the item hand-off
- Folder: [briefs/C3/14-quest-scene](briefs/C3/14-quest-scene/plan.md)
- Kind: screen
- Depends on: 07, C2 06, and its `approval.md` on `main`
- C2 overlap: C2 06
- Touches: `apps/bloodtower/src/web/components/board/QuestScene.tsx` (new), `apps/bloodtower/src/web/components/device/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-quest.spec.ts`
- Builds: UI-042, UI-025, UI-036
- Screen spec: [screen-spec.md](briefs/C3/14-quest-scene/screen-spec.md)
- Deps change: no
- Runs: cloud

### Feature 15: The chapter card and the chapter end with the seal break
- Folder: [briefs/C3/15-chapter-card](briefs/C3/15-chapter-card/plan.md)
- Kind: screen
- Depends on: 09, C2 06, and its `approval.md` on `main`
- C2 overlap: C2 06
- Touches: `apps/bloodtower/src/web/components/board/ChapterCard.tsx` (new), `apps/bloodtower/src/web/components/board/SealBreak.tsx` (new), `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-chapter.spec.ts`
- Builds: UI-020, UI-044
- Screen spec: [screen-spec.md](briefs/C3/15-chapter-card/screen-spec.md)
- Deps change: no
- Runs: cloud

### Feature 16: The outcome scene: win or loss
- Folder: [briefs/C3/16-outcome-scene](briefs/C3/16-outcome-scene/plan.md)
- Kind: screen
- Depends on: 10, C2 07, and its `approval.md` on `main`
- C2 overlap: C2 07 (the session screen's drill-in)
- Touches: `apps/bloodtower/src/web/components/board/OutcomeScene.tsx` (new), `apps/bloodtower/src/web/components/device/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-outcome.spec.ts`
- Builds: SCR-018, UI-046
- Screen spec: [screen-spec.md](briefs/C3/16-outcome-scene/screen-spec.md)
- Deps change: no
- Runs: cloud

### Feature 17: Game stats: the game in numbers
- Folder: [briefs/C3/17-game-stats](briefs/C3/17-game-stats/plan.md)
- Kind: screen
- Depends on: 16, and its `approval.md` on `main`
- C2 overlap: C2 07 (stats drill-in from tonight's games)
- Touches: `apps/bloodtower/src/web/components/board/GameStats.tsx` (extends C2 07's quit-game stats), `apps/bloodtower/src/web/components/device/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/e2e/tests/c3-stats.spec.ts`
- Builds: SCR-019, DEC-116
- Screen spec: [screen-spec.md](briefs/C3/17-game-stats/screen-spec.md)
- Deps change: no
- Runs: cloud

## Batches

- G0: Bob approves this plan; then the folders' evals (and the screen features' mockups).
- B1: 01, 02, 04 (beside C2 05). Touches do not overlap.
- B2: 03, 05, 06 (03 after 01 and 02; 05 and 06 after 04).
- B3: 07, then 08 and 09 (both after 07; 08 and 09 touch different folders).
- B4: 10, once C2 08 is merged.
- B5: 11, 12, 13, 14, 15 once C2 06 is merged and each engine feature is in.
- B6: 16, then 17, once C2 07 and 10 are merged.
- G-C3.

## Risks

- **The C3 win ends after chapter 1.** Ruled (Q-C3-01). C4 and C5 must remove the C3 end rule, so it sits behind one tuning switch (feature 02) with its own eval (features 09, 10).
- **The Ambush with no Fight.** With Fight hidden (Q-C3-02), the toll is the only way to finish chapter 1. A group that cannot pay was stuck; the Gamewright proposal (pending Bob, Q-C3-22) lets a short group pay all its gold plus 2 hit points per present hero, never below 1, so chapter 1 can always finish.
- **Feature 10 and the C2 shell.** It is the one engine feature that waits for C2's serial line.
- **The pack and old saves.** Feature 01 changes how stories load; pre-C3 autosaves are dropped (Q-C3-07, ruled), so a game in progress at upgrade is lost. The old row is kept and ignored, logging `save skipped: pre-C3 format` (Gamewright default, Bob to confirm).

## Gaps this plan closes (`pnpm graph gaps`, 1.0)

The deliverables listed under each feature's `Builds:`. The gameplay mechanics item 4 of "Unblocking" names (events, buildings, quests) get their screens here: UI-021, UI-022, UI-028, UI-030, UI-047 (11), UI-041 (12), UI-043, UI-024 (13), UI-042, UI-025, UI-036 (14), UI-020, UI-044 (15), SCR-018, UI-046 (16), SCR-019 (17). Battle, Tomb and Tower gaps stay for C4 and C5. Not run against the graph in this draft: the builder of each feature confirms its gap list with `pnpm graph gaps`.

## OPEN questions (consolidated)

Each is also listed in the feature files that need it. Three are answered (Bob, 2026-10-31); three carry a Gamewright default pending Bob's review (Q-C3-19, 20, 21); the rest are not ruled here. (Q-C3-06 is unused.)

Gamewright defaults (2026-10-31, from Sentinel's C3 eval review; each tagged "(Gamewright default, Bob to confirm)" in the feature files):
- 03 has three items: Tomas's Map, the Signet and the oath-blade (B3).
- Rest is the village's tavern rest, +3 hit points per move, in 06 and 13 (B4).
- Story text in screen specs 15 and 16 (and 12, 14) is `[COPY: ...]` per the rule (B7).
- "Best" on Game stats is the shortest winning game (B8).
- Tuning is fixed at Begin (B2).
- A pre-C3 save row is kept and ignored, and logs `save skipped: pre-C3 format` (B1).
- With Fight hidden, The Ambush may have one option: a documented C3 exception to the 2–3 option rule (B5).
- On the C3 chapter 1 win, the stamped card and close Scroll show before the outcome scene (B6).

Gamewright proposals for the pending numbers (pending Bob; each tagged "(Gamewright proposal, pending Bob)"):
- Citadel: Rally (5 gold + 1 move), Virtue draw (10 gold + 1 move) or Cleanse. Sanctuary: cure (10 gold + 1 move, first one free each chapter) or Cleanse. Village: tavern rest or Cleanse. Bazaar: Cleanse only (Q-C3-13, Q-C3-14).
- 4 fallen buildings lose the game (Q-C3-05).
- Corruption: Cruel, Greedy and Feral cost 2 gold, Lost costs 1, Tempted adds +2 to each buy; the named corruption is a seeded draw from the C3 set, never one the hero holds (Q-C3-15, Q-C3-16).
- The Ambush toll is 10 gold; a short group pays what it has plus 2 hit points per present hero, never below 1 (Q-C3-22).

- ANSWERED Q-C3-01 (Bob, 2026-10-31 10:09 AM ET): clearing chapter 1 counts as the C3 win. The game ends won when chapter 1 is won; no seal break, no chapter 2 (features 09, 10, 16).
- ANSWERED Q-C3-02 (Bob, 2026-10-31 10:09 AM ET): hide Fight until C4. Foes and disaster events offer Go around and Pay them off only; plain-scene battle options are hidden (features 05, 07, 12, 14).
- Q-C3-03: DEC-502 cuts NPCs and shops from 1.0, but the people track draws trade, rumour, companion or trick (DEC-024). Which offers are in 1.0? Does the people weight (10) move to another type? (features 05, 12)
- Q-C3-04: how is "days left" counted for 3–4 heroes, whose drop alternates 1 and 2 (DEC-564)? Floor of supply ÷ 1.5, or a count of the actual nights the pattern gives? (features 04, 11)
- Q-C3-05: the fallen-buildings loss (DEC-043): how many fallen buildings lose the game? DEC-703 has no row for it. (features 04) Gamewright proposal, pending Bob: 4 fallen buildings.
- ANSWERED Q-C3-07 (Bob, 2026-10-31): yes, pre-C3 saves are dropped, not migrated. (features 01)
- Q-C3-08: can a story pack override tuning values (e.g. The Ruined Keep's Warden level 5, DEC-361), or does only the base file hold them? (features 02)
- Q-C3-09: DEC-666 says the pack ID is Proving Grounds, but the folder's `pack_id` is `test`. Rename to `proving-grounds`, or keep `test`? (features 03)
- Q-C3-10: which spaces hold The Ambush ("a wild space"), The Lock and The Last Stand? DEC-662 names the kingdom only; P-003 used Muted Forest, Howling Desert and The Grass Sea. Are the probe's spaces the ruling? (features 03)
- Q-C3-11: The Last Stand's foe: DEC-647 draws a random level-3 foe. Is that the intent, or does the story name the oathsworn guard? (features 03)
- Q-C3-12: does the disaster event's boss-level foe (DEC-028) need a C3 placeholder, as P-003 day 11 met one? (features 05)
- Q-C3-13: which picks does each 1.0 building kind offer? DEC-158 lists a citadel potion and an audience; DEC-502 cuts NPCs and shops. Are the potion and audience out of 1.0? (features 06, 13) Gamewright proposal, pending Bob: citadel Rally/Virtue draw/Cleanse; sanctuary cure/Cleanse; village tavern rest/Cleanse; bazaar Cleanse only.
- Q-C3-14: is there a 1.0 bazaar or village pick beyond rest and Cleanse, or are they Cleanse-only (P-003 gap 2 says "in 1.0 those sell nothing")? (features 06) Gamewright proposal, pending Bob: village = tavern rest or Cleanse; bazaar = Cleanse only.
- Q-C3-15: how is the named corruption picked when a hero takes one: a seeded draw from the 1.0 set, the story's choice (MEC-059), or the group's? And can a hero draw the same one twice? (features 08) Gamewright proposal, pending Bob: seeded draw from the C3 set, no repeats per hero.
- Q-C3-16: the gold amounts for Cruel, Greedy, Feral, Lost and Tempted are not in DEC-703's table. Which numbers? (features 08) Gamewright proposal, pending Bob: Cruel/Greedy/Feral 2, Lost 1, Tempted +2 per buy.
- Q-C3-17: which glyph boons does The Ruined Keep name for each seal break (DEC-303 "a story may name it")? Or does the app pick and the base pack supply the boons? (features 09, 15)
- Q-C3-18: "key moments" on the stats screen (SCR-019): which events count as one? No card lists them. (features 10, 17)
- DEFAULT Q-C3-19 (Gamewright default, pending Bob's review): the threat bar shows only the coming drop. (features 11)
- DEFAULT Q-C3-20 (Gamewright default, pending Bob's review): the hero picks which corruption a cure removes. (features 13)
- Q-C3-22: with Fight hidden, The Ambush finishes only by paying the toll (DEC-662). The toll amount is not carded, and a group that cannot pay cannot win chapter 1. What is the toll, and what happens when the purse is short? (features 03, 07, 14) Gamewright proposal, pending Bob: 10 gold; short group pays all + 2 HP per present hero, never below 1.
- Q-C3-23: which win scene and line play for the C3 win? DEC-663 and DEC-664 write the win for the finale, after the last choice, which C3 never reaches. Use a placeholder `[COPY: chapter 1 win]`, or the finale's win scene without the line? (features 10, 16)
- DEFAULT Q-C3-21 (Gamewright default, pending Bob's review): the fun rating is per iPad. (features 17)

## Results

- (none yet)
