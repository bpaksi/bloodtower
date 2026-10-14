# M2 — Walking skeleton (application foundation)

**Goal:** end-to-end path UI → WS → CommandExecutor → TowerSession → adapter → (mock or tower), with connection lifecycle and multi-client broadcast. Proven with a single capability (`sound.play`).
**Exit condition:** from Mac and iPad at the same time, connect, calibrate and play a sound in mock mode and on hardware. Both clients see the lifecycle.

## Files that change

```text
apps/tower-poc/src/protocols/{envelope,messages,connection,command,state}.ts (+ tests)
apps/tower-poc/src/server/
  server.ts            # HTTP static + ws upgrade
  clientHub.ts         # client registry, broadcast, clientId/label
  towerSession.ts      # owns UltimateDarkTower instance, lifecycle state machine, calibration state
  adapters/instrumented.ts, adapters/mockTower.ts
  commandExecutor.ts   # queue, correlation IDs, validation via inventory, timeouts, lanes, lifecycle events
  stateStore.ts        # value+origin+freshness wrapper, snapshot to db
  db/{schema.ts,client.ts,migrations/}   # better-sqlite3 + Drizzle: settings, state_snapshots
  settings.ts
apps/tower-poc/src/web/
  lib/ws.ts (socket with service-reconnect), lib/store.ts (Zustand), lib/useCommand.ts
  components/ConnectionHeader.tsx, MockBanner.tsx, RestorePrompt.tsx
  app/(dashboard)/page.tsx (connect/disconnect/reconnect/calibrate + play test sound)
```

## Order of work

1. Protocol messages (spec §3.2), plus a test asserting that no message can carry arbitrary bytes.
   - Result, on `feat/tower-poc-protocol-messages` (spec 1.9):
     - Client messages: `hello`, `connect`, `disconnect`, `reconnect`, `calibrate`, `command`, `restoreState`. Server messages: `welcome`, `error`, `connection`, `state`, `command.lifecycle`. The schemas are in `connection.ts`, `command.ts` and `state.ts`. The `diag.*`, `gap.*`, `verify.*`, `settings.*` and `data.clear` messages of spec §3.2 are left to the milestones that use them (M3, M4).
     - `command.params` is the one open field a client can send. `validateCommand` (in `command.ts`) checks it against the inventory and returns the schema's parsed output or the fields that are wrong; the executor (step 5) must call it before anything else touches `params`. A test walks every client message schema and fails if another open field appears.
     - Deviations from spec §3.2 as it stood, now written into it: `connection` carries `calibration`; a `command` must have an `id`.
     - The service answers a valid message it has no handler for with the error `not-implemented`. That code is temporary: steps 4, 5 and 6 replace it, and step 7 removes it. Until step 5 a `command` reaches nothing.
     - `welcome` is unchanged; step 7 adds the inventory and `pendingRestore`.
     - The origin check is `isAllowedOrigin` in `server.ts`; a refused upgrade gets `403`. Dev mode is the `DEV_ORIGINS` variable, which only `pnpm dev` sets (to `http://localhost:3000` and `http://127.0.0.1:3000`). If `next dev` picks another port because 3000 is taken, the UI cannot connect until that port is added.
     - Not covered by D20 as written, and not built: a page on another site whose name resolves to the Mac's address has an `Origin` equal to its `Host`, so it passes. Closing that means checking `Host` against the Mac's own names and addresses; it needs Bob's decision because it could lock out a name he uses.
   - Before `command` is accepted: the `/ws` origin check from spec D20, with tests for the service's own origin (accepted), the `next dev` origin in dev mode (accepted), another origin (refused) and a missing `Origin` header (accepted). The service binds `0.0.0.0`, so "its own origin" is checked against the request's `Host` header, not a fixed value.
2. `MockTowerAdapter`: scripted responses for connect, device info, calibration complete (after a delay), battery notify, and an injectable skull drop. Deterministic clock for tests.
   - From the M1 spike: the mock answers a write with a state only when the real tower did. It stays silent for the four `rotation*` sequences and for a write that changes nothing in its state (GAP-HW-010). It sends battery messages about every 2 seconds and none while calibrating (GAP-LIB-008).
3. `InstrumentedAdapter`: tx/rx/lifecycle taps that emit to a temporary in-memory event list. The full DiagnosticsBus comes in M4.
4. `TowerSession` state machine (spec §3.2 states). It sets `retrySendCommandMax = 0` on the tower object as soon as it is constructed, with a test (D21). Manual reconnect only (D10), and calibration resets on disconnect.
   - From the M1 spike: a test asserts that the first stateful packet after a reconnect carries no drum positions from the earlier connection (the open part of GAP-HW-006). The library's heartbeat warning is recorded and is not treated as a lost connection, and nothing reconnects because of it (GAP-LIB-008). The session knows when it asked for the disconnect, so the library's incident for it is not reported as a fault (GAP-LIB-009).
5. `CommandExecutor` with lifecycle, lanes, per-capability timeouts from the inventory, and no auto-retry. It validates `params` with the inventory schema and passes the parsed output to the library, never the input; a test asserts that the library receives the schema's parsed output. `lighting.all-on` and `lighting.all-off` bypass the library's queue (`sendTowerState` goes straight to `sendTowerCommandDirect`), so the executor serialises them with the other commands. A command that arrives while `performingCalibration` is true is rejected before the library is called, with a test (D22).
   - From the M1 spike: when a command's write completed and no state came back, the lifecycle ends as `indeterminate`, not `failed` or `timed-out` (GAP-HW-010). The library's own 30-second rejection for such a command is mapped to that, with a test.
   - D23: decide how to send a command the tower is known not to answer without holding the library's queue for 30 seconds, and bring the choice to Bob before building it. When it works on hardware, empty `HELD_LIGHT_SEQUENCES` and update GAP-HW-007. Until then the four `rotation*` sequences stay held.
6. `StateStore` plus snapshot and the restore prompt flow (D11).
7. `ClientHub` broadcast. `welcome` carries versions, inventory and pendingRestore.
8. Web: socket client, store, header (tower, calibration, service and mock states), and Dashboard controls.
9. Unit tests for the executor (validation reject, timeout, serialization, attribution), the session state machine, and restore.
10. E2E (mock): two browser contexts. Connect from A, see it in B, play a sound from B, and both see the lifecycle.
11. Hardware smoke with Bob, recorded in the plan's Proof section.

## Risks

- The library's internal command queue and our executor fight over ordering. Observe and don't duplicate it: the executor awaits library promises and the mechanics lane only.
- Static export vs dev WS URL (see M0).

## Proof

- `pnpm check` and `pnpm e2e` output.
- Screenshot of the two-context E2E.
- Hardware smoke: diag JSONL excerpt showing a correlated play-sound lifecycle.
