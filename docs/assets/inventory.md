# Bloodtower asset inventory

Identification only. Nothing here makes, approves or changes any art, voice or text. Read from `bpaksi/bloodtower` main at `f1ddb6a` (2026-11-26).

## How to read this

**Needs** come from `apps/bloodtower/spec.md` (screens, D20), each pack's `pack.yaml` and script files, `apps/bloodtower/plans/briefs/C5/05-art-through-a1/approval.md` (the 43 Ruined Keep ids), `apps/bloodtower/plans/visuals-prompts.md` ("Missing Illusionist assets", lines 13–20), and asset ids or asset paths named in code (`apps/bloodtower/src`, tests excluded). For Dracula, `packs/dracula/pack.yaml` has no `assets:` list, so the picture needs come from `research/game-design/specs/dracula/D-06-art-and-vo.md` (111 ids) and the lines from `research/game-design/specs/dracula/D-06-vo-manifest.md` (255 lines). For the Ruined Keep, the `used by` column and the line text come from `research/game-design/specs/C5-05-ruined-keep-art.md` and `research/stories/ruined-keep/script.md`.

**Exists** is the files in `packs/*/assets/`, `apps/bloodtower/public/`, `apps/bloodtower/src/web/public/` and `assets/app-icon/`, plus the `status` on each `assets:` entry in `pack.yaml`.

**State** is one of these:
- **final**, **draft** or **placeholder**: the `status` declared in `pack.yaml`. For UI files, the status in their own manifest.
- **missing file**: something needs the asset, but no file exists and `pack.yaml` doesn't declare it.
- **not declared**: the file exists, but no `pack.yaml` entry or manifest gives it a status.

A placeholder that has no file is marked "(no file)".

**Blocked on** is one of these:
- **final text**: the words aren't final yet.
- **Bob's art hold**: no paid image or voice run, and no final, until Bob lifts the Nov 8 hold and ticks each final (see `apps/bloodtower/plans/catchup/design-freeze.md:23`, and C5-05 line 3).
- **nothing**.

**Paths that don't exist** (checked, not guessed):
- `packs/test/assets/index.json`. `approval.md:10` says its checklist has "one line per asset id in `packs/test/assets/index.json`", and `eval.md:36` and `:45` check against it.
- `packs/base/assets/`. C5-05 SD-01 (line 118) puts the three listen sounds there.
- `packs/dracula/assets/index.json`.
- `packs/*/audio/`. `apps/bloodtower/src/web/lib/audio/tracks.ts:36-39` names four `packs/test/audio/*.m4a` files.
- `packs/test/assets/grey-stair-04.png` and `packs/test/assets/grey-stair-04-glow.png`, named in `apps/bloodtower/src/web/components/board/OpeningMoment.tsx:18-19`.
- `packs/dracula` has no `assets:` block, and `packs/test` has no `quests.yaml`.

## Totals

| Pack | Total | Final | Draft | Placeholder | Missing file | Not declared |
|---|---|---|---|---|---|---|
| packs/base | 9 | 0 | 0 | 6 (no file) | 3 | 0 |
| packs/test (The Ruined Keep) | 50 | 0 | 4 | 13 (no file) | 32 | 1 |
| packs/dracula: pictures | 112 | 0 | 0 | 0 | 5 | 107 |
| packs/dracula: voice lines (D-06 manifest) | 255 | 0 | 0 | 0 | 255 | 0 |
| UI (app-level) | 15 file rows (64 files) + 2 code-only rows | 1 row (Keeper avatar, 14 files) | 0 | 0 | 0 | 14 rows |

Not counted above:
- the 152 Dracula mouth ids in `cast.yaml` (they wait for asset-studio 0.3, DEC-843; D-06:181)
- the 346 old-plot lines in `packs/dracula/script.yaml`, which D-06:254 says to retire
- the 17 deferred Long lines

---

## 1. Tables

### packs/base

| asset id | type | used by | state | blocked on |
|---|---|---|---|---|
| `portrait.hero-a` … `portrait.hero-f` (6) | portrait | Claim Heroes, the hunter roll and iPad cards (`PortraitCard.tsx`; `pack.yaml:17,27,37,47,57,67`) | placeholder (no file) (`pack.yaml:95-100`) | final text (hero names are still "Hero A"–"Hero F") and Bob's art hold |
| ~~`vo.hero-a` … `vo.hero-f` (6)~~ | voice line | retired from 1.0. **Ruled 2026-11-26 (Bob):** heroes are not voiced; only the Loremaster is (DEC-099). The asset entries are removed; each hero keeps its `voice:` id (`pack.yaml:18,28,38,48,58,68`) because the schema still requires it | retired (not counted) | nothing |
| `snd.listen-nothing` | effect | Tomb listen, no room (C5-05:108; engine default, DEC-618) | missing file | Bob's art hold |
| `snd.listen-trap` | effect | Tomb listen, trap (C5-05:109) | missing file | Bob's art hold |
| `snd.listen-battle` | effect | Tomb listen, battle (C5-05:110) | missing file | Bob's art hold |

### packs/test: The Ruined Keep

The 43 ids from `approval.md:12-54`, then the assets that code needs.

