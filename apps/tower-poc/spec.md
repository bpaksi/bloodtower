# spec.md — Dark Tower Web Controller POC (v1)

| Field | Value |
|---|---|
| Status | **Approved** by Bob, 2026-10-13 |
| Source intent | [intent/0001-dark-tower-web.md](intent/0001-dark-tower-web.md) (original PRD, unchanged) |
| Spec version | 1.8 (2026-10-13). 1.1 adds D19 (folder layout). 1.2 adds D20 (WebSocket origin check). 1.3 brings §4 and §7 in line with the library as installed (M1 steps 2 to 4): the full public surface, the inventory's entry shape and availability values, where the coverage test lives, and four new gaps (GAP-LIB-004 to 007). 1.4 adds D21 (no automatic re-send) and D22 (commands during calibration are rejected). 1.5 applies the inventory review: GAP-HW-003 no longer says `breakSeal` can set volume (the library discards it), and GAP-LIB-007 is typed Unverified. 1.6 applies four cautious holds pending the M1 spike (GAP-HW-006 to 009): `seals.break` requires calibration, the four `rotation*` light sequences are not accepted, `sound.play-stateful` has no `loop`, and the legacy `mechanics.rotate` is not offered. 1.7 adds `rejected` to the command lifecycle in §3.2 and a row for commands during calibration in §6, both following from D22. 1.8 applies the M1 hardware spike and observability assessment (M1 step 8): `seals.break` is available before calibration again, D23 keeps the four `rotation*` sequences held until M2, the statuses of GAP-HW-001, 006, 007, 008, 009 and GAP-DIAG-001 change, and four gaps are added (GAP-HW-010, GAP-LIB-008, GAP-LIB-009, GAP-DIAG-002). GAP-HW-005 is not used; the ids skip from 004 to 006. |
| Library baseline | `ultimatedarktower@7.1.2` (exact pin), `ultimatedarktowerdata@3.0.0` and `@stoprocent/noble@2.8.0` (exact, set in M1 step 1) |

This spec carries the PRD's requirements forward and records every decision made in the 2026-10-13 grilling session. **If the spec and the intent conflict, the spec wins.** All conflicts are listed in §2.

---

## 1. Summary

DarkTowerWeb is a local POC controller and investigation tool for the Return to Dark Tower tower.

- A **Node tower service** running on Bob's Mac owns the Bluetooth connection, through UltimateDarkTower and noble.
- The same service owns the command layer, tower state, diagnostics and local SQLite data.
- Any browser on the LAN (Mac, iPad, phone) is a thin client that talks to the service over a typed **WebSocket API**.

## 2. Changes from the intent (decision log)

