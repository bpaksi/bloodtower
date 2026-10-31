# C4 — Battle and the Tomb: the full Ruined Keep to chapter 3 (build plan)

**Status:** draft for Bob, 2026-10-31. Gamewright plans only and writes no code. Not yet at G0.
**Source:** [1.0-milestones.md](1.0-milestones.md) (C4 row, on `docs/bloodtower-c2-plan`), [C3-ruined-keep.md](C3-ruined-keep.md) ("Out of scope" and "Risks"), the battle loop (MEC-024, MEC-038), the Tomb (MEC-026, DEC-593, AREA-094), Cursed (DEC-466, accepted 2026-10-31), the chapters (DEC-662) and the seals (DEC-303).
**Goal:** the deferred C3 pieces go live: Fight (`fight_enabled: true`), chapters 2 and 3 (`c3_end_after_chapter_1: false`), the seal break and its lines, Cursed, the full battle loop and The Barrow as the 1.0 Tomb.
**Exit condition:** every feature's eval table is all-pass on its PR, and Bob signs off at G-C4: a battle won, a battle retreated from, and the Tomb cleared, in a game of The Ruined Keep played through chapter 3 (1.0-milestones.md).

## Who does what

As in C3: Gamewright writes this plan and each feature folder `plans/briefs/C4/NN-<feature>/` with `plan.md`, `screen-spec.md` (screen features only), `evals.md` (evals first, per `docs/sdlc.md`) and `approval.md`. Illusionist draws each screen feature's `mockup.html`. Bob approves evals and mockups. Wright's developers build; the verifier runs each `evals.md`.

## Scope and why

1.0-milestones.md defines C4 as "the full battle loop (MEC-024) and the one 1.0 dungeon, the Tomb (MEC-026, DEC-593)". C3's out-of-scope list puts the battle loop, the Tomb and Cursed (DEC-466) in C4 and the Tower finale in C5. Fight (Q-C3-02) and chapters 2+ (Q-C3-01) were held back only because they need the battle loop and the Tomb: chapter 2's quest The Barrow is the Tomb, and chapter 3's The Last Stand is a battle (DEC-662). So C4 plays The Ruined Keep through chapter 3. The finale stays in C5, as the repo's roadmap says; until then chapter 3 won ends the game (Q-C4-01).

## Viewports and screen rules

- Viewports: Story board 1920×1080 (Samsung TV); iPad 768×1024, portrait, locked by Bob.
- iPad bottom toolbar on every iPad screen: **?** (help) at the left, the **gear** at the right. Help text is `[COPY: help, <screen>]`.
- Gear panels display on the Story board; their picks are made on the iPad. The gear never opens a panel on the iPad alone.
- No Next-only screens: every iPad screen carries a real choice, or the board advances on its own after its beat. A lone "Next" button is a failed build.
- The board is display only and never scrolls or clips (SCR-013); every story line shows on the board (SCR-014, DEC-057). One primary button per step (SCR-016).
- All story and help text is `[COPY: ...]` until the story pass.

## Out of scope

- The Tower (MEC-076), The Warden's boss battle (DEC-567), the last choice (DEC-663, DEC-664): C5.
- Final art and voice through A1, the tuning pass: C5. C4 uses placeholder paintings (Q-C4-15).
- The other five dungeon types (DEC-593), NPCs, shops, gear (DEC-502), Dracula (DEC-691), DEC-467 and DEC-469 (1.1, DEC-718).
- Final story copy: every line is `[COPY: ...]`.

## Features

