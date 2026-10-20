# Browser-to-TV Experiment Log

Started: 2026-10-20 · Last updated: 2026-10-20

**Purpose:** Find the simplest reusable way to present any responsive browser experience fullscreen on a TV, with consistent picture/audio and approximately one-minute repeat-session setup. Update this file with observations and repost it for next-step analysis.

## Requirements and current facts

- Host: MacBook Air, Apple M4, 16 GB; user-reported macOS Tahoe 26.6.2.
- Game: local Mac web server; responsive Story Board; iPads control over WebSocket; Mac/mouse fallback when no iPads are connected.
- Available hardware: Samsung 9 Series 65-inch, Roku Ultra, Roku Streaming Stick+, Fire TV Stick 4K Max.
- Prefer wireless and cross-brand support; affordable consumer hardware is acceptable. Internet may be required.
- Prefer a generic tool over game-specific integration. A custom Mac app is an option, not a decision.
- Existing result: sharing **Chrome via Window or App** to Roku works, but does not use the TV fully. This was not an extended-display test; the cause of the unused space is unconfirmed.
- New goals: evaluate Game Mode, establish repeatable audio, and save per-TV picture settings.
- Separate one-time installation/configuration from repeat-session startup. Do not assume first installation fits in one minute.

**Not yet proven:** DeskPad-to-AirPlay workflow, audio routing, Tahoe runtime compatibility, native Samsung support for the exact model, or one-minute startup.

## Fill in once

| Detail | Value |
|---|---|
| Samsung full model/year and firmware; no serial number | Samsung 9 Series 65-inch; model/year and firmware _unknown_. This is the Story board's target TV |
| Roku Ultra model and OS version | _unknown_ |
| Roku Streaming Stick+ model and OS version | _unknown_ |
| Fire Stick generation and Fire OS version | _unknown_ |
| Chrome version | 154 (from the user agent) |
| iPad model/iPadOS/browser; number connected | _unknown_ |
| Server command and Story Board URL | Test page instead of the Story board: `apps/tv-display-poc`, `pnpm start`, http://127.0.0.1:4760 |
| Network: router, Mac/receiver Wi-Fi or Ethernet, guest network? | _enter_ |
| Audio equipment: TV speakers / soundbar / other | TV speakers |
| Normal room lighting and viewing distance | _enter_ |
| Maximum acceptable one-time / recurring cost | _undecided_ |

## Test rules and measurements

Use the same Story Board scene and media for comparisons. Change one variable at a time. Start with 1080p, then test higher resolution only if needed. Photograph current TV settings before changing them; avoid service menus.

Record **browser viewport**, **display mode**, and **receiver output** separately; a 4K virtual display does not establish a 4K AirPlay stream. macOS exposes different sharing modes and display settings.[cite:255][cite:258]

Run this in the Story Board browser console after moving/fullscreening the window; paste the result into the relevant run log:

```js
JSON.stringify({
  viewportCSS: { width: innerWidth, height: innerHeight },
  screenCSS: { width: screen.width, height: screen.height },
  devicePixelRatio,
  documentFullscreen: Boolean(document.fullscreenElement),
  browser: navigator.userAgent
}, null, 2)
```

Record Chrome zoom separately. `documentFullscreen` only reports the page Fullscreen API state; it does not reliably identify macOS/browser fullscreen. Record that manually.

**Repeat-start timer:** Mac is awake, installation/permissions are complete, and devices are on the network. Start with presentation disconnected and TV in standby. Start timing before waking/selecting the TV; stop when the Story Board fills the intended area, an iPad command updates it, and reference audio is audible. Record server startup separately, then record a total including server startup if that reflects normal use. Also label any faster “TV already awake” trials.

**Proposed pass:** repeat-start at or below 60 seconds on three attempts; no unwanted bars, cropping, desktop, or browser chrome; acceptable text/video/audio; no repeated permissions, URL entry, ads, or settings repairs. Mark unknown rather than guessing transport resolution or latency.

## Experiments in priority order

**First pass:** run E1–E3, then E7–E8 on the winner. E4–E6 are alternatives, not prerequisites. Stop and report blockers instead of completing everything.

### E1 — Reproduce Chrome sharing

- [ ] Use the same Roku and **Window or App → Chrome** as the successful test.
- [ ] Record the original Chrome size, then compare a 16:9-shaped window and fullscreen where available.
- [ ] Test page edges, readable text, motion/video, narration/music/effects as available, and one iPad command.
- **Capture:** which Roku, exact share selection, viewport JSON, zoom/fullscreen state, location of unused space, photo of the whole TV, sound destination, initial setup steps/time.
- **Result/status:** _not tested_
- **Interpretation:** _does changing the source window change the unused TV area?_

