# Capabilities

<!-- GENERATED FILE. Do not edit by hand. -->

This file is generated from `apps/tower-poc/src/protocols/inventory.ts` by `pnpm inventory:doc` (run from `apps/tower-poc/`). Do not edit it by hand: change the inventory and regenerate. A test fails when this file is out of date.

## Versions

- Library: ultimatedarktower 7.1.2
- Data: ultimatedarktowerdata 3.0.0 (113 sounds)

## Counts

52 entries and 17 exclusions.

By category:

- connection: 11
- calibration: 4
- lighting: 5
- sound: 2
- mechanics: 9
- glyphs: 3
- seals: 7
- skulls: 3
- battery: 3
- state: 3
- diagnostics: 2

By kind:

- command: 22
- lifecycle: 3
- query: 13
- event: 7
- property: 7

By availability:

- available: 38
- requires-calibration: 7
- not-exposed: 4
- unsupported: 3

## Entries

### connection

| Id | Title | Kind | Availability | Library member | Parameters | UI page | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `connection.connect` | Connect | lifecycle | available | `connect` | `none` | dashboard | untested |
| `connection.disconnect` | Disconnect | lifecycle | available | `disconnect` | `none` | dashboard | untested |
| `connection.connected` | Connected | property | available | `isConnected` | `none` | dashboard | untested |
| `connection.responsive` | Connected and responsive | query | available | `isConnectedAndResponsive` | `none` | dashboard | untested |
| `connection.status` | Connection status | query | available | `getConnectionStatus` | `none` | dashboard | untested |
| `connection.device-information` | Device information | query | available | `getDeviceInformation` | `none` | dashboard | untested |
| `connection.on-connect` | Tower connected | event | available | `onTowerConnect` | `none` | dashboard | untested |
| `connection.on-disconnect` | Tower disconnected | event | available | `onTowerDisconnect` | `none` | dashboard | untested |
| `connection.set-monitoring` | Turn connection monitoring on or off | command | not-exposed | `setConnectionMonitoring` | `enabled: boolean` | none | untested |
| `connection.configure-monitoring` | Configure connection monitoring | command | not-exposed | `configureConnectionMonitoring` | `frequency?: int 500..60000; timeout?: int 1000..120000` | none | untested |
| `connection.configure-battery-heartbeat` | Configure battery heartbeat monitoring | command | not-exposed | `configureBatteryHeartbeatMonitoring` | `enabled?: boolean; timeout?: int 1000..60000; verifyConnection?: boolean` | none | untested |

### calibration

| Id | Title | Kind | Availability | Library member | Parameters | UI page | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `calibration.calibrate` | Calibrate | lifecycle | available | `calibrate` | `none` | dashboard | untested |
| `calibration.on-complete` | Calibration complete | event | available | `onCalibrationComplete` | `none` | dashboard | untested |
| `calibration.calibrated` | Calibrated | property | available | `isCalibrated` | `none` | dashboard | untested |
| `calibration.in-progress` | Calibration in progress | property | available | `performingCalibration` | `none` | dashboard | untested |

### lighting

| Id | Title | Kind | Availability | Library member | Parameters | UI page | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `lighting.set` | Set lights | command | available | `lights`, `Lights` | `doorway?: list (1..12 items) of { position: one of north, east, south, west; level: one of top, middle, bottom; style: one of off, on, breathe, breatheFast, breathe50percent, flicker }; ledge?: list (1..4 items) of { position: one of northeast, southeast, southwest, northwest; style: one of off, on, breathe, breatheFast, breathe50percent, flicker }; base?: list (1..8 items) of { position: { side: one of north, east, south, west; level: one of top, bottom }; style: one of off, on, breathe, breatheFast, breathe50percent, flicker }` | lights | untested |
| `lighting.all-on` | All lights on | command | available | `allLightsOn` | `effect?: one of off, on, breathe, breatheFast, breathe50percent, flicker` | lights | untested |
| `lighting.all-off` | All lights off | command | available | `allLightsOff` | `none` | lights | untested |
| `lighting.sequence` | Play a light sequence | command | available | `lightOverrides` | `sequence: one of twinkle, flareThenFade, flareThenFadeBase, flareThenFlicker, angryStrobe01, angryStrobe02, angryStrobe03, gloat01, gloat02, gloat03, defeat, victory, dungeonIdle, sealReveal, monthStarted, wholeTowerBreathing, slowFlareThenFade; soundIndex?: int 1..113` | lights | untested |
| `lighting.set-led` | Set one LED | command | available | `setLED` | `layerIndex: int 0..5; lightIndex: int 0..3; effect: one of off, on, breathe, breatheFast, breathe50percent, flicker; loop?: boolean` | lights | untested |