| # | Decision | Intent said | Reason |
|---|---|---|---|
| D1 | Build a fresh app that depends on the npm `ultimatedarktower`, using upstream `apps/controller` only as a reference | n/a (upstream controller didn't exist in the PRD's framing) | Bob's stack plus the PRD-specific features (inventory, gap register, command layer) |
| D2 | **The Mac tower service owns the tower.** Browsers use a semantic WebSocket API. | React app with direct Web Bluetooth; server bridge deferred | iPadOS has no Web Bluetooth. It also gives a single source of truth, multi-device access, state that survives page reloads, and no raw byte pipe on the LAN. |
| D3 | Direct in-browser Web Bluetooth is **dropped** and recorded as a gap (GAP-PLAT-001) | Primary path | Avoids two code paths for the POC |
| D4 | pnpm workspace with three parts: `apps/tower-poc/src/server`, `apps/tower-poc/src/web` (Next.js static export), `apps/tower-poc/src/protocols` (layout per D19) | Single React app | — |
| D5 | `pnpm start` runs **one process on one port**: the tower service serves the exported UI plus the WebSocket. `pnpm dev` runs tower-service and `next dev` from one command. | — | BLE connection survives UI hot reloads |
| D6 | **Open on the LAN over HTTP**, no token | HTTPS for LAN | No browser BLE means no secure-context requirement; trusted home network |
| D7 | **All clients may command.** The server serializes commands, and every command records its client ID. | One tab owns the connection | Multi-device use |
| D8 | Mock mode is an **in-memory scripted `IBluetoothAdapter`** in the service, selected by setting/env | Mock adapter (unspecified) | Deterministic tests |
| D9 | Calibration is an **explicit user action**. It gates mechanics (rotation, glyph-dependent ops) only. Lights and sounds are available as soon as the tower is connected. | No automatic physical action | Library requires calibrate before ops, but the PRD forbids auto actions. If hardware shows lights or sounds need calibration, file a gap. |
| D10 | Unexpected disconnect → **manual reconnect** only. Recalibration is required before mechanics. | Same | — |
| D11 | On service startup, if a saved state snapshot exists, the UI **asks whether to restore it**. Restored values have origin `application-maintained` and freshness `stale`. Nothing is sent to the tower. | — | — |
| D12 | `sendTowerCommandDirect`, `sendTowerCommand` and `sendTowerState` get **no UI**. They become gap entries with status `deferred`. | Raw injection out of scope | Satisfies FR-02 coverage without a raw console |
| D13 | Capability inventory is a **typed TS module in the repo**, with a coverage test against the library's public API | — | Single source that drives the UI |
| D14 | Hardware verification results live **in SQLite only**. The UI overlays `hardware-verified` onto the repo inventory at runtime. | — | — |
| D15 | Diagnostics use an **in-memory ring buffer** (default 5,000 events). An opt-in "Save session" writes to SQLite. JSON export is always available. | In-memory, export | Saved sessions can be linked as gap evidence |
| D16 | The library's own diagnostics recorder and logger are **ingested into our timeline** with source `library`. Export embeds the library's `exportDiagnosticsJSON()` output. | — | One timeline |
| D17 | Persistence: **native SQLite** (`better-sqlite3`) with **Drizzle** in the tower service | Browser local storage | The service owns the data |
| D18 | Acceptance environments: **Mac Chrome, iPad Safari, phone browser**, all on the LAN | "documented target environment" | — |
| D19 | All source lives under `apps/tower-poc/src/`: `web`, `server` and `protocols`. Each is its own package (`tower-poc-web`, `tower-poc-server`, `tower-poc-protocols`) with its files at the part root, with no nested `src/`. The folder is `server`; the prose still calls the running process the tower service. Playwright tests are a fourth part, `e2e` (`tower-poc-e2e`). | Spec 1.0 had `service/`, `web/`, `protocol/` directly under the app | Bob's layout choice, 2026-10-13 |
| D20 | The service accepts a `/ws` connection only when its `Origin` is the service's own host and port, or the `next dev` origin in dev mode. A request with another origin is refused. A request with no `Origin` header is accepted: browsers always send one on a WebSocket upgrade, so a missing header means a script or a test, not a web page. This lands in M2, before the `command` message exists. | Not addressed | D6 leaves the LAN open with no token. Without this check, any web page open in a browser on the LAN could connect and, from M2, send tower commands. Devices on the LAN are unaffected, because they load the UI from the service. Raised in the M0 review; Bob's decision, 2026-10-13. |
| D21 | The service turns the library's automatic re-send off: it sets `retrySendCommandMax = 0` straight after constructing the tower, and a test asserts it. | Not addressed | The library re-sends a command whose write failed, up to five times by default. Nothing physical is retried automatically, and a failed write does not prove the first packet never arrived. Found in M1 step 2; Bob's decision, 2026-10-13. |
| D22 | A command that arrives while the tower is calibrating is **rejected**. The executor checks `performingCalibration` before calling the library and ends the command's lifecycle as `rejected` with the reason. | Not addressed | The library drops such a command and still resolves its promise, so without the check the UI would show a command as sent that never was. Found in M1 step 2; Bob's decision, 2026-10-13. |
| D23 | The four `rotation*` light sequences stay **held until M2**: `lighting.sequence` does not accept them (`HELD_LIGHT_SEQUENCES`). They are offered once the service can send a command without waiting for the tower to answer it. | Not addressed | In the M1 spike each one played its lights and moved no drum, but the tower sent no state back, so the library rejected each after 30 seconds; by the library's code it also holds its queue for that time. Exposed as they are, they would work on the tower and be shown as failed (GAP-HW-007, GAP-HW-010). Bob's decision, 2026-10-13. |

## 3. Architecture

