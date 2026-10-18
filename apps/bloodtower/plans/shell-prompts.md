# Shell build prompts (startup flow)

Bob runs these 8 prompts in Claude Code on the Mac, one per branch. Wright tracks progress here: update the status and PR # when a step opens or merges.

Sources: `research/game-design/playthrough-ui-notes-2026-10-17.md` (R3-UI ids), `research/game-design/setup-wizard-and-summary.md` (R-WIZ), `packs/test/README.md` (Proving Ground spec, §6a), `docs/deliveries/2026-10-17-shell-audio-and-covers.md` (audio and covers).
Visual target: `research/game-design/mockups/2026-10-17/v2-mac.png`, `v2-ipad.png`, `v2-iphone.png`, `frames-mac-0-sound.png` (Illusionist, Oct 17). They show flow only. The look is not final.

## Status

| Step | Branch | Depends on | Can run with | Status | PR # |
|---|---|---|---|---|---|
| 1 | `feat/shell-01-vellmoor-stub` | none | 8 | in review | #80 |
| 2 | `feat/shell-02-landing-carousel` | 1 | 6 | todo | |
| 3 | `feat/shell-03-game-settings` | 2 | none | todo | |
| 4 | `feat/shell-04-connect-tower` | 3 | none | todo | |
| 5 | `feat/shell-05-claim-and-setup` | 4 | 7 | todo | |
| 6 | `feat/shell-06-sound` | 1 | 2 | todo | |
| 7 | `feat/shell-07-tower-volume-test` | 4, 6 (tower: level test; no tower: sound-dialog check from 6) | 5 | todo | |
| 8 | `feat/shell-08-serve-test-flake` | none | 1 | PR open | #81 |

## Parallel waves

- **Wave A:** 1 and 8. Step 1 owns `src/protocols/pack.ts`, `src/server/pack/load.ts`, `assets.ts`, `load.test.ts` and the pack YAML. Step 8 owns `src/server/pack/serve.test.ts` (and `serve.ts` only if the bug is there). Step 1 must not touch `serve.test.ts`.
- **Wave B (after 1):** 2 and 6. Step 2 owns the landing page (`TitleScreen.tsx`, `title-screen.css`), `StoryBoard.tsx`, `DeviceScreen.tsx`, `engine.ts`, `control.ts`, `messages.ts`, `screens.ts` and `loadStories` in `load.ts`. Step 6 owns new files (`src/web/lib/audio/`, `src/web/components/board/SoundDialog.tsx`, `src/server/pack/audio.ts`) plus the `/audio/` prefix line in `src/server/server.ts`. It mounts the Sound dialog in `LiveBoard.tsx`, and step 2 does not edit `LiveBoard.tsx`. In `load.ts`, step 6 adds only one hook line for the `audio/` folder (the same pattern as `camera/`).
- **Wave C (after 2):** 3.
- **Wave D (after 3):** 4. It is not run with 2 or 3, because all three rewrite the same flow table (`FLOW_SCREENS` in `control.ts`, `NEXT_BEFORE_PLAY` in `engine.ts`) and the same two screen files. Connect Tower also comes after Game settings (R3-UI-22).
- **Wave E (after 4; step 7 also needs 6):** 5 and 7. Each adds one flow screen to `FLOW_SCREENS`, `NEXT_BEFORE_PLAY` and `SCREEN_TITLE`. Whichever merges second rebases those few lines. Step 5 owns `setup` in `pack.yaml` and the party-join and begin screens. Step 7 owns `stats.yaml`, the stats scope in `pack.ts`, and the tower sound path.

## 1. Vellmoor stub pack and manifest fields

