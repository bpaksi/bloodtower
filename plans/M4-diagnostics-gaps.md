# M4 — Diagnostics and gap management

**Goal:** a full diagnostics timeline (FR-08 to FR-10) and a persistent gap register (FR-11, FR-12).
**Exit condition:** every command has a correlated lifecycle in the timeline. Export JSON validates against the schema. Gaps support CRUD, import and export and persist across service restarts.

## Steps

| Step | Branch | Scope |
|---|---|---|
| 4.1 | `feat/diag-bus` | `DiagnosticsBus` ring buffer (size from settings). It sources `application` (executor/session), `transport` (InstrumentedAdapter tx/rx hex plus UUIDs) and `library` (`setLoggerOutputs` sink plus diagnostics recorder events). Unavailable fields are marked, not fabricated. |
| 4.2 | `feat/diag-ui` | Virtualized timeline, filters (direction/category/severity/operation/correlation/source/client), search, pause *rendering* (capture continues, with an "N new events" indicator), clear session, copy event, hex and parsed side by side |
| 4.3 | `feat/diag-persist-export` | Opt-in Save session → `diag_sessions`/`diag_events`. Export JSON contains events, versions, client UA list, inventory with overlay, state snapshot, and the library's `exportDiagnosticsJSON()`. Privacy notice before download. |
| 4.4 | `feat/gaps` | `gaps` table, seed loader, CRUD UI, filters, resolve flow, evidence required for `confirmed`, link to capability and diag session. Zod import/export with `schemaVersion`. "Not exhaustive" banner. |
| 4.5 | `feat/settings-clear` | Settings page: versions, logging, ring size, mock toggle, and clear local data (confirmation; wipes SQLite tables except migrations) |

## Risks

- Event volume during battery and state notifications. Throttle the UI render, never capture.
- Response correlation is heuristic (GAP-DIAG-001). Show `indeterminate` honestly.

## Proof

- Unit: ring-buffer bounds, export schema, gap import rejects invalid JSON, and evidence rule.
- E2E (mock): run 5 commands, filter by correlation ID, export, re-import gaps.
- A hardware session saved and attached as evidence to a real gap entry.