```text
 Mac (Apple Silicon, Node ≥ 22.13)                      LAN clients
┌───────────────────────────────────────────────┐     ┌──────────────────┐
│ src/server  (single port, e.g. 4747)          │     │ Mac Chrome       │
│                                               │ ws  │ iPad Safari      │
│  HTTP: serves src/web static export    ◄──────┼─────┤ Phone browser    │
│  WS  : /ws  typed protocol (Zod)              │     └──────────────────┘
│   │                                           │
│   ├─ ClientHub (multi-client, broadcast)      │
│   ├─ CommandExecutor (queue, correlation IDs, │
│   │   timeouts, serialization, lifecycle)     │
│   ├─ TowerSession (UltimateDarkTower 7.1.2)   │
│   │    └─ InstrumentedAdapter (raw tx/rx tap) │
│   │         ├─ NodeBluetoothAdapter (noble)   │──── BLE ──► Tower
│   │         └─ MockTowerAdapter (in-memory)   │
│   ├─ StateStore (origin/freshness metadata)   │
│   ├─ DiagnosticsBus (ring buffer, ingest lib) │
│   └─ Db (better-sqlite3 + Drizzle)            │
└───────────────────────────────────────────────┘
apps/tower-poc/src/protocols : Zod schemas + TS types shared by server and web
apps/tower-poc/src/web       : Next.js (App Router, output:'export'), Tailwind, shadcn/ui, Zustand
```

### 3.1 Key components

- **InstrumentedAdapter** wraps any `IBluetoothAdapter` and emits a `transport` event for every `writeCharacteristic`, `onCharacteristicValueChanged`, connect, disconnect and availability change. Each event carries raw bytes (hex) and the service/characteristic UUIDs from the library's adapter config. This satisfies FR-09 with no library fork.
- **CommandExecutor** is the only path from the UI to the tower (FR-07).
  - For each command it assigns a correlation ID, validates input against the inventory's Zod parameter schemas, and records the `queued → started → write-completed → (confirmed | indeterminate) | failed | timed-out` lifecycle, or ends it as `rejected` before queueing when validation fails or the tower is calibrating (D22), along with the sender's client ID.
  - Mechanics share one serialization lane. Lights and sounds go through the library's own command queue, and the executor observes that queue.
  - It never retries physical actions automatically.
  - "Confirmed" means a correlated tower response or state update was observed. Otherwise the result is `write-completed` only.
- **StateStore** wraps every value as `{ value | unavailable, updatedAt, origin: device-reported | library-derived | application-maintained | unknown, freshness: current | stale | unavailable, verification? }`. It snapshots to SQLite on change (for D11).
- **DiagnosticsBus** keeps a ring buffer of `TimelineEvent`s, broadcasts them to subscribed clients, and supports pause of *rendering* (client side) separately from capture (always on).

### 3.2 WebSocket protocol (apps/tower-poc/src/protocols)

Envelope: `{ v: 1, type, id?, correlationId?, payload }`. All messages are validated with Zod on both sides.

- **Client → server**
  - `hello{clientLabel}`
  - `connect`, `disconnect`, `reconnect`, `calibrate`
  - `command{capabilityId, params}`. This is the only hardware path, and `capabilityId` must name an inventory entry of kind `command` whose availability is `available` or `requires-calibration` and which has a UI mapping (`isCommandable` in the inventory). There is no raw bytes message type.
  - `restoreState{accept}`
  - `diag.subscribe{filters}`, `diag.saveSession`, `diag.export`
  - `gap.*` (CRUD/import/export)
  - `verify.record{capabilityId, result, notes, sessionId}`
  - `settings.*`, `data.clear`
- **Server → client**
  - `welcome{clientId, versions, inventory, verificationOverlay, settings, pendingRestore?}`
  - `connection{state, device?, error?}`
  - `state{snapshot}`
  - `command.lifecycle{...}`
  - `diag.event{...}`
  - `gap.changed`, `error{code, message, actionable}`
- Connection states (FR-01, adapted): `bluetooth-unavailable`, `disconnected`, `scanning`, `connecting`, `connected`, `disconnecting`, `error`. These are separate from **calibration state** (`uncalibrated`, `calibrating`, `calibrated`) and **client socket state** (`online`, `reconnecting-to-service`, `service-unreachable`).
  - "Selecting device" from the PRD becomes `scanning`. There is no browser picker, so a cancelled scan maps to a stop-scan/timeout that is shown as non-error.

