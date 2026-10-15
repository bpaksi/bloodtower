# Tower Effects Library (design doc, draft 1)

Status: proposal for Phase 2 (funeral PRD §13) and the story engine (E13, E16, R-ENG-33). Nothing here is implemented.
Sources: `apps/tower-poc/docs/{final-report,capabilities,reuse-guide}.md`, `apps/tower-poc/spec.md` §2/§7 gap entries (referenced by the docs), `ultimatedarktowerdata` 3.0.0 sound table, `research/game-design/story-engine.md` (E13, E16, E19c), `story-pack-format.md` §6, funeral `cue-sheet.json`, funeral PRD §13.
Hardware basis: one tower, rev 1.11, library `ultimatedarktower` 7.1.2, Verify pass 2026-10-15 (42 capabilities passed).

Status labels follow E13: **Verified** = passed the M3 Verify pass on Bob's tower; **Partial** = that pass recorded partial; **Library** = in the library, not hands-on verified; **GAP** = not usable or held.

---

## (a) Capability inventory

### A1. Lights

| Capability | Params | Timing | Status | Limits / risks |
|---|---|---|---|---|
| `lighting.set` | Up to 24 lights. Doorway 12 (N/E/S/W × top/middle/bottom), ledge 4 (NE/SE/SW/NW), base 8 (N/E/S/W × top/bottom). Style per light: `off`, `on`, `breathe`, `breatheFast`, `breathe50percent`, `flicker` | Tower answers in 25–65 ms | Verified | **No colour** (single-colour LEDs). Lights hold until changed. **No-op trap:** a write that changes nothing gets no answer, so the library queue stalls 30 s (GAP-HW-010). The engine must diff against the state store and skip no-ops |
| `lighting.all-on` | optional `effect` | ~50 ms | Verified | All-on when already all-on is a no-op stall |
| `lighting.all-off` | none | ~50 ms | Verified | Same no-op trap when already dark |
| `lighting.set-led` | layer 0–5, light 0–3, style, loop | ~50 ms | Verified | Low-level; the layer map (doorway/ledge/base) should be confirmed before packs reference it directly. Prefer `lighting.set` |
| `lighting.flash` | one light, a rate, a fixed 5 s | not measured | GAP | Timing page only, and untested on the tower. It toggles one light by writing state, because `setLED` cannot flash at 2–8 Hz. Story effects do not use it |
| `lighting.sequence` | 21 in `TOWER_LIGHT_SEQUENCES`: twinkle, flareThenFade, flareThenFadeBase, flareThenFlicker, angryStrobe01–03, gloat01–03, defeat, victory, dungeonIdle, sealReveal, rotationAllDrums, rotationDrumTop, rotationDrumMiddle, rotationDrumBottom, monthStarted, wholeTowerBreathing, slowFlareThenFade. Optional `soundIndex` 1–113 on sequences that answer | ~50 ms to answer; sequence length unknown/not reported | Verified for the 20 the Lights page offers. `rotationDrumMiddle` held (GAP-HW-007) | The service schema accepts all 21, including `rotationDrumMiddle`, so the timing test can send it. The Lights page offers 20 and hides Middle. Story effects use those 20 and skip Middle until the hold lifts. Sequence + sound in **one packet** is the sync path. Durations are not documented; measure. `rotation*` sequences: tower never answers, sent fire-and-forget (D23), **require calibration**, **cannot carry a sound**, and stay lit until the next command |

### A2. Sound

| Capability | Params | Timing | Status | Limits / risks |
|---|---|---|---|---|
| `sound.play` | index 1–113 | echo in 50–60 ms | Verified | One-shot. **No loop** (GAP-HW-008). **No end event** (GAP-LIB-007): never wait for sound end. Lengths unknown |
| `sound.play-stateful` | index, volume 0–3 | same | Partial | 0, 1 and 2 were heard; **3 is mute**. Whether 0–2 differ in loudness was not recorded (GAP-HW-003). The M3 pass did not mark this capability pass |
| (overlap) | | | Risk | Overlap behaviour (a new sound cutting off vs layering the current one) is **not documented**. Assume the new sound replaces the old; design so stings never stack faster than ~1.5 s |
| (link drop) | | | Risk | GAP-HW-011: once the link dropped mid-sound and needed a power cycle. Cause unknown (low battery guessed). Sound-heavy effects should be tolerant of a disconnect mid-cue |

