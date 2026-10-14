# Dracula (Vellmoor) asset map

Status: draft for Bob's review, 2026-10-14; updated 09:55 for Loremaster's final scripts; §1b re-done 10:30 for the D-DRA-10 rework (`assets/stories/dracula/scripts/`, 19 scenes incl. `n5-ending-endures`). Design only. Nothing here is decided.

**Names (final scripts):** Lenka Morosz = the woman · Anton Morosz = the dead burgomaster · Vlad = the Count · Ludmila = his lost love · Sergiu = his murdered brother. Older rows that say "the woman" mean Lenka. Readiness findings for the scripts are in [readiness-review.md](readiness-review.md).

This file maps every set piece, encounter, Count intervention, randomizer result and item in [../stories/dracula/mechanics-map.md](../stories/dracula/mechanics-map.md) (the "map") to assets we already have: tower outputs, RtDT components and procedures, and 1981 *Dark Tower* events. It also flags what has no good asset or hurts fun, and generalizes each Dracula mechanic into a story-neutral engine mechanic (§8). Following Bob's 2026-10-14 scope change, the mechanics map is treated as **story requirements**, not engine spec.

Sources: `spike` = [../tower/spikes/2026-10-13-noble-macos.md](../tower/spikes/2026-10-13-noble-macos.md) · `api` = [../tower/api-surface-7.1.2.md](../tower/api-surface-7.1.2.md) · `inv` = [../return-to-dark-tower/component-inventory.md](../return-to-dark-tower/component-inventory.md) · `rules` = [../return-to-dark-tower/game-overview-and-rules.md](../return-to-dark-tower/game-overview-and-rules.md) · `cat` = [dt-asset-catalog.md](dt-asset-catalog.md) and [asset-catalog.md](asset-catalog.md) (both exist; ids `AST-*` come from asset-catalog.md) · `1981` = the original game, **from general knowledge only** (no 1981 research note exists, per `cat`).

## 0. Conventions

### Bob's rulings this map follows
Chapter 1 is all in one kingdom (K1), then one kingdom per night · finishing a kingdom's set pieces earns its key · the Tome kingdom (K4) is last · night 5 is the tower assault and needs all three keys · a 3rd corruption loses the game · cures come only from holy water, the host or Sanctuary rest · each hunter has a private iPad · tower cues fire automatically · warriors and spirit work as in the base game (no story costs or rewards).

### Tower capability status (strict)
| Code | Capability | Status | Evidence |
|---|---|---|---|
| T-CAL | Calibrate (all 3 drums spin home, ~21 s) | **Verified** | spike runs 2, 3 |
| T-ALL | `allLightsOn` / `allLightsOff` | **Verified** | spike |
| T-LED | `setLED` per light with effect breathe / breatheFast / breathe50percent / flicker | **Library** (only on/off seen) | api §9–10 |
| T-SEQ14 | Light sequence 14 (`seal`) | **Verified** (acknowledged, run 2) | spike F4 |
| T-SEQ | Other named light sequences (21 total; only `twinkle` = 1 and 14–18 are named in research) | **Library**; names **GAP** | api §9 |
| T-ROT15 | Rotation sequences 15–18 | **Verified lights only, no drum moves, no answer, 30 s queue stall → HELD. Do not use** | spike F4/F7 |
| T-SND1 | `playSound` index 1 | **Verified** (heard) | spike |
| T-SND | Any other of the 113 sounds | **Library**; which sample is a bell, wolf, door etc. is **GAP** (no names in research) | api §9, cat |
| T-LOOP | Looped sound | **GAP** (did not loop, spike F9). Ambience is app-side only | spike |
| T-VOL | Volume levels | **Library**, mapping unverified | api §4 |
| T-SEAL | `breakSeal` lights + sound | **Verified** (one seal, uncalibrated). Which seal is where: **GAP**. Firmware does not track broken seals: app ledger required | spike F2, api §7 |
| T-ROTT | `rotateWithState`, **top drum** | **Verified** (keeps lights, ~1.1 s) | spike F8 |
| T-ROTMB | `rotateWithState`, middle / bottom drum | **Library** (spin seen during calibration only) | spike "Not checked" |
| T-GLY | Glyph facing a kingdom | **Library** (computed by the library, not reported by the tower) | api §7 |
| T-SKL | Skull drop sensor (count) | **Verified** (2 drops) | spike F11 |
| T-SKLK | Where a skull lands (kingdom) | **GAP**: not reported; players report it | spike, cat |
| T-REL | Make the tower release N skulls | **GAP**: no API; emergent drum behaviour | api §6, inv §6 |
| T-COL | LED **colour** (e.g. "red") | **GAP**: no research document states the LEDs are colour-controllable. Every "red light" in the map is a GAP; design for brightness + effect only | api, inv |

**Cue rules applied everywhere:** a cue that needs drums (T-ROTT/T-ROTMB, glyph) is skipped and logged if `isCalibrated` is false; seals and lights may fire uncalibrated (spike F2); 300–500 ms between drum/long-audio cues (api §12); never wait for a sound to finish (api §3); never T-ROT15 or legacy Rotate/randomRotate (they kill lights, spike F8).

### Screen fallback columns
- **Where:** `Shared` = the shared table screen (Mac host / shared view); `Private:<hunter>` = that hunter's own iPad; `All-private` = each hunter sees a different thing on their own iPad.
- **Media:** `Still` = illustrated card/image with text; `Clip` = short animated clip (2–6 s) or animated card.
- **Fallback when the tower is off:** what the screen shows instead of the tower cue. **Every** tower cue also gets a small "tower" glyph on the Shared screen when it fires, so a missed cue can be noticed.
- **Illusionist notes** use `[sfx: …]` and `[music: …]` for app-side audio. App audio always plays; tower audio is extra.

### 1981 references
Marked `1981:` and from general knowledge (keys, frontiers, brigands, dragon, plague, lost, cursed, scout, healer, tomb/ruin, bazaar, sanctuary, citadel, tower battle). No 1981 sound samples are known to be on the tower (**GAP**).