| asset id | type | used by | state | blocked on |
|---|---|---|---|---|
| `place.village` | place | Building menu and place caption (`placeCaption.ts:7`) | draft (`pack.yaml:198`, `assets/place-village.jpg`) | Bob's art hold (approval line 12 not ticked; A1 step 6 import, DEC-388) |
| `place.bazaar` | place | Building menu and place caption (`placeCaption.ts:8`) | draft (`pack.yaml:199`, `assets/place-bazaar.jpg`) | Bob's art hold (approval line 13 not ticked; A1 step 6 import, DEC-388, recropped to 16:9 at 1920×1080 on import (DEC-347)) |
| `place.citadel` | place | Building menu and place caption (`placeCaption.ts:9`) | draft (`pack.yaml:200`, `assets/place-citadel.jpg`) | Bob's art hold (approval line 14 not ticked; A1 step 6 import, DEC-388) |
| `place.sanctuary` | place | Building menu and place caption (`placeCaption.ts:10`) | draft (`pack.yaml:201`, `assets/place-sanctuary.jpg`) | Bob's art hold (approval line 15 not ticked; A1 step 6 import, DEC-388) |
| `painting.ch1-the-roads` | painting | Chapter 1 card (C5-05:23) | missing file | Bob's art hold |
| `painting.ch2-the-keep` | painting | Chapter 2 card (C5-05:24) | missing file | Bob's art hold |
| `painting.ch3-the-tower` | painting | Chapter 3 card (C5-05:25) | missing file | Bob's art hold |
| `foe.level-1` | foe | Chapter 1 battles, The Ambush (C5-05:47) | missing file | Bob's art hold |
| `foe.level-2` | foe | Chapter 2 battles (C5-05:48) | missing file | Bob's art hold |
| `foe.level-3` | foe | The Last Stand, Tower guards (C5-05:49) | missing file | Bob's art hold |
| `foe.level-4` | foe | Capped battles (C5-05:50) | missing file | Bob's art hold |
| `foe.warden~phase-1` | foe | Boss screen, phase 1; also his only likeness (C5-05:58, 180) | missing file | Bob's art hold |
| `foe.warden~phase-2` | foe | Boss screen, phase 2 (C5-05:59) | missing file | Bob's art hold |
| `foe.warden~phase-3` | foe | Boss screen, phase 3 (C5-05:60) | missing file | Bob's art hold |
| `foe.keep-garrison` | foe | The Barrow's guardian, inside the Tomb (C5-05:52) | missing file | Bob's art hold |
| `painting.keep-crypt~left-corridor` | painting | Tomb view half; also the Tower room view (C5-05:75, 190) | missing file | Bob's art hold |
| `painting.keep-crypt~left-wall` | painting | Tomb view half (C5-05:76) | missing file | Bob's art hold |
| `painting.keep-crypt~ahead-corridor` | painting | Tomb view half (C5-05:75) | missing file | Bob's art hold |
| `painting.keep-crypt~ahead-wall` | painting | Tomb view half (C5-05:76) | missing file | Bob's art hold |
| `painting.keep-crypt~right-corridor` | painting | Tomb view half (C5-05:75) | missing file | Bob's art hold |
| `painting.keep-crypt~right-wall` | painting | Tomb view half (C5-05:76) | missing file | Bob's art hold |
| `painting.keep-sealed-door` | painting | The Lock scene (C5-05:26) | missing file | Bob's art hold |
| `painting.trap-pit` | painting | Tomb trap, pit (C5-05:80) | missing file | Bob's art hold |
| `painting.trap-falling-rocks` | painting | Tomb trap, rocks (C5-05:81) | missing file | Bob's art hold |
| `painting.tower-basement-map` | painting | Tower level map half (C5-05:93) | missing file | Bob's art hold |
| `painting.tower-main-map` | painting | Tower level map half (C5-05:93) | missing file | Bob's art hold |
| `painting.tower-top-map` | painting | Tower level map half (C5-05:93) | missing file | Bob's art hold |
| `painting.finale-win` | painting | Win scene, both endings (C5-05:27) | missing file | Bob's art hold |
| `painting.finale-loss` | painting | Loss scene, all three causes (C5-05:28) | missing file | Bob's art hold |
| `chapter-card.01~vo-01` | voice line | Chapter 1 card (C5-05:156; script.md:37) | placeholder (no file) (`pack.yaml:207`) | Bob's art hold |
| `chapter-card.02~vo-01` | voice line | Chapter 2 card (C5-05:157; script.md:83) | placeholder (no file) (`pack.yaml:208`) | Bob's art hold |
| `chapter-card.03~vo-01` | voice line | Chapter 3 card (C5-05:158; script.md:129) | placeholder (no file) (`pack.yaml:209`) | Bob's art hold |
| `chapter-win.01~vo-01` | voice line | Chapter 1 win (C5-05:159; script.md:70) | placeholder (no file) (`pack.yaml:210`) | Bob's art hold |
| `chapter-win.03~vo-01` | voice line | Chapter 3 win (C5-05:162; script.md:160) | placeholder (no file) (`pack.yaml:211`) | Bob's art hold |
| `seal-break.01~vo-01` | voice line | Seal break, ch 1; demo line (`demoLine.ts`) (C5-05:160) | placeholder (no file) (`pack.yaml:204`) | Bob's art hold |
| `seal-break.02~vo-01` | voice line | Seal break, ch 2 (C5-05:161; script.md:117) | placeholder (no file) (`pack.yaml:212`) | Bob's art hold |
| `seal-break.03~vo-01` | voice line | Seal break, ch 3 (C5-05:163; script.md:161) | placeholder (no file) (`pack.yaml:213`) | Bob's art hold |
| `finale-win.shattered~vo-01` | voice line | Win, the seal shattered (C5-05:164; script.md:183) | placeholder (no file) (`pack.yaml:214`) | Bob's art hold |
| `finale-win.oath~vo-01` | voice line | Win, the oath (C5-05:165; script.md:184) | placeholder (no file) (`pack.yaml:215`) | Bob's art hold |
| `finale-loss.skulls~vo-01` | voice line | Loss, skulls (C5-05:174; script.md:186) | placeholder (no file) (`pack.yaml:216`) | Bob's art hold |
| `finale-loss.corruption~vo-01` | voice line | Loss, corruption (C5-05:175; script.md:187) | placeholder (no file) (`pack.yaml:217`) | Bob's art hold |
| `finale-loss.fallen-buildings~vo-01` | voice line | Loss, fallen buildings (C5-05:176; script.md:188) | placeholder (no file) (`pack.yaml:218`) | Bob's art hold |
| `painting.cover` | painting | Pick Story card and the demo line backdrop (`demoLine.ts:17`; `needs/build.ts:191-195`) | not declared (`assets/cover.png`, via `pack.yaml:5` `cover:`) | Bob's art hold (approval line 54 not ticked) |
| `glow.cover` | effect | Cover glow mask on Pick Story and the demo line (`demoLine.ts:18`; `needs/build.ts:191`) | missing file | Bob's art hold |
| `grey-stair-04.png` (no id) | painting | `OpeningMoment.tsx:18`, the `grey-stair.04` motion still | missing file | nothing: stale, since no pack has a `grey-stair` moment |
| `grey-stair-04-glow.png` (no id) | effect | `OpeningMoment.tsx:19` | missing file | nothing: stale, as above |
| `startup-ambient.m4a` | ambience | Startup mood (`tracks.ts:36`) | missing file | Bob's art hold |
| `night1-ambient.m4a` | ambience | Night 1 mood (`tracks.ts:37`) | missing file | Bob's art hold |
| `night2-ambient.m4a` | ambience | Night 2 mood (`tracks.ts:38`) | missing file | Bob's art hold |
| `pg-music.m4a` | ambience | Waiting music (`tracks.ts:39`) | missing file | Bob's art hold |