### A3. Drums and glyphs (mechanical)

| Capability | Params | Timing | Status | Limits / risks |
|---|---|---|---|---|
| `mechanics.rotate-with-state` | top/middle/bottom → N/E/S/W, optional sound | ~1.1 s per quarter turn per drum (slow, audible, motor noise) | Verified, requires calibration | **Cannot be stopped** once turning (GAP-HW-004). A drum already in place doesn't move. Keeps lights |
| `mechanics.rotate-drum` | drum 0–2, position 0–3, playSound | ~1.1 s/quarter turn | Verified, requires calibration | **GAP-LIB-013:** with sound on, to the side it already faces → silent 30 s stall. Leave the sound off, or check the position first |
| `mechanics.random-rotate` | 7 groupings | multi-second | Verified, requires calibration | **Turns all lights off** (GAP-HW-009). Not for story use |
| `mechanics.rotate` (legacy) | | | GAP (not offered) | Kills lights |
| drum/glyph position queries | | instant (software) | Verified | **Software's belief, not sensed.** A hand-turned drum is invisible to the app |
| calibrate | none | **19.5–24 s**, noisy | Verified | Lost on **every reconnect**. Commands during calibration are rejected (D22, PRD-6) |
| unjam, door reset, overwrite drum states | | | GAP | No public method in 7.1.2 |

**Board-state finding:** drum faces (glyphs, seal windows) carry game meaning (E13, E16 bed rule, E19c "never moves the drum", cue sheet "story cues never move drums"), positions are not sensed, and moves are slow and unstoppable. → rule C5 below.

### A4. Seals

| Capability | Params | Status | Notes |
|---|---|---|---|
| `seals.break` | side × level (12 seals) | Verified | Plays the built-in seal reveal (lights + sound) and records the seal broken. Volume param is discarded by the library. Works without calibration |
| mark broken / restored, reset, queries | | Verified (service-only) | App's own record (D24); the tower doesn't know which seals are broken |

### A5. Skulls

| Capability | Status | Notes / risks |
|---|---|---|
| `skulls.on-drop`, `skulls.count` | Verified | The **player** drops a skull through the tower; the tower senses it. It is an input, not an output. Risks: first report after connect looks like a drop of the whole count (GAP-LIB-011, handled by D24); drops while disconnected are missed; counter behaviour across power cycle unknown. Side effect: the drop sensor triggers in the physical tower; whether firmware plays its own sound/lights on a drop under app control is **not documented**, so assume it may, and don't schedule a sting on top for ~1 s |
| `skulls.reset-count` | Verified (GAP-LIB-012 open on whether the tower actually resets) | Prefer the app record |

### A6. Connection, battery, state

- Connect 1.2–3.1 s; disconnect 40 ms; no auto-reconnect, no retries (safety rule).
- Battery reported ~every 2 s (≈4.7 V fresh); none during calibration. Use it to warn the host before GAP-HW-011-style drops.
- Answer mis-correlation risk (GAP-LIB-010): any state report confirms the waiting command.

### A7. Engineering constraints every effect inherits
1. **Diff before send** (no-op stall).
2. **Fire and forget audio**; never await end.
3. **Fallback always defined**; used on disconnect, calibration, `rejected`/`failed`/`timed-out`/`indeterminate` where it matters.
4. **One command at a time** through the executor lane. After a write, the lane waits 250 ms before the next command starts (tower-poc spec §3). A composite effect's gaps are at least that.
5. **No colour**; express intent by location (which side, which level), style (breathe vs flicker vs on) and rhythm.

