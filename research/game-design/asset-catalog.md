# Asset catalog (reusable Dark Tower assets)

Status: **draft for Bob's review**, 2026-10-14. Design only. Merges the two earlier catalogs (former `dt-asset-catalog.md` folded in).

Every encounter and set piece is built from these (R-SP-2, R-RE-3). Requirements are R-ASSET-* in [requirements.md](requirements.md). Every asset has a stable id (R-ASSET-10).

**Status legend:** **Verified** = seen on Bob's tower in a spike. **Library** = claimed by the UltimateDarkTower 7.1.2 docs/data, not yet tested. **Rules** = from RtDT rule/component research. **GAP** = research doesn't have it yet. **1981 (unsourced)** = from general knowledge of the 1981 Milton Bradley game; no research note exists yet.

Sources: [api-surface-7.1.2.md](../tower/api-surface-7.1.2.md), [spikes/2026-10-13-noble-macos.md](../tower/spikes/2026-10-13-noble-macos.md), [component-inventory.md](../return-to-dark-tower/component-inventory.md), [game-overview-and-rules.md](../return-to-dark-tower/game-overview-and-rules.md), [companion-app.md](../return-to-dark-tower/companion-app.md).

## Usage rules

- Every tower cue has a screen/audio fallback (R-ENG-12).
- Tower safety (R-ASSET-11): no automatic retries or reconnects; 300–500 ms between drum/long-audio commands; nothing during calibration (commands are dropped).
- No design depends on knowing when a tower sound ends (no completion signal) or on tower sound loops (R-ASSET-5).
- Seal state is app-tracked (R-ASSET-4).
- During play, cues fire automatically (R-ENG-19).

## 1. Tower hardware and outputs

| ID | Asset | What the research says | Status | Use in set pieces (SP) / encounters (RE) |
|---|---|---|---|---|
| AST-T01 | Lights | 24 lights, effect + loop each; `setLED` layer 0–5, light 0–3; `allLightsOn/Off` | Library; on/off Verified | The Eye sweeping a side; which kingdom is threatened; mood washes (Dracula red/purple); all off = darkness/lost |
| AST-T02 | Light effects | 6: off, on, breathe, breatheFast, breathe50percent, flicker | Library | breathe = dormant threat; breatheFast = imminent; flicker = curse, plague, failing ward |
| AST-T03 | Light sequences | 21 in `TOWER_LIGHT_SEQUENCES` (e.g. `twinkle`) | Library; rotation sequences lit Verified | Big-moment shows (victory, doom, tower wakes). GAP: full list of names |
| AST-T04 | Sounds | 113 sounds, 12 categories (`ultimatedarktowerdata@3.0.0`), `playSound` | Library; "a sound plays" Verified | Stingers: reveal, battle hit, dragon, bazaar, seal break, night change. GAP: names/categories; needs audition + tags |
| AST-T05 | Sound looping | `playSoundStateful(index, loop, volume)` | **Did not loop** (spike run 3) | Don't use. App owns music/ambience (R-AV-7) |
| AST-T06 | Sound completion | No "sound finished" signal | Library | Use authored durations |
| AST-T07 | Volume | Loud/Medium/Quiet/Mute; state 0–15; mapping unclear | Library, unverified | Per-story/session setting; quiet for stealth |
| AST-T08 | Drums | 3 drums × 4 positions; `rotateWithState`, `Rotate`, `randomRotateLevels` | Single-drum rotation Verified (~1.1 s) | Gates opening, castle storm drum by drum, riddle answers by position, skull routing |
| AST-T09 | Rotation sequences 15–18 | Play lights, move no drums, no reply | Verified | Light shows only |
| AST-T10 | Calibration | All three drums spin ~21–22 s; commands during it dropped | Verified | Startup only, explicit step; dress as "the tower wakes" with app audio |
| AST-T11 | Lights/sound before calibration | Worked | Verified (overturns library docs) | Title/intro cues while still uncalibrated |
| AST-T12 | Glyphs | 5: Cleanse, Quest, Battle, Banner, Reinforce; facing computed from rotations | Library + Rules | Glyph facing a kingdom as omen/modifier |
| AST-T13 | Seals | 12; `breakSeal` plays lights+sound; firmware doesn't track broken seals | Verified / Library | Doors, gates, crypts, keys opening seals; app persists state |
| AST-T14 | Skull drop sensor | `onSkullDrop`, firmware count | Verified (2 drops) | Turn end / clock tick |
| AST-T15 | Skulls into kingdoms | Skulls held or tumble to one of 4 kingdoms | Rules; GAP: not seen in spikes | Where threat lands = next RE/SP pressure |
| AST-T16 | Jam / door reset | In firmware, no public method; jam visible in state | Library | Show to players, fall back to screen |
| AST-T17 | Battery | Notifications ~every 200 ms; low-battery warning | Verified | Session health; warn before long sessions |

