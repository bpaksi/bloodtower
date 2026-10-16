# spec.md — Bloodtower R1

| Field | Value |
|---|---|
| Status | Written in R1 steps 1 and 2 from the approved plan (G0, 2026-10-15). |
| Source | [plans/R1-step1-foundation.md](plans/R1-step1-foundation.md). This spec follows that plan. A choice the plan left open is a decision in §1. |
| Spec version | 1 (2026-10-15) |

R1 is the thin foundation. It loads a story pack, shows a display-only Story board, lets devices join and press, and writes timing marks. It plays no story beyond the loaded pack's moment list. The tower is connection only: no cue is sent. The socket hub publishes one session to the board and the devices.

## 1. Decisions

| # | Decision | Reason |
|---|---|---|
| D1 | The app is `apps/bloodtower`, with packages `bloodtower-web`, `bloodtower-server`, `bloodtower-protocols` and `bloodtower-e2e`. | Bob, 2026-10-15 (plan Q1). |
| D2 | Reuse-guide option A. tower-poc runs as a sidecar on `ws://localhost:4747/ws`. No tower code moves into `packages/` in R1. This app does not import `apps/tower-poc`. | Bob, 2026-10-15 (plan Q2). Two owners of one Bluetooth radio would break the one-owner rule. |
| D3 | Packs live in a top-level `packs/` folder. The host reads `packsDir` from `.wt.json` (a relative path is resolved from that file). `PACKS_DIR` overrides it. A blank override does not. The default is the repo's `packs/`. | Bob, 2026-10-15 (plan Q3). |
| D4 | R1 loads `packs/test/` only. That pack is a proving ground: four hunters, one night, one set piece, shared and private moments, one `~no-<hunter>` variant, and one cue with a screen half and a fallback. The Dracula pack is a later step. | Bob, 2026-10-15 (plan Q4). Step 3 replaced the placeholder README. |
| D5 | Any joined iPad (or a phone standing in for one) can connect and calibrate. The first press wins, the same lock as Begin, Continue, Pause and Resume. Nothing connects, calibrates or reconnects by itself. | Bob, 2026-10-15 (plan Q5). Root tower-safety rules. |
| D6 | Timing rows match the funeral POC's PRD-41 rows: phase, moment, pick, table talk, battle screen, cue start/end, pause start/end with cause (`unheld-hunter`, `host-pause`, `disconnect`). Each row has monotonic milliseconds from session start and a UTC wall time. Pauses are excluded from active time. Overlapping pauses count once. An open pause makes active time unknown, not zero. | Bob, 2026-10-15 (plan Q6). |
| D7 | Holdings change only from a joined iPad or phone. The Story board cannot send `hold` or `control`. The server rejects those on a storyboard socket with `storyboard-control` (enforced when the hub lands in step 7). | Bob, 2026-10-15 (plan Q7), and Gamewright's PR #21 ruling. |
| D8 | The shared-screen target id is `storyboard`. `dashboard` is not a target. A private moment's target is `ipad:<hunter>`. | Plan step 2. R-DEV-6. The frozen funeral POC still says `dashboard`; this app does not. |
| D9 | Main-checkout ports are 4787 (dev) and 4788 (e2e). A worktree's `.wt.json` `ports` replace them. | Plan. They do not collide with 4747/4748 or 4767/4768. |
| D10 | The bloodtower protocol has no `command` message and no field for raw bytes, a capability id or tower parameters. Connect and calibrate are the control actions `tower-connect` and `tower-calibrate`. The sidecar's own `command{capabilityId, params}` stays inside tower-poc. This app does not speak it in R1. | Tower safety. R1 sends no effects. The protocol freezes in step 1. |
| D11 | A tower reading the host does not have is `unavailable`, a different state from a known value. Battery `0` is a real reading only as `{ state: "known", percent: 0 }`. A stale percent, including a stale `0`, is `unavailable`. Health `effects` is the literal `"none"` (this build sends none), not a count. | Root rule: unknown is never shown as zero. |
| D12 | The join code is six digits. The rejoin token is 16–128 URL-safe characters. A client message does not carry a device id; the server takes it from the socket. | R-WIZ-10 asks for a short code. The socket is the thing that cannot be spoofed by a payload field. |
| D13 | Sections R1 does not run (choices, items, tracks, corruption, quest tokens, encounters, dungeons, endings, `by_length`, and the rest listed on `packSchema`) are parsed and kept. They are not executed. | Plan risk note. Pack schema lives in `pack.ts`. |
| D14 | Story-pack rules V-15 (all three lengths, reachable win) and V-6, V-7, V-9 through V-14, V-16 through V-19 and V-21 are not R1 loader rules. The schema does not enforce them. | The plan's subset is V-1, V-2, V-3, V-4, V-5, V-8, V-20. |
| D15 | `tower-reconnect` is not an R1 control action. R-SES-2 names reconnect; the approved control list is Begin, Continue, Pause, Resume, connect and calibrate. Adding reconnect later changes the frozen protocol and is a plan deviation. There is still no automatic reconnect. | The plan's control list, frozen in step 1. |
| D16 | A device that holds nobody is welcomed with an empty channel list. A channel is `ipad:<hunter>` for a hunter it holds at hello, never `storyboard`. A later hold does not send another welcome. Each `deviceState` is filtered to the hunters that socket holds. | The frozen welcome required one channel, and a new device has no hunter yet. Step 7. |
| D17 | `deviceState` carries, beside the gameplay lock, the tower snapshot, the pause prompt id, the connect and calibrate locks, and a public roster of hunter id and name. None of those fields carry a private line. | B2 left the tower locks for step 7. The frozen message had nowhere else to put them, and the device screen already takes them as props. |

