# Setup slice: what the tower knows after calibrate, 2026-10-21

Desk research for the bloodtower "setup through first turn" slice, tower part AREA-056 (with SCR-005, MEC-017, MEC-018, IDEA-025). It answers Q-033 and Q-032 as far as desk research can, lists what the app can sense, and proposes two short hardware chunks that settle the rest. No tower was used and no code changed.

**Status legend** (as in [asset-catalog.md](../game-design/asset-catalog.md)): **Verified** = seen on Bob's tower in a spike or verify pass. **Library** = read in the `ultimatedarktower@7.1.2` / `ultimatedarktowerdata@3.0.0` code as installed, not checked on the tower. **Rules** = from the RtDT rule and component research. **Unknown** = nothing in the repo answers it.

Library paths are relative to `node_modules/.pnpm/ultimatedarktower@7.1.2_@stoprocent+noble@2.8.0/node_modules/ultimatedarktower/dist/src/` (written `lib/`) and `node_modules/.pnpm/ultimatedarktowerdata@3.0.0/node_modules/ultimatedarktowerdata/dist/` (written `data/`). Line numbers are for the CommonJS build.

## Short answers

- **Q-033.** The library's glyph map is a fixed table copied in when calibration ends. It assumes every drum is at "north" afterwards and does not read the drum positions the tower reports. The tower does report all three drums at north after every calibration seen so far (Verified, 4 calibrations). Whether the table matches the real drums, and whether the library's "north" light is on the same side as the drums' "north", has never been looked at. **Unknown, likely but unproven.** Chunk A settles it in one sitting.
- **Q-032.** No research note, rule source or log says how often a skull stays inside. Rules only say a skull "may be held inside or tumble out". The tower counts a drop when the skull passes the sensor at the top, so the count rises whether the skull comes out or not. **Unknown; hardware only.** Chunk B measures it.
- **Orientation** (which tower side faces which kingdom) cannot be sensed at all. It has to be a player's answer (MEC-017).

## 1. Q-033: calibration, drums and glyphs

### What calibration does

| Claim | Status | Source |
|---|---|---|
| `calibrate()` sends one byte, `04`, and nothing else. It sets `performingCalibration` before sending | Library | `lib/udtTowerCommands.js:92-114` |
| While calibrating, every other queued command is dropped, not queued | Library; Verified (D22) | `lib/udtTowerCommands.js:30-37` |
| All three drums spin and stop; takes 20.6 to 22.4 s | Verified | [spike](spikes/2026-10-13-noble-macos.md), runs 2 and 3, finding 12 |
| The tower answers with a 20-byte state whose drum bytes are `10 42` | Verified (spike runs 2 and 3; M3 verify pass line 481) | spike finding 6; [M3 verify](smoke/2026-10-15-m3-verify-pass.md) finding 3 |
| `10 42` decodes to: all three drums `calibrated`, all three `position` 0 = north, none `jammed` | Library decode of Verified bytes | `lib/udtTowerState.js:84-99`; `lib/udtConstants.js:73-78` (`TOWER_SIDES` = north, east, south, west) |
| "Calibration complete" is the first state message of any kind that arrives while `performingCalibration` is true. The library does not check the calibrated bits and does not use the `CALIBRATION_FINISHED` (8) message | Library | `lib/udtBleConnection.js:243-259`; `lib/udtTowerResponse.js:97-99` |
| How the firmware finds "home" is not documented. The `06` messages carry one sensor reading per drum plus the IR beam, which suggests an optical home sensor on each drum | Library (comment only) | `lib/udtHelpers.js:120-160` |
| Calibration is lost on every reconnect in tower-poc (D10) | Verified (design) | [tower-effects-library.md](../game-design/tower-effects-library.md) A3 |

Risk for the slice: a skull dropped during calibration sends a state message, and by the code above the library would call calibration complete early and stamp the glyph table while drums are still spinning. Not seen; not tested. The setup screen should tell players not to drop skulls while the tower wakes.

### What the library knows about glyphs

The whole glyph map is this table, `data/constants.js:8-15`, commented "positions based on calibrated drum orientation":

| Glyph | Drum | Side at calibration |
|---|---|---|
| Cleanse | top | north |
| Quest | top | south |
| Battle | middle | north |
| Banner | bottom | north |
| Reinforce | bottom | south |

