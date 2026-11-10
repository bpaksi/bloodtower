# Dracula D-01: the arc and the chapter map

**Status:** draft by Gamewright, 2026-11-10, for Bob through Warden. Design only, no code. Names are working names (DEC-740, DEC-754, DEC-755). The rules text says hero; the players see and hear "hunter" (DEC-531).
**Order:** Bob's go of 2026-11-10 (via Warden): finish the whole Dracula design by Thu 2026-11-12, 11:36 AM ET. Gamewright owns the requirements and rules. Loremaster writes the plot, the scripts and the VO text in the Charon voice. Illusionist renders the art.
**Template:** The Ruined Keep is the shipped reference ([C3 plan](../../../../apps/bloodtower/plans/C3-ruined-keep.md), [feature map](../../../stories/ruined-keep/feature-map.md), [script](../../../stories/ruined-keep/script.md), [C5-05 art](../C5-05-ruined-keep-art.md)). This page copies its shape: chapters, each with quests at places, a chapter card, a chapter win and a seal break; then the Tower finale, the endings and the loss scenes.
**Sources:** the Dracula cards AREA-080 to AREA-113 (DEC-739 to DEC-756, DEC-779 to DEC-783, IDEA-070 to IDEA-162, Q-423 to Q-431), [i6-outline.md](../../../stories/dracula/i6-outline.md), [bloodtower-map.md](../../../stories/dracula/bloodtower-map.md), the scene scripts in `assets/stories/dracula/scripts/`, `packs/dracula/`, and the [board map](../../board-map.md). The D-00 inventory is [inventory.md](inventory.md).

## Locked constraints (Bob)

- The tower is optional (Bob 2026-10-24). No Dracula rule may need it. Every tower cue (IDEA-151, D-DRA-8), the Heart of Sorrow's shaking included, has a Story board fallback of sound and picture.
- The Story board has no digital board and no hero markers (Bob 2026-10-24). The reading names its sites in words and on the cards it turns. The parchment map (IDEA-158) and the castle cutaway (IDEA-156) are paintings, with no pins and no hero markers on them. Players move the physical pieces: heroes, quest markers, skulls and the Count's piece.
- The iPad picks are simple lists of buttons (C3 iPad rules). Nothing is private: DEC-745 and Q-416 end the private iPad content.
- Charon is the locked Loremaster (narrator) voice (Bob 2026-11-10).
- The structure is Bob's 2026-11-05 deck: four chapters over the 1.1 engine's day clock (DEC-753, IDEA-071 to IDEA-074, IDEA-148). Bob confirmed it on 2026-11-10 (ruling 1, DEC-868): the 4+1 nights do not come back.

## Premise

A letter signed by Anton Morosz, the burgomaster of Vellmoor, draws the hunters into the valley. Anton is already dead, and the Count wrote the letter. Behind them the fog closes the road (IDEA-070). The Count wants Lenka, Anton's adopted daughter, because she has the face of Ludmila, the woman he drove to her death centuries ago. Lenka did not choose him (i6-outline). She is free at the start and goes with the hunters as a companion. She can be lost to him, and she can be won back (DEC-741, DEC-746).

The Count is not a final room. He is a piece on the board with one hidden goal each game, set by the seed at the reading (DEC-742, DEC-743, DEC-748). He moves toward his goal at each day's close, strikes the hunters, and withdraws when beaten. In the last chapter he waits in the Tower (DEC-738). The hunters learn his goal from a cryptic line at the reading and from what he does in play, and the Tome names it outright (DEC-747). To open the castle gate they need all three objects: Stefan's blade, the Lantern of Saint Ysolde and the Tome (DEC-749, DEC-750).

## Win and loss