## 2. Layout and run

Four packages under `apps/bloodtower/src/`, orchestrated by `apps/bloodtower/package.json`. See [README.md](README.md) for the commands Bob runs.

The host serves the static export, `GET /health`, and `/ws`. It loads `packs/test` before it listens. It opens SQLite at `session.sqlite` in the data folder. It does not import `ultimatedarktower` or `@stoprocent/noble`. The hub imports `ws`. The tower library packages stay pinned from step 1; this step does not change a version.

The tower port is the mock unless `TOWER_URL` is set, in which case it is a client of that tower-poc socket. Nothing connects, calibrates or reconnects until a joined device wins that press. `DIAG_LOG` is passed through to the sidecar when it is set. `DEV_ORIGINS` lists extra page origins for `next dev`, exact match only.

SQLite is pinned (`better-sqlite3` 13.0.3, `drizzle-orm` 0.45.3). The game tables are `sessions`, `devices`, `holdings`, `control_presses` and `timing_marks`. The running host creates `apps/bloodtower/data/` (gitignored), or `.wt.json` `dataDir`. Hub tests use a temporary file. Other tests still use `:memory:`.

## 3. Protocols contract (frozen)

`bloodtower-protocols` is the contract. A later change to these types or messages is a plan deviation. D16 and D17 are the step 7 changes.

Envelope: `{ v: 1, type, id?, correlationId?, payload }`. Strict objects. An extra key, including `bytes`, is rejected.

**Client → server**

| Type | Payload | Who |
|---|---|---|
| `hello` | `role` `storyboard` or `device`; `clientLabel`; `formFactor` `mac`, `ipad` or `phone`; optional `token`; optional `joinCode` | Story board: mac, and neither token nor code. Device: iPad or phone, and a code or a token. |
| `hold` | `hunter`, `action` `take` or `release` | Device socket only (step 7). |
| `control` | `promptId`, `action` one of `begin`, `continue`, `pause`, `resume`, `tower-connect`, `tower-calibrate` | Device socket only (step 7). First arrival wins (step 5). |

**Server → client**

| Type | What it carries |
|---|---|
| `welcome` | `clientId`, `role`, `token`, `channels`, `versions`. A story board channel list is exactly `["storyboard"]`. A device lists `ipad:<hunter>` for each hunter it holds at hello, or an empty list when it holds nobody, and never `storyboard` (D16). The token is bound to that role: a storyboard token cannot `hello` as a device, and a device token cannot open the story board. |
| `error` | `code` one of `invalid-json`, `invalid-envelope`, `unknown-type`, `invalid-payload`, `invalid-state`, `private-on-storyboard`, `storyboard-control`. |
| `storyboardState` | Stage `lobby`, `playing` or `paused`; public hunters and holders; join code and URL; one prompt; the shared moment (text, still, fallback audio asset); pause banner; tower snapshot; start gate; lock. |
| `deviceState` | Held hunters, one view each, private moment text for that hunter only, the same prompt and lock, and whether this device won. Beside that lock: the tower snapshot, the pause prompt id, the connect and calibrate locks, and the public roster (D17). |

