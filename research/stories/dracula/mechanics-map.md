# Mechanics map: Vellmoor (Ravenloft I6 + Dracula)

> **1.0 cut (2026-10-28):** this describes the full Dracula. For 1.0, [DEC-508](../../game-design/cards/DEC-508.md) overrides it where they differ. The full version is kept in [dracula-v2](../dracula-v2/mechanics-map.md).

Written 2026-10-14, before the story. No story or dialog here. It covers what exists, and how each approved set piece and encounter layer maps onto it.

**Status key:** **HW** = tower hardware/firmware, confirmed on Bob's tower · **HW?** = the library or docs claim it, not verified on the tower · **POC** = tower-poc capability (per the research write-ups) · **RtDT** = original game / physical components · **R** = proposed in research · **NEW** = needed for this game.

**Source key:** `api` = research/tower/api-surface-7.1.2.md · `spike` = research/tower/spikes/2026-10-13-noble-macos.md · `obs` = research/tower/observability.md · `upq` = research/tower/upstream-issue-unanswered-commands.md · `inv` = research/return-to-dark-tower/component-inventory.md · `rules` = …/game-overview-and-rules.md · `capp` = …/companion-app.md · `core` = research/game-design/core-mechanics.md · `drac` = research/stories/dracula/README.md · `chars` = …/characters.md · `open` = …/opening-scene.md · `rl` = …/RevenLoft-overview.md · `CL` = CLAUDE.md · `adr1` = research/decisions/0001-multi-app-layout.md · `tts` = apps/Visuals/src/tts-explorer/data/stories/dracula/STORY.md

> **Note on tower-poc:** `apps/tower-poc` is **not in the copy** at /workspace/darktower (only `apps/Visuals/src/tts-explorer` is). Everything marked POC comes from the research write-ups that describe tower-poc's spec, holds and capability IDs (`seals.break`, `sound.play-stateful`, `mechanics.rotate`, `mechanics.random-rotate`, rotate-with-state). It has not been checked against code.

> **Bob's ruling (2026-10-14):** warriors and spirit/mana are tracked by the base game. They are **out of scope** as story mechanics. No set piece, encounter or item here costs or rewards them. Story economy = **story items, clues, the clock, skulls, the bitten track**.

> **Bob's rulings, round 2 (2026-10-14).** These override anything below that disagrees:
> 1. Chapter order is set per story. **In this story the Tome kingdom (K4) is always the last chapter.** The randomizer only assigns the Blade and the Holy Symbol between K2 and K3.
> 2. **The tower cannot be entered until the party holds all three artifacts.**
> 3. **Clock = 5 nights, narrative pacing, not time** (round 3): each kingdom is solved in exactly one night. Completing all of a kingdom's set pieces awards its **key (the artifact)** and unlocks the next kingdom. Night 5 = the tower assault. No ticks, no action costs (§2c).
> 4. **Bites = base-game corruption cards.** **Every corruption counts** (base-game ones too). **One hunter reaching a 3rd corruption loses the whole game** (base rule kept, round 3). Losing the woman is also a loss.
> 5. **One iPad per hunter**, with private information.
> 6. **All tower cues inside scenes fire automatically**, including drums and seals. This **overrides** the CLAUDE.md house rule "Nothing physical happens automatically" for scene cues only (see §1a note and §6 doc changes).
> 7. **Round 3 (C1–C4 resolved):** base loss rule kept; all corruptions count; clock is beats, not ticks; cures come from story items (holy water, the host) and Sanctuary rest.

---

## 0. Component inventory (how every piece is used in this story)

Rows marked RtDT use the physical piece from the box. "Build" = what the app needs. Warriors, spirit, Reinforce, haggle die and virtues: **base game, out of scope**.

