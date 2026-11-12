# Brief: C3-11 / EV-19 — legacy day-clock compatibility follow-up

## Meta and authority

- Docs only. Implementation owner: **Anvil**; Wright coordinates shared files. Code waits for this brief merged to `main`, then a fresh ownership/base check below. No implementation is authorized by this document's existence on a branch.
- Sources: [original plan](./plan.md), [EV-19 and EV-20](./eval.md#ev-19--continue-shows-the-same-clock), [source approvals](./approval.md), [PR #384](https://github.com/bpaksi/bloodtower/pull/384). Original approvals/evals are unchanged; this is an additive compatibility contract, not a claim that #384 is complete.
- Adopted ruling (Warden relay of Bob, 2026-11-08 America/Detroit; recorded verbatim in substance, no additions):
  1. An old checkpoint with no clock data loads. Keep all saved state: day number, gold, corruption, positions and quests.
  2. The clock restarts at the beginning of the saved day. No inferred time used and no reconstructed history.
  3. Show one notice on the Story board and the iPad: "This save is from before the day clock. Today's clock starts fresh." Then mark the checkpoint as having a clock.
  4. Never reset the day or advance to a new one because of this.
  5. If the day can't be read, Continue fails with a stable coded error and offers New story. It never silently starts a new game.
- Base traced: `be0dc50c` (2026-11-08 11:54 AM EST), rebased onto `main` `57b2d932b3886d8fcf5d80fdc70f8e9b56bd9d08` (2026-11-09 7:06 AM EST; #397 is docs-only, so every line anchor below is unchanged). Main already includes #391 at `22c8bdb` (capture/restore clock plus `dayClockContinue.test.ts`). Do not reimplement its passing new-save path or treat #384's older failure report as current main.
- Exclusions: every other #384 `test.fixme` / blocked EV (effects wait, seed hook, split/use-item, corruption names; rulings 1–5) and the entire #393 chapter lane (`engine/loops/chapter/**`, chapter snapshot/restore) are out. Not touched, not weakened, not unblocked here.
- Scope: compatibility only. No dependencies, network feature, tuning amounts, gameplay feature, unrelated fixmes, effects waits, seed hooks, item/split work, chapter integration, or #393 lane. No art assets or new mockup approval claimed; reuse existing status/notice presentation without changing the approved screen layout.
- Done (publication): docs PR opened, checks reported; completeness review and merge are prerequisites for Anvil's code PR, not accomplished by this local commit. If push is unavailable, deliver commit and `/workspace/C3-EV19-brief.patch` to Wright to publish.

## Cutover

Cutover: N

- Add a bounded upgrade for readable, supported checkpoints lacking day-clock data; no save-format purge, schema-version reset, broad historical migration, renamed gameplay action, or automatic New story.
- Keep existing pre-C3 format rejection separate (`server/hub/host.ts:205–223`, Q-C3-07). This brief does not override its approved format boundary; missing clock alone is not a reason to discard an otherwise supported checkpoint.

## Survival invariants

- **New save:** a clock-bearing checkpoint round-trips the whole `DayClock` exactly (supply incl. 0, skulls per building, held, log, pending drops/kingdoms, resume), with no notice.
- **Legacy upgrade:** the same saved day (`play.dayNumber` in `stateJson`) and all non-clock state survive; only the absent clock starts fresh.
- **No replayed drops:** neither the upgrade nor any later Continue/new host re-applies a drop already recorded; the next drop applies exactly once.
- Preserve every saved non-clock game field, including day number, seed/RNG cursor, gold, corruption, positions, quests, game identity, loop/press progress and already-applied effects. Restarting the missing clock is not restarting gameplay, rerunning Begin/Regroup, rerolling spent moves, or granting resources.
- Legacy only: initialize the absent clock at its fresh start using the game's applicable tuning. Do not subtract inferred past days/drops, call log reconstruction to invent clock history, or pretend absent historical skull data was recovered. Preserve any actual saved non-clock state; missing data is not evidence it was zero in history.
- Valid clock-bearing saves retain the entire clock exactly, including depleted/zero supply, building skulls, held skulls, logs, pending drops and resume data; never take the legacy path for malformed present clock data. No truthiness-based fallback from a corrupt clock to a fresh one.
- The migration notice is a single shared upgrade episode on board and iPad, not a toast per render, poll, reconnect, or repeated Continue. Persist the clock-bearing/show-once marker with the upgraded checkpoint so a new host cannot upgrade or notify again. Keep transient presentation separate from the durable consumed marker; do not save a pending notice that reappears forever.
- A failed read/validation/write leaves the original checkpoint and game intact. Do not report success or consume notice state before durable upgrade succeeds. Maintain the checkpoint's event watermark consistently with the restored state: neither replay pre-checkpoint drops nor skip post-checkpoint events by moving the watermark alone.
- An unreadable/missing/invalid saved day or corrupt required clock/checkpoint data fails closed. Keep the user on a recoverable screen, expose a stable coded error on board and pressing iPad, and offer New story as an explicit action. No fallback to day 1, no silent replacement autosave, no automatic navigation into a new game.

## Done-when (e2e)

Mapping to the adopted evals: **Eval 1** (old save resumes same day, full clock, notice exactly once) = C1 + C5; **Eval 2** (new save round-trips exactly) = C2; **Eval 3** (corrupt or day-less save gets the coded error) = C3; **deterministic checks** (Continue -> new host -> Continue again -> next drop, no replayed drops) = C4.

- [ ] EV19-C1 legacy: create a real supported clock-less checkpoint on a day later than 1 with non-default gold, corruption, positions, quest progress and seed/cursor. Continue through the actual host. Assert the same day/all saved non-clock state, full fresh clock, no inferred history, and exactly the locked notice on board and iPad. Assert no day-start/Begin/drop effect is replayed as a side effect of migration.
- [ ] EV19-C2 new save: run original EV-19 unchanged (quit on day 3, Continue: same days-left and building skulls). Round-trip **all** clock fields exactly across JSON/checkpoint/new host, including zero/depleted supply and pending partial multi-drop state. No legacy notice for a valid clock-bearing save. Retain #391's `dayClockContinue.test.ts` regression.
- [ ] EV19-C3 fail closed: test missing day, malformed/non-finite/non-integral day, unreadable checkpoint and malformed present clock. Continue returns a stable code (reuse existing `invalid-state`), visible on board/iPad; New story is offered and works only after explicit press and existing replacement confirmation where applicable. Original save bytes/state remain unchanged before that explicit replacement. Never substitute `checkpoint?.day ?? 1` for validation of the saved game's day.
- [ ] EV19-C4 durable once/control sequence: legacy Continue -> verify one notice episode on each surface and durable clock+consumed marker -> stop/recreate host against the same store -> Continue again -> no notice, same day/clock/RNG/positions/quests -> advance to the next drop. Compare to a control run branched from the just-upgraded checkpoint with no intervening restart. Next kingdom/building/result, RNG cursor, supply delta, skull counts and drop/event counts match; each new drop applies exactly once. With a valid new save run the same sequence against an uninterrupted seeded control. Cover a 3–4 hero two-drop night and an already-recorded first drop: only the remaining drop is pending.
- [ ] EV19-C5 repeat/failed persistence: repeated Continue does not freshen the clock twice or append repeated notice episodes. Inject upgrade persistence failure: stable error, original checkpoint intact; retry recovers once after persistence works. Ordinary view refresh does not dismiss one audience before the other has its notice episode.
- [ ] Original EV-20 remains green (gear closed/unpaused/toolbar restored). Other #384 fixmes stay held, with their current meanings; do not remove or weaken them to pass this slice.
- [ ] Verifier records base/head, exact tests and results, board 1920×1080 + iPad 768×1024 notice/error/recovery evidence, PR URL and full checks. No claim that fresh docs checks satisfy these implementation evals.

## AREA / DEC checklist

- [x] DEC-686 / AREA-097 / AREA-099: original day-clock rules and amounts remain approved; this follow-up only fills the legacy compatibility hole.
- [x] DEC-675 / DEC-217: saved day/state and deterministic continuation preserved; no guessed history or replayed drops.
- [x] DEC-208: retain checkpoint/event replay semantics; the upgrade needs a consistent durable snapshot and watermark, not a changed replay policy.
- [x] Warden-adopted 2026-11-08 ruling: compatibility policy and notice text locked above; no additional Bob product decision inferred.
- [x] Error code plumbing: existing `invalid-state` (`protocols/v2/server.ts:45–56`) is sufficient; no new protocol error enum required. Catch Continue failures at the request boundary, not only the generic queue logger.
- [x] Recovery wording: use **New story** for this failure's explicit recovery offer only, routing to existing `new-game` action and replacement safeguards. Do not globally rename approved **New game** labels or change its behavior (DEC-709). Board mirrors this as display-only, iPad supplies the action.
- [x] Q-C3-07: existing pre-C3 format boundary not broadened here. A new product request to migrate unsupported formats belongs to Warden, not Anvil.
- [x] #393: chapter features/persistence are out of scope; Wright owns conflict coordination. Stop and report if the narrow fix genuinely requires chapter edits.
- [ ] Pre-implementation ownership gate — **Wright + Anvil**, after this brief merges: refresh main and both PR heads/file lists, compare to the recorded snapshot, agree shared-hunk ownership (especially #384 views/e2e), record code-branch base/head on the implementation PR. Do not code from these line numbers without rechecking. No outstanding product decision is being silently delegated by this checkbox.

## Locked copy

| Context | Audience | Exact copy / behavior |
|---|---|---|
| Successful clock-less-save upgrade, once | Story board and iPad | This save is from before the day clock. Today's clock starts fresh. |
| Continue validation failure | Board error and pressing iPad banner | Show stable code `invalid-state`; factual failure explanation, no claim of recovery or reconstructed history. No new narrative line is approved here. |
| Explicit recovery offer after failure | iPad action; board display-only mirror | New story |

- No spoken line, Begin/Pick beat, audio, countdown, or extra acknowledgement button added. Notice does not replace day information, cover required controls, pause/advance the game, or create a fresh gameplay loop. Preserve original approved copy everywhere else.

## Trace by requirement (exact lines, base `57b2d932`)

- **Story board notice:** `web/components/board/CoreStoryBoard.tsx:57–61` (status slot beside `bt-board-warning`; play board has no notice today) and `StartupBoard.tsx:312–318` if Continue lands on the session screen; data via `engine/views/state.ts:80–94` -> `engine/views/project.ts:60–78` -> `protocols/v2/views.ts:121–134` (strict board schema; no notice field today). `server/hub/host.ts:273–298` toasts only `level === "error"`, so it cannot carry this informational notice.
- **iPad notice:** `web/components/device/CoreDeviceScreen.tsx:767–774` (beside `DeviceErrorBanner`), data via `engine/views/project.ts:103–121` -> `protocols/v2/views.ts:181–234` (strict device schema).
- **Persisted show-once / has-clock marker:** shell state `engine/loops/session/state.ts:111–168` (type) and `201–266` (defaults); serialized in `server/core/serialize.ts:12–17, 40–58`, restored/defaulted in `75–117` (today `dayClock` absent and `null` are not distinguished, line 36); written by `server/core/session.ts:172–187` (`writeStateCheckpoint`). Note both state-checkpoint writes record row `day: 0` (`session.ts:158, 178`): the saved day's source of truth is `play.dayNumber` in `stateJson`, not the row column.
- **Coded error + New story path:** validation at `server/core/shellCheckpoint.ts:22–30` and `server/core/serialize.ts:75–117`; Continue applied at `server/core/session.ts:271–305` (a throw here today escapes to the generic `core-apply` logger at `388–397` with the screen already set to `play` by `hub.ts:123–130`); board/iPad delivery reuses `session.ts:336–356` + `host.ts:184–190` with existing `invalid-state` (`protocols/v2/server.ts:45–56`); recovery offers from `engine/loops/session/hub.ts:84–120`, explicit replacement `hub.ts:156–161` / `250–265`; label `engine/loops/session/view.ts:72–75` (recovery-only "New story"); startup path `server/hub/host.ts:205–224` (`checkpoint?.day ?? 1` must not mask a bad day) and `session.ts:544–560`.

## Exact implementation Touches and trace

All paths below are repository-relative. Line anchors are on the traced main base unless noted; they identify responsibilities, not mandatory implementation mechanics. Only the narrow responsibilities below are permitted. This docs PR changes **only this file**.

| Path | Trace / reason |
|---|---|
| `apps/bloodtower/src/engine/loops/day/clock.ts` | 29–101, 256–280: WeakMap clock, fresh clock and capture/restore/resume; add bounded missing-clock initialization without resetting valid/depleted clocks or rebuilding history. |
| `apps/bloodtower/src/server/core/serialize.ts` | 12–17, 34–58, 75–117: optional `dayClock`, restore hook, checkpoint serialization; preserve full new clock, serialize durable upgrade/consumed state. |
| `apps/bloodtower/src/server/core/shellCheckpoint.ts` | 22–30: actual checkpoint parse/validation boundary; validate required saved day and distinguish absent clock from malformed present data. |
| `apps/bloodtower/src/server/core/shellContinue.ts` | 53–89, 99–106: parse plus post-watermark replay / startup read. Upgrade only at correct Continue boundary; preserve event position and no replayed drops; startup inspection must not consume the notice. |
| `apps/bloodtower/src/server/core/session.ts` | 148–186 checkpoint writes; 271–305 Continue application; 329–355 board/device error delivery; 544–560 startup-read catch. Coordinate durable upgrade+show-once marker, recover Continue errors explicitly instead of leaving `play` active or only logging `core-apply`. |
| `apps/bloodtower/src/server/hub/host.ts` | 205–224: autosave loading currently defaults missing checkpoint day to 1; never let that conceal unreadable saved game day. 184–190, 265–298: existing device error and board error-toast transport, reused (successful notice is not logged as an error). |
| `apps/bloodtower/src/engine/loops/session/state.ts` | 111–168, 201–266: checkpointable shell state / initial defaults; bounded persistent consumed marker plus transient notice/recovery state, initialized for older rows. No chapter state. |
| `apps/bloodtower/src/engine/loops/session/hub.ts` | 72–119, 122–161, 250–265: Continue/New game offers and explicit replacement path. Return failed Continue to recovery offers, never invoke New game automatically; retain original autosave until explicit replacement. |
| `apps/bloodtower/src/engine/loops/session/view.ts` | 72–75, 350–405, 517–593: recovery-only New story label, board session levels and public projection of one upgrade episode. Shared with #384; do not overwrite its day fields. |
| `apps/bloodtower/src/engine/views/state.ts` | 80–94: shared view data for the public notice/recovery, absent for ordinary saves. |
| `apps/bloodtower/src/engine/views/project.ts` | 60–78, 103–121: carry the same public notice identity/text to board and device; preserve private-channel filtering. |
| `apps/bloodtower/src/protocols/v2/views.ts` | 121–148, 181–234: strict wire payload schemas currently have no informational notice field; admit bounded optional notice/recovery projection on both audiences without loosening strictness. Shared with #384. |
| `apps/bloodtower/src/web/components/board/CoreStoryBoard.tsx` | 32–61, 104–110: board play renderer; add visible status notice (not only hidden `levels`). Shared with #384. |
| `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx` | 499–506, 759–810: iPad notice and existing recovery-action rendering. Shared with #384; preserve day controls/toolbar. |
| `apps/bloodtower/src/web/lib/startupBoard.ts` | 190–220: session-board model derives rows from projected levels; carry recovery-only label rather than globally renaming New game. |
| `apps/bloodtower/src/web/components/board/StartupBoard.tsx` | 312–318: recovery session rows currently hard-code New game; mirror recovery-only New story, still no board buttons. |

Tests (exact paths; no wildcard implementation scope):

- `apps/bloodtower/src/engine/loops/day/day.test.ts` — fresh legacy clock / valid exhausted clock / same day / next-drop determinism.
- `apps/bloodtower/src/server/core/serialize.test.ts` — whole-clock round-trip, legacy marker, corrupt/day-less input.
- `apps/bloodtower/src/server/core/dayClockContinue.test.ts` — retain/extend existing #391 capture/restore regression.
- `apps/bloodtower/src/server/core/enterResume.test.ts` — real store, startup read vs Continue, failure recovery, durable once/new-host/repeat-Continue/next-drop and failed-write sequence.
- `apps/bloodtower/src/server/hub/host.test.ts` — startup day fallback guard and board/iPad coded error transport.
- `apps/bloodtower/src/engine/loops/session/shell.test.ts` — failed Continue recovery offers, explicit replacement path, no new-game auto-start.
- `apps/bloodtower/src/engine/views/project.test.ts` — same public notice to both audiences, private content still refused.
- `apps/bloodtower/src/protocols/v2/schema.test.ts` — strict optional notice/recovery wire validation and old views still accepted.
- `apps/bloodtower/src/web/components/board/CoreStoryBoard.test.ts` — visible notice without controls/flow changes.
- `apps/bloodtower/src/web/components/device/CoreDeviceScreen.test.ts` — visible notice and New story recovery button.
- `apps/bloodtower/src/web/lib/startupBoard.test.ts` — recovery-only board label, ordinary New game unchanged.
- `apps/bloodtower/src/e2e/tests/c3-day.spec.ts` — original EV-19 plus compatibility cases above, board/iPad evidence. **Path correction:** this is #384's real path (on its head); `apps/bloodtower/e2e/tests/c3-day.spec.ts` is not the repository convention. Coordinate landing base with Wright; do not import other #384 fixmes into this slice.

Read-only hazards, not extra Touches: `engine/loops/day/loop.ts:139–162` increments the day on ordinary entry; use the saved loop progress/resume contract rather than resetting to an ordinary enter. `protocols/v2/server.ts:45–56` already permits `invalid-state`; `server/hub/host.ts:273–298` toasts only errors, so it cannot by itself deliver a successful informational notice. If more production files prove necessary, Anvil reports exact path/reason to Wright before widening, not an open-ended `**` grant.

## Collision gate (pre-implementation step; base + current snapshot)

- Snapshot read 2026-11-09 7:06 AM EST from GitHub PR metadata and full file lists, against `main` `57b2d932`. All three open. Author account `bpaksi` on all; runner ownership is Wright's to confirm, not inferred here.
- #384 feat(bloodtower): C3-11 day on the board (draft): base `2be9c0de`, head `90f4ca18` (`feat/c3-11-day-on-the-board`), 15 files:
  - `apps/bloodtower/plans/briefs/C3/11-day-on-the-board/evidence/ev06-board-mid-turn.png`
  - `apps/bloodtower/plans/briefs/C3/11-day-on-the-board/evidence/ev06-board-roll.png`
  - `apps/bloodtower/plans/briefs/C3/11-day-on-the-board/evidence/ev06-ipad-mid-turn.png`
  - `apps/bloodtower/plans/briefs/C3/11-day-on-the-board/evidence/ev06-ipad-roll.png`
  - `apps/bloodtower/plans/briefs/C3/11-day-on-the-board/plan.md`
  - `apps/bloodtower/src/e2e/tests/c3-day.spec.ts`
  - `apps/bloodtower/src/engine/loops/session/view.ts`
  - `apps/bloodtower/src/engine/views/day.test.ts`
  - `apps/bloodtower/src/engine/views/day.ts`
  - `apps/bloodtower/src/engine/views/state.ts`
  - `apps/bloodtower/src/protocols/v2/views.ts`
  - `apps/bloodtower/src/web/components/board/CoreStoryBoard.tsx`
  - `apps/bloodtower/src/web/components/board/DayPanels.tsx`
  - `apps/bloodtower/src/web/components/board/board.css`
  - `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx`
- #393 C3-09: chapter loop: base `275ddf66`, head `6a5de610` (`agent/j-20261106-00c7`), 4 files:
  - `apps/bloodtower/src/engine/loops/chapter/chapter.test.ts`
  - `apps/bloodtower/src/engine/loops/chapter/chapters.ts`
  - `apps/bloodtower/src/engine/loops/chapter/loop.ts`
  - `package.json`
- #398 feat(bloodtower): A1-2 assets:needs, pack to asset-studio job: base `57b2d932`, head `c604cffe` (`feat/bloodtower-a1-assets-needs`), 21 files:
  - `apps/bloodtower/package.json`
  - `apps/bloodtower/plans/A1-asset-adapter.md`
  - `apps/bloodtower/spec.md`
  - `apps/bloodtower/src/assets/index.ts`
  - `apps/bloodtower/src/assets/needs/authoring.ts`
  - `apps/bloodtower/src/assets/needs/build.ts`
  - `apps/bloodtower/src/assets/needs/cli.ts`
  - `apps/bloodtower/src/assets/needs/deps.ts`
  - `apps/bloodtower/src/assets/needs/fixtures.ts`
  - `apps/bloodtower/src/assets/needs/issues.ts`
  - `apps/bloodtower/src/assets/needs/job.ts`
  - `apps/bloodtower/src/assets/needs/main.ts`
  - `apps/bloodtower/src/assets/needs/needs.test.ts`
  - `apps/bloodtower/src/assets/needs/protocols.ts`
  - `apps/bloodtower/src/assets/needs/source.ts`
  - `apps/bloodtower/src/assets/package.json`
  - `apps/bloodtower/src/assets/tsconfig.json`
  - `apps/bloodtower/src/assets/vitest.config.ts`
  - `apps/bloodtower/src/web/package.json`
  - `package.json`
  - `pnpm-lock.yaml`
- Overlap with this brief's Touches: **#384** shares `engine/loops/session/view.ts`, `engine/views/state.ts`, `protocols/v2/views.ts`, `web/components/board/CoreStoryBoard.tsx`, `web/components/device/CoreDeviceScreen.tsx`, `e2e/tests/c3-day.spec.ts` (all under `apps/bloodtower/src/`). **#393**: no path overlap; chapter/day boundary is semantic adjacency only and stays excluded. **#398**: no path overlap (its root/web `package.json` and `pnpm-lock.yaml` are not touched here; this slice adds no deps).
- Gate, owner **Anvil** with Wright: after this brief merges and before the first code commit, re-read main and the file lists of #384, #393, #398 (and any newer open PR), record base/head of each plus the code branch base on the code PR, and get Wright's hunk-ownership call for every shared file (default: land after #384 or rebase onto it; never overwrite its day fields/fixmes). Any new overlap stops coding until Wright reconciles it.

## Verification / handoff

- Design gaps: none within the adopted ruling. Do not expand it into offline exactly-once delivery guarantees or a global New game rename. If preserving actual legacy state requires a semantic choice not resolved by the ruling (rather than mechanical persistence/plumbing), stop and route it Anvil -> Wright -> Warden.
- Owner: **Anvil** (implementation, after merge + collision gate). Gamewright owns this brief only.
- Fresh docs and normal-check results are reported with the commit/patch handoff. Implementation e2e checks above remain unchecked until Anvil builds after merge.
