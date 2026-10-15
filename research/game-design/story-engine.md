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

- E15a. Phase-level moments (dusk, night start, dawn, and anything tagged `scope: global`) are exempt from presence. Their private lines go to every holder of the named hunter, wherever that hunter is on the board.

## E16 Tower is never idle (Bob, 2026-10-14)
The tower should nearly always be doing something. The engine runs a three-layer cue stack:
1. **Ambient bed (always on):** a light pattern for each phase or mood (e.g. a slow breathe at dusk, a dim flicker at night), declared per story. Lights only. No drum moves (drums carry game meaning) and no looping sound (the tower can't loop).
2. **Ambient accents:** occasional one-shot sounds or light pulses at randomized intervals (e.g. every 20–60 s, declared per story). They're suppressed during speech, choices and calibration.
3. **Scene cues:** these override layers 1 and 2 while they run, then hand back to the ambient bed automatically.
- The pack supplies the ambient sets, keyed by phase. The engine supplies generic defaults so a new story is never silent.
- A host toggle offers Full, Lights only, or Off. Stats record the mode and the time spent in each.
- Idle limit: no more than about 10 s with no tower activity during play, other than calibration or a pause.
- Every entry is still capability-gated (Verified, Library or GAP) against the tower API doc. Once the tower test session confirms capabilities, revisit the intervals and patterns.

## E17 Private investigation round
- The pack declares a list of actions (usually 4–6). Each present hunter picks one, privately, on a device holding them. There's a timer, default 60 s, and an auto-pick if it runs out.
- Each action yields a hidden finding for that hunter only, which may set flags or grant a story item to that hunter. Findings never go to the Dashboard. The Dashboard shows only "Agnes has chosen" ticks.
- There are fewer hunters than actions, so the party can never cover everything. Two hunters may pick the same action, and each sees the finding.
- Tower: ambient accents continue. One action may be marked risky. If picked, it fires a tower cue and a declared cost (story items or corruption, under the instant-loss guard).
- Afterwards there is a table-talk beat. The Dashboard shows "Share what you found" with no timer, and the host taps Continue.
- Stats log each pick, finding, flag and timeout.

## E18 Advantages and companions
- Story effects that help in a fight are always granted as RtDT Advantages (Beast, Magic, Humanoid, Melee, Undead, Stealth, Wild) or as the reveal of a battle card. Warriors stay base-game hit points.
- Sources: base gear, potions, treasure and corruptions (base RtDT), plus story items, investigation findings (E17) and companions.
- **Companions/NPCs:** RtDT companion and character cards (e.g. Gleb) are reskinned per story as people the hunters meet. A pack maps each physical card to a story role, recruit condition, advantage and loss condition. Base-card effects are kept where possible. This needs Bob's card list.
- Stack cap: story advantages are limited to +2 per hunter per fight by default, overridable per pack within R-FUN-4.

## E19 Quest tokens (objective, lure, hunter)
Gamewright, 2026-10-14. Story-neutral; a pack supplies the sites, icons and art.

**RtDT grounding.** The base game ships 3 quest markers (companion quest, adversary quest, main goal). The app tells players to place them "in the spaces on the board where they can be completed", and a marker is removed when its quest is done ([official rulebook](https://restorationgames.com/wp-content/uploads/2022/05/Return_to_Dark_Tower-rules-two-page.pdf)). E19 reuses those three physical markers (or Dark Horde minis) for three story roles. Board terms used here are RtDT's own: four **kingdoms** (north, east, south, west) separated by **rivers**; 15 **spaces** per kingdom, each with a terrain (desert, hills, mountains, lake, forest, grasslands); one **building** of each type per kingdom: **citadel, sanctuary, village, bazaar**. Movement is one move per adjacent space, and crossing a river does not let you slide along it. A **site** in this rule means a space, usually one with a building.

**Base-game contrast.** In base RtDT foes do not chase heroes. The app says when and on which spaces foes appear, they stay there, their status escalates the longer they stay (panicked → lethal), and they hit through strike events. The hunter token is a new story mechanic, not a reskin of a base rule.

- **E19a Objective.** At dusk the app places the objective on the site of the night's next set piece. The set piece starts when a hunter enters that site, and presence (E15) applies. If the night has two set pieces, the token moves to the second site when the first scene ends.
- **E19b Lure (optional).** At dusk the engine draws one lure from the pack's lure list, using the game seed, from the entries valid that night. It never sits on the objective's site; if it would, redraw. The first hunter to reach it gains one story item or one finding. The reward is revealed privately to the iPad(s) holding that hunter, with a neutral line on the Dashboard. Then the lure is removed. A pack may skip lures.
- **E19c Hunter.** Placed at dusk on its start site (E19d). At the end of each round, before hunters move, it moves one space toward the nearest hunter, using RtDT adjacency and river rules. Ties go by seeded pick. When it lands on a hunter's space, the engine makes a seeded draw from the pack's hunter encounter table. Presence (E15) applies, so only the hunters on that space are present. After the encounter it returns to its start site. It is removed at dawn. Each move pulses tower lights (a pack cue, e.g. a heartbeat). It never moves the drum, because drum positions carry board meaning (E13).
- **E19d Hunter start site.** Default: the **citadel of the active kingdom**. Every kingdom has exactly one, so placement is always unambiguous. If that space holds the objective or a hunter at dusk, use a **space next to the Tower in the active kingdom** instead (RtDT's own term from the main-goal relic quest). A pack may override with any building type or tower-adjacent space.
- **E19e Encounter vs. normal RtDT event.** **Ruled by Bob (Oct 14 2026): add.** A hunter-token encounter plays in addition to that turn's normal RtDT event, never instead of it. The normal event resolves first, then the encounter. To keep turns moving: an encounter is 2–3 moments; at most one hunter-token encounter per round; the E19 corruption guard still applies (no third corruption from an encounter). Both are logged separately for stats.
- **E19f Corruption guard.** A hunter-token encounter or lure never gives a third corruption. A corruption aimed at a hunter who already has 2 is redirected under E9 (the instant-loss guard).
- **E19g Logging.** Every placement, move (from, to, round), draw, removal, lure claim and encounter result is logged with the seed, for stats and deterministic replay.
- **E19h Pace and game length.** Hunter-token pace scales with the game length (R-LEN-2) as declared by the story pack: per length, the pack sets how often the token moves (e.g. every round vs. every other round) and how many hunter-token encounters a night allows. Defaults are the rules above (Standard).

## E20 Dungeon crawl
Gamewright, 2026-10-14; E20c and E20i rewritten 2026-10-15 (Bob's rulings). Story-neutral; a pack supplies the dungeon, its room deck, text and art. First use: Dracula crypt (D-DRA-14).

**RtDT grounding** (official rulebook, [two-page](https://restorationgames.com/wp-content/uploads/2022/05/Return_to_Dark_Tower-rules-two-page.pdf) and [v2](https://restorationgames.com/wp-content/uploads/2023/10/RtDT_Rulebook-v2-web.pdf)):
- Dungeons spawn as part of certain quests and are marked by a dungeon token showing the dungeon's trait. You explore one with the Quest action on its space. The token is removed when the dungeon is completed or an event says so.
- The goal is to find the **target room** (e.g. where someone hides or an item is hidden). Clearing it completes the dungeon and its quest.
- Entering: press the dungeon button and pick a dungeon. The app shows the starting room and the unentered rooms you can reach. Pick one, and the app reveals what happens there.
- Per room: you may spend one Advantage (matching the dungeon's trait, or Wild) via "improve" for a better result. Each room can be improved only once, and spent Advantages can't be undone. Then you resolve the room (rulebook example: lose 5 warriors; lose 1 spirit, improved to gain 1). Items can also be gained from dungeons.
- Losses you can't pay: pay what you can and gain one corruption (at most one per room). A third corruption loses the co-op game.
- After each room it is cleared and you choose: enter a new room or leave. Rooms you cleared stay cleared for the next hero who explores that dungeon.
- Ends when the target room is cleared, or when you leave.
- Tower dungeon (competitive relic mode): access after 3 heroic tests; entered by the Quest action on any space adjacent to the Tower; find the relic room to win; you may leave and re-enter on a later turn. The tower itself is not driven by a dungeon in any rule we found.
- Companion app notes (local research/return-to-dark-tower/companion-app.md): the dungeon screen goes room by room, one improvement per room, and remembers cleared rooms. In v1.2.2 the skull sensor was disabled on dungeon screens.
- Expansions: no dungeon rules in the Alliances rulebook. Covenant mentions "explore a dungeon" only on card/monument effect text ([Covenant rulebook](https://restorationgames.com/wp-content/uploads/2023/10/RtDT_Covenant_Rulebook-web.pdf)). **Unverified:** how room graphs and room contents are generated, what room types exist, and the exact loot tables. These live only in the app and are not documented.

**Rule.**
- **E20a Entry.** A pack places a dungeon at a site (an E19 objective). It starts when a hunter enters the site. Presence is locked as in E15, so only present hunters crawl.
- **E20b Layout.** At game start the engine deals a seeded layout from the pack's room deck: an ordered chain (optionally with branches) of N rooms, with the target room always last. Room types are **trap**, **foe**, **treasure**, **deeper/stairs** (advances depth, or opens a branch; it still pays `room.cost`, and it grants no loot and no Advantage), and **story room** (bound to one hunter; if that hunter is absent, use its `~no-<hunter>` variant). Rooms are face down until entered, and the Dashboard shows the room map RtDT-style.
- **E20c Per room (Bob, 2026-10-15).** Reveal the room. The present hunters may then apply E18 Advantages they already hold to reduce its cost (E20d). If the room lists `room.reduce_with`, only a held Advantage of those traits applies, and a held Wild Advantage counts too; if it omits the list, any held Advantage may. Then resolve the reduced cost. Clearing a room never grants an Advantage; the reward is loot (E20f) and depth (E20g). Foe rooms run through the existing Dashboard battle screen using E18 advantages, with the battle cards' warrior costs left as base RtDT. Whether that battle use is the same application as the cost reduction is not ruled.
- **E20d Costs.** Room costs come from story items and story tracks, or a corruption to a present hunter. Never warriors or spirit (story-mechanics ruling). Unpayable cost: pay what you can and take one corruption. At most one corruption per room, and the instant-loss guard applies (E9/E19f): never a third corruption from a crawl.
- **E20e Push on or retreat.** After each room the present hunters vote to go deeper or leave. A tie retreats (ruling 5, `vote.tie: retreat`); the host does not break it. Leaving keeps cleared rooms cleared, and the party may re-enter on a later turn or night if the pack allows it.
- **E20f Loot.** Treasure rooms and the target room grant story items, bound to a present hunter (carried key items rule, "E (carried key items)" above).
- **E20g Depth track.** The Dashboard shows depth (rooms cleared out of N). A pack may key the outcome to the depth reached.
- **E20h End.** The crawl ends when the target room is cleared (success flag), on retreat (partial, with depth recorded), or when the length cap is hit (treated as retreat).
- **E20i Length (Bob, 2026-10-15).** N, the dealt chain including the target room, is **Short 2, Standard 4, Long 6**. That is the ruled E20 count and the Dracula crypt count (D-DRA-14). The per-visit room cap also scales with length (R-LEN); the pack declares it, and real times come from measurement. A chain shorter than N for the chosen length cannot be dealt.
- **E20j Logging.** Log the seed, layout, each room (type, Advantages applied, cost paid, corruption, loot), the choice, and start/end timestamps per room and crawl (PRD-41 style).
- **E20k Tower.** No tower control in the POC (Phase 2). Ambient E16 continues, and scene cues are only a later option.

**Divergences from RtDT.**
1. Group crawl by present hunters instead of a single hero's action. This follows E15, so the whole table plays it.
2. Costs are story items/tracks and corruption, not warriors/spirit. This follows the story-mechanics ruling. Foe battles keep base warrior costs.
3. Room types are explicit and pack-authored, and the layout comes from a seeded deck. RtDT's generator is undocumented, so we can't copy it.
4. Corruption guard: RtDT allows a third corruption (loss). We redirect it instead.
5. A depth track and time cap are new; they make pacing measurable.
6. Story rooms tied to hunters are new, to support private/personal beats.
7. RtDT spends one Advantage matching the dungeon's trait (or Wild) to improve a room, once. We do not. Held Advantages reduce a story cost (E20c), and clearing a room does not grant an Advantage.
