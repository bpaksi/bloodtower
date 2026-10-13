# UltimateDarkTower 7.1.2: public surface and what it means for us

Written for tower-poc M1 step 2, on 2026-10-13. It compares the library as installed with the surface listed in `apps/tower-poc/spec.md` §4, and records what the library's own documents say that changes our plans.

## Sources

| What | Where | How it was read |
|---|---|---|
| Installed types | `ultimatedarktower@7.1.2`, `dist/src/UltimateDarkTower.d.ts`, `udtConstants.d.ts`, `index.d.ts` | Read in full |
| Installed code | `dist/src/udtTowerCommands.js` | Read for the retry and calibration-guard logic only |
| Library documents | `packages/core/docs/` in `github.com/ChessMess/UltimateDarkTower` at tag `ultimatedarktower@7.1.2` | `api/commands.md`, `api/connection.md`, `api/adapters.md`, `api/events.md`, `api/diagnostics.md` in full; `api/state.md` to line 110; `TOWER_TECH_NOTES.md` headings and the noble section; `BLE_DIAGNOSTICS.md` headings only |
| Data package | `ultimatedarktowerdata@3.0.0` | Loaded in Node and counted |

The npm package does not contain the documents; it ships `README.md` and `CHANGELOG.md` only. `API_REFERENCE.md` at this tag is a 19-line index that points to the `api/` pages.

Nothing here was checked against a real tower. Statements about tower behaviour are the library authors' claims until the step 5 spike.

## The public surface

Everything public on an `UltimateDarkTower` instance at 7.1.2, from the type file: 73 members, made up of 46 methods, 7 callback properties, 16 accessors and 4 public fields. (An earlier version of this note said 53 methods; that was a miscount, found in review.) **New** means it is not in the spec §4 table.

### Methods (46)

| Group | Methods |
|---|---|
| Connection | `connect`, `disconnect`, `cleanup`, `isConnectedAndResponsive`, `getConnectionStatus`, `getDeviceInformation`, `setConnectionMonitoring`, **`configureConnectionMonitoring`** (new), **`configureBatteryHeartbeatMonitoring`** (new) |
| Calibration | `calibrate` |
| Lighting | `Lights`, `lights` (alias), `allLightsOn`, `allLightsOff`, `lightOverrides`, **`setLED`** (new) |
| Sound | `playSound`, **`playSoundStateful`** (new) |
| Mechanics | `Rotate`, `rotateWithState`, `randomRotateLevels`, `getCurrentDrumPosition`, **`rotateDrumStateful`** (new) |
| Glyphs | `getGlyphPosition`, `getAllGlyphPositions`, `getGlyphsFacingDirection` |
| Seals | `breakSeal`, `isSealBroken`, `getBrokenSeals`, `markSealBroken`, `markSealRestored`, `resetBrokenSeals`, `getRandomUnbrokenSeal` |
| Skulls | `resetTowerSkullCount` |
| Battery | `milliVoltsToPercentage` |
| State | `getCurrentTowerState` |
| Diagnostics | `getDiagnosticsRecorder`, `setDiagnosticsEnabled`, `isDiagnosticsEnabled`, `getLastIncident`, `exportDiagnosticsJSON`, `setLoggerOutputs`, `commandToPacketString` |
| Raw | `sendTowerCommandDirect`, `sendTowerCommand`, `sendTowerState` |

### Callback properties (7)

`onTowerConnect`, `onTowerDisconnect`, `onCalibrationComplete`, `onSkullDrop`, `onBatteryLevelNotify`, `onTowerStateUpdate`, `onTowerResponse`. All are in the spec.

### Other properties (all new to the spec)

| Property | Kind | Note |
|---|---|---|
| `isConnected`, `isCalibrated` | read-only | Synchronous status |
| `performingCalibration`, `performingLongCommand` | read-only | True during long physical operations |
| `towerSkullDropCount` | read-only | Firmware-tracked count |
| `currentBattery`, `previousBattery`, `currentBatteryPercent`, `previousBatteryPercent` | read-only | Millivolts and percent |
| `currentBatteryValue`, `previousBatteryValue`, `currentBatteryPercentage`, `previousBatteryPercentage` | public fields | The same four values, exposed as plain fields |
| `retrySendCommandMax` | read/write | See "Automatic retry" below |
| `logDetail`, `logTowerResponses`, `logTowerResponseConfig` | read/write | Logging only |
| `batteryLogFrequency`, `batteryLogOnChangeOnly`, `batteryLogEnabled` | read/write | Logging only; `onBatteryLevelNotify` always fires |

