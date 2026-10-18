# Playthrough UI notes (Bob, 2026-10-17) and design responses

Author: Gamewright. Design only, no code. Status: captured; Bob answered Q1-Q3 (Oct 17 2026).
Source: Bob's notes in the Blood Tower room, Oct 17 2026, 7:41 PM ET, after the R2 milestone playthrough.
Builds on: [r2-screen-flow.md](r2-screen-flow.md) (R2 ids), [landing-and-initial-screens.md](landing-and-initial-screens.md), splash research in `docs/research/splash-animation/` (#73, wish list #72).

## 1. Bob's notes (verbatim)

### Landing page
1. Very Nice. Please keep in mind I would like to make the light flicker using the motion still technique.

### Story Board
I want this to be less dashboard feel and more of the players visual interface (like a TV and the iPad is the remote). The landing page is the background and as questions or visuals from the game need to be shown they zoom in with an effect. Status and wizard screens are dialogs. Cut scenes should be full screen.

Start up (these are dialogs over the background)
Continue and back buttons
1) Connect Tower
2) Pick Game (The game chooses the name and avatars of hunters)
3) Claim Hunters

#### In Game
When No visuals there should be a small centered dialog letting the players no nothing to look at.

When visual need to be shown, visual need to be be shown with an effect (zoom) to full screen to allow the best view of the art work. When exiting (via action on ipad) the next sceen should seemlessly transition or transition back to the waiting screen.

Visuals need a way to be replayed, via this screen. Probably rarely used.

#### Action needed
When the tower loses connectivity or one (or more) hunters become disconnected. The coresponding dialog is presented on top and must be responded to before continuing.

#### Control menu
There needs to be a way to abandon the game from there.
Version information
Tower information
Statistics/Debug view

#### Statistics/Debug overlay
There needs to be a debug overlay located in the top right corner. This will be used to display debug information.

### Ipad/Phone
Need to support phones. Screens just need to be responsive to screen size.
No audio or visuals will happen on these devices.
There will be no audio for a specific hunter only.
There needs to be a menu option available at all times to allow for
1. Abandon screen
2. Go back 1 step
3. replay last video
When no action by the player is required the screen should be a simple landing screen backgroud
When action is required. Mutliple choice options are presented in large centered buttons. If the game requires to know who is doing the action a second list of buttons should be presented to the user to identify the hunter. *only if >1 hunters associated to device. =1 then hunter can be assumed.

## 2. Design responses (proposed requirements, R3-UI ids)

### 2.1 Landing / background
- R3-UI-01. The landing painting is the permanent Story board background from Splash to Goodbye; every other board element sits on it as a dialog, a zoomed visual, or a full-screen cut scene. Test: snapshot of every screen shows the background or a full-screen visual, never a bare page.
- R3-UI-02. Window light flicker uses the motion-still (layered animation) technique: a static painting plus a window-glow mask layer driven by CSS/SVG. Slow, irregular, candle-like (about 1-2 Hz with jitter), never a strobe; honours reduced motion with a steady glow. Bats and other overlays stay on wish list #72. Test: reduced-motion setting stops the flicker; no frame-to-frame brightness jump over the flash-safety limit (3 per second).
- Note: the flicker can later double as tower state (steady = connected, slow pulse = searching, dark = no tower). Proposal only; not a requirement until Bob says so.

### 2.2 Story board as "TV" (iPad is the remote)
- R3-UI-10. The board has three presentation layers, top to bottom: (1) action-needed dialogs, (2) full-screen visuals and cut scenes, (3) small dialogs (status, wizard, waiting) over the background. Only one layer-2 item shows at a time. Test: state audit.
- R3-UI-11. Status and wizard screens (Tower Connect, Pick Game, Claim Hunters, setup steps) are centered dialogs over the background, not full pages. The R2-01 status strip moves into the dialog and the debug overlay (R3-UI-40). Test: snapshot.
- R3-UI-12. Cut scenes play full screen and hide all dialogs and the debug overlay except action-needed dialogs. Test: snapshot during a clip.
- Flow buttons stay on the devices: "Continue" and "Back" on start-up dialogs are shown on the board as the step's state but pressed on the iPads/phones (R2-03, first press wins). The one exception is the board Menu (R3-UI-39).

