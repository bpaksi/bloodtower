# Dracula D-06: art and VO specs

**Status:** decided by Gamewright, 2026-11-10, under Bob's standing rule that design rulings are Gamewright's (relayed by Warden, 2026-11-10). It is a design-only handoff for Illusionist, modelled on [C5-05](../C5-05-ruined-keep-art.md) and [A1-art-specs](../A1-art-specs.md).
- Nothing here authorizes a paid image or voice run, and nothing here lifts or sets a spend hold. That is Bob's call (the Nov 8 art hold, as C5-05).
- **LOCKED** cites a decided card or a Bob lock. **ADOPTED** is a Gamewright art ruling from the design journal, adopted 2026-11-10. **PROPOSED** is new here, and Illusionist may change it with a note.

**Stacks on** D-01 to D-05. **The line manifest** is [D-06-vo-manifest.md](D-06-vo-manifest.md), generated from Loremaster's drafts in groups 1 to 6 (`/workspace/dracula/lore/group*.json`, 2026-11-10). Group 7 (Long) is listed there as **deferred** and is left out of every count here.

## Totals

**111 picture and mask assets.** By kind: painting 65, portrait 17, foe 15, item 9, place 4, glow 1. Of these, 5 are on hold.

**255 voiced lines** (groups 1 to 6), est. 48 min. By speaker: narrator 189, vadoma 13, lenka 11, count 11, jakob 11, hanne 5, emeric 3, marta 2, anton 1, andrei 1, wren 1, oskar 1, agnes 1, dorka 1, ludmila 1, ursula 1, jozef 1, gerhardt 1.

## Common rules

- **IDs (LOCKED):** `<kind>.<entry>~<variant>` in lowercase kebab-case, with one `~` at most (DEC-622, DEC-844, `assetIdSchema`).
  - A1-15's picture kinds are painting, portrait, foe, place, item and cover, plus `glow`. A picture id's prefix equals its kind.
  - Tomb, trap and map art is kind `painting`, as in C5-05 §6.1.
