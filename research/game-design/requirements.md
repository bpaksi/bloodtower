# Game requirements (index)

Status: **draft for Bob's review**, 2026-10-14. Nothing here is decided until Bob accepts it, except the Dracula rulings marked **Decided** in §0. Accepted requirements feed `apps/game-test/` and `apps/game/` intents and specs.

## Chief goals (in priority order)

1. **Make the game fun.**
2. **Use the original Dark Tower as much as possible**: the 1981 game and *Return to Dark Tower* (RtDT): tower, its sounds/lights/rotations, board, components and mechanics.

Every requirement below serves one of these. When they conflict, fun wins.

"MUST" = required for the first playable; "SHOULD" = expected; "MAY" = optional. Detail lives in: [story-engine.md](story-engine.md) (R-ENG, R-AV detail), [asset-catalog.md](asset-catalog.md) (R-ASSET), [encounters-and-set-pieces.md](encounters-and-set-pieces.md) (R-SP, R-RE), [sessions.md](sessions.md) (R-SES), [statistics.md](statistics.md) (R-STA), [setup-wizard-and-summary.md](setup-wizard-and-summary.md) (R-WIZ, R-SUM), §9 below (R-LEN), [open-questions.md](open-questions.md). [core-mechanics.md](core-mechanics.md) holds the shared systems.

## 0. Story-specific rulings

Each story's decided rulings live in its own folder (e.g. [Dracula rulings](../stories/dracula/rulings.md)). Every engine requirement here is generic. Rulings that changed the engine became generic requirements: multiple devices (R-ENG-16, R-SES-17, R-DEV), chapter/phase structure (R-ENG-17), region keys (R-ENG-18), automatic in-play tower cues (R-ENG-19).

## 1. Engine and story packs (R-ENG)

Story module contents and AV theme are detailed in [story-engine.md](story-engine.md).

| ID | Requirement | Rationale / source |
|---|---|---|
| R-ENG-1 | MUST: engine and story content are separate. A **story pack** is a data folder (manifest + content) the engine loads. Several packs install side by side; players pick one at start. Adding a story or new set pieces/encounters needs no engine change for anything the pack schema can express. | Multiple stories like the 1981 game's levels; [stories/README](../stories/README.md) |
| R-ENG-2 | MUST: a manifest declares id, title, version, engine-version range, player counts, session length estimate, parts/chapters, required components and expansions. Test: the engine refuses a pack whose manifest fails schema validation and lists why. | Fellowship is 3 sessions, Dracula a one-shot |
| R-ENG-3 | MUST: shared systems (party, resources, clock, locations, encounters, set pieces, checks, battle, dungeon, shop/haggle, riddle, corruption, dialog/narration, save) live in the engine; packs switch them on/off and **configure** them (resources, clock length and labels, loss and cure rules). Test: Dracula's nights and fellowship's shadow clock run on one clock module with different config. | [core-mechanics](core-mechanics.md) |
| R-ENG-4 | MUST: packs add story-specific mechanics through named, registered **rule modules** (e.g. fellowship key riddle) with typed hooks (on clock tick, encounter resolve, skull drop, win/loss check). Test: disabling a module removes its UI and effects without breaking other systems. | Each story has its own mechanics |
| R-ENG-5 | MUST: each pack declares its **look**: theme tokens (palette, type, light/dark), the AV theme (R-AV-1) and a **tower palette** (default light colors/effects, signature sounds). Switching pack switches look with no code change. | [look-and-feel](../look-and-feel/README.md) |
| R-ENG-6 | MUST: story content references tower effects by **cue name** (e.g. `cue.tower.wake`), mapped in the pack to `command{capabilityId, params}`. No raw bytes in packs. Cue maps use only capabilities in the [asset catalog](asset-catalog.md); a new capability needs a tower research note first. Test: lint rejects unknown capabilities and out-of-range params. | [CLAUDE.md](../../CLAUDE.md) tower safety; [api-surface](../tower/api-surface-7.1.2.md) §10 |
| R-ENG-7 | MUST: the engine runs fully with a **mock tower** that logs the cues it would send. Test: a whole session can be played and won with no tower. | Dev/testing; dead battery mid-game |
| R-ENG-8 | MUST: game logic is deterministic from a seed. Same pack + version + seed + choices = same outcome. | RtDT 12-char seeds |
| R-ENG-9 | SHOULD: Next.js/React, pnpm workspace, SQLite for saves, stats and pack index; packs as files in the repo. Shared engine code moves to `packages/` once a second app uses it. | Bob's prefs; [decision 0001](../decisions/0001-multi-app-layout.md) |
| R-ENG-10 | SHOULD: a "pack lint" validator (missing assets, broken references, unreachable set pieces) runs on load and as a CLI, plus a content preview that plays any scene or encounter alone with tower cues. | Authoring speed |
| R-ENG-11 | MUST: packs are versioned. A save records the pack version it started on; the engine warns if content changed under a save. | Draft A |
| R-ENG-12 | MUST: **every tower cue has a screen/audio fallback**, used in "tower off" mode, on disconnect, on a drum jam, or when a cue is rejected. Test: lint fails a cue map entry with no fallback. | Draft A; R-ENG-7 |
| R-ENG-13 | MUST: a story module defines identity, mechanics toggles, clock, chapter/night structure, resources, world, party, encounter tables, set pieces, keys, win/lose, AV theme, tower cue map, stats extras and required components. Full table in [story-engine.md](story-engine.md) (R-ENG-20 to R-ENG-34). | Draft A |
| R-ENG-14 | SHOULD: clock beats are authored per part/chapter; random encounters fill the gaps between beats. | Fellowship decision |
| R-ENG-15 | MUST: packs reference shared assets by catalog id, so one tower cue or 1981 event serves several stories with different flavour text. | Draft A |
| R-ENG-16 | MUST: **multiple devices**. Each player can have a private iPad joined to one game; one device (or the shared screen) is the table host. The engine sends private content (lines, choices, secrets) to one player's device and shared content to all. Game state has one authority, so devices never disagree. | D-DRA-7 |
| R-ENG-17 | MUST: packs declare a **chapter and night structure**: ordered chapters/nights, which kingdom(s) each uses, ordering constraints (e.g. Tome kingdom last), and what ends each one. | D-DRA-1, D-DRA-3, D-DRA-4 |
| R-ENG-18 | MUST: packs declare **key-earning rules**: which keys exist, what earns each (e.g. all set pieces of a kingdom done), and what keys unlock (e.g. the tower assault needs all three). | D-DRA-2, D-DRA-4; 1981 keys |
| R-ENG-19 | MUST: during play, **tower cues fire automatically** from the script with no per-cue confirm. Connecting, calibrating and reconnecting stay explicit player actions (R-SES-2). Physical player steps (remove a seal, drop a skull) still wait for confirmation (R-SP-8). | D-DRA-8; tower safety |