| Component | Role in the original | Role in Vellmoor | Interacts with | iPad | Mac (host / table screen) | Tower | Build |
|---|---|---|---|---|---|---|---|
| **Skulls** (24 supply) | Turn-end drop; land on buildings; 4th destroys the building; empty supply = loss (rules) | **Thralls**: each skull is a villager turned. 3 on a building = it is under his shadow (no item purchase, no rest); 4 = **fallen**, building removed, the parish's chapter is harder | Clock (dusk drop), Count (interventions), Cleanse (holy water, Agnes), escort (fallen Sanctuary = no safe rest for the woman) | Prompt "where did it land?" (parish + building); per-building skull count | Board overview with skull counts per building | Skull sensor (HW) gives the count; landing is **reported by players** | Skull ledger, landing prompt, fallen-building rules |
| **Creatures and foes** (12 foe types, tokens/minis, levels 2–4, status escalation) | Spawn on spaces; battled in app; escalate over time (rules, inv) | Reskinned: Brigands → Szgany, Shadow Wolves → wolves, Lemures → zombies, Mormos → ghouls, Striga → brides, Widowmade Spiders → bat swarms, etc. **Mapping to physical foe minis [needs Bob]**. Escalation: each dawn foes on the board get worse | Encounter tables (§3), battle engine, items (as advantages), clock | Battle cards, item-use buttons | Foe locations on board view; status | Battle glyph turned to the foe's parish (rotateWithState) on spawn | Foe roster + reskin, spawn/escalation, battle engine |
| **The Count's board presence** | Adversary appears only after the main goal; 5-card fight (rules) | **On the board from night 1** using an adversary mini (Dark Horde has 8, inv §5; base uses tokens). Moves at each dusk toward his objective target; by day he is "in his coffin" (lair, unseen). Hunters on his space at night trigger an intervention | Clock, objective (§4), woman's ward, interventions, finale | "The Count is near" alert; private taunts per hunter | Shows where to place the mini each dusk | Red breathe on the side facing his parish; skull drop on his strikes | Count AI (move rules per objective), placement prompt |
| **Heroes** (4 minis + boards) | Move, one heroic action per turn (rules) | The 4 hunters (chars). The party moves together as **one mini or 4 minis on one space** (core); shared control | Items, bitten track, private ties (procession), set pieces | Hunter sheet: kit, bite level, tie progress, abilities | Party panel | — | Hunter model, abilities (no warriors/spirit) |
| **Bitten track = base-game corruption** (Bob) | Corruption: gained by effect; a 3rd corruption loses the game (rules) | **Each bite = one corruption card.** **Every corruption counts**, base-game ones included. **A 3rd corruption on any hunter = the whole game is lost** (base rule). Effects (proposed): 1 marked, 2 thirsting (can't enter a Sanctuary after dusk; the Count can find them). Cures remove a card: holy water, the host, Sanctuary rest (§3b). **Base game tracks:** the cards and the count. **App tracks:** a mirror count per hunter (players confirm "take a corruption"; base-game corruptions entered too), the source (bite or base), story effects, the loss trigger | Night encounters, Count, cures, ending | Corruption meter on that hunter's iPad + "take 1 corruption card" prompt; warning at 2 | Party summary | Corruption gain: flicker on the base layer (automatic) | Mirror count + prompts, cure rules, loss check |
| **Companions**: the protected woman as **escort** | Companion cards grant help (rules) | She travels with the party (NPC token, maybe the main-goal standee). **Ward state**: bite 0–3 (starts 1). She must end each night in a building with ≥2 hunters or a held Sanctuary, else a snatch attempt. Optional other companions: the innkeeper, the teller (non-combat) | Count objective, clock, Sanctuaries, Tome reveal, ending | Escort card with her bite level and rule reminders | Escort status | Seal-sequence lights on a snatch attempt | Escort model, snatch rule, ending inputs |
| **Dungeons** (6 tokens; app room graphs) | Explore rooms to a target (rules) | **Castle** (finale) and **catacombs / crypts** at artifact sites (chapters 2–4). Rooms clear and stay cleared | Castle table, set pieces 7/8/10, items | Room graph, choices per room | Shared map of rooms | Drums rotate as passages shift | Dungeon graph engine + 4 dungeon layouts |
| **Quests** (main goal, companion/adversary monthly; 3 standees) | Monthly quests with reward/penalty (rules) | Main = recover the 3 items (one per chapter) and storm the tower. Side = each hunter's **private-tie quest** (Agnes's spared night, Tomas's niece, Wren's mother, Emeric's cipher; chars). Standees mark the active chapter site | Chapters, procession, items, ending | Personal quest card (private) | Chapter objective banner | Quest glyph faces the active chapter's parish | Quest tracker, chapter manager |
| **Seals** (12) | Removed when the app calls; reveal glyphs (rules, inv) | **Seals of the valley**: one breaks at each chapter accomplishment (3), more as fallen buildings pile up, the rest in the finale. Glyph exposure = the Count's power reaches that parish. Layout **[unverified]** | Chapters, skulls, glyph effects | "Remove seal X" instruction with picture | Seal ledger | `breakSeal` (HW, lights + sound); the **app tracks** broken seals (firmware doesn't) | Seal ledger + seal plan |
| **Banners and advantages** | Banner = hero board action; Advantages (6 traits + Wild) improve battle cards (rules) | Banner action: out of scope (base game). **Advantages = story items**: stake/sunlight vs Undead, silver vs Beast, crucifix vs Magic, crossbow vs Stealth, etc. Glyphs facing a parish modify encounters there (Banner glyph = "the Count's gaze": +1 night draw) | Items, battle engine, drums/glyphs | Item buttons on battle cards | — | Glyph facing (library-computed) | Trait/advantage mapping |
| **Clock** | Months, hidden length (rules) | **5 nights as narrative pacing**: nights 1–4 = chapters K1–K4 (each solved in one night), night 5 = tower assault. Advances on **story beats**, not time (§2c) | Everything | Current night + beat on every iPad | Chapter/beat banner on the table screen | Light level follows the beat (automatic) | Chapter and beat sequencer (§2c) |
| **Tower elements**: lights, sound, drums, glyphs, seals, sensor | Drive the game feel; drums route skulls (inv §6) | **The tower is the castle**. Cue library: dusk, midnight bell, snatch, chapter seal, finale | All of the above | — | Cue log; tower status (battery, calibrated, unknowns shown as unavailable) | See §1a for limits | Cue library on POC caps |

---

## 1. Mechanics inventory

### 1a. Tower hardware (through UltimateDarkTower 7.1.2)

