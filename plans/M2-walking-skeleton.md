# M2 — Walking skeleton (application foundation)

**Goal:** end-to-end path UI → WS → CommandExecutor → TowerSession → adapter → (mock or tower), with connection lifecycle and multi-client broadcast. Proven with a single capability (`sound.play`).
**Exit condition:** from Mac and iPad at the same time, connect, calibrate and play a sound in mock mode and on hardware. Both clients see the lifecycle.

## Files that change

```text
packages/protocol/src/{envelope,messages,connection,command,state}.ts (+ tests)
apps/tower-service/src/
  server.ts            # HTTP static + ws upgrade
  clientHub.ts         # client registry, broadcast, clientId/label
  towerSession.ts      # owns UltimateDarkTower instance, lifecycle state machine, calibration state
  adapters/instrumented.ts, adapters/mockTower.ts
  commandExecutor.ts   # queue, correlation IDs, validation via inventory, timeouts, lanes, lifecycle events
  stateStore.ts        # value+origin+freshness wrapper, snapshot to db
  db/{schema.ts,client.ts,migrations/}   # better-sqlite3 + Drizzle: settings, state_snapshots
  settings.ts
apps/web/
  lib/ws.ts (socket with service-reconnect), lib/store.ts (Zustand), lib/useCommand.ts
  components/ConnectionHeader.tsx, MockBanner.tsx, RestorePrompt.tsx
  app/(dashboard)/page.tsx (connect/disconnect/reconnect/calibrate + play test sound)
```

## Order of work

1. Protocol messages (spec §3.2), plus a test asserting that no message can carry arbitrary bytes.
2. `MockTowerAdapter`: scripted responses for connect, device info, calibration complete (after a delay), battery notify, and an injectable skull drop. Deterministic clock for tests.
3. `InstrumentedAdapter`: tx/rx/lifecycle taps that emit to a temporary in-memory event list. The full DiagnosticsBus comes in M4.
4. `TowerSession` state machine (spec §3.2 states). Manual reconnect only (D10), and calibration resets on disconnect.
5. `CommandExecutor` with lifecycle, lanes, per-capability timeouts from the inventory, and no auto-retry.
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