| Claim | Status | Source |
|---|---|---|
| Before calibration every glyph position is `null` | Library | `lib/UltimateDarkTower.js:61-68` |
| On calibration complete the library copies the table in as-is. It ignores the drum positions in the tower's state | Library | `lib/UltimateDarkTower.js:227-230`, `643-648` |
| After that, positions move only by the rotations the library itself sends: each rotate works out the quarter turns from old to new drum position and shifts that drum's glyphs clockwise | Library | `lib/UltimateDarkTower.js:410-420`, `461-499`, `610-630`, `685-720` |
| The "old" drum position comes from the library's copy of the tower state; with no state it says north | Library | `lib/udtTowerCommands.js:493-503` |
| A drum turned by hand, a jam, or a rotate the tower ignored is invisible to the glyph map | Library; noted in [tower-effects-library.md](../game-design/tower-effects-library.md) A3 | — |
| The middle drum has one glyph; east and west faces of every drum and the south face of the middle drum have none in the table. What is there physically (blank, a skull path, a window) is not recorded | Unknown | — |
| There are 12 seals, one per drum level and side, so each seal window sits in front of one drum face | Library (`SealIdentifier` is level + side); Rules: 12 seals | [component-inventory.md](../return-to-dark-tower/component-inventory.md) line 16 |
| Glyphs are hidden until their seal comes off | Rules | [game-overview-and-rules.md](../return-to-dark-tower/game-overview-and-rules.md) line 64 |

### Lights that can mark a spot

| Claim | Status | Source |
|---|---|---|
| `setLED(layer, light, effect)`: layers 0-2 are the top, middle and bottom rings, light 0-3 is north, east, south, west | Library | `lib/udtConstants.js:140-155`, `lib/UltimateDarkTower.js:440-442` |
| Ledge and base layers (3-5) use the corners NE, SE, SW, NW, not the sides | Library | `lib/udtConstants.js:156-161` |
| The ring light index goes through a channel table (`0, 3, 2, 1` for the top ring, `7, 6, 5, 4` for the middle, `10, 9, 8, 11` for the bottom), so "light 0 is north" depends on that table being right | Library | `lib/udtConstants.js:164-177` |
| Whether ring light "north" is on the same side as drum position "north" | Unknown | Chunk A, step 3 |
| `breakSeal(seal)` plays the same seal-reveal show for every seal; it does not light the named seal | Library | `lib/udtTowerCommands.js:383-397` |
| The official app lights the base on the seal's side and a light behind the seal | Rules | [component-inventory.md](../return-to-dark-tower/component-inventory.md) line 156 |

So to point at one seal window, bloodtower should use `setLED` on that ring light, not `breakSeal`.

### Orientation

Nothing on the tower or in the library knows which kingdom a side faces. The base game only says the tower goes in the middle of the board (Rules, [game-overview-and-rules.md](../return-to-dark-tower/game-overview-and-rules.md) line 24); players read "glyph facing your kingdom" by eye. Whether the board or tower base has a keyed footprint that fixes the tower's turn is **Unknown**. MEC-017 (light one side, a player taps the kingdom) is the only way in the repo.

### What Q-033's answer would change

- If chunk A finds the table right and the ring lights line up: setup lights one window per glyph and asks yes/no (5 checks, or 3 if only one glyph per drum is checked).
- If the table is right but rotated by a fixed amount: same check, with a fixed offset in bloodtower's own map.
- If it differs between calibrations: the glyph step is a search every game, as IDEA-025 proposes.

## 2. Q-032: skulls staying inside with no seals

| Claim | Status | Source |
|---|---|---|
| A dropped skull "may be held inside or tumble out of an opening into one of the four kingdoms" | Rules | [component-inventory.md](../return-to-dark-tower/component-inventory.md) line 154 |
| The drums re-route where skulls fall | Rules | same, line 155 |
| The sensor is an IR beam near the top; each break raises the firmware count, sent as byte 17 of an unprompted state | Verified (2 drops, spike finding 11); Library (`lib/udtBleConnection.js:243-271`, `lib/udtConstants.js:63`, `lib/udtTowerState.js:154-155`) |
| The count says a skull went in. It says nothing about whether it came out, which side, or how many trapped skulls fell with it | Library (nothing else is reported) | `lib/udtTowerState.js:84-162` holds no other skull field |
| How often a skull is held, with or without seals | Unknown | No source in `research/` |
| Whether seals change the rate (do seals block exits, or only cover glyph windows?) | Unknown | IDEA-024 is Bob's expectation, not a test |
| `beam.fault` exists in the state; what sets it is not documented | Library | `lib/udtTowerState.js:155` |

Nothing in the two spikes recorded where the two dropped skulls went.

## 3. MEC-018: sensed vs. confirmed

| Fact | Sensed by the app? | How | Status |
|---|---|---|---|
| Connected or not | Yes | connection events | Verified |
| Calibrated, per drum | Yes | `calibrated` bits in state | Verified |
| Drum position, per drum | **Reported, not sensed.** The tower echoes the position it was told or homed to; a hand-turned drum is not seen | `position` bits | Verified (top drum only after rotates); Library for the rest |
| Drum jammed | Reported | `jammed` bits | Library; never seen set |
| A skull went in, and the running count | Yes | IR beam count | Verified |
| Where a skull came out, or that it stayed in | **No** | players | — |
| Battery level | Yes, roughly | `07` messages, mV; sags under motors | Verified |
| Lights and sound the tower is showing | Reported (echo) | state | Verified |
| Glyph facing | **No.** Computed from the table plus sent rotations | — | Library |
| Which side faces which kingdom | **No** | players (MEC-017) | — |
| Which seals are on or off | **No.** Firmware does not track seals | players | Library + Verified (GAP-HW-002) |
| Skulls on each building, mini positions | **No** | players | — |
| Tower physically turned on the board since setup | **No** | players | — |