```text
Branch: feat/shell-01-vellmoor-stub
Depends on: none. Can run with step 8 (do not touch src/server/pack/serve.test.ts).

Read CLAUDE.md, docs/sdlc.md, apps/bloodtower/README.md, packs/test/README.md and research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-20..25, §2.10). Code: apps/bloodtower/src/protocols/pack.ts (packSchema), apps/bloodtower/src/server/pack/load.ts (loadPackDir, loadStories), assets.ts.

Goal: a second pack on disk, "The Count of Vellmoor", that the loader lists, plus the manifest fields the shell needs.

1. New optional fields in packSchema (pack.yaml):
   - tagline: string, 1-200 chars.
   - cover: path inside the pack, e.g. assets/cover.png. It must resolve to an image inside <pack>/assets/ (same jail as assets.ts). Index it so the host serves it at /packs/<id>/assets/cover.png.
   - tower: "required" | "optional" | "none" (R3-UI-23). Default "optional".
   - settings: list of {id, label, options: [{id, label}], default}. The default must be one of the options. A setting with id "length" must use option ids from `lengths`. A setting with id "difficulty" must use ids from `difficulties`.
   - playable: boolean, default true. With playable: false the pack needs only the metadata (pack_id, title, version, engine_min, tagline, cover, tower, settings). The loader then reads only pack.yaml and assets/, and ignores every other file in the folder without an error.
2. packs/test/pack.yaml (Proving Ground): tagline "A long-lived proving ground for new ideas." (its current tone text), cover assets/cover.png, tower optional, settings length (Short/Standard/Long, default standard) and difficulty (Standard). Change `lengths` to [short, standard, long]. packs/test/assets/cover.png is already in the repo.
3. packs/dracula/pack.yaml (new): pack_id dracula, title "The Count of Vellmoor", tagline "The Count has taken Lenka. Bring her home before she's his.", cover assets/cover.png (already in the repo), tower optional, settings length (Short/Standard/Long, default standard), playable false. Do not edit or move packs/dracula/cast.yaml, script.yaml or CONVERSION-NOTES.md. cast.yaml is the talking-avatar format, not packSchema `cast`. That is why a playable: false pack reads only pack.yaml.
4. loadStories lists both packs, sorted: dracula, test. The dracula card stays not loadable for now (loadable: false), because steps 2 and 3 make it choosable. Do not change storyCardSchema or any board/device message in this step.
5. Tests: schema tests in pack.test.ts (each new field: valid, invalid, defaults; playable false accepts a metadata-only pack; a length setting with an id outside `lengths` fails). Loader tests in load.test.ts: both repo packs load, the cover resolves, a cover path outside assets/ fails, and dracula ignores its other files. Update the "lists the test pack as one loadable card" test for two packs. Fix any e2e test that assumes one pack. `pnpm --dir apps/bloodtower pack:lint` passes on packs/test and packs/dracula.
6. Update the packs/test/README.md top table and apps/bloodtower/README.md (packs line) in the same commit.

No change to board/server/device messages, engine state or session state.

Run pnpm check and the tests, then open a PR.
```

## 2. Landing screen and Pick Game carousel

```text
Branch: feat/shell-02-landing-carousel
Depends on: step 1 (manifest fields tagline, cover, playable; loader lists dracula and test). Can run with step 6. Do not edit LiveBoard.tsx (step 6 mounts its Sound dialog there).

Read CLAUDE.md, research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-01, R3-UI-03, R3-UI-10, R3-UI-11, R3-UI-20, R3-UI-24, R3-UI-51, §2.9). Visual target: research/game-design/mockups/2026-10-17/v2-mac.png, v2-ipad.png, v2-iphone.png. Code: src/web/components/title/TitleScreen.tsx, src/web/components/board/StoryBoard.tsx, src/web/components/device/DeviceScreen.tsx, src/web/lib/screens.ts (focusedStory, neighborStory), src/server/session/engine.ts (pick-story, focusStory), src/protocols/messages.ts (storyCardSchema), src/protocols/control.ts.

Goal: the landing painting (apps/bloodtower/public/landing/hero.webp) is the board's permanent background, and Pick Game is a carousel dialog over it.

1. Board: every start-up screen is a centered dialog over the landing background (R3-UI-01, R3-UI-11). On the Mac, a click or keypress on the landing screen opens it as the Story board (R3-UI-03). The Sound dialog is step 6; leave a clear spot for it before Pick Game.
2. Carousel (R3-UI-24) on the board: the focused card large, neighbours peeking at each side. Each card: cover (16:9, from /packs/<id>/assets/cover.png), title, tagline, and "4 hunters" from the pack (§2.9 fix). Two real cards: The Count of Vellmoor and Proving ground.
3. Devices (iPad, phone): Previous / Next buttons and one primary button "Choose <title>" (e.g. "Choose The Count of Vellmoor"). Swipe may also work but is never the only way. Devices show no images: no cover and no portrait on the device (R3-UI-51). Only text and buttons.
4. A not-playable pack (playable: false) can be chosen. Choosing it shows a board dialog "Not playable yet" with Back on the devices. Step 3 moves this stop after Game settings.
5. Add a "back" control action for start-up screens (R3-UI-37, first press wins like Continue). Back from "Not playable yet" returns to Pick Game.
6. Message and state changes (say these in the PR): storyCardSchema gains cover (URL or null), tagline (string or null) and playable. Card `loadable` now means "can be chosen". control.ts gains the "back" action and a "not-playable" flow screen. engine.ts handles both. A playable: false pack is never bound as the session's playable story.
7. Tests: unit tests for carousel wrap with 2 and 10+ cards (buttons only), the button text, back, and the not-playable stop. Update e2e (opening-screens.spec.ts, acceptance.spec.ts) for the new card text and the two packs. Screenshots at the three e2e viewports go in the PR.

Run pnpm check and the tests, then open a PR.
```