| Mechanic | Detail | Status | Notes / limits | Source |
|---|---|---|---|---|
| BLE connect from Mac (noble) | Scans for `ReturnToDarkTower`, no picker; connects in about 2–5 s | HW | First run needs macOS Bluetooth permission; no auto-reconnect allowed | spike F1, api §12, CL |
| Calibration | All 3 drums spin home, about 21 s; state answers it | HW | Commands sent mid-calibration are silently dropped → POC rejects them (D22). **Never automatic** | spike F3/F12, api §2, CL |
| Lights: 24 LEDs, 6 effects | off, on, breathe, breatheFast, breathe50percent, flicker; `setLED` layer 0–5, light 0–3 | HW (on/off seen); effects HW? | Lights work uncalibrated | api §9–10, spike F2 |
| Light sequences (`lightOverrides`) | 21 named sequences (twinkle = 1 …, seal = 14, rotation* = 15–18) | HW for those tried | **rotation 15–18: lights only, no drum moves, the tower never answers → 30 s queue stall** (held, GAP-HW-007) | api §9, spike F4/F7, upq |
| Sounds | 113 samples in 12 categories, played by index | HW (index 1 heard) | **No "sound finished" signal.** Loop bit was **not honoured** (GAP-HW-008). Others unheard | api §3/§9, spike F9 |
| Volume | 4 named levels (Loud/Med/Quiet/Mute); state says 0–15 | HW? | Mapping unclear (GAP-HW-003) | api §4 |
| Drum rotation | 3 drums × 4 sides (N/E/S/W) | HW (top drum seen) | Use **rotateWithState** (keeps lights). Legacy `Rotate` and `randomRotateLevels` **turn lights off**. About 1.1 s per move; needs calibration; wait 300–500 ms between moves | spike F8, api §10/§12 |
| Glyphs | 5: Cleanse, Quest, Battle, Banner, Reinforce, each with home level + side | HW? (library-computed) | The **library computes** facing from calibration + rotations it sent; the tower does not report glyphs | api §7/§9, inv §1 |
| Seals | 12 removable seals; `breakSeal` plays seal lights + sound | HW (one seal, uncalibrated) | **Firmware does not track broken seals**, so the app must. Exact level×side layout **[unverified]** | api §7, spike F2, inv §6 |
| Skull drop sensor | Unprompted state with a running count; `onSkullDrop` | HW (2 drops) | The only physical input without a tap. Where it **lands** (kingdom) is **not reported**: players tell the app | spike F11, rules notes |
| Skull ejection / holding | Skulls may be held or tumble into a kingdom based on drum state | RtDT; control **uncertain** | No API to "release N skulls"; it is an emergent drum effect. `doorReset` has no public method | inv §6, api §6 |
| Jam detection | `Drum.jammed` in state | HW? | Can show it; `unjamDrums` not exposed | api §6–7 |
| Battery | `07` msg every ~2 s, mV | HW | Heartbeat warning is a false alarm on this tower | obs F7/F9 |
| Device info, diagnostics timeline | Adapter tap + recorder | POC (M1 research) | Serial in library exports, so keep them private | obs |

**Tower safety rules (CL), as amended by Bob 2026-10-14:** UI talks only via `command{capabilityId, params}`. CL says **nothing physical is automatic** (no auto-calibrate, auto-reconnect or retry; `retrySendCommandMax = 0`, D21). **Bob's override: tower cues inside scenes fire automatically, drums and seals included.** Still manual (not covered by the override, assumed unchanged): calibration, reconnect, retry of a failed command. Unknown = "unavailable", never zero; "no echo" = unknown, not failed (obs). **Consequences:** a scene must check `isCalibrated` before a drum or seal cue and skip/defer it if not (drums need calibration, spike F8); cues must be spaced 300–500 ms (api §12); never a held capability (rotation 15–18, legacy Rotate); the cue queue must not stall a scene waiting for an echo.

### 1b. Original game (RtDT)