### packs/dracula: The Count of Vellmoor (`playable: false`, `pack.yaml:15`)

Pictures: the 111 ids in D-06, plus the old cover file. None is declared, since `pack.yaml` has no `assets:` block.

| asset id | type | used by | state | blocked on |
|---|---|---|---|---|
| `painting.opening` | painting | `opening.01`–`.06` (D-06:72) | not declared | Bob's art hold |
| `painting.ch1-the-mists` | painting | `chapter-card.01` (D-06:73) | not declared | Bob's art hold |
| `painting.n1-lantern-and-bell` | painting | `n1-lantern-and-bell` (D-06:74) | not declared | Bob's art hold |
| `painting.n1-burgomasters-house` | painting | `n1-burgomasters-house` (D-06:75) | not declared | Bob's art hold |
| `painting.n1-long-night` | painting | `n1-long-night` (D-06:76) | not declared | Bob's art hold |
| `painting.n1-fortune-reading` | painting | `n1-fortune-reading` (D-06:77) | not declared | Bob's art hold |
| `painting.vellmoor-map` | painting | The opening and the Reading (map half) (D-06:78) | not declared | Bob's art hold |
| `item.come-home-letter` | picture | The Reveal at `n1-burgomasters-house` (D-06:79) | not declared | Bob's art hold |
| `foe.level-1` | foe | Chapter 1 battles, the Long Night's Hold (D-06:80) | not declared | Bob's art hold |
| `place.village` | place | Building menu (UI-043), every turn (D-06:81) | not declared | Bob's art hold |
| `place.bazaar` | place | Building menu (UI-043), every turn (D-06:82) | not declared | Bob's art hold |
| `place.citadel` | place | Building menu (UI-043), every turn (D-06:83) | not declared | Bob's art hold |
| `place.sanctuary` | place | Building menu (UI-043), every turn (D-06:84) | not declared | Bob's art hold |
| `painting.ch2-the-hunt` | painting | `chapter-card.02` (D-06:90) | not declared | Bob's art hold |
| `painting.ch3-the-truth` | painting | `chapter-card.03` (D-06:91) | not declared | Bob's art hold |
| `painting.n23-sergius-blade` | painting | `n23-sergius-blade` opening (D-06:92) | not declared | Bob's art hold |
| `painting.n23-catacombs-of-saint-ysolde` | painting | `n23-catacombs-of-saint-ysolde` opening (D-06:93) | not declared | Bob's art hold |
| `painting.n4-finding-the-tome` | painting | `n4-finding-the-tome` (D-06:94) | not declared | Bob's art hold |
| `painting.blade-tomb~left-corridor` | painting | Tomb view half (DEC-583) (D-06:95) | not declared | Bob's art hold |
| `painting.blade-tomb~ahead-corridor` | painting | Tomb view half (DEC-583) (D-06:96) | not declared | Bob's art hold |
| `painting.blade-tomb~right-corridor` | painting | Tomb view half (DEC-583) (D-06:97) | not declared | Bob's art hold |
| `painting.blade-tomb~left-wall` | painting | Tomb view half (DEC-583) (D-06:98) | not declared | Bob's art hold |
| `painting.blade-tomb~ahead-wall` | painting | Tomb view half (DEC-583) (D-06:99) | not declared | Bob's art hold |
| `painting.blade-tomb~right-wall` | painting | Tomb view half (DEC-583) (D-06:100) | not declared | Bob's art hold |
| `painting.ysolde-catacombs~left-corridor` | painting | Tomb view half (DEC-583) (D-06:101) | not declared | Bob's art hold |
| `painting.ysolde-catacombs~ahead-corridor` | painting | Tomb view half (DEC-583) (D-06:102) | not declared | Bob's art hold |
| `painting.ysolde-catacombs~right-corridor` | painting | Tomb view half (DEC-583) (D-06:103) | not declared | Bob's art hold |
| `painting.ysolde-catacombs~left-wall` | painting | Tomb view half (DEC-583) (D-06:104) | not declared | Bob's art hold |
| `painting.ysolde-catacombs~ahead-wall` | painting | Tomb view half (DEC-583) (D-06:105) | not declared | Bob's art hold |
| `painting.ysolde-catacombs~right-wall` | painting | Tomb view half (DEC-583) (D-06:106) | not declared | Bob's art hold |
| `painting.trap-pit` | painting | Tomb trap (DEC-606) (D-06:107) | not declared | Bob's art hold |
| `painting.trap-falling-rocks` | painting | Tomb trap (DEC-606) (D-06:108) | not declared | Bob's art hold |
| `foe.level-2` | foe | Chapter 2 battles (D-06:109) | not declared | Bob's art hold |
| `foe.level-3` | foe | Chapter 3 battles, the castle guards' fallback (D-06:110) | not declared | Bob's art hold |
| `foe.werewolf` | foe | The blade's Tomb guardian (D-06:111) | not declared | Bob's art hold |
| `foe.catacomb-wights` | foe | The Catacombs' guardian (D-06:112) | not declared | Bob's art hold |
| `foe.vampire-spawn` | foe | Chapter 3 battles (D-06:113) | not declared | Bob's art hold |
| `foe.count~silhouette` | foe | Strike skirmishes (Fight), chapters 2 and 3 (D-06:114) | not declared | Bob's art hold |
| `painting.count-strike~replace-a-hero` | painting | The strike scene for the goal (D-04 §4) (D-06:115) | not declared | Bob's art hold |
| `painting.count-strike~win-lenka` | painting | The strike scene for the goal (D-04 §4) (D-06:116) | not declared | Bob's art hold |
| `painting.count-strike~destroy-the-blade` | painting | The strike scene for the goal (D-04 §4) (D-06:117) | not declared | Bob's art hold |
| `painting.count-strike~darkness` | painting | The strike scene for the goal (D-04 §4) (D-06:118) | not declared | Bob's art hold |
| `painting.count-takes-lenka` | painting | `count-takes-lenka` (D-06:119) | not declared | Bob's art hold |
| `painting.nx-pressed-flower` | painting | `nx-pressed-flower` (D-06:120) | not declared | Bob's art hold |
| `painting.nx-midnight-procession` | painting | `nx-midnight-procession` (D-06:121) | not declared | Bob's art hold |
| `item.sergiu-blade` | picture | Reveal (UI-036) (D-06:122) | not declared | Bob's art hold |
| `item.lantern-of-saint-ysolde` | picture | Reveal (UI-036) (D-06:123) | not declared | Bob's art hold |
| `item.ludmila-tome` | picture | Reveal (UI-036) (D-06:124) | missing file | Bob's art hold (not rendered) |
| `item.holy-water` | picture | Reveal (UI-036) (D-06:125) | not declared | Bob's art hold |
| `item.host` | picture | Reveal (UI-036) (D-06:126) | not declared | Bob's art hold |
| `item.pressed-flower` | picture | Reveal (UI-036) (D-06:127) | not declared | Bob's art hold |
| `painting.ch4-the-castle` | painting | `chapter-card.04` (D-06:133) | not declared | Bob's art hold |
| `painting.n5-drawbridge` | painting | `n5-drawbridge` (D-06:134) | not declared | Bob's art hold |
| `painting.tower-opening` | painting | `tower-opening` (D-06:135) | not declared | Bob's art hold |
| `painting.castle-basement-map` | painting | Castle map half (C5-07) (D-06:136) | not declared | Bob's art hold |
| `painting.castle-main-map` | painting | Castle map half (C5-07) (D-06:137) | not declared | Bob's art hold |
| `painting.castle-tower-map` | painting | Castle map half (C5-07) (D-06:138) | not declared | Bob's art hold |
| `painting.castle-halls~left-corridor` | painting | Dealt castle rooms' view half (D-06:139) | not declared | Bob's art hold |
| `painting.castle-halls~ahead-corridor` | painting | Dealt castle rooms' view half (D-06:140) | not declared | Bob's art hold |
| `painting.castle-halls~right-corridor` | painting | Dealt castle rooms' view half (D-06:141) | not declared | Bob's art hold |
| `painting.castle-halls~left-wall` | painting | Dealt castle rooms' view half (D-06:142) | not declared | Bob's art hold |
| `painting.castle-halls~ahead-wall` | painting | Dealt castle rooms' view half (D-06:143) | not declared | Bob's art hold |
| `painting.castle-halls~right-wall` | painting | Dealt castle rooms' view half (D-06:144) | not declared | Bob's art hold |
| `painting.n5-flooded-room` | painting | Fixed castle room view (D-02 §5) (D-06:145) | not declared | Bob's art hold |
| `painting.n5-the-swap` | painting | Fixed castle room view (D-02 §5) (D-06:146) | not declared | Bob's art hold |
| `painting.n5-banquet` | painting | Fixed castle room view (D-02 §5) (D-06:147) | not declared | Bob's art hold |
| `painting.n5-portrait-gallery` | painting | Fixed castle room view (D-02 §5) (D-06:148) | not declared | Bob's art hold |
| `painting.n5-heart-of-sorrow` | painting | Fixed castle room view (D-02 §5) (D-06:149) | not declared | Bob's art hold |
| `painting.lair~family-crypt` | painting | `n5-final-confrontation~family-crypt`, the boss room (D-06:150) | not declared | Bob's art hold |
| `painting.lair~ludmilas-chapel` | painting | `n5-final-confrontation~ludmilas-chapel`, the boss room (D-06:151) | missing file | Bob's art hold (not rendered) |
| `painting.lair~the-height` | painting | `n5-final-confrontation~the-height`, the boss room (D-06:152) | not declared | Bob's art hold |
| `painting.lair~his-study` | painting | `n5-final-confrontation~his-study`, the boss room (D-06:153) | not declared | Bob's art hold |
| `foe.level-4` | foe | Hard-mode and capped battles (D-06:154) | not declared | Bob's art hold |
| `foe.drowned-dead` | foe | The Flooded Room's guard (D-06:155) | not declared | Bob's art hold |
| `foe.banquet-statues` | foe | The Banquet's guard (D-06:156) | not declared | Bob's art hold |
| `foe.wight-double` | foe | The Swap's guard (D-06:157) | not declared | Bob's art hold |
| `foe.heart-of-sorrow` | foe | The Heart of Sorrow, level 4 (DEC-879) (D-06:158) | not declared | Bob's art hold |
| `foe.count~phase-1` | foe | The boss battle in the lair (C5-08) (D-06:159) | not declared | Bob's art hold |
| `foe.count~phase-2` | foe | The boss battle in the lair (C5-08) (D-06:160) | not declared | Bob's art hold |
| `foe.count~phase-3` | foe | The boss battle in the lair (C5-08) (D-06:161) | not declared | Bob's art hold |
| `painting.finale-win~rescued` | painting | `finale-win.rescued` (D-06:162) | not declared | Bob's art hold |
| `painting.finale-win~lenka-lost` | painting | `finale-win.lenka-lost` (D-06:163) | not declared | Bob's art hold |
| `painting.finale-loss~turned` | painting | `finale-loss.turned` (D-06:164) | not declared | Bob's art hold |
| `painting.finale-loss~valley-falls` | painting | `finale-loss.valley-falls` (D-06:165) | not declared | Bob's art hold |
| `painting.finale-loss~houses-fall` | painting | `finale-loss.houses-fall` (D-06:166) | not declared | Bob's art hold |
| `painting.cover` | painting | Story picker and pack cover (D-06:167) | not declared | Bob's art hold |
| `glow.cover` | effect | Story picker (D-06:168) | not declared | Bob's art hold |
| `painting.n1-open-grave` | painting | `n1-open-grave` (Standard) (D-06:174) | not declared | Bob's art hold |
| `painting.n2-burgomasters-funeral` | painting | `n2-burgomasters-funeral` (Standard) (D-06:175) | not declared | Bob's art hold |
| `painting.n3-fly-eaters-cell` | painting | `n3-fly-eaters-cell` (Standard) (D-06:176) | not declared | Bob's art hold |
| `painting.n4-earth-boxes` | painting | `n4-earth-boxes` (Standard) (D-06:177) | not declared | Bob's art hold |
| `item.funeral-nail` | picture | The Funeral's Reveal: the nail, a Ward item (D-02 G-12; Standard) (D-06:178) | not declared | Bob's art hold |
| `item.oskar-riddle` | picture | The Open Grave's Reveal (Standard) (D-06:179) | not declared | Bob's art hold |
| `portrait.lenka` | portrait | Speaker portrait for voiced lines (D-06:185) | not declared | Bob's art hold |
| `portrait.lenka~revealed` | portrait | Her voiced lines after the reveal (D-06:186) | not declared | Bob's art hold |
| `portrait.agnes` | portrait | Speaker portrait for voiced lines (D-06:187) | not declared | Bob's art hold |
| `portrait.wren` | portrait | Speaker portrait for voiced lines (D-06:188) | not declared | Bob's art hold |
| `portrait.emeric` | portrait | Speaker portrait for voiced lines (D-06:189) | not declared | Bob's art hold |
| `portrait.vadoma` | portrait | Speaker portrait for voiced lines (D-06:190) | not declared | Bob's art hold |
| `portrait.hanne` | portrait | Speaker portrait for voiced lines (D-06:191) | not declared | Bob's art hold |
| `portrait.jakob` | portrait | Speaker portrait for voiced lines (D-06:192) | not declared | Bob's art hold |
| `portrait.marta` | portrait | Speaker portrait for voiced lines (D-06:193) | missing file | Bob's art hold (not rendered) |
| `portrait.andrei` | portrait | Speaker portrait for voiced lines (D-06:194) | not declared | Bob's art hold |
| `portrait.anton` | portrait | Speaker portrait for voiced lines (D-06:195) | not declared | Bob's art hold |
| `portrait.oskar` | portrait | Speaker portrait for voiced lines (D-06:196) | not declared | Bob's art hold |
| `portrait.dorka` | portrait | Speaker portrait for voiced lines (D-06:197) | not declared | Bob's art hold |
| `portrait.ursula` | portrait | Speaker portrait for voiced lines (D-06:198) | not declared | Bob's art hold |
| `portrait.jozef` | portrait | Speaker portrait for voiced lines (D-06:199) | not declared | Bob's art hold |
| `portrait.gerhardt` | portrait | Speaker portrait for voiced lines (D-06:200) | not declared | Bob's art hold |
| `portrait.ludmila` | portrait | Her voiced line (D-06:206) | missing file | Bob's art hold (on hold in D-06) |
| `painting.n5-lift` | painting | Tower level room 1 (D-06:207) | missing file | Bob's art hold (on hold in D-06) |
| `cover.png` (old file, no id) | painting | Pick Story card, because `pack.yaml:6` sets `cover: assets/cover.png` | not declared | Bob's art hold (D-06:44 says the oil `painting.cover` replaces it) |

