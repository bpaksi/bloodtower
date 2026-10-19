# Visuals build prompts (Story board)

Bob runs these prompts in Claude Code on the Mac, one per branch. Wright tracks progress here: update the status and PR # when a step opens or merges.

**Visual draft (Illusionist, Oct 2026):** `docs/art-direction/game-look.md` with `docs/art-direction/tokens.css`, `docs/art-direction/moodboard.png`, and static mocks `docs/art-direction/mocks/story-board-1920x1080.png`, `story-board.html`, `frames-mac-0-sound.png` is not in art-direction; use `research/game-design/mockups/2026-10-17/frames-mac-0-sound.png` for the Sound dialog. Shell flow references (dialogs over the landing painting, not final look): `research/game-design/mockups/2026-10-17/v2-mac.png`, `v2-ipad.png`, `v2-iphone.png`.

**Requirements:** `research/game-design/playthrough-ui-notes-2026-10-17.md` (R3-UI-01, 03, 10–12, 11, 24–25, 30–33, 33b, 60, 64), `apps/bloodtower/spec.md` (D7, D28, V2-1 display only), `docs/deliveries/2026-10-17-shell-audio-and-covers.md` (audio levels; do not re-normalize).

**Code today:** `src/web/components/board/{StoryBoard.tsx,LiveBoard.tsx,SoundDialog.tsx,CameraStill.tsx,KeeperScene.tsx}`, `src/web/components/board/board.css`, `src/web/lib/audio/{layers.ts,boardAudio.ts}`, `src/web/components/title/TitleScreen.tsx` (Mac landing before `/board`), `src/e2e/tests/{board-look.spec.ts,opening-screens.spec.ts,sound-dialog.spec.ts,acceptance.spec.ts}`. Camera tracks and uniform-scale stills landed in #78; Sound dialog and layers in #83. iPad device CSS is out of scope unless a step says otherwise (Bob: iPad screens are fine).

**Hard constraints (every step):** No change to `bloodtower-protocols` message types or fields, engine session rules, or hub routing. The Story board still sends only `keeper-line-ended` (D7). Do not break camera tracks (`CameraStill`, `cameraStillImageStyle`, `data-camera-still`, acceptance camera assertions). Do not break audio layers (`BoardAudio`, `pickLayers`, `isVisualMoment` ducking/fade hooks in `LiveBoard.tsx`). Use pnpm and Next.js; scoped CSS on `.bt-board` for the TV layout.

**Missing Illusionist assets (in progress, not delivered):**

| Asset | Used for | Single swap point (create on first step that needs it) |
|---|---|---|
| **Dialog frame** | Centred board dialogs (Sound, startup/wizard, in-game waiting) | `src/web/components/board/DialogFrame.tsx` — export `DialogFrame` with `data-illusionist-asset="dialog-frame"`. Until delivery, render children inside `.bt-dialog-frame-placeholder` (CSS double-rule from `tokens.css`, labelled in code comment `ILLUSIONIST_PLACEHOLDER_DIALOG_FRAME`). No other file may draw its own modal chrome; import `DialogFrame` only. |
| **Window mask** | R3-UI-02 motion-still glow on `/landing/hero.webp` | `src/web/components/board/boardWindowMask.ts` — export `BOARD_WINDOW_MASK_URL` (placeholder: inline SVG data URI in that file only, comment `ILLUSIONIST_PLACEHOLDER_WINDOW_MASK`). `board.css` references the mask only via `var(--bt-window-mask, …)` set from that module or a `data-window-mask` attribute on `.bt-board-backdrop`. |

**Follow-up (after Illusionist delivery):** one small PR per asset — swap in final dialog frame / window mask from Illusionist at the swap point above; remove placeholder comments; no layout refactors.

Run **steps 6–11 before steps 1–5 and 9** so play-mode work does not depend on placeholder startup chrome. Do not start a step marked **blocked on asset** until the asset is delivered *or* Bob explicitly approves building the swap-point placeholder in that step (called out in the prompt).

## Status

