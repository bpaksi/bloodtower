# C2 — Session shell: the whole evening, from first start to Done for tonight (build plan)

**Status:** proposed, for Bob at G0.
**Source:** the evening walkthrough (AREA-100, scenes 1 to 7, PR #334), the session loop (MEC-039), the session screen (SCR-021), the rulings DEC-708 to DEC-713, the G-C1 follow-ups GC1-01 to GC1-06 ([playtest notes](../docs/playtests/2026-10-31-G-C1.md), DEC-704 to DEC-707), and the milestone split in [1.0-milestones.md](1.0-milestones.md). C2 is the first of the four 1.0 milestones.
**Goal:** first audit the C1 code against the cards, then build the evening around today's day slice: the join, the base board setup, the tower block with Connect Tower or Play without Tower, the session screen with Continue, New game, tonight's games and Play again, Done for tonight, and every failure path in AREA-100.
**Exit condition:** every `Done when` below passes in CI with the mock tower, and Bob signs off at G-C2 on the Mac, the Samsung TV, two iPads and the real tower.

Process: `docs/sdlc.md`, Full tier. One branch, worktree and PR per step. The review loop is §4. Every build step gets a feature folder `plans/briefs/C2/##-<feature>/` with `plan.md`, `eval.md` and `approval.md` (and `mockup.html` when it changes a screen) before its code starts, per [briefs/README.md](briefs/README.md).

## What C2 changes in today's app

From AREA-100. Today's setup runs Pick Game → Pick Story → Game settings → Tower connect → Claim heroes → piece setup → Begin. After C2:

```text
landing (SCR-002, sound SCR-003)                          app startup, outside the loops (DEC-273)
  └► session Enter: join QR, first iPad (DEC-274) → base board setup (SCR-022)
       → Connect Tower, or Play without Tower (SCR-005, DEC-275) → calibrate → glyphs → facing → volume
  └► session body, one game per pass:
       game loop: new | Play again | Continue (DEC-283, DEC-708, DEC-709)
       → session screen (SCR-021): Continue · New game · tonight's games · Done for tonight · tower state
  └► session close: Done for tonight, confirmed → landing painting, tower to idle, iPads "The session is over" (DEC-713)
```

- The tower and the base board move to the session's Enter and run once per session (DEC-152).
- Pick Game goes. Continue sits on the session screen and on Pick story (DEC-709).
- The splash's "Continue" / "Connect Tower" pair goes. The one tower question is MEC-039 .5 to .7, with both buttons named (GC1-05).

## Transition

The app keeps working between steps, as in C1. Steps 4 to 8 build the new shell in the engine next to the C1 shell. Step 9 serves it from the host behind `SHELL=evening`, and steps 10 and 11 render it. Step 15 makes it the only shell, deletes the C1 shell, Pick Game and the flag, and moves the e2e suite over. Until step 15 the e2e suite runs against the C1 shell and must stay green.

## Out of scope

- Every loop past the day slice: events, quests, battles, skull effects, chapter exits, win and loss. Those are C3 and C4. In C2 a game ends only by Quit story, so tonight's games are all quit games.
- The outcome scene (SCR-018) and the full stats screen (SCR-019). C2 shows a quit game's stats so far as far as the day slice records them (step 6). C3 builds the full screens.
- Goodbye (SCR-020), parked for 1.1 (DEC-628).
- Past sessions in the list (DEC-629).
- Story content past `packs/test`. The Ruined Keep pack is C3.
- The Pick story redesign (GC1-06). It waits on Q-401. If Bob answers Q-401 before batch B6, it joins C2 as one more web step; otherwise it moves to C3.
- Any change to `apps/burgomaster-funeral-poc`.

## Steps

### Step G0: Bob approves this plan
- Owner: Bob (gate G-plan)
- Depends on: none
- Touches: this file (Results), `1.0-milestones.md`
- Deps change: no
- Bob also rules on the milestone split in `1.0-milestones.md`. As in C1, the plan and AREA-100 stand in for an intent file unless Bob wants one.

### Step 1: Audit the C1 code against the cards
- Depends on: G0
- Touches: `apps/bloodtower/docs/audit/C2-audit.md` (new), this file (steps 4 to 15 and the batches, if the audit changes them)
- Builds: none
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - Every folder under `apps/bloodtower/src/{engine,server,protocols,web}` and every pack under `packs/` has one verdict: **keep**, **rework** or **replace**. Each verdict names the cards it serves or contradicts by ID, and its line count.
  - The server (about 11.8k lines) is split by folder. Code left from the R1 wire, or that no card and no test reaches, is listed with its file and line count, as a delete candidate.
  - The C1 rulings the later design replaced (the table in the G-C1 playtest notes: no Play without Tower, the DEC-155 pause, the splash's Continue / Connect Tower) are each traced to the code that still does them.
  - Each of steps 4 to 15 gets its `Touches` narrowed to real files, and the audit says whether any step must split, merge or move. Those changes are made to this file in the same PR.
  - Anything the audit finds that C2 does not fix is written as a line for the C3 plan, with its cards.
  - Not required: fixing anything. The audit reads and reports.

### Step G-A: Bob accepts the audit
- Owner: Bob
- Depends on: 1
- Touches: this file (Results)
- Bob accepts the verdicts and any plan changes from step 1. This answers his question 1 ("do we create new and treat existing code as a POC"). The C3 plan is written after this gate.

### Step 2: Take Long out of the Dracula settings
- Depends on: G0
- Touches: `packs/dracula/pack.yaml`, the bloodtower tests that list Dracula's length options (`apps/bloodtower/src/**/*.test.ts`, `apps/bloodtower/src/e2e/tests/*.spec.ts`)
- Builds: none
- Deps change: no
- Runs: cloud
- Model: sonnet
- Done when:
  - Dracula's Length setting offers Short and Standard, default Standard (DEC-502, DEC-508). Punch list item 6.
  - No other pack or setting changes. `pnpm check` passes.

### Step 3: Tower prototype: glyphs, facing, and the drums on Continue (tower-poc)
- Depends on: G0
- Touches: `apps/tower-poc/**`, `research/tower/**`
- Builds: none
- Deps change: no
- Runs: local (the real tower, Bob present; in short chunks)
- Model: opus
- Done when:
  - tower-poc has a prototype of MEC-039 .13 to .19: after calibrate, the table says which glyphs it sees and which kingdom the lit side faces, and the app sets its picture of the drums and the facing from the answers (DEC-103, MEC-017). Every tower action starts on a press.
  - On the real tower, a findings note in `research/tower/` answers what Q-402 needs: where the drums are after calibrate, whether a press can turn each drum to a saved glyph, and what happens to skulls trapped in the tower after a box-up.
  - Bob rules Q-402, and the glyph prompts for MEC-039 .13 to .15, in a design session. Step 7 waits for the Q-402 ruling. Step 4 uses the ruled prompts if they are on `main` when it starts, and MEC-039's placeholder nodes if not.

### Step 4: Session Enter on the engine
- Depends on: G-A
- Touches: `apps/bloodtower/src/engine/loops/evening/**` (new), `apps/bloodtower/src/engine/views/**`
- Builds: MEC-039, SCR-022, SCR-005, SCR-006, UI-010, CUE-011
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - The new session loop runs MEC-039 Enter, .1 to .25, in order: the join QR stays open until every hero is claimed, and the session waits only for the first iPad (DEC-274). The base board setup steps show, and any iPad presses "Board is set up" (SCR-022). Then one prompt offers Connect Tower and Play without Tower, both named (SCR-005, DEC-275).
  - Connect Tower runs connect and calibrate, then the glyphs, the facing and the volume test (SCR-006). A failed connect or calibrate goes back to the choice (.11). Play without Tower skips the tower nodes. Nothing physical starts without a press.
  - Engine tests cover each node's forward move, both tracks, a failed connect going back to the choice, and an iPad dropping before the board is set up.
  - Not required: the host and the web. Step 9 serves this loop, steps 10 and 11 render it.

### Step 5: Session screen and Done for tonight on the engine
- Depends on: 4
- Touches: `apps/bloodtower/src/engine/loops/evening/**`, `apps/bloodtower/src/engine/views/**`
- Builds: SCR-021, SCR-002, CUE-012
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - After each game, Quit story included, the table lands on the session screen (DEC-214, DEC-218). It offers, top to bottom: Continue, only while an autosave exists (DEC-709); New game; tonight's games, newest first, each marked quit (DEC-629); Done for tonight; and the tower's state: in play, without the tower, or "Tower lost" (DEC-711).
  - New game goes to Pick story. While an autosave exists it first asks "This replaces the saved game. Are you sure?" (DEC-709). Continue enters the game loop on its Continue track (DEC-283); step 7 builds the piece check on that track.
  - Done for tonight asks to confirm (DEC-713). Then the board goes back to the landing painting (SCR-002, DEC-628), the tower settles to idle if it is in play (CUE-012), and the iPads get "The session is over" with no buttons and leave the session. The autosave stays.
  - A tower lost between games shows "Tower lost" and reconnects nothing. The next New game, Play again or Continue runs MEC-039 .5 to .25 again before the game starts (DEC-711).
  - Engine tests cover each of these, and a new session after Done for tonight starting at the join (.1).

### Step 6: Play again and tonight's games
- Depends on: 5
- Touches: `apps/bloodtower/src/engine/loops/{evening,game}/**`, `apps/bloodtower/src/engine/views/**`
- Builds: SCR-019, SCR-010
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - A game in tonight's list drills in to its stats, with what the day slice records: days played, moves taken, buildings entered, skull drops recorded. A value the game did not record shows as unavailable, never zero.
  - Play again keeps the story, length and difficulty and the heroes, and takes a new seed (DEC-708). It skips Pick story and Game settings. The claim step comes prefilled with the same heroes on the same iPads, and one press confirms (DEC-216). The piece setup (SCR-011) runs again. While an autosave exists, Play again asks before it replaces it (DEC-709).
  - An engine test shows two Play again games from the same game get different seeds and the same heroes.
  - Not required: the full SCR-019 layout, which C3 builds with win and loss.

### Step 7: Continue's piece check
- Depends on: 5, 3 (Bob's ruling on Q-402)
- Touches: `apps/bloodtower/src/engine/loops/{game,evening}/**`, `apps/bloodtower/src/engine/views/**`
- Builds: MEC-018, SCR-011
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - Continue skips settings, party join, setup and the start point (DEC-283). For each piece MEC-018 tracks, a board picture shows where the save has it, and a press confirms each one. A skipped picture stays unconfirmed (DEC-710).
  - The check is the same after a quit tonight and on another evening. The base board setup does not run again, since the session's Enter already ran it (DEC-710).
  - The drums and trapped skulls follow Bob's Q-402 ruling.
  - Then the tower check runs (MEC-018) and the chapter resumes at its saved node.
  - Engine tests cover Continue after a quit tonight, Continue after a host restart, and a skipped picture.

### Step 8: A tower lost mid-game: Reconnect, Go on without, or Quit
- Depends on: 5
- Touches: `apps/bloodtower/src/engine/loops/{game,play,day}/**`, `apps/bloodtower/src/engine/views/**`
- Builds: MEC-032
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - A tower lost after a game has started, piece setup included, pauses the game with three buttons: Reconnect, Go on without the tower, and Quit (DEC-301). This replaces C1's Reconnect-or-Quit pause (DEC-155).
  - Go on without asks to confirm, then the rest of the game uses the no-tower stand-ins: the tower's sounds and lights are skipped, the Story board is unchanged, and the skull drop is simulated (DEC-305). Reconnect stays in the Menu (DEC-229) and runs the tower check before play goes on. Reconnect starts only on a press.
  - A game started with Play without Tower never takes this pause.
  - Engine tests cover each button, and a drop during piece setup.

### Step 9: Host and protocol serve the new shell
- Depends on: 6, 7, 8
- Touches: `apps/bloodtower/src/server/**`, `apps/bloodtower/src/protocols/v2/**`, `apps/bloodtower/spec.md` (§3 v2)
- Builds: none
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - With `SHELL=evening`, the host runs the new session loop: the tower block on its press, the tower to idle on Done for tonight, "The session is over" to every iPad, and the tower's state on the session screen. Without the flag, the C1 shell runs as today.
  - The board and device views carry every new screen of steps 4 to 8. The board view still refuses everything §3 refuses.
  - Server tests cover the tower going to idle only when it is in play, and a restarted host offering Continue on the session screen.

### Step 10: Story board screens for the evening
- Depends on: 9, 12, 13
- Touches: `apps/bloodtower/src/web/components/board/**`, `apps/bloodtower/src/web/app/board/**`, `apps/bloodtower/src/web/lib/**`, `apps/bloodtower/src/e2e/tests/c2-board.spec.ts` (new)
- Builds: SCR-022, SCR-005, SCR-006, SCR-021, UI-010
- Deps change: no
- Runs: cloud
- Model: sonnet
- Done when:
  - With `SHELL=evening`, the Story board shows the join QR, the base board setup steps, the tower choice, calibrate, the glyph and facing questions, the volume test, the session screen with all five parts, both confirmations, and the return to the landing painting. Each matches its mockup in the brief.
  - Every dialog keeps the DEC-705 border (step 13).
  - Viewports: 1920×1080, 3840×2160, 1280×800.

### Step 11: iPad screens for the evening
- Depends on: 9
- Touches: `apps/bloodtower/src/web/components/device/**` except `IpadCorners.tsx` and `ipadCorners.test.ts`, `apps/bloodtower/src/web/app/{device,join}/**`, `apps/bloodtower/src/e2e/tests/c2-ipad.spec.ts` (new)
- Builds: SCR-015, SCR-016, UI-032, UI-033
- Deps change: no
- Runs: cloud
- Model: sonnet
- Done when:
  - With `SHELL=evening`, the iPad offers every press of steps 4 to 8, and shows "The session is over" with no buttons after Done for tonight.
  - While joined, the device page asks the browser to keep the screen on (DEC-712). A refused request is logged and shown on that iPad with its error code.
  - The Menu always ends with Close, and a tap outside it or on the gear also closes it, sending nothing to the host (DEC-707, GC1-04). It shows all three groups, Look up, Table and Leave, with an unusable item greyed, never left out (DEC-227, DEC-229).
  - Viewports: iPad 1024×768 landscape, iPad 768×1024 portrait, phone 390×844.

### Step 12: The ambient bed plays on every Story board screen
- Depends on: G-A
- Touches: `apps/bloodtower/src/web/components/title/**`, `apps/bloodtower/src/web/components/board/{LiveBoard,CoreStoryBoard,SoundDialog}.tsx`, `apps/bloodtower/src/web/lib/**` (audio only), `apps/bloodtower/src/e2e/tests/sound-*.spec.ts`
- Builds: SCR-003
- Deps change: no
- Runs: cloud
- Model: sonnet
- Done when:
  - The ambient bed starts on the landing page and keeps playing on every Story board screen: setup, play, every pause and the session screen (DEC-704, GC1-01). Going from the landing page to the board does not stop it and needs no second gesture.
  - The music, ambient and voice levels set on the landing page apply everywhere. The iPads play nothing (DEC-231).
  - An e2e test reads the audio element's state on `/board` after leaving `/`.

### Step 13: Every Story board dialog keeps a border
- Depends on: G-A
- Touches: `apps/bloodtower/src/web/components/board/{DialogFrame,WaitingDialog}.tsx`, `apps/bloodtower/src/web/components/board/board.css`, `apps/bloodtower/src/e2e/tests/board-look.spec.ts`
- Builds: SCR-013
- Deps change: no
- Runs: cloud
- Model: sonnet
- Done when:
  - Every Story board dialog, the connect dialog included, leaves at least 5% of the board's height above and below and 5% of its width at each side (DEC-705, GC1-02). Long content is cut down or set smaller to fit; the board never scrolls or clips text (SCR-013).
  - An e2e test measures every dialog the suite opens against the border.
  - Viewports: 1920×1080, 3840×2160.

### Step 14: iPad corners from ART-080
- Depends on: G-A, and ART-080 on `main` (Bob)
- Touches: `apps/bloodtower/src/web/components/device/{IpadCorners.tsx,ipadCorners.test.ts}`, `apps/bloodtower/src/web/public/ipad/**`
- Builds: ART-080
- Deps change: no
- Runs: cloud
- Model: sonnet
- Done when:
  - The four corners are ART-080's drawn corner pieces, never windows on a mock (DEC-706, GC1-03). No corner holds words, buttons, labels or cut parchment.
  - No button, field or text sits under a corner, and the bottom bar (UI-032) clears the two lower corners. A test checks the boxes do not overlap.
  - Viewports: iPad 1024×768 landscape, iPad 768×1024 portrait.

### Step 15: Switch to the new shell
- Depends on: 10, 11
- Touches: `apps/bloodtower/src/{engine,server,web,protocols}/**`, `apps/bloodtower/src/e2e/**`, `apps/bloodtower/{README.md,spec.md}`
- Builds: none
- Deps change: no
- Runs: local
- Model: opus
- Done when:
  - The new shell is the only one. The C1 session loop, Pick Game, the splash's Continue / Connect Tower pair and `SHELL` are gone.
  - The e2e suite runs AREA-100's scenes as one evening at its three viewports: first start without the tower, a game, Quit story, the session screen, Continue, Quit story again, Play again, a host restart and Continue, the tower lost between games, an iPad that drops between games, and Done for tonight back to the landing painting. A second path connects the mock tower and drops it mid-game for each of the three pause buttons.
  - The C1 specs that still apply move to the new flow; a spec that tested only removed screens is deleted, and the PR lists each one.
  - This step may exceed 400 lines. If its review finds it too large, it splits into "remove the C1 shell" and "e2e on the evening" before round 2.

### Step G-C2: Bob plays the evening
- Owner: Bob (gates G-playtest and G-signoff)
- Depends on: 2, 14, 15
- On the Mac with the Samsung TV, two iPads and the real tower: play AREA-100 scenes 1 to 7 once with the tower and once with Play without Tower. Notes go in `docs/playtests/`.

## Batches

- G0
- B1: 1, 2, 3 (merge order: 2, 1, 3). Step 3 runs when Bob is at the tower and may finish later than B2; only step 7 waits on it.
- G-A
- B2: 4, 12, 13 (merge order: 13, 12, 4)
- B3: 5, 14 (14 starts only once ART-080 is on `main`)
- B4: 6, 8 (merge order: 8, 6). If the audit shows their `Touches` overlap, they run one after the other.
- B5: 7 (after Bob's Q-402 ruling)
- B6: 9
- B7: 10, 11 (merge order: 11, 10)
- B8: 15
- G-C2

## Risks

- **The audit changes the plan.** That is its job. Its changes land in the same PR, and G-A is where Bob sees them before any build step starts.
- **Q-402 holds up Continue.** Only step 7 waits on it. If the ruling is late, B6 waits too, since step 9 needs step 7.
- **Two shells for a while.** Steps 9 to 11 keep the C1 shell working behind the flag. Step 15 removes it, and the review checks nothing still reads the flag.
- **The glyph prompts are not settled.** If step 3's ruling is not on `main` when step 4 starts, step 4 builds MEC-039's placeholder nodes and the ruling becomes a small follow-up step.

## Open items for Bob

- **DEC-710 has no deliverable that reaches it** (`pnpm graph gaps`). Step 7 builds it through MEC-018. Adding the `uses` link from MEC-018 to DEC-710 is a card edit for the next design session.
- **Q-401 (Pick story)** decides whether GC1-06 is in C2 or C3.

## Results