Other Dracula needs, grouped:

| asset id | type | used by | state | blocked on |
|---|---|---|---|---|
| D-06 manifest group 1, `opening.*` and `chapter-card.0[1-4]~vo-01` (10) | voice line | Opening and chapter cards (D-06-vo-manifest:5) | missing file | final text (DRAFT, DEC-785 / OPEN RULING 6) |
| Group 2, `finale-win.*` and `finale-loss.*` (23) | voice line | Endings (manifest:20) | missing file | final text |
| Group 3, system moments: `seal-break`, `chapter-win`, `count-strike`, `count-takes-lenka`, `count-withdraws`, `tower-opening` and 9 `enc-*` (28) | voice line | System moments (manifest:48) | missing file | final text |
| Group 4, new scenes: `n1-long-night`, `n5-banquet`, `n5-castle-moment`, `n5-heart-of-sorrow`, `n5-the-swap` (39) | voice line | New scenes (manifest:81) | missing file | final text |
| Group 5, the 15 rewritten scenes `n1-*` … `nx-*` (148) | voice line | Scene moments (manifest:125) | missing file | final text |
| Group 6, D-04 copy: `traitor.*` (7) | voice line | Traitor moments (manifest:278) | missing file | final text |
| `m.<cast>.{rest,mbp,cons_ee,eh_ae,ah,oh_er,oo_w,fv}` (152 = 19 portrait ids × 8) | portrait (mouths) | Talking avatars (`cast.yaml`, every entry) | missing file | Bob's art hold (mouths wait for asset-studio 0.3, D-06:181) |
| `por.<cast>` (19 ids in `cast.yaml`) | portrait | Speaker portraits | not declared. 14 match a `portrait.<cast>.webp` file in name only. `por.count`, `por.ilka`, `por.ludmila`, `por.marta` and `por.narrator` have no file | Bob's art hold |

