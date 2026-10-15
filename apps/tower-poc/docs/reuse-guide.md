# Reusing tower-poc

How to take what tower-poc built into a new POC, or into the game app (`burgomaster-funeral-poc` Phase 2, PRD §13). What the tower can do is in [final-report.md](final-report.md); this page is about the code.

**Short answer:** most of it is reusable. The protocol and the tower service were written as separate packages with no UI in them, and the layers depend only downward. The pages are specific to this POC and stay here.

## What is worth keeping

Lines exclude tests; every part has its own unit tests that move with it.

| Part | Where now | Lines | What it gives a new app | Reuse |
|---|---|---|---|---|
| **Protocol** | `src/protocols/` | 2,618 | The capability inventory (54 entries, each a Zod schema for its params, with availability and evidence), WebSocket messages and envelope, command validation and lifecycle stages, the tower value types, the sound catalog, and the timing-result schema | **As is.** No Node, React or library runtime in it, only `zod` and `ultimatedarktowerdata` |
| **Tower session** | `src/server/session.ts` | 401 | Connect, disconnect and reconnect, plus calibration, as one state machine. A new library object per connection, cleanup ordering, no auto-reconnect (D10), library re-sends off (D21) | **As is** |
| **Executor** | `src/server/executor.ts` | 478 | The only path from `command{capabilityId, params}` to the library: validation, the queue and direct lanes, timeouts, `confirmed` / `indeterminate` / `failed`, refusals while calibrating (D22), silent sequences (D23). `lighting.flash` is a direct plan inside this file | **As is.** It is the safety boundary; don't rewrite it |
| **State store and records** | `stateStore.ts`, `towerRecords.ts` | 440 | Every tower value with its origin and freshness, snapshots for the restore prompt (D11), the app's own seal and skull record (D24) | **As is.** Storage is passed in, so any app can supply its own |
| **Adapters** | `src/server/adapters/` | 390 | `InstrumentedAdapter` taps every packet and lifecycle call; `mockTower` is an in-memory tower for tests and for demos without the hardware | **As is.** The mock is how a game is tested without a tower |
| **WebSocket host** | `server.ts`, `clientHub.ts`, `static.ts` | 537 | One process serving the UI and `/ws`, broadcast to every client, the origin check (D20). `src/server/timing/` saves the timing page's results and is not part of this host for a game | Keep if the new app runs the service; replace if it embeds it |
| **SQLite storage** | `src/server/db/` | 230 | `better-sqlite3` plus Drizzle migrations for snapshots, records and verifications | Pattern only: a new app has its own database |
| **Diagnostics log** | `diagLog.ts` | 48 | `DIAG_LOG=<file>` JSONL of tx/rx bytes, connection changes and command lifecycles. It found the cause of the drum problem in the Verify pass | **As is.** Turn it on in every hardware session |
| **Browser client** | `src/web/lib/` | ~1,200 | `ws.ts` (reconnecting link to the service), `service.ts` (pure reducer of server messages), `store.ts` (Zustand), `useCommand`, `controls.ts` (when a control may be used and why not) | **As is** for a React app that talks to the service |
| **Control components** | `src/web/components/controls/` | — | `CapabilityControl` (a form generated from a capability's schema), `CommandStatus` (requested versus outcome) | Useful for an admin or debug page; a game draws its own UI |
| **Verify mode** | `verifications.ts`, `components/verify/` | — | Record pass, partial or fail per capability on the real tower | Reuse when a new app adds tower features to verify |
| Pages, Dashboard, nav | `src/web/app/`, `components/` | — | This POC's screens | **Stays here** |

Not code, but just as reusable:
- The `tower-capability` and `gap-entry` skills.
- The tower safety rules in the root `CLAUDE.md`.
- The pinned library version (`ultimatedarktower` 7.1.2).
- The gap register in `spec.md` §7.

### How the server parts depend on each other

```text
protocols  ←  adapters  ←  session  ←  stateStore  ←  towerRecords  ←  executor  ←  server (WebSocket host)
                                                                                     ↑
                                                         index.ts wires them together, with storage and env
```

Each arrow points to what a part imports. Nothing imports `index.ts` or `server.ts`, so an app can take everything left of the host and supply its own wiring.

## Three ways to use it

### A. Run the service beside the app: no code moves

The game's Mac server keeps tower-poc running as its tower service, as the funeral PRD (line 9) already plans: "reused as the Mac-side tower service". The game server connects to `ws://localhost:4747/ws` as a client:

1. Open the socket. A Node client sends no `Origin`, which the service accepts (D20).
2. Send `hello{clientLabel: "game"}`. Read `welcome` for the inventory, the connection state and the current values.
3. Send `command{capabilityId, params}` with an `id` per cue. Follow `command.lifecycle` for that id until an end stage (`END_STAGES`: `confirmed`, `indeterminate`, `failed`, `timed-out` or `rejected`). Only `confirmed` means the tower answered.
4. Follow `connection` and `state` for the tower's status and values.

The tower-poc pages stay available as the host's admin console on the same port: connect, calibrate, battery, a test sound.

- **For:** nothing is redesigned, and it's ready now. The safety rules stay in the one place that enforces them.
- **Against:** two processes. The game can't import `tower-poc-protocols`, because apps never import from each other, so it has no shared types until step 1 below is done.

### B. Embed the service in the app: one process

The game's server imports the session, executor and state store from a package and wires them itself, the way `index.ts` does here, with its own storage. It's one process, one Bluetooth owner and one game state (funeral PRD-1). This is the end state for the game app.

### C. Copy into a new POC

For a short-lived experiment, use the `new-app` skill, then add the packages from steps 1 and 2 below as dependencies. Don't copy files: copies drift from the safety rules.

**Recommendation:** use A to start Phase 2 once the protocol is a package (step 1), and move to B (step 2) when the game needs tighter timing or a single process.

## Moving code into `packages/`

The rule in `packages/README.md` applies: code moves only once a second app needs it, and the funeral app's Phase 2 is that second app. Each step is its own branch (`chore/<slug>`) and PR, and leaves tower-poc working.

### Step 1: `@dark-tower/tower-protocol`

1. Write the decision record in `research/decisions/`: what moves, and that tower-poc and burgomaster-funeral-poc use it.
2. `git mv apps/tower-poc/src/protocols packages/tower-protocol`, so the history comes along.
3. Rename it in `package.json` from `tower-poc-protocols` to `@dark-tower/tower-protocol`. Keep the exact pins: `zod` 4.6.7, `ultimatedarktowerdata` 3.0.0.
4. Point tower-poc's `server`, `web` and `e2e` at `"@dark-tower/tower-protocol": "workspace:*"` and update the imports.
5. Move `capabilitiesDoc.ts` and the `inventory:doc` script with the package. Its output path is `apps/tower-poc/docs/capabilities.md`, so make the path an argument.
6. Run `pnpm install` and `pnpm check`. The cross-app import check now passes for the game, too.

### Step 2: `@dark-tower/tower-service`

1. `git mv` `session.ts`, `executor.ts`, `stateStore.ts`, `towerRecords.ts`, `versions.ts`, `diagLog.ts`, `adapters/` and their tests to `packages/tower-service/src/`.
2. Its dependencies are `ultimatedarktower` **7.1.2** (in `scripts/pinned-versions.json`; only Bob changes it), `@stoprocent/noble` 2.8.0, `ultimatedarktowerdata` and the protocol package.
3. Export a factory that does what `index.ts` does without the env reading:

   ```ts
   createTowerService({ adapter: "bluetooth" | "mock", storage, diagLogPath? })
     → { session, store, records, executor }
   ```

   The storage interfaces (`SnapshotStorage`, `RecordStorage`) stay as they are. An app passes its own, or the SQLite ones in tower-poc's `db/`.
4. tower-poc keeps `server.ts`, `clientHub.ts`, `static.ts`, `db/` and the pages, and its `index.ts` calls the factory.
5. `pnpm check`. Then run `pnpm e2e` in tower-poc, which proves the mock path end to end.

### Step 3: `@dark-tower/tower-client`, only if a second React app needs it

`ws.ts`, `service.ts`, `store.ts`, `useCommand.ts`, `useControl.ts`, `controls.ts` and `labels.ts`, and optionally `CapabilityControl` and `CommandStatus` for admin pages. Skip this step if the game drives the tower from its server only, which is the likely case: cues come from the host's game state, not from a browser.

## Rules to carry into any app on the tower

From the root `CLAUDE.md` and the Verify pass:

- **Everything goes through `command{capabilityId, params}`.** No message carries raw bytes (D12).
- **Nothing physical happens automatically:** no auto-calibrate, no auto-reconnect, no retry of a physical action.
- **Unknown values show as unavailable, never as zero.**
- **Skip no-op commands.** A command that changes nothing gets no answer, and the next one waits 30 s behind it (GAP-HW-010, GAP-LIB-013). A cue engine checks the state store before it sends.
- **Every tower effect has a fallback** on screen or from Mac audio, used whenever the tower is disconnected, uncalibrated, or a command ends other than `confirmed` (funeral PRD-12 already does this).
- **Calibrate once at setup.** Treat drum and glyph cues as optional after a reconnect until the host calibrates again.
- **Only one process owns the tower.** Don't run tower-poc and an app with the embedded service at the same time.
- **Turn on `DIAG_LOG` for every hardware session**, and record new hardware findings as gap entries with the `gap-entry` skill.