### 2.3 Start-up dialogs
Order (Bob, 8:06 PM ET): Pick Game, Game settings, Connect Tower, Claim Hunters, setup steps, each with Continue and Back on the devices. Devices join from Splash onward (the QR shows from Splash), since a device is needed to press anything.
- R3-UI-20. Pick Game shows each story's hunters (names and avatars) as the story defines them; players never name or pick avatars (matches D2). Test: hunter cards come from the pack.
- R3-UI-21. Claim Hunters keeps R2-30 (Continue disabled with reason until all held) and R2-31 ("Take all"). Test: as R2.
- R3-UI-22 (Bob, Q1 7:49 PM, revised 8:04 PM ET). A "Game settings" dialog comes immediately after Pick Game. Its options are defined by each story pack (Dracula: length Short / Standard / Long plus difficulty; other stories may add their own). Each physical setup step stays its own dialog with Done, after Claim Hunters; "Begin the story" follows the last one (R2-50..52 kept). Order: Pick Game, Game settings, Connect Tower, Claim Hunters, setup step dialogs, Begin. Test: e2e order; settings come from the pack; length locked at Begin.
- R3-UI-23 (Bob, 8:04 and 8:06 PM ET). Each story pack declares the tower as required or optional. Connect Tower comes after Game settings. Optional: "Play without tower" sits next to Connect (R2-22 kept). Required: no "Play without tower"; Continue stays disabled until connected and calibrated, with the reason shown. Dracula is optional (Loremaster writes no-drum versions of the fortune reading, open grave and finale). Supersedes D4 (tower right after Splash). Test: both pack types; required pack cannot continue unconnected.
- R3-UI-25 (Bob, 8:06 PM ET). During start-up the Story board shows a running summary panel beside the current dialog that echoes every choice as it is made: game (cover + title), settings, tower state, hunters with the device holding each, and setup steps done. Empty items show "not chosen yet". Back clears the item it undoes. Test: summary matches state after each step and after Back.
- R3-UI-24 (Bob, 8:04 PM ET). Pick Game is a carousel built for many stories: the board shows the focused story large with neighbours peeking at each side; devices move it with Previous / Next buttons (swipe allowed but never the only way, R2-113) and press "Choose <story title>". Saved games appear as their own cards first (R2-41). Test: 10+ packs browse with buttons only.

### 2.4 In game
- R3-UI-30. With nothing to show, the board shows a small centered waiting dialog over the background naming who the table waits for ("Waiting for Mina to choose"), per R2-112/R2-115. Test: snapshot.
- R3-UI-31. A visual enters with a zoom from the waiting dialog to full screen; the art is shown uncropped (letterboxed if needed). Zoom lasts about 0.6-1.0 s and is skipped under reduced motion. Test: timing + reduced-motion check.
- R3-UI-32. A visual exits only by an iPad action (Continue, first press wins). On exit it crossfades straight into the next visual if one is queued, or zooms back to the waiting dialog. Test: e2e both paths.
- R3-UI-33. Talking-avatar scenes count as visuals: they follow R3-UI-31/32; captions stay on (R-AV fallback).
- R3-UI-34. The last visual can be replayed from the iPad menu ("Replay last video", §2.6). The board replays it with the same zoom and returns to the state it left. Replay never changes game state or stats beyond a replay count. Test: e2e.

### 2.5 Action needed
- R3-UI-35. Tower lost and hunter disconnected show as a top dialog on the board and on every iPad, and block flow buttons until answered. This changes R2-66: tower loss now stops play until answered. Choices: tower lost = Reconnect / Play without tower / Abandon; hunter lost = Wait (rejoin clears it, R2-65) / Reassign hunter to another device / Abandon. Confirmed by Bob (Q3, Oct 17 7:51 PM ET); Loremaster notes three beats need a drum turn (fortune reading, open grave, finale), so "Play without tower" uses the R2-22 fallbacks for those beats. Test: mock disconnects; flow buttons inert while open.
- R3-UI-36. If both happen, one dialog lists both; the tower is answered first. Test: e2e.