### UI (app-level, not in a pack)

Screens are from spec.md D20 (`spec.md:35`): splash, tower-connect, pick-story, party-join (Claim Heroes), begin, play, quit. Paths are under `apps/bloodtower/public/` unless noted.

| asset id (path) | type | used by | state | blocked on |
|---|---|---|---|---|
| `landing/hero.webp` | picture | Title and landing, board backdrop, Tower Connect still (`title-screen.css:24`, `board.css:1068,2722`, `StartupBoard.tsx:191`) | not declared | nothing |
| `landing/window-mask/window-mask.png` | UI | Landing window glow mask (`boardWindowMask.ts:6`) | not declared | nothing |
| `landing/window-mask/window-glow-{a,b,c,d}.png` (4) | effect | Landing window flicker (`boardWindowMask.ts:21-24`) | not declared | nothing |
| `landing/window-mask/window-mask.svg`, `window-mask-{a,b,c,d}.png`, `window-mask-sections.png`, `window-glow.png` (7) | UI | nothing in code (README only) | not declared | nothing |
| `board/dialog-frame/dialog-frame.svg` | UI | Every centred board dialog (`board.css:1910`; `DialogFrame.tsx:232`) | not declared | nothing |
| `board/dialog-frame/dialog-parchment.webp` | UI | Dialog parchment tile (`board.css:1918`) | not declared | nothing |
| `board/dialog-frame/dialog-frame.png`, `dialog-frame@2x.png` (2) | UI | nothing in code (README only) | not declared | nothing |
| `ipad/corners/corner-{tl,tr,bl,br}.png` (4) | UI | iPad screen corners (`IpadCorners.tsx:16`) | not declared | nothing |
| `ipad/b-engraved-ipad-move-map.jpg` | UI | Tests only (a mock reference, `ipadCorners.test.ts:11`) | not declared | nothing |
| `audio/signature/signature-bed.m4a` | ambience | From landing through Sound and Pick Game (`tracks.ts:21`) | not declared | nothing |
| `audio/signature/motif-sting.m4a` | effect | First board click, and the voice test clip (`tracks.ts:23`) | not declared | nothing |
| `audio/signature/motif-soft.m4a` | effect | A game is chosen (`tracks.ts:25`) | not declared | nothing |
| `avatars/keeper/` (portrait, anchor, 8 mouths, 3 lines `ts-keeper-001..003`) (13 + manifest) | portrait and voice line | Keeper scene at `grey-stair.03` (`keeperLines.ts:4`, `OpeningMoment.tsx:177`); `portrait.png` also on the title screen (`TitleScreen.tsx:101`) | final (`manifest.json` `"status": "approved"`) | nothing (but no pack plays `grey-stair.03` now) |
| `src/web/public/fonts/*.ttf` (6), plus the same 6 in `src/web/app/fonts/` | UI | Board and iPad type (`styles/game-tokens.css:4-24`; `app/fonts.ts:10-11`) | not declared | nothing |
| `assets/app-icon/*` (13, repo root) | UI | nothing in the web app (only `scripts/ci-scope.mjs`) | not declared | nothing |
| Hunter portrait frame fallback | UI | `PortraitCard.tsx` draws an initial when there's no file (all base heroes today) | n/a (code) | Base pack hero portraits |
| "Visual unavailable." plate | UI | `VisualLayer.tsx`, for any still or clip the board can't draw | n/a (code) | every missing painting above |