### 3.3 Data (SQLite via Drizzle)

| Table | Purpose |
|---|---|
| `settings` | key/value (mock mode, ring-buffer size, log levels, port) |
| `gaps` | FR-11 fields, plus `createdAt`/`updatedAt` |
| `verifications` | capabilityId, result (pass/fail/partial), notes, diagnosticSessionId, libraryVersion, appVersion, testedAt, environment |
| `diag_sessions` / `diag_events` | opt-in saved sessions |
| `state_snapshots` | latest application-maintained state, for restore prompt |

Gap import/export uses a Zod-validated JSON schema with `schemaVersion`. Seed gaps are loaded from `apps/tower-poc/src/server/gaps/seed.ts` on first run and are idempotent by gap ID.

## 4. Capability inventory (FR-02)

- `apps/tower-poc/src/protocols/inventory.ts` holds typed entries: `id`, `title`, `kind`, `category`, `apiMapping`, `params` (Zod), `availability`, `uiLocation`, `verification` (`untested | mock-tested`), `evidence`.
  - `kind` says how the capability reaches the UI: `command` (through `command{capabilityId, params}`), `lifecycle` (its own message: connect, disconnect, calibrate), `query`, `event` or `property` (the last three are published by the service in `state` and `diag.event`).
  - `availability` is `available`, `requires-calibration` (D9), `not-exposed` (the library has it; the app deliberately offers nothing) or `unsupported` (the tower has it; the library has no method for it).
  - `params` is the only validation between a client and the tower, because the library's own types are loose. Every schema is a strict object of enums, booleans and bounded integers. Sound, light-sequence and glyph ranges are read from `ultimatedarktowerdata` when the module loads.
  - The module does not import `ultimatedarktower`, because the protocols package is bundled into the web UI. It names library members as strings.
- Public members with no entry are in the `exclusions` list in the same module, each with a reason: the raw senders (D12), service plumbing, logging settings and pure helpers.
- `hardware-verified` is overlaid at runtime from `verifications` (D14). Mock-tested status is asserted by tests.
- **Coverage test:** `apps/tower-poc/src/server/inventoryCoverage.test.ts`. It reads the public methods, properties and callbacks of `UltimateDarkTower` from the installed type file, checks them against the object at runtime, and fails if any is neither mapped by an inventory entry nor excluded with a reason, or if either list names a member the library does not have. It lives in the server package because that is where the library is installed. It constructs the tower object with no Bluetooth (`BluetoothPlatform.NONE`) and never connects.
- `pnpm inventory:doc` generates `apps/tower-poc/docs/capabilities.md`.

**API surface in 7.1.2** (confirmed in M1 steps 2 to 4; 73 public members, see `research/tower/api-surface-7.1.2.md`):

| Category | Library surface |
|---|---|
| Connection | `connect`, `disconnect`, `cleanup`, `isConnectedAndResponsive`, `getConnectionStatus`, `getDeviceInformation`, `setConnectionMonitoring`, `configureConnectionMonitoring`, `configureBatteryHeartbeatMonitoring`, `onTowerConnect`, `onTowerDisconnect` |
| Calibration | `calibrate`, `onCalibrationComplete` |
| Lighting | `lights` / `Lights` (doorway: side × level; ledge: corner; base: position; effects: off, on, breathe, breatheFast, breathe50percent, flicker), `allLightsOn(effect)`, `allLightsOff`, `lightOverrides(light, sound?)`, `setLED(layer 0–5, light 0–3, effect, loop?)` |
| Sound | `playSound(index)` (1-based, catalog in `ultimatedarktowerdata` TOWER_AUDIO_LIBRARY), `playSoundStateful(index, loop?, volume?)`, volume descriptions (0 loud to 3 mute) |
| Mechanics | `Rotate(top, middle, bottom, sound?)`, `rotateWithState`, `rotateDrumStateful(drum 0–2, position 0–3, playSound?)`, `randomRotateLevels(level 0–6)`, `getCurrentDrumPosition` |
| Glyphs | `getGlyphPosition`, `getAllGlyphPositions`, `getGlyphsFacingDirection` |
| Seals | `breakSeal(seal, volume?)`, `isSealBroken`, `getBrokenSeals`, `markSealBroken`, `markSealRestored`, `resetBrokenSeals`, `getRandomUnbrokenSeal` |
| Skulls | `resetTowerSkullCount`, `onSkullDrop` |
| Battery | `onBatteryLevelNotify`, `milliVoltsToPercentage` |
| State | `getCurrentTowerState`, `onTowerStateUpdate`, `onTowerResponse` |
| Diagnostics | `getDiagnosticsRecorder`, `setDiagnosticsEnabled`, `isDiagnosticsEnabled`, `getLastIncident`, `exportDiagnosticsJSON`, `setLoggerOutputs`, `commandToPacketString` |
| Status and battery properties (read-only) | `isConnected`, `isCalibrated`, `performingCalibration`, `performingLongCommand`, `towerSkullDropCount`, `currentBattery`, `previousBattery`, `currentBatteryPercent`, `previousBatteryPercent`, and the same four battery values as plain fields (`currentBatteryValue`, `previousBatteryValue`, `currentBatteryPercentage`, `previousBatteryPercentage`) |
| Settings (no UI, excluded) | `retrySendCommandMax`, `logDetail`, `logTowerResponses`, `logTowerResponseConfig`, `batteryLogFrequency`, `batteryLogOnChangeOnly`, `batteryLogEnabled` |
| Raw (no UI, D12) | `sendTowerCommandDirect`, `sendTowerCommand`, `sendTowerState` |