### sound

| Id | Title | Kind | Availability | Library member | Parameters | UI page | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `sound.play` | Play a sound | command | available | `playSound` | `soundIndex: int 1..113` | sounds | untested |
| `sound.play-stateful` | Play a sound with volume | command | available | `playSoundStateful` | `soundIndex: int 1..113; volume?: int 0..3` | sounds | untested |

### mechanics

| Id | Title | Kind | Availability | Library member | Parameters | UI page | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mechanics.rotate` | Rotate drums | command | not-exposed | `Rotate` | `top: one of north, east, south, west; middle: one of north, east, south, west; bottom: one of north, east, south, west; soundIndex?: int 1..113` | none | untested |
| `mechanics.rotate-with-state` | Rotate drums, keeping lights | command | requires-calibration | `rotateWithState` | `top: one of north, east, south, west; middle: one of north, east, south, west; bottom: one of north, east, south, west; soundIndex?: int 1..113` | mechanics | untested |
| `mechanics.rotate-drum` | Rotate one drum | command | requires-calibration | `rotateDrumStateful` | `drumIndex: int 0..2; position: int 0..3; playSound?: boolean` | mechanics | untested |
| `mechanics.random-rotate` | Rotate drums at random | command | requires-calibration | `randomRotateLevels` | `drums: one of all, top, middle, bottom, top-middle, top-bottom, middle-bottom` | mechanics | untested |
| `mechanics.drum-position` | Drum position | query | requires-calibration | `getCurrentDrumPosition` | `level: one of top, middle, bottom` | mechanics | untested |
| `mechanics.long-command-in-progress` | Long command in progress | property | available | `performingLongCommand` | `none` | mechanics | untested |
| `mechanics.unjam-drums` | Unjam drums | command | unsupported | none | `none` | none | untested |
| `mechanics.door-reset` | Door reset | command | unsupported | none | `none` | none | untested |
| `mechanics.overwrite-drum-states` | Overwrite drum states | command | unsupported | none | `none` | none | untested |

### glyphs

| Id | Title | Kind | Availability | Library member | Parameters | UI page | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `glyphs.position` | Glyph position | query | requires-calibration | `getGlyphPosition` | `glyph: one of cleanse, quest, battle, banner, reinforce` | tower-state | untested |
| `glyphs.all-positions` | All glyph positions | query | requires-calibration | `getAllGlyphPositions` | `none` | tower-state | untested |
| `glyphs.facing` | Glyphs facing a side | query | requires-calibration | `getGlyphsFacingDirection` | `direction: one of north, east, south, west` | tower-state | untested |

### seals

| Id | Title | Kind | Availability | Library member | Parameters | UI page | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `seals.break` | Break a seal | command | available | `breakSeal` | `seal: { side: one of north, east, south, west; level: one of top, middle, bottom }` | tower-state | untested |
| `seals.mark-broken` | Mark a seal broken | command | available | `markSealBroken` | `seal: { side: one of north, east, south, west; level: one of top, middle, bottom }` | tower-state | untested |
| `seals.mark-restored` | Mark a seal restored | command | available | `markSealRestored` | `seal: { side: one of north, east, south, west; level: one of top, middle, bottom }` | tower-state | untested |
| `seals.reset` | Clear all broken seals | command | available | `resetBrokenSeals` | `none` | tower-state | untested |
| `seals.is-broken` | Seal broken | query | available | `isSealBroken` | `seal: { side: one of north, east, south, west; level: one of top, middle, bottom }` | tower-state | untested |
| `seals.broken` | Broken seals | query | available | `getBrokenSeals` | `none` | tower-state | untested |
| `seals.random-unbroken` | Pick a random unbroken seal | query | available | `getRandomUnbrokenSeal` | `none` | tower-state | untested |

### skulls

| Id | Title | Kind | Availability | Library member | Parameters | UI page | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `skulls.reset-count` | Reset skull count | command | available | `resetTowerSkullCount` | `none` | tower-state | untested |
| `skulls.on-drop` | Skull dropped | event | available | `onSkullDrop` | `none` | tower-state | untested |
| `skulls.count` | Skull count | property | available | `towerSkullDropCount` | `none` | tower-state | untested |

### battery

| Id | Title | Kind | Availability | Library member | Parameters | UI page | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `battery.on-level` | Battery reading | event | available | `onBatteryLevelNotify` | `none` | tower-state | untested |
| `battery.level` | Battery level | property | available | `currentBattery`, `currentBatteryValue`, `currentBatteryPercent`, `currentBatteryPercentage` | `none` | tower-state | untested |
| `battery.previous-level` | Previous battery level | property | available | `previousBattery`, `previousBatteryValue`, `previousBatteryPercent`, `previousBatteryPercentage` | `none` | tower-state | untested |

### state

| Id | Title | Kind | Availability | Library member | Parameters | UI page | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `state.current` | Tower state | query | available | `getCurrentTowerState` | `none` | tower-state | untested |
| `state.on-update` | Tower state updated | event | available | `onTowerStateUpdate` | `none` | tower-state | untested |
| `state.on-response` | Tower response received | event | available | `onTowerResponse` | `none` | diagnostics | untested |

### diagnostics

| Id | Title | Kind | Availability | Library member | Parameters | UI page | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `diagnostics.last-incident` | Last disconnect incident | query | available | `getLastIncident` | `none` | diagnostics | untested |
| `diagnostics.export` | Export library diagnostics | query | available | `exportDiagnosticsJSON` | `none` | diagnostics | untested |

## Exclusions

Public library members that have no entry, and why.

| Member | Kind | Reason | Gap |
| --- | --- | --- | --- |
| `sendTowerCommandDirect` | raw-bytes | Sends a caller-built packet. No message type may carry raw bytes to the tower (D12). | GAP-LIB-001 |
| `sendTowerCommand` | raw-bytes | Sends a caller-built packet. No message type may carry raw bytes to the tower (D12). | GAP-LIB-002 |
| `sendTowerState` | raw-bytes | Writes a whole caller-built tower state, which can set anything a packet can, with no per-field validation (D12). | GAP-LIB-003 |
| `commandToPacketString` | helper | Formats a packet as hex for debugging. It takes a packet, and the timeline has its own hex view. | none |
| `milliVoltsToPercentage` | helper | Converts millivolts to a percent string. The battery.level entry already carries the percent. | none |
| `cleanup` | service-internal | Final and irreversible: the tower object cannot connect again. The service calls it on shutdown only. | none |
| `getDiagnosticsRecorder` | service-internal | The service reads the recorder to feed the app's own timeline (D16). | none |
| `setDiagnosticsEnabled` | service-internal | The service decides whether the recorder runs, because it feeds the app's timeline (D16). There is no client toggle. | none |
| `isDiagnosticsEnabled` | service-internal | Read by the service only; see setDiagnosticsEnabled. | none |
| `setLoggerOutputs` | service-internal | The service points the library's logger at the app's timeline (D16). | none |
| `retrySendCommandMax` | service-internal | How often the library re-sends a failed write; the default is 5. A safety setting the service owns, never a client control. The service sets it to 0 (spec D21). | none |
| `logDetail` | logging | Verbosity of the library's log. Set by the service from its logging setting. | none |
| `logTowerResponses` | logging | Whether the library logs tower responses. Set by the service. | none |
| `logTowerResponseConfig` | logging | Which tower responses the library logs. Set by the service. | none |
| `batteryLogFrequency` | logging | How often the library logs the battery. The battery event fires regardless of this setting. | none |
| `batteryLogOnChangeOnly` | logging | Whether the library logs the battery only when it changes. | none |
| `batteryLogEnabled` | logging | Whether the library logs the battery at all. | none |