---

## 2. Voice lines whose text isn't final (Loremaster first)

- ~~**packs/base, `vo.hero-a` … `vo.hero-f` (6)**~~ **Ruled 2026-11-26 (Bob):** no hero voices in 1.0; only the Loremaster is voiced (DEC-099, DEC-349). The six `line` entries are removed from `packs/base/pack.yaml`, so nothing goes to Loremaster here.
- **packs/test (Ruined Keep): no voice line text is unfinished.** All 13 Loremaster lines were accepted by Bob on 2026-11-06 (`research/stories/ruined-keep/script.md:9`), and all 13 are now `line` placeholders in `packs/test/pack.yaml:204-218` (no files yet). Eight `[COPY: …]` strings are still open, because script.md has no accepted words for them:
  - the tagline (line 8)
  - the chapter 2 and chapter 3 start narration (lines 79 and 93)
  - the options `leave-the-shrine` and `rally-the-guard` (lines 137 and 159)
  - the item labels `tomas-map`, `signet` and `oath-blade` (lines 175, 178 and 181)
- **packs/dracula, every line (255 in groups 1–6):** the manifest says "Every line is DRAFT (DEC-867)", pending DEC-785 / OPEN RULING 6 (`D-06-vo-manifest.md:3`; each `script/group*.md:3`).
  - group 1: opening and chapter cards, 10 lines
  - group 2: endings, 23 lines
  - group 3: system moments, 28 lines
  - group 4: new scenes, 39 lines
  - group 5: the 15 rewrites, 148 lines
  - group 6: D-04 copy, 7 lines
  - Still to write (`D-06-vo-manifest.md:314-316`): `n5-flooded-room` (an opening, `.foe-first` and `.won`), the `traitor.marta-unmasked~vo-01` rewrite (D-06:249), and splits for the 44 captions over 120 characters (D-06:248).
  - Deferred: group 7, Long, 17 lines (manifest:290).
  - To retire: the 346 old-plot lines in `packs/dracula/script.yaml` (D-06:254).