| Step | Branch | Depends on | Can run with | Status | PR # |
|---|---|---|---|---|---|
| 1 | `feat/visuals-01-sound-dialog` | none | — | blocked on asset (dialog frame) | |
| 2 | `feat/visuals-02-backdrop-flicker` | none | — | blocked on asset (window mask) | |
| 3 | `feat/visuals-03-startup-shell` | none | — | blocked on asset (dialog frame) | |
| 4 | `feat/visuals-04-carousel-dialog` | 3 | — | blocked on asset (dialog frame) | |
| 5 | `feat/visuals-05-startup-summary` | 3 | — | todo (after 3; ink panel, no dialog frame) | |
| 6 | `feat/visuals-06-play-chrome` | none | 7 | in review (Open question 1: option a; QR hidden in play; quit is not play mode, it keeps the closing summary and join block; Now acting reads unavailable until the engine exposes an acting hunter) | |
| 7 | `feat/visuals-07-hunter-roll` | 6 | none | in review (Q2 (a) status: Waiting / Away / holder id; portrait medallions whenever packId + portrait exist; corruption column reads unavailable; no acting-hunter highlight, the `.bt-cart-act` blood rule stays in board.css unused until the engine exposes an acting hunter; no epithet line, the hunter schema has no epithet field) | #93 |
| 8 | `feat/visuals-08-play-parchment` | 6 | 7 | todo | |
| 9 | `feat/visuals-09-waiting-dialog` | 8 | — | blocked on asset (dialog frame) | |
| 10 | `feat/visuals-10-visual-zoom` | 8 | none | todo | |
| 11 | `feat/visuals-11-keeper-cinema` | 10 | none | todo | |

## Parallel waves

Bob should run **play TV track first** (no Illusionist frame/mask). **Startup / Sound / flicker last**, after assets land or via an approved placeholder-only PR for that step.

- **Wave P (play, go now):** 6, then 7 and 8 (7 before 8 if both open; 8 owns `PlayPanel`). Step 6 sets `data-board-mode="play"` on `main.bt-board` when `screen === "play"` (not `quit`: quit is "table closed", spec D20); it does not require step 3. Do not run 6 with 4 or 5.
- **Wave P2 (after 8):** 10 then 11 (visual zoom, then Keeper). Step 10 does not require step 9 (waiting dialog is separate).
- **Wave P3 (after 10, optional before assets):** 9 only after **dialog frame** is delivered (or Bob approves placeholder in step 9).
- **Wave S (startup, after dialog frame):** 3, then 4 and 5 (4 and 5 rebase `StoryBoard.tsx`; 5 uses `.bt-panel` summary, not `DialogFrame`).
- **Wave S2 (after window mask):** 2 alone (`.bt-board-backdrop` mask only).
- **Wave S3 (after dialog frame, with or after 3):** 1 (`SoundDialog` wrapped in `DialogFrame`; can run with 3 if files conflict—prefer after 3 merges).

When shell steps 5–7 from `shell-prompts.md` land (`setup` flow screens, Claim Hunters rename, running-summary data), step 5 should gain follow-up rows in a small patch PR or a step-5b prompt—do not block the visuals track on shell, but leave summary hooks ready (see step 5).

## Open questions (Bob)

1. **Play header right zone.** `game-look.md` §4 shows skull supply/dropped tonight; the engine does not expose those on `storyboardState` yet. Options: (a) keep Tower + Join in the header during play but style them as ink panels; (b) show skull numerals as `unavailable` placeholders; (c) hide the right header zone in play until stats exist; (d) defer play-header redesign to a later stats milestone.
2. **Public hunter status strings.** The mock uses `Choosing` / `Locked` / `Away` / `Sitting out`; today the roll shows holder device ids (`board-look.spec.ts` asserts that). Options: (a) map only from existing fields (no holder → `Waiting`, disconnected → `Away`, else holder id); (b) map prompt/lock hints when `state.lock` or pick state exists without protocol changes; (c) wait for a small protocol addition (out of scope for this plan); (d) keep holder ids but restyle typography only.
3. **Startup summary placement.** R3-UI-25 shows a panel beside the dialog. Options: (a) right column inside the centered shell (mock-like); (b) narrow column left of the dialog; (c) second parchment card under the dialog on short viewports; (d) single combined dialog until viewport ≥ 1180px.
4. **Full-screen still scaling during zoom.** R3-UI-31 asks for letterboxed uncropped art; camera tracks use uniform scale + cover in the well. Options: (a) letterbox in zoom layer only, keep cover inside the parchment well when not zoomed; (b) letterbox everywhere for stills; (c) cover everywhere (status quo); (d) per-moment `kind` (still vs clip) rules.

## 1. Sound dialog look