A losing press is a `control_presses` row with `winner: false`, not an error. The locked result is the `lock` on both states.

`storyboardState` rejects a `.private.` moment id, any string containing `ipad:`, and the keys `privateMoment`, `bytes`, `raw`, `packet`, `capabilityId` and `params`. A shared line may contain the word "private". Fallback audio is an asset id on the shared moment. R1 plays that fallback from the Mac only; the private view has no audio field.

Begin is open only when `unheld` is empty. A paused stage has a pause banner; any other stage does not.

Tower snapshot: `connection` is `unavailable`, `disconnected`, `connecting` or `connected`. Battery and calibration are `{ state: "unavailable" }` or `{ state: "known", ... }`.

Health: `{ protocol: 1, tower: "connection-only", effects: "none" }`.

## 4. Pack schema

`pack.ts` is the assembled pack (the loader in step 3 reads YAML or JSON files and hands one object here). It interprets metadata (§1), hunters and cast (§2), nights (§3.1), set pieces (§3.3), moments and targets (§4), cues (§6), asset manifest entries (§13) and stats/timing hooks (§14).

Rules the schema enforces, with the id in the issue message (`packIssues` maps an untagged Zod failure to V-1, and a missing cue `screen` or `fallback_sfx` to V-8):

| Rule | What fails |
|---|---|
| V-1 | A required field missing, an unknown key, a duplicate id, players min above max, an empty ambient map, a still or clip with no asset. |
| V-2 | An asset id that is a path; a missing manifest id; a set-piece or night ref that is not declared; a cue named by a moment that is not in the pack; a speaker who is not a hunter or a cast member. Item refs, `phase_moments`, and a phase `on_event` are not resolved in R1. |
| V-3 | A moment id outside the §4.1 grammar, or a scene prefix that is not a set piece id. `scene.private.hunter` is not valid: the moment part is required, as in `scene.02.private.hunter`. |
| V-4 | `.private.<hunter>` whose hunter is not declared, or whose target is not `ipad:<hunter>`. A shared moment targeted at one hunter. A private asset whose manifest target is `storyboard`. |
| V-5 | A `~no-<hunter>` variant whose hunter is not declared. A missing variant is not a load error. Which variant plays is step 5, not the schema. |
| V-8 | A story cue whose `drums` is not `none`, unless `base_game` is true. Screen and fallback are required asset ids. |
| V-20 | The word `random`, or a `seed(...)` call that does not name a table id. The kingdom value `seed` is the format's seeded-order keyword and is allowed. |

`stats.timing.marks` is the literal `auto`. A pack does not author timing rows.

## 5. Timing rows

TypeScript `TimingMark` and the SQLite columns step 4 will create:

| TypeScript | SQLite | Notes |
|---|---|---|
| `sessionId` | `session_id` | The game row. |
| `kind` | `kind` | `phase`, `moment`, `pick`, `table-talk`, `battle-screen`, `cue`, `pause`. |
| `subject` | `subject` | Id of the phase, moment, pick, cue or pause. |
| `startMonoMs` | `start_mono_ms` | Finite, ≥ 0. Not a Date. |
| `endMonoMs` | `end_mono_ms` | Null while open. |
| `startWall` | `start_wall` | UTC `Z`. |
| `endWall` | `end_wall` | Null while open. Set and cleared with `endMonoMs`. |
| `deviceId` | `device_id` | Null when the mark is not one device's. |
| `cause` | `cause` | Pause only. |
| `hunter` | `hunter` | Required for a pick, and for an `unheld-hunter` or `disconnect` pause. Null for a host pause. |
| `result` | `result` | `won` or `lost` when a battle screen is closed. Null while it is open. |

`pausedMillis` merges overlapping pauses. `activeMillis(total, marks)` is `total - paused`, or null when a pause is open or the total is shorter than the pauses. It does not clamp that disagreement to zero.

## 6. Tower safety

Copied here so the app spec states them. The host wires the port from step 6. A winning press is the only call.

- The Story board and the devices do not talk to the tower. The Mac host will, as a client of tower-poc. Outbound messages are `hello`, `connect` and `calibrate` only (D10). It does not send `command`.
- No bloodtower message carries raw bytes.
- Nothing physical happens automatically: no auto-calibrate, no auto-reconnect, no automatic retry.
- Mechanics that need calibration stay unavailable until a person calibrates. R1 does not offer mechanics.
- Unknown tower values are `unavailable`, never zero.
- R1 sends no light, sound, drum, seal or skull command. `DIAG_LOG` is for a later hardware session.