- **Sizes (LOCKED where Wright's screen check confirmed them for C5-05):**
  - story Paintings: 3840×2160, panning (DEC-575, DEC-206)
  - foes: 1920×1080, kept inside the central 960 px column for the 8:9 fit
  - view halves (Tomb sections, traps, castle rooms, lairs): 1920×2160, seamless where joined (DEC-583, DEC-585)
  - maps: 1920×2160
  - cover: 3840×2160
  - items and places: 1920×1080 (PROPOSED)
  - portraits: square 2048×2048 (PROPOSED). DEC-576 shows them 900 px tall at 1080p, and the talking-avatar sheet needs 1024 px or more.
- **Pipeline (LOCKED):** as C5-05. Masters PNG, shipped WebP, with `index.json`. Bob approves each final in the studio. Story board only (DEC-201). No text, logos or borders baked into a picture.
- **Focus:** a key detail sits above y = 1440 on 4K Paintings and survives a 1.5× crop (DEC-206, DEC-575).

## Art rulings (ADOPTED, Gamewright journal, 2026-11-10)

1. **Medium.** Every scene is in oil (DEC-335, DEC-478). Ink is used only for the maps, letters, the Tome and the riddle: `painting.vellmoor-map`, `painting.castle-*-map`, `item.come-home-letter`, `item.ludmila-tome` and `item.oskar-riddle`. This replaces the 2026-10-16 continuity bible's all-ink lock (§0 there).
2. **The Count** is a silhouette until his lair: hand, mist, cloak, cold. His face first shows in `painting.lair~*` and `foe.count~phase-*`.
   - The Portrait Gallery's portraits keep every face cracked, varnish-dark or turned away.
   - There is no `portrait.count`. His lines are a voice only, like the Loremaster's.
3. **Lenka** stays veiled until her reveal at `n4-finding-the-tome` (D-02 §4; Bob's Oct 16 lock; a change is pending with Bob).
   - Until then the only Lenka art is `portrait.lenka~veiled`, or Lenka seen from behind.
   - `portrait.lenka` and `portrait.ludmila` (the same face) are on hold.
4. **Bites** are two small marks, at the throat or the wrist. There is no gore and no visual corruption on hunters.
5. **Light.** Days are overcast grey-blue. Dawn is the only warm sky (the win endings, `painting.lair~the-height`). Night interiors are candle-yellow on blue-black, and candle gold stays rare (game-look §2). Mist is white.
6. **The Vellmoor cover** (`painting.cover`, `glow.cover`) is listed and **on hold** pending Bob.
7. **No hunter is depicted as a specific hero.** The party is drawn from the pool, so hunters are silhouettes, hands or backs, never a set face (DEC-098). The Swap's wight wears a shadowed face.

## Continuity rules kept from `dracula-art-continuity.md` (2026-10-16)

| Rule | Status |
|---|---|
| Agnes: a cross-shaped burn on her right palm, a plain coif, a tin reliquary | Kept |
| Wren: chestnut hair with black funeral ribbon, green oilskin, crossbow, named silver bolts. The mother bolt is never legible | Kept (Ilka is deferred with Long) |
| Emeric: round wire spectacles with real refraction, a too-big tweed coat, garlic. No boy-wizard look | Kept |
| Hanne: stout, a cleaver in her apron. Jakob: neat, a ledger, dead flies. Marta: faded castle livery, no fangs or pallor before she springs | Kept |
| Dorka: a wedding dress and two bites. Peaceful and too pale before she rises | Kept, with bites as two small marks |
| Anton: round and soft, not like the Count. He fell at her door and lies in the parlour with the poker | Kept (C-5 default) |
| Props: the blade, the Lantern, the Tome, the cream letter and the violet as in the props table | Kept. No legible names on them, under the no-text rule |
| Ludmila's face is hidden everywhere until the Tome. A veiled girl stays veiled | Kept, and widened to Lenka (ruling 3) |
| Pre-ending art never shows Lenka at an open window | Kept |
| Tomas (fingers, the lookalike tell), Ilka and the third bride | **Retired.** Tomas is removed (D-02 G-10). Ilka is deferred with Long |
| All-ink style. Lenka captive from the start. The Count's face at the blade's door. Private iPad art. Key objects | **Retired** (rulings 1 to 3; DEC-741; DEC-057; C-11) |
| The Count's look in the lair: Stoker's tall, gaunt figure, older when hungry (C-6 default) | Kept as PROPOSED for `foe.count~phase-*` |

## Assets by batch (render order)

Batches 1 to 3 are the whole Short path (P1), so a Short game can be played end to end on finals after batch 3.

### Batch 1: chapter 1 on the Short path, which sets the look. Start now

| Asset id | Kind | Size | Style | What it shows | Used by | Priority |
|---|---|---|---|---|---|---|
| `painting.opening` | painting | 3840×2160 | oil | The fogged valley road at overcast grey-blue day: a lone signpost to Vellmoor, the fog bank closing behind. The castle on its height is only a dark shape in the mist, upper third | `opening.01`–`.06` | P1 |
| `painting.ch1-the-mists` | painting | 3840×2160 | oil | Vellmoor's first parish in mist: the crossroads, the inn's lit window (the one warm light), and the hill road up to the burgomaster's house | `chapter-card.01` | P1 |
| `painting.n1-lantern-and-bell` | painting | 3840×2160 | oil | The inn: low beams, a roaring fire, garlic over every window, the road outside going white. Hanne is stout with a cleaver in her apron. Faces are turned from the viewer | `n1-lantern-and-bell` | P1 |
| `painting.n1-burgomasters-house` | painting | 3840×2160 | oil | A tall stone house, black crepe on the door. In the parlour Anton lies with a poker in his hand. The upstairs window is open on the castle. Lenka is veiled, seen from behind | `n1-burgomasters-house` | P1 |
| `painting.n1-long-night` | painting | 3840×2160 | oil | Group 4's line: the hall by lamplight, barred shutters, garlic on the sills, mist under the door, a hunter in silhouette with a hand on the latch, Lenka from behind, wolf shadows on the shutters. No faces | `n1-long-night` | P1 |
| `painting.n1-fortune-reading` | painting | 3840×2160 | oil | Berta's painted wagon, its wheels sunk in mud. Candles, an accordion, soft worn cards on a cloth. Her hands are seen, not her face. No card names or text | `n1-fortune-reading` | P1 |
| `painting.vellmoor-map` | painting | 1920×2160 | ink | The parchment map of the closed valley: four parishes, the castle over one edge (IDEA-158). No pins, no hero markers and no text (D-01) | The opening and the Reading (map half) | P1 |
| `item.come-home-letter` | item | 1920×1080 (PROPOSED) | ink | A folded sheet of heavy cream paper in a beautiful old hand, unsigned, no seal. The writing is not legible | The Reveal at `n1-burgomasters-house` | P1 |
| `foe.level-1` | foe | 1920×1080 | oil | Grey wolves out of the fog on the road, eyes catching lamplight | Chapter 1 battles, the Long Night's Hold | P1 |
| `place.village` | place | 1920×1080 (PROPOSED) | oil | A Vellmoor village street under overcast sky, shutters and garlic | Building menu (UI-043), every turn | P1 |
| `place.bazaar` | place | 1920×1080 (PROPOSED) | oil | A small market square in mist, half the stalls shut | Building menu (UI-043), every turn | P1 |
| `place.citadel` | place | 1920×1080 (PROPOSED) | oil | A stone parish hall with a watch tower, black crepe | Building menu (UI-043), every turn | P1 |
| `place.sanctuary` | place | 1920×1080 (PROPOSED) | oil | The little church and its churchyard, a saint's lamp | Building menu (UI-043), every turn | P1 |

### Batch 2: chapters 2 and 3 on the Short path

| Asset id | Kind | Size | Style | What it shows | Used by | Priority |
|---|---|---|---|---|---|---|
| `painting.ch2-the-hunt` | painting | 3840×2160 | oil | Two roads out of the mist toward two kingdoms: a tomb mound on one, a church spire on the other | `chapter-card.02` | P1 |
| `painting.ch3-the-truth` | painting | 3840×2160 | oil | The far parish under heavier fog: long earth boxes in a cart yard, and the castle nearer now | `chapter-card.03` | P1 |
| `painting.n23-sergius-blade` | painting | 3840×2160 | oil | A tomb door at the seeded building. Inside, the blade lies half-wrapped in rotted crimson banner-cloth, with faint gold light and no source. At the door the Count is only a tall silhouette in mist | `n23-sergius-blade` opening | P1 |
| `painting.n23-catacombs-of-saint-ysolde` | painting | 3840×2160 | oil | The stair behind the altar into bone-lined passages, and the Lantern's niche far below, flame burning without oil | `n23-catacombs-of-saint-ysolde` opening | P1 |
| `painting.n4-finding-the-tome` | painting | 3840×2160 | oil | A study at the seeded K4 building: the green Tome with its closed-eye clasp open on a desk, violets in its gutter. No legible writing | `n4-finding-the-tome` | P1 |
| `painting.blade-tomb~left-corridor` | painting | 1920×2160 | oil | Stefan's tomb: dry old stone, banner rags, a cold gold glint far off. The left corridor section; the edges blend into every other section (DEC-585) | Tomb view half (DEC-583) | P1 |
| `painting.blade-tomb~ahead-corridor` | painting | 1920×2160 | oil | Stefan's tomb: dry old stone, banner rags, a cold gold glint far off. The ahead corridor section; the edges blend into every other section (DEC-585) | Tomb view half (DEC-583) | P1 |
| `painting.blade-tomb~right-corridor` | painting | 1920×2160 | oil | Stefan's tomb: dry old stone, banner rags, a cold gold glint far off. The right corridor section; the edges blend into every other section (DEC-585) | Tomb view half (DEC-583) | P1 |
| `painting.blade-tomb~left-wall` | painting | 1920×2160 | oil | Stefan's tomb: dry old stone, banner rags, a cold gold glint far off. The left wall section; the edges blend into every other section (DEC-585) | Tomb view half (DEC-583) | P1 |
| `painting.blade-tomb~ahead-wall` | painting | 1920×2160 | oil | Stefan's tomb: dry old stone, banner rags, a cold gold glint far off. The ahead wall section; the edges blend into every other section (DEC-585) | Tomb view half (DEC-583) | P1 |
| `painting.blade-tomb~right-wall` | painting | 1920×2160 | oil | Stefan's tomb: dry old stone, banner rags, a cold gold glint far off. The right wall section; the edges blend into every other section (DEC-585) | Tomb view half (DEC-583) | P1 |
| `painting.ysolde-catacombs~left-corridor` | painting | 1920×2160 | oil | Bone-lined catacomb passages; the bones are in old livery; damp; only the party's light. The left corridor section; the edges blend into every other section (DEC-585) | Tomb view half (DEC-583) | P1 |
| `painting.ysolde-catacombs~ahead-corridor` | painting | 1920×2160 | oil | Bone-lined catacomb passages; the bones are in old livery; damp; only the party's light. The ahead corridor section; the edges blend into every other section (DEC-585) | Tomb view half (DEC-583) | P1 |
| `painting.ysolde-catacombs~right-corridor` | painting | 1920×2160 | oil | Bone-lined catacomb passages; the bones are in old livery; damp; only the party's light. The right corridor section; the edges blend into every other section (DEC-585) | Tomb view half (DEC-583) | P1 |
| `painting.ysolde-catacombs~left-wall` | painting | 1920×2160 | oil | Bone-lined catacomb passages; the bones are in old livery; damp; only the party's light. The left wall section; the edges blend into every other section (DEC-585) | Tomb view half (DEC-583) | P1 |
| `painting.ysolde-catacombs~ahead-wall` | painting | 1920×2160 | oil | Bone-lined catacomb passages; the bones are in old livery; damp; only the party's light. The ahead wall section; the edges blend into every other section (DEC-585) | Tomb view half (DEC-583) | P1 |
| `painting.ysolde-catacombs~right-wall` | painting | 1920×2160 | oil | Bone-lined catacomb passages; the bones are in old livery; damp; only the party's light. The right wall section; the edges blend into every other section (DEC-585) | Tomb view half (DEC-583) | P1 |
| `painting.trap-pit` | painting | 1920×2160 | oil | The floor gives way under one hunter, in Vellmoor stone | Tomb trap (DEC-606) | P1 |
| `painting.trap-falling-rocks` | painting | 1920×2160 | oil | Stones crash from the vault onto the group | Tomb trap (DEC-606) | P1 |
| `foe.level-2` | foe | 1920×1080 | oil | The walking dead and wights in grave clothes, two small bite marks at their throats | Chapter 2 battles | P1 |
| `foe.level-3` | foe | 1920×1080 | oil | Pale brides and witches in the fog, veils and bare feet. Faces half-seen | Chapter 3 battles, the castle guards' fallback | P1 |
| `foe.werewolf` | foe | 1920×1080 | oil | The Werewolf story foe: a great wolf-shaped man at the tomb door | The blade's Tomb guardian | P1 |
| `foe.catacomb-wights` | foe | 1920×1080 | oil | Wights rising from the bone niches around the Lantern | The Catacombs' guardian | P1 |
| `foe.vampire-spawn` | foe | 1920×1080 | oil | The Vampire Spawn story foe: a young townsman, pale, two small marks | Chapter 3 battles | P1 |
| `foe.count~silhouette` | foe | 1920×1080 | oil | The Count as a tall silhouette in mist: hand, cloak and cold. No face | Strike skirmishes (Fight), chapters 2 and 3 | P1 |
| `painting.count-strike~replace-a-hero` | painting | 3840×2160 | oil | Mist across a lamplit street; one figure in the group has no face in the lamplight. The Count unseen | The strike scene for the goal (D-04 §4) | P1 |
| `painting.count-strike~win-lenka` | painting | 3840×2160 | oil | A high window opening on its own, violets on the sill. The Count unseen | The strike scene for the goal (D-04 §4) | P1 |
| `painting.count-strike~destroy-the-blade` | painting | 3840×2160 | oil | Frost creeping up a sword laid on a table. The Count unseen | The strike scene for the goal (D-04 §4) | P1 |
| `painting.count-strike~darkness` | painting | 3840×2160 | oil | Mist going door to door down a parish street, lamps going out. The Count unseen | The strike scene for the goal (D-04 §4) | P1 |
| `painting.count-takes-lenka` | painting | 3840×2160 | oil | Every lamp out; Lenka's empty cloak on the floor; one more lit window on the hill | `count-takes-lenka` | P1 |
| `painting.nx-pressed-flower` | painting | 3840×2160 | oil | A single pressed violet on a sill by a sleeping girl's veil. Plays only with Lenka present | `nx-pressed-flower` | P1 |
| `painting.nx-midnight-procession` | painting | 3840×2160 | oil | Dead hunters in old coats walk past at midnight, carrying lanterns that give no light. No ghost is singled out, since the ghost is seeded | `nx-midnight-procession` | P1 |
| `item.sergiu-blade` | item | 1920×1080 (PROPOSED) | oil | A long, plain-hilted sword of bright steel, half-wrapped in rotted crimson cloth, faint gold light. No legible name | Reveal (UI-036) | P1 |
| `item.lantern-of-saint-ysolde` | item | 1920×1080 (PROPOSED) | oil | A small silver lamp whose flame burns without oil | Reveal (UI-036) | P1 |
| `item.ludmila-tome` | item | 1920×1080 (PROPOSED) | ink | The green leather Tome with its brass closed-eye clasp. Inside, nothing legible | Reveal (UI-036) | P1 |
| `item.holy-water` | item | 1920×1080 (PROPOSED) | oil | A stoppered vial with a sealed stopper | Reveal (UI-036) | P1 |
| `item.host` | item | 1920×1080 (PROPOSED) | oil | A consecrated wafer in a small tin pyx | Reveal (UI-036) | P1 |
| `item.pressed-flower` | item | 1920×1080 (PROPOSED) | oil | A mountain violet pressed flat, purple fading to brown | Reveal (UI-036) | P1 |

### Batch 3: the Castle and the endings, Short path

| Asset id | Kind | Size | Style | What it shows | Used by | Priority |
|---|---|---|---|---|---|---|
| `painting.ch4-the-castle` | painting | 3840×2160 | oil | The castle on its height across the chasm, the drawbridge up, one lit window. Dusk, the light grey | `chapter-card.04` | P1 |
| `painting.n5-drawbridge` | painting | 3840×2160 | oil | The chasm, the raised drawbridge and the little side gate for deliveries | `n5-drawbridge` | P1 |
| `painting.tower-opening` | painting | 3840×2160 | oil | The castle doors standing open, candles lit all the way up the stair | `tower-opening` | P1 |
| `painting.castle-basement-map` | painting | 1920×2160 | ink | The cellars and crypt level: the Flooded Room, the Swap, the stair. Read as one slice of a tall cutaway (IDEA-156). Rooms are drawn by the engine | Castle map half (C5-07) | P1 |
| `painting.castle-main-map` | painting | 1920×2160 | ink | The great hall level: the Banquet, the Portrait Gallery, the stair. Read as one slice of a tall cutaway (IDEA-156). Rooms are drawn by the engine | Castle map half (C5-07) | P1 |
| `painting.castle-tower-map` | painting | 1920×2160 | ink | The tower level: the Lift (held), the Heart of Sorrow, the lair. Read as one slice of a tall cutaway (IDEA-156). Rooms are drawn by the engine | Castle map half (C5-07) | P1 |
| `painting.castle-halls~left-corridor` | painting | 1920×2160 | oil | Castle passages: dressed stone, cold candlelight, faded tapestries. The left corridor section; seamless edges | Dealt castle rooms' view half | P1 |
| `painting.castle-halls~ahead-corridor` | painting | 1920×2160 | oil | Castle passages: dressed stone, cold candlelight, faded tapestries. The ahead corridor section; seamless edges | Dealt castle rooms' view half | P1 |
| `painting.castle-halls~right-corridor` | painting | 1920×2160 | oil | Castle passages: dressed stone, cold candlelight, faded tapestries. The right corridor section; seamless edges | Dealt castle rooms' view half | P1 |
| `painting.castle-halls~left-wall` | painting | 1920×2160 | oil | Castle passages: dressed stone, cold candlelight, faded tapestries. The left wall section; seamless edges | Dealt castle rooms' view half | P1 |
| `painting.castle-halls~ahead-wall` | painting | 1920×2160 | oil | Castle passages: dressed stone, cold candlelight, faded tapestries. The ahead wall section; seamless edges | Dealt castle rooms' view half | P1 |
| `painting.castle-halls~right-wall` | painting | 1920×2160 | oil | Castle passages: dressed stone, cold candlelight, faded tapestries. The right wall section; seamless edges | Dealt castle rooms' view half | P1 |
| `painting.n5-flooded-room` | painting | 1920×2160 | oil | A vaulted cellar under black water; shapes beneath | Fixed castle room view (D-02 §5) | P1 |
| `painting.n5-the-swap` | painting | 1920×2160 | oil | A low crypt; coffins with their lids pushed aside | Fixed castle room view (D-02 §5) | P1 |
| `painting.n5-banquet` | painting | 1920×2160 | oil | A long hall with a feast laid for many, every candle lit, every chair empty, an organ at the far end, stone statues along the walls | Fixed castle room view (D-02 §5) | P1 |
| `painting.n5-portrait-gallery` | painting | 1920×2160 | oil | Four hundred years of portraits. Every face is cracked, varnish-dark or turned, so the Count's face is not shown. A covered canvas at the end | Fixed castle room view (D-02 §5) | P1 |
| `painting.n5-heart-of-sorrow` | painting | 1920×2160 | oil | A round tower room: a great glass heart on chains glowing dull red, halberds floating off the walls, the floor tilting | Fixed castle room view (D-02 §5) | P1 |
| `painting.lair~family-crypt` | painting | 1920×2160 | oil | The family crypt, his coffin open. The Count may be shown here: this is his lair | `n5-final-confrontation~family-crypt`, the boss room | P1 |
| `painting.lair~ludmilas-chapel` | painting | 1920×2160 | oil | Ludmila's small chapel, violets on the altar. The Count may be shown here: this is his lair | `n5-final-confrontation~ludmilas-chapel`, the boss room | P1 |
| `painting.lair~the-height` | painting | 1920×2160 | oil | The roof of the height, open to a grey dawn sky. The Count may be shown here: this is his lair | `n5-final-confrontation~the-height`, the boss room | P1 |
| `painting.lair~his-study` | painting | 1920×2160 | oil | His study: books, a cold hearth, a letter half-written. The Count may be shown here: this is his lair | `n5-final-confrontation~his-study`, the boss room | P1 |
| `foe.level-4` | foe | 1920×1080 | oil | Animated armour in the castle's halls | Hard-mode and capped battles | P1 |
| `foe.drowned-dead` | foe | 1920×1080 | oil | Zombies rising out of the black water | The Flooded Room's guard | P1 |
| `foe.banquet-statues` | foe | 1920×1080 | oil | Stone statues stepping down from their plinths | The Banquet's guard | P1 |
| `foe.wight-double` | foe | 1920×1080 | oil | A wight in a hunter's clothes, its face in shadow, its smile too wide. It must not show any real hero's face | The Swap's guard | P1 |
| `foe.heart-of-sorrow` | foe | 1920×1080 | oil | The Heart: the glass heart on its chains, halberds wheeling around it | The Heart of Sorrow, level 4 (DEC-879) | P1 |
| `foe.count~phase-1` | foe | 1920×1080 | oil | His face is first shown: tall, gaunt, a white moustache, in black, courtly. Same face in all three | The boss battle in the lair (C5-08) | P1 |
| `foe.count~phase-2` | foe | 1920×1080 | oil | Wounded; mist bleeding from him; younger and darker as he feeds on his fury. Same face in all three | The boss battle in the lair (C5-08) | P1 |
| `foe.count~phase-3` | foe | 1920×1080 | oil | Barely held: half mist, half man. Not a false death. Same face in all three | The boss battle in the lair (C5-08) | P1 |
| `painting.finale-win~rescued` | painting | 3840×2160 | oil | Dawn, the only warm sky: the castle window open, the fog lifting off the valley | `finale-win.rescued` | P1 |
| `painting.finale-win~lenka-lost` | painting | 3840×2160 | oil | The fog lifting at dawn, one window on the hill still lit | `finale-win.lenka-lost` | P1 |
| `painting.finale-loss~turned` | painting | 3840×2160 | oil | A hunter's fallen weapon by a doorway, eyes in the dark gone the wrong colour | `finale-loss.turned` | P1 |
| `painting.finale-loss~valley-falls` | painting | 3840×2160 | oil | The valley dark under mist, no lit window anywhere | `finale-loss.valley-falls` | P1 |
| `painting.finale-loss~houses-fall` | painting | 3840×2160 | oil | Four burned and broken houses in the parishes | `finale-loss.houses-fall` | P1 |

### Batch 4: Standard-only scenes

| Asset id | Kind | Size | Style | What it shows | Used by | Priority |
|---|---|---|---|---|---|---|
| `painting.n1-open-grave` | painting | 3840×2160 | oil | The churchyard: Oskar's grave dug from below, the lid split outward | `n1-open-grave` (Standard) | P2 |
| `painting.n2-burgomasters-funeral` | painting | 3840×2160 | oil | The wake by candlelight: two coffins on trestles, the village on benches, a saint's lamp. Dorka is peaceful and too pale | `n2-burgomasters-funeral` (Standard) | P2 |
| `painting.n3-fly-eaters-cell` | painting | 3840×2160 | oil | A whitewashed cell freckled with dead flies; Jakob cross-legged with a ledger | `n3-fly-eaters-cell` (Standard) | P2 |
| `painting.n4-earth-boxes` | painting | 3840×2160 | oil | Long boxes of black earth in a cart yard, nailed. The stencil is not legible | `n4-earth-boxes` (Standard) | P2 |
| `item.funeral-nail` | item | 1920×1080 (PROPOSED) | oil | A single long iron coffin nail on a cloth, its head bright where the hammer struck | The Funeral's Reveal: the nail, a Ward item (D-02 G-12; Standard) | P2 |
| `item.oskar-riddle` | item | 1920×1080 (PROPOSED) | ink | Oskar's letters: a page of a riddle in a priest's hand. Not legible | The Open Grave's Reveal (Standard) | P2 |

### Batch 5: speaker portraits. Reference sheets first, then portraits. Mouths wait for asset-studio 0.3 (DEC-843)

| Asset id | Kind | Size | Style | What it shows | Used by | Priority |
|---|---|---|---|---|---|---|
| `portrait.lenka~veiled` | portrait | 2048×2048 (PROPOSED) | oil | Lenka veiled: dark braid, mourning dress, face hidden behind a black veil | Voiced lines (DEC-349, DEC-719). Talking-avatar mouths after asset-studio 0.3 (DEC-843) | P2 |
| `portrait.agnes` | portrait | 2048×2048 (PROPOSED) | oil | Agnes: tall, gaunt, iron-grey hair under a plain coif, a cross-shaped burn scar on her right palm | Voiced lines (DEC-349, DEC-719). Talking-avatar mouths after asset-studio 0.3 (DEC-843) | P2 |
| `portrait.wren` | portrait | 2048×2048 (PROPOSED) | oil | Wren: wiry, chestnut hair tied with black funeral ribbon, green oilskin, crossbow | Voiced lines (DEC-349, DEC-719). Talking-avatar mouths after asset-studio 0.3 (DEC-843) | P2 |
| `portrait.emeric` | portrait | 2048×2048 (PROPOSED) | oil | Emeric: barely twenty, round wire spectacles (real lenses), a too-big tweed coat, garlic string. No boy-wizard look | Voiced lines (DEC-349, DEC-719). Talking-avatar mouths after asset-studio 0.3 (DEC-843) | P2 |
| `portrait.vadoma` | portrait | 2048×2048 (PROPOSED) | oil | Berta (cast id `vadoma`): an old fortune-teller, soft worn cards | Voiced lines (DEC-349, DEC-719). Talking-avatar mouths after asset-studio 0.3 (DEC-843) | P2 |
| `portrait.hanne` | portrait | 2048×2048 (PROPOSED) | oil | Hanne: the stout innkeeper, a cleaver in her apron | Voiced lines (DEC-349, DEC-719). Talking-avatar mouths after asset-studio 0.3 (DEC-843) | P2 |
| `portrait.jakob` | portrait | 2048×2048 (PROPOSED) | oil | Jakob: the ex-castle bookkeeper, neat, in a whitewashed cell | Voiced lines (DEC-349, DEC-719). Talking-avatar mouths after asset-studio 0.3 (DEC-843) | P2 |
| `portrait.marta` | portrait | 2048×2048 (PROPOSED) | oil | Marta: a young woman in faded castle livery. No fangs | Voiced lines (DEC-349, DEC-719). Talking-avatar mouths after asset-studio 0.3 (DEC-843) | P2 |
| `portrait.andrei` | portrait | 2048×2048 (PROPOSED) | oil | Andrei Morosz: Lenka's brother, young, in mourning | Voiced lines (DEC-349, DEC-719). Talking-avatar mouths after asset-studio 0.3 (DEC-843) | P2 |
| `portrait.anton` | portrait | 2048×2048 (PROPOSED) | oil | Anton: round and soft, the ledger man; remembered. Not like the Count | Voiced lines (DEC-349, DEC-719). Talking-avatar mouths after asset-studio 0.3 (DEC-843) | P2 |
| `portrait.oskar` | portrait | 2048×2048 (PROPOSED) | oil | Oskar: the priest, a gentle face; risen | Voiced lines (DEC-349, DEC-719). Talking-avatar mouths after asset-studio 0.3 (DEC-843) | P2 |
| `portrait.dorka` | portrait | 2048×2048 (PROPOSED) | oil | Dorka, risen: wedding dress, two small bite marks | Voiced lines (DEC-349, DEC-719). Talking-avatar mouths after asset-studio 0.3 (DEC-843) | P2 |
| `portrait.ursula` | portrait | 2048×2048 (PROPOSED) | oil | Mother Ursula: the abbess's ghost | Voiced lines (DEC-349, DEC-719). Talking-avatar mouths after asset-studio 0.3 (DEC-843) | P2 |
| `portrait.jozef` | portrait | 2048×2048 (PROPOSED) | oil | Jozef: the gravedigger's ghost, smiling and pale | Voiced lines (DEC-349, DEC-719). Talking-avatar mouths after asset-studio 0.3 (DEC-843) | P2 |
| `portrait.gerhardt` | portrait | 2048×2048 (PROPOSED) | oil | Gerhardt: the apothecary's ghost | Voiced lines (DEC-349, DEC-719). Talking-avatar mouths after asset-studio 0.3 (DEC-843) | P2 |

### On hold (not rendered)

| Asset id | Kind | Size | Style | What it shows | Used by | Priority |
|---|---|---|---|---|---|---|
| `painting.cover` | painting | 3840×2160 | oil | The Vellmoor cover. ON HOLD pending Bob | Story picker and cover | hold |
| `glow.cover` | glow | 3840×2160 (same as the cover) | mask | The cover's glow mask. ON HOLD with the cover | Story picker | hold |
| `portrait.lenka` | portrait | 2048×2048 (PROPOSED) | oil | Lenka unveiled, with Ludmila's face. ON HOLD with her reveal (Bob) | After the reveal | hold |
| `portrait.ludmila` | portrait | 2048×2048 (PROPOSED) | oil | Ludmila: Lenka's face, a white dress, violets. ON HOLD with Lenka's face | Her voiced line | hold |
| `painting.n5-lift` | painting | 1920×2160 | oil | The Lift: a crushing machine in a shaft. ON HOLD with IDEA-097 | Tower level room 1 | hold |

**Reused, not repainted:** no tower-room art beyond `painting.castle-halls~*` (C5-05 §6.8, ruling 1 shape). No sound effects: every Dracula cue is a tower sound (SND-077 for the Heart, DEC-879), skipped without the tower (DEC-305).

## Acceptance checks

- [ ] **DA-01** Each asset decodes at its listed size, is shipped as WebP, and its id prefix equals its kind (A1-15).
- [ ] **DA-02** Paintings keep the key detail above y = 1440, and a 1.5× crop on the focus box keeps it whole (DEC-206).
- [ ] **DA-03** The six sections of each view-half set join seamlessly in every corridor and wall mix (DEC-585).
- [ ] **DA-04** Rulings 1 to 7 hold:
  - Ink only on the five ink assets.
  - No Count face before the lair art.
  - No Lenka face anywhere.
  - Bites as two small marks.
  - Grey-blue days, warm skies only at dawn.
  - No set hunter faces.
- [ ] **DA-05** The continuity table holds, side by side with each speaker's approved reference sheet (talking-avatar skill §1).
- [ ] **DA-06** Nothing on hold is rendered.
- [ ] **DA-07** Bob approves each final in the studio.

## VO

- **Voices (LOCKED):**
  - `narrator` is Charon, "slow, low, ominous storyteller" (Bob 2026-11-10, D-01).
  - The other speakers use their `packs/dracula/cast.yaml` voice. The Count is Algieba, voice only. Lenka and Ludmila are Leda. Several voices are still marked `audition: true`.
  - **Andrei** has no cast entry. Orus is proposed, and the voice is Illusionist's call. `andrei` must be added to `cast.yaml` before his line renders.
- **Format:** as `seal-break.01~vo-01` in A1-art-specs §3. A WAV master becomes m4a, at about −18 LUFS and true peak at −1 dBTP or lower. The caption equals the text byte for byte.
- **Length:** a line estimated over 20 s is rejected (A1-P2 D6). Chapter cards are 10 s at most (G-3). The manifest's target is the estimate ± 3 s, capped at 20 s.
- **Lines never name or count the hunters** (D-02 G-18). No line names Tomas (G-10). The manifest checked both, and none does.

### Id check (DEC-856, `assetIdSchema`)

**No id breaks DEC-856 or the schema.** All 255 ids (and group 7's 17 deferred ids) are one of the four forms:
- a base line
- a goal or lair variant
- a `~freed` variant
- an event moment (`<scene>.<event>~vo-NN`), including the clue lines (`<scene>.clue-<suspect>~vo-NN`, G-17) and the 7 `traitor.*` lines

There is one `~` in each id, and there are no duplicates.

**Problems flagged for Loremaster** (none are id-form problems):
1. **44 captions run over 120 characters** (A1-13 / DEC-576). Each must be split into two lines (`.NN` and `.NN+1`) or cut. The manifest marks each one.
2. **`traitor.marta-unmasked~vo-01`** says the little gate will open for them. That contradicts G-16: an unmasked Marta is not an ally, and her help is the quiet bridge. The line needs a rewrite.
3. **The disabled Ward reason** (group 3) is "Needs holy water or the host". It must also name the nail, which D-02 G-12 makes a Ward item.
4. **`n1-burgomasters-house.05~vo-01`** (andrei) has no cast entry (see Voices).
5. **Missing lines:** `n5-flooded-room` has no lines yet. It is a fixed basement room (D-02 §5): an opening, `.foe-first` and `.won` are needed. `n5-lift` is on hold.
6. **Group 7 (deferred):** the speaker `eldest-witch` has no cast entry. Add it when Long returns.
7. **Retire** the old `packs/dracula/script.yaml` ids with `~no-<hunter>` and `.private.<hunter>` forms (the 272 silent as `invalid-id` in the A1 runbook). The manifest replaces them when the pack is rewritten.

## Next

Illusionist starts batch 1, then batches 2 and 3 for the Short path. The voice run follows the art-hold rules, Charon first. D-07 is the Dracula pack feature's brief, which carries D-05's checks as its `eval.md`.