---

## (b) Effects library

Conventions. Times are offsets from effect start. "Bed" = the current E16 ambient light pattern, restored at the end (`restore-bed`). Intensity tiers: **T1 subtle**, **T2 normal**, **T3 climax**. Fallback = Story board (Dashboard) visual + Mac audio; per R3-3, screen half always plays, fallback audio only when the tower or its sound is unavailable. Sound numbers refer to [`tower-sound-inventory.md`](tower-sound-inventory.md) in this folder. Every effect: `drums: none` unless stated.

### Ambient / bed (E16 layer 1)

**FX-01 `bed-dusk-breathe`**
- Purpose: calm-but-uneasy baseline.
- Recipe: `lighting.set` doorway all `breathe50percent`, ledge `off`, base `breathe`. Hold.
- Used by: E16 dusk bed (`amb.dusk-breathe`).
- Tiers: T1 base only; T2 as written; T3 doorway `breathe`.
- Fallback: slow vignette breathe on the Story board; Mac ambience bed (always Mac anyway, R-AV-7).

**FX-02 `bed-night-flicker`**
- Purpose: night threat baseline.
- Recipe: doorway middle `flicker` on two random sides, others `off`; base `breathe50percent`.
- Used by: E16 night bed (`amb.wake-flicker`).
- Tiers: T1 one side; T2 two; T3 all four.
- Fallback: candle-flicker overlay.

**FX-03 `bed-dawn`**
- Purpose: relief / phase end.
- Recipe: `lighting.sequence slowFlareThenFade` then `lighting.set` base `on`, rest `off`.
- Used by: dawn phase.
- Fallback: warm brightening vignette.

**FX-04 `bed-whole-breathing`**
- Purpose: generic default bed when a pack declares none (E16 engine default).
- Recipe: `lighting.sequence wholeTowerBreathing` (no sound).
- Fallback: vignette breathe.

### Ambient accents (E16 layer 2)

Accents must **change** something (no-op rule). Each accent is "perturb, then `restore-bed`".

**FX-05 `accent-glint`**: `lighting.sequence twinkle` (no sound), restore-bed at +2.5 s. T1 only. Fallback: sparkle on the board edge.