---

## 1. Set pieces (10)

| # | Set piece | Board / RtDT assets | 1981 | Tower cue (status) | Fallback (tower off) | Where | Media | Illusionist |
|---|---|---|---|---|---|---|---|---|
| 1 | The mists close | K1 road space at board edge; 4 hero minis; K1 Village building = the inn | Frontiers (board edge you cannot cross) | Calibration as "the tower wakes" (T-CAL **Verified**); then `setLED` breathe rising (T-LED **Library**); one sound (T-SND **Library**; bell sample **GAP**); one top-drum grind (T-ROTT **Verified**) | Mist rolls over the board image; the road dissolves; calibration progress shown as "the castle stirs" | Shared; then Private:each for hunter intro + private tie hint | Clip | [music: low strings, wind] [sfx: distant wolves, church bell] [sfx: stone grind on drum] |
| 2 | Burgomaster's house | K1 Citadel; **companion quest standee** (inv §1) as Lenka Morosz; corruption cards not used for her (app-only ward) | Citadel (home/rally point) | Seal sequence lights **without** breaking a seal (T-SEQ14 **Verified**); heartbeat-like sound (T-SND **Library**, sample **GAP**) | Her portrait card with a pulse effect and her ward meter (1/3) | Shared; "stay vs go" vote on each Private | Still (portrait) + Clip (pulse) | [sfx: slow heartbeat] [music: solo violin] |
| 3 | Fortune reading | K1 Bazaar; RtDT **seed** (rules) drives it; quest standees mark the drawn sites | Riddle of the keys | Per draw: one `rotateWithState` so a glyph faces the kingdom (T-ROTT **Verified** top; T-ROTMB / T-GLY **Library**) + flicker (T-LED **Library**); last draw: seal sequence (T-SEQ14 **Verified**) | Animated card turn per draw on Shared; glyph icon on the drawn kingdom of the board image | Shared (cards); Private:each (a different cryptic clue per hunter, into their journal) | Clip (card flips) | [sfx: card slap, candle hiss] [music: accordion drone] |
| 4 | Procession of dead hunters | Floating, wherever the party is; one **skull drop** (T-SKL) | — | Lights down (T-ALL **Verified**) → slow breathe (T-LED **Library**); bell (T-SND **Library**, **GAP**); players drop one skull (T-SKL **Verified**); landing reported by players (T-SKLK **GAP**) | Ghost line crossing the Shared screen; on-screen "drop a skull / place it on the building shown" with a randomly chosen kingdom if the tower is off | Shared (procession); Private:spotlighted hunter (the ghost's question and the choice) | Clip | [sfx: bell toll ×12, footsteps] [music: cut to silence] |
| 5 | Oskar's open grave | K1 Sanctuary; **dungeon token** (inv §1) on the churchyard; foe: risen priest = a **Lemure** token/mini (Library of physical pieces; reskin needs Bob, Q17) | Tomb (empty / treasure / fight) | One flicker (T-LED **Library**) + low sound (T-SND **Library**); on the priest rising: Battle glyph turned toward K1 (T-GLY **Library**, needs calibration) | Grave image with clickable search spots; battle uses RtDT battle-card screen shape | Shared (search, battle); Private: each margin clue holder taps their fragment into the riddle | Still (search) + Clip (priest rises) | [sfx: shovel, earth falling, a groan] [music: low choir] |
| 6 | Drawbridge and gate | Space next to the tower; artifacts held (3 keys) | Keys open the Tower (brass/silver/gold); tower entry | Bottom drum `rotateWithState` (T-ROTMB **Library**) as the gate; chain sound (T-SND **Library**, **GAP**) | Gate clip lowers on Shared when the 3 keys are shown | Shared; approach choice voted on Private | Clip | [sfx: chains, creak, splash] [music: brass swell] |
| 7 | Portrait gallery | Castle room (app dungeon graph, RtDT dungeon procedure) | Tower battle floor by floor | Flicker on one side (T-LED **Library**); sting (T-SND **Library**) | Gallery wall; tap portraits; the hostile one animates | Shared; the portrait reveal (her face) also as Private:Agnes (tie: why she was spared) | Still + Clip (hostile portrait) | [sfx: canvas tearing, whisper] [music: music-box waltz] |
| 8 | Catacombs | Dungeon token at the Holy Symbol site; party split = hero minis on different spaces; lookalike swap | Tomb / ruin | Top + middle drum `rotateWithState`, one at a time (T-ROTT **Verified**, T-ROTMB **Library**) as passages shift; `breakSeal` on unmasking (T-SEAL **Verified**) | Map of passages redraws; unmask clip | All-private (each split group / the lookalike sees different text); Shared for the map only | Clip | [sfx: dripping, stone shift] [music: low pulse] |
| 9 | Finding the Tome | K4 building drawn by the fortune; quest standee on it | Ruin (treasure) | Seal sequence (T-SEQ14 **Verified**) or a real seal break at the key (B7, T-SEAL **Verified**) | Tome opens page by page on Shared; the truth about Lenka (Ludmila reborn) | Shared (book); Private:Emeric (the cipher page decodes); Private:Tomas or Wren if their tie is touched | Clip | [sfx: page turns, wind] [music: theme in minor] |
| 10 | Final confrontation | Lair room; Count = adversary mini (**Dark Horde, ownership GAP**) or adversary token; RtDT **adversary battle (5 cards, retreat)** procedure | Tower battle / dragon (boss with a specific weapon: dragonsword → the Blade) | One or more `breakSeal` (T-SEAL **Verified**); drums one at a time, 300–500 ms apart (T-ROTT **Verified**, T-ROTMB **Library**); big sound (T-SND **Library**); skull drops as he summons (T-SKL **Verified**) | Boss card stack; each drum turn shown as a castle floor collapsing | Shared (battle); Private: each hunter picks which item to spend on their card | Clip | [music: full theme, drums] [sfx: thunder, bat swarm, dawn chime at the win] |

**Set piece 9 gap:** the map's row is unfinished (no mechanics, screens, cues, data). The row above is a proposal.

---

## 1b. Final scripts: scene by scene (19 scenes, re-reviewed 2026-10-14 10:30 ET)

Source: `assets/stories/dracula/scripts/` (README play order, after the D-DRA-10 rework). Moments = `scene.moment` IDs; variants are `scene.moment~variant`. Target per R-DEV-6: untagged = `dashboard`, `.private.<hunter>` = `ipad:<hunter>`. Every scene with private moments has one for each of the four hunters. Tower cues are the README cue names; status codes as in §0 (`dim-all`, `all-on` = T-ALL **Verified**; `heartbeat`, `heartbeat-fast`, `heartbeat-half`, `low`, `flicker` = T-LED **Library**; `seal-sequence` = T-SEQ14 **Verified**; `break-seal` = T-SEAL **Verified**; `drum-top` = T-ROTT **Verified**; `drum-middle`/`drum-bottom` = T-ROTMB **Library**, calibrated only; `skull-drop` = T-SKL **Verified**, landing named by the app). "A then B" rate changes are app-timed. Fallbacks live in the cue library (RR-8, Illusionist). Findings: [readiness-review.md](readiness-review.md) (`RR-n` = 09:55 review, `RR2-n` = 10:30 re-review).

| # | Scene (set piece) | DT / RtDT assets | 1981 | Tower cues → capability (status) | Fallback when the tower is off | Targets | Props |
|---|---|---|---|---|---|---|---|
| 1 | `n1-lantern-and-bell` (SP1) | K1 Village (inn); 4 hero minis; journal (margin riddle) | Frontiers; riddle | .01 dim-all + heartbeat; .08 dim-all + heartbeat + drum-top. No calibrate (RR-1 fixed) | Mist clip; pulse overlay; drum = app [sfx] | dashboard + 4 ipad (.10) | — |
| 2 | `n1-burgomasters-house` (SP2, now a crime scene) | K1 Citadel; Anton's body (art); **no Lenka standee** (she is already taken) | Citadel | .01 seal-sequence; .05 heartbeat-fast then heartbeat | Pulse overlay speeds up (no ward meter: no captive track) | dashboard + 4 ipad (.09) | pressed-flower (.03, .08, .09 wren) |
| 3 | `nx-pressed-flower` (dusk, **nights 1–4**, nightly clue to where Lenka is held) | App only; optional spare standee as the night's find | — | .01~night1–4 heartbeat | Violet still on the Dashboard (one per night) | dashboard still + **one** recipient ipad per night (`.02.private.<hunter>~nightN`, all 4 written each night) | pressed-flower (every moment) |
| 4 | `n1-open-grave` (SP5) | K1 Sanctuary; dungeon token; Oskar = Lemures | Tomb | .01 dim-all + flicker; .04 heartbeat + drum-top (calibrated only: battle glyph) | Grave still; battle glyph icon on the party's kingdom | dashboard only | — |
| 5 | `nx-midnight-procession` (SP4, nights 1–4) | Story skull drop (app names the building; cap 2/night; <6 in supply → +1 foe night 5) | — | .01 dim-all + heartbeat + skull-drop; .05 heartbeat then low | Ghost line clip; "drop a skull on {building}" card | dashboard + spotlit ipad (.03, .04 choice, ~answer, ~turn-away) + others `.04.private.<hunter>-watched` (RR-2 fixed) | ludmila-tome (.03 emeric, turn-away, .05~night4) |
| 6 | `n1-fortune-reading` (SP3) | K1 Bazaar; RtDT seed; 3 quest standees | Riddle | .03/.04/.06 drum-top/-middle/-bottom (calibrated only) + flicker; .07 seal-sequence + break-seal | Card flips; standee prompts; seal picture | dashboard + 4 ipad (.11 + ~turned-away) | sergiu-blade (.03~*), ludmila-tome (.06, .09, .11 emeric), pressed-flower (.02, .09) |
| 7 | `n23-sergius-blade` | Fortune building; Shadow Wolves; Count mini/token; Blade = quest item card **bound to a carrier** | Dragonsword; key | .03 dim-all + heartbeat; .06 break-seal | Count entrance clip; seal picture | dashboard + 4 ipad (.08) + dashboard `~guard-<hunter>` | sergiu-blade (every moment) |
| 8 | `n23-catacombs-of-saint-ysolde` (SP8) | Dungeon token; split party; **lookalike max 1**; 2 secret cards | Tomb / ruin | .01 drum-top then drum-middle (spaced from state reply); .06 break-seal; .07 heartbeat-fast then heartbeat | Passage map redraws; unmask clip | dashboard + 4 ipad (.04, .04~lookalike); secret cards **not yet targeted (RR2-2)** | sergiu-blade (.06~night3) |
| 9 | `n2-burgomasters-funeral` | Night-2 Sanctuary; Dorka = Mormos | Tomb | .04 dim-all + heartbeat | Candles-bow clip | dashboard + 4 ipad (.09) | pressed-flower (.10) |
| 10 | `n3-fly-eaters-cell` | Night-3 Citadel; Jakob portrait; price vote | Bazaar haggling | .04 heartbeat; .08 low | Flies-stop clip; price vote | dashboard + 4 ipad (.09) | ludmila-tome (.09 emeric), sergiu-blade (.06~obj3) |
| 11 | `n4-earth-boxes` | K4 box sites (dungeon tokens / skulls laid flat); finale ledger | Plague | .03~a/~c heartbeat-fast then heartbeat, ~b flicker then heartbeat, ~last dim-all then heartbeat-half; .06 dim-all + heartbeat | Flame clip per box (3 rotating + last); "Boxes left: n" text | dashboard + 4 ipad (.07) | pressed-flower (.05) |
| 12 | `n4-finding-the-tome` (SP9) | K4 Tome building; Tome = quest item card | Gold key | .01 seal-sequence + break-seal; .04 dim-all + heartbeat; .10 dim-all, heartbeat-fast then dim-all | Page-turn clips; final-call clip | dashboard + 4 ipad (.09, all "Narrator (private)") | ludmila-tome, sergiu-blade (.03, .07, .08, .10), pressed-flower (.04) |
| 13 | `n5-drawbridge` (SP6) | Tower space; 3 keys; Marta portrait | Keys open the Tower | .01 heartbeat; .02 drum-bottom; .07~drawbridge heartbeat-fast then heartbeat | Bridge-lowers clip | dashboard + 4 ipad (.06) | sergiu-blade (.01) |
| 14 | `n5-portrait-gallery` (SP7) | Castle room; hostile portrait | Tower battle | .01 flicker; .05 heartbeat | Gallery still; hostile portrait clip | dashboard + 4 ipad (.06) | pressed-flower (.04) |
| 15 | `n5-final-confrontation` (SP10) | Lair room; 2 Striga + Ilka (app); Count; RtDT adversary battle; story skull drops (≤2) | Tower battle; dragon + dragonsword | .01 dim-all + heartbeat + break-seal; .04 drum-top/-middle/-bottom (spaced) + skull-drop; .07 break-seal + all-on; .07~no-sword heartbeat-fast then low; **.06~carrier-falls dim-all (new)** | Floor-collapse clip per drum; boss cards; "blade lost" card | dashboard + 4 ipad (.08) | pressed-flower (.06), sergiu-blade (.07, .07~no-sword, .06~carrier-falls) |
| 16a | `n5-ending-rescued` (= **Rescued**, full win) | Mist lifts | Victory | .01 all-on | Dawn clip | dashboard + 4 ipad (.06) | sergiu-blade (.01, .02), pressed-flower (.02) |
| 16b | `n5-ending-endures` (**new**, lesser win: Lenka freed, sword lost) | Mist goes up the mountain (art) | — | .01 heartbeat-half then low | Mist-receding clip | dashboard + 4 ipad (.04) | sergiu-blade (.01, .03) |
| 16c | `n5-ending-taken` (loss: battle lost or retreat) | Violet on the road (art) | — | .01 heartbeat-half then dim-all | Window-closing clip | dashboard + 4 ipad (.04) | pressed-flower (.01, .01~retreat), ludmila-tome (.04 emeric) |
| 16d | `n5-ending-turned` (loss: 3rd corruption, any night) | — | Cursed | .01 dim-all, heartbeat-fast then heartbeat-half | Double-pulse overlay | dashboard + 4 ipad (.04, ~turned) | — |

**Ending stills (summary screen, one per outcome):** each ending's closing still is the outcome card on the summary screen (R-ENG outcome tiers) and needs a dashboard still render: Rescued = `n5-ending-rescued.07` (mist lifts, road back) · Endures = `n5-ending-endures.05` (Lenka on the hill road, mist thickening on the mountain) · Taken = `n5-ending-taken.05` (mist down, every castle window lit) · Turned = `n5-ending-turned.05` (one more window lit; `~night5` adds Lenka at the window). All four are [still] and dashboard-only.

**Totals:** 19 scenes · ~404 marked moments incl. variants (116 clip, 288 still) · 134 `ipad:` targets · tower cue names only from the README list (dim-all 15, heartbeat 23, heartbeat-fast 8, heartbeat-half 4, low 4, flicker 6, all-on 2, seal-sequence 3, break-seal 6, drum-top 5, drum-middle 3, drum-bottom 3, skull-drop 2). **No calibrate, no colour, no looped tower sound, no rotation sequences 15–18.**

**Endings selection** (from `n5-final-confrontation` Outcome and rulings.md): Rescued = battle won and `sergiu-blade` still held · Endures = Lenka freed but the blade lost because its carrier fell in the finale (`.06~carrier-falls`) · Taken = battle lost or the party retreats · Turned = any hunter's third corruption. No Lenka captive track. Precedence when the carrier falls **and** the battle is lost is not written yet (RR2-3).

## 2. Encounter tables (30)

Columns shortened: **Foe** = proposed RtDT stand-in (physical token; Dark Horde mini if owned). Foe reskins need Bob (Q17). Every outcome shows on Shared unless noted. Tower column: most table draws get a **light-only** cue so the tower does not grind every visit.

### 2a. Day (10)
| d | Encounter | Foe / RtDT asset | 1981 | Tower (status) | Fallback · Where · Media | Illusionist |
|---|---|---|---|---|---|---|
| 1 | Coffin knocks | Potion/treasure card art n/a; dungeon-style choice card | Tomb | Three knocks = sound (T-SND **Library**, **GAP** sample) | Coffin still, knock shake · Shared · Clip | [sfx: three knocks] |
| 2 | Peddler with trinkets | Bazaar building; **haggle die** (RtDT) for the price | Bazaar haggling | None | Peddler still; Emeric's fake-check result **Private:Emeric** only · Still | [sfx: coins, bells on a cart] |
| 3 | Wolf tracks | Shadow Wolves token near Lenka's building | Scout (prevents getting lost) | Breathe on lights (T-LED **Library**) | Tracks still · Shared; Wren's read Private:Wren · Still | [sfx: wolf howl, far] |
| 4 | Renfield-type madman | Village building | — | None | Portrait still; the **true** clue to one Private, the false one to another (players must compare) · All-private · Still | [sfx: buzzing flies, giggle] |
| 5 | Garlic missing | Sanctuary; remove 1 skull = RtDT **Cleanse** action shape | Healer | Cleanse glyph toward the kingdom (T-GLY **Library**) | Chapel still · Shared · Still | [music: plainchant hum] |
| 6 | Bloodless livestock | Village; foe hint | Plague | Flicker (T-LED **Library**) | Field still · Shared · Still | [sfx: flies, crow] |
| 7 | Szgany carts | **Brigands** token/mini | Brigands | Battle: sound (T-SND **Library**) | Cart clip; battle cards · Shared · Clip | [sfx: cart wheels, fiddle] |
| 8 | Rust monster in the smithy | **No fitting RtDT foe** (nearest: Spine Fiends) → GAP | — | Sound (T-SND **Library**) | Battle cards · Shared · Still | [sfx: metal crumbling] |
| 9 | Fog at noon | No piece; 1981 Lost | Lost (lose a turn unless scout) | `allLightsOff` then up (T-ALL **Verified**) | Fog clip over the board image · Shared · Clip | [sfx: muffled bell] |
| 10 | Quiet day | Sanctuary | Sanctuary | None | Still · Shared | [music: soft day theme] |

### 2b. Night (10)
| d | Encounter | Foe / RtDT asset | 1981 | Tower (status) | Fallback · Where · Media | Illusionist |
|---|---|---|---|---|---|---|
| 1 | Wolf pack | **Shadow Wolves** | — | breatheFast (T-LED **Library**); howl (T-SND **Library**, **GAP**) | Battle · Shared · Clip | [sfx: howls close] |
| 2 | Bats, Lenka sleepwalks | **Widowmade Spiders** as bat swarm (weak fit) | — | Flicker (T-LED **Library**) | Window clip · Shared; the guard check prompt on the guarding hunter's Private · Clip | [sfx: wings, window latch] |
| 3 | Three brides | **Striga** (inv: only 2 Striga minis; third = token) | Cursed | Breathe (T-LED **Library**) | Brides clip; each targeted hunter resists on Private · Clip | [sfx: female choir, distant] |
| 4 | Zombies from graves | **Lemures** | Plague | One skull drop (T-SKL **Verified**) | Graves clip; "place a skull on the nearest Sanctuary" · Shared · Clip | [sfx: earth breaking] |
| 5 | Mist under a door | none (host / holy water) | — | breathe50percent (T-LED **Library**) | Mist clip · Shared · Clip | [sfx: hiss] |
| 6 | Ghoul at the charnel house | **Mormos** | Tomb | Battle sound (T-SND **Library**) | Battle · Shared · Still | [sfx: bones crunch] |
| 7 | Turned villager begs | Village; skull | — | Sound at the door (T-SND **Library**) | Door still; vote on Private (secret ballot) · Still | [sfx: knocking, pleading voice (TTS)] |
| 8 | Will-o'-wisp | none | Lost | One light on (T-LED **Library**) moving side to side | Wisp clip · Shared · Clip | [sfx: chime] |
| 9 | Gelatinous cube | **No fitting foe** → GAP (nearest: Lingering Rot adversary mini, too big a piece) | — | Sound (T-SND **Library**) | Battle · Shared · Still | [sfx: wet slide] |
| 10 | Silent night | — | — | None | Still · Shared | [music: silence, crickets] |

### 2c. Castle (10)
| d | Encounter | Foe / RtDT asset | 1981 | Tower (status) | Fallback · Where · Media | Illusionist |
|---|---|---|---|---|---|---|
| 1 | Rust monster, armory | GAP (as day 8) | Tower battle | Sound (T-SND **Library**) | Battle · Shared · Still | [sfx: metal crumbling] |
| 2 | Spectre of a guard | **Oreks** token as castle guard (weak) | — | Flicker (T-LED **Library**) | Spectre clip; Tomas's talk on Private:Tomas · Clip | [sfx: armour clank, "Varga?" (TTS)] |
| 3 | Animated armor | **Frost Trolls** (weak fit) | Tower battle | Battle glyph (T-GLY **Library**) | Battle · Shared · Still | [sfx: armour clank] |
| 4 | The bookkeeper (Jakob Brenner's ledger) | none; NPC portrait | — | None | Ledger still · Shared · Still | [sfx: quill scratch, abacus] |
| 5 | Spawn in a sarcophagus | **Mormos** or Striga | Tomb | Sound (T-SND **Library**) | Lid clip · Shared · Clip | [sfx: stone lid grind] |
| 6 | Witches in the kitchen | **Clan of Neuri** (weak fit) | — | Breathe (T-LED **Library**) | Battle or bargain · Shared · Still | [sfx: bubbling cauldron, cackle] |
| 7 | Bat swarm, torches out | Widowmade Spiders as bats | — | `allLightsOff` (T-ALL **Verified**); lights back on the next room | Screen goes dark; next room drawn blind · Shared · Clip | [sfx: wings, torches hiss out] |
| 8 | Crawling claws | **Spine Fiends** (weak fit) | — | Sound (T-SND **Library**) | Battle · Shared · Still | [sfx: scuttling] |
| 9 | Mimic coffin | GAP: no foe; use a **dungeon token** + a treasure card as bait | Ruin (treasure or fight) | Sound (T-SND **Library**) | Lid snaps clip · Shared · Clip | [sfx: wooden jaws] |
| 10 | Vlad's echo | none | — | Breathe (T-LED **Library**); triggers an intervention | Empty room still; voice | [sfx: his voice (TTS), echo] |

---

## 3. The Count's interventions (8)

| Intervention | RtDT / board asset | 1981 | Tower (status) | Fallback · Where · Media | Illusionist |
|---|---|---|---|---|---|
| Courtly visit / taunt | Adversary mini/token placed on the party's space | Cursed (a wizard torments you) | Map says "red breathe": colour **GAP**; use breathe (T-LED **Library**) | His portrait; taunt text **Private:target** only; Shared shows only "he speaks to one of you" · Clip | [sfx: his voice (TTS), close and low] [music: theme quote] |
| Snatch attempt | Companion standee (Lenka) | — | Seal sequence (T-SEQ14 **Verified**) + skull drop (T-SKL **Verified**) | Clip of hands at the window; guard roll per hunter on Private · Clip | [sfx: glass breaking, scream] |
| Dusk move + turns a village | Adversary mini moved; skull drop; landing reported | — | Skull drop (T-SKL **Verified**); landing (T-SKLK **GAP**) | Board image with his new position; "drop a skull, tell me where it landed" (tower off: app picks a kingdom) · Shared · Still | [sfx: wings, bell for dusk] [music: night theme starts] |
| Weakens an artifact | Quest item card for the Blade (RtDT quest item cards) | Dragon steals the hoard | Flicker (T-LED **Library**) | Blade card dims · Private:carrier + Shared note · Still | [sfx: hiss, metal sigh] |
| Strikes and withdraws | RtDT adversary retreat behaviour / foe strike event | — | Drum turn (T-ROTT **Verified**) | Strike clip; corruption prompt on Private:struck hunter · Clip | [sfx: impact, wings away] |
| Summons fog | Block a road: special token or a spare skull laid flat (no fog token in inv) → **GAP** (soft) | Lost | Breathe (T-LED **Library**) | Fog over a road on the board image · Shared · Clip | [sfx: wind drops] |
| Lookalike swap | Hero mini of the swapped hunter stays; secret role | — | `breakSeal` (T-SEAL **Verified**) at the unmask | Secret role card **Private:swapped player** only · Still | [sfx: none at the swap; a sting at the unmask] |
| Final night call | Adversary mini to the tower space | Tower | Full cue: breathe rise + one seal sequence + one sound (all Verified or Library as above); no T-ROT15 | "Come to me" scene · Shared + one line per hunter on Private · Clip | [music: full theme] [sfx: castle doors] |

---

## 4. Randomizer results (fortune reading, 14)

| Draw | Result | Asset | Tower (status) | Fallback · Where · Media | Illusionist |
|---|---|---|---|---|---|
| 1 | d2=1: Blade K2, Holy Symbol K3 | Quest standees on K2 and K3 (inv: 3 standees, one left for the Tome) | rotateWithState so a glyph faces K2, then K3 (T-ROTT **Verified** top; T-GLY **Library**) | Card flip "The Sword" / "The Symbol" with kingdom name · Shared; cryptic clue Private:each · Clip | [sfx: card flip] |
| 1 | d2=2: swapped | as above | as above | as above | as above |
| 2 | d4=1 Village (Banner glyph) | Building mini | Banner glyph toward that kingdom (T-GLY **Library**) | Card with Village icon · Shared · Clip | [sfx: card flip] |
| 2 | d4=2 Sanctuary (Cleanse) | " | Cleanse glyph (T-GLY **Library**) | " | " |
| 2 | d4=3 Bazaar (Reinforce) | " | Reinforce glyph (T-GLY **Library**) | " | " |
| 2 | d4=4 Citadel (Battle) | " | Battle glyph (T-GLY **Library**) | " | " |
| 3 | Crypt beneath | castle room | Bottom drum (T-ROTMB **Library**), low light (T-LED) | Crypt card · Shared · Clip | [sfx: deep stone] |
| 3 | Chapel of the fallen love | " | Middle drum (T-ROTMB **Library**), breathe | Chapel card | [music: organ chord] |
| 3 | Tower top | " | Top drum (T-ROTT **Verified**), flicker (T-LED **Library**) | Tower card | [sfx: wind at height] |
| 3 | Study / throne | " | Quest glyph (T-GLY **Library**), seal sequence (T-SEQ14 **Verified**) | Throne card | [sfx: fire crackle] |
| Obj | 1 Claim the girl (Lenka) | Companion standee | none extra | Objective is **hidden**: no Shared card; hinted in clues | — |
| Obj | 2 Replace a hunter | — | — | " | — |
| Obj | 3 Destroy the Blade | — | — | " | — |
| Obj | 4 Turn the valley | Skulls (extra each dusk) | Extra skull drop (T-SKL **Verified**) | " | — |

Note: draw 2 glyphs come from the **glyph legend** in the map; real glyph positions depend on calibration and which seals are off (T-GLY Library, seals GAP). A glyph behind an unbroken seal cannot be seen, so the fallback card is what players should trust.

---

## 5. Items (14)

| Item | RtDT card stand-in | 1981 | Tower on use (status) | Fallback · Where · Media | Illusionist |
|---|---|---|---|---|---|
| Stake and mallet (Undead) | Gear card | — | none | Item tile on Private:owner; used on a battle card · Still | [sfx: hammer thud] |
| Crucifix (Magic) | Gear card | — | Breathe one side (T-LED **Library**) | Private:owner · Still | [sfx: shimmer] |
| Silver bolts (Beast; uses) | Gear card + spare tokens as ammo | — | none | Private:Wren · Still | [sfx: crossbow twang] |
| Garlic (uses; blocks 1 intervention / night) | Potion card | — | none | Private:owner · Still | [sfx: crunch] |
| Lantern | Gear card | Scout (not lost) | One light on (T-LED **Library**) | Private:owner · Still | [sfx: lantern creak] |
| Rope | Gear card | — | none | Private:owner · Still | — |
| Holy water (cleanse 1 skull / all 3 with Agnes; cure 1 corruption) | Potion card; RtDT **Cleanse** | Healer | Cleanse glyph toward the parish (T-GLY **Library**) + soft sound (T-SND **Library**) | Satchel on every Private · Clip (splash) | [sfx: splash, sizzle] |
| The host (cure 1 corruption; seal a doorway) | Potion card | Healer | Seal sequence (T-SEQ14 **Verified**), no seal broken | Satchel · Clip | [music: single choir chord] |
| Garlic tincture | Potion card | — | none | Satchel · Still | — |
| Smelling salts (wake Emeric) | Potion card | — | none | Satchel · Still | [sfx: sniff, cough] |
| The Blade (key 1 or 2) | Quest item card; "dragonsword" analogue | Brass/silver key; dragonsword | At the key: `breakSeal` (T-SEAL **Verified**); finale draw: `allLightsOn` (T-ALL **Verified**) | Key art · Shared + carrier's Private · Clip | [sfx: blade ring] [music: hero motif] |
| The Holy Symbol (key) | Quest item card | Key | `breakSeal` at the key; ward = breathe on one side (T-LED **Library**) | " · Clip | [sfx: bell, bright] |
| The Tome (key 3) | Quest item card | Gold key | `breakSeal` at the key | Tome art · Shared; truth pages Private as ties dictate · Clip | [sfx: page turn] |
| **pressed-flower** (`nx-pressed-flower`, dusk nights 1–4: a pressed mountain violet carrying a clue to where Lenka is held; prop id `pressed-flower`) | none (app only; optional spare quest-marker standee as the night's find) | — | heartbeat (T-LED **Library**) | Violet still on the Dashboard every dusk; the clue on one recipient's iPad · dashboard + ipad:<recipient> · Still | [music: solo violin, two notes] [sfx: wind; faint heartbeat] |
| Clues (Oskar's margin lines, map, letters, cipher, portraits) | none (journal) | Riddle of the keys | none | Journal; private ties only on Private:owner · Still | [sfx: paper rustle] |

---

## 6. Coverage

| Category | Rows | Every row has a tower cue or "none" + fallback + device + media | Rows with a Verified tower cue | Rows needing a GAP asset |
|---|---|---|---|---|
| Set pieces | 10 | 10 | 7 (1, 2, 3, 4, 8, 9, 10) | 1 (row 9 unfinished in map) + sound samples |
| Day encounters | 10 | 10 | 1 | 1 (rust monster foe) |
| Night encounters | 10 | 10 | 1 | 2 (cube foe; bride count) |
| Castle encounters | 10 | 10 | 1 | 2 (rust monster, mimic) |
| Interventions | 8 | 8 | 5 | 2 (red colour, fog token) |
| Randomizer results | 14 | 14 | 3 | 0 (glyph visibility depends on seals, soft) |
| Items | 14 | 14 | 4 | 0 |
| Final scripts (§1b: 19 scenes incl. pressed flower and 4 endings) | 19 | 19 | 17 | 1 (earth-box piece) |
| **Total** | **77** | **77** | **24** | **5 + the sound-name GAP that touches ~40 rows** |

Most "Library" cues are `setLED` effects and specific sounds. Two short spikes (an LED effects pass and a 113-sound audition) would turn most of them into Verified.

---

## 7. Fun and asset concerns (with fixes)

| # | Concern | Type | Fix |
|---|---|---|---|
| F1 | **Night 1 has four set pieces (1, 2, 5, 3 + procession); nights 2–4 have one each.** Later nights risk feeling like "draw tables until the site, then one scene". | Pacing | Give each of K2–K4 **two** set pieces: the site plus a building-specific scene (e.g. the Citadel lord's false lead, the Sanctuary siege). The location table already lists four building jobs per kingdom; promote one to a set piece |
| F2 | **No ticks + free building visits = no choice in B2.** Players can visit every building (and the Sanctuary cure) before triggering dusk. Dusk fires only "when the site is found", so the best play is to stall. | No real choice | Dusk fires after **N building visits** (story sets N, e.g. 3) **or** when the site is found, whichever is first. Choosing which 3 buildings is the day's decision |
| F3 | "Extra draw next visit" is the penalty for half the day table. Without time cost, an extra draw is just more content, sometimes good (items). | Weak stakes | Make an extra draw mean "**draw from the night table**" during the day, or "the Count moves one building closer" |
| F4 | Day 10 "Quiet day" and night 10 "Silent night / skip next draw" are **dead results**. | Dead turn | Replace with a small choice: quiet day = pick one: a free Sanctuary rest or a free clue; silent night = a private-tie vignette on one Private iPad |
| F5 | Day 2 fake trinket is "**silently useless**": discovered only when it fails in a fight. Feels like a cheat, and Emeric's check is the only counterplay. | Feel-bad | The fake reveals itself on first use and gives a clue instead ("the maker's mark leads to …") |
| F6 | **Rust monster appears twice** (day 8, castle 1), plus cube and mimic: D&D monsters with no RtDT piece and weak Dracula tone. | Repetition / no asset | Replace with assets we have: day 8 = Szgany smith (Brigands); castle 1 = Count's armory guard (Oreks); night 9 cube = drowned dead in the crypt lane (Lemures); keep the mimic as a dungeon-token trap |
| F7 | **Snatch on fixed nights 2 and 4** is predictable; once players know, guarding stops being a decision. | Repetition | Keep the guaranteed attempts, but the target building is hidden until dusk (shown on the guard's Private iPad only as hints) |
| F8 | **Lookalike hidden role in a co-op game** puts one player in a dull or awkward spot (what do they do?). | No real choice for one player | Give the swapped player a small secret goal (steer the party to one building, spend one item) with a reward if unmasked fast; the reveal is fun, not a punishment |
| F9 | **Fortune draw 1 has only 2 outcomes**; draw 2 glyph legend is not what the tower physically shows. | Low replay; asset mismatch | Keep, but vary the **clue text** per seed (Q10/Q11) so the second play still feels new; trust the screen card over the tower glyph |
| F10 | **Every "red" light** (Count's breathe, dusk rise) assumes colour control that no doc supports. | No asset | Use brightness and effect: dusk = lights fade **down** and breathe slowly; Count near = breatheFast on one side |
| F11 | **Bell, wolves, heartbeat, chains** etc. are assumed tower sounds; names of the 113 samples are unknown. | No asset yet | App audio carries every sound; tower sound is a bonus once the audition (cat gap 1) tags them |
| F12 | **Objective 4 "lose at N fallen buildings"** adds a fourth loss condition not in Bob's rulings. | Rule conflict | Make it pressure, not a loss: each fallen building = one extra skull at every dusk |
| F13 | **Objective 1 is the default and is also the snatch schedule**, so objectives 2–4 change less than the name suggests. | Low variety | Each objective swaps the night 2/4 B5 intervention (snatch / swap / Blade hunt / extra fall) |
| F14 | **Corruption at 2 triggers "strikes and withdraws"**, which could add the 3rd corruption → sudden loss. | Feel-bad | The strike costs an item or a skull, never a corruption |
| F15 | **Skull landing** is reported by players and drum routing cannot be controlled (T-SKLK, T-REL GAP), so "the skull falls on her building" cannot be staged by the tower. | No asset | The app names the building when the story needs it; players drop and report only for free drops |
| F16 | Procession "one skull drop asked of the players" every midnight + dusk drop + snatch drop = up to 3 skulls per night beyond base turn drops; 24-skull supply loss may come early. | Balance | Count total drops per night in playtest; cap story drops at 2 per night |

---

## 8. Generalized engine mechanics

Moved to [../../game-design/story-engine.md](../../game-design/story-engine.md), section "Generalized engine mechanics" (Bob, 2026-10-14: generic mechanics live there, written story-neutral, with Dracula only as the example).

## 9. Open questions from the mechanics map, with proposed answers

| Q | Question | Proposed answer |
|---|---|---|
| 5 | Hunter stats for checks with warriors/spirit out? | No numeric stats. A check = the RtDT battle-card shape with the hero's **strengths as Advantages** (Agnes: Magic/Undead, Tomas: Melee/Humanoid, Wren: Beast/Stealth, Emeric: Magic + clue checks auto-succeed once per night) |
| 6 | Dread / fear track? | No. Corruption, skulls and the ward already give three tracks; a fourth adds bookkeeping |
| 7 | Seal plan | 12 seals: 1 at the fortune (night 1 dawn), 1 at each key (3), 1 per fallen building (max 4), the rest (≥4) in the finale. Physical seal from `getRandomUnbrokenSeal` until the layout is checked |
| 8 | Skull landing: players report or app assigns? | Players report free drops (base game); the app assigns the building for story drops (F15) |
| 9 | Design without rotation sequences 15–18? | Yes. Keep them held; they move no drum and stall the queue 30 s (spike F7) |
| 10 | Tome's truth fixed or seeded? | Fixed core truth (she is the reborn love), seeded **detail** (which hunter's tie it touches) |
| 11 | Margin clues = fortune clues? | Separate layers: margin clues name the **lair room**, the fortune names the **artifact sites**; together they confirm the finale |
| 12 | What does tower-poc expose today? | Unknown from this copy. Design against the Verified list in §0; confirm against tower-poc code before build |
| 15 | Item limits | 4 kit slots per hunter, satchel of 6, max 1 pick per Bazaar/Sanctuary visit; items cost nothing else |
| 16 | Count's mini | Dark Horde adversary mini (Empress of Shades or Gravemaw) if Bob owns Dark Horde; else the adversary token |
| 17 | Foe reskin | Brigands = Szgany, Shadow Wolves = wolves, Lemures = zombies/drowned, Mormos = ghouls/spawn, Striga = brides, Widowmade Spiders = bat swarm, Oreks = castle guards, Frost Trolls = animated armor, Spine Fiends = crawling claws, Clan of Neuri = witches. Drop rust monster / cube (F6) |
| 18 | K2/K3 order | Players choose at dawn of night 1 (a real decision, cheap to build) |
| 19 | Keep day/night table split? | Yes, with F2: dusk after N visits or the site, whichever first |
| 20 | Sanctuary rest limit | Yes: once per Sanctuary per night, before dusk; a Sanctuary with 3 skulls cannot be used |
| C5 | Drum cues on an uncalibrated tower | Keep: calibration is part of set piece 1; drum cues skip and log |
| C6 | Snatch timing | Keep nights 2 and 4, with the hidden target (F7) |

---

## 10. Gaps and open questions (short)

1. **Sound names:** the 113 tower sounds are unnamed in research; bell, wolves, chains, heartbeat cannot be picked. Needs an audition pass.
2. **LED colour:** no doc supports red/purple; all colour cues are GAP.
3. **LED effects** (breathe, flicker) and **middle/bottom drum** `rotateWithState` are Library only; a 10-minute spike would verify them.
4. **Seal layout** unknown; glyph facing is library-computed and hidden behind unbroken seals.
5. **Skull landing / release** cannot be read or controlled.
6. **Foes with no piece:** rust monster, gelatinous cube, mimic; only 2 Striga minis for three brides.
7. **Which expansions Bob owns** (Dark Horde minis for the Count and foes).
8. **Set piece 9** is unfinished in the mechanics map.
9. **1981 references** are from general knowledge; no 1981 research note exists.
10. Open: dusk trigger (F2), objective 4 loss condition (F12), corruption from the strike (F14), story skull budget per night (F16).

## Resolutions, 2026-10-14 (Loremaster story calls, Gamewright mechanics)
- Red light is replaced by dimming and breathing effects; the tower "breathes" with the Count's heartbeat. (Breathe effect is Library; verify it on the tower.)
- Day cost: dusk falls after N visits or when the site is found, whichever comes first. Story reason: the mist thickens with every door. Engine: the generic clock gets a phase-advance trigger "after N actions OR on event".
- Snatch target stays hidden until dusk. The woman leaves a pressed flower at the chosen building. Engine: hidden-target intervention, revealed at a phase change.
- Lookalike secret goal: waste one visit at a decoy crypt, or "lose" one consumable. Engine: optional per-player secret objective shown on that player's private iPad; stats record whether it succeeded.
- The Count never strikes a hunter already at 2 corruptions; he targets the woman instead. Engine: an intervention-targeting guard so no single random effect can cause an instant loss.
- "Too many buildings fell" is dropped as a loss. Each fallen building adds a foe or skull to night 5. Earth boxes left standing strengthen night 5 the same way. Engine: generic finale-escalation ledger (unfinished objectives feed the finale), reusable by fellowship for the Last Ascent.
- Figures: rust monster, gelatinous cube, and mimic are dropped unless a figure exists. The two Striga minis are the brides; the third bride (Ilka Kessel, Wren's mother) appears in the app only.
- Second set pieces: N2 burgomaster's funeral (mourner rises at the wake), N3 fly-eater's cell (mad servant sells the plan), N4 earth boxes (burn resting places before the Tome). Loremaster is scripting these and set piece 9 (the Tome).

- Added 2026-10-14: `n5-final-confrontation.guard-chosen` (an event moment with a still, Dashboard), `n5-final-confrontation.blade-lost` (an event moment), and `.strike-redirected~blocked` (a new line that costs one story item).
