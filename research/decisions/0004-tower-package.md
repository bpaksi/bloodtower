# 0004 — The tower code moves to `packages/tower`, and Bloodtower owns the radio
Date: 2026-10-23 · Status: accepted

## Context
Bloodtower reaches the tower through tower-poc running as a sidecar on `ws://localhost:4747/ws` (Bloodtower spec D2, reuse-guide option A). That was right for R1, which sent nothing but connect, calibrate and the volume test. Three things have changed since:
- **The game now needs the tower.** "No play without the tower" (game-design DEC-155): a lost tower pauses the game until Reconnect, or Save and quit. Tower cues fire during play, and the drum sync runs right after calibrate (DEC-103, DEC-104).
- **tower-poc is an Experiment-tier app** (Bob, 2026-10-21, PR #159), so it is easier to change. The real game would depend on an experiment's uptime and on its socket protocol.
- **Two processes at the table.** Bob would start tower-poc first and then Bloodtower, every evening.

The reuse guide (`apps/tower-poc/docs/reuse-guide.md`) already finds the protocol, the tower session, the executor, the state store, the records, the adapters (including the mock) and the diagnostics log reusable as is. They depend only downward, and nothing imports `server.ts` or `index.ts`.

## Decision
Bob, 2026-10-23 (architecture review): the tower code becomes a shared package, and Bloodtower owns the radio in its own process. The details below were proposed by Claude in the same review, and approving this record approves them.
- The parts left of tower-poc's WebSocket host move with `git mv` to `packages/tower`, named `@dark-tower/tower`, at the Full tier. That is the protocol and capability inventory, the session, the executor, the state store and records, the adapters with the mock, and `diagLog`.
- **The Bloodtower host owns the radio in its own process.** It imports `@dark-tower/tower` and runs one tower session. It no longer starts or calls a sidecar.
- tower-poc imports the same package and keeps its own pages, WebSocket host and experiments.
- **One owner of the radio at a time.** Only one process opens the tower: Bloodtower at the table, or tower-poc for an experiment. The package refuses a second open in the same process. Running both apps against the real tower at once is not supported, and each app's README says so.
- The tower safety rules do not change. Engine and game code reach the tower only as `command{capabilityId, params}` effects, through the executor. No message carries raw bytes. Nothing connects, calibrates, reconnects or retries by itself. A command with no answer is an error (decision 0003).

## Consequences
- Bloodtower spec D2 and D10 are replaced by D35 (see the spec) once the move lands. `TOWER_URL` and `src/server/tower/sidecar.ts` go away, and the mock comes from the package.
- tower-poc changes in the same branch as the move, as `packages/README.md` requires: its imports point at the package, and its tests move with the code.
- The prototypes' tower client copies tower-poc's message types and checks them with a drift test that reads `apps/tower-poc/src/protocols` from disk (prototypes plan step 0b). After the move, the drift test reads `packages/tower` instead, or the prototypes import the package and drop the copy. The move step picks one.
- `packages/tower` takes over the pinned tower libraries (`ultimatedarktower` 7.1.2, `ultimatedarktowerdata` 3.0.0, `@stoprocent/noble` 2.8.0) at the same versions. No pin changes. `scripts/pinned-versions.json` stays Bob's to edit.
- The package is hardware code, so its steps are `Runs: local`, and a change to it gets the full review loop whichever app asked for it.