## 2. Audio and visuals (R-AV)

Owned by Illusionist (voices, visuals, sound). Detail in [story-engine.md](story-engine.md) §AV.

| ID | Requirement | Rationale / source |
|---|---|---|
| R-AV-1 | MUST: each story declares an **AV theme**: still art style, animated clip style, color palette, narrator voice, one voice per recurring character (a Gemini TTS voice plus a short style line), music mood, and a sound-effect set. | Illusionist |
| R-AV-2 | MUST: each scene moment is marked as a **still** or an **animated clip**. | Illusionist |
| R-AV-3 | MUST: dialog has at most **two speakers per exchange**. Lint flags exchanges with more. | Illusionist |
| R-AV-4 | MUST: **private lines carry a target device** (which hunter's iPad plays them). | Illusionist; R-ENG-16 |
| R-AV-5 | MUST: all media (art, clips, voice, music, sfx) is **pre-rendered and cached**. The engine only plays files; it never generates media live. Test: a session plays with the network off once a pack is cached. | Illusionist |
| R-AV-6 | MUST: scripts use bracketed cues, e.g. `[sfx: door creak]`, `[music: ...]`, alongside tower cue names. Lint checks every cue resolves to a cached file or a catalog tower cue. | Illusionist; matches the [APP]/[TOWER] style in [opening-scene](../stories/dracula/opening-scene.md) |
| R-AV-7 | MUST: the app, not the tower, owns music and ambience. Tower sounds are stingers only (tower sound looping failed on Bob's tower). | Spike run 3 |

## 3. Original-asset reuse (R-ASSET)

| ID | Requirement | Rationale / source |
|---|---|---|
| R-ASSET-1 | MUST: every pack uses the physical board, buildings, hero minis, skulls and tower. A pack lists any original component it doesn't use and why. | Goal 2 |
| R-ASSET-2 | MUST: the engine ships a **tower cue library** from the 113 sounds, 24 lights, 6 effects, 21 sequences, drum rotations and seal breaks, each tagged (mood, length, loudness, verified yes/no). Packs pick from it. | [asset-catalog §A](asset-catalog.md) |
| R-ASSET-3 | MUST: the skull drop is a game input (turn end / clock tick) in every pack. Test: one drop advances the clock exactly once. | The tower's one physical input |
| R-ASSET-4 | MUST: the app persists seal state (firmware doesn't), restores it on resume and reconciles it with the tower at startup. | [api-surface](../tower/api-surface-7.1.2.md) §7 |
| R-ASSET-5 | MUST: design only on verified tower behaviour, or mark content as depending on unverified behaviour. No tower sound loops, no drum motion via rotation sequences 15–18 (they only light), no "wait for sound end". | Spike run 3; api-surface §3 |
| R-ASSET-6 | SHOULD: encounters reuse RtDT foes (12), adversaries (8), traits/Advantages (7), Reinforce, haggle die and card decks, reskinned (name, art, text) rather than replaced. | [component-inventory](../return-to-dark-tower/component-inventory.md) |
| R-ASSET-7 | SHOULD: RtDT procedures are templates: battle, dungeon (cleared rooms persist), foe status escalation, 4th skull destroys a building. | [rules](../return-to-dark-tower/game-overview-and-rules.md) |
| R-ASSET-8 | SHOULD: each pack includes at least one 1981 callback (keys/riddle, bazaar haggling, brigands, dragon, helpers, plague, lost, cursed). | Goal 2 |
| R-ASSET-9 | MUST: a pack declares required expansions; the engine runs base-only content when one isn't owned. | Expansion compatibility |
| R-ASSET-10 | MUST: every asset has a stable catalog id. | Draft A |
| R-ASSET-11 | MUST: tower safety: no automatic retries or reconnects; 300–500 ms between drum/long-audio commands; no commands during calibration (they are dropped). | api-surface §2, §12; CLAUDE.md |
| R-ASSET-12 | MUST: 1981 entries are marked general knowledge until a sourced research note exists. | No 1981 research in repo |

## 4. Fun principles (R-FUN)

Testable by playtest checklist; Bob judges fun in sessions, logged in playtest notes.

| ID | Requirement | Rationale / source |
|---|---|---|
| R-FUN-1 | MUST: every action yields a visible consequence within one step (app reaction; a tower cue for significant ones). | Table spectacle |
| R-FUN-2 | MUST: meaningful choices with costs. Every location offers ≥2 actions with different clock costs and rewards. | Shadow clock |
| R-FUN-3 | MUST: pressure escalates over a session; the final third is the tensest. Test: the threat metric never falls across the authored timeline unless players act. | RtDT adversary-retreat complaint |
| R-FUN-4 | MUST: ≥2 difficulty levels per pack, plus a ramp that resists Advantage stacking. | RtDT "too easy" |
| R-FUN-5 | MUST: no rulebook needed. The app does the math and teaches each system the first time it appears (skippable soft tutorial in the opening). | RtDT has no tutorial |
| R-FUN-6 | MUST: tower **big moments** (wake, seal break, castle storm, finale) at authored beats, at least every ~15 min, with a configurable minimum spacing so they don't become noise. | Battery; pacing |
| R-FUN-7 | SHOULD: replay variety from seeded variation (start realm, hero placement, clues, tables). | Fellowship; Ravenloft |
| R-FUN-8 | SHOULD: cooperative; 1–4 players on the same script (unused heroes become NPCs). Private devices (R-ENG-16) add per-player secrets without breaking co-op. | core-mechanics; D-DRA-7 |
| R-FUN-9 | SHOULD: the antagonist acts with intent, not only random draws. | Ravenloft Strahd |
| R-FUN-10 | SHOULD: each hero has a private tie the story can pay off, delivered on their own iPad. | [dracula characters](../stories/dracula/characters.md) |
| R-FUN-11 | MUST: touch-first iPad UI (≥56 px targets, ≥18 px text, one-view layout), adaptable to desktop and phone. | look-and-feel |

## 5. Sessions (R-SES)

Flows and detail in [sessions.md](sessions.md).

| ID | Requirement |
|---|---|
| R-SES-1 | MUST: startup = home → new/resume → pack (+ part/chapter) → players, devices and difficulty → seed → tower connect → calibrate → setup checklist → opening scene. |
| R-SES-2 | MUST: tower connect, calibrate and reconnect are **user-initiated** buttons, never automatic. Show calibration progress (~22 s) and offer "play without tower" (mock). |
| R-SES-3 | MUST: the physical setup checklist comes from pack + seed, one confirmed step at a time. |
| R-SES-4 | MUST: autosave to SQLite after every resolved action and clock tick. Resume restores state exactly (seals, expected drum positions, chapter/night, keys) and shows a reconciliation checklist; the tower is recalibrated. |
| R-SES-5 | MUST: a session ends on win, loss, part complete, concede, or "end for now". Win/loss (including immediate losses like a 3rd corruption, empty skull supply, clock out) are pack-declared and checked after every state change. |
| R-SES-6 | MUST: ending plays an outcome scene (app + tower finale cue) and a recap (key events, stats, seed). Multi-part packs carry declared state to the next part. |
| R-SES-7 | SHOULD: a tower disconnect pauses tower steps, offers manual reconnect or mock mode, and never loses state. |
| R-SES-8 | SHOULD: home screen: New campaign, Continue, One-shot, Statistics. |
| R-SES-9 | SHOULD: check battery before starting and warn if low. |
| R-SES-10 | SHOULD: several saves per campaign; one active session per campaign. |
| R-SES-11 | SHOULD: undo of the last non-physical choice; physical steps can't be undone by the app. |
| R-SES-12 | MUST: each pack declares what carries between parts; a between-part screen shows what carried over and what reset. |
| R-SES-13 | SHOULD: wrap-up gives a tear-down hint and resets the tower to neutral only when players confirm. |
| R-SES-14 | MAY: a 1–5 fun rating and note at the end, stored with stats. |
| R-SES-15 | SHOULD: a closed mid-game session stays resumable and is marked abandoned in stats after a set time. |
| R-SES-16 | MUST: a "concede" button is reachable from play. |
| R-SES-17 | MUST: during setup each player joins their private iPad to the game and picks a hero; a device can rejoin mid-game without losing state. |

## 6. Set pieces (R-SP)

Detail and template in [encounters-and-set-pieces.md](encounters-and-set-pieces.md).

| ID | Requirement |
|---|---|
| R-SP-1 | MUST: set pieces are pack data: trigger (location, clock beat, item, flag), ordered steps (narration, dialog, choice, tower cue, physical step, check), outcomes that set state and flags. |
| R-SP-2 | MUST: each names the catalog assets it uses (tower cues, board elements, RtDT procedures). Lint fails a reference not in the catalog. |
| R-SP-3 | MUST: each ends in a player choice or a mechanical consequence, not narration only. |
| R-SP-4 | SHOULD: non-linear (any order) and gated by flags (clues, keys, seals). Completion of a kingdom's set pieces can feed key-earning rules (R-ENG-18). |
| R-SP-5 | SHOULD: seeded placement of key set pieces/artifacts. |
| R-SP-6 | SHOULD: the tower is a stage: seals as doors, drums as gates/castle levels, glyph facing as a world condition. |
| R-SP-7 | MUST: each set piece plays in the content preview with the mock tower. |
| R-SP-8 | MUST: a step that needs a physical action (remove a seal, drop a skull) waits for players to confirm it. |
| R-SP-9 | SHOULD: a set piece plays once per campaign unless marked repeatable. |

## 7. Random encounters (R-RE)

| ID | Requirement |
|---|---|
| R-RE-1 | MUST: tables are pack data keyed by kingdom, terrain, building type, time phase (day/night), story part and threat level. |
| R-RE-2 | MUST: draws are seeded and weighted; same seed and state = same draw. |
| R-RE-3 | MUST: encounters are built from catalog assets: an RtDT foe (level + traits) or hazard, a resolution (battle/check/trade/haggle), rewards from existing decks, and a tower cue. |
| R-RE-4 | MUST: no identical encounter twice in a row; per-session caps and cooldowns. |
| R-RE-5 | SHOULD: skull landing kingdom and foe status bias where encounters happen and how hard. |
| R-RE-6 | SHOULD: some encounters are non-combat (rumor, merchant, omen, ally); some can be avoided at a cost. |
| R-RE-7 | SHOULD: the antagonist has its own intervention deck. |
| R-RE-8 | MUST: encounter frequency is tunable per pack and difficulty and logged per session. |
| R-RE-9 | MUST: each encounter offers 2–3 choices with different costs/risks, unless it is a pure hazard with a counter. |
| R-RE-10 | MUST: the **1981 counter pattern**: specific allies, abilities or items counter specific hazards (scout vs. lost, healer vs. plague, dragonsword vs. dragon; Dracula: holy water/host vs. corruption). |
| R-RE-11 | MUST: each encounter declares a clock cost. |
| R-RE-12 | MUST: each outcome shows one line plus resource deltas and is logged to stats. |

## 8. Statistics (R-STA)

Data model in [statistics.md](statistics.md).

| ID | Requirement |
|---|---|
| R-STA-1 | MUST: every game stores detailed statistics in SQLite. |
| R-STA-2 | MUST: an append-only event log of everything (choice, roll, resource change, tower cue, physical step, device), with clock tick and wall time. It is the source of truth. |
| R-STA-3 | MUST: resource values over time, for wrap-up graphs. |
| R-STA-4 | MUST: each encounter and combat with choice, outcome and deltas. |
| R-STA-5 | MUST: tower activity: cues sent/rejected/fallen back, skull drops, seals broken, calibrations, disconnects, battery. |
| R-STA-6 | SHOULD: stats roll up per game, campaign, story, hero and all time. |
| R-STA-7 | MUST: packs add their own counters (e.g. keys earned, corruptions, villagers turned) without new tables. |
| R-STA-8 | MUST: stats are local and private; export to JSON/CSV on request. |
| R-STA-9 | MUST: unknown values are stored as null, never zero. |
| R-STA-10 | MUST: each game records its seed and pack version. |
| R-STA-11 | SHOULD: per-player stats are attributed to the player's device/hero. |

## 9. Game length (R-LEN) (requested by Bob, 2026-10-14)

Bob wants a handle on total game length. Story-neutral: each pack supplies its own mapping. Draft for review.

| ID | Requirement |
|---|---|
| R-LEN-1 | MUST: game length is a startup option with three values, **Short / Standard / Long**, chosen by the host during setup (R-WIZ-12) and fixed for the game. Default: Standard. It is recorded with the game (R-LEN-5). |
| R-LEN-2 | MUST: length sets the number of nights (or chapters/clock length, R-ENG-3, R-ENG-17), the hunter-token pace (E19), and encounter frequency (R-RE-8). |
| R-LEN-3 | MUST: each story pack declares, per length, which nights and set pieces are included, so the plot stays whole at every length: the opening, every set piece the win condition depends on, and the finale are present at every length. Lint fails a length whose win condition is unreachable. |
| R-LEN-4 | MUST: target play times per length are **measured, not guessed**: they come from timed playtests (POC timing, then full-game runs) and are stored as pack data with the number of runs behind them. Until enough data exists, the estimate is shown as pending. |
| R-LEN-5 | MUST: the end summary (R-SUM) and stats (R-STA) record actual duration: total, active, paused, and per phase/night, alongside the chosen length, so estimates can be refined from real games. |

## R-DEV: Device topology (decided by Bob, 2026-10-14)
- R-DEV-1. The Mac is the host. It holds the Bluetooth connection to the tower, runs the game state, and keeps the SQLite saves and stats.
- R-DEV-2. A browser on the Mac shows the running-game Dashboard, which all players can see. It is the shared screen: map and kingdom state, the clock and night, party resources, corruption, keys, skulls and seals, the current scene, and tower status.
- R-DEV-3. Each player has their own iPad, which joins the Mac's game over the local network. It shows that player's hunter, private scenes and lines, private choices, and any secret goal.
- R-DEV-4. Nothing private ever appears on the Dashboard. Nothing shared depends on a single iPad being present; a player who drops out can rejoin and their iPad restores their view.
- R-DEV-5. The tower is driven only by the Mac. The iPads never talk to the tower.
- R-DEV-6. Audio routing: narration, music, and shared sound effects play from the Mac with the Dashboard. Private lines play only on their owner's iPad (earbuds or low volume recommended). Every script cue carries a target: `dashboard` or `ipad:<hunter>`. If no target is given, the cue goes to the Dashboard. The readiness check rejects a private line targeted at the Dashboard.
- R-DEV-7. Two render targets from one source: the Dashboard gets 1080p 16:9, and the iPads get portrait or 4:3 crops. The asset index stores a variant per target (`<id>@dashboard`, `<id>@ipad`), and the readiness check requires the variant that each cue's target needs.

- R-DEV-8. A phone can stand in for a player iPad. Join is the same QR (R-WIZ-10). The device is detected at join, and the player can switch to the full layout.

## R-DEV-9 Hunters and devices (Bob, 2026-10-14)
- All of the story's hunters are always in play (4 for Dracula). The number of humans and devices can vary.
- When a device joins (QR, R-WIZ-10), it selects which hunter or hunters it holds. One device can hold several hunters.
- **Start gate:** the game cannot start until every hunter is held by at least one device. The wizard shows unheld hunters.
- More devices than hunters is fine. A hunter held by several devices shows its private moments on all of them.
- Private moments go only to devices holding that hunter, never to the Dashboard. A device holding several hunters shows each hunter's private moment labeled with that hunter's name.
- Holdings can be changed from the Dashboard at any time. If a change would leave a hunter unheld, the game pauses until that hunter is held again.
- The stats record devices and holdings for each game.
- Disconnect rule (Bob, 2026-10-14): if the only device holding a hunter disconnects, play pauses at once, the same as an unheld hunter, and resumes when a device holds that hunter again.