**Count of non-final voice lines: 255** (all Dracula; the 6 base hero lines were retired 2026-11-26). That excludes the 17 deferred Long lines, the 3 lines not yet written, and the 346 old lines to retire.

---

## 3. Suggested plan issues

1. **Ruined Keep pack copy: the 8 placeholders left.** Ids: the `[COPY:]` strings still in `packs/test/pack.yaml` (the tagline, the chapter 2 and 3 start narration, the options `leave-the-shrine` and `rally-the-guard`, and the item labels `tomas-map`, `signet` and `oath-blade`). They need Loremaster's words and Bob's acceptance first. The other 14 placeholders and the 12 `line` entries were filled from script.md. kind:story. Touches: `research/stories/ruined-keep/script.md`, `packs/test/pack.yaml`.
2. **Ruined Keep story paintings.** Ids: `painting.ch1-the-roads`, `painting.ch2-the-keep`, `painting.ch3-the-tower`, `painting.keep-sealed-door`, `painting.finale-win`, `painting.finale-loss`, `painting.cover` and `glow.cover`. kind:art. Touches: `packs/test/assets/`, `packs/test/assets/index.json` (new), `packs/test/pack.yaml`, `approval.md`.
3. **Ruined Keep foes.** Ids: `foe.level-1`…`4`, `foe.warden~phase-1`…`3`, `foe.keep-garrison`. kind:art. Touches: `packs/test/assets/`, `index.json`, `pack.yaml`.
4. **Ruined Keep Tomb, traps and Tower maps.** Ids: `painting.keep-crypt~{left,ahead,right}-{corridor,wall}` (6), `painting.trap-pit`, `painting.trap-falling-rocks`, `painting.tower-{basement,main,top}-map`. kind:art. Touches: `packs/test/assets/`, `index.json`, `pack.yaml`, and `apps/bloodtower/src/assets/needs/build.ts`, which needs an 8:9 profile (C5-05:196).
5. **Ruined Keep Loremaster voice (13 lines).** Ids: the 13 `line` placeholders at `packs/test/pack.yaml:204-218`. They wait for Bob to lift the art hold. kind:art. Touches: `packs/test/assets/`, `index.json`, `pack.yaml`.
6. **Ruined Keep place stills: import through A1 step 6 and Bob's ticks.** Ids: `place.{village,bazaar,citadel,sanctuary}`. Now declared `draft` (ruled 2026-11-26, Bob, DEC-388). `place-bazaar.jpg` is recropped to 16:9 at 1920×1080 on import (DEC-347). kind:art. Touches: `packs/test/pack.yaml:198-201`, `approval.md:12-15`.
7. **Ruined Keep ambience.** Ids: `startup-ambient.m4a`, `night1-ambient.m4a`, `night2-ambient.m4a`, `pg-music.m4a`, or else drop them from `tracks.ts`. kind:art. Touches: `packs/test/audio/` (new), `apps/bloodtower/src/web/lib/audio/tracks.ts:33-40`.
8. **Base pack hero portraits.** Ids: `portrait.hero-a`…`f`. kind:art. Touches: `packs/base/assets/` (new), `packs/base/pack.yaml:95-100`.
9. ~~**Base pack hero voice lines: rule on them or retire them.**~~ Done: ruled 2026-11-26 (Bob), retired from 1.0 (DEC-099). Left over: the hero schema's required `voice` field (`apps/bloodtower/src/protocols/pack-v2/base.ts`), a code change for a later PR.
10. **Base pack listen sounds.** Ids: `snd.listen-nothing`, `snd.listen-trap`, `snd.listen-battle`. kind:art. Touches: `packs/base/assets/` (new), `packs/base/pack.yaml`.
11. **Dracula script: finish the drafts.** Ids: D-06 manifest groups 1–6 (255 lines), `n5-flooded-room` lines, `traitor.marta-unmasked~vo-01`, and the 44 over-long captions. Then rewrite `packs/dracula/script.yaml` and retire its old ids. kind:story. Touches: `research/game-design/specs/dracula/script/`, `D-06-vo-manifest.md`, `packs/dracula/script.yaml`, `packs/dracula/cast.yaml`.
12. **Dracula pictures: declare and approve the 106 rendered files.** Ids: every D-06 id that has a file (section 1). kind:art. Touches: `packs/dracula/pack.yaml` (an `assets:` block, or `assets/index.json`), `packs/dracula/assets/`.
13. **Dracula missing pictures.** Ids: `item.ludmila-tome`, `painting.lair~ludmilas-chapel`, `portrait.marta`. The ones on hold are `portrait.ludmila` and `painting.n5-lift`. kind:art. Touches: `packs/dracula/assets/`.
14. **Dracula cover swap.** Ids: `painting.cover`, `glow.cover`, and the old `cover.png`. kind:art. Touches: `packs/dracula/pack.yaml:6`, `packs/dracula/assets/cover.png`.
15. **Dracula cast portrait ids and mouths.** Ids: the 19 `por.*` and 152 `m.*` in `cast.yaml`, to rename to `portrait.*` and to drop `por.count` and `por.narrator`. kind:story (cast), with the mouths later as kind:art. Touches: `packs/dracula/cast.yaml`.
16. **UI leftovers: clean-up and status.** Ids:
    - `OpeningMoment.tsx` `grey-stair-04*` and the Keeper hook
    - unused files: `dialog-frame.png` and `@2x`, `window-mask.svg`, `window-mask-{a..d}`, `-sections`, `window-glow.png`
    - `assets/app-icon/`, which isn't wired in
    - `visuals-prompts.md` lines 13–38, which are stale

    kind:art. Touches: `apps/bloodtower/public/`, `apps/bloodtower/src/web/components/board/OpeningMoment.tsx`, `apps/bloodtower/plans/visuals-prompts.md`.