The three monitoring methods have inventory entries with availability `not-exposed`: no page in §5 has a control for them, and the service keeps the library defaults.

## 5. Pages (apps/tower-poc/src/web)

Every page has a persistent header that shows tower connection, calibration, service socket, mock-mode banner, and battery.

| Page | Contents |
|---|---|
| Dashboard | Connect/Disconnect/Reconnect/Calibrate, device info, state summary, capability summary (counts by availability/verification), last 20 timeline events, restore-state prompt |
| Lights | Controls generated from the inventory: per-doorway/ledge/base light with effect, all on/off, light overrides. Shows requested vs confirmed. |
| Sounds | Filterable catalog (113 expected) by ID and name, play button, pending lock per command |
| Mechanics | Per-drum target side, rotate, rotate-with-state, random rotate (with confirmation), and calibration. Disabled until calibrated. **No "Stop" control.** |
| Tower State | Glyphs, drums, seals (break/mark/restore), skull count/reset, battery history. Each value shows origin, freshness and timestamp, and unavailable values are never shown as zero. |
| Diagnostics | Virtualized timeline with filters (direction, category, severity, operation, correlation ID, source, client), text search, pause rendering, clear, copy event, hex/parsed view, save session, export JSON (with privacy notice) |
| Feature Gaps | CRUD, filters, resolve, import/export, linked capability and diag session, evidence-required rule for `confirmed` |
| Settings | Mock mode, ring size, logging, versions (app, library, data, Node, protocol), clear local data (confirmation) |
| Verify (mode on each control page) | Record pass/fail/partial plus notes, auto-linked to the current diag session |

**Responsive targets:** phone (390px), iPad (820/1180px), desktop (1440px). Keyboard-accessible, with labeled controls.

## 6. Error handling (acceptance: distinct handling)

| Case | Behavior |
|---|---|
| Bluetooth off / no permission on Mac (Node) | `bluetooth-unavailable` with remediation text (System Settings → Privacy → Bluetooth for Terminal/Node) |
| Scan timeout / no tower found | Non-error notice and retry button |
| Unexpected disconnect | Controls disabled, Reconnect shown on all clients, calibration reset |
| Command timeout | Lifecycle `timed-out`, inline error, no retry |
| Command failure | Lifecycle `failed` with library error |
| Validation failure | Rejected before queueing, field-level error |
| Command sent while the tower is calibrating | Rejected before the library is called, with the reason shown; nothing is queued for later (D22) |
| Service unreachable (client) | Full-screen "service offline" banner with auto-retry of the **socket only** |

## 7. Seed gap register (initial)