## 3. Game settings

```text
Branch: feat/shell-03-game-settings
Depends on: step 2 (carousel, "back" action, not-playable stop). Run alone (it edits the same flow table as steps 2 and 4).

Read CLAUDE.md, research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-22, R3-UI-37, §2.9: settings default Standard), research/game-design/setup-wizard-and-summary.md (R-WIZ-12). Code: src/protocols/pack.ts (`settings` from step 1), src/protocols/control.ts (FLOW_SCREENS), src/server/session/engine.ts (NEXT_BEFORE_PLAY), StoryBoard.tsx, DeviceScreen.tsx.

Goal: a "Game settings" dialog right after Pick Game, built only from the chosen pack's manifest `settings`.

1. New flow screen "game-settings" after pick-story. The board dialog lists each setting with its options and shows the current value. It starts at each setting's `default`.
2. Devices: one group of large buttons per setting, one button per option (first press wins per change, logged like other presses). Continue and Back. Back returns to Pick Game and clears the chosen settings.
3. Proving Ground: length Short / Standard / Long and difficulty Standard, then Continue goes to the next existing start-up screen. The Count of Vellmoor: length Short / Standard / Long, then Continue shows "Not playable yet" (moved here from step 2). Back from there returns to Game settings.
4. The chosen settings are stored in the session and locked at Begin (R-WIZ-12). The timing log records the chosen length.
5. This step changes session state and messages. Say so in the PR: the session holds the chosen settings; storyboard and device state carry the settings list and chosen values; control gains a way to name the setting and option pressed (reuse the "pick" action and option ids if they fit, or add a "set" action).
6. Tests: settings come from the pack (a pack with a third setting shows it); defaults; Back clears; Vellmoor stops after settings; length is locked after Begin. Update e2e for the new screen.

Run pnpm check and the tests, then open a PR.
```

## 4. Connect Tower (optional or required)

```text
Branch: feat/shell-04-connect-tower
Depends on: step 3 (Game settings screen). Run alone.

LOCAL ONLY, CAREFUL: this step moves when the real tower is connected and calibrated. Test it on the Mac with the real tower through tower-poc (TOWER_URL=ws://127.0.0.1:4747/ws), not only with the mock. Follow CLAUDE.md "Tower safety": the UI reaches the tower only through command{capabilityId, params}; nothing physical happens on its own (no auto-connect, no auto-calibrate, no retry); unknown values show as unavailable.

Read CLAUDE.md, research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-23, R3-UI-62, R3-UI-63), research/game-design/setup-wizard-and-summary.md (R-WIZ-9). Code: src/protocols/control.ts (FLOW_SCREENS: today splash -> tower-connect -> pick-story), src/server/session/engine.ts (NEXT_BEFORE_PLAY, tower locks), src/server/tower/port.ts, src/web/lib/screens.ts (towerReady, towerStripState), DeviceScreen.tsx ("Play without tower"), StoryBoard.tsx.

Goal: Connect Tower comes after Game settings, and the pack's `tower` field decides the path.

1. New order: splash -> pick-story -> game-settings -> tower-connect -> party-join. Splash no longer goes to tower-connect.
2. tower: optional (Proving Ground and The Count of Vellmoor): Connect and Calibrate as today, plus "Play without tower" next to Connect (R2-22 kept). Skipping is allowed.
3. tower: none: Connect Tower is skipped.
4. tower: required: no "Play without tower". Continue stays disabled until the tower is connected and calibrated, with the reason on the board and the device ("Connect and calibrate the tower first"). No repo pack uses required yet; cover it with schema and unit tests only.
5. Do not add any tower sound or light in this step. No Tower Connected #94 sound (R3-UI-62) and no volume picker (R3-UI-63). Step 7 adds the first tower sound.
6. Back from Connect Tower returns to Game settings. It never disconnects the tower.
7. This step changes the flow order in engine/session state and the screen enum in control.ts. Say so in the PR. No new message types.
8. Tests: unit tests for each `tower` value; a required pack cannot continue unconnected; nothing calls port.connect or port.calibrate except a winning press. e2e with the mock tower. In the PR, write down what you checked by hand with the real tower (connect, calibrate, skip).

Run pnpm check and the tests, then open a PR.
```