### 2.6 Control menu (iPad and phone, always available)
The menu lives on every device and on the Story board (Bob, Oct 17 7:46 PM ET: "The story board needs to support the menu... when all ipads are disconnected but the game is still running. Need a way to exit gracefully."). Combined list:
- Abandon game (confirm: Save and quit / Abandon / Keep playing, R2-64).
- Go back one step (R3-UI-37).
- Replay last video (R3-UI-34).
- Tower information (state, battery, calibration, Reconnect).
- Version information (app build, pack version).
- Statistics/Debug view (toggles the R3-UI-40 overlay).
- Kept from the R2 pause menu: Resume, Join another device, Change who holds whom.
- R3-UI-37 (Bob, Q2, Oct 17 7:50 PM ET). "Go back one step" moves back one screen during start-up (Back). In play it re-shows the last choice and its outcome, read-only; it never undoes a choice, since the table has already heard the result. Test: e2e; game state unchanged after use in play.
- R3-UI-38. The menu button is visible on every device screen, top corner, text label "Menu" (R2-111, R2-113). Test: audit.

- R3-UI-39. The Story board has its own Menu, opened with the mouse or keyboard on the Mac (a small "Menu" button in a corner plus the Esc key), available on every screen. It offers the same items minus "Go back one step" and "Change who holds whom". It is the graceful exit when every device has dropped (R2-104): the board shows "All devices disconnected" with the rejoin QR, Menu, and Save and quit / Abandon; Save and quit stores the game for the Pick Game resume card (R2-41), then goes to Game Stats and Goodbye. Board-sent actions (a second exception to the board-sends-only-`keeper-line-ended` rule): save-and-quit and abandon (both confirmed), resume, replay last video, reconnect tower, debug-overlay toggle; tower and version info are read-only. Board menu presses go through the same first-press-wins path as device presses and are logged with device "board" (R2-04). This ends the "board has no buttons" ruling for the menu only. Test: drop all devices mid-game, exit via the board menu, resume card present after relaunch.

### 2.7 Statistics/Debug overlay
- R3-UI-40. A debug overlay in the board's top-right corner, toggled from the menu, off by default. Shows tower state, joined devices and held hunters, current step/scene id, night and turn, last press (device, latency), and frame/load timing. Hidden during cut scenes unless pinned. Never shows `ipad:*` content (R2-63). Test: toggle; WS capture.

### 2.8 iPad / phone
- R3-UI-50. Phones are supported; device screens are responsive from phone to iPad sizes. This reverses D6 for R3 (restores R-DEV-8 as a full device, not a stand-in). Primary buttons stay at least 64 pt tall on iPad and 48 pt on phone. Test: layout at phone and iPad widths.
- R3-UI-51. Devices play no audio and no visuals; all audio and art are on the board. No line is ever voiced for a single hunter; private lines (`ipad:<hunter>`) stay text captions on the holder's device (R2-100). Test: no media elements on device pages.
- R3-UI-52. With no action needed, the device shows the landing background with the R2-112 "Waiting for..." line and the Menu button only. Test: snapshot.
- R3-UI-53. When action is needed, choices show as large centered buttons. If the game needs to know who acts and the device holds more than one hunter, a second row of hunter buttons follows the choice; with exactly one hunter, it is assumed. Test: e2e with 1 and 2+ hunters on a device.
- Note: R3-UI-53's "who acts" step replaces the R2 hunter switcher tabs for choices; private lines still label the hunter by name.

## 3. Changes to R2 (for the doc pass)
| R2 item | Change |
|---|---|
| R2-01 status strip | Moves into dialogs and the debug overlay (R3-UI-11, R3-UI-40) |
| R2-66 tower loss never stops the game | Superseded by R3-UI-35 (blocking dialog) |
| D6 / R2 §4 phones out | Reversed by R3-UI-50 |
| §3.6 Pause menu | Becomes the Control menu (§2.6) |
| D4 tower right after Splash | Superseded by R3-UI-23: tower after Game settings, required or optional per pack |
| §4 hunter switcher tabs | Replaced for choices by R3-UI-53 |
| Standing ruling "Story board: no buttons, ever" | Amended: the board has a Menu (R3-UI-39); all other controls stay on devices |
| R2-104 all devices drop | Adds the board-menu exit (R3-UI-39) |

## 4. Open questions for Bob (one at a time, in this order)
- Q1. Answered: (b), see R3-UI-22.
- Q2. Answered: (a), see R3-UI-37.
- Q3. Answered: (a), see R3-UI-35.

None open.
