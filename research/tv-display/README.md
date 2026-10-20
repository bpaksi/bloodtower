# research/tv-display

How to show the Story board on the living-room TV from the Mac that hosts the game. Started 20 October 2026. Research only; nothing here is decided and no code depends on it.

## Files

| File | What's in it |
|---|---|
| [README.md](README.md) | Where things stand and our first read |
| [tv-browser-repository-review.md](tv-browser-repository-review.md) | Desk review of four GitHub tools (DeskPad, kiosk-browser, Jumpstart, Deskreen). Documentation and limited source review, nothing run |
| [tv-experiments.md](tv-experiments.md) | Experiment log (E1–E8) to fill in on real hardware. Repost it after testing |

Both files were produced outside this repo and are kept as received, including the `[cite:…]` markers.

## First read

1. **Problem and cause.** Chrome shared through "Window or App" to the Roku worked but left unused TV area. Nobody has established why. Window sharing sends a window at its own size and aspect, so a window that is not 16:9 would leave bars on its own. Resizing the window to 16:9 (E1) is the cheapest test of that.
2. **The likely fix needs no new software.** AirPlay Extended Display (E2) makes the TV a real 16:9 desktop, so Chrome fullscreen fills it. The review's own baseline says the same. Run E1 and E2 before installing anything.
3. **DeskPad is a fallback.** It helps when extended display misbehaves, such as resolution picked badly or the laptop lid closed. It adds a screen-recording permission, a preview window and an unverified audio path. The release is from October 2024 and an open PR reports ScreenCaptureKit build problems. It is not a reason to expect trouble on Tahoe, but it is a reason to test.
4. **The browser-shell apps solve a different problem.** kiosk-browser and Jumpstart launch a URL fullscreen. They do not move pixels to a TV. kiosk-browser also appears to ship x64 only. Skip both unless E2 works and launching is the remaining friction. Deskreen only pays off if a receiver's browser is the better route, and the Fire Stick Silk test (E5) covers that more directly.
5. **A route the review barely covers: the TV's own browser or a stick's browser opens the game at the Mac's LAN URL.** No mirroring, no AirPlay, native resolution, and audio plays on the TV. The cost is that the game runs on a weak device (Fire Stick 4K Max is the strongest of the three) and the TV-side remote is needed once. E4 and E5 touch it, but it deserves its own early test because it removes the whole transport.
6. **A wired HDMI cable is the control.** It is not wireless, but a 4K-capable adapter and a long cable would settle picture and audio questions in minutes. Use it to separate "the game on the TV" problems from "AirPlay" problems.
7. **Audio is the real risk.** Neither document shows that Chrome's narration and music reach the TV through DeskPad, and AirPlay latency affects sound sync. Test audio in every experiment, not at the end.

## Things to resolve

- **Which TV?** The review and log say Samsung 9 Series 65 inch. Our playtest notes say the Story board ran on an LG at 3840×2160 (playtest 1, 2026-10-20). Bob to confirm which TV is the target, or whether there are two. E4 and E7 depend on the model.
- **Resolution.** The review suggests 1080p first. The board must still be checked at 3840×2160 in case the wireless path delivers more than 1080p.
- **The one-minute target** applies to repeat sessions only, per both documents.

## Suggested order

E1 (cheap, explains the bars) → E2 (probably the answer) → LAN URL in the stick/TV browser (new) → E3 only if E2 fails → E7 and E8 on the winner. Skip E6 unless a launcher is still wanted.