The coverage test in step 4 has to account for these as well as the methods. `Object.getOwnPropertyNames(UltimateDarkTower.prototype)` returns the methods and the accessors, including private ones (TypeScript `private` is not private at runtime), so the test needs an explicit list of internals to skip, taken from the `private` lines of the type file.

## Findings that change our plans

### 1. Automatic retry is on by default (safety)

`DEFAULT_RETRY_SEND_COMMAND_MAX` is 5. When a write to the tower throws and the connection still looks up, `sendTowerCommandDirect` waits 250 ms × attempt and sends the same packet again, up to five times (`udtTowerCommands.js`, lines 57–85).

Our rule is that nothing physical is retried automatically (`CLAUDE.md`, tower safety; spec §6, "Command timeout … no retry"). The retry is of a write that failed, not of a command that timed out, so in most cases the first packet never arrived. That is still an automatic re-send of a physical command, and we cannot prove the first one did not arrive.

The counter is shared and resets on any success, so the limit is five consecutive failures, not five per command. The 30-second queue timeout is separate: it rejects the command and moves on with no retry.

**Decided by Bob, 2026-10-13 (spec D21):** the service sets `tower.retrySendCommandMax = 0` straight after constructing the tower, and a test asserts it. The setter pushes the value through to the command layer, so setting it after construction works.

### 2. A command sent during calibration is dropped and still resolves

While `performingCalibration` is true, every other command "resolves immediately without sending anything" and logs a warning. A caller that only awaits the promise sees success.

The same guard is on the public `sendTowerCommandDirect`. Two more calls resolve without doing anything: `calibrate()` while a calibration is already running, and `playSound` with an index outside the catalog, which logs an error and returns. For the sound index, our own validation in the inventory is the only guard.

**Decided by Bob, 2026-10-13 (spec D22):** the executor checks `performingCalibration` before calling the library and reports such a command as rejected, not as succeeded. With diagnostics on, the library also records a `cmd_ignored_calibration` event.

### 3. "Sound finished" does not exist

`playSound` resolves when the sound starts. There is no completion signal for audio. The Sounds page's "pending lock per command" (spec §5) can only cover the send, not the playback.

### 4. Volume is wider than the spec says

Spec GAP-HW-003 reads "Volume control semantics (firmware 0–3) via `breakSeal(volume)` only". The library also has `playSoundStateful(soundIndex, loop?, volume?)`, and the tower state's `audio.volume` is documented as 0–15. `VOLUME_DESCRIPTIONS` names four levels: 0 Loud, 1 Medium, 2 Quiet, 3 Mute. How 0–15 maps to those four is not stated. The gap stays `unverified` but its title is wrong.

### 5. Calibration requirement: the documents say "always"

`api/commands.md` opens with: "Before any of these will work, you must `connect()` and `calibrate()`". Spec D9 assumes lights and sounds work before calibration and GAP-HW-001 tracks the question. The documents now lean against D9. The step 6 spike test settles it; if the documents are right, D9 changes.

### 6. Tower commands with no public method

`TOWER_COMMANDS` lists six firmware commands: `towerState`, `doorReset`, `unjamDrums`, `resetCounter`, `calibration`, `overwriteDrumStates`. Only `towerState`, `resetCounter` (`resetTowerSkullCount`) and `calibration` have public methods. `doorReset`, `unjamDrums` and `overwriteDrumStates` can only be reached through the raw senders, which have no UI by decision D12. These are three new "library not exposed" gaps. `Drum.jammed` is reported in tower state, so a jam can be shown even though it cannot be cleared.

### 7. The tower state reports more than we planned to show

`TowerState` has, per drum, `jammed`, `calibrated` and `position`; a `beam` with `count` and `fault`; `audio` with `sample`, `loop` and `volume`; and 24 lights with `effect` and `loop`. Seals are not in it: "the tower firmware does not track which seals are broken", which confirms GAP-HW-002. Glyph positions are computed by the library from calibration plus the rotations it has sent, so they are application-maintained too.

### 8. The mock adapter is not in the package