## 5. Claim hunters and setup steps

```text
Branch: feat/shell-05-claim-and-setup
Depends on: step 4 (Connect Tower after Game settings). Can run with step 7. Both add a flow screen, so the second to merge rebases FLOW_SCREENS, NEXT_BEFORE_PLAY and SCREEN_TITLE.

Read CLAUDE.md, research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-20, R3-UI-21, R3-UI-22, R3-UI-25, R3-UI-53, §2.9, §2.10), research/game-design/setup-wizard-and-summary.md (R-WIZ-5, R-WIZ-6, R-WIZ-11), research/game-design/r2-screen-flow.md (R2-30, R2-31, R2-50..52). Visual target: research/game-design/mockups/2026-10-17/v2-mac.png and v2-ipad.png (the setup frame uses "Lay out the board and orient the kingdoms"). Code: party-join and begin in engine.ts, StoryBoard.tsx, DeviceScreen.tsx, src/web/lib/screens.ts (partyJoinNextReason), packs/test/pack.yaml (`setup: [join]`).

Goal: the rest of start-up. The order is Pick Game, Game settings, Connect Tower, Claim Hunters, setup step dialogs, Begin.

1. Claim Hunters: rename the screen title "Party Join" to "Claim Hunters". Keep R2-30 (Continue disabled with the reason until every hunter is held) and R2-31 ("Take all"). Hunter names come from the pack; players never name or pick avatars (R3-UI-20). Portraits show on the board only, not on devices (R3-UI-51).
2. Setup steps: give the pack `setup` a shape: a list of {id, label, illustration?}, where illustration is an asset id of type still. Each step is its own board dialog. Devices show Done and Back (R-WIZ-6: never assume a step happened). After the last step, "Begin the story" (R2-50..52). Engine-owned steps (tower-connect, tower-volume-test) are not in `setup`.
3. Proving Ground gets 2-3 steps (§2.10). One is "Lay out the board and orient the kingdoms" (R-WIZ-5 step 4). One has an illustration. No illustration art is delivered yet: declare it in packs/test/assets.yaml with status placeholder, and show the dialog with no image until the file lands.
4. Running summary panel beside the current dialog on the board (R3-UI-25): game (cover + title), settings, tower state, hunters with the device holding each, and setup steps done. Empty items read "not chosen yet". Back clears the item it undoes.
5. Stats: time per setup step (R-WIZ-6) goes in the timing log.
6. This step changes session state and messages. Say so in the PR: the session holds the setup steps done; storyboard state carries the summary and the current setup step.
7. Tests: unit tests for the setup schema, Done/Back, the Begin gate and the summary after each step and after Back. e2e for the full order with the mock tower, both "Play without tower" and connected.

Run pnpm check and the tests, then open a PR.
```

## 6. Sound dialog and audio

