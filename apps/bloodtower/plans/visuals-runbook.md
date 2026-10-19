# Visuals runbook (Story board)

Bob runs one step per branch in Claude Code on the Mac. Wright tracks progress here: update **Status** and **PR #** when a step opens or merges.

**Source plan (do not edit for day-to-day prompts):** `apps/bloodtower/plans/visuals-prompts.md` — this runbook is the paste-ready driver; keep prompts here complete even when they repeat the source.

**Illusionist assets (on `main`, merge `a5bacf5`, ex-PR #90):** `docs/deliveries/2026-10-18-dialog-frame-and-window-mask.md`, `apps/bloodtower/public/board/dialog-frame/README.md`, `apps/bloodtower/public/landing/window-mask/README.md`. Swap points: `DialogFrame.tsx` (dialog frame) and `boardWindowMask.ts` (window mask). **Neither file exists on `main` yet**; the first step that needs one creates it (step 3 creates `DialogFrame.tsx`; step 2 creates `boardWindowMask.ts` exporting `BOARD_WINDOW_MASK_URL`). There are no `ILLUSIONIST_PLACEHOLDER_*` symbols in the code, so there is nothing to remove; use the real assets from #90. Use **`dialog-frame.svg`** (not the PNG exports) for `border-image-source`. If `out/board/` is missing after `pnpm build`, add `/board/` to the app-public fallback list in `src/server/server.ts` (see dialog-frame README). **No placeholder chrome or mask data URIs** in steps 1–5 and 9 — wire real assets at the swap point where it is created.

**Hard constraints (every step):** No change to `bloodtower-protocols` message types or fields, engine session rules, or hub routing. The Story board still sends only `keeper-line-ended` (D7); no message type carries raw bytes and nothing physical happens automatically. Do not break camera tracks (#78): keep `cameraStillImageStyle` and `data-camera-still` as they are. Do not break audio layers (#83): keep `pickLayers`, `isVisualMoment` and `BoardAudio` unchanged. Scoped CSS on `.bt-board`. Dependencies are exact pins; use `pnpm` and Next.js only, and do not change `package.json` or the lockfile.

**Notes:** `data-board-mode` is `startup` for every pre-play `FlowScreen`, including `tower-volume-test` and `setup`. Step 6 (PR #89, already built) has no prompt in this runbook; see `visuals-prompts.md` §6. Playwright has no 1920×1080 project, so tests that need that size call `page.setViewportSize({ width: 1920, height: 1080 })`.

## Local PR review

The loop is `docs/sdlc.md` §4 "Review loop": one Opus attack in round 1, Sonnet fix-checks in rounds 2 and 3, reviewers trust CI, and only the blockers listed there block. After round 3 with blockers left, add the `needs-bob` label.

**`Done when` for every step below:** the step's numbered items, its `Tests:` line and the hard constraints. Viewports are exactly the ones the step names. Anything else a reviewer finds is a non-blocking follow-up.

**Standing checks for this track:** prefers-reduced-motion; flash safety (no more than 3 brightness jumps per second on the board); camera tracks (#78) and audio layers (#83) still work; the board sends only `keeper-line-ended` (D7).

**Merge rule:** Bob authorized merging this track when the latest review ends `Blocking: none` on the PR's head sha and CI is green:

```bash
gh pr merge <N> --squash --match-head-commit <sha>
```

**Round 1, attack (paste into Claude Code):**

```text
Run the adversary-bugs agent (Opus) on PR <N>, round 1. Step prompt: apps/bloodtower/plans/visuals-runbook.md §<step>; use its "Review focus" line and the track's standing checks. Follow docs/sdlc.md §4: trust CI (no pnpm install, pnpm check or full e2e); prove suspicions with single spec files or a throwaway probe in a separate worktree, then remove it; block only on the §4 list; post under about 1,500 characters ending with "Blocking: none" or "Blocking: <n>".
```

**Fix (developer, Sonnet):**

```text
Fix the blocking findings in PR <N> (head <sha>) and nothing else; rerun pnpm check and only the affected spec files; push; reply on the PR with one short comment: finding -> commit.
```

**Rounds 2 and 3, fix-check:**

```text
Run the adversary-bugs agent with model sonnet on PR <N>, round <r>, last reviewed sha <sha>. Fix-check only (docs/sdlc.md §4): read the open blocking findings and git diff <sha>..HEAD; confirm each is fixed and nothing next to it broke; no new hunting. Post under about 1,500 characters ending with "Blocking: none" or "Blocking: <n>".
```

## Resolved defaults (Bob)

| # | Topic | Decision |
|---|---|---|
| Q1 | Play header right zone | **(a)** Keep Tower + Join in the play header, styled as ink panels. |
| Q2 | Public hunter status strings | **Default (Bob can override):** **(a)** Map only from existing fields (no holder → `Waiting`, disconnected → `Away`, else holder id). |
| Q3 | Startup summary placement | **Default (Bob can override):** **(a)** Right column inside the centered startup shell (mock-like). |
| Q4 | Full-screen still scaling during zoom | **Default (Bob can override):** **(a)** Letterbox in the zoom layer only; keep cover inside the parchment well when not zoomed. |

## Status

| Step | Branch | Depends on | Lane | Status | PR # |
|---|---|---|---|---|---|
| 1 | `feat/visuals-01-sound-dialog` | 3 merged (hard; 3 creates `DialogFrame.tsx`) | Dialog / startup | todo | |
| 2 | `feat/visuals-02-backdrop-flicker` | 6 merged, or Option A (CSS-only, no `StoryBoard.tsx` edit) | Backdrop | **backlog** (Bob, 2026-10-19; not scheduled, do not start) | |
| 3 | `feat/visuals-03-startup-shell` | play track through 8 merged (recommended; Bob may accept rebase churn) | Dialog / startup | todo | |
| 4 | `feat/visuals-04-carousel-dialog` | 3 | Dialog / startup | todo | |
| 5 | `feat/visuals-05-startup-summary` | 3 | Dialog / startup | todo | |
| 6 | `feat/visuals-06-play-chrome` | none | Play TV | merged | #89 |
| 7 | `feat/visuals-07-hunter-roll` | 6 | Play TV | merged (Q2 (a) status: Waiting / Away / holder id; portrait medallions whenever packId + portrait exist; corruption column reads unavailable; no acting-hunter highlight, the `.bt-cart-act` blood rule stays in board.css unused until the engine exposes an acting hunter; no epithet line, the hunter schema has no epithet field) | #93 |
| 8 | `feat/visuals-08-play-parchment` | 6, 7 merged first | Play TV | merged (ornament line; justified narration; still in `.bt-plate` (outline rule, no layout cost), `CameraStill` untouched; blood-band prompt with no visible "Next" label, font steps down by prompt length, at most 3 lines then ellipsis (about 120 characters at 1180px); party items zone shows count/item/carrier as `unavailable`. **Height budget:** the ornament and items zone appear only at viewport height 1040px and up (1680x1050, 1920x1080, portrait 820x1180 and 1024x1366), so they are hidden at 1024x594, 1180x820, 1366x768, 1280x901, 1440x900/901, 1600x1000 and 1920x960; the still well is at least main's everywhere below 1040px; the narration is capped at 45vh less 5rem in whole lines, so a long moment loses lines, not the still. `<mark>` highlights deferred. **For Bob's ruling:** (a) the narration cap cuts a long moment mid-sentence on the board (the full text stays in the DOM); (b) the party items zone is not shown at 1180x820 or on any board under 1040px high) | #94 |
| 9 | `feat/visuals-09-waiting-dialog` | 3, 8 and 10 merged | Dialog / startup | todo | |
| 10 | `feat/visuals-10-visual-zoom` | 8 | Play TV | merged (layer: `main[data-board-layer="visual"|"waiting"|"startup"]` from `boardLayer()`, the same test as LiveBoard's `pickLayers({ visual })`, which is unchanged; `VisualLayer.tsx` is one fixed full-screen element on void at the end of `main` that hosts the still plate (`CameraStill` unchanged), the Keeper scene, or `Visual unavailable.` for a clip the board cannot draw (the layer adds no controls; the Keeper's pre-existing Captions on/off button sits inside it, step 11's area); zoom in from the screen centre, scale 0.5 to 1 with opacity 0 to 1, 800 ms `cubic-bezier(.65,0,.35,1)`, monotonic (one change of brightness, no flash); the zoom is one Web Animation played forward to come in and backward to go out, so Continue mid-zoom turns it around from where it is (no jump; round 1 fix), and a cut before the zoom has moved drops it hidden or leaves it fully shown instead of letting `play()` rewind it to the far end (round 2 fix); reduced-motion fade is linear; Continue to a text moment keeps the last visual for the same zoom out, then unmounts, and pauses its audio; visual to visual is a straight cut (same layer, no new zoom); reduced motion: 300 ms opacity fade only, no transform (game-look section 5); **Q4 (a):** the well is 16:9 (R-DEV-7), as large as the screen allows and centred, so cover shows the whole still and the camera pan and zoom run inside it unchanged; the moment text is a bottom caption in the layer (game-look section 4 cut scenes), at most 3 lines; the page under the layer keeps only the scene heading; pause and join banners and the connection notice stay above the layer; header heights under the layer are main's. **Deviation:** a still no longer shows in the parchment plate (step 8) at all, since every still moment is a visual; step 8's still-well budget is replaced by letterbox checks in `visual-layer.spec.ts`, and its narration and prompt budget runs on the text moment. The Keeper moves into the layer here with its current plate styling; step 11 restyles it. **For Bob's ruling:** (a) caption over the art, cut at 3 lines; (b) Q4 says keep cover in the parchment well when not zoomed, but no still is shown unzoomed now; (c) a non-16:9 still would be cropped to 16:9 inside the letterbox; (d) zoom grows from the centre (where step 9's waiting dialog sits), not from the old plate; (e) a pack alternating visual and text faster than about 1.5 presses a second can pass 3 brightness turns a second, since each flip reverses the zoom: rate-limit flips, or hold the exit until the zoom in completes) | #99 |
| 11 | `feat/visuals-11-keeper-cinema` | 10 | Play TV | todo | |

**Follow-up (no asset-swap PRs):** Illusionist assets land in the step that creates each swap point. Shell step 5 (#87) has merged, so there is no step 5b; step 5 here restyles the existing `SummaryPanel`.

**Step 3 timing:** the table says play track through 8 merged (recommended). This is deliberately later than `visuals-prompts.md` (which says after steps 6–11): step 9 must follow 3, 8 and 10 (it shares `DialogFrame.tsx` with 3), step 10 follows 8 only, and 11 is independent of startup work.

## Parallel lanes (file ownership)

Steps in the same lane run **in order**. Lanes with **no shared paths** may run **at the same time**.

| Lane | Order | Files touched (ownership) | Parallel with |
|---|---|---|---|
| **Play TV** | 6 → 7 → 8 → 10 → 11 (step 9 is in the Dialog lane) | `StoryBoard.tsx` (header, hunter roll, `PlayPanel`, play layout, ), `board.css` (play/header/grid/page/plate/zoom/keeper), `LiveBoard.tsx` (step 10), `KeeperScene.tsx`, `KeeperBoardCaption.tsx` (step 11), `src/e2e/tests/board-look.spec.ts` and related e2e | **Backdrop** only while **no open Play PR edits `StoryBoard.tsx`**; **Dialog / startup** only after play through **8** merged (or Bob accepts rebase churn) |
| **Backdrop** (backlog) | 2 (after 6 merged, or Option A) | `boardWindowMask.ts`, `board.css` (`.bt-board-backdrop` / glow layers only), `StoryBoard.tsx` (**only** the `.bt-board-backdrop` subtree — four `.bt-window-glow` children for per-group flicker) | **Play TV** only if the active play branch does not touch `StoryBoard.tsx` (step **6 in progress** → finish or land 6 before starting 2, or isolate a one-line backdrop mount on 6's branch) |
| **Dialog / startup** | 3 → 1 → 4 → 5; **9** after 3, 8 and 10 | `DialogFrame.tsx`, `SoundDialog.tsx` (1), `StoryBoard.tsx` (startup panels, carousel, summary), `board.css` (startup / carousel / sound / waiting, step 9), `src/server/server.ts` if `/board/` fallback needed | **Play TV** after step **8** merged; **Backdrop (2)**: different CSS and mask module, but both lanes edit `StoryBoard.tsx`; coordinate on that file (no two open PRs editing it at once) |

**Why these lanes:** Step 2 does not edit `SoundDialog`, `DialogFrame`, or play panels — only backdrop CSS, `boardWindowMask.ts`, and backdrop markup. Play steps 6–8 own the rest of `StoryBoard.tsx`. Steps 3, 1, 4, 5 and 9 share startup/carousel/summary sections with each other, not with 7–8, but all use `StoryBoard.tsx`, so they stay one lane sequenced after play layout stabilizes.

## Run now / after merges (checklist)

- [x] Steps 6, 7, 8 and 10 merged (#89, #93, #94, #99).
- [ ] **Now:** **Step 11**, and **Step 3** (creates `DialogFrame.tsx`).
- [ ] **After step 3 merges:** **1** → **4** → **5**.
- [ ] **After 3 merges (8 and 10 already merged):** **Step 9** (waiting dialog).
- **Backlog:** **Step 2** (backdrop flicker). Not scheduled; do not start until Bob moves it back.

---

## 1. Sound dialog look

**Review focus:** Real `dialog-frame.svg` only in `DialogFrame.tsx`; no duplicate frame CSS in `SoundDialog` or `board.css`; DOM hooks for `sound-dialog.spec.ts` unchanged; no audio math changes.

```text
Illusionist dialog-frame and window-mask assets are already on `main` (a5bacf5).

Branch: feat/visuals-01-sound-dialog
Depends on: step 3 merged (hard: step 3 creates `DialogFrame.tsx`). Do not edit .bt-board-backdrop (step 2).

Read CLAUDE.md, docs/art-direction/game-look.md (§2–3 frames, §4a type, §7 avoid), research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-03), apps/bloodtower/public/board/dialog-frame/README.md, docs/deliveries/2026-10-18-dialog-frame-and-window-mask.md. Visual target: research/game-design/mockups/2026-10-17/frames-mac-0-sound.png. Code: SoundDialog.tsx, DialogFrame.tsx (created in step 3; reuse it), board.css (.bt-sound-* only — no duplicate frame chrome outside DialogFrame).

Goal: the Sound dialog matches the Illusionist frame language over the landing painting, TV-readable type (≥ 28px labels), candle focus rings—not browser default grey card.

1. Wrap content in `DialogFrame` (`data-illusionist-asset="dialog-frame"`). Use real assets: `border-image-source: url("/board/dialog-frame/dialog-frame.svg")`, parchment tile per README; no placeholder chrome. If `pnpm build` does not emit `out/board/`, add `/board/` to the `serveStatic` fallback in src/server/server.ts.
2. Restyle inner content: Cormorant SC title, IM Fell SC labels, blood Continue band per tokens. Keep DOM hooks (`data-sound-dialog`, `#bt-sound-music`, etc.) so sound-dialog.spec.ts and acceptance "board has no buttons except Sound" keep working.
3. Sliders: custom track/thumb or styled range that reads as physical, not Material. Test buttons stay board-local controls.
4. Backdrop: void scrim over the landing painting; do not block the painting entirely (match mock transparency).
5. Reduced motion: no ink-in animation on open; optional 300ms opacity fade only.

No change to board/server/device messages, engine state, session state, or audio math in boardAudio.ts / layers.ts.

Tests: extend sound-dialog.spec.ts with screenshots at 1180×820; run pnpm check. Update board-look only if needed for backdrop z-index.

Out of scope: tower volume UI, Control menu, replay.

Open a PR titled "feat(bloodtower): Sound dialog visuals (visuals step 1)".
```

## 2. Landing backdrop flicker

**Status: backlog (Bob, 2026-10-19).** Kept for later; do not start.

**Review focus:** Per-group flicker (four glow layers) unless PR documents Option A conflict; `steps(1,end)` not sine; reduced motion steady glow; flash safety ≤3 brightness jumps/s; mask/glow URLs under `/landing/window-mask/` aligned with `cover` / `left top`.

```text
Illusionist dialog-frame and window-mask assets are already on `main` (a5bacf5).

Branch: feat/visuals-02-backdrop-flicker
Depends on: step 6 merged, or Option A (CSS-only, no `StoryBoard.tsx` edit). Touch only `.bt-board-backdrop` (markup), `boardWindowMask.ts`, and `board.css` backdrop rules; do not edit SoundDialog or DialogFrame.

Read CLAUDE.md, research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-01, R3-UI-02), docs/research/splash-animation/README.md, apps/bloodtower/public/landing/window-mask/README.md, docs/deliveries/2026-10-18-dialog-frame-and-window-mask.md. Code: board.css (.bt-board > .bt-board-backdrop), boardWindowMask.ts (create it), StoryBoard.tsx (backdrop children only).

Goal: the hero painting (`/landing/hero.webp`) has slow, irregular window-glow flicker (motion-still), not a strobe.

1. Create `boardWindowMask.ts` exporting `BOARD_WINDOW_MASK_URL` set to the real mask (`/landing/window-mask/window-mask.png` or per-group masks as needed). Wire `board.css` via `var(--bt-window-mask, …)` from that module or `data-window-mask` on `.bt-board-backdrop`.
2. **Default: Option B (per-group flicker)** from the window-mask README: four child layers inside `.bt-board-backdrop` (`window-glow-a`…`d`, distinct `animation-duration` / negative delays). If that conflicts with an in-flight `StoryBoard` edit (e.g. step 6), use Option A (single `::before` layer) and **state which option and why** in the PR.
3. `mix-blend-mode: screen` (or plus-lighter); stepped easing `steps(1,end)` ~1–2 Hz; keep sepia on the photo. `prefers-reduced-motion: reduce`: steady glow, no flicker.
4. Flicker on all screens using `.bt-board-backdrop`. No JS timers.

No change to TitleScreen.tsx unless trivial duplicate CSS (out of scope).

No protocol/engine/message changes.

Tests: optional unit test for reduced-motion helper; e2e screenshot optional. Manual flash-safety check.

Out of scope: bats (#72), tower-state-driven flicker (note in PR only).

Open a PR titled "feat(bloodtower): board backdrop flicker (visuals step 2)".
```

## 3. Startup shell layout (centered dialogs)

**Review focus:** `DialogFrame` + real SVG at first introduction; `data-board-mode` startup vs play; pick-story fits 1024×594; no protocol changes.

```text
Illusionist dialog-frame and window-mask assets are already on `main` (a5bacf5).

Branch: feat/visuals-03-startup-shell
Depends on: play track steps 6–8 merged (recommended; same as the Status table; rebases StoryBoard). Hard dependency of steps 1 and 9 (it creates `DialogFrame.tsx`). Do not run with 1, 4, 5 or 9 until this merges.

Read CLAUDE.md, apps/bloodtower/spec.md (D28), research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-01, R3-UI-10 layer 3, R3-UI-11), apps/bloodtower/public/board/dialog-frame/README.md. Visual target: v2-mac.png. Code: StoryBoard.tsx, DialogFrame.tsx (create if missing), board.css (.bt-board-main startup grid).

Goal: before `play`, one centred dialog (layer 3) over the landing painting; hunter roll and join QR hidden or folded per R3-UI-11.

1. Create `DialogFrame.tsx` (it does not exist on `main`) with real dialog-frame assets (SVG + parchment CSS from README). No placeholder chrome.
2. Wrap startup centre panels (`SplashPanel`, tower/pick/settings/party/begin, etc.) in `DialogFrame`. Set `data-board-mode="startup"` for every pre-play `FlowScreen` in `src/web/lib/screens.ts`: splash, tower-connect, tower-volume-test, pick-story, game-settings, not-playable, party-join, setup, begin; play/quit use play mode (coordinate with step 6). Document quit styling in PR.
3. CSS: startup mode — single centred column (~min(52rem, 92vw)); drop side hunter list and right join aside from layout. Keep `NextPrompt` under the dialog (R2-115).
4. Pick Game carousel must fit without horizontal scroll at 1024×594.

No change to protocols, engine, or device screens.

Tests: update opening-screens.spec.ts / board-look if side columns asserted; e2e screenshots at 1024×594, 1180×820, 1920×1080.

Out of scope: running summary (step 5), carousel polish (step 4), play chrome (step 6).

Open a PR titled "feat(bloodtower): centered startup shell (visuals step 3)".
```

## 4. Pick Game carousel in the shell

**Review focus:** Carousel inside single `DialogFrame`; peek dedupe with two packs; device screens still image-free.

```text
Illusionist dialog-frame and window-mask assets are already on `main` (a5bacf5).

Branch: feat/visuals-04-carousel-dialog
Depends on: step 3. Run alone (owns PickStoryPanel + carousel CSS).

Read CLAUDE.md, spec.md D28, research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-24, R3-UI-51), docs/art-direction/game-look.md §3. Code: StoryBoard.tsx (PickStoryPanel, CarouselPeek), board.css (.bt-carousel*).

Goal: Pick Game as centred parchment dialog with plate-framed 16:9 covers; focused card dominant, neighbours peeking.

1. Carousel inside `DialogFrame` + inner parchment: cover with double rule + sepia; title, tagline, "N hunters" per §4a.
2. Peek cards smaller; maintain wrap with two packs (peek dedupe when prev === next).
3. Devices unchanged (no images).

No protocol changes.

Tests: carousel peek dedupe unit tests; e2e pick-story screenshot at 1024×594, 1180×820, 1920×1080; pnpm check.

Out of scope: saved-game cards (R2-41), hunter portraits on carousel.

Open a PR titled "feat(bloodtower): Pick Game carousel visuals (visuals step 4)".
```

## 5. Startup running summary

**Review focus:** Restyles and relocates the existing `SummaryPanel`; display-only from existing `storyboardState.summary`; Q3 default (a) placement; existing `data-summary` / `data-summary-item` e2e hooks kept.

```text
Illusionist dialog-frame and window-mask assets are already on `main` (a5bacf5).

Branch: feat/visuals-05-startup-summary
Depends on: step 3. Does not use `DialogFrame` — summary is `.bt-panel` / ink panel.

Read research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-25), shell-prompts.md step 5. Shell step 5 (#87) is already on `main`: `SummaryPanel` (in StoryBoard.tsx), `data-summary` / `data-summary-item`, `SummaryItemId` (includes "setup", in screens.ts) and `storyboardState.summary` (in messages.ts) all exist. Code: StoryBoard.tsx (SummaryPanel), board.css, src/web/lib/screens.ts.

Goal: restyle and relocate the existing `SummaryPanel` (game, settings, tower, hunters, setup steps done; empty -> "not chosen yet"). Do not rebuild it.

1. Keep using `storyboardState.summary` as it is. No new fields, no new data attributes; keep the existing `data-summary` / `data-summary-item` hooks that opening-screens.spec.ts and acceptance.spec.ts use.
2. Placement: Q3 default (a) - move it to the right column of the centred startup shell (startup mode from step 3), styled as an ink panel.
3. The `setup` summary item is already supplied by `summaryItems`; style it like the others.

No protocol changes.

Tests: unit render with filled vs empty rows; e2e after game-settings + tower-connect; viewports 1024×594, 1180×820, 1920×1080.

Out of scope: engine setup flow and summary data (shell owns).

Open a PR titled "feat(bloodtower): startup running summary (visuals step 5)".
```

## 6. Play-screen chrome (header and columns)

**Review focus:** Q1 (a) Tower + Join as ink panels; `data-board-mode="play"`; three-column layout; board-look + 1920×1080.

**Status: in progress (Bob).** Full coding prompt: `apps/bloodtower/plans/visuals-prompts.md` §6 (`feat/visuals-06-play-chrome`). This runbook does not duplicate it.

Apply **Q1 (a)** in the in-flight branch. Tests must include **1920×1080** (target TV) in addition to existing board-look viewports.

## 7. Hunter roll cartouches

**Review focus:** Q2 default (a) status mapping; corruption shows unavailable not fake zero; cartouche viewports 1024×594, 1180×820, 1920×1080.

```text
Branch: feat/visuals-07-hunter-roll
Depends on: step 6. Run alone.

Read game-look.md §3 cartouche, §4 left sidebar. Code: StoryBoard HunterList, PortraitCard, board.css .bt-cart*, src/web/lib/boardView.ts (holdingText).

Goal: hunter cards match cartouche spec: octagon clip, medallion portraits when `packId` + portrait exist, acting hunter blood rule, away styling.

1. Q2 default (a): map status from existing fields (no holder → `Waiting`, disconnected → `Away`, else holder id); improve typography and epithet line.
2. Corruption column: 56px area showing "—" or unavailable until engine exposes corruption (never fake 0).
3. board-look cartouche assertions at 1024×594, 1180×820, and 1920×1080.

No protocol changes.

Tests: boardView tests if holdingText changes; board-look screenshots at all three viewports.

Out of scope: sidebar cycling, battle status.

Open a PR titled "feat(bloodtower): hunter roll cartouches (visuals step 7)".
```

## 8. Play parchment, still plate, and next band

**Review focus:** No `CameraStill` math changes; `#78` attributes preserved; party items unavailable not fabricated.

```text
Branch: feat/visuals-08-play-parchment
Depends on: step 6; step 7 merged first if both were open (owns PlayPanel).

Read game-look.md §3 parchment page, §4 main story view. Code: PlayPanel in StoryBoard.tsx, board.css .bt-page .bt-narration, CameraStill wrapper, NextPrompt.

Goal: kicker, title, ornament, justified narration with Fraktur drop cap; stills in `.bt-plate`; blood-band next prompt (60px class).

1. Do not change CameraStill transform math or data attributes (#78). `.bt-plate` styling only.
2. Moment text: `displayCaption`; `<mark>` candle highlights are deferred: board.css has no `mark` rule and displayCaption returns plain text, so the earlier claim that they were "already in CSS" was wrong.
3. Party items zone: labels only, values unavailable until state has items.

No protocol changes.

Tests: keeper-fit and board-look grey-stair; viewports 1024×594, 1180×820, 1920×1080.

Out of scope: clip/full-screen (step 10), waiting copy (step 9).

Open a PR titled "feat(bloodtower): play parchment and prompt band (visuals step 8)".
```

## 9. In-game waiting dialog

**Review focus:** `isVisualMoment` parity with LiveBoard; compact `DialogFrame` with real SVG; beds unchanged in layers.ts.

```text
Illusionist dialog-frame and window-mask assets are already on `main` (a5bacf5).

Branch: feat/visuals-09-waiting-dialog
Depends on: steps 3, 8 and 10 merged (3 creates `DialogFrame.tsx`; 10 owns the visual layer). Rebase if 11 is in flight. Lane: Dialog / startup.

Read research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-10, R3-UI-30) and R2-115 (research/game-design/r2-screen-flow.md), apps/bloodtower/public/board/dialog-frame/README.md. Code: StoryBoard PlayPanel, DialogFrame.tsx, board.css, src/web/lib/audio/layers.ts (read `isVisualMoment`).

Goal: text-only play moments show small centred waiting dialog over the painting, not full parchment column.

1. Waiting when `screen === "play"` && moment && !isVisualMoment(moment).
2. Hide/shrink parchment/still; `DialogFrame` with prompt from `state.prompt` or nextPrompt().
3. Audio: non-visual moments stay on waiting beds (layers.ts).

No protocol changes.

Tests: e2e text-only beat; screenshot at 1024×594, 1180×820, 1920×1080; layers.test.ts unchanged.

Out of scope: action-needed top dialogs, pause banners.

Open a PR titled "feat(bloodtower): in-game waiting dialog (visuals step 9)".
```

## 10. Visual zoom layer

**Review focus:** Q4 default (a) letterbox in zoom only; `data-board-layer`; acceptance camera test; reduced motion; audio `pickLayers` unchanged.

```text
Branch: feat/visuals-10-visual-zoom
Depends on: step 8. Run alone. Step 9 may follow separately.

Read playthrough-ui-notes (R3-UI-10 layer 2, R3-UI-31, R3-UI-32, R3-UI-60). Code: StoryBoard.tsx, LiveBoard.tsx (wrapper/class only), board.css, layers.ts (read only).

Goal: `isVisualMoment` → full-screen layer 2 (~0.6–1.0s zoom); Q4 default (a) letterbox in zoom layer only; reduced motion = opacity cut.

1. `data-board-layer="visual" | "waiting" | "startup"`; CSS transitions; no new board buttons.
2. LiveBoard: keep `audio.current?.update(pickLayers({ visual }))`.
3. Camera track pan/zoom still runs; re-run acceptance camera test.

No protocol changes.

Tests: acceptance.spec.ts camera track; reduced-motion check if feasible; viewports 1024×594, 1180×820, 1920×1080; timing note in PR.

Out of scope: replay last video, crossfade chain (straight cut first).

Open a PR titled "feat(bloodtower): visual zoom layer (visuals step 10)".
```

## 11. Keeper cinema and captions

**Review focus:** Single fullscreen path with step 10; D7 unchanged; caption hooks for board-look.

```text
Branch: feat/visuals-11-keeper-cinema
Depends on: step 10. Run alone.

Read playthrough-ui-notes (R3-UI-33, R3-UI-33b), game-look.md §4 cut scenes, §5 motion. Code: KeeperScene.tsx, KeeperBoardCaption.tsx, board.css .bt-keeper .bt-caption, StoryBoard play layout.

Goal: Keeper uses visual layer treatment; caption lower third ≥ 1/25 screen height; captions on by default; toggle unchanged.

1. Integrate with step 10 layer (no duplicate fullscreen logic).
2. Keep `data-board-caption` and `data-keeper-line`; style per mock; board-look pause hooks unchanged.
3. keeper-line-ended unchanged (D7).

No protocol changes.

Tests: board-look keeper shots; keeper-fit.spec.ts; KeeperBoardCaption.test.ts; 1920×1080 viewport in board-look where applicable.

Out of scope: new keeper lines, avatar asset changes.

Open a PR titled "feat(bloodtower): Keeper cinema visuals (visuals step 11)".
```