## 7. Traceability

"Proved now" is a test in this branch. "Later" is the step that finishes the requirement. A row with no "proved now" test is not claimed by this PR.

| Requirement | Step | Proved now | Later |
|---|---|---|---|
| R-ENG-9, app layout | 1 | `pnpm check`, `pnpm build`, `src/e2e/tests/smoke.spec.ts` | — |
| R-ENG-1 | 3 | `src/server/pack/load.test.ts` loads `packs/test/` and does not run `choices` | — |
| R-ENG-10 | 3 | `load.test.ts` lint lines name the file, path and rule | — |
| R-ENG-11 | 3, 4 | `engine.test.ts` stores pack version `0.1.0` on the session row | A warning when a pack version changes is later |
| V-1, V-2, V-3, V-4, V-5, V-8, V-20 | 1 schema, 3 files | `pack.test.ts` and one bad pack per rule in `load.test.ts` | — |
| PRD-41 | 1 types, 4 rows | `timing/log.test.ts` reconstructs a sample run from SQLite | The timing report script is step 10 |
| R-STA base rows, R-DEV-9 device/holding stats | 4 | `db/store.test.ts` round-trips devices and holdings | The stats summary is out of scope |
| V2-2 first press | 5, 7 | `engine.test.ts` and `hub/host.test.ts`: two presses, one winner, both rows stored | — |
| R-DEV-4, V-4 at runtime | 5, 7 | `engine.test.ts` and `hub/host.test.ts`: storyboard frames have no private line and no `ipad:` | — |
| R-WIZ-11 start gate | 5 | `engine.test.ts`: Begin stays closed until every hunter is held | — |
| E15 presence | 5 | `engine.test.ts`: `~no-delta` plays when delta is absent, and is absent when delta is present | Board movement is later |
| R-DEV-1 | 6, 7 | `hub/host.test.ts`: the host does not open the tower until a winning connect. `tower/sidecar.ts` is the client | — |
| R-DEV-5 | 6, 7 | `tower.test.ts` and `hub/host.test.ts`: a winning connect or calibrate is the only call, and the sources contain no `command` | — |
| R-ENG-7 | 6 | `tower.test.ts` mock. Health reports no effects | — |
| R-SES-2 | 6, 7 | `engine.test.ts`, `port.ts` and `hub/host.test.ts`: connect and calibrate run only from a winning press. No reconnect action (D15) | — |
| R-ENG-16, R-DEV-6, R-WIZ-10 | 7 | `hub/host.test.ts`: six-digit code, join URL, storyboard channel, device channels. `LiveBoard` draws the QR from the live state | — |
| V2-1 display only | 8 | `boardView.test.ts`: the board markup has no button, input, textarea, select or link | — |
| V2-3 prompt only, V2-8 static list | 8 | `boardView.test.ts` renders one prompt and the hunter list | Cycling the sidebar stays out of scope |
| V2-2, R-DEV-3, R-DEV-8, R-DEV-9 join | 7, 9 | `hub/host.test.ts`: two continues, one winner, both rows. `controls.test.ts`: hold and control messages, locked copy, private line, calibrate stays off until connected. A phone user agent gets the compact layout and a switch to the full one | — |
| AC-1..AC-9 | 10 | AC-1 in part: check, build, smoke, and no edit under `apps/tower-poc` or `apps/burgomaster-funeral-poc` | The rest of the acceptance list |

The plan's step 8 shorthand "V-1, V-3, V-8" is the flow rules V2-1, V2-3 and V2-8 in `apps/burgomaster-funeral-poc/docs/poc-v2-flow.md` (prompt only, static hunter list). The story-pack rules with the same numbers are the step 3 rows above. They are different checks.

## 8. Out of scope for R1

Live tower effects and the cue-to-tower map. Setup wizard beyond QR and holdings. Choices, votes, investigation, queue, replay, hunter tabs, sidebar cycling, battle status, advantages, quest tokens, dungeon, encounters, endings, the stats summary. Saves across restarts beyond holdings. The Dracula pack. Any change to `apps/tower-poc` or `apps/burgomaster-funeral-poc`.

## 9. Test pack

`packs/test/` is the proving ground from D4. Schema tests still use an inline fixture. Nothing in this app reads a Dracula id.