| Result | When | Engine check | Cards |
|---|---|---|---|
| **Win, Lenka free** | The Count falls in the lair, the Tower's last room, and Lenka is with the hunters, or the Lantern is held there and frees her | MEC-076 won | DEC-746, DEC-750, IDEA-075 |
| **Win, Lenka lost** | The Count falls, but Lenka was taken and the Lantern is not in the last room | MEC-076 won | DEC-746, IDEA-075 |
| **Turned** (loss) | A hero takes a third bite (corruption) | MEC-013, D-DRA-5 | IDEA-076, IDEA-131 |
| **The Valley Falls** (loss) | The last skull drops and the supply is empty | DEC-686 | IDEA-076, IDEA-133 |
| **The Houses Fall** (loss) | The fourth building falls | Q-C3-05 (engine rule) | Ruling 4, DEC-863 |

Losing Lenka is never a loss (DEC-746). A Tower retreat keeps progress (DEC-360). No strike alone can give the third bite (DEC-775, DEC-778's guard).

## Chapters by length (DEC-753)

| Ch | Chapter | Quest | Scene id | Kind | Site | Short | Std | Long | Reward (IDEA-141) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | The Mists | The Lantern & Bell | `n1-lantern-and-bell` | Plain scene | K1 Village | yes | yes | yes | A rumour pointing at the house; the four old hunters named (IDEA-080) |
| 1 | The Mists | The Burgomaster's House | `n1-burgomasters-house` | Plain scene | K1 Citadel | yes | yes | yes | Lenka joins as a companion (IDEA-081) |
| 1 | The Mists | The Long Night | `n1-long-night` *new* | Plain scene, battle | K1 Citadel (the house) | yes | yes | yes | Lenka kept, or the Count let in: a bite and a skull (IDEA-082) |
| 1 | The Mists | The Open Grave | `n1-open-grave` | Plain scene, battle | K1 Sanctuary | | yes | yes | The first clue, Oskar's letters (IDEA-083) |
| 1 | The Mists | The Reading | `n1-fortune-reading` | Plain scene; seeds the game | K1 Bazaar | yes | yes | yes | The sites, the lair picture and his goal in hints (IDEA-084) |
| 2 | The Hunt | Stefan's Blade | `n23-sergius-blade` | Tomb (MEC-026) | Seeded building, kingdom A | yes | yes | yes | The blade (IDEA-085, IDEA-134) |
| 2 | The Hunt | The Catacombs of Saint Ysolde | `n23-catacombs-of-saint-ysolde` | Tomb | Seeded building, kingdom B | yes | yes | yes | The Lantern (IDEA-086, IDEA-135) |
| 2 | The Hunt | The Funeral | `n2-burgomasters-funeral` | Plain scene, battle | Kingdom A Sanctuary | | yes | yes | Holy water; the lid choice (IDEA-087, DEC-781) |
| 2 | The Hunt | The Fly-Eater's Cell | `n3-fly-eaters-cell` | Plain scene | Kingdom B Citadel | | yes | yes | The clue that places the earth boxes (IDEA-088) |
| 2 | The Hunt | The Third Bride | `n23-third-bride` *new* | Plain scene, lieutenant battle (MEC-051) | Kingdom A or B, seeded | | | yes | Wren's tie (IDEA-154). **Deferred** with Long (DEC-866) |
| 3 | The Truth | The Earth Boxes | `n4-earth-boxes` | Two plain scenes, battle | K4 Sanctuary, then K4 Village | | yes | yes | Boxes burned: the daily skull stops (IDEA-089, DEC-779, D-DRA-12) |
| 3 | The Truth | Finding the Tome | `n4-finding-the-tome` | Plain scene | Seeded building, K4 | yes | yes | yes | The Tome; his goal named; the call to the castle (IDEA-090, IDEA-136) |
| 3 | The Truth | The Eldest Witch | `n4-eldest-witch` *new* | Plain scene, lieutenant battle | K4, seeded | | | yes | The coven broken (IDEA-155). **Deferred** with Long (DEC-866) |
| 4 | The Castle | The Drawbridge | `n5-drawbridge` | Plain scene | A Tower-adjacent space | yes | yes | yes | The Tower unlocks (IDEA-091, IDEA-147) |
| | | **Quests** | | | | **8** | **12** | **14 (deferred)** | |

The finale (the Tower crawl and the boss battle) is not counted as a quest, the same as in The Ruined Keep.

**Kingdoms.** K1 to K4 are Vellmoor's four parishes. The seed sets which printed kingdom (Arisilon, Brynthia, Durnin, Zenon; DEC-226) plays each one (IDEA-142), and the printed names stay on the spaces. Each kingdom has one Village, Bazaar, Citadel and Sanctuary ([board map](../../board-map.md)). Kingdom A holds the blade and kingdom B the Lantern. **Collision rule** (as D-DRA-12): when a fixed quest's building is the seeded object building, the fixed quest moves to that kingdom's Bazaar. A building never holds two quest markers.

### Chapter 1: The Mists

- **Goal:** reach the inn, find the dead man's house, keep Lenka through the night and hear the reading.
- **Bounds:** K1 only; the fog closes the rest (IDEA-145). Start: all heroes on K1's Village space (IDEA-144).
- **Order:** the Inn first, then the House, then the Long Night. The Open Grave may be played at any time. The Reading is always last, and it closes the chapter. A quest's marker appears when the quest before it ends (Gamewright pick, as The Herald comes before The Ambush). Markers are fixed (IDEA-146).
- **New rule hooks:** Lenka as a companion (DEC-741, DEC-782; Q-428). The other four old hunters can be met at their own buildings (DEC-745; Q-431). A plain-scene choice with a battle (The Long Night). The reading's seeded values: the sites, his goal and the lair (Q-425). The Count's piece enters at the end of The Reading (DEC-791 setting; D-02 DEC-859).
- **Expected length:** Short and Standard, about 7 days at Short and 8 at Standard, for 2 heroes (D-03 §6). These are estimates until the numbers pass, and play times are measured, not guessed (R-LEN-4).

### Chapter 2: The Hunt

- **Goal:** bring back the blade and the Lantern.
- **Bounds:** kingdoms A and B open, and K1 stays open (IDEA-145). The blade and the Lantern can be taken in either order.
- **New rule hooks:** the first Tombs in Dracula (MEC-026), with Short and Standard tomb sizes (DEC-669). The Count shows himself after the blade and leaves (IDEA-085). The lid choice (DEC-781). The Fly-Eater's price, a bite or a story item, guarded at 2 bites (MEC-013). Lieutenants stand on the board in Short and Standard (DEC-783).
- **Expected length:** about 9 days at Short and 10 at Standard, for 2 heroes (D-03 §6).

### Chapter 3: The Truth

- **Goal:** burn his earth and find the Tome.
- **Bounds:** K4 opens, and every kingdom is open from here on.
- **New rule hooks:** a standing box adds 1 skull in K4 at each day's close (DEC-779). The Tome names his goal (DEC-747) and gives +1 Wild against him (DEC-750). Its end call opens chapter 4.
- **Expected length:** about 4 days at Short and 6 at Standard, for 2 heroes (D-03 §6).

### Chapter 4: The Castle (the finale chapter, DEC-356)

- **Goal:** cross to the castle with all three objects, climb it and destroy him.
- **The Drawbridge:** played on a Tower-adjacent space with all three objects (DEC-749). The bridge is fast but draws his notice. The little gate is quiet and needs Marta (IDEA-115). Lenka insists on coming (DEC-741). Finishing it fires the Tower trigger, "a named quest is done" (DEC-645, IDEA-147).
- **The Tower crawl (MEC-076, IDEA-092):** the basement, main and tower levels.
  - Basement: the Swap (IDEA-096, DEC-751) and the Flooded Room (IDEA-095, held).
  - Main level: the Banquet, always first (IDEA-093); the Portrait (IDEA-094, held), which is the existing `n5-portrait-gallery`.
  - Tower level: the Lift (IDEA-097, held); the Heart of Sorrow as the stair room (IDEA-098).
  - Dealt rooms fill the rest (IDEA-100). The last room is the lair, with one of four seeded pictures (IDEA-099), and the boss battle is fought there.
  - Fixed rooms, hook choices and the missing-hero effect wait for DEC-780 and Q-427 (D-02).
- **New rule hooks:** the Count stops roaming and waits (DEC-738). The goal's castle moment (DEC-748). Lenka is freed by the Lantern in the last room (DEC-750). The blade gives +3 Wild against him.
- **Expected length:** about 6 days at Short and 7 at Standard, for 2 heroes (D-03 §6).

## Finale and endings

The Ruined Keep ends with a group vote on the last choice (C5-09). Dracula has no last choice: the Count's fall is the win, and the ending is set by Lenka's state (DEC-746). The Ruined Keep's flow then follows: the win line in the Loremaster voice, then the outcome, then the stats (C3-16, C3-17). Each Dracula ending has one painting and one Loremaster line, plus its scene.

## Beats Loremaster must write

Scene ids are the existing `n<night>-…` ones. A new scene takes its night's prefix (night 5 is the castle). Line ids follow DEC-622: `<scene>.<NN>~vo-01`, the same form as `seal-break.01~vo-01`. Endings are `finale-win.<ending>.<NN>~vo-01` and `finale-loss.<ending>.<NN>~vo-01`, after The Ruined Keep's `finale-win.shattered~vo-01`. The losses carry no `n5-` prefix because they can fire in any chapter. Every existing scene is rewritten around the new plot (IDEA-153): Lenka free, pool heroes, nothing private, the day clock and no "five nights".

| Beat id | Status | Intent (one line) |
|---|---|---|
| `opening` | new (as The Ruined Keep's `opening`) | A dead man's letter brings you in, and the fog shuts the road behind you |
| `chapter-card.01` … `.04` | new | Each chapter's name and goal, in one breath |
| `n1-lantern-and-bell` | rewrite | The inn's fear; the four old hunters named as people who can be found |
| `n1-burgomasters-house` | rewrite | The writer is dead; Andrei asks you to keep his sister; Lenka chooses to come |
| `n1-long-night` | new | Wolves at the shutters, then one of you walks to the door: stop them, talk them down, or lift the latch |
| `n1-open-grave` | rewrite | Oskar has risen and leaves his riddle in letters |
| `n1-fortune-reading` | rewrite | Berta turns the cards: the sites, the lair, and one cryptic line per goal (`~<goal>` variants) |
| `n23-sergius-blade` | rewrite (Stefan) | The blade in its Tomb; his first face at the door, and he leaves |
| `n23-catacombs-of-saint-ysolde` | rewrite | Moving bones around the Lantern; the lookalike goes to the castle |
| `n2-burgomasters-funeral` | rewrite | Dorka rises at her own wake; the lid choice; a new reason she goes up the hill |
| `n3-fly-eaters-cell` | rewrite | Jakob sells where the boxes went, for a bite or an item |
| `n23-third-bride` | new (Long, deferred) | The lieutenant who was Wren's mother; Wren's tie ends |
| `n4-earth-boxes` | rewrite | Burn three boxes across K4; three rotating clips and a last-box clip |
| `n4-finding-the-tome` | rewrite | His own hand: Ludmila, Stefan, Lenka's face; his goal named (`~<goal>`); the call to the castle |
| `n4-eldest-witch` | new (Long, deferred) | Break the coven in its passages |
| `chapter-win.01` … `.03` | new | The chapter is won, in one line each |
| `seal-break.01` … `.03` | new | His hold on the valley cracks, once a chapter (IDEA-152) |
| `nx-pressed-flower` | rewrite | His violets turn up wherever Lenka sleeps: courtship as threat (IDEA-078), shared, not private |
| `nx-midnight-procession` | rewrite | Once a chapter the dead who tried walk past, and one ghost speaks to a companion's tie (IDEA-077) |
| `count-strike.NN~<goal>` (D-02 §3) | new | His landed strike for each goal: a bite, Lenka's loyalty, the blade, a skull (DEC-748) |
| `count-withdraws` | new | Beaten, he leaves the board for the day, and he says so (IDEA-126) |
| `count-takes-lenka` | new | His strike carries Lenka to the castle, and play goes on (DEC-746) |
| `enc-*` (11) | source | The old hunter-token encounters, mined for his arrivals and strikes; Loremaster keeps the ids it reuses |
| `n5-drawbridge` | rewrite | Three objects: the loud bridge or Marta's little gate; Lenka comes |
| `tower-opening` | new (as The Ruined Keep) | The castle doors and the first climb |
| `n5-banquet` | new | A feast and the host at the organ; an illusion; the doors close and the statues rise |
| `n5-portrait-gallery` | rewrite (held by Q-427) | Four hundred years of one face; the portrait holds a hero |
| `n5-the-swap` | new | A friend vanishes and a wight wears their face; win them back (DEC-751) |
| `n5-flooded-room`, `n5-lift` | new (held by Q-427) | Zombies under the water; a machine that crushes the careless |
| `n5-heart-of-sorrow` | new | The stair room where the castle itself attacks (with a Story board fallback) |
| `n5-castle-moment.NN~<goal>` (4) | new | His goal's moment in the castle (DEC-748) |
| `n5-final-confrontation` | rewrite | The lair (`~<lair>` × 4), the boss battle, Lenka freed by the Lantern |
| `finale-win.rescued` | rewrite (was `n5-ending-rescued`) | The win with Lenka free: he falls, the fog lifts. `~freed` lines when the Lantern freed her (D-02) |
| `finale-win.lenka-lost` | new | The win with her lost: he falls, and she does not come back |
| `finale-loss.turned` | rewrite (was `n5-ending-turned`) | A hunter takes the third bite and turns (any chapter) |
| `finale-loss.valley-falls` | new | The last villager turns; the valley is his (any chapter) |
| `finale-loss.houses-fall` | new (ruling 4) | Four houses have fallen to him (any chapter) |
| `n5-ending-endures`, `n5-ending-taken` | retire | Their meaning is gone (DEC-746) |
| Help, UI and shared lines | new | As The Ruined Keep's still-to-come list: regroup, events (IDEA-132's renames), corruption names (IDEA-131), building lines (IDEA-112, IDEA-143) |

## What reuses Ruined Keep systems and what is new

| Reused as is (engine or Ruined Keep convention) | New for Dracula |
|---|---|
| Chapters with bounds, a card, a win and a seal break (MEC-033, MEC-054, DEC-303) | The seeded reading: object sites, the goal and the lair (Q-425) |
| The day clock, the skull drop and the days-left display (MEC-034, DEC-686) | The Count's four goals: target, strike and castle moment (DEC-748; Q-426) |
| Plain scenes with one choice (MEC-077), and Tombs (MEC-026) | Lenka: a companion who can be taken and won back (DEC-746; Q-428) |
| The 1.1 roaming adversary (DEC-738, DEC-775) | His skirmish-and-withdraw strike (DEC-778) |
| The Tower crawl and boss battle (MEC-076, DEC-356) | Fixed castle rooms, hook choices and the vanishing hero (DEC-780, DEC-751; Q-424, Q-427) |
| Buildings, Cleanse and the skull menu shrink (C3-06) | An earth box adding a daily skull (DEC-779) |
| Corruption, with the third one losing (C3-08, MEC-013), renamed bites | All three objects needed for the gate (DEC-749), and the objects' effects (DEC-750; Q-429) |
| Gear and potions, renamed as the hunter's kit (DEC-752, DEC-781) | Story items: holy water and the host (IDEA-137, IDEA-138) |
| Companions (MEC-049), one per hero (DEC-072) | Five story companions met at their buildings (DEC-782; Q-431) |
| Lieutenants and the traitor trick (MEC-051, MEC-052) | The Long Night's let-him-in choice; the traitor's suspects (Q-430) |
| Foe reskins and story foes (MEC-058, DEC-326) | Werewolf and Vampire Spawn (IDEA-128) |
| Outcome and stats screens (C3-16, C3-17); the Loremaster in Charon | No last-choice vote; the ending is set by Lenka's state |

## Clashes with the existing sources

1. **Nights against chapters.** D-DRA-1 to D-DRA-4 (Oct 14) and ruling 12 (Oct 15) set 4+1 nights: one kingdom a night, with night 5 the castle. The Nov 5 cards replace that with four chapters on the day clock (IDEA-079, IDEA-148, DEC-753). The scene ids keep the night numbers (`n23-…` already spans two nights). The lines "Five nights. No more will be given." (`n1-fortune-reading.12`) and "Five nights. Three keys." (`n5-drawbridge.01`) need rewriting (ruling 1: four chapters).
2. **Length.** The approved C2-01 brief takes Long out of `packs/dracula/pack.yaml` for the 1.0 cut (DEC-508). DEC-739 parked that cut, and DEC-753 gives Long 14 quests. The brief stays true for today's unplayable pack. Ruling 2: Short and Standard only (DEC-866).
3. **Premise.** The scripts and `pack.yaml`'s tagline ("The Count has taken Lenka") follow D-DRA-10. DEC-741 makes her free. The tagline needs new copy.
4. **Endings.** Rescued, Endures, Taken and Turned are replaced by DEC-746's four. The engine's fallen-buildings loss adds a fifth (ruling 4, DEC-863).
5. **Private and fixed-hunter content.** There are 159 `target: ipad:<hunter>` moments, the `.private.<hunter>` moments and `~no-<hunter>` variants, written for four fixed hunters. DEC-745 makes those hunters companions, and Q-416 rules out private content. D-02 retires those variants: a line whose speaker is absent is skipped, and private lines go to the Story board or are cut (DEC-856).
6. **The hunter token.** D-DRA-11 is gone (DEC-310), so the `enc-*` encounters are source material only. The "2 story skulls a night" cap and "+1 foe on night 5" break DEC-361 and are dropped. The `~boxes-left` finale variants are replaced by DEC-779.
7. **Line ids.** `packs/dracula/script.yaml` uses `<moment>.vo-NN`. DEC-622 and #413 use `<base>~vo-NN`. A variant line (`…~no-tomas.vo-01`) has no agreed form yet. This is for D-02 and code.
8. **Names.** Sergiu becomes Stefan and Vadoma becomes Berta (DEC-755). Scene ids, prop ids (`sergiu-blade`) and cast ids (`vadoma`) stay as they are, and only the text changes.
9. **Script timing.** DEC-785 writes the script after the probes. Bob's go of 2026-11-10 has Loremaster writing now. Ruling 6: drafts now (DEC-867).
10. **Marta and the traitor.** Marta first appears in chapter 4, after the last chapter end at which the trick could spring (Q-430). Ruling 3: Marta is met in chapter 3 (DEC-854).

## RULINGS (closed 2026-11-10)

Ruling 1 was Bob's, relayed by Warden at 2:16 PM ET. Rulings 2 to 6 were decided by Gamewright under Bob's standing rule that design rulings are Gamewright's (relayed by Warden, 2026-11-10).

1. **The arc's unit:** four chapters on the day clock, per Nov 5 (A). Decided by Bob (DEC-868).
2. **Long length:** Short and Standard only, per the approved C2-01. Long-only content stays specced, marked deferred until Long returns, and D-03's tuning leaves it out (DEC-866).
3. **The traitor:** Standard only, since Long is deferred. It springs at chapter 3's end, and Marta is met in chapter 3 (DEC-854).
4. **The fallen-buildings loss:** its own scene, `finale-loss.houses-fall` (DEC-863).
5. **The lieutenant quests:** chapters 2 and 3, deferred with Long (DEC-866).
6. **Script timing:** Loremaster drafts the lines now, marked draft (DEC-867).

Still with Bob: Lenka's face (she stays veiled meanwhile) and the Vellmoor cover.

Q-424 to Q-431 are settled in D-02.

## Next: D-02 rules deltas

Write `specs/dracula/D-02-rules-deltas.md`: a recommendation for each of Q-424 to Q-431 (the menu effects, seeded values, the Count's per-goal target and strike, the castle's fit, Lenka's companion rules, blade weakening, the traitor and the companions), DEC-778 and DEC-780 settled, the variant line-id form, and the Drawbridge's "draws his notice" without an attention track. After that come D-03 (foes, encounters and tuning per length), D-04 (session flow and screens) and D-05 (eval), then the art and VO specs for Illusionist, in C5-05's shape.