```text
Branch: feat/shell-06-sound
Depends on: step 1 (pack loader). Can run with step 2. Step 6 owns new files (src/web/lib/audio/, src/web/components/board/SoundDialog.tsx, src/server/pack/audio.ts) and the /audio/ line in src/server/server.ts. It mounts the dialog in LiveBoard.tsx and adds only one hook line in load.ts. Do not edit TitleScreen.tsx, StoryBoard.tsx or DeviceScreen.tsx (step 2 owns them).

Read CLAUDE.md, research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-03, R3-UI-51, R3-UI-60, R3-UI-61, R3-UI-64), docs/deliveries/2026-10-17-shell-audio-and-covers.md. Visual target: research/game-design/mockups/2026-10-17/frames-mac-0-sound.png.

Audio files (already in the repo; .m4a only, WAV masters stay out of the repo):
- Blood Tower signature (app-level): apps/bloodtower/public/audio/signature/signature-bed.m4a, motif-sting.m4a, motif-soft.m4a. src/server/server.ts serves apps/bloodtower/public only under /avatars/ and /landing/. Add /audio/ there (pnpm dev and pnpm start).
- Proving Ground: assets/audio/proving-ground/startup-ambient.m4a, night1-ambient.m4a, night2-ambient.m4a, pg-music.m4a. They are parked outside the pack because the loader allows only images in packs/test/assets/ and no subfolders. Move them with git mv to packs/test/audio/ and add an `audio/` folder rule to the loader, like camera/ (flat, .m4a only, path jail, served at /packs/<id>/audio/<file>). Declare each in packs/test/assets.yaml (types ambient and music). Use ids mus.night-1 and mus.night-2 for the night beds (Proving Ground spec §3). Pick ids for the start-up mood and the waiting music in the same style and list them in the PR.

Uses and levels (from the delivery note). The files are already at these loudness levels, so play them at unity gain times the user's slider. Do not normalize again.
- signature-bed: app signature bed, loop, -30 LUFS. Plays from the landing screen through the Sound dialog and Pick Game (R3-UI-64 layer 1).
- motif-sting: when the landing window lights come on (the first board click), one shot, -18 LUFS.
- motif-soft: when a game is chosen, one shot, -26 LUFS.
- startup-ambient: Proving Ground start-up mood, loop, -30 LUFS. Crossfades in for the signature once Proving Ground is chosen, and plays through Game settings, Connect Tower, Claim Hunters and setup (layer 2).
- night1-ambient: mus.night-1 bed, loop, -30 LUFS. night2-ambient: mus.night-2 bed, loop, -30 LUFS (layer 3). Night 2 is not in packs/test yet, so wire the n1 mood and unit-test the n1 -> n2 crossfade with the picker.
- pg-music: waiting music, loop, -26 LUFS, under the waiting dialog during play (R3-UI-60).
- Every change between layers is a 2-3 s crossfade, never a hard cut. A pack with no moods falls back to the signature bed. Fade out over about 1 s when a visual zooms in, and back in when play returns to the waiting dialog.

Loop points (Web Audio, AudioBufferSourceNode with loop = true). Paste-in from the delivery note:
- Decode each loop with decodeAudioData and compare buffer length to the stated length N (48 kHz).
- If the decoder applied the edit list (length is N, or N plus a few hundred padding frames): loopStart = 0, loopEnd = N / 48000 (bed 114, startup 96, night1 100, night2 90, music 150 s).
- If it did not (length is about N + 582,000 frames): loopStart = 577024 / 48000 = 12.021333333 s, loopEnd = loopStart + N / 48000, and start playback at loopStart.
- The one-shots (motif-sting, motif-soft) are plain encodes: 1024 priming samples, 6.500 s playable. No loop.
- Put the check in one small function with a unit test for both cases.

Sound dialog (R3-UI-03): on the Mac, the first click or keypress on the landing screen unlocks browser audio and shows the Sound dialog before Pick Game. It has music, ambient and voice sliders, each with a short test clip from the signature (bed for ambient, motif-soft for music, motif-sting for voice until voice clips exist), plus Continue. Continue on the board closes it. This is a board-local control like the board Menu (R3-UI-39). Update the acceptance.spec.ts "board has no buttons" check to allow only this dialog. Levels are saved in localStorage on that Mac and survive reload. Tower volume is not here (it is set in Connect Tower).

Devices play no audio (R3-UI-51): no audio element or AudioContext on /device or /join.

No change to board/server/device messages, engine state or session state. The audio follows the screen and story already in storyboard state.

Tests: unit tests for loop points, the layer picker (stage -> file), crossfade timing, slider persistence and the no-audio-on-devices rule. e2e: one input opens the Sound dialog before Pick Game; levels persist across reload.

Run pnpm check and the tests, then open a PR.
```

## 7. Tower volume test (Proving Ground §6a)