**FX-06 `accent-whisper`**: `sound.play-stateful` Tower Idle 1–5 (#100–104), volume 2 (quietest audible, pending GAP-HW-003). Lights unchanged. Fallback: Mac whisper sfx, low.

**FX-07 `accent-side-glance`**: one random doorway side goes `breatheFast` for 3 s, then restore-bed. (The "eye sweep" of R-ENG-33 at T1.) Fallback: vignette pulse from that compass edge.

**FX-08 `accent-far-bell`**: pack-supplied Mac bell sound (tower has no bell, see FX-12) + base `flicker` 1.5 s. Fallback: same Mac sound, edge flicker.

**FX-09 `accent-wind`**: ledge lights `flicker` 2 s, restore. Mac wind. Fallback: board dust drift.

### Scene and event effects (E16 layer 3)

**FX-10 `heartbeat`** (cue sheet `heartbeat`)
- Purpose: tension while players decide.
- Recipe: doorway bottom ring `breatheFast`, rest dimmed to `off`; hold for the moment's duration; restore-bed on exit. Optional single sound only at T3.
- Used by: `.investigate`, `.lid-choice`, `.04`, `.04~holy-symbol`; E19c hunter-token move (as `land_cue`/`move_cue`); E17 choice timers.
- Tiers: T1 `breathe50percent` bottom; T2 `breatheFast` bottom; T3 bottom + middle `breatheFast` + Tower Idle sound once at start.
- Fallback: screen pulse on vignette + `sfx.heartbeat-fallback`.

**FX-11 `dim-all`** (cue sheet `dim-all`)
- Purpose: blackout before a reveal.
- Recipe: `lighting.all-off` (skip if already dark). Hold ≥ 1.5 s.
- Used by: `.04`, `.04~holy-symbol`; any pre-reveal.
- Tiers: T1 doorway off, base stays `breathe50percent`; T2 all off.
- Fallback: screen fades to near-black 1.5 s.

**FX-12 `bell-toll`**
- Purpose: a count of time (midnight, funeral bell, round end).
- Recipe: for n tolls, every 2.0 s: all doorway `on` → after 300 ms set doorway `off`. Sound: the tower has **no bell**; play the bell from the Mac in sync (tower answers within ~65 ms, so sync is good). Optional: Month Ended (#106) on the last toll at T3.
- Used by: round ends, night start, funeral procession beats.
- Tiers: T1 base only flash; T2 doorway; T3 whole tower + #106.
- Fallback: screen flash per toll + Mac bell.

**FX-13 `dread-approach`**
- Purpose: something is getting closer.
- Recipe: +0 base `breathe`; +2 s doorway bottom `breathe`; +4 s doorway middle `breatheFast`; +6 s top `flicker` + Tower Angry 1 (#90). Hold 2 s, restore.
- Used by: hunter token closing in (E19c within 2 spaces), foe arrival, end-of-night warnings.
- Tiers: T1 stops at +4 s silent; T2 as written; T3 sound Tower Angry 3 (#92) and `angryStrobe01` at the end.
- Fallback: vignette closing in from edges + Mac low drone rising.

**FX-14 `hunter-token-pulse`**
- Purpose: the hunter token (E19c) moved one space.
- Recipe: doorway on the **side facing the token's kingdom** `breatheFast` 1.5 s, then restore. No sound (fires every round; sound would fatigue). On **land** use FX-15.
- Used by: E19c move, `hunter_token.move_cue`.
- Tiers: T1 base side only; T2 doorway side; T3 doorway + ledge corners on that side.
- Fallback: token icon pulse on the board map + soft thud.

**FX-15 `hunter-strikes`**
- Purpose: the hunter token lands on a hunter.
- Recipe: `lighting.sequence angryStrobe02` + Foe Event (#65) in one packet; at +3 s restore.
- Used by: E19c `land_cue`, encounter draw.
- Tiers: T1 angryStrobe01 silent; T2 as written; T3 angryStrobe03 + Tower Angry 4 (#93).
- Fallback: red-free (no colour on tower; screen may use palette) screen shake + Mac sting.

**FX-16 `corruption-creep`**
- Purpose: corruption/track rises by one.
- Recipe: one more doorway level (bottom→middle→top) switches to `flicker` per corruption step and **stays** as part of the bed until cured; sound Tower Gloat 1 (#96) at the moment it rises.
- Used by: corruption gain, risky investigation costs (E17), instant-loss guard warnings.
- Tiers: by track level (bottom/middle/top); at max: `gloat03` sequence + Gloat 3 (#98).
- Fallback: corruption meter vein animation + Mac sting.

**FX-17 `corruption-cleansed`**: one flicker level reverts to the bed + Quest Complete (#88) at T2 / Card Flip (#28) at T1. Fallback: meter recedes, chime.

**FX-18 `seal-sequence`** (cue sheet `seal-sequence`)
- Purpose: a hidden thing is uncovered by a risky choice.
- Recipe: `lighting.sequence sealReveal` + Tower Seal (#112) in one packet; restore at +3 s. Do **not** use `seals.break` unless a real seal is meant to be broken, since it writes a broken-seal record (D24).
- Used by: `.investigate.follow-the-mourner.cue`; any risky E17 action.
- Tiers: T1 sealReveal silent; T2 as written; T3 Rotate Start (#111) then +1.5 s Tower Seal (#112).
- Fallback: screen seal flicker + `sfx.seal-flicker`.

**FX-19 `seal-break-true`**
- Purpose: a story beat that really opens one of the 12 seals (the base game's meaning).
- Recipe: `seals.break(side, level)`.
- Used by: only when a pack's rules map to a physical seal. Rare.
- Fallback: board shows the seal cracking; host told to open it by hand.

**FX-20 `skull-drop`** (cue sheet `skull-drop`; player step)
- Purpose: a loss costs the party; physical skull through the tower.
- Recipe: board prompts "Drop a skull"; wait for the first of `skulls.on-drop` and host Done, and ignore the other; then +1 s `lighting.sequence flareThenFadeBase` (no extra sound if the tower played its own; else Tower Skull Dropped #113).
- Used by: `.07~fight-lost` only when the lid choice was watched. Nailed + lost does not drop a skull (AT-7). Cap 2/night; capped or converted drops do not fire.
- Tiers: one tier; T3 adds `angryStrobe01` when the drop hits a threshold.
- Fallback: Story board prompt + Done confirm; `sfx.skull-drop-sting` only without tower.

**FX-21 `room-reveal`** (dungeon/crypt room)
- Purpose: entering a new room in a crypt/dungeon sequence.
- Recipe: FX-11 at T1 (doorway off, base stays `breathe50percent`, hold 1.5 s) → room sound (Dungeon Tomb #64 / Ruins #62 / Caves #57 / Shrine #63 / Fortress #61 / Encampment #59 by room type) with `lighting.sequence dungeonIdle`; leave `dungeonIdle` as the bed while in the room.
- Used by: n23 Catacombs of Saint Ysolde rooms, tower assault floors.
- Fallback: room card flip + Mac room ambience.

**FX-22 `room-cleared`**: Dungeon Complete (#58) + `flareThenFade`; footsteps (#56) to move on. Escape (#60) when fleeing. Fallback: room stamp + chime.

**FX-23 `battle-start`**: `lighting.sequence angryStrobe01` + Battle Start (#37). Bed during battle: doorway `breatheFast`. Fallback: battle splash + Mac drum hit. Note: battle screen is a `choice` moment, so ambient accents are suppressed.

**FX-24 `advantage-applied`**: Apply Advantage 01–05 (#19–23) by count (or Max #24 / None #25), `flareThenFlicker` at T2. Fallback: advantage chip glow.

**FX-25 `battle-won`**: `lighting.sequence victory` + Battle Victory (#38). Fallback: win banner + Mac fanfare.

**FX-26 `battle-lost` / `defeat`**: `lighting.sequence defeat` + Quest Failed (#108). Followed by FX-20 when a skull is owed. Fallback: desaturate + Mac sting.

**FX-27 `counts-arrival`** (set piece, R-ENG-30)
- Purpose: the antagonist appears.
- Recipe: +0 FX-11 all off (hold 2 s, Mac silence); +2.0 s base `flicker`; +3.5 s doorway bottom `breathe`; +5.0 s `lighting.sequence gloat02` + Tower Gloat 2 (#97); +9 s doorway top `breathe50percent` on the side the Count enters, all else `off`, as his presence bed until he leaves.
- Used by: Count's arrival set piece; night-5 assault opening.
- Tiers: T3 only (T2 if host mode Lights only: no sound).
- Fallback: full-screen blackout → portrait reveal + Mac theme. Voice is Mac-side; the tower's Adversary voice lines (#1–8) are other characters, do not reuse for the Count.

**FX-28 `victory-flare`** (campaign win)
- Recipe: `lighting.sequence victory` + Quest Complete (#88); +4 s `lighting.all-on on`; +8 s `slowFlareThenFade`, then base `breathe` bed.
- Tiers: T2 lesser win (no all-on), T3 full win.
- Fallback: ending card + Mac score.

**FX-29 `doom` / tower wins**: `gloat03` + Tower Gloat 3 (#98), then `all-off`. Loss endings (Taken/Turned). Fallback: ending card.

**FX-30 `phase-turn`** (night/month start/end)
- Recipe: `lighting.sequence monthStarted` + Month Started (#107) at night start; Month Ended (#106) + `slowFlareThenFade` at dawn.
- Fallback: phase card wipe + Mac chime.

**Utility effects (not story):**
- **FX-U1 `self-test`** (R3-10): `dim-all` → `heartbeat` T2 → Tower Skull Dropped (#113). Host confirms each step.
- **FX-U2 `tower-awake`**: the host presses Awake after connect has succeeded, and only then does the tower play Tower Connected (#94). Nothing plays on connect by itself (PRD-5, E13). **FX-U3 `calibration-cover`**: no tower commands (D22); Mac "castle stirs" loop.
- **FX-U4 `restore-bed`**: re-send the current bed **only if** the store says lights differ.

---

## (c) Combination rules

**C1. Layers and priority** (E16): scene cue (L3) > accent (L2) > bed (L1). Within L3: player-step (skull) > set piece > event sting > choice cue (heartbeat).
- A higher layer interrupts a lower one at the next command boundary; the lower layer is not resumed, just `restore-bed`.
- Within L3, a new cue of equal or higher priority may cut a running cue only at a step boundary; lower-priority cues queue max 1 deep (drop the older). Never queue behind a drum move.
- Accent reason logging stays R5-2: `choice > scene_cue > moment > ambient`; `choice` and `scene_cue` suppress accents.

**C2. Command pacing.** The executor waits 250 ms after a write before the next command starts (tower-poc spec §3), so a composite effect cannot go faster than that. A sound-bearing step is ≥1.5 s after the previous sound (overlap behaviour unknown). `restore-bed` after every L2/L3 effect, diffed (no-op stall rule). Any command that ends `indeterminate`/timed-out → switch that effect to its fallback immediately; don't retry (safety rule).

**C3. Cooldowns.**
| Effect | Cooldown |
|---|---|
| Any tower sound (L2) | 20 s min between accent sounds |
| Same accent | not twice in a row (seeded pick without immediate repeat) |
| `hunter-token-pulse` | once per round (naturally) |
| `dread-approach`, `hunter-strikes` | 60 s |
| `corruption-creep` sound | 10 s (light state still updates) |
| `counts-arrival`, `victory-flare`, `doom` | once per scene |
| Gloat sounds (#96–98) | 3 min; they're memorable and wear out |

**C4. Never-idle cadence (E16, AT-26).** A watchdog tracks time since last tower activity. Bed lights count as activity only when a command was sent, so: if 8 s pass with no command, send an L1 "bed breath" (switch the bed between two equivalent styles, e.g. `breathe`↔`breathe50percent` on one ring), keeping the gap ≤10 s. Accents fire on seeded intervals per pack (`interval_s: [20, 60]`). Exempt: calibration, pause, disconnected, host mode Off. Lights-only mode: accents use light variants only.

**C5. No drum moves during play.** Drums are board state (glyph faces and seal windows carry game meaning; positions are tracked in software only; moves take ~1.1 s/quarter turn, are noisy, cannot be stopped, and need calibration). Story cues use `drums: none`. A drum move is allowed only when the base game's rules would move one, scripted at a quiet beat (not during speech/choice), with lights only after the move + 300–500 ms (E13), and never `random-rotate`. Players must not turn drums by hand during a tracked session. `rotation*` light sequences are fine as light effects (no movement) but need calibration; skip if uncalibrated.

**C6. Calibration and connection.** During calibration send nothing; cues → fallback, logged `rejected/fallback` (PRD-6, AT-13). After reconnect, drum-dependent and `rotation*` effects are disabled until recalibration. Low battery (threshold TBD) → warn host; consider Lights-only mode.

**C7. Accessibility.**
- Every tower effect has a screen half; nothing important is tower-only (deaf/HoH, or tower out of view).
- Flash safety: `angryStrobe*`, rapid `flicker` and bell flashes stay under 3 flashes/s and total ≤5 s; host toggle "Reduce flashing" swaps strobes for `breatheFast` and FX-12 to `breathe`.
- Volume: tower volume tier (0–2) is a host setting; mute = 3. Mac fallback audio has its own slider.
- Captions: the board shows short captions for meaningful tower sounds ("The tower growls").
- Host mode Full / Lights only / Off is respected by every effect, logged for determinism (AT-15).
- Startle: T3 effects preceded by a ≥1 s build (dim or rising light) where the story allows.

**C8. Determinism.** Accent picks and intervals seeded; tier chosen from story state, not random; host mode changes logged.

---

## (d) Funeral cue-sheet mapping

| Cue id | Moments | Effect | Tier | Notes |
|---|---|---|---|---|
| `heartbeat` | `.investigate`, `.lid-choice`, `.04`, `.04~holy-symbol` | FX-10 | T2 (T3 at `.04`) | Logged reason `choice` for investigate/lid-choice (R5-2) |
| `dim-all` | `.04`, `.04~holy-symbol` | FX-11 | T2 | Run before heartbeat at `.04`: dim 1.5 s → heartbeat T3 |
| `seal-sequence` | `.investigate.follow-the-mourner.cue` | FX-18 | T2 | sealReveal + #112 in one packet; **not** `seals.break` |
| `skull-drop` | `.07~fight-lost` | FX-20 | one | Watched + lost only. Nailed + lost does not fire (AT-7). Player step; cap 2/night; capped/converted not fired |
| (proposed) bed | dusk / night phases | FX-01 / FX-02 | | Matches `amb.dusk-breathe`, `amb.wake-flicker` |
| (proposed) battle | `.06`, `.06~no-tomas` | FX-23/25/26 | | Tomas has an Ally voice (#15); see sound inventory |
| (proposed) self-test | setup | FX-U1 | | Matches R3-10 order |

---

## (e) Open questions

Settled, so it is not a question: the cue sheet is `apps/burgomaster-funeral-poc/assets/cues/cue-sheet.json` (PRD-40, funeral spec D3). The seal moment in that file is `n2-burgomasters-funeral.investigate.follow-the-mourner.cue`. Funeral PRD OQ-5 is the resolved wren line on `.07~fight-lost` (R3-12). OQ-6 is whether a skull drop advances the clock. Neither decides where these effect names live.

1. Sound lengths: none are documented (data has name/category only). `pnpm timing` in `apps/tower-poc` records overlap, a skull drop and the light sequences under `docs/timing-results/`; it does not yet time all 113 sounds. No result file is in the tree. Lengths stay "?" until that pass.
2. Overlap: does a new sound cut off the current one or layer? Does a light command cut a sound? The timing page is the place to record it.
3. Built-in sequence durations (twinkle, victory, gloat…) and whether a sequence's lights end by themselves or hold. Same timing page; `rotation*` lights stay on until the next command (D23).
4. Volume 0/1/2 loudness (GAP-HW-003).
5. Skull drop: does the tower firmware play its own sound/lights on a drop under app control? The timing page has a skull-drop step for this. Nothing is saved yet.
6. `rotationDrumMiddle` still held (GAP-HW-007); fine to ignore for story use.
7. `set-led` layer index map (which layer is doorway/ledge/base?).
8. Does the tower accept light writes faster than the executor's 250 ms lane? Bell-toll does not need that (its gap is 300 ms). `lighting.flash` on the timing page is the unverified probe, and story effects do not use it. No result is saved yet.
9. Does the 8 s "bed breath" watchdog satisfy AT-26, or does Gamewright want a perceptible change each time?
10. Is any Dracula moment allowed to move a drum (night-5 assault)? Proposed default: no.
11. Will the no-answer stall (30 s) be fixed upstream or worked around in the executor (send-without-wait for diffed lights)? It is the biggest risk to tight cue timing.
12. Bell: commission a Mac bell, or accept a tower sound stand-in (none is a bell)?
13. Low-battery threshold to warn, given GAP-HW-011.
