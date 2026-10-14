# Story engine and story packs

Status: **draft for Bob's review**, 2026-10-14. Design only, no code.

Detail for R-ENG and R-AV in [requirements.md](requirements.md). The index is the source of truth for IDs; this file adds the module contents (R-ENG-20 to R-ENG-34) and the AV design.

The engine runs any number of **stories**. A story pack is content plus configuration that sets its own mechanics, pacing, structure and look (R-ENG-1). Fellowship (3-part saga) and Dracula (one-shot, 5 nights) are the first two ([../stories/](../stories/README.md)).

## Engine summary

- Packs install side by side; players pick one at start (R-ENG-1). A pack can be a one-shot or span parts with carried campaign state (R-ENG-2, R-SES-12).
- Shared systems a pack switches on/off: party, clock, open-world locations, resources, encounters, set pieces, combat, shop/haggle, riddle, corruption, dialog/narration (R-ENG-3).
- Story-only mechanics go in registered rule modules (R-ENG-4).
- Packs are versioned; saves pin the version (R-ENG-11). Packs are validated on load (R-ENG-10).
- Packs reference shared assets by catalog id (R-ENG-15); tower cue maps use only catalog capabilities (R-ENG-6).
- Every tower cue has a screen/audio fallback (R-ENG-12).
- Multi-device: one private iPad per player, plus shared content to all (R-ENG-16).
- During play, tower cues fire automatically; connect and calibrate are explicit (R-ENG-19, R-SES-2).

## What a story module defines (R-ENG-13)

| ID | Element | What it defines | Fellowship | Dracula |
|---|---|---|---|---|
| R-ENG-20 | Identity | Name, tone, parts, player count, length, difficulty levels | 3 parts, epic | One-shot, 5 nights, gothic |
| R-ENG-21 | Mechanics toggles | Which engine systems are on, and their settings | Party + wizard NPC, keys + riddle | Nights, corruption track |
| R-ENG-22 | Clock | Name, length, action costs, authored beats per tick, what happens at the end | Shadow clock per part | Night clock per kingdom |
| R-ENG-23 | Chapter / night structure (R-ENG-17) | Ordered chapters/nights, kingdom per unit, ordering rules, end condition of each | Parts 1–3 | Ch.1 in one kingdom; then one kingdom per night; Tome kingdom last; night 5 = tower assault |
| R-ENG-24 | Keys (R-ENG-18) | Keys, how each is earned, what they unlock | 1981 brass/silver/gold + riddle | Finish a kingdom's set pieces → its key; assault needs all 3 |
| R-ENG-25 | Resources | Tracked resources, start values, limits, loss rules | Warriors, spirit, gold/provisions, hope, Eye's attention | Warriors and spirit as base game; faith, kit items |
| R-ENG-26 | Corruption and cures | Corruption sources, loss threshold, cure sources | Bearer burden (TBD) | 3rd corruption loses, every one counts; cures: holy water, host, Sanctuary rest only |
| R-ENG-27 | World | Kingdoms, buildings as hubs, sub-locations and what each offers | Inn, tomb, ruin, pass | Crypts, churches, Sanctuaries |
| R-ENG-28 | Party and devices | Heroes, NPCs, stats, abilities, join/leave rules, device per player | Wizard + 3 of 4 heroes | 4 hunters, private iPad each |
| R-ENG-29 | Encounter tables | Weighted encounters per location, kingdom, phase ([encounters](encounters-and-set-pieces.md)) | Brigands on the road | Wolves at night |
| R-ENG-30 | Set pieces | Triggers, steps, tower cues, outcomes | Tower wakes in the tavern | The Count's arrival |
| R-ENG-31 | Win / lose | Ranked outcome tiers (full win, lesser win, loss variants); each pack declares its outcomes and the order they are checked | Reach the Tower with keys + riddle (win) | Dracula: Rescued (full win), Endures (lesser win), Taken (loss), Turned (loss) |
| R-ENG-32 | AV theme (R-AV-1) | See §AV below | Look 1–3 candidates | Red/purple, bells, wolves |
| R-ENG-33 | Tower cue map | Story events → tower capabilities, each with a fallback (R-ENG-12) | Eye sweep = lights on one side | Night falls = dimming and breathing |
| R-ENG-34 | Stats extras and components | Story counters (R-STA-7); required physical components | Keys, riddle attempts | Keys, corruptions, villagers turned |

Rules: clock beats are authored per part/chapter and random encounters fill the gaps (R-ENG-14). A pack lists its required physical components so setup can list them (R-ENG-2).

## AV: voices, visuals and sound (R-AV)

Owner: Illusionist.

**AV theme fields** (R-AV-1), declared per story:

| Field | Example (Dracula, illustrative) |
|---|---|
| Still art style | Ink and wash, gothic etching |
| Animated clip style | Slow parallax, candle flicker |
| Color palette | Blood red, bruise purple, bone | (screen art only; the tower has no colour)
| Narrator voice | Gemini TTS voice + style line ("low, measured, dread") |
| Character voices | One per recurring character: Gemini TTS voice + short style line |
| Music mood | Organ drones, sparse strings |
| Sound-effect set | Bells, wolves, door creaks, wind |

**Script rules**
- Each scene moment is marked `still` or `clip` (R-AV-2).
- At most two speakers per dialog exchange (R-AV-3).
- Private lines carry a target device, i.e. which hunter's iPad plays them (R-AV-4).
- Bracketed cues in scripts: `[sfx: door creak]`, `[music: ...]`, with tower cues by name (R-AV-6).
- All media is pre-rendered and cached; the engine plays files and never generates live (R-AV-5).
- Music and ambience play from the app; tower sounds are stingers only (R-AV-7).

## Generalized engine mechanics