```text
Branch: feat/visuals-01-sound-dialog
Depends on: step 3 merged (recommended) or dialog frame delivered. Do not run until dialog frame is delivered unless Bob approves placeholder-only work. Do not edit .bt-board-backdrop (step 2).

Missing asset: Illusionist **dialog frame** (in progress). Wrap the dialog in `DialogFrame` from `src/web/components/board/DialogFrame.tsx` (create swap point on first use). Until delivery, `DialogFrame` renders `.bt-dialog-frame-placeholder` only inside that file. Follow-up: swap in final dialog frame from Illusionist at `DialogFrame.tsx`; remove `ILLUSIONIST_PLACEHOLDER_DIALOG_FRAME`.

Read CLAUDE.md, docs/art-direction/game-look.md (§2–3 frames, §4a type, §7 avoid), research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-03). Visual target: research/game-design/mockups/2026-10-17/frames-mac-0-sound.png. Code: SoundDialog.tsx, DialogFrame.tsx, board.css (.bt-sound-*; no duplicate frame chrome outside DialogFrame).

Goal: the Sound dialog matches the Illusionist frame language over the landing painting, TV-readable type (≥ 28px labels), candle focus rings—not browser default grey card.

1. Restyle inner content: Cormorant SC title, IM Fell SC labels, blood Continue band per tokens. Outer chrome comes only from `DialogFrame`. Keep the same DOM hooks (`data-sound-dialog`, `#bt-sound-music`, etc.) so sound-dialog.spec.ts and acceptance "board has no buttons except Sound" keep working.
2. Sliders: custom track/thumb or styled range that reads as physical, not Material. Test buttons stay board-local controls (only allowed buttons on the board).
3. Backdrop: void scrim over the landing painting; do not block the painting entirely (match mock transparency).
4. Reduced motion: no ink-in animation on open; optional 300ms opacity fade only.

No change to board/server/device messages, engine state, session state, or audio math in boardAudio.ts / layers.ts.

Tests: extend sound-dialog.spec.ts with a screenshot at 1180×820; run pnpm check. Update board-look only if needed for backdrop z-index.

Out of scope: tower volume UI, Control menu, replay.

Open a PR titled "feat(bloodtower): Sound dialog visuals (visuals step 1)".
```

## 2. Landing backdrop flicker

```text
Branch: feat/visuals-02-backdrop-flicker
Depends on: none. Do not run until **window mask** is delivered unless Bob approves placeholder-only work. Touch only `.bt-board-backdrop` and `boardWindowMask.ts`; do not edit SoundDialog or DialogFrame.

Missing asset: Illusionist **window mask** (in progress). Use `BOARD_WINDOW_MASK_URL` from `src/web/components/board/boardWindowMask.ts` as the only mask source (`ILLUSIONIST_PLACEHOLDER_WINDOW_MASK` until delivery). Wire `board.css` through `var(--bt-window-mask)` set from that export. Follow-up: swap in final window mask from Illusionist in `boardWindowMask.ts`; remove placeholder.

Read CLAUDE.md, research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-01, R3-UI-02), docs/research/splash-animation/README.md (motion-still technique, wish list). Code: board.css (.bt-board > .bt-board-backdrop), boardWindowMask.ts.

Goal: the hero painting on the Story board (`/landing/hero.webp`) has slow, irregular window-glow flicker (motion-still: static art + mask layer), not a strobe.

1. Apply the mask over the backdrop `::after` gradient: opacity animation ~1–2 Hz with stepped easing (`steps(1,end)` per game-look §5), candle-coloured glow in the window region. Keep sepia on the photo.
2. `prefers-reduced-motion: reduce`: steady glow, no flicker (R3-UI-02).
3. Flicker runs on all screens that show `.bt-board-backdrop` (splash through play). Do not add JS timers.

No change to TitleScreen.tsx unless you need the same flicker on `/` (out of scope unless trivial duplicate CSS class).

No protocol/engine/message changes.

Tests: unit test optional for a prefers-reduced-media query helper; e2e screenshot optional. Manual: flash-safety—no >3 brightness jumps per second.