---

## 4. Where sources disagree

1. **Ruined Keep places: "final" vs not approved.** **Ruled 2026-11-26 (Bob):** they are drafts that come in through A1 step 6, each ticked by Bob (DEC-388, approval.md). `packs/test/pack.yaml:198-201` now declares them `draft`.
   - Before: `packs/test/pack.yaml:198-201` declared all four `place.*` as `status: final`.
   - `approval.md:12-15` leaves them unticked.
   - `C5-05-ruined-keep-art.md:204` says A1 step 6 imports them "as drafts for Bob's approval".
2. **The checklist's index doesn't exist.**
   - `approval.md:10` and `eval.md:36,45` check against `packs/test/assets/index.json`, which isn't in the repo. No Dracula `index.json` exists either.
   - C5-05:10 and D-06:28 say shipped files go with an `index.json`.
3. **Approval names 26 ids that pack.yaml doesn't declare.** `approval.md:16-40` lists 25 paintings and foes that `packs/test/pack.yaml` has no entry for. It declares the 4 places and all 13 Loremaster lines (`:198-218`). The cover is set only by `cover:` (`:5`), not as `painting.cover`.
4. **Pack placeholders that script.md doesn't cover.** `packs/test/pack.yaml` still has `[COPY: …]` at lines 8, 79, 93, 137, 159, 175, 178 and 181. Script.md has no accepted words for these slots. It also names different options for two of them: "Rest at the altar" (script.md:108) for the pack's `leave-the-shrine`, and "Fall back" (script.md:152) for its `rally-the-guard`. The pack's effects don't match the script's, so the text wasn't moved.
5. **Code names files that no pack has.**
   - `apps/bloodtower/src/web/components/board/OpeningMoment.tsx:18-19` loads `/packs/test/assets/grey-stair-04.png` and `-glow.png`. Lines 177–178 key the Keeper and motion still on `grey-stair.03` and `.04`.
   - No pack has a `grey-stair` moment, though `spec.md:19` (D4) and `:36` (D21) still describe one.
   - `apps/bloodtower/src/web/lib/audio/tracks.ts:36-39` names four `packs/test/audio/*.m4a` files, and there's no `packs/test/audio/`.
6. **visuals-prompts.md says "missing"; the files exist.**
   - `visuals-prompts.md:13-18` lists the dialog frame and window mask as "in progress, not delivered", and its status table (lines 28–31, 36) still marks steps 1–4 and 9 "blocked on asset".
   - Both are in `apps/bloodtower/public/board/dialog-frame/` and `public/landing/window-mask/`.
   - The code uses them: `DialogFrame.tsx:232` and `boardWindowMask.ts:6`, with no `ILLUSIONIST_PLACEHOLDER_*` comments left.
7. **Dracula cast ids vs file ids.**
   - `packs/dracula/cast.yaml` uses `por.<cast>` (19 ids, e.g. line 30), but the files and D-06 use `portrait.<cast>`.
   - `cast.yaml:30,37` gives the Count `por.count`, but D-06:36 says "There is no `portrait.count`".
   - `cast.yaml:121` gives the narrator `por.narrator`, but C5-05:13 and `needs/build.ts` (`LOREMASTER_IDS`) say the Loremaster has no portrait.
   - `por.ilka` (`cast.yaml:72`) has no D-06 entry and no file.
   - D-06:232 and :251 say `andrei` has no cast entry, but `cast.yaml` has one (the `- id: andrei` entry).
8. **Dracula cover.**
   - `packs/dracula/pack.yaml:6` still points at the old `assets/cover.png`.
   - D-06:44 says the oil `painting.cover` and `glow.cover` (both present as `.webp`) replace that sepia file (DEC-893).
9. **Lenka's face.** D-06:37-40 (DEC-892, Gamewright under delegation) shows her face from chapter 1 and says "This replaces Bob's Oct 16 hidden-until-reveal lock". Both `portrait.lenka` and `portrait.lenka~revealed` files exist. **Ruled 2026-11-26 (Bob):** DEC-892 is confirmed. Her face shows, hooded, from chapter 1, and the reveal changes it (DEC-852).
10. **The Dracula pack contents are out of date.**
    - `packs/dracula/script.yaml` has 346 old-plot lines.
    - D-06-vo-manifest has 255 new DRAFT lines, and D-06:254 says to retire the old ids.
    - `research/game-design/specs/dracula/inventory.md` says script.yaml has "710 lines" and cast.yaml "27 ids". Today script.yaml has 346 voice lines over 1076 file lines, and cast.yaml has 25 ids.
11. **Base listen sounds.** C5-05:104-118 (SD-01) puts `snd.listen-*` in `packs/base/assets/`. `packs/base/pack.yaml` doesn't declare them, and `packs/base/assets/` doesn't exist.
12. **Files that nothing references:**
    - `public/board/dialog-frame/dialog-frame.png` and `@2x.png`
    - `public/landing/window-mask/window-mask.svg`, `window-mask-{a,b,c,d}.png`, `window-mask-sections.png` and `window-glow.png` (READMEs only)
    - `public/ipad/b-engraved-ipad-move-map.jpg` (tests only)
    - the root `assets/app-icon/*`, which the web app never links
    - `packs/dracula/assets/cover.png`, once the cover swap in item 8 lands
13. **Ruined Keep place sizes.** C5-05:204 notes that `place-bazaar.jpg` is portrait 864×1152 while the other three are 1280×720. D-06:26 proposes 1920×1080 for places. **Ruled 2026-11-26 (Bob):** the Bazaar is recropped to 16:9 at 1920×1080 on import, A1 step 6 (DEC-347). The image file isn't changed here.
