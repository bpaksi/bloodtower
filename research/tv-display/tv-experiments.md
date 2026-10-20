# Browser-to-TV Experiment Log

Started: 2026-10-20 · Last updated: _enter date_

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
| Samsung full model/year and firmware; no serial number | _unknown_ |
| Roku Ultra model and OS version | _unknown_ |
| Roku Streaming Stick+ model and OS version | _unknown_ |
| Fire Stick generation and Fire OS version | _unknown_ |
| Chrome version | _unknown_ |
| iPad model/iPadOS/browser; number connected | _unknown_ |
| Server command and Story Board URL | _enter_ |
| Network: router, Mac/receiver Wi-Fi or Ethernet, guest network? | _enter_ |
| Audio equipment: TV speakers / soundbar / other | _enter_ |
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
- **Result/status:** _not tested_
- **Decision:** _does direct extension already solve the problem without another app?_

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
- **Result/status:** _not tested_
- **Decision:** _does either path improve on the Roku enough to justify cost/steps?_

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
| _enter_ | | | | | |

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