Out of scope: bats (#72), tower-state-driven flicker (note in PR only).

Open a PR titled "feat(bloodtower): board backdrop flicker (visuals step 2)".
```

## 3. Startup shell layout (centered dialogs)

```text
Branch: feat/visuals-03-startup-shell
Depends on: none. Run after play track (steps 6–11) and after **dialog frame** is delivered unless Bob approves placeholder-only work. Do not run with 4 or 5 until this merges.

Missing asset: Illusionist **dialog frame** (in progress). Introduce `DialogFrame.tsx` here if step 1 has not run. Wrap each startup centre column panel (`SplashPanel`, tower/pick/settings/party/begin, etc.) in `DialogFrame`; placeholder chrome lives only in `DialogFrame.tsx`. Follow-up: swap in final dialog frame from Illusionist at `DialogFrame.tsx`.

Read CLAUDE.md, apps/bloodtower/spec.md (D28: start-up dialogs not yet centred), research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-01, R3-UI-10 layer 3, R3-UI-11). Visual target: v2-mac.png (dialogs over painting). Code: StoryBoard.tsx, DialogFrame.tsx, board.css (grid for .bt-board-main), src/web/lib/screens.ts only if you need a helper for "is startup screen".

Goal: before `play`, the board is not a three-column dashboard: the landing painting fills the view, with one centred dialog (layer 3). Hunter roll and join QR are hidden or folded into the dialog area per R3-UI-11; the R2-01 status strip stays debug-only (`?debug=1`, already hidden in board-look).

1. Set `data-board-mode="startup"` on `main.bt-board` for screens splash, pick-story, game-settings, not-playable, tower-connect, party-join, begin; `data-board-mode="play"` for play and quit (step 6 may already set play mode—rebase cleanly). Quit may use startup styling—pick one and document in PR.
2. CSS: in startup mode, collapse `.bt-board-main` to a single centred column (max width ~min(52rem, 92vw)), drop side hunter list and right join aside from layout (QR may move inside the active panel on party-join). Outer dialog chrome only via `DialogFrame`.
3. Keep `NextPrompt` visible under the dialog (R2-115 mirror). Tower header zones may stay minimal or move into the dialog—follow Open question 1 for play; startup can show slim tower/join in header or inside dialog.
4. Pick Game carousel must still fit without horizontal scroll at 1024×594 (opening-screens / board-look viewports).

No change to protocols, engine, or device screens.

Tests: update opening-screens.spec.ts and board-look if assertions reference side columns on pick-story; add unit test for board mode attribute vs screen enum if cheap. e2e screenshots at three viewports in PR.

Out of scope: running summary (step 5), carousel polish (step 4), play chrome (step 6).

Open a PR titled "feat(bloodtower): centered startup shell (visuals step 3)".
```

## 4. Pick Game carousel in the shell

```text
Branch: feat/visuals-04-carousel-dialog
Depends on: step 3 (centered shell). Blocked on **dialog frame** (same as step 3). Run alone (owns PickStoryPanel + carousel CSS).

Missing asset: Illusionist **dialog frame** — carousel lives inside `DialogFrame` from step 3; do not add a second outer frame. Follow-up: swap in final dialog frame from Illusionist at `DialogFrame.tsx`.

Read CLAUDE.md, spec.md D28, research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-24, R3-UI-51). Visual: v2-mac.png carousel frame; docs/art-direction/game-look.md §3 ornate border on art. Code: StoryBoard.tsx (PickStoryPanel, CarouselPeek), board.css (.bt-carousel*).

Goal: Pick Game reads as a centred parchment dialog with cover art in a plate frame, focused card dominant, neighbours peeking—matching D28 and the Oct 17 mac mock inside the startup shell.

1. Carousel layout inside `DialogFrame` + inner parchment: 16:9 cover with double rule + sepia filter; title, tagline, "N hunters" typography per §4a.
2. Peek cards: smaller, partial cover, title only; maintain wrap behaviour with two packs (peek deduping when prev === next).
3. Devices still have no images; board-only covers unchanged URLs.

No protocol changes.

Tests: unit tests for carousel peek dedupe if not already present; e2e pick-story screenshot; pnpm check.

Out of scope: saved-game cards (R2-41), hunter portraits on carousel (R3-UI-20 is pack cast—no new data).

Open a PR titled "feat(bloodtower): Pick Game carousel visuals (visuals step 4)".
```

## 5. Startup running summary

```text
Branch: feat/visuals-05-startup-summary
Depends on: step 3. Can run with step 6 only after 3 merges (rebases StoryBoard.tsx). Does not use dialog frame — summary is `.bt-panel` / ink panel per game-look.md §3.