The documents show `MockBluetoothAdapter` imported from `ultimatedarktower/tests/mocks/…` and then say it "isn't part of the published package". Mock mode (spec §5, Settings) needs our own implementation of `IBluetoothAdapter`, which has ten methods. `BluetoothPlatform.NONE` gives a no-op adapter that throws on `connect()`; it is not a mock.

### 9. Catalogs come from the data package, not the library

The documents import `TOWER_AUDIO_LIBRARY`, `TOWER_LIGHT_SEQUENCES` and `GLYPHS` from `ultimatedarktower`. At 7.1.2 the library's entry file does not export them; `ultimatedarktowerdata` does. Measured there:

| Catalog | Count | Detail |
|---|---|---|
| `TOWER_AUDIO_LIBRARY` | 113 | `value` runs 1–113 with no gaps or repeats; 12 categories |
| `TOWER_LIGHT_SEQUENCES` | 21 | `twinkle` = 1 … (for `lightOverrides`) |
| `GLYPHS` | 5 | cleanse, quest, battle, banner, reinforce, each with a home level and side |
| `LIGHT_EFFECTS` (library) | 6 | off 0, on 1, breathe 2, breatheFast 3, breathe50percent 4, flicker 5 |

The inventory's parameter schemas should take their ranges from these at import time, so a data update shows up as a test change and not as a silent drift.

### 10. Types are looser than the values

`LIGHT_EFFECTS` is typed `Record<string, number>` and a light's `style` is typed `string`. `setLED`, `allLightsOn`, `lightOverrides` and `randomRotateLevels` take plain `number`. The library will not reject a bad value at the type level, so our Zod schemas are the only validation before a command reaches the tower. Ranges from the documents: `setLED` layer 0–5 and light 0–3; `rotateDrumStateful` drum 0–2 and position 0–3; `randomRotateLevels` level 0–6.

### 11. Raw bytes

Outbound raw senders (`sendTowerCommand`, `sendTowerCommandDirect`, `sendTowerState`) stay without UI (D12). `onTowerResponse` hands over the raw inbound bytes of every non-battery notification. Inbound bytes are diagnostics data and do not conflict with the rule that no message type carries raw bytes *to* the tower, but the protocol test in spec §8 should say "to the tower" so the diagnostics view can show hex.

### 12. Notes for the spike

- Battery notifications arrive about every 200 ms, so the 60-second watch in the spike will log roughly 300 of them.
- The library names five disconnect-detection paths and seven causes: `adapter_event`, `gatt_health_check`, `heartbeat_timeout`, `response_timeout`, `bt_unavailable`, `user_initiated`, `page_unload`.
- macOS and noble: discovering services a second time after subscribing makes notifications go silent with no error. The library's `NodeBluetoothAdapter` avoids this by discovering everything once. An adapter that wraps it (our `InstrumentedAdapter`) must not add its own discovery calls.
- The rate advice is 300–500 ms between commands that move drums or play long audio.
- `connect()` in Node scans for the device name `ReturnToDarkTower`; there is no picker.

## What this does to the spec

Changes proposed for `apps/tower-poc/spec.md`, to be made when the inventory lands in step 3 so the table and the code change together:

1. §4 table: add `setLED`, `playSoundStateful`, `rotateDrumStateful`, `configureConnectionMonitoring`, `configureBatteryHeartbeatMonitoring`, and a row for the read-only status and battery properties.
2. §7: reword GAP-HW-003; add gaps for `doorReset`, `unjamDrums` and `overwriteDrumStates`; add a gap for "no audio completion signal"; note that the documents lean against D9 under GAP-HW-001.
3. Decision log: the retry setting (finding 1) and the calibration guard (finding 2). Done as D21 and D22 in spec 1.4.
4. §8: "no message type can carry raw bytes to the tower".

## Not checked

- `GETTING_STARTED.md`, `ARCHITECTURE.md`, `EXAMPLES.md`, `TROUBLESHOOTING.md`, `api/logging.md`, and the second half of `api/state.md` were not read.
- `BLE_DIAGNOSTICS.md` and most of `TOWER_TECH_NOTES.md` (the packet layout) were read by heading only. They matter for step 7, the observability assessment.
- The `NodeBluetoothAdapter` source was not read.
- No library code was executed apart from loading the data package and the constants file. `@stoprocent/noble` was never loaded.