| # | Feature | Kind | Depends on | Screen spec |
|---|---|---|---|---|
| 01 | [The C4 switches: Fight on, all chapters on, the C4 end rule](briefs/C4/01-tuning-switches/plan.md) | engine | C3 02, C3 09, C3 10 | no |
| 02 | [The battle loop: horn, rounds, Fight or Retreat, one action each](briefs/C4/02-battle-loop/plan.md) | engine | 01 | no |
| 03 | [Battle ends: the reward, the retreat, the group's fall](briefs/C4/03-retreat-fall-reward/plan.md) | engine | 02 | no |
| 04 | [Fight in events and scenes: foes, disasters, The Ambush, The Last Stand](briefs/C4/04-fight-in-play/plan.md) | engine | 02, 03 | no |
| 05 | [Cursed: at most 4 Advantages count in a round](briefs/C4/05-cursed/plan.md) | engine | 02, C3 08 | no |
| 06 | [The Tomb: The Barrow's rooms, traps, listening and the hidden guardian](briefs/C4/06-tomb-crawl/plan.md) | engine | 02, 03, C3 07 | no |
| 07 | [Chapters 2 and 3 in play, the seal break and the seal lines](briefs/C4/07-chapters-and-seals/plan.md) | engine | 01, 06 | no |
| 08 | [The C4 game end: chapter 3 won, or lost on any chapter](briefs/C4/08-c4-game-end/plan.md) | engine | 01, 07 | no |
| 09 | [The battle on the board: horn, foe panel, round results](briefs/C4/09-battle-board/plan.md) | screen | 02, 05, C3 11 | yes |
| 10 | [The round picker on the iPad: Fight or Retreat, then one action](briefs/C4/10-round-picker/plan.md) | screen | 02, C2 06 | yes |
| 11 | [The battle's end on screen: reward, retreat and fall](briefs/C4/11-reward-and-retreat/plan.md) | screen | 03, 09 | yes |
| 12 | [The Tomb on screen: the map and the view, the iPad's three corridors](briefs/C4/12-tomb-screens/plan.md) | screen | 06, 09 | yes |
| 13 | [The seal break live on the board, chapters 1 and 2](briefs/C4/13-seal-break-live/plan.md) | screen | 07, C3 15 | yes |
| 14 | [Fight on the event and quest scenes](briefs/C4/14-fight-buttons/plan.md) | screen | 04, C3 12, C3 14 | yes |

### Feature 01: The C4 switches: Fight on, all chapters on, the C4 end rule
- Folder: [briefs/C4/01-tuning-switches](briefs/C4/01-tuning-switches/plan.md)
- Kind: engine
- Depends on: C3 02, C3 09, C3 10, and its `approval.md` on `main`
- Touches: `packs/base/tuning.yaml`, `apps/bloodtower/src/protocols/pack-v2/base.ts` (tuning schema), `apps/bloodtower/src/engine/loops/{chapter,game}/**` (switch reads only)
- Builds: DEC-500, DEC-133
- Done-when: EV-01 … EV-06
- Open: Q-C4-01

### Feature 02: The battle loop: horn, rounds, Fight or Retreat, one action each
- Folder: [briefs/C4/02-battle-loop](briefs/C4/02-battle-loop/plan.md)
- Kind: engine
- Depends on: 01, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/battle/**` (new level), `apps/bloodtower/src/engine/rules/battle/**`
- Builds: MEC-038, MEC-024, DEC-118, DEC-129, DEC-130, DEC-643, DEC-649, DEC-650, DEC-655, DEC-607, DEC-553
- Done-when: EV-01 … EV-11
- Open: Q-C4-11

### Feature 03: Battle ends: the reward, the retreat, the group's fall
- Folder: [briefs/C4/03-retreat-fall-reward](briefs/C4/03-retreat-fall-reward/plan.md)
- Kind: engine
- Depends on: 02, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/battle/close.ts`, `apps/bloodtower/src/engine/rules/battle/reward.ts`
- Builds: DEC-120, DEC-016, DEC-177, DEC-670, DEC-671
- Done-when: EV-01 … EV-06
- Open: Q-C4-12, Q-C4-13

### Feature 04: Fight in events and scenes: foes, disasters, The Ambush, The Last Stand
- Folder: [briefs/C4/04-fight-in-play](briefs/C4/04-fight-in-play/plan.md)
- Kind: engine
- Depends on: 02, 03, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/event/**`, `apps/bloodtower/src/engine/loops/scene/**` (battle option), `packs/test/**` (The Last Stand)
- Builds: DEC-023, DEC-028, DEC-647, AREA-097
- Done-when: EV-01 … EV-08
- Open: Q-C4-02, Q-C4-03, Q-C4-04

### Feature 05: Cursed: at most 4 Advantages count in a round
- Folder: [briefs/C4/05-cursed](briefs/C4/05-cursed/plan.md)
- Kind: engine
- Depends on: 02, C3 08, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/rules/corruption/cursed.ts`, `apps/bloodtower/src/engine/rules/battle/strength.ts`
- Builds: DEC-466
- Done-when: EV-01 … EV-05
- Open: Q-C4-05, Q-C4-06

### Feature 06: The Tomb: The Barrow's rooms, traps, listening and the hidden guardian
- Folder: [briefs/C4/06-tomb-crawl](briefs/C4/06-tomb-crawl/plan.md)
- Kind: engine
- Depends on: 02, 03, C3 07, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/tomb/**` (new level), `packs/test/**` (The Barrow)
- Builds: MEC-026, DEC-593, DEC-488, DEC-489, DEC-490, DEC-491, DEC-586, DEC-587, DEC-590, DEC-602, DEC-652
- Done-when: EV-01 … EV-10
- Open: Q-C4-07, Q-C4-08, Q-C4-09

### Feature 07: Chapters 2 and 3 in play, the seal break and the seal lines
- Folder: [briefs/C4/07-chapters-and-seals](briefs/C4/07-chapters-and-seals/plan.md)
- Kind: engine
- Depends on: 01, 06, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/chapter/close.ts`, `packs/test/**` (chapter 2 and 3 cards, seal lines)
- Builds: DEC-303, DEC-306, DEC-409, AREA-097
- Done-when: EV-01 … EV-08
- Open: Q-C4-10

### Feature 08: The C4 game end: chapter 3 won, or lost on any chapter
- Folder: [briefs/C4/08-c4-game-end](briefs/C4/08-c4-game-end/plan.md)
- Kind: engine
- Depends on: 01, 07, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/game/**`, `apps/bloodtower/src/server/timing/stats.ts`
- Builds: MEC-032, DEC-144, DEC-116
- Done-when: EV-01 … EV-05
- Open: Q-C4-01

### Feature 09: The battle on the board: horn, foe panel, round results
- Folder: [briefs/C4/09-battle-board](briefs/C4/09-battle-board/plan.md)
- Kind: screen
- Depends on: 02, 05, C3 11, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/Battle*.tsx` (new), `apps/bloodtower/src/web/components/board/FoePanel.tsx` (new), `apps/bloodtower/src/e2e/tests/c4-battle.spec.ts`
- Builds: UI-026, CUE-010
- Done-when: EV-01 … EV-14
- Open: Q-C4-14, Q-C4-15, Q-C4-05, Q-C4-17

### Feature 10: The round picker on the iPad: Fight or Retreat, then one action
- Folder: [briefs/C4/10-round-picker](briefs/C4/10-round-picker/plan.md)
- Kind: screen
- Depends on: 02, C2 06, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/device/RoundPicker*.tsx` (new), `apps/bloodtower/src/e2e/tests/c4-round.spec.ts`
- Builds: UI-027
- Done-when: EV-01 … EV-10
- Open: Q-C4-16, Q-C4-11

### Feature 11: The battle's end on screen: reward, retreat and fall
- Folder: [briefs/C4/11-reward-and-retreat](briefs/C4/11-reward-and-retreat/plan.md)
- Kind: screen
- Depends on: 03, 09, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/{BattleReward,RetreatResult}.tsx` (new), `apps/bloodtower/src/web/components/device/RewardTaker.tsx` (new)
- Builds: UI-039, UI-040
- Done-when: EV-01 … EV-14
- Open: none, Q-C4-17

### Feature 12: The Tomb on screen: the map and the view, the iPad's three corridors
- Folder: [briefs/C4/12-tomb-screens](briefs/C4/12-tomb-screens/plan.md)
- Kind: screen
- Depends on: 06, 09, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/Tomb*.tsx` (new), `apps/bloodtower/src/web/components/device/TombPicker.tsx` (new)
- Builds: DEC-583, DEC-584, DEC-585, DEC-591, DEC-592
- Done-when: EV-01 … EV-16
- Open: Q-C4-08, Q-C4-15, Q-C4-17

### Feature 13: The seal break live on the board, chapters 1 and 2
- Folder: [briefs/C4/13-seal-break-live](briefs/C4/13-seal-break-live/plan.md)
- Kind: screen
- Depends on: 07, C3 15, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/SealBreak.tsx`, `apps/bloodtower/src/web/components/device/SkullPlacer.tsx`
- Builds: UI-044
- Done-when: EV-01 … EV-13
- Open: Q-C4-10, Q-C4-17

### Feature 14: Fight on the event and quest scenes
- Folder: [briefs/C4/14-fight-buttons](briefs/C4/14-fight-buttons/plan.md)
- Kind: screen
- Depends on: 04, C3 12, C3 14, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/device/{EventChoice,SceneChoice}.tsx`
- Builds: UI-041, UI-042
- Done-when: EV-01 … EV-10
- Open: Q-C4-02

## Ownership and shared rules (Sentinel review 2026-10-31)

- C4 14 owns the Fight button on every event and scene; C4 04 owns only what Fight does in the engine.
- Help: every screen feature's "?" opens a help sheet on the iPad that sends nothing to the host. Add these ids to the C2-04 help table: `battle-board`, `round-picker`, `reward-and-retreat`, `tomb-screens`, `seal-break-live`, `fight-buttons`.
- Auto-advance: every no-Next beat advances when its narration or cue ends, or after 4 s with no audio (Q-C4-17 (Gamewright pick, pending Bob)). Each screen spec lists its beats.
- The group's Fight or Retreat pick (C4 10): the first press on any present iPad decides.
- Engine-only features have no screen-spec.md.

## Batches

- G0: Bob approves this plan and the questions list; then each folder's evals and mockups.
- B1: 01, then 02 (the battle loop is the spine).
- B2: 03, 05 and 06 beside each other (different folders).
- B3: 04 and 07, then 08.
- B4: 09 and 10, then 11, 12, 13, 14.
- G-C4.

## Risks

- **Balance with Fight on.** DEC-703's numbers were set with Fight hidden; C4 runs on them anyway (DEC-500) and C5's tuning pass fixes them.
- **The Tomb is the largest slice.** Feature 06 may split in review (rooms and listening / guardian and Signet), as `docs/sdlc.md` allows.
- **A temporary end rule.** `c4_end_after_chapter_3` is a second throwaway switch; C5 04 removes both.

## Gaps this plan closes (`pnpm graph gaps`, 1.0)

MEC-024, MEC-038, MEC-026, UI-026, UI-027, UI-039, UI-040, CUE-010, DEC-466 and the Tomb's AREA-094 rulings. The Tower gaps stay for C5. The builder confirms with `pnpm graph gaps`.

## OPEN questions (consolidated)

Every pick below is used in the feature files as "(Gamewright pick, pending Bob)". **[Bob taste call]** marks the ones that are Bob's taste, not a rules call.

- OPEN Q-C4-01: What ends a C4 game won, before the C5 finale exists? Options: (a) chapter 3 won (The Lock and The Last Stand done) ends the game won, behind tuning switch `c4_end_after_chapter_3` (on in C4, off in C5), with the DEC-144 win scene and `[COPY: chapter 3 win, Loremaster = "The Lock is turned and the last stand held. The Warden's door is open, for now."]`; (b) chapter 3 has no end: the game plays until it is lost, and the win is tested only by fixture until C5. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 01, C4 08)
- OPEN Q-C4-02: Where does Fight show once `fight_enabled` is on? Options: (a) on every foes and disaster event and on every plain-scene option that holds a battle, always enabled; (b) on foes events only; disasters stay Go around / Pay them off until C5. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 04, C4 14)
- OPEN Q-C4-03: The disaster event's boss-level foe (DEC-028): what level in 1.0? Options: (a) level 4, one under The Warden's 5, as `events.disaster_foe_level` in base tuning; (b) level 5, The Warden's level. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 04)
- OPEN Q-C4-04: The Ambush with Fight on (DEC-662): keep the C3 short-purse toll rule (Q-C3-22)? Options: (a) keep it: Fight or pay the toll; a short group still pays all gold + 2 HP per present hero; (b) drop it: a short group must Fight. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 04)
- OPEN Q-C4-05: Cursed (DEC-466): does the board show which 4 Advantages counted? Options: (a) yes: the hero panel shows "4 of N count" and dims the rest during the round; (b) no: the app picks silently; only the round result shows. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 05, C4 09)
- OPEN Q-C4-06: Cursed in the corruption draw (Q-C3-15's seeded set): Options: (a) from C4 the set includes Cursed for every draw (battle, event, scene); (b) Cursed is drawn only when a hero falls in battle. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 05)
- OPEN Q-C4-07: The Barrow's guardian (the dead garrison, DEC-662): what level? Options: (a) level 3, as `tomb.guardian_level` in base tuning; (b) level 4. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 06)
- OPEN Q-C4-08: How many rooms does a 1.0 Tomb deal (DEC-491)? Options: (a) 7 rooms, guardian hidden in one of the last 3; (b) 5 rooms; (c) 9 rooms. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 06, C4 12)
- OPEN Q-C4-09: Listening at a corridor (DEC-586): how often does the hint lie? Options: (a) 1 in 4 (`tomb.listen_lie` = 0.25); (b) 1 in 3. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 06)
- OPEN Q-C4-10 **[Bob taste call]**: Who speaks the seal-break line at each chapter win? Options: (a) the Loremaster, one line per chapter: `[COPY: seal break ch1, Loremaster = "The roads are clear and a seal breaks. Ahead stands the Ruined Keep."]`, `[COPY: seal break ch2, Loremaster = "The Keep gives up its dead, and a second seal cracks. The Tower waits."]`, `[COPY: seal break ch3, Loremaster = "The last stand holds, and the third seal breaks. Only the Warden remains."]`; (b) the Narrator, one shared line `[COPY: seal break, Narrator]`. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 07, C4 13)
- OPEN Q-C4-11 **[Bob taste call]**: Does a battle round have a timer on the iPads? Options: (a) no timer; the round waits for every present hero; (b) 30 seconds, then a missing pick becomes a normal attack (DEC-129). Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 02, C4 10)
- OPEN Q-C4-12: A fallen group's gold loss (DEC-177): how much? Options: (a) half the purse, rounded down, as `battle.fall_gold_loss` = 0.5; (b) a flat 10 gold, never below 0. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 03)
- OPEN Q-C4-13: A foe that stays and grows (DEC-016): is the growth capped? Options: (a) capped at +2 levels over its start; (b) no cap. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 03)
- OPEN Q-C4-14: The battle horn and hits (CUE-010) with no tower connected: Options: (a) play them through the Story board's speakers; (b) silent; the board shows the hit only. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 09)
- OPEN Q-C4-15 **[Bob taste call]**: Foe paintings in C4, before the A1 art run (C5): Options: (a) one placeholder painting per foe level, swapped by A1 in C5; (b) A1 draft art now, as the art lands. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 09, C4 12)
- OPEN Q-C4-16 **[Bob taste call]**: Round actions on the iPads (DEC-129): all at once or in turn? Options: (a) all at once; the board ticks each hero who has picked, and the round runs when all have; (b) in turn order, one iPad at a time. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 10)
- OPEN Q-C4-17: Does the C2-04 auto-advance rule (advance when narration or cue ends, or after 4 s with no audio) also apply to battle round results and Reveals? Options: (a) yes, every beat in C4 and C5 (round results, victory, reward/retreat/fall, trap, close Scroll, glyph/boon Reveal, boss phase show, win line) follows it; (b) battle beats wait for a press on any iPad; (c) round results hold 2 s, other beats follow the rule. Gamewright pick: (a) (Gamewright pick, pending Bob). (features C4 09, 11, 12, 13; C5 08, 09)

## Results

- (none yet)

> Note (Q-C4-10): the docs use pick (a), the Loremaster per chapter. If Bob picks (b), the Narrator line kept for it is: "A seal breaks. The tower shudders."
