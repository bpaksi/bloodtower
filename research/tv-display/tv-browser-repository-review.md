# Reusable Mac-to-TV Browser Presentation

Research snapshot: October 20, 2026. GitHub repository metadata was retrieved at approximately 13:11 UTC. All four shortlisted READMEs were read in full. This is a documentation and limited source-code review, not a hardware-tested certification.

## Requirements and scope

The intended system hosts a responsive browser-based game on a MacBook Air with an Apple M4 and 16 GB RAM, running the user-reported macOS Tahoe 26.6.2. iPads provide primary controls over WebSocket; a Mac and mouse provide fallback controls. Existing receiving hardware includes a Samsung 9 Series 65-inch television, Roku Ultra, Roku Streaming Stick+, and Amazon Fire TV Stick 4K Max.

The reusable tool should work with browser experiences beyond this game, preserve a TV-proportioned viewport, avoid unnecessary application rewrites, and minimize recurring cost and setup friction. Internet access is acceptable. The target of approximately one minute is treated here as **repeat-session startup after initial installation and configuration**, not a measured result or an assumed first-install guarantee.

The completed user test shared Chrome through macOS's window/app-sharing mode to a Roku. It worked but did not fill the TV as desired. The cause of the unused space remains unconfirmed. macOS distinguishes window/app sharing, mirroring, and desktop extension; these should be tested separately.[cite:255]

## Ranking by practical fit

This ranking prioritizes the present viewport problem, reuse of Chrome and the existing receiver, cost, and repeat-session friction. It is an engineering assessment, not a ranking by popularity or a measured benchmark.