Story-neutral mechanics any pack configures with data. Moved here from the Dracula asset map (2026-10-14). The example column shows one configuration (Dracula, from [../stories/dracula/dracula-asset-map.md](../stories/dracula/dracula-asset-map.md)); a second (fellowship) shows the range. Neither is part of the mechanic.

| ID | Engine mechanic | What the engine does | Pack configures | Example: Dracula | Example: fellowship |
|---|---|---|---|---|---|
| E1 | Chapter / phase clock | Chapters made of ordered phases. A phase advances on a **trigger: after N actions OR on an event, whichever comes first**. Each phase selects the live encounter table and which interventions may fire. No time cost unless the pack sets one | chapters, phases, N per phase, trigger events, table per phase | 5 nights, beats B1–B7; dusk after N visits or on finding the site | 3 parts; "Road / Camp / Hunted" phases |
| E2 | Region gating and keys | Regions unlock in order; finishing a region's required set pieces grants its key; the finale needs K keys. Order per region: fixed, seeded, or player choice | order rules, required set pieces, keys, finale key count | K1 first, K4 (Tome) last, 3 keys for the tower | 1981 brass/silver/gold keys; frontier crossing |
| E3 | Corruption track | Mirrors base-game corruption cards (all sources count); thresholds trigger effects; loss at the base limit; cures from a configured list | thresholds, effects, cure sources | Bites; cures only holy water, the host, Sanctuary rest | The bearer's burden |
| E4 | Protected NPC | App-only ward track, a guard rule at phase end, a threat when unguarded, optional loss if taken | ward max/start, guard rule, threats, loss flag | Not used in Dracula (Lenka is captive from the start) | A captured guide or relic carrier |
| E5 | Items | Kinds (kit, consumable, key, clue, marker), RtDT Advantage traits, uses, owner, slot limits | defs, limits, sources | Hunter's kit, satchel, 3 artifacts | Provisions, 1981 helpers |
| E6 | Seeded reveal | A reveal scene draws from tables using the RtDT seed; sets story variables and per-player clue text | tables, outputs, hidden outputs, reveal cues | Fortune reading | The wizard's lore |
| E7 | Adversary agenda | Board-present adversary with a move rule, a hidden objective, and scripted **interventions** with triggers, separate from tables | objectives, move rule, interventions | The Count | The Eye |
| E8 | Hidden-target intervention | The adversary's target is chosen secretly and **revealed at a phase change** by a marker scene | reveal phase, marker scene | Pressed flower at dusk | The Eye marks a ford |
| E9 | Targeting guard | No single random or adversary effect may cause an instant loss: an effect aimed at a hero one step from a loss threshold is redirected to a configured fallback target | threshold, fallback target | Hunter at 2 corruptions → the strike is blocked (`~blocked`) and the party loses a story item | Bearer near the limit → the Eye targets a kingdom |
| E10 | Private scenes and secret objectives | Any moment can target one player's device; the Dashboard shows a neutral line. Optional per-player secret objective on that device; stats record success | targeting rules, placeholder text, objectives | Private ties, procession, lookalike goal | Each hero's secret past |
| E11 | Encounter tables | Per phase/region/terrain; entries resolve by choice, check, or RtDT battle/dungeon shapes; outcomes only from the pack's resource list | tables, outcome types, foe reskins | Day / night / castle | Terrain-keyed, 1981 events |
| E12 | Finale-escalation ledger | Unfinished objectives and losses during play (fallen buildings, surviving enemy assets) are counted and **feed the finale** as extra foes, skulls or battle cards, instead of causing a loss | what counts, conversion to finale effects | Fallen buildings, earth boxes left standing | The Last Ascent's muster |
| E13 | Cue library and cue rules | Named cues map to tower capabilities with status (Verified / Library / GAP) and a mandatory screen fallback. Scene cues fire automatically; calibration, connect, reconnect and retry stay manual (setup wizard only); drum cues skip if uncalibrated; 300–500 ms after a drum move completes; never wait for sound end; held capabilities never used; no colour assumed | cue names, fallbacks, palette (effects only) | Heartbeat breathe | Eye sweep |
| E14 | Skull and seal ledgers | Skulls per building (3 shadowed, 4 fallen); seals broken per milestone, app-tracked; physical seal from `getRandomUnbrokenSeal` until the layout is known; story skull drops named by the app | thresholds, milestone → seal, story-drop budget per phase | Thralls; seals at keys and finale | Mustering armies; ancient doors |

## Open questions

See [open-questions.md](open-questions.md), especially: pack reach into code, shared resource vocabulary, authored vs. procedural, and who authors packs.

- Rule (Bob): story mechanics never use warriors or spirit. They stay base-game RtDT. Story costs and rewards use story items or story tracks.

- R-ENG (outcome tiers): a story may declare several win and loss outcomes with a rank (e.g. full win, lesser win, loss). The summary screen and stats record the exact outcome, not just win or lose.

- E (carried key items): a story item can be bound to a carrying hunter. If the carrier is defeated, the item is lost for the rest of the scene. Outcome rules may test for whether the item is held.

## E15 Scene presence (hunters move independently)
- Hunters move individually on the board as in base RtDT. Each hunter has a location.
- A set piece or encounter triggers when a hunter enters its site. **Present** means the hunters at that site when the scene starts. Presence is locked for the scene; there are no late arrivals in v1.
- The engine passes presence flags to the pack, and `~no-<hunter>` variants fire for absent hunters.
- Scene costs, choices and rewards apply only to present hunters (e.g. "one hunter takes a corruption" picks from those present). Story items held by the party count only if a present hunter carries them.
- Private moments for a scene go only to present hunters. The Dashboard still plays the scene for the whole table.
- Stats log presence for each scene.