Ask players at setup: orientation; glyph check (yes/no or name, per Q-033); seals off or on; that the drums are clear of skulls before the first drop (a skull left inside from an earlier game will fall later and land unrecorded). At resume after a reconnect: calibrate again on a press, then orientation (if the tower may have been moved), seals, and skulls per building.

## 4. Hardware chunks for Bob

Both use tower-poc from `main` (`pnpm build && pnpm start` in `apps/tower-poc`, port 4747). Every step is one press. Nothing calibrates, reconnects or retries on its own. If a command ends "Sent, no answer", write it down and go on; do not press it again in the same step.

### Chunk A: glyphs after calibrate (Q-033), about 12 minutes

Before: take all 12 seals off. Put a sticky note on the side of the tower base you will call "front".

1. Connect (Connection page). Record: connected.
2. Calibrate (press once). Wait for "calibrated". Record: time taken; Tower state shows all three drums north (`10 42`).
3. Lights page, Set one LED: layer 0 (top ring), light 0 (north), effect on. Record which side lit, relative to the front note. Turn it off. Repeat for light 1 (east). That fixes the library's north and its turning direction.
4. For each of the 12 windows (top, middle, bottom × N, E, S, W): Set one LED on that ring light; record the glyph seen in the lit window, or "blank"; turn it off. 12 presses on, 12 off; or read all 12 by eye once step 3 has fixed north and skip the lights.
5. Glyphs page: read all glyph positions. Record them beside step 4.
6. Mechanics page, Rotate one drum: top drum to east (playSound off). Record which way it turned (clockwise from above?) and where Cleanse and Quest are now, against Glyphs page.
7. Disconnect. Switch the tower off and on. Connect, calibrate again (one press each). Repeat step 4 by eye only. Record: same as the first calibration, yes or no.

Answers Q-033 if steps 4 and 5 agree and step 7 matches. Also answers: ring light north = drum north; the clockwise direction the library assumes; what the unlisted faces are.

tower-poc support: all present (`connection.connect`, `calibration.calibrate`, `lighting.set-led`, `glyphs.all-positions`, `mechanics.rotate-drum`, `state.current`). `lighting.set-led` is only mock-tested; this is its first hardware run. Missing: a place to type free-text observations per step; use paper or a copy of the tables below.

### Chunk B: skulls with no seals (Q-032), about 15 minutes

Before: all seals off, the tower on the board or a tray with four marked sides, 20 skulls. Chunk A's step 3 tells you which side is north.

1. Connect, calibrate (one press each; skip if chunk A has just run and nothing was switched off).
2. Tower state page: note the skull count, then press "Reset skull count" (app record) once.
3. With the drums at N/N/N, drop 5 skulls one at a time, waiting until each has settled. For each, record: the count went up (yes/no), the side it came out (N/E/S/W), or "held".
4. Rotate one drum (playSound off): middle drum to east. Drop 5 more and record as in step 3. Note whether earlier held skulls fell out on the move.
5. Rotate to a third setting, e.g. top south, bottom west. Drop 5 more and record.
6. Rotate to a fourth setting of your choice, drop the last 5 and record.
7. Turn the tower upside down over a tray (power off first) and count the skulls still inside.

Record per drop: drum positions (from the Tower state page), count rose (y/n), result (N/E/S/W/held). Answers: held rate overall and per drum setting, whether every drop is counted, and whether a drum move releases held skulls. Twenty drops gives a rough rate only; say so when deciding.

tower-poc support: present (`skulls.count`, `skulls.on-drop`, `skulls.reset-record`, `mechanics.rotate-drum`, `state.current`). `skulls.count` and `skulls.on-drop` are untested on the tower in tower-poc; the spike saw the count rise. Missing: nothing needed; a per-drop log line in the UI would save writing the count down.

### Record sheet

| Window | N | E | S | W |
|---|---|---|---|---|
| Top | | | | |
| Middle | | | | |
| Bottom | | | | |

| Drop | Drums T/M/B | Count rose | Came out |
|---|---|---|---|
| 1 | N/N/N | | |

## Not checked

- No tower was used. Every Unknown above stays Unknown until chunks A and B run.
- The ESM build (`dist/esm/index.mjs`) was not compared line by line with the CommonJS build; tower-poc runs the ESM build, so line numbers there differ.
- `beam.fault`, the `06` drum readings and the unused firmware commands (`doorReset`, `unjamDrums`, `overwriteDrumStates`) were not decoded.
- The official rulebook PDF was not reread for skull-retention or tower-orientation wording; only the repo's notes were.