| Rank | Repository | GitHub stars | Fit to these requirements | Main gap |
|---|---|---:|---|---|
| 1 | [Stengo/DeskPad](https://github.com/Stengo/DeskPad) | **7,911** | Creates a separate, configurable display for ordinary browser windows; promising for decoupling the Story Board layout from the laptop screen.[cite:155][cite:241] | Needs a separate TV transport; the README does not establish this specific AirPlay workflow or audio handling.[cite:227] |
| 2 | [IMAGINARY/kiosk-browser](https://github.com/IMAGINARY/kiosk-browser) | **30** | Strongest documented presentation-browser controls: URL, fullscreen, selected-display coverage, cursor hiding, and output diagnostics.[cite:154] | CLI-oriented setup; does not document connecting a TV receiver.[cite:154] |
| 3 | [alanvww/jumpstart-electron](https://github.com/alanvww/jumpstart-electron) | **6** | Simple settings UI for URL, fullscreen/kiosk, autostart, and reconnection refresh.[cite:162] | No documented target-display selection, virtual-display creation, or TV connection management.[cite:162] |
| 4 | [pavlobu/deskreen](https://github.com/pavlobu/deskreen) | **21,602** | Actual screen-to-browser transport using WebRTC; potentially useful when the receiver has a suitable browser.[cite:146] | Adds a receiver-browser workflow; compatibility and audio on the owned TVs/sticks remain unverified.[cite:146] |

**Star-count provenance:** exact values above came from GitHub's live REST API, not rounded or cached web-page badges: [DeskPad metadata](https://api.github.com/repos/Stengo/DeskPad), [kiosk-browser metadata](https://api.github.com/repos/IMAGINARY/kiosk-browser), [Jumpstart metadata](https://api.github.com/repos/alanvww/jumpstart-electron), and [Deskreen metadata](https://api.github.com/repos/pavlobu/deskreen). Cached HTML showed 5 stars for Jumpstart; the live API returned 6. Counts are a dated snapshot, not a quality score.

If the objective changes from **using existing tools now** to **forking a generic browser app**, kiosk-browser becomes the first candidate and Jumpstart the second. DeskPad is a display utility, not a browser wrapper; those are different architectural roles.[cite:154][cite:162][cite:155]

## Why DeskPad leads

DeskPad separates the rendering workspace from the MacBook's physical display. Its README documents a virtual display, a local preview window, resolution selection through macOS settings, and installation by release download or Homebrew.[cite:227] Its implementation includes 1920-by-1080, 2560-by-1440, and 3840-by-2160 display modes.[cite:241]

That creates a promising experimental arrangement:

```text
Mac local web server
        |
Chrome on a TV-proportioned virtual display
        |
DeskPad preview or virtual-display sharing
        |
macOS AirPlay
        |
Existing receiver and TV
```

This is a proposed workflow, not a verified end-to-end capability. DeskPad supplies the virtual display and preview, while macOS supplies the AirPlay sharing functions.[cite:227][cite:255] Which surface macOS actually captures, whether it includes window decoration, and how audio is routed must be checked on the user's machine.

The approach is generic by design: the browser remains an ordinary browser, and the display utility does not need to understand the game's WebSocket commands or state. Nevertheless, compatibility with every website, protected video, or special browser API is not guaranteed.

## DeskPad cost and readiness

| Item | Verified finding | Practical consequence |
|---|---|---|
| Licensing | MIT, according to the [GitHub API metadata](https://api.github.com/repos/Stengo/DeskPad); the project is distributed through GitHub and Homebrew.[cite:227] | No mandatory DeskPad software subscription was identified. This does not remove fees for a separate receiver app if one is selected. |
| Installation | `brew install --cask deskpad` or a release download.[cite:227] | No local source build is necessary for an initial experiment. |
| Permissions | Screen-recording permission may be needed; the README documents granting permission and restarting.[cite:227] | First installation should be kept separate from the one-minute repeat-start target. |
| Published release | [v1.3.2](https://github.com/Stengo/DeskPad/releases/tag/v1.3.2), October 4, 2024, according to the [release API](https://api.github.com/repos/Stengo/DeskPad/releases/latest). | Release age warrants compatibility testing; it does not by itself establish abandonment. |
| Repository updates | Last push recorded as February 28, 2026, in the metadata snapshot. | Repository activity and release publication are different signals. |
| Apple Silicon | The downloaded v1.3.2 executable was inspected as a universal Mach-O containing x86_64 and arm64 slices. | An arm64 binary exists; this does not prove M4/Tahoe runtime reliability. |
| Startup persistence | The README describes restoring previous window arrangement; a hands-on review reports persistence of display resolution and location.[cite:227][cite:226] | Useful evidence for repeatability, but not a guarantee of complete browser-and-TV restoration. |
| Open concerns | Public reports include lag, fullscreen-window requests, and preview-window size memory.[cite:224] | Test video and repeat startup rather than infer readiness from the star count. |

A specific build concern is documented in [open pull request #68](https://github.com/Stengo/DeskPad/pull/68): its author reports SDK compilation failures involving `CGDisplayStream` and proposes ScreenCaptureKit/Metal replacement. This is a contributor report about source compilation, **not proof that the existing release cannot run on Tahoe**. The current source does use `CGDisplayStream`.[cite:241]

## Other README findings

### Kiosk-browser

The documented controls closely match a generic presentation shell: command-line URL selection, fullscreen/kiosk, `--cover-displays`, cursor visibility, retry behavior, and an audio/video test page.[cite:154] Its configuration-file support is explicitly described as incomplete, so a saved launcher command is a better initial experiment than assuming a polished settings workflow.[cite:154]

The license is Apache-2.0, and the current package configuration's `dist` script explicitly requests x64 builds; the release lists a Mac DMG without an arm64 filename. These findings come from the [package configuration](https://github.com/IMAGINARY/kiosk-browser/blob/devel/package.json) and [release metadata](https://api.github.com/repos/IMAGINARY/kiosk-browser/releases/latest). Verify the release architecture or create an arm64 build before assuming a native M4 experience. Keep Node integration disabled for untrusted URLs: the README specifically warns that enabling it exposes local system resources.[cite:154]

### Jumpstart

Jumpstart is the simplest documented settings-driven wrapper in this group: enter a URL, choose presentation options, and launch.[cite:162] Its README also documents automatic camera/microphone permission grants and timed or reconnect-triggered refresh.[cite:162] For a generic URL tool, permission behavior deserves review; for this game, leave timed refresh disabled until state recovery is proven safe.

The latest published release is v0.0.2 from March 29, 2025, and its asset is `Jumpstart-0.0.2-arm64.dmg`, according to the [release API](https://api.github.com/repos/alanvww/jumpstart-electron/releases/latest). This is a directly relevant Apple Silicon package, but no test on the user's Tahoe installation was performed. MIT licensing and the documented small JavaScript/Electron structure make it a plausible adaptation candidate.[cite:162]

### Deskreen

Deskreen is different from the two presentation browsers: its README describes WebRTC delivery of computer-screen content to a receiving browser.[cite:146] The current repository is the Community Edition and explicitly distinguishes it from a more feature-rich Pro offering; Pro capabilities must not be assumed to exist in the open-source edition.[cite:146]

The latest release snapshot is v3.2.16 from July 8, 2026, with an arm64 Mac DMG, and the repository declares AGPL-3.0 in its [metadata](https://api.github.com/repos/pavlobu/deskreen) and README.[cite:146] Its transport does not, by itself, establish support for the user's specific receiver browsers or a TV-sized browser viewport. Those remain separate tests.

## Minimal experiment plan

### Establish the simpler baseline

Before adding DeskPad, try the existing Roku with **AirPlay Extended Display**, move Chrome to the TV desktop, and use fullscreen. Apple documents both extended-display configuration and window/app sharing.[cite:255] If this fills the TV and is quick to restart, an extra virtual-display layer may be unnecessary.

### Test DeskPad without modifications

1. Install DeskPad from its release or Homebrew; approve the documented permission request if needed.[cite:227]
2. Select a 16:9 mode in Displays settings. Start by testing 1920-by-1080 before evaluating higher modes; these modes exist in the source.[cite:241]
3. Move Chrome to the DeskPad virtual display and enter fullscreen.
4. Use macOS's AirPlay window/app selector and test sharing the DeskPad preview to the already-working Roku. If macOS exposes the virtual display as a shareable screen, test that alternative too. Neither path has been verified here.
5. Check page edges, menu/title-bar inclusion, text size, video smoothness, and recovery after disconnecting.
6. Test narration and music separately. Do not assume sharing DeskPad's preview captures audio produced by Chrome; the DeskPad README does not document audio transmission.[cite:227]
7. Quit and reopen the tools, reconnect, and measure the complete routine.

A display mode is not the same as a guaranteed stream resolution. DeskPad's configured pixels, the browser's logical viewport, macOS scaling, AirPlay output, and the TV's physical panel are separate quantities. Check browser `innerWidth`, `innerHeight`, and `devicePixelRatio` during validation rather than claiming pixel-perfect 4K from the existence of a 4K virtual-display mode.

### Define a one-minute pass

Use the following as a proposed acceptance test, not a published performance claim:

- Installation and first-run permission grants are complete.
- Mac and receiver are already on the same network.
- The game server is running, or its startup is explicitly included in the timer.
- Start the timer before selecting the TV or opening the presentation tools.
- Stop only when the Story Board fills the intended area, an iPad command updates it, and the intended TV audio path works.
- Repeat three times from a disconnected session; record elapsed time, clicks, and any display rearrangement.
- Reject a workflow requiring manual resolution adjustments, URL re-entry, ad viewing, or troubleshooting every session.

For reducing repeat setup, Apple's AirPlay documentation includes a **Set as Default** option for remembering the sharing choice.[cite:256] Whether this combines cleanly with DeskPad must still be demonstrated.

## Decision gates

- **Use direct extended-display AirPlay** if it meets the viewport, audio, and repeat-start requirements with fewer moving parts.
- **Keep DeskPad** if it provides a reliably reusable TV-proportioned workspace or preview without adding unacceptable lag or startup actions.
- **Evaluate kiosk-browser next** if automatic display targeting and browser presentation controls are the missing pieces.
- **Adapt Jumpstart** if a small graphical URL launcher is more valuable than kiosk-browser's broader configuration surface.
- **Evaluate Deskreen** if browser-based receiving offers a proven advantage over the existing AirPlay receiver.

No reviewed README establishes an end-to-end, one-click solution across the owned Roku, Fire Stick, and Samsung hardware. No prototype timing or runtime compatibility has been measured. AirScreen pricing and ease-of-use remain a separate, unresolved receiver-app comparison rather than an assumed dependency of this repository shortlist.