## 2. Physical components (RtDT base, unless noted)

IDs: AST-B01 board, B02 buildings, B03 hero minis, B04 skulls, B05 foe tokens/Dark Horde, B06 warrior tokens (50), B07 spirit tokens (40), B08 quest markers, B09 dungeon tokens, B10 haggle die, B11 cards, B12 special tokens, B13 expansion pieces, B14 heroic test cards, B15 virtue tiles, B16 hero boards, B17 corruption cards, B18 companion cards, B19 treasure cards, B20 gear cards, B21 potion cards, B22 quest item cards, B23 foe cards, B24 adversaries, B25 caravan tokens, B26 siege tree tokens, B27 spore tokens, B28 river of fire tokens, B29 tower seals (the physical pieces; AST-T13 is the tower's seal output). B05 is now foe tokens only; B11 and B12 are the groups (one card each in `cards/`).

Source: [component-inventory.md](../return-to-dark-tower/component-inventory.md), [game-overview-and-rules.md](../return-to-dark-tower/game-overview-and-rules.md).

| Asset | Qty | SP / RE use |
|---|---|---|
| Board: 4 kingdoms × 15 spaces, rivers; 6 terrains (Desert, Hills, Mountains, Lake, Forest, Grasslands) | 1 | Terrain-keyed random encounter tables; kingdoms as story realms/parishes |
| Buildings: Citadel, Sanctuary, Village, Bazaar (one each per kingdom) | 16 | Hubs for sub-locations and set pieces (inn, chapel, guard post) |
| Hero minis (4 colors) + boards | 4 | Party avatars incl. narrator NPC (fellowship) or 4 hunters (Dracula) |
| Skulls | 24 | Threat currency; 4th on a building destroys it; "villager turned" (Dracula), "forces muster" (fellowship) |
| Virtue tiles | 16 | Hero abilities to reskin |
| Haggle die | 1 | Bazaar/shop haggling encounter (also a 1981 callback) |
| Quest marker standees | 3 | Mark the active set piece / quest location on the board |
| Foe cards / foe tokens | 20 / 65 | Random-encounter enemies (tokens show level + traits) |
| Treasure / gear / potion / quest item cards | 22 / 18 / 18 / 20 | Encounter rewards; "hunter's kit" reskins |
| Corruption cards | 12 | Corruption track (Dracula: 3rd loses, D-DRA-5), bearer burden (fellowship) |
| Companion cards | 10 | Recruitable NPCs; partially named (Miras, Letha, Hakan, Yana, Tomas, Xyr, Grigor, Haraswa, Kamaria) — **GAP:** which are base/main |
| Dungeon tokens | 6 | Mark sub-location dungeons (crypts, ruins) |
| Special tokens (caravan, siege tree, spore, river of fire, adversary) | 20 | Set-piece props. **GAP:** breakdown unverified |
| Heroic test cards | 16 | Competitive mode only; possible traitor/servant mode |
| Warrior tokens / spirit tokens | 50 / 40 | Base-game warriors and spirit (Dracula: as base game, D-DRA-9) |

**Foes (12 types, levels 2–4, mapping GAP):** Brigands, Oreks, Shadow Wolves, Spine Fiends, Frost Trolls, Lemures, Clan of Neuri, Widowmade Spiders, Dragons, Mormos, Striga, Titan. Story fits: Shadow Wolves / Striga / Lemures / Mormos for Dracula; Brigands / Oreks / Dragons / Titan for fellowship.

**Adversaries (8, level 5):** Ashstrider, Utuk-Ku the Ice Herald, Empress of Shades, Gravemaw, Bane of Omens, Lingering Rot, Isa the Exile, The Gaze Eternal. The Gaze Eternal fits the fellowship "Eye"; Empress of Shades or Gravemaw could proxy the Count.

**Traits / Advantages:** Beast, Magic, Humanoid, Melee, Undead, Stealth, Wild — reusable as encounter tags and hero strengths.

**Expansions (if owned — GAP: which Bob owns):** Alliances (guilds, power skulls, influence), Covenant (8 monuments, 14 doom skulls, 32 wasteland tokens, wands), Expeditions (4 expedition boards, caravan, site tokens, torments), Dark Horde (69 minis replacing foe tokens).

## 3. RtDT mechanics worth reusing

Source: [game-overview-and-rules.md](../return-to-dark-tower/game-overview-and-rules.md).

| Mechanic | Reuse idea |
|---|---|
| Battle: face-down cards = foe level, Advantage arrows improve results, critical-hit card | Encounter resolution template |
| Dungeon: room graph, one improvement per room, cleared rooms persist | Castle Ravenloft / ruins set pieces |
| Foe status escalation (panicked → lethal) + strike events | Lingering-threat encounters that worsen if ignored |
| Monthly companion/adversary quests | Per-chapter side quests |
| Reinforce at buildings + haggle die | Shops, rest, resupply encounters |
| 4th skull destroys building + corruption | Fallen-town set piece |
| Game seed (12 chars) | Replayable / shareable session setup |
| Loss conditions: 3rd corruption, skull supply empty, time out | Templates for story loss conditions |

## 4. 1981 *Dark Tower* events and items

**All entries: 1981 (unsourced)**, from general knowledge, until a sourced research note exists (R-ASSET-12). The repo's research only mentions keys/riddle, bazaar haggling, brigands, the dragon and pegasus/scout/healer helpers ([fellowship/README.md](../stories/fellowship/README.md)).

| ID | 1981 element | Original behaviour (summary) | Reuse |
|---|---|---|---|
| AST-O01 | Keys (brass, silver, gold) | Found in tombs/ruins; needed for the Tower | Quest keys; keys open seals |
| AST-O02 | Riddle of the keys | Key order must be guessed at the Tower | Riddle solved by drum positions or seal order |
| AST-O03 | Bazaar | Buy warriors, food, beast, scout, healer; haggle; bazaar can close | Shop + haggle die + "bazaar closed" |
| AST-O04 | Brigands | Battle that costs warriors, wins gold | Road/ruin fight |
| AST-O05 | Dragon | Takes warriors and gold; dragonsword defeats it and returns hoard | Boss encounter; dragonsword as gear |
| AST-O06 | Pegasus | Flies the player to another space | Fast travel, saves clock time |
| AST-O07 | Scout | Prevents getting lost | Ranger ability / ally |
| AST-O08 | Healer | Protects against plague | Cleric ability / ally |
| AST-O09 | Beast | Carries more gold | Pack animal, raises carry limit |
| AST-O10 | Warriors / food / gold | Core resources; food eaten each turn by warriors | Provisions upkeep tied to party size |
| AST-O11 | Plague | Lose warriors unless you have a healer | Hazard event |
| AST-O12 | Lost | Lose a turn unless you have a scout | Costs clock ticks |
| AST-O13 | Cursed | A wizard curses you; lose warriors/gold | Curse event; corruption |
| AST-O14 | Tomb / Ruin | Explore: empty, treasure or a fight | Sub-location exploration |
| AST-O15 | Sanctuary | Help when weak (warriors/food/gold) | Rest/aid at sanctuary |
| AST-O16 | Citadel | Your home; double warriors if few remain | Rally point |
| AST-O17 | Frontiers | Cross into the next kingdom with the next key | Kingdom gating by keys |
| AST-O18 | Tower battle | Fight brigands floor by floor at the Tower | Finale, drum by drum |

## 5. Story-owned assets in the repo

- `research/stories/fellowship/assets/gandalf-1.mp3`, `deckard-cain.mp3` — narrator-voice audio samples (reference tone; likely not licensable for release).
- `research/look-and-feel/screens/*` — three visual looks (Manuscript, Shadow and Ember, Tabletop Companion).

## Gaps to close

1. Names/categories of the 113 sounds and 21 light sequences (audition and tag).
2. Skull release-into-kingdom behaviour on the real tower.
3. Foe level per type; base main goals and companions.
4. Which expansions Bob owns.
5. Sourced 1981 Dark Tower research.
6. Volume mapping; why looping failed.

Open questions: see [open-questions.md](open-questions.md).

- 1981 homage bookends: see R-LF-9. The `shared.dt1981-*` slots are shared assets. Source references are in `research/dark-tower-1981/` (reference only).