Read research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-25), shell-prompts.md step 5 (future setup steps). Code: StoryBoard.tsx (new SummaryPanel or aside), board.css, src/web/lib/screens.ts helpers.

Goal: during startup, a summary panel echoes choices: game (cover + title), settings, tower state, hunters with holder, setup steps done. Empty items read "not chosen yet". Back clearing is engine behaviour—only display what state already holds.

1. Use existing `storyboardState`: `stories` + `gameSettings`, `tower`, `hunters`, `packId` for cover URL. No new fields.
2. Placement: resolve Open question 3; default right of centred dialog in startup mode.
3. When shell step 5 merges `setup` screens into the flow, add rows for each completed setup step from session-backed state in a follow-up commit (note in PR; optional `data-setup-summary` stub now).

No protocol changes in this step.

Tests: unit render test with fixture state showing filled vs empty rows; e2e after game-settings + tower-connect path.

Out of scope: editing engine to add setup (shell owns that).

Open a PR titled "feat(bloodtower): startup running summary (visuals step 5)".
```

## 6. Play-screen chrome (header and columns)

```text
Branch: feat/visuals-06-play-chrome
Depends on: none (first play-track step). Do not run with 4 or 5. Does not use dialog frame or window mask.

Read docs/art-direction/game-look.md §4 (1920 layout), mocks/story-board.html header grid. Code: StoryBoard.tsx header, .bt-board-main grid for play mode, .bt-pub aside.

Goal: during `play`, restore the three-column TV layout from the Illusionist mock: hunter roll left, story centre, public acting panel right; header shows scene/chapter centre (already in headerCopy) with phase and table zones styled as ink panels.

1. Play mode: show hunter roll and right aside; join QR moves to compact footer or hides except party-join (not in play). Resolve Open question 1 for right header (tower vs skulls).
2. Title block: kicker + place per mock; candle flicker class on chapter title where appropriate.
3. Debug strip unchanged.

No protocol changes.

Tests: board-look.spec.ts proving-ground and grey-stair paths still pass fit tests; update screenshots.

Out of scope: party items strip (step 8), corruption numerals without data (show unavailable).

Open a PR titled "feat(bloodtower): play screen chrome (visuals step 6)".
```

## 7. Hunter roll cartouches

```text
Branch: feat/visuals-07-hunter-roll
Depends on: step 6. Run alone.

Read game-look.md §3 cartouche, §4 left sidebar. Code: StoryBoard HunterList, PortraitCard usage, board.css .bt-cart*, src/web/lib/boardView.ts (holdingText).

Goal: hunter cards match cartouche spec: octagon clip, medallion portraits whenever `packId` + portrait exist (not only party-join), acting hunter blood rule, away styling.

1. Resolve Open question 2 for status text; at minimum improve typography and epithet line.
2. Corruption column: 56px numeral area showing "—" or `unavailable` until engine exposes corruption (never show 0 as fake data).
3. board-look cartouche viewport assertions must still pass at 1180×820 and 1024×594.

No protocol changes.

Tests: boardView tests if holdingText mapping changes; board-look screenshots.

Out of scope: sidebar cycling (R2 out of scope), battle status.

Open a PR titled "feat(bloodtower): hunter roll cartouches (visuals step 7)".
```

## 8. Play parchment, still plate, and next band

```text
Branch: feat/visuals-08-play-parchment
Depends on: step 6. Can run with step 7 if step 7 merged first (PlayPanel ownership).

Read game-look.md §3 parchment page, §4 main story view and next-step prompt. Code: PlayPanel in StoryBoard.tsx, board.css .bt-page .bt-narration, CameraStill wrapper classes, NextPrompt.

Goal: shared moments use kicker, title, ornament, justified narration with Fraktur drop cap on first paragraph; stills sit in a plate frame; next-step prompt is the blood-band bar (60px class) per mock.

