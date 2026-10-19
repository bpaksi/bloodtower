# Control runbook (Story board menu)

Bob runs **Control** on the Mac in Claude Code, **one step per branch**, after **Visuals step 11** merges. **Devices** is a separate feature (see [Devices (later)](#devices-later-detail-after-control-merges)); do not mix device-menu work into Control PRs.

Wright tracks progress here: update **Status** and **PR #** when a step opens or merges.

**Related plans:** `apps/bloodtower/plans/visuals-runbook.md` (must finish first), `apps/bloodtower/plans/shell-prompts.md` (Sound dialog and tower volume test — board-local or device-only today).

---

## Scope summary (Control only)

Control delivers the **Story board Menu** (R3-UI-39): Mac mouse/keyboard access when every iPad has dropped (R2-104), with the same **first-press-wins** logging as devices (R2-04), using a synthetic press device id `board`. It extends the D7 “display only” rule the same way `keeper-line-ended` did (Gamewright PR #21, documented in `spec.md` and `src/protocols/messages.ts`).

| Item | What | Primary sources |
|---|---|---|
| Board Menu chrome | Corner **Menu** control + **Esc**; top-left per mock (§2.9) | R3-UI-39; `research/game-design/mockups/2026-10-17/v2-mac.png` |
| Abandon / Save and quit | Three-way confirm (Save and quit / Abandon / Keep playing); Keep playing default | R2-64; R3-UI-39; `research/game-design/r2-screen-flow.md` §3.6 |
| Resume | Ends host pause from the board when legal (same lock as device Resume) | R3-UI-39; R2 pause menu (`pause` / `resume` in `control.ts`) |
| Replay last video | Replays the last full-screen visual with zoom; no game-state change beyond a replay counter | R3-UI-34; Visuals steps 10–11 (`isVisualMoment`, zoom layer) |
| Reconnect tower | Explicit reconnect from menu (no auto-reconnect) | R3-UI-39 tower info; R2-23; `spec.md` D5, D15 deviation |
| Debug overlay toggle | R3-UI-40 overlay off by default; toggled from menu (not only `?debug=1`) | R3-UI-40; shell step 7 note in `shell-prompts.md` |
| Read-only menu rows | Tower state / battery / calibration; app build + pack version | R3-UI-39; R3-UI-63 tower info (volume **change** stays Connect Tower + Devices Control menu) |

**Explicitly not Control (other tracks):**

| Item | Where |
|---|---|
| iPad/phone Control menu (Menu on every screen, go back, change holdings, captions toggle, Mac audio sliders, tower volume picker) | **Devices** (later) — R3-UI-38, R3-UI-37, R3-UI-33b, R3-UI-63 |
| Action-needed top dialogs (tower lost / hunter disconnected) | **Devices** (later) — R3-UI-35, R3-UI-36 (supersedes R2-66) |
| Sound dialog, startup visuals, visual zoom, Keeper cinema | **Visuals** — `visuals-runbook.md` |
| Saved-game **resume cards** on Pick Game (full R2-41 persistence) | Open question below; may be minimal session snapshot in Control step 4 |

---

## Local PR review

The loop is `docs/sdlc.md` §4 "Review loop": one Opus attack in round 1, Sonnet fix-checks in rounds 2 and 3, reviewers trust CI, and only the blockers listed there block. After round 3 with blockers left, add the `needs-bob` label.

**`Done when` for every step below:** the step's numbered items, its `Tests:` line and the hard constraints. Viewports are exactly the ones the step names. Anything else a reviewer finds is a non-blocking follow-up.

**Standing checks for this track:** only whitelisted board actions are accepted and a device cannot spoof the `board` device id; the D7 text in `spec.md` and `messages.ts` stays accurate; camera tracks (#78), audio layers (#83) and the Visuals zoom and Keeper layers still work; the board button allowlist in the acceptance tests changes only on purpose.

**Merge rule:** Bob authorized merging this track when the latest review ends `Blocking: none` on the PR's head sha and CI is green:

```bash
gh pr merge <N> --squash --match-head-commit <sha>
```

**Round 1, attack (paste into Claude Code):**

```text
Run the adversary-bugs agent (Opus) on PR <N>, round 1. Step prompt: apps/bloodtower/plans/control-devices-runbook.md §<step>; use its "Review focus" line and the track's standing checks. Follow docs/sdlc.md §4: trust CI (no pnpm install, pnpm check or full e2e); prove suspicions with single spec files or a throwaway probe in a separate worktree, then remove it; block only on the §4 list; post under about 1,500 characters ending with "Blocking: none" or "Blocking: <n>".
```

**Fix (developer, Sonnet):**

```text
Fix the blocking findings in PR <N> (head <sha>) and nothing else; rerun pnpm check and only the affected spec files; push; reply on the PR with one short comment: finding -> commit.
```

**Rounds 2 and 3, fix-check:**

```text
Run the adversary-bugs agent with model sonnet on PR <N>, round <r>, last reviewed sha <sha>. Fix-check only (docs/sdlc.md §4): read the open blocking findings and git diff <sha>..HEAD; confirm each is fixed and nothing next to it broke; no new hunting. Post under about 1,500 characters ending with "Blocking: none" or "Blocking: <n>".
```

---

## Status

| Step | Branch | Depends on | Lane | Status | PR # |
|---|---|---|---|---|---|
| 1 | `feat/control-01-board-press-contract` | Visuals **11** merged; rebase `main` | Contract + hub | todo | |
| 2 | `feat/control-02-menu-chrome` | 1 | Board web | todo | |
| 3 | `feat/control-03-resume` | 2 | Engine + web | todo | |
| 4 | `feat/control-04-quit-confirm` | 2 | Engine + web + db | todo | |
| 5 | `feat/control-05-replay-last-visual` | 2; Visuals **10–11** merged | Engine + web | todo | |
| 6 | `feat/control-06-reconnect-tower` | 2 | Engine + tower port | todo | |
| 7 | `feat/control-07-debug-overlay` | 2 | Board web | todo | |

**Start rule:** Step 1 begins with `git fetch origin main && git rebase origin/main` after **Visuals step 11** is on `main`. Until then, read-only prep on a draft branch is fine; do not merge Control before Visuals 11.

## Parallel lanes (file ownership)

Control is mostly **one step at a time**: steps 1 and 4–6 all touch `engine.ts` / `host.ts` / `control.ts`. Steps 2 and 7 are web-heavy but should still land **after step 1** so the menu never sends illegal messages.

| Lane | Order | Files touched | Parallel with |
|---|---|---|---|
| **Contract + hub** | 1 only | `spec.md`, `src/protocols/{messages.ts,control.ts,messages.test.ts}`, `src/server/hub/{host.ts,host.test.ts}`, `src/web/lib/session.ts` (send path) | Nothing |
| **Board web** | 2 → 3/4/5/6/7 UI halves | `src/web/components/board/{LiveBoard.tsx,StoryBoard.tsx,BoardMenu.tsx}`, `board.css`, `src/e2e/tests/{acceptance.spec.ts,sound-dialog.spec.ts,board-menu.spec.ts}` | **Honest:** only step 7 can run parallel to 4–6 **if** 4–6 do not edit `LiveBoard.tsx` / `BoardMenu.tsx` on the same lines — default **serialize 3 → 4 → 5 → 6 → 7** |
| **Engine + tower** | 3, 4, 5, 6 | `src/server/session/{engine.ts,engine.test.ts}`, `src/server/tower/port.ts`, optional `src/server/db/*` for save snapshot | One PR at a time |
| **Replay + Visuals** | 5 after Visuals 10–11 | `LiveBoard.tsx`, `StoryBoard.tsx` visual layer hooks, `engine.ts` replay snapshot | Do not start 5 until zoom/Keeper paths exist |

---

## Open questions (Bob)

1. **Save and quit persistence (R2-41).** Options: (a) full saved session row + resume card on Pick Game; (b) minimal JSON file in `dataDir` with story, settings, night index, holdings — resume card UI stub only; (c) Save and quit ends session like Abandon but flags `saved: true` for stats only, no resume card yet; (d) defer Save and quit — ship Abandon + Keep playing first. **Blocks:** step 4 (and Devices Pick Game cards later).
2. **Board `control` vs new message type.** Options: (a) allow existing `control` from storyboard socket with hub mapping to device id `board` and a whitelist of actions; (b) new `board-control` message with the same payload shape; (c) one `board-menu` message with an enum per item. **Blocks:** step 1 only (pick one and document in D7).
3. **Replay scope.** Options: (a) last `isVisualMoment` only (still, clip, Keeper); (b) still + clip, not Keeper lines; (c) include talking-avatar Keeper with captions forced on; (d) board-only replay (Devices menu item in Devices track calls same engine hook). **Blocks:** step 5.
4. **Reconnect tower action.** Options: (a) new `tower-reconnect` control action (D15 deviation); (b) reuse `tower-connect` when disconnected with a menu-specific prompt id; (c) menu only navigates to `tower-connect` screen without play interrupt; (d) menu triggers sidecar reconnect only, no new press kind. **Blocks:** step 6.
5. **Debug overlay data.** Options: (a) board-local toggle, overlay reads existing `storyboardState` only; (b) server logs `debug-toggle` presses; (c) `storyboardState.debugOverlay` synced to devices (out of scope for Control); (d) keep `?debug=1` as override when menu toggle on. **Blocks:** step 7.
6. **All devices disconnected UI.** Options: (a) Control step 2 adds R2-104 banner + Menu only; (b) separate small PR after step 4; (c) wait for Devices responsive layout; (d) board menu enough without dedicated banner copy. **Blocks:** step 2 vs Devices step 1.

---

## 1. Board press contract (D7 extension)

**Review focus:** D7 paragraph in `spec.md` lists every board-sent type/action; hub rejects non-whitelisted storyboard `control`; `host.test.ts` proves device socket still gets `storyboard-control`; press rows use device id `board`; no change to `keeper-line-ended` semantics.

```text
Branch: feat/control-01-board-press-contract
Depends on: rebase on origin/main after Visuals step 11 (feat/visuals-11-keeper-cinema) merges.

Read CLAUDE.md, apps/bloodtower/spec.md (D7, D10, D15, D20), research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-39, R2-04), research/game-design/r2-screen-flow.md (R2-64). Code: src/protocols/messages.ts, control.ts, src/server/hub/host.ts, src/server/session/engine.ts (press logging only), src/web/lib/session.ts.

Goal: the story board may send whitelisted menu actions through the same press pipeline as iPads, logged as device "board", without opening hold/focus-story/pick/set from the board.

1. Update D7 in spec.md: keep keeper-line-ended; add the board menu exception (save-and-quit, abandon, resume, replay-last-visual, reconnect-tower, debug-toggle — exact names must match code). Note Gamewright PR #21 pattern.
2. Protocol (document in PR): either whitelist storyboard `control` messages or add `board-control` — Bob's answer to Open question 2. Payload must not carry tower raw bytes (D10). If new actions are needed (e.g. `replay-last-visual`, `tower-reconnect`), add to CONTROL_ACTIONS with zod tests.
3. Hub: storyboard socket may call the whitelisted actions only; map to engine.press("board", promptId, action, …). Device sockets unchanged. Invalid board actions → storyboard-control or invalid-state.
4. Engine: accept deviceId "board" for whitelisted actions only; record control_presses with device board. Stub handlers that return ok:false until later steps are acceptable if the PR only lands wiring + tests for one noop (e.g. debug-toggle logs only).
5. Web: session.ts send helper for board menu presses (no UI yet).

Hard constraints: Do not break keeper-line-ended. Do not change device-only actions. No automatic tower reconnect. PROTOCOL_VERSION stays 1 unless Bob approves bump (prefer additive actions only).

Tests: messages.test.ts for new actions/envelope; host.test.ts storyboard control accepted + device rejected for hold; engine.test.ts board press logged. pnpm check.

Out of scope: Menu UI, replay engine, save file, tower reconnect behavior, debug overlay UI.

Open a PR titled "feat(bloodtower): board menu press contract (control step 1)".
```

## 2. Board Menu chrome

**Review focus:** Menu top-left + Esc; acceptance allowlist = Sound dialog + Menu only; no extra board buttons; read-only tower/version rows; disabled items for not-yet-wired actions.

```text
Branch: feat/control-02-menu-chrome
Depends on: step 1 merged.

Read research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-39, §2.9 mock), docs/art-direction/game-look.md (ink panels). Visual: research/game-design/mockups/2026-10-17/v2-mac.png (menu icon top-left; debug top-right later). Code: new BoardMenu.tsx, LiveBoard.tsx, StoryBoard.tsx (mount point only), board.css (.bt-board-menu*).

Goal: every board screen shows Menu (mouse + Esc). Panel lists Abandon game, Resume, Replay last video, Reconnect tower, Statistics/Debug, Tower information, Version information — wired or visibly disabled per engine state. No confirm flows yet except close menu.

1. Menu opens/closes without sending illegal WS messages. Items that need step 3–7 call session board-press helper when enabled.
2. Update acceptance.spec.ts / sound-dialog.spec.ts "board has no buttons" rule: allow Sound dialog controls + Menu control only (R3-UI-03, R3-UI-39).
3. R2-104: when all devices disconnected, show rejoin QR copy + Menu (Open question 6). Do not block Visuals layout — use existing join aside/footer hooks.

Protocol/engine: none beyond step 1 unless Open question 6 needs a new storyboardState flag (say so in PR).

Tests: new board-menu.spec.ts — open menu, Esc closes, screenshot at 1024×594, 1180×820, 1920×1080; pnpm check.

Out of scope: device screens, action-needed dialogs, implementing resume/quit/replay/reconnect/debug logic (later steps).

Open a PR titled "feat(bloodtower): Story board Menu chrome (control step 2)".
```

## 3. Resume from board menu

**Review focus:** Resume only when host-pause and prompt matches; board Resume competes first-press-wins with devices; game state unchanged after resume; no resume during hunter-disconnect pause unless engine already allows.

```text
Branch: feat/control-03-resume
Depends on: step 2 merged.

Read r2-screen-flow.md (pause menu), playthrough-ui-notes (R3-UI-39). Code: engine.ts (pause/resume), host.ts, BoardMenu.tsx, device controls unchanged.

Goal: board Menu Resume ends a host pause the same way device Resume does.

Protocol/engine (list in PR):
- Whitelist board `resume` with the same promptId rules as devices (`resume-${pauseSerial}`).
- engine.press("board", …, "resume") calls existing closePause path when legal.

Tests: engine.test.ts host-pause resume from board; e2e: device opens Menu→pause, board menu Resume (or reverse) — one winner; pnpm check.

Hard constraints: Do not break camera tracks (#78) or audio layers (#83). No change to Visuals StoryBoard zoom attributes.

Out of scope: pause from board (devices only today), hunter-disconnect pause policy changes.

Open a PR titled "feat(bloodtower): board menu Resume (control step 3)".
```

## 4. Quit confirm (Save and quit / Abandon / Keep playing)

**Review focus:** R2-64 three-way confirm; Keep playing default focus; Abandon vs Save paths distinct; board + device both use quit lock; save persistence matches Open question 1 choice.

```text
Branch: feat/control-04-quit-confirm
Depends on: step 2 merged (serialize before 5–6 if rebasing menu).

Read r2-screen-flow.md (R2-64, R2-70), playthrough-ui-notes (R3-UI-39). Code: engine.ts quit handling, BoardMenu.tsx confirm sheet, DeviceScreen if quit confirm must mirror (device confirm may stay Devices — board-only confirm is OK if R3-UI-39 satisfied).

Goal: Abandon game from board Menu opens confirm; choices match R2-64; winning press logged as board.

Protocol/engine (list in PR):
- Board may send `quit` with option ids for save / abandon / keep (extend control payload if needed, or three prompt ids).
- Engine: Save and quit persists per Open question 1; Abandon clears session; Keep playing closes confirm with no state change.
- Stage moves to quit → stats/goodbye per existing flow screens.

Tests: engine.test.ts three outcomes; e2e board menu quit keep playing; e2e abandon reaches quit screen. pnpm check.

Out of scope: Pick Game resume card UI (unless Open question 1 = a/b), Game Stats content, device Menu quit copy polish (Devices).

Open a PR titled "feat(bloodtower): board quit confirm (control step 4)".
```

## 5. Replay last visual

**Review focus:** Replay does not advance moments or stats except replay counter; restores prior board layer state after replay; uses Visuals zoom layer; reduced-motion path; board + engine hook only (device menu replay = Devices).

```text
Branch: feat/control-05-replay-last-visual
Depends on: step 2 merged; Visuals steps 10–11 on main.

Read playthrough-ui-notes (R3-UI-34), visuals-runbook steps 10–11, src/web/lib/audio/layers.ts (isVisualMoment). Code: engine.ts snapshot of last visual moment id + exit state, LiveBoard.tsx + StoryBoard.tsx replay mode, BoardMenu.tsx.

Goal: Replay last video from board Menu re-shows the last visual with the same zoom treatment, then returns to the live state.

Protocol/engine (list in PR):
- New action e.g. `replay-last-visual` (or documented board menu message) — no game moment advance.
- Session holds `lastVisual` snapshot { momentId, kind } updated when a visual ends; replay sets `replaying: true` until board or timer ends replay (Open question 3).

Tests: engine unit test snapshot + replay counter; e2e with proving-ground still or Keeper path after visuals; screenshots 1180×820. pnpm check.

Hard constraints: Do not break camera tracks or keeper-line-ended. Do not change pack moments.

Out of scope: iPad menu replay (Devices), crossfade between queued visuals (visuals follow-up).

Open a PR titled "feat(bloodtower): replay last visual from board menu (control step 5)".
```

## 6. Reconnect tower from board menu

**Review focus:** Explicit press only; no auto-reconnect; tower-connect lock respected; optional D15 deviation documented in spec.md.

```text
Branch: feat/control-06-reconnect-tower
Depends on: step 2 merged.

Read playthrough-ui-notes (R3-UI-39 tower info), spec.md D5/D15, r2-screen-flow.md R2-23, src/server/tower/port.ts. Code: engine.ts, host.ts runTowerPress, BoardMenu.tsx, tower port.

Goal: board Menu "Reconnect" (or tower info row action) starts reconnect flow when tower disconnected — same safety as device-initiated connect.

Protocol/engine (list in PR):
- Per Open question 4: new `tower-reconnect` action and prompt id, or reuse `tower-connect` with menu prompt.
- Hub runs tower sidecar connect only on winning press; no command bytes on WS.

Tests: engine + host tests with mock tower; e2e optional with mock. pnpm check.

Out of scope: action-needed tower lost dialog (R3-UI-35), tower volume tiers (R3-UI-63), Tower Connected #94 sound (R3-UI-62).

Open a PR titled "feat(bloodtower): board menu reconnect tower (control step 6)".
```

## 7. Debug overlay toggle

**Review focus:** Overlay top-right; hidden during full-screen visual unless pinned (R3-UI-40); never shows ipad private content; toggle from menu; optional press logging per Open question 5.

```text
Branch: feat/control-07-debug-overlay
Depends on: step 2 merged.

Read playthrough-ui-notes (R3-UI-40), shell-prompts.md step 7 debug note, StoryBoard.tsx StatusStrip / VolumeLogged. Code: LiveBoard.tsx, StoryBoard.tsx, BoardMenu.tsx, board.css.

Goal: Statistics/Debug menu item toggles the R3-UI-40 overlay on the board without requiring ?debug=1.

Protocol/engine: if Open question 5 = b, board debug-toggle press logs only; if a, no server change.

1. Overlay shows: tower state, joined devices + holdings, step/scene id, night/turn if on state, last press latency, frame timing — reuse existing debug fields where present.
2. Hide overlay during cut scenes / visual layer unless user pinned (define pin in PR or defer).
3. ?debug=1 may force overlay on for dev — document behavior.

Tests: board-menu.spec.ts toggle; WS capture test optional; board-look unchanged or updated for overlay z-index. Viewports 1024×594, 1180×820, 1920×1080. pnpm check.

Hard constraints: Do not expose private moment text. Do not break Sound dialog or Menu placement.

Out of scope: device menu debug, action-needed dialogs.

Open a PR titled "feat(bloodtower): board debug overlay toggle (control step 7)".
```

---

## Devices (later) — detail after Control merges

**Do not expand this section until Control step 7 is on `main`.** Bob then copies this into a `devices-runbook.md` or continues here in a follow-up doc PR.

### Scope (Devices)

| Item | Sources |
|---|---|
| Control menu on every device screen (text **Menu**, top corner) | R3-UI-38; R2-111, R2-113; `v2-ipad.png`, `v2-iphone.png` |
| Full device menu items (go back, replay, tower info, captions toggle, join another device, change holdings, Mac audio sliders, tower volume) | R3-UI-37, R3-UI-34, R3-UI-33b, R3-UI-63, R2 pause menu; `playthrough-ui-notes-2026-10-17.md` §2.6–2.8 |
| Responsive phone + iPad layouts, large choice buttons, hunter row when who acts | R3-UI-50, R3-UI-51, R3-UI-52, R3-UI-53 |
| Action-needed blocking dialogs (tower lost, hunter disconnected, combined) | R3-UI-35, R3-UI-36; supersedes R2-66 |
| Devices never play audio/video | R3-UI-51; reverses spec D22 phone layout note via R3-UI-50 |

Gamewright / R2: R2-64 quit confirm on devices, R2-65 rejoin clears pause, R2-104 all devices dropped (board side in Control), R2-100 private lines on holder device only.

### Draft step list (Devices)

1. **Device menu shell** — `DeviceScreen.tsx`, shared menu component, R3-UI-38; viewports phone + iPad widths in e2e.
2. **Device pause menu actions** — Resume, join QR hint, change holdings entry (hold flow unchanged D7).
3. **Go back one step** — R3-UI-37 startup Back vs play read-only revisit; engine revisit state without undo.
4. **Wire replay + quit** — reuse Control engine hooks from device menu (R3-UI-34).
5. **Action-needed dialogs** — R3-UI-35/36; block flow buttons; tower first when both.
6. **Responsive layout + choice UX** — R3-UI-50–53; mockup parity; 48pt / 64pt touch targets.
7. **Control menu audio + tower volume** — R3-UI-63 Mac sliders on board menu vs device; GAP-HW-003 note.

**Lanes (preview):** device web (`DeviceScreen.tsx`, device CSS) serial per step; engine/protocol only when step 3–5 require new `deviceState.menu` or prompt fields — one engine PR at a time.

---

## Run checklist

- [ ] Visuals step **11** merged; rebase `main` before Control step **1**.
- [ ] Control steps **1 → 2 → 3 → 4 → 5 → 6 → 7** (default serialize; see lane table for exceptions).
- [ ] After Control **7** on `main`, start **Devices** draft steps above.