### E2 — Roku extended display

- [ ] Select **Extended Display**, not Chrome/window sharing.
- [ ] In Displays settings inspect the TV display and available resolutions; try a suitable 16:9 mode.
- [ ] Move Chrome to the TV desktop and fullscreen it. Repeat E1's content checks.
- [ ] If useful, compare the other Roku without changing TV picture settings.
- **Capture:** selected resolution/scaling, receiver output if reported, viewport JSON, screenshot/photo, Chrome toolbar/menu visibility, sound destination, manual actions and repeat-start times.
- **Result/status:** PASS (2026-10-20) on the **Roku Streaming Stick+**: 1920×1080 at 16:9, sound on the TV in sync, about 60 fps, repeat start under one minute. The Samsung needed **Fit to Screen: On** to stop cropping. It is a whole-TV setting, not per input. See run R2 under Results index. Roku Ultra not tested.
- **Decision:** yes. Roku Stick+ Extended Display is the chosen path, with no extra app or cost. Try the Roku Ultra (Ethernet) only if dropouts show up in play. E7 and E8 are on hold.

Apple documents AirPlay extension and window/app sharing as distinct options.[cite:255]

### E3 — DeskPad virtual display

- [ ] Install from [GitHub releases](https://github.com/Stengo/DeskPad/releases) or `brew install --cask deskpad`; record version and permissions.
- [ ] Set DeskPad's virtual display to 1920 × 1080 through Displays settings; move Chrome there and fullscreen it.
- [ ] Test sharing **DeskPad's preview window** through macOS AirPlay. If the virtual display is separately offered as a sharing source, test that too; record the exact selection.
- [ ] Check for title bars, cursor, cropping, lag, and whether resizing the preview changes the browser viewport.
- [ ] Confirm Chrome audio actually reaches the intended speakers; do not assume preview sharing captures Chrome audio.
- [ ] Quit/reopen DeskPad and Chrome; disconnect/reconnect AirPlay. Check what is remembered.
- **Capture:** app version, permissions/restarts, virtual resolution and scale, viewport JSON, preview size, sharing source, audio route, video behavior, saved state, repeat-start times.
- **Result/status:** _not tested_
- **Decision:** _a useful reusable workspace, or extra complexity compared with E2?_

DeskPad documents virtual-display preview, resolution selection, and screen-recording permissions; it does not document an end-to-end TV/audio solution.[cite:227] Its source includes 1080p and 4K modes.[cite:241]

### E4 — Samsung direct, without Roku

- [ ] Check the exact TV for built-in AirPlay; mark unavailable if absent.
- [ ] If present, repeat the best Chrome-sharing/extension method directly to the TV.
- [ ] Optionally test the Story Board in Samsung's browser if available, using the Mac's LAN URL rather than `localhost`.
- **Capture:** TV model, available modes, browser compatibility if attempted, fullscreen/viewport, audio, latency impression, startup steps, cost, Game Mode availability on this path.
- **Result/status:** _not tested_
- **Decision:** _can the streaming box be eliminated?_

### E5 — Fire Stick: receiver versus browser

- [ ] **AirScreen:** inspect the Amazon Appstore/in-app offer on the actual Fire Stick before paying; the attached Google Play page is not authoritative Fire TV pricing.
- [ ] Record free-session limits, ads, trial duration, monthly/yearly/one-time offers, currency, renewal terms, and whether purchase is per device.
- [ ] If acceptable, test Mac AirPlay connection, extended-display availability, viewport, audio, and reopening after a Fire Stick restart.
- [ ] **Silk alternative:** open the game using the Mac's LAN URL; check compatibility, fullscreen/chrome, WebSocket updates, and sound after an iPad-triggered action. Record any required TV-remote “Start” interaction.
- **Capture:** app/store/version, pricing screenshot/date, complete launch sequence, timers, interruptions, viewport, audio, permissions, background/auto-start behavior.
- **Result/status:** PARTIAL (2026-10-20). Tested **FireMirror** instead of AirScreen, as an extended display: full 16:9 at 1920×1080, sound on the TV speakers, about 100 ms of audio lag, about 30 fps, repeat start under one minute. Bob's verdict: good enough. FireMirror's free trial (Bob didn't know there was one) ended during the run; it costs $9, one-time. Silk not tested. See run R1 under Results index.
- **Decision:** try Roku Extended Display (E2, free) with the same test page first. Buy FireMirror ($9) only if the Roku does worse.

Do not sideload software or grant extra permissions just to enable auto-start during the initial comparison. AirScreen cost and one-minute usability remain unverified.

### E6 — Existing generic presentation apps

Only run if the missing feature is browser launch/display management rather than TV connectivity.

| Priority | Project | Stars, 2026-10-20 | What to evaluate |
|---|---|---:|---|
| 1 | [DeskPad](https://github.com/Stengo/DeskPad) | 7,911 | Covered by E3; virtual workspace, not browser/transport.[cite:227] |
| 2 | [kiosk-browser](https://github.com/IMAGINARY/kiosk-browser) | 30 | Saved URL launcher, fullscreen, display targeting, media diagnostics.[cite:154] |
| 3 | [Jumpstart](https://github.com/alanvww/jumpstart-electron) | 6 | Graphical URL settings and fullscreen/kiosk; test display placement.[cite:162] |
| 4 | [Deskreen](https://github.com/pavlobu/deskreen) | 21,602 | Browser-based WebRTC receiver; only if receiver compatibility is promising.[cite:146] |

Star snapshots were obtained from each repository's GitHub REST API. Rank reflects fit, not popularity; none was runtime-tested in the research.

- [ ] For any app tried, record release, Mac architecture, license/cost, installation hurdles, URL persistence, target-display selection, audio, reconnection, and startup actions.
- [ ] Confirm no unwanted refresh resets game state. Use trusted URLs; do not enable Node integration for arbitrary websites.
- **Result/status:** _not tested_
- **Custom-app gap:** _list only capabilities still missing after these tests; distinguish browser shell from wireless transport_

### E7 — Picture and audio profile

Use the winning transport. Configure once, then test persistence rather than retuning every session.

- [ ] Compare Game Mode off/on on the **actual input**; record unavailable rather than assume native AirPlay supports it. Compare responsiveness, readability, motion, and synchronization.
- [ ] Select a stable picture preset; record SDR/HDR state, screen-fit/overscan, brightness/backlight, contrast, sharpness, color temperature, motion processing, and dynamic contrast.
- [ ] Evaluate disabling adaptive/ambient brightness and automatic contrast changes for repeatability. Keep ordinary room lighting consistent.
- [ ] Display a reference scene with edges, readable small text, shadows, highlights, and gradients. Record visibility, not just slider numbers.
- [ ] Select the audio output and fixed sound mode. Record TV/receiver/Mac/app levels, EQ, adaptive sound, auto-volume, and any synchronization setting; mark fixed/unavailable controls.
- [ ] Start quietly. Play the same narration/music/effect and a visible-event/sound sync clip; check clipping, missing channels, relative levels, and audio-before/after-picture.
- [ ] Retest after reconnecting and after changing input. Keep a separate profile per TV + receiver/input + sound system; include SDR/HDR if settings differ.
- **Result/status:** _not tested_

Samsung documents Game Mode's latency benefit and adaptive picture/sound behavior.[cite:267][cite:264] Matching TV slider numbers does not establish matching output across TVs; target comparable readability and comfortable sound, not identical physical output without measurement.[cite:291]

**Saved profile**

```text
Profile name / date:
TV model / firmware / input / receiver:
Browser or presentation app / version / URL:
Display mode / scaling / viewport / zoom / fullscreen:
Game Mode / picture preset / SDR or HDR:
Brightness or backlight / contrast / sharpness / color temperature:
Screen-fit / motion / adaptive and energy-saving settings:
Audio route / sound mode / EQ / adaptive processing:
Mac / receiver / TV / game volume settings:
Reference content identifiers / room-lighting notes:
Sync impression or measured offset, with method:
Settings photos / known limitations / restore steps:
```

### E8 — Repeatability and recovery

- [ ] Time three repeat starts using the agreed starting conditions.
- [ ] Run representative gameplay for 30 minutes; capture freezes, disconnects, audio drift, and rendering issues.
- [ ] Disconnect/reconnect one iPad; then disconnect all and verify Mac/mouse fallback.
- [ ] Disconnect/reconnect the TV; test Mac sleep/wake once. Note whether game state survives and how long recovery takes.
- [ ] Open an unrelated trusted responsive webpage to check generic reuse.
- [ ] If another TV is available, verify portability using a separate profile. One Samsung cannot demonstrate cross-brand consistency.
- **Result/status:** _not tested_
- **Remaining blocker:** _none observed / describe / unknown_

## Results index

Use PASS / FAIL / PARTIAL / NOT TESTED. Record unknown cost/resolution as unknown, not zero.

| Run / experiment / date | Receiver + method | Full TV / viewport | Audio + sync | Repeat starts, seconds | Cost + main blocker |
|---|---|---|---|---|---|
| R1 / E5 (FireMirror) / 2026-10-20 — PARTIAL | Fire TV Stick 4K Max + FireMirror, Mac extended display, Chrome fullscreen | Yes, no bars or cropping / 1920×1080, DPR 1 | TV speakers; audio about 100 ms behind the picture | Under 60 (estimate, not timed) | $9 one-time once the trial ends; 30 fps limits motion |
| R2 / E2 / 2026-10-20 — PASS | Roku Streaming Stick+, Mac extended display, Chrome fullscreen | Yes, after TV Fit to Screen: On / 1920×1080, DPR 1 | TV speakers; in sync | Under 60 (estimate, not timed) | $0 (owned); none |

### R1 — Fire Stick + FireMirror, extended display

```text
Run ID / experiment / date: R1 / E5 variant (FireMirror instead of AirScreen) / 2026-10-20
Versions / profile / starting state: Samsung 9 Series 65-inch, picture mode Movie (household default; Game mode looked about the same). Fire TV Stick 4K Max, FireMirror (version not recorded). Chrome 154 on the MacBook Air. Test page apps/tv-display-poc.
Exact steps and click count: Mac screen mirroring to FireMirror as an extended display, Chrome moved to the TV and fullscreened. Clicks not counted.
One-time setup time / repeat-start times / server-start time: not recorded / under one minute (estimate) / not recorded.
Viewport JSON / display settings / receiver output: see below. TV reported as a 1920×1080 display. Receiver output not reported.
Picture / sound / responsiveness observations: see below.
Failures / recovery / state preserved?: none seen. Not tested.
Price / ads / limits, if applicable: free trial (not obvious up front) ended during the run; $9 one-time, lifetime.
Screenshots, photos, or video filenames: none.
Outcome / next question: good enough to use. Does Roku Extended Display (free) match it?
```

Viewport, fullscreen (`F`, then `H` to hide the tab bar):

```json
{
  "viewportCSS": { "width": 1920, "height": 1080 },
  "screenCSS": { "width": 1920, "height": 1080 },
  "devicePixelRatio": 1,
  "aspect": 1.7778,
  "documentFullscreen": true,
  "browser": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36"
}
```

Not fullscreen, the browser toolbar and frame took the rest: viewport 1910×960 on a 1920×1080 screen.

| Test page tab | TV result | Compared with the Mac |
|---|---|---|
| Sounds: beep and flash | The beep lands as the 100 ms flash goes away, so audio is about 100 ms late | In sync on the Mac |
| Sounds: sweep, levels, left/right, drone, voice | All fine | — |
| Motion | Frame counter about 30 fps; sweep stutters | — |
| Pan | Slow pan fine; medium and fast stutter | — |
| Speak | First couple of plays the mouth seemed behind the voice; matched after that. Probably first speech start and image decode on the page, not the TV link | — |
| Black on black: text ladder | 48 easy, 32 readable, 24 barely visible, 18 and darker lost. Picture modes made it crisper but no more lines | Mac reads 24 and sees 14 |
| Black on black: grey backdrop | Same as the Mac | Same |
| Reference: text sizes, from the couch | 24 px small but readable; 18 and 14 px readable | — |
| Reference: edge guides | Full screen, no cropping | — |
| Reference: pixel checker | Same as the Mac, no visible blur | Same |
| Reference: colour bars and hero art | Good | Nicer on the Mac |

**Rulings from R1 for the Story board** (Bob, 2026-10-20). Superseded by the R2 rulings below:

1. Motion: slow movement only (slow pans, fades, glows). About 30 fps is acceptable.
2. A/V sync: about 100 ms is fine for sound effects but not for voice. The game gets a configurable A/V offset that delays the mouth and other speech-linked visuals, default 100 ms, calibrated with the beep-and-flash test.
3. Darkness on black: readable text at 48/255 or brighter; detail that matters at 32/255 or brighter.
4. Text at 1080p: 18 px (1.7vh) minimum for normal text; 14 px (1.3vh) only for low-importance information where space is tight. Scale with the viewport (36 and 28 px at 4K).
5. Next: Roku Extended Display (E2), same tabs, fullscreen. Buy FireMirror only if the Roku does worse.

### R2 — Roku Streaming Stick+, extended display

```text
Run ID / experiment / date: R2 / E2 / 2026-10-20
Versions / profile / starting state: Samsung 9 Series 65-inch: picture mode Movie, Picture Size 16:9, Fit to Screen On (whole TV, not per input). Roku Streaming Stick+ (OS version not recorded). Chrome 154. Test page apps/tv-display-poc.
Exact steps and click count: Mac screen mirroring to the Roku as an extended display, Chrome moved to the TV and fullscreened. Clicks not counted.
One-time setup time / repeat-start times / server-start time: Fit to Screen changed once / under one minute (estimate) / not recorded.
Viewport JSON / display settings / receiver output: see below. TV reported as a 1920×1080 display. Receiver output not reported.
Picture / sound / responsiveness observations: see below.
Failures / recovery / state preserved?: none seen. Not tested.
Price / ads / limits, if applicable: none; Roku already owned.
Screenshots, photos, or video filenames: none.
Outcome / next question: chosen path. Next: E7 profile and E8 repeatability on the Roku.
```

Viewport, fullscreen:

```json
{
  "viewportCSS": { "width": 1920, "height": 1080 },
  "screenCSS": { "width": 1920, "height": 1080 },
  "devicePixelRatio": 1,
  "aspect": 1.7778,
  "documentFullscreen": true,
  "browser": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36"
}
```

| Test page tab | TV result (Roku) | Compared with R1 (Fire Stick) |
|---|---|---|
| Reference: edge guides | With Fit to Screen on Auto: the outer border sat 3–5 px in at the sides, the bottom was right, and the top cut off about a quarter of the tab buttons. Fit to Screen On fixed it | R1 had no cropping with Fit to Screen on Auto |
| Sounds: beep and flash | Looks in sync | Better (R1 about 100 ms late) |
| Sounds: sweep, levels, left/right, drone, voice | All fine | Same |
| Motion and Pan | Frame counter about 60 fps; all pans smooth | Better (R1 about 30 fps, medium and fast pans stuttered) |
| Speak | Mouth and voice match from the first play | Better (no warm-up mismatch) |
| Black on black: text ladder (Movie) | All 7 lines visible; the bottom 5 readable, down to 14/255. Better than the Mac | Better (R1 read down to 32) |
| Picture modes | Movie (household default) kept. Standard looked best to Bob, Natural pretty good, Dynamic very bad | — |
| Reference: text sizes, from the couch | 14 px readable, 12 px in a pinch, 18 px feels small | Sharper |
| Reference: pixel checker, colour bars, hero art | Same as the Mac | Better (R1 colour nicer on the Mac) |

**Rulings from R2 for the Story board** (Bob, 2026-10-20), replacing R1's:

1. Path: Roku Streaming Stick+ as a Mac extended display. Don't buy FireMirror. Roku Ultra only if dropouts show up in play.
2. TV profile: Movie, 16:9, Fit to Screen On. Fit to Screen applies to the whole TV, not per input.
3. Motion: no limit; fast motion is allowed.
4. A/V offset: shelved. Build it only if a playtest needs it.
5. Darkness on black: unchanged. Readable text at 48/255 or brighter; detail that matters at 32/255 or brighter, so it also holds on the Mac.
6. Text at 1080p: 24 px (2.2vh) for normal text, 18 px (1.7vh) for small text, 14 px (1.3vh) only for low-importance information where space is tight. At 4K: 48, 36 and 28 px.
7. E7 (full picture and audio profile) and E8 (timed repeat starts, 30-minute session) are on hold. The Roku is good enough for now.

Duplicate this block for significant runs:

```text
Run ID / experiment / date:
Versions / profile / starting state:
Exact steps and click count:
One-time setup time / repeat-start times / server-start time:
Viewport JSON / display settings / receiver output:
Picture / sound / responsiveness observations:
Failures / recovery / state preserved?:
Price / ads / limits, if applicable:
Screenshots, photos, or video filenames:
Outcome / next question:
```

## Return for next steps

- [ ] Update hardware identifiers and tested experiment statuses.
- [ ] Paste diagnostic JSON and exact errors where relevant; redact tokens and private information.
- [ ] Attach useful TV photos/settings screenshots separately and reference filenames here.
- [ ] Identify the simplest successful method, unresolved blocker, and any idea not covered above.
- [ ] Repost this Markdown file. Untested experiments can remain untested; no need to complete every alternative.