1. Do not change CameraStill transform math or data attributes (#78). Wrap still in `.bt-plate` styling only.
2. Moment text: use displayCaption; optional `<mark>` styling for candle highlights already in CSS.
3. Party items zone: layout with labels only, values `unavailable` until items exist on state (no fake counts).

No protocol changes.

Tests: keeper-fit and board-look grey-stair; unit test for drop-cap only if logic extracted.

Out of scope: clip/full-screen (step 10), pick-card waiting copy (step 9).

Open a PR titled "feat(bloodtower): play parchment and prompt band (visuals step 8)".
```

## 9. In-game waiting dialog

```text
Branch: feat/visuals-09-waiting-dialog
Depends on: step 8. Run after **dialog frame** is delivered (or Bob approves placeholder). Run after step 10 if 10 is in flight (rebases play layout). Reuse `DialogFrame.tsx` from step 3/1.

Missing asset: Illusionist **dialog frame** (in progress). Small centred waiting UI must be wrapped in `DialogFrame` only; no ad-hoc border CSS elsewhere. Follow-up: swap in final dialog frame from Illusionist at `DialogFrame.tsx`.

Read research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-10 layer 3, R3-UI-30) and R2-115 (research/game-design/r2-screen-flow.md). Code: StoryBoard PlayPanel, DialogFrame.tsx, board.css, src/web/lib/audio/layers.ts (isVisualMoment—text-only moments are not visual).

Goal: when play has no full-screen visual (no still, not Keeper, not clip), show a small centred waiting dialog over the painting with the prompt label ("Waiting for…"), not a full parchment page filling the column.

1. Detect waiting: `screen === "play"` && moment present && !isVisualMoment(moment) (import same helper as LiveBoard).
2. Hide or shrink parchment/still area; show compact `DialogFrame` with prompt from `state.prompt` or nextPrompt().
3. Audio: beds keep playing (layers.ts already treats non-visual as waiting).

No protocol changes.

Tests: e2e beat with text-only moment; screenshot; layers.test.ts unchanged.

Out of scope: action-needed top dialogs (R3-UI-35), pause banners (already exist).

Open a PR titled "feat(bloodtower): in-game waiting dialog (visuals step 9)".
```

## 10. Visual zoom layer

```text
Branch: feat/visuals-10-visual-zoom
Depends on: step 8. Run alone. Does not use dialog frame or window mask. Step 9 may follow later.

Read playthrough-ui-notes (R3-UI-10 layer 2, R3-UI-31, R3-UI-32, R3-UI-60 fade ~1s). Code: StoryBoard.tsx, LiveBoard.tsx (wrapper only—pass `visual` or class), board.css, layers.ts (read only).

Goal: when isVisualMoment is true, the still/keeper/clip presentation animates to full-screen layer 2 (~0.6–1.0s zoom), letterbox per Open question 4 default (a); reduced motion = opacity cut. Exiting is driven by iPad continue (state change)—animate back to waiting dialog when moment ends (step 9 styling optional until frame asset lands).

1. Add `data-board-layer="visual" | "waiting" | "startup"` on main or a wrapper; CSS transitions; do not add board buttons.
2. LiveBoard: keep `audio.current?.update(pickLayers({ visual }))` behaviour; optional class when visual true.
3. Camera track pan/zoom inside the still must still run in the visual layer; re-run acceptance camera test.

No protocol changes.

Tests: acceptance.spec.ts camera track; new e2e reduced-motion check if feasible; timing manual note in PR.

Out of scope: replay last video (R3-UI-34), crossfade between two queued visuals (implement straight cut first, chain in follow-up).

Open a PR titled "feat(bloodtower): visual zoom layer (visuals step 10)".
```

## 11. Keeper cinema and captions

```text
Branch: feat/visuals-11-keeper-cinema
Depends on: step 10. Run alone.

Read playthrough-ui-notes (R3-UI-33, R3-UI-33b), game-look.md §4 cut scenes, §5 motion. Code: KeeperScene.tsx, KeeperBoardCaption.tsx, board.css .bt-keeper .bt-caption, StoryBoard play layout.

Goal: Keeper moment uses full visual layer treatment: portrait plate, caption lower third ≥ 1/25 screen height, readable bone/candle typography; captions on by default; keyboard toggle unchanged.

1. Integrate keeper layout with step 10 layer (no duplicate fullscreen logic).
2. Caption sync: keep data-board-caption and data-keeper-line; style per mock; pause audio test hooks in board-look unchanged.
3. keeper-line-ended path unchanged (D7).

No protocol changes.

Tests: board-look keeper shots; keeper-fit.spec.ts; KeeperBoardCaption.test.ts.

Out of scope: new keeper lines, avatar asset changes.

Open a PR titled "feat(bloodtower): Keeper cinema visuals (visuals step 11)".
```
