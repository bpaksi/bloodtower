# C2 — Session shell: the whole evening, from first start to Done for tonight (build plan)

**Status:** revised 2026-10-31 at Bob's ask: Claude plans only and writes no code. Bob approved the first version at G0. This version, the audit and the feature evals go to him together.
**Source:** the evening walkthrough (AREA-100, scenes 1 to 7, PR #334), the session loop (MEC-039), the session screen (SCR-021), the rulings DEC-708 to DEC-713, the G-C1 follow-ups GC1-01 to GC1-06 ([playtest notes](../docs/playtests/2026-10-31-G-C1.md), DEC-704 to DEC-707), the [C2 audit](../docs/audit/C2-audit.md) and the milestone split in [1.0-milestones.md](1.0-milestones.md). C2 is the first of the four 1.0 milestones.
**Goal:** the evening around today's day slice: the join, the base board setup, the tower block with Connect Tower or Play without Tower, the session screen with Continue, New game, tonight's games and Play again, Done for tonight, and every failure path in AREA-100.
**Exit condition:** every feature's eval table is all-pass on its PR, and Bob signs off at G-C2 on the Mac, the Samsung TV, two iPads and the real tower.

## Who does what

- **Claude plans.** It writes this plan, the audit, and each feature's folder: `plans/briefs/C2/##-<feature>/` with `plan.md`, `eval.md`, `mockup.html` when a screen changes, and `approval.md` (per [briefs/README.md](briefs/README.md)). It writes no app code in C2.
- **Bob approves** each feature's evals and mockup in chat. Claude records it in that feature's `approval.md`. A feature is ready to build once its folder, with `approval.md` filled, is on `main`.
- **Builders build.** Wright launches one developer per feature (`docs/sdlc.md`, "Who runs the agents"). Every build feature is `Runs: cloud`. Bob can flip any of them. The review loop is §4, and the verifier runs each feature's `eval.md`.
- **Bob runs the hardware.** Feature 10's prototype is built like any other feature; Bob runs it on the real tower.

## What C2 changes in today's app

From AREA-100 and the audit. Today's setup runs splash (Continue / Connect Tower) → Pick Game → Pick Story → Game settings → Tower connect → Claim heroes → piece setup → Begin. After C2:

```text
landing (SCR-002, sound SCR-003)                          app startup, outside the loops (DEC-273)
  └► session Enter: join QR, first iPad (DEC-274) → base board setup (SCR-022)
       → Connect Tower, or Play without Tower (SCR-005, DEC-275) → calibrate → [glyphs → facing] → volume (SCR-006)
  └► session body, one game per pass:
       game loop: new | Play again | Continue (DEC-283, DEC-708, DEC-709)
       → session screen (SCR-021): Continue · New game · tonight's games · Done for tonight · tower state
  └► session close: Done for tonight, confirmed → landing painting, tower to idle, iPads "The session is over" (DEC-713)
```

The glyph and facing nodes (MEC-039 .13 to .19) wait for feature 10's prototype and Bob's ruling; feature 05 leaves them out until then.

## How the work is cut

Each feature is a vertical slice: engine, views, host, screens and e2e for one piece of the evening, so each PR leaves the app whole and playable. The session shell is reworked in place (audit: `engine/loops/session` is rework, not replace). A feature that goes past about 400 changed lines may split in review into "engine and views" and "screens", as `docs/sdlc.md` allows.

## Out of scope

- Every loop past the day slice: events, quests, battles, skull effects, chapter exits, win and loss (C3, C4). In C2 a game ends only by Quit story, so tonight's games are all quit games.
- The outcome scene (SCR-018) and the full stats screen (SCR-019). C2 shows a quit game's stats so far (feature 07). C3 builds the full screens.
- Goodbye (SCR-020), parked for 1.1 (DEC-628).
- Past sessions in the list (DEC-629).
- Story loading on pack v2 and The Ruined Keep pack (audit: C3).
- Any change to `apps/burgomaster-funeral-poc`.

## Steps

### Step 1: Audit the C1 code against the cards
- Owner: Claude (planning)
- Done: [docs/audit/C2-audit.md](../docs/audit/C2-audit.md). No rewrite: the session shell is rework (C2), and the v1 pack and story-card code is rework (C3). It also lists the dead files, every place where the code and the cards disagree, and the lines for the C3 plan.

### Step G-A: Bob accepts the audit
- Owner: Bob
- Depends on: 1
- Bob accepts the verdicts. That answers his question 1. The C3 plan uses the audit's C3 lines and is written alongside C2, so its engine features can run beside C2's serial shell features ([1.0-milestones.md](1.0-milestones.md), "Unblocking").

### Feature 01: Take Long out of the Dracula settings
- Folder: [briefs/C2/01-dracula-length](briefs/C2/01-dracula-length/plan.md)
- Depends on: its `approval.md` on `main`
- Touches: `packs/dracula/pack.yaml`, `apps/bloodtower/src/server/pack/load.test.ts`, `apps/bloodtower/src/e2e/tests/{opening-screens,w3-pick-story}.spec.ts`
- Builds: none
- Deps change: no
- Runs: cloud
- Model: sonnet

### Feature 02: The ambient bed plays on every Story board screen
- Folder: [briefs/C2/02-ambient-bed](briefs/C2/02-ambient-bed/plan.md)
- Depends on: its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/title/**`, `apps/bloodtower/src/web/components/board/{LiveBoard,SoundDialog}.tsx`, `apps/bloodtower/src/web/lib/audio/**`, `apps/bloodtower/src/web/app/{layout.tsx,page.tsx,board/**}`, `apps/bloodtower/src/e2e/tests/sound-*.spec.ts`, `apps/bloodtower/src/e2e/playwright.config.ts` (autoplay flag only)
- Builds: SCR-003
- Deps change: no
- Runs: cloud
- Model: sonnet

### Feature 03: Every Story board dialog keeps a border
- Folder: [briefs/C2/03-dialog-border](briefs/C2/03-dialog-border/plan.md)
- Depends on: its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/board/{DialogFrame,WaitingDialog}.tsx`, `apps/bloodtower/src/web/components/board/board.css`, `apps/bloodtower/src/e2e/tests/board-look.spec.ts`, `apps/bloodtower/src/e2e/tests/c2-dialog-border.spec.ts` (new)
- Builds: SCR-013
- Deps change: no
- Runs: cloud
- Model: sonnet

### Feature 04: The iPad Menu has Close
- Folder: [briefs/C2/04-ipad-menu-close](briefs/C2/04-ipad-menu-close/plan.md)
- Depends on: its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/device/ChromeBar.tsx`, `apps/bloodtower/src/web/components/device/chromeBar.test.ts` (new), `apps/bloodtower/src/web/app/globals.css` (Menu rules only), `apps/bloodtower/src/e2e/tests/w1-chrome.spec.ts`
- Builds: UI-033
- Deps change: no
- Runs: cloud
- Model: sonnet

### Feature 09: Joined iPads stay awake
- Folder: [briefs/C2/09-ipad-awake](briefs/C2/09-ipad-awake/plan.md)
- Depends on: its `approval.md` on `main`
- Touches: `apps/bloodtower/src/web/components/device/LiveDevice.tsx`, `apps/bloodtower/src/web/lib/wakeLock.ts` (new), `apps/bloodtower/src/web/lib/wakeLock.test.ts` (new), `apps/bloodtower/src/web/lib/pageLogCodes.ts`, `apps/bloodtower/src/e2e/tests/c2-ipad-awake.spec.ts` (new)
- Builds: SCR-016
- Deps change: no
- Runs: cloud
- Model: sonnet

### Feature 10: Tower prototype: glyphs, facing, and the drums after calibrate (tower-poc)
- Folder: [briefs/C2/10-tower-glyph-prototype](briefs/C2/10-tower-glyph-prototype/plan.md)
- Depends on: its `approval.md` on `main`
- Touches: `apps/tower-poc/src/web/app/setup-check/**`, `apps/tower-poc/src/web/lib/{setupCheck.ts,setupCheck.test.ts,pages.ts}`, `apps/tower-poc/src/e2e/tests/setup-check.spec.ts`, `research/tower/2026-11-setup-check-findings.md`
- Builds: none
- Deps change: no
- Runs: cloud for the build. Bob runs it on the real tower, in short chunks.
- Model: opus (tower safety)
- After Bob's run: Bob rules Q-402 and the glyph prompts for MEC-039 .13 to .15 in a design session. That unblocks features 11 and 12.

### Feature 05: Session Enter: the join, base board setup, and Connect Tower or Play without Tower
- Folder: [briefs/C2/05-session-enter](briefs/C2/05-session-enter/plan.md)
- Depends on: G-A, 03, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/{session,game}/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/protocols/v2/**`, `apps/bloodtower/src/server/{hub,core,tower}/**`, `apps/bloodtower/src/web/components/board/{StartupBoard,CoreStoryBoard}.tsx`, `apps/bloodtower/src/web/components/board/board.css`, `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx`, `apps/bloodtower/src/web/lib/{startupBoard,volumeTest}.ts` (and their tests), `packs/test/pack.yaml`, `apps/bloodtower/src/e2e/tests/**`, `apps/bloodtower/spec.md` (§3 v2)
- Builds: MEC-039, SCR-022, SCR-005, SCR-006, UI-010, CUE-011
- Deps change: no
- Runs: cloud
- Model: opus (session state, tower)

### Feature 06: The session screen and Done for tonight
- Folder: [briefs/C2/06-session-screen](briefs/C2/06-session-screen/plan.md)
- Depends on: 05, and its `approval.md` on `main`
- Touches: as feature 05, plus `apps/bloodtower/src/web/components/{GoodbyeTeardown.tsx}`, `apps/bloodtower/src/web/lib/goodbye.ts` (both deleted), `apps/bloodtower/src/server/core/goodbyeIdle*.ts`
- Builds: SCR-021, SCR-002, CUE-012
- Deps change: no
- Runs: cloud
- Model: opus (session state, tower)

### Feature 07: Play again and a quit game's stats
- Folder: [briefs/C2/07-play-again](briefs/C2/07-play-again/plan.md)
- Depends on: 06, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/{session,game}/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/protocols/v2/**`, `apps/bloodtower/src/web/components/board/StartupBoard.tsx`, `apps/bloodtower/src/web/components/board/board.css`, `apps/bloodtower/src/web/components/device/CoreDeviceScreen.tsx`, `apps/bloodtower/src/e2e/tests/c2-play-again.spec.ts` (new)
- Builds: SCR-019, SCR-010
- Deps change: no
- Runs: cloud
- Model: opus (session state)

### Feature 08: A tower lost mid-game: Reconnect, Go on without, or Quit
- Folder: [briefs/C2/08-tower-lost-pause](briefs/C2/08-tower-lost-pause/plan.md)
- Depends on: 07, and its `approval.md` on `main`
- Touches: `apps/bloodtower/src/engine/loops/{session,game,play,day}/**`, `apps/bloodtower/src/engine/views/**`, `apps/bloodtower/src/protocols/v2/**`, `apps/bloodtower/src/server/core/**`, `apps/bloodtower/src/web/components/board/{CoreStoryBoard,WaitingDialog}.tsx`, `apps/bloodtower/src/web/components/device/{CoreDeviceScreen,ChromeBar}.tsx`, `apps/bloodtower/src/e2e/tests/{area-077,acceptance}.spec.ts`, `apps/bloodtower/src/e2e/tests/c2-tower-lost.spec.ts` (new)
- Builds: MEC-032
- Deps change: no
- Runs: cloud
- Model: opus (tower safety)

### Planned once unblocked

Each gets its folder as soon as what it waits on is on `main`.

| Feature | Waits on | Builds |
|---|---|---|
| 11: Continue's piece check (DEC-283, DEC-710) | 06, and Bob's Q-402 ruling after feature 10 | MEC-018, SCR-011 |
| 12: Glyphs and facing in the session's Enter (MEC-039 .13 to .19) | 05, and Bob's ruling on the glyph prompts after feature 10 | MEC-017 |
| 13: iPad corners from ART-080 (DEC-706, GC1-03) | 04, and ART-080 on `main` (Bob) | ART-080 |
| 14: Pick story redesign (GC1-06) | Bob's answer to Q-401. If it is not in by the time feature 08 merges, this moves to C3 | SCR-007, UI-016 |

### Step G-C2: Bob plays the evening
- Owner: Bob (gates G-playtest and G-signoff)
- Depends on: every feature above that was not moved to C3
- On the Mac with the Samsung TV, two iPads and the real tower: play AREA-100 scenes 1 to 7 once with the tower and once with Play without Tower. Notes go in `docs/playtests/`.

## Batches

- G-A, and Bob approves the folders below
- B1: 01, 02, 03, 04, 09, 10 (merge order: 01, 03, 04, 09, 02, 10). Their `Touches` do not overlap. Feature 10's build merges here; Bob's tower run can come later.
- B2: 05
- B3: 06
- B4: 07
- B5: 08
- then 11, 12, 13 and 14 as they unblock (13 can run with any batch after 04; 11 and 12 each touch the session shell, so they run after B5, one at a time)
- G-C2

05 to 08 run one at a time: each reworks the same session shell.

## Risks

- **The shell features are serial.** 05 to 08 all touch `engine/loops/session`. They cannot run in parallel without merge conflicts, so they are the long pole. B1 runs everything else around them.
- **Q-402 holds up Continue's piece check.** Only feature 11 waits on it. Feature 06 keeps today's Continue (checkpoint reload, no piece check) until 11 lands.
- **Feature 05 is large.** It moves the tower block, adds base board setup and the volume test, and removes the splash pair. Its brief allows the review split.

## Open items for Bob

- **DEC-710 has no deliverable that reaches it** (`pnpm graph gaps`). Feature 11 builds it through MEC-018. Adding the `uses` link from MEC-018 to DEC-710 is a card edit for the next design session.
- **Q-401** decides whether feature 14 is in C2.

## Results

- G0 (2026-10-31): Approved by Bob in chat: "Approve G0". This covers the C2 plan, its batches, and the milestone split in `1.0-milestones.md`. This plan and AREA-100 stand in for an intent file.
- Revision (2026-10-31): Bob: "I don't want you do the coding only the planning … The goal is to get a chuck of work planned so that it can be built." Claude did the audit as planning work and cut the build into feature folders. This revision needs Bob's OK along with the evals.
- Features 01 to 10 (2026-10-31 09:09 ET): Bob approved all ten folders' evals and mockups in chat, assumptions included: "Approve all ten". Each `approval.md` holds the row. Batch B1 (01, 02, 03, 04, 09, 10) may start once this PR is on `main`. Features 05 to 08 also wait for G-A, the audit, which is not yet accepted.
- G-A (2026-10-31): Bob accepted the audit in chat: "Accept the audit". No rewrite: the session shell is reworked in C2, and the v1 pack and story-card code in C3. Features 05 to 08 may start in order once this PR is on `main`.