```text
Branch: feat/shell-07-tower-volume-test
Depends on: step 4 (Connect Tower) and step 6 (audio engine, startup-ambient bed). Can run with step 5. Both add a flow screen, so the second to merge rebases FLOW_SCREENS, NEXT_BEFORE_PLAY and SCREEN_TITLE.

LOCAL ONLY, CAREFUL: this is the first step that makes the tower play a sound. Test it on the Mac with the real tower through tower-poc (TOWER_URL=ws://127.0.0.1:4747/ws). CLAUDE.md "Tower safety": the UI reaches the tower only through command{capabilityId, params}, no message carries raw bytes, nothing physical happens on its own, and there is no automatic retry. Apps never import from another app's folder.

Read packs/test/README.md §6a (follow its text exactly), §6 (engine rules: one command at a time, 250 ms after each write, never wait for a sound end), §14 (stat tower-volume-test), research/tower/api-surface-7.1.2.md §4 (playSoundStateful(soundIndex, loop?, volume?); VOLUME_DESCRIPTIONS 0 Loud, 1 Medium, 2 Quiet, 3 Mute; GAP-HW-003), research/game-design/playthrough-ui-notes-2026-10-17.md (R3-UI-60, R3-UI-63). Code: src/server/tower/port.ts (today only connect and calibrate; "There is no cue method"), src/server/tower/sidecar.ts, mock.ts, apps/tower-poc capability list.

Runs right after Connect Tower.

**With a tower connected:** run packs/test/README.md §6a as written (level test below).

**With no tower:** skip the level test (steps 1-3 below). Run only the sound-dialog check from step 6: confirm the host can hear the board (signature bed and sliders). No tower commands.

§6a level test (tower connected only):
1. Board dialog "Tower volume test". The tower plays Dungeon Complete (#58) at volume 0, then 1, then 2, about 4 s apart (one command at a time, 250 ms after each write). The board shows "Level 0", "Level 1", "Level 2" as each plays. Lights unchanged.
2. Balance check (optional, on by default): the start-up ambient bed plays at -30 LUFS, then #58 plays once at the host's chosen tier over it, with the bed ducked as in R3-UI audio rules. Board label: "Tower over the room sound".
3. One iPad (first press) asks "Did the levels sound different?": All three differ / Only one level is louder / All the same / write-in. A "Play again" button repeats step 1.
4. The answer, the write-in text, the tower firmware/version and the time are logged as stat tower-volume-test (event, scope session) and shown in the debug overlay.
- Labels stay neutral (no quiet/loud names), because the library's "2 is quietest" is unconfirmed until this result is in.

Notes for building it:
- Add one tower sound capability (sound index plus volume 0-3) through the existing command path and the tower-poc sidecar. Use a capability tower-poc already has if one fits. The mock records the commands for tests. Health still says what effects are allowed. Update it if it reports effects: "none".
- "The host's chosen tier": there is no volume picker yet (R3-UI-63). Use quiet (2) and say so in the PR.
- Ducking (R3-UI-60): the bed ducks hard or pauses while the tower plays. Use step 6's audio module.
- Firmware/version: from the tower snapshot if known; otherwise "unavailable", never zero or blank.
- Debug overlay (R3-UI-40): if it does not exist yet, log the stat and show it with ?debug=1 on the board, and say so in the PR.
- Write-in text needs a text field on the device. This step changes messages and session state; say so plainly in the PR: a new flow screen "tower-volume-test", a device payload carrying the answer and the write-in text (length-capped, never shown on other devices), the stat in the timing log, and a stats scope "session" added to statsSchema in pack.ts. Add {id: tower-volume-test, type: event, scope: session} to packs/test/stats.yaml.
- Back returns to Connect Tower. Continue goes on to Claim Hunters.
Tests: unit tests with the mock tower: command order, the 250 ms gap, about 4 s apart, no lights sent, with no tower only the sound-dialog check runs (no tower commands), "Play again", stat contents, unavailable firmware. In the PR, write down what you heard with the real tower at levels 0/1/2.

Run pnpm check and the tests, then open a PR.
```

## 8. Fix the flaky pack serve test

```text
Branch: feat/shell-08-serve-test-flake
Depends on: none. Can run with step 1 (step 1 does not touch this file).

Read CLAUDE.md (test-lock: on a fix/* branch tests are locked after the first commit; this branch is feat/, but keep the test's intent). File: apps/bloodtower/src/server/pack/serve.test.ts (with serve.ts, assets.ts, load.ts).

The cause is not confirmed. Find it first: run `pnpm -F bloodtower-server exec vitest run pack/serve.test.ts` at least 50 times in a loop, then again with the whole server suite (files run in parallel), and capture a failing run. Suspects to check, in order:
1. afterEach awaits server.close(), but several responses are never read (traversal, unknown, fakePack, missingCamera, the PNG body of byFile). fetch keeps those sockets open, so close() can hang until the hook timeout.
2. The test loads the real packs folder through loadConfig().packsDir. In a worktree, or with PACKS_DIR set, that can point at another tree or at a folder another test file is writing.
3. The temp folder names use Date.now() (bloodtower-resolve-, -link-, -escape-), which can collide with leftovers from an earlier run. Use mkdtempSync.
4. One long test does about 12 requests one after another, close to vitest's 5 s default timeout on a slow run.
Fix the real cause. Do not raise timeouts or add retries to hide it. Keep every assertion. Write the cause and the evidence (failing run before, 50 clean runs after) in the PR.

No change to board/server/device messages, engine state or session state.

Run pnpm check and the tests, then open a PR.
```