| Mechanic | Status | Use here? | Source |
|---|---|---|---|
| Board: 4 kingdoms × 15 spaces, rivers, 6 terrains | RtDT | Yes: 4 kingdoms = **4 parishes** of Vellmoor | inv §1, chars |
| 16 buildings (Citadel, Sanctuary, Village, Bazaar per kingdom) | RtDT | Yes: hubs that open sub-locations | inv §1, core |
| Hero minis on board, free movement | RtDT | Yes (party moves as one unit, R) | rules, core |
| Skulls on buildings; 4th destroys the building | RtDT | Yes: **thralls / fallen houses** | rules, drac |
| Cleanse action (clear skulls) | RtDT | Yes (Agnes's role) | rules, chars |
| Months / turns clock | RtDT (app-hidden length) | Replaced by **day/night clock** | rules, drac |
| Foes (12 types, levels 2–4), status escalation, strikes | RtDT | Reskin as undead / beasts; foe tokens as minis | inv, rules |
| Battle = draw N face-down cards, Advantages improve | RtDT app | Reuse the shape for encounters | rules, capp |
| Advantages (Beast, Magic, Humanoid, Melee, Undead, Stealth, Wild) | RtDT | Yes: map to story items (stake vs Undead, etc.) | rules |
| Dungeons: room graphs, cleared rooms remembered | RtDT app | Yes: **castle and catacombs** | rules |
| Corruption (3rd = loss) | RtDT | **Used directly as bites** (Bob); all corruptions count; a 3rd on any hunter loses the game | rules, Bob |
| Quests: companion / adversary monthly, main goal | RtDT | Shape for hunters' personal quests | rules |
| Potions, gear, treasures, quest items | RtDT | Story items replace them | rules |
| Seed (12-char) | RtDT app | Yes: seed the fortune reading | rules |
| Warriors, spirit, Reinforce, haggle die, Banner, virtues | RtDT | **Out of scope: base game handles them (Bob)** | rules |

### 1c. Proposed in research (R) and new (NEW)

| Mechanic | Status | Source | Note |
|---|---|---|---|
| Multi-device: Mac host + iPads | R | capp gaps, task | Needs a sync layer |
| App tracks everything; scenes, voice, music | R | core | TTS voices exist in tts-explorer (tts) |
| Open world: building hubs → sub-locations | R | core | |
| Shared-control party (4 hunters) | R | core, chars | |
| Story-driven clock with scripted tower beats | R | core | |
| Day/night clock; night = the Count hunts | R → **decided: 5 nights** | drac, open, Bob | "six nights" placeholder replaced |
| Skull = villager turned; building under shadow | R | drac, open | |
| Hunter's kit (garlic, holy water, silver, stake, crucifix) from sanctuaries | R | drac | |
| True-coffin riddle; drum glyphs mark crypts | R | drac, open | Now feeds the fortune reading |
| Bitten track (power, slow turning, cure before the end) | R → **decided: corruption cards, 3rd = game lost** | drac, Bob | |
| Private ties paid off as beats | R | chars, open | Set piece 4 |
| Count's interventions (purposeful, separate from tables) | R | rl | |
| Randomized artifacts, lair, objective | R | rl | |
| **Ward / protection track for the woman** (her bite level 0–3) | NEW | — | **App-only**: she is not a hero, so no corruption cards |
| **Fear / dread** (castle pressure) | NEW, optional | — | Q6 |
| **Journal of clues** | R/NEW | open (Beat 5) | |
| **Encounter deck engine** (day/night/castle) | NEW | — | |
| **Tower cue library** (named cues → capability calls) | NEW | — | Wraps POC caps |
| **Seal ledger** (app-tracked broken seals) | NEW | api §7 | Required |
| **Skull-landing prompt** | NEW | — | The sensor gives no location |

---

## 2. Set pieces

Pacing: beats B1–B7 per night (§2c); no ticks. Cues use only HW-confirmed capabilities unless marked.

| # | Set piece | Trigger | Mechanics | App screens / interactions | Tower cues | Data / state | To build |
|---|---|---|---|---|---|---|---|
| 1 | The mists close | Game start, after calibration; the party enters on a road space at a random board edge | Clock start, board, mist boundary (board edge = impassable) | Title → arrival scene → "the road is gone" → hunter intros (ties to open-scene beats) | Calibrate (confirmed by a player); light rise (setLED breathe, low to high); wind/bell sound; one rotateWithState (grind) | Seed, start kingdom, clock = Day 1 dusk | Setup flow, calibration gate, scene player, cue library |
| 2 | Burgomaster's house | **K1 Citadel** (or forced at the first dusk) | Ward state for the woman; bitten track (hers starts at 1); party gains NPC escort; first skull | Scene; "she joins" card; escort token shown on party panel; first choice (stay vs go) | Seal-style lights (seq 14 HW) without breaking a seal; heartbeat-like sound | `woman.bite=1`, `woman.withParty`, father dead flag | Escort NPC model, protection rules (who guards her at night) |
| 3 | Fortune reading | End of chapter 1 at the **K1 Bazaar** (see §2b) | Randomizer (§4); 4 draws: Sunsword-analog, Holy Symbol, Tome, lair | Card reveal on the Mac; every iPad gets cryptic clues in the journal | Each draw: rotateWithState of one drum to the matching glyph side + flicker; final draw: seal light on the lair side | Seed → 3 artifact locations, lair, Count objective | Randomizer, clue text slots, journal |
| 4 | Procession of dead hunters | **Midnight beat of each night**: just before the night's key set piece (K1: after set piece 5), wherever the party is; one hunter's ghost per night | Beat; private ties; ghost dialog choice → a clue or a corruption | Full-screen procession; the spotlighted hunter's iPad gets a private prompt | Dim all → slow breathe; bell toll; one skull drop asked of the players | Which hunter tonight, tie-progress per hunter | Beat sequencer, per-device private screens |
| 5 | Father Oskar's open grave | **K1 Sanctuary** churchyard | Clue journal; riddle check; fight vs risen priest (battle-card shape) | Search mini-interaction; riddle assembler; battle | Low sound + one flicker; on the priest rising: Battle glyph turned toward the party's kingdom | Riddle fragments found, Oskar state | Riddle UI, battle engine (card draw, items as advantages) |
| 6 | Drawbridge and gate | **Night 5**, first move onto the castle space; **locked until all 3 artifacts are held** | Hazard check; items (rope, holy water); failure = a bite (corruption) or a lost item | Hazard screen: choose approach, resolve | Bottom drum rotateWithState (gate grinds, automatic); chain/creak sound | Gate open flag, artifacts held | Hazard resolver, castle entry gate |
| 7 | Portrait gallery | Castle dungeon room (fixed in the castle graph) | Dungeon room; gaze-attack encounter; reveal: the lost love's painting has the woman's face | Room view; tap portraits; one is hostile | Flicker one side; sound sting | `galleryRevealSeen` (feeds the Tome) | Dungeon graph engine, room types |
| 8 | Catacombs | Crypts under the Holy Symbol site (chapter 2–4 kingdom from the fortune) | Separation: the party splits on the board; undead lookalikes swapped in | **Per-iPad secret info**: one player's hunter may be a lookalike; reveal check | Rotate top + middle (rotateWithState) as passages shift; seal break when the lookalike is unmasked | Split groups, lookalike assignment | Party-split model, hidden-role per device |
| 9 | Finding the Tome | **K4 (always last chapter)**, building from the fortune
| 10 | Final confrontation | **Night 5**, lair room in the tower (fortune); **only with all 3 artifacts** | Boss battle (5-card shape like the adversary); artifacts as advantages; woman's state affects the ending | Boss battle; outcome epilogue | Seal break (one or more); all drums rotate (one at a time); big sound; skull drops as Count summons | Artifacts held, woman.bite, bites | Boss battle, ending matrix |

---

## 2b. Chapter / kingdom structure

**Shape (decided):** Chapter 1 in **one kingdom** (K1, random by seed), night 1. Chapters 2 and 3 in K2 and K3, recovering the Blade and the Holy Symbol (fortune decides which is where). **Chapter 4 is always K4 and the Tome** (Bob), so the woman's ambiguity holds until the last chapter. Night 5: the tower assault, open only with all three artifacts.

| Chapter | Kingdom | Accomplishment | Set pieces | Opens when |
|---|---|---|---|---|
| 1 Arrival and reveal | K1 = start parish | Woman under protection; fortune read; Oskar's riddle | 1, 2, 3, 5 (4 starts at the first midnight) | Game start |
| 2–3 | K2, K3 (order of these two: players choose, Q18) | **The Blade** and **the Holy Symbol** (which kingdom holds which: fortune) | Blade chapter: dungeon at its site; Holy Symbol chapter: **8 catacombs**. 4 at midnight | Key of the previous chapter held |
| 4 | **K4 (always last, Bob)** | **The Tome** | **9 finding the Tome**; 4 at midnight | Key of the previous chapter held |
| Finale: the attack on the tower (night 5) | Tower (castle) | Destroy or drive out the Count | **6 drawbridge**, **7 gallery**, **10 confrontation** at the lair room | **All 3 keys (artifacts) held** |

### Set piece → kingdom and building
| # | Set piece | Kingdom | Building / place |
|---|---|---|---|
| 1 | Mists close | K1 | Road at the K1 board edge → **K1 Village** (the inn) |
| 2 | Burgomaster's house | K1 | **K1 Citadel** |
| 3 | Fortune reading | K1 | **K1 Bazaar** (the teller's camp) |
| 4 | Procession | Wherever the party is at midnight | Any (floating beat) |
| 5 | Oskar's open grave | K1 | **K1 Sanctuary** churchyard |
| 6 | Drawbridge | Tower | Space next to the tower (entry) |
| 7 | Portrait gallery | Tower | Castle room (fixed) |
| 8 | Catacombs | Holy Symbol's kingdom | The building the fortune drew (crypts beneath it) |
| 9 | Finding the Tome | **K4** | The building the fortune drew |
| 10 | Final confrontation | Tower | Lair room drawn by the fortune |

### Location coverage (every kingdom and building)
"Site" = the building the fortune drew for that kingdom's item; the other three buildings carry chapter-local content.

| Kingdom | Village | Sanctuary | Bazaar | Citadel |
|---|---|---|---|---|
| **K1 (ch 1)** | Inn: set piece 1, day encounters, first skull | Churchyard: set piece 5; kit, rest, cure | Teller: set piece 3; buy/trade kit | Burgomaster: set piece 2; the woman joins |
| **K2–K4 (ch 2–4), generic** | Rumors and clues to the site; day/night tables; fallen-house risk | Safe rest for the woman; holy water, wafers; cure (remove a corruption); kit refill | Reagents, silver, garlic; one rumor; Renfield-type madman | Local lord: permission, a key, or a false lead; private-tie beat for Tomas |
| **Site (one building per kingdom, by fortune)** | K2/K3 Blade: under a ruined house · K4 Tome: burned archive | K2/K3 Holy Symbol: crypt → catacombs (8) · K4 Tome: abbey library | K2/K3 Blade: the smith's · K4 Tome: stolen goods | K2/K3 Blade: guard post armory · Holy Symbol: the lord's chapel · K4 Tome: the lord's study |
| **Tower** | — | — | — | Drawbridge (6), gallery (7), lair (10); castle table |

Every building has a job in every chapter; the four buildings of a kingdom always offer: clue (Village), safety and cure (Sanctuary), items (Bazaar), authority (Citadel).

---

## 2c. Night and beat sequence (narrative pacing, not time)

**Rule (Bob, round 3):** each kingdom is solved in **exactly one night**. "Night" is pacing, not a budget: there are **no ticks and no action costs**. A chapter ends when **all of its set pieces are done**: the party gets that kingdom's **key (artifact)**, and the next kingdom unlocks. Night 5 is the tower assault.

**Beat template for every night** (the sequencer moves to the next beat when the previous one completes):

| Beat | What happens | Tower (automatic) |
|---|---|---|
| B1 Arrival (day) | Party enters the kingdom; intro scene | Lights to day level |
| B2 Investigation (day) | Visit buildings for clues; **each building visit outside a set piece = 1 day-table draw** | Per encounter |
| B3 **Dusk** | Fires when the site is found (K1: after set piece 2). **Count's dusk move** + players drop a skull | Red light rise; skull drop |
| B4 Night travel | Visits after dusk draw from the **night table** (one draw per visit) | Per encounter |
| B5 **Midnight** | Procession (4) + the night's Count intervention, **right before the key set piece** | Bell; breathe |
| B6 Key set piece(s) | K1: 3 fortune · K2/K3: Blade site / 8 catacombs · K4: 9 Tome | Per set piece |
| B7 **Dawn / key** | Key awarded, next kingdom unlocks; foes escalate; Count withdraws | Seal break (chapter seal); lights to day |

| Night | Kingdom | Set pieces in order | Key |
|---|---|---|---|
| 1 | K1 | 1 mists → 2 burgomaster → (dusk) → 5 Oskar's grave → (midnight: 4) → 3 fortune | none (the fortune unlocks K2/K3) |
| 2 | K2 or K3 | site dungeon or 8 catacombs | Blade or Holy Symbol |
| 3 | the other | the other | the other |
| 4 | K4 | 9 Tome | Tome |
| 5 | Tower | 6 drawbridge → castle rooms (castle-table draw per room) → 7 gallery → (midnight: final call) → 10 lair | — |

Encounter outcomes never cost time; outcomes that would have cost time instead give **an extra draw on the next visit**.

**Count's dusk move (B3, nights 1–4):** he goes to a building in the current kingdom, chosen by objective: 1 the woman's building or the nearest unheld Sanctuary; 2 the building of the hunter with the most corruptions; 3 the Blade carrier; 4 the building with the most skulls (it falls). The app shows where to place the mini. Night 5: he is in the lair room.

**Loss conditions:** any hunter takes a **3rd corruption** (base rule, all sources) · **the woman is taken** · the skull supply runs out (base rule).

## 3. Random encounters

**Trigger (beats, §2c):** one **day-table** draw per building visit before dusk (B2); one **night-table** draw per visit after dusk (B4); one **castle-table** draw per castle room on night 5. No draws inside set pieces. "Bitten +1" = **take 1 corruption card**; "woman.bite" is app-only.
**Resolve with:** a choice screen → item use (counts as an Advantage), a check by hunter stat, or the battle-card shape. Costs/rewards are **only**: extra draws, skulls (players place one on a building), bitten +1/−1, items, clues. **Never warriors/spirit.**

### Day (village, roads, churchyard)
| d | Encounter | Resolution | Outcome |
|---|---|---|---|
| 1 | Funeral cortège, coffin knocks from inside | Stake or let it pass | Stake: clue; ignore: skull at nearest Village at dusk |
| 2 | Peddler with "holy" trinkets | Emeric checks fakes | Gain item, or a fake (silently useless) |
| 3 | Wolf tracks circling the woman's door | Wren tracks | Clue to a lair parish; or an extra draw next visit |
| 4 | Asylum escapee, a Renfield-type, eats flies, babbles of "the Master" | Talk | A true and a false clue |
| 5 | Garlic gone missing from a sanctuary | Agnes investigates | Restore: remove 1 skull there |
| 6 | Bloodless livestock | Search | Clue + an extra draw next visit |
| 7 | Gypsy-cart Szgany guards hauling earth boxes | Fight or follow | Follow: lair hint; fight: battle |
| 8 | **Rust monster** in the smithy | Battle; metal items at risk | Lose a silver item, or win a rusted key |
| 9 | Fog bank at noon | Lose way | Extra draw next visit |
| 10 | Quiet day | — | Woman's bite −1 if she rested at a sanctuary |

### Night (open, the Count hunts)
| d | Encounter | Resolution | Outcome |
|---|---|---|---|
| 1 | Children of the night: wolf pack | Battle | Loss: bitten +1 for one hunter |
| 2 | Bats at the window, the woman sleepwalks | Guard check | Fail: woman.bite +1 |
| 3 | Three brides singing on the road | Resist (crucifix) | Fail: a hunter bitten +1 |
| 4 | Zombies from turned graves | Battle | A skull goes on the nearest Sanctuary |
| 5 | Mist pours under a door | Holy water / wafer seal | Fail: Count intervention fires |
| 6 | Ghoul at the charnel house | Battle | Win: item |
| 7 | A turned villager begs to be let in | Invite or refuse | Invite: skull + woman.bite +1 |
| 8 | Will-o'-wisp leads off the road | Wren check | Fail: two extra draws |
| 9 | **Gelatinous cube** in the flooded crypt lane | Battle | Win: found dropped artifact clue |
| 10 | Silent night | — | Skip the next draw |

### Castle (dungeon rooms)
| d | Encounter | Resolution | Outcome |
|---|---|---|---|
| 1 | **Rust monster** in the armory | Battle | As day 8 |
| 2 | Spectre of a castle guard (Tomas recognized) | Tomas talks | Shortcut room or alarm |
| 3 | Animated armor | Battle | |
| 4 | The accountant at his ledger (Lief-type) | Talk | Clue to the Tome's room |
| 5 | Vampire spawn in a sarcophagus | Stake check | |
| 6 | Witches in the tower kitchen | Battle or bargain an item | |
| 7 | Bat swarm, torches out | Darkness: next room is blind | |
| 8 | Crawling claws | Battle | |
| 9 | **Mimic** coffin | Battle | Win: item |
| 10 | Strahd's echo: an empty room with his voice | — | Count intervention fires |

### The Count's interventions (deliberate, not table draws)
| Intervention | Fires when | Tower cue |
|---|---|---|
| Courtly visit / taunt about a hunter's tie | Midnight beat (B5) of night 1; nights 2–4 at B5 if the party visited a Citadel after dusk (private on the target's iPad) | Red breathe, voice-only (app audio) |
| Snatch attempt on the woman | Midnight beat (B5) on nights 2 and 4 (objective 1, C6), or any B5 where she is not with ≥2 hunters / no Sanctuary held | Seal-sequence lights + skull drop |
| Dusk move + turns a village | **Dusk beat (B3), nights 1–4**: mini placed, players drop a skull and place it where it lands | Skull drop (HW sensor) |
| Weakens an artifact (objective "destroy the Sunsword") | The first night-table draw after the Blade is found | Flicker |
| Strikes and withdraws | When any hunter reaches 2 corruptions | Rotate a drum |
| Summons fog (blocks a road) | On the first visit after dusk in K4, before the Tome | Breathe |
| Lookalike swap (objective "replace a hunter") | During set piece 8, or the B5 midnight beat of night 4 | Seal break |
| Final night call | Dawn beat of night 4 (after the Tome): "come to me" scene; night 5 opens | Full cue |

---

## 3b. Gear, potions and items

Story items replace RtDT potions/gear/treasures (rules: potions unlimited, gear one each, treasures max 4). **No item costs or grants warriors or spirit.** Items come from **visits** (one pick per Bazaar/Sanctuary visit), found in encounters, or granted by set pieces.

| Category | Examples | Acquired | Consumable? | Used for | Shared / per hero | Limit (proposed) |
|---|---|---|---|---|---|---|
| **Hunter's kit** (drac) | Stake and mallet, crucifix, silver bolts, garlic, lantern, rope | Start kit per hunter; Bazaar/Sanctuary visit (one pick per visit); encounters | Persistent, except silver bolts and garlic (uses) | Advantages in battle (by trait), encounter options, warding the woman at night | **Per hero** | 4 kit slots per hunter |
| **Potions and reagents** (Emeric) | **Holy water**, **the host** (consecrated wafer), garlic tincture, smelling salts | Sanctuary (holy water, the host), Bazaar (reagents), Emeric brews 1 per Sanctuary rest | **Consumable** | **Cleanse skulls** (holy water: remove 1 skull, or all 3 with Agnes); **cure: holy water or the host removes 1 corruption card** (cannot save a hunter already at 3: that is a loss); the host also seals a doorway vs mist | **Shared satchel** | 6 in the satchel |
| **Artifacts** (3 chapter items) | The Blade (sunlight), the Holy Symbol, **the Tome** | One per chapter at the fortune-drawn site | Persistent | Blade: final battle advantage + kills spawn; Holy Symbol: wards the woman (no snatch attempt); **Tome: reveals the truth (9) and lets the party read his weakness: 1 extra advantage vs the Count** | Party-held, assigned to a carrier (the Count can target the carrier, objective 3) | One each |
| **Clue items** | Oskar's four margin clues (open), his map, letters, the cipher page, portrait fragments | Set pieces and encounters | Persistent (journal) | Solve the riddle / confirm sites; fake clues exist (day 4) | Shared journal; **private ties** go to one hunter's iPad | Unlimited |

**How each is used against the Count:** kit and artifacts act as advantages in the final battle (5-card shape); the Holy Symbol stops snatch attempts; garlic/the host blocks one intervention a night.

**Cures (Bob, round 3):** only **holy water**, **the host**, and **Sanctuary rest** (remove 1 corruption; once per Sanctuary per night, before dusk; not for a thirsting hunter after dusk). No spirit is spent (base-game Sanctuary cure is out of scope).

**Display:** iPad hunter sheet (4 slots, tap to use, greyed when not usable here); shared satchel and artifacts on every iPad; journal tab; Mac shows only the artifacts held. Item use in battle = tap the item on a card.

**Data model (sketch):**
```ts
type ItemKind = "kit" | "potion" | "artifact" | "clue";
interface ItemDef { id: string; kind: ItemKind; name: string;
  traits: Trait[];                 // advantages it grants: "undead" | "beast" | ...
  uses?: number;                   // undefined = persistent
  effects: Effect[];               // cleanseSkull, cureBite, wardEscort, blockIntervention, revealClue
  tower?: CueId; }                 // cue on use
interface Holding { itemId: string; owner: HunterId | "party"; usesLeft?: number; }
interface Journal { clues: { id: string; text: string; true: boolean; privateTo?: HunterId }[]; }
```

**Where items touch the tower:** holy water cleanse → Cleanse glyph turned to that parish + soft sound; artifact found → **a seal breaks** (chapter seal); Blade drawn in the finale → full light rise; Holy Symbol warding → breathe on the escort's side. All through the cue library; no item needs a new hardware capability.

---

## 4. The randomizer (fortune reading, fits §2b)

Read at the end of chapter 1. Uses the seed. Each draw turns a drum so its glyph faces the drawn kingdom (rotateWithState; glyph facing is library-computed, HW?).

**Draw 1: Blade and Holy Symbol between K2 and K3** (the Tome is **always K4**, Bob)
| d2 | K2 | K3 | K4 |
|---|---|---|---|
| 1 | Blade | Holy Symbol | Tome |
| 2 | Holy Symbol | Blade | Tome |

**Draw 2: building per item** (d4 each, including the Tome in K4; the site entry in §2b)
| d4 | Building | Glyph shown on the reading |
|---|---|---|
| 1 | Village | Banner |
| 2 | Sanctuary | Cleanse |
| 3 | Bazaar | Reinforce |
| 4 | Citadel | Battle |

**Draw 3: the lair in the tower** (d4)
| d4 | Castle room | Tower cue at the reading |
|---|---|---|
| 1 | Crypt of his family (beneath) | Bottom drum turns, low light |
| 2 | Chapel of the fallen love | Middle drum, breathe |
| 3 | Tower top where she fell | Top drum, flicker |
| 4 | His study / throne room | Quest glyph shown, seal light |

**Count objective (d4):** 1 Claim the woman (default; a snatch every 2nd night). 2 Replace a hunter (catacombs lookalike stays). 3 Destroy the Blade (hunts its carrier). 4 Turn the valley (extra skull each dusk; lose at N fallen buildings).

## 5. Build list (by dependency)

| # | Component | Depends on | Can build now? |
|---|---|---|---|
| 1 | Tower service (POC M2: executor, correlation, holds) | — | Yes, already planned |
| 2 | Tower cue library (named cues → caps; rotateWithState only) | 1 | Yes |
| 3 | Seal ledger + seal plan + skull-landing prompt | 1 | Ledger yes; plan needs Q7 |
| 3a | **Automatic scene cue runner** (calibration check, spacing, no echo-waiting, skips held caps) | 1, 2 | Yes, once CL/spec are amended (doc change D1) |
| 4 | Game state store + seed | — | Yes |
| 5 | Multi-device sync: Mac host + **one iPad per hunter**, private views | 4 | Yes (Q3 resolved) |
| 6 | **Chapter and beat sequencer** (5 nights, beats B1–B7, set-piece completion → key → unlock; fires draws and interventions at beats) | 4 | Yes |
| 7 | Board model (4 parishes × 4 buildings + tower) | 4 | Yes |
| 8 | Kingdom unlock + tower gate (keys) | 6, 7 | Yes (folded into 6 if simpler) |
| 9 | Randomizer (fortune, §4) | 4, 7 | Yes |
| 10 | **Item system** (defs, holdings, slots, satchel, effects) | 4 | Yes; limits need Q15 |
| 11 | Journal + riddle + private clues | 4, 5 | Yes |
| 12 | Scene player (narration, TTS, music, cue steps) | 2, 5 | Yes |
| 13 | Encounter deck engine + hazard resolver | 6, 7, 10 | Yes |
| 14 | Battle engine (cards, items as advantages) | 10 | Needs Q5 |
| 15 | Corruption mirror (all sources) + loss at 3; escort ward; snatch rule; cures | 6, 10 | Yes |
| 16 | **Count's board presence** + AI / interventions | 6, 9, 15 | Needs Q16 |
| 17 | Foe reskin + spawn/escalation | 13, 14 | Needs Q17 |
| 18 | Dungeon graph (castle, catacombs, sites) | 7, 13 | Yes |
| 19 | Party split + lookalike hidden role | 5, 18 | After 5 |
| 20 | Set pieces 1–10 content, location content (§2b) | all | After the story |
| 21 | Endings matrix | 15, 16 | After the story |

## 6. Open questions for Bob

### Resolved (2026-10-14)
| Q | Answer |
|---|---|
| 1 Scene cues vs house rule | **All scene cues fire automatically, drums and seals included** (overrides CL for scene cues) |
| 2 Clock | **5 nights as narrative pacing**: one night per kingdom, solved by completing its set pieces (key unlocks the next); night 5 tower. No ticks or costs |
| 3 Devices | **One iPad per hunter**, private info |
| 4 Bites | **Base-game corruption cards**; a 3rd corruption on any hunter loses the game |
| 13 Chapter order | **Set per story; here the Tome (K4) is always last.** K2/K3 order still free (see 18) |
| 14 Tower before all items? | **No: all three artifacts required** |

### Conflicts
| # | Conflict | Status |
|---|---|---|
| C1 | 3rd corruption: lose the game or turn? | **Resolved: base rule. One hunter at 3 corruptions loses the whole game.** Losing the woman is also a loss |
| C2 | Do base-game corruptions count? | **Resolved: every corruption counts** |
| C3 | Artifact not found by dawn | **Resolved: no time pressure; a kingdom is always solved in one night; its set pieces award the key** |
| C4 | Cures without spirit | **Resolved: holy water, the host, Sanctuary rest** |
| C5 | Automatic drum/seal cues need a calibrated tower; calibration stays manual | Kept: calibrate in setup (set piece 1); scenes skip/defer drum cues when not calibrated and log it |
| C6 | Snatch timing with 4 nights | Kept: snatch at the midnight beat of nights 2 and 4 |

### Doc changes these answers need (not made; docs are outside this file)
| # | File | Change |
|---|---|---|
| D1 | `CLAUDE.md` § Tower safety | "Nothing physical happens automatically" → add: except tower cues fired by a game scene (game app); calibrate, reconnect and retry stay manual |
| D2 | `apps/tower-poc/spec.md` (not in this copy) | Matching decision for the game; tower-poc itself may keep the strict rule |
| D3 | `research/stories/dracula/README.md`, `opening-scene.md`, tts STORY.md | "Six nights" → 5 nights of pacing; bitten track = corruption; README's "Bitten heroes … slowly turns" and "Sunrise is the win timer" no longer apply |
| D4 | `research/game-design/core-mechanics.md` | "every action costs time on the clock" does not hold for this story: beats, not time; corruption reuse |
| D5 | `research/decisions/` | A new ADR for the automatic-cue override (cross-app) |

### Still open
5. **Hunter stats** for checks, with warriors/spirit out?
6. A dread/fear track, or are clock + skulls enough?
7. **Seal plan:** layout of the 12 and which break when.
8. **Skull landing:** players report the kingdom, or the app assigns?
9. Rotation light sequences 15–18 stay held: OK to design without them?
10. **The Tome's truth:** fixed or set by the seed?
11. Do Oskar's margin clues become the fortune clues, or a separate layer?
12. Which capabilities does tower-poc expose today? (Code not in this copy.)
15. **Item limits:** 4 kit slots, 6-potion satchel, items cost only time?
16. **The Count's mini:** Dark Horde adversary mini or a token?
17. **Foe reskin:** which physical foes stand in for wolves, zombies, brides?
18. K2/K3 order: players choose, or set by the seed?
19. Should the night/day table split stay, now that "dusk" is a beat (after the site is found) rather than a time?
20. Sanctuary rest limit (once per Sanctuary per night, before dusk) OK?