| ID | Type | Title | Status |
|---|---|---|---|
| GAP-PLAT-001 | Platform | Direct in-browser Web Bluetooth not supported (Mac service only) | deferred |
| GAP-PLAT-002 | Platform | iOS browsers lack Web Bluetooth (mitigated by service architecture) | verified resolved |
| GAP-LIB-001..003 | Library not exposed | `sendTowerCommandDirect`, `sendTowerCommand`, `sendTowerState`: no UI by design | deferred |
| GAP-HW-001 | Unverified | Whether lights/sounds require calibration first. The library's documents say calibration is required before any command. M1 spike, run 2: all lights on and off, one sound and the seal sequence worked on a tower that reported itself uncalibrated, and no drum moved (`research/tower/spikes/2026-10-13-noble-macos.md`, finding 2). D9 stands. One run, one tower; `lighting.set`, `lighting.set-led`, `lighting.sequence` and `sound.play-stateful` were not themselves tried before calibration. | verified resolved |
| GAP-HW-002 | Unverified | Seal/glyph state is application-maintained, not device-reported | confirmed gap |
| GAP-HW-003 | Unverified | Volume control semantics. The library accepts a `volume` on `breakSeal(seal, volume?)` but discards it (it overwrites the audio volume with 0 before packing). The remaining candidates are `playSoundStateful(index, loop?, volume?)` and the state's `audio.volume` (0–15). The library accepts 0–3 (loud, medium, quiet, mute) there, and its own code comment says the firmware ignores volume in sound commands; how the values relate is not stated. | unverified |
| GAP-HW-006 | Unverified | Does the tower act on the drum bytes in a stateful command before calibration? `seals.break` was held behind calibration for this. M1 spike, run 2: it played on an uncalibrated tower and no drum moved, so the hold is lifted and `seals.break` is `available` (`research/tower/spikes/2026-10-13-noble-macos.md`, finding 2). Still open: the packets carried drum bytes `00 00`. A packet carrying stale positions (library still calibrated, tower switched off and on) was not tested. The M2 session is to reset calibration on disconnect (D10) so that none is sent; M2 step 4 has the test, and nothing does it yet. | investigating |
| GAP-HW-007 | Partial | `lighting.sequence` does not accept `rotationAllDrums`, `rotationDrumTop`, `rotationDrumMiddle` or `rotationDrumBottom` (`HELD_LIGHT_SEQUENCES`). M1 spike, run 3, calibrated tower: each played its lights and no drum moved, as watched by Bob. The tower answered none of them, so each is reported as failed (GAP-HW-010). Held until M2 can send them without waiting for an answer (D23) (`research/tower/spikes/2026-10-13-noble-macos.md`, findings 4 and 7). | confirmed gap |
| GAP-HW-008 | Unverified | `sound.play-stateful` has no `loop` parameter. M1 spike, run 3: sound 1 was sent with the loop bit, the tower's echo came back without it, and Bob answered that it did not loop. Whether a looped sound can be stopped was therefore not tested. One sound, once; the script did not ask whether the sound played at all (`research/tower/spikes/2026-10-13-noble-macos.md`, finding 9). `loop` stays out. | unverified |
| GAP-HW-009 | Partial | The legacy `Rotate` (`mechanics.rotate`) is not offered: it sends every light byte as zero, so it turns the lights off; `mechanics.rotate-with-state` keeps them. `mechanics.random-rotate` goes through the same path, also turns the lights off, and has no state-preserving alternative. M1 spike, run 3, top drum only: legacy rotate and random rotate turned the lights off and `rotate-with-state` kept them, in the packets and at the tower (`research/tower/spikes/2026-10-13-noble-macos.md`, finding 8). The legacy rotate stays not offered; the Mechanics page has to say that a random rotation turns the lights off. | confirmed gap |
| GAP-DIAG-001 | Diagnostics | Correlating a tower response to a specific command is heuristic. The tower answers with its whole state and never names the command. Of the 16 writes in spike run 3, nine were matched by content and time, calibration was matched by its state, and six got no answer; an unprompted state (a skull drop) arriving while a command is in flight was not tested (`research/tower/observability.md`, finding 4). The timeline is to mark each match as by echo or none (M4 step 4.1). | confirmed gap |
| GAP-HW-004 | Hardware | No stop/abort for drum motion | confirmed gap (pending M1 evidence) |
| GAP-LIB-004 | Library not exposed | `doorReset`: a firmware command in `TOWER_COMMANDS` with no public method. Reachable only through the raw senders (D12). | confirmed gap |
| GAP-LIB-005 | Library not exposed | `unjamDrums`: a firmware command with no public method. A jam is reported in tower state but cannot be cleared from the app. | confirmed gap |
| GAP-LIB-006 | Library not exposed | `overwriteDrumStates`: a firmware command with no public method. | confirmed gap |
| GAP-LIB-007 | Unverified | No audio completion signal: `playSound` resolves when the sound starts, so the Sounds page's pending lock covers the send, not the playback. Whether the tower reports the end of a sound is not known. | unverified |
| GAP-HW-010 | Partial | The tower does not answer every write. In the M1 spike it sent no state after the four `rotation*` sequences, after all-lights-on when the lights were already on, or after an all-zero state when the lights were already off (that packet also differed from the tower's last state in the audio byte, so it changed nothing only if the sound had ended). For a queued command the library then rejects with a timeout after 30 seconds, and by its code holds its queue meanwhile. "No state came back" is not "the command failed" (`research/tower/spikes/2026-10-13-noble-macos.md`, findings 4, 7 and 10; `research/tower/observability.md`, findings 4 and 6). Why the tower stays silent is not known. | confirmed gap |
| GAP-LIB-008 | Partial | The library's battery heartbeat check expects a message about every 200 ms and warns after 3 seconds without one. This tower sent one about every 2 seconds, and none for 22 to 24 seconds while calibrating. One late message tripped the warning in spike run 3; the library found the connection alive and carried on. The service must not treat the warning as a lost connection (`research/tower/observability.md`, finding 7). | confirmed gap |
| GAP-LIB-009 | Partial | The library records a disconnect the user asked for as an incident: after `user_initiated` it logs "disconnected unexpectedly" and writes an incident report with cause `adapter_event`. Seen in spike runs 2 and 3. `connection.last-incident` and the export cannot be read as "something went wrong" without knowing who asked for the disconnect (`research/tower/observability.md`, finding 8). | confirmed gap |
| GAP-DIAG-002 | Diagnostics | The library's recorder, as the spike ran it, holds no packet bytes and only its last 450 to 500 events; an idle connection fills it in about eight minutes. Its export is not a record of a session. The recorder has a `capturePayloads` option and an `onEvent` sink, read in the code and not yet run. D16 is met by taking events as they arrive (M4 step 4.1), with our adapter tap as the source of bytes (`research/tower/observability.md`, findings 1 and 2). | investigating |

GAP-LIB-004 to 007 were added in M1 step 3. GAP-HW-010, GAP-LIB-008, GAP-LIB-009 and GAP-DIAG-002 were added in M1 step 8 from the hardware spike and the observability assessment. `src/server/gaps/seed.ts` does not exist yet; until M4 step 4.4 builds the register, this table is the seed.

## 8. Acceptance criteria (updated)

These are the PRD §10 criteria plus the following:

- Connect, disconnect and manual reconnect pass from **each** of Mac Chrome, iPad Safari and a phone (the service is on the Mac).
- Two clients open at once both see the same state and timeline within 1s. Commands from either are serialized and attributed.
- A service restart prompts for restore, and restored values show `stale`.
- The coverage test passes: every public API is mapped or gapped.
- Every inventory entry marked `available` has a `pass` verification in SQLite before M5 sign-off.
- No WebSocket message type can carry raw bytes to the tower (protocol test).

## 9. Out of scope (unchanged plus additions)

Everything in PRD non-goals, plus: auth/tokens, HTTPS, direct browser BLE, upstream relay integration, and controlling multiple towers.

## 10. Open risks

1. **noble on macOS.** Node needs Bluetooth permission (granted to the terminal app), and macOS hides MAC addresses, so the device ID is a UUID. The M1 spike settled it: once the terminal has Bluetooth permission, noble connects in 2 to 5 seconds. The first run fails while macOS is still asking.
2. **Response correlation.** The tower may not acknowledge every command, so "confirmed" may often be `indeterminate` (GAP-DIAG-001). The M1 spike showed which: the tower was silent for the four rotation sequences and for writes that changed nothing it reports (GAP-HW-010).
3. **Library churn.** Upstream releases frequently. The exact pin stays, and upgrades go through a new intent.
4. **Open LAN.** Anyone on the Wi-Fi can drive the tower. This is accepted for the POC (D6). D20 narrows it: a page from another site cannot connect, but a person on the LAN who opens the UI still can.
