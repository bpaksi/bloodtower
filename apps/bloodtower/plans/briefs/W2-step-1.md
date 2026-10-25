Keep this a checklist; do not write a second design doc.

# Brief: W2 Step 1 — landing banner, Sound, and connect actions

## Meta

- Plan: Weekend, from `research/game-design/weekend-c1-acceptance.md` (Bob, Blood Tower room, 2026-10-25, on main as #218 at `570aa333`). W2 is the next Production-ready start slice after W1. W3 through W8 stay out of this file.
- Step: 1 (file `W2-step-1.md`)
- Owner: Gamewright (design). This is the build-lane brief. Warden reviews it for completeness. Anvil implements only after it is merged and that review passes.
- Related AREA/docs: AREA-048, AREA-049, AREA-051, AREA-056; SCR-002, SCR-003, SCR-005, SCR-016; weekend acceptance, "Production-ready start" (the landing, Sound, and action-name lines only); `apps/bloodtower/src/e2e/playwright.config.ts` projects `phone`, `ipad`, and `desktop`.
- In scope: the landing route `/`. A designed Blood Tower banner. A Sound control on `/`, and the first click or key on that page as the gesture that unlocks browser autoplay. On the iPad, the step's context and instruction when the table needs them, and action-named buttons, in particular "Connect Tower" and "Play without Tower".
- Out of scope: W1 chrome already briefed (bottom bar, gear Menu dialog, muted iPad video, no full-page scroll, pinned Continue and Cancel). W3, the Pick Story carousel, preview art, and the Dracula not-ready door. W4, Party Pick wording and hunter count. W5, setup boards and the Begin narrative. W6, Story board layer polish. W7, the move UI (UI-023). W8, exit and quit. `/board` is the Story board. This step does not put the iPad bar on `/` or on `/board`.

## Cutover

Cutover: N

- `/` stays `/`. Screen id `tower-connect` stays. Prompt id `tower-connect` and action id `tower-connect` stay. Action id `play-without-tower` stays where a shell already uses it. `[data-sound-dialog]` stays. No session record is renamed or removed. Visible labels change in place.

## Survival invariants

Continue, restore, and restart must keep:

- [ ] The session, as today on main: the autosave, Continue, and a restart that reloads the checkpoint.
- [ ] Party picks (who is held on which iPad).
- [ ] Story selection (the pack chosen before this step).
- [ ] Tower connect state, including a session that never connected. Opening Sound, closing Sound, and pressing Play without Tower do not connect, calibrate, or clear that state. Nothing connects on its own.
- [ ] Sound levels on this Mac (`bloodtower.audioLevels`). A host restart does not clear them. Writing a level does not change the session, the picks, the story, or the tower connect state.

## Done-when (e2e)

Playwright projects in `apps/bloodtower/src/e2e/playwright.config.ts`: `phone` (390×844), `ipad` (820×1180), and `desktop` (1440×900). Landing checks run on all three. The Sound unlock runs on `desktop` only. Device checks run on `phone` and `ipad`. Assert no new Pick wording (that is W4). The existing hold control may keep its label. Leave the word `claimed` in the count.

The banner hook is `[data-banner]`. The Sound control hook is `[data-action="sound"]`. The dialog hook stays `[data-sound-dialog]`. Step copy hooks are `[data-step-context]` and `[data-step-instruction]`, inside `main[data-screen]`, outside the bottom bar and outside the Menu dialog.

- [ ] Run: `phone`, `ipad`, and `desktop`, open `/`. Expect: `[data-screen="title"]` is visible. `[data-banner]` is visible and is an `img` or `svg`. Its accessible name is Blood Tower. Its text content is empty. Its source is not `/landing/hero.webp`. The backdrop may keep `/landing/hero.webp`. There is no heading whose only text is Blood Tower used as the banner. The Story board link and the Hunter link stay. Hunter still goes to `/join`. `/` has no `[data-bottom-bar]`.
- [ ] Run: search `docs/deliveries/` and `apps/bloodtower/public/` for a designed Blood Tower banner (a title lockup, not the painting). Expect: no such path on main at `1df35c0`. `apps/bloodtower/public/landing/hero.webp` is the landing painting (delivery 2026-10-17, 16:9, no text). It is the backdrop, not the banner. Banner pixels stay deferred. Owner: Illusionist records the asset path. Anvil wires `[data-banner]` to that path when it lands. Until then the banner box stays open. A text heading of the words Blood Tower does not close it. Sound, context, and the connect buttons do not wait on the file. This step invents no wordmark.
- [ ] Run: `desktop`, open `/`. Expect: `[data-action="sound"]` is visible. Its accessible name is Sound. `[data-sound-dialog]` count is 0. No `audio` element is playing. A context the page created is absent or `suspended`. `/board` has no `[data-action="sound"]` from this step.
- [ ] Run: `desktop`, Chromium `--autoplay-policy=document-user-activation-required`, trace off, the same way `sound-unlock.spec.ts` does. Open `/`. Before any trusted click or key, expect no running context and no playing `audio`. Dispatch an untrusted Escape the way that spec does. Expect: the context stays absent or `suspended`. Press a key that is not Tab and not a meta or ctrl shortcut, with focus not on a link. Expect: the URL stays `/`, and a context is `running` only after that key. Activate `[data-action="sound"]` with a real click on a fresh load. Expect: the URL stays `/`, one `[data-sound-dialog]` is visible, and the context is `running`.
- [ ] Run: `desktop`, activate Sound. Expect: three sliders, `#bt-sound-music`, `#bt-sound-ambient`, and `#bt-sound-voice`. Three buttons named Test. One Continue. No tower-volume slider. Set music to 35. Press Continue. Expect: the dialog closes and the URL stays `/`. Reload `/` and open Sound. Expect: `#bt-sound-music` is 35 (`bloodtower.audioLevels`). Retarget `sound-dialog.spec.ts` and `sound-unlock.spec.ts` onto `/`. They stay desktop-only. A click on `/board` is not the only way to open Sound. Keep both files in `testIgnore` as they are today.
- [ ] Run: `phone` and `ipad`, open `/`, activate Sound, press Test. Expect: the URL stays `/`. No `audio` element is playing. No context is `running`. Continue closes the dialog. A click that is not the Hunter link does not assign `/board`.
- [ ] Run: `desktop`, `landing.spec.ts`. Expect: a click off Sound and off the links still opens `/board` on a fine pointer. Tab stays on `/` and focuses the Story board link. The file stays in `testIgnore`.
- [ ] Run: `phone` and `ipad`, tower off, walk Proving Grounds the way `skipTowerToClaim` in `area-077.spec.ts` does, through splash, pick-story, and game-settings. Expect: the next screen is `data-screen="tower-connect"`, before claim-heroes. `[data-step-context]` reads Tower Connect. `[data-step-instruction]` reads `No tower yet. An iPad can connect it, or play on without it.` Both are visible. One primary button, accessible name exactly Connect Tower, `data-action="tower-connect"`. One other button, accessible name exactly Play without Tower, `data-action="play-without-tower"`, and it is not the primary. No button on that screen is named Connect tower, Play without tower, Skip, Next, or Continue. Entering the screen sends no connect command.
- [ ] Run: on that tower-connect screen, press Play without Tower. Expect: the screen leaves `tower-connect`, the tower stays not connected, and `session.tower.sent()` has no `connect` (the same count `area-077.spec.ts` already asserts on the tower-off path). Do not press Connect Tower on this walk. Update `skipTowerToClaim` so the tower-off path presses Play without Tower here. Do not press Quit story.
- [ ] Run: `phone` and `ipad`, on splash, pick-story, game-settings, and claim-heroes, before the press that leaves each one. Expect: `[data-step-context]` and `[data-step-instruction]` are visible and not the string `0`. Context is the existing step name: Splash, Pick Story, Game settings, Party Join. Instruction is the existing `shows` line for that screen (splash `Blood Tower`; pick-story the story title already shown; game-settings the settings already shown, non-empty; claim-heroes matches `/^\d+ of \d+ claimed$/`). Do not rewrite those strings. Setup and begin keep the lines they already have. No new Begin narrative.
- [ ] Run: on claim-heroes, open Menu. When Table offers `menu-connect`, that button's accessible name is Connect Tower. Its action id stays `tower-connect`. Leave Quit story for W8. Close the dialog. Expect: the screen under it is unchanged.
- [ ] Run: on claim-heroes, hold hero-a with the existing hold control, set a Sound level on `/` in the same browser, restart the host, and press Continue. Expect: the story is still Proving Grounds, hero-a is still held, the tower is still not connected, Continue resumes the session the way main does today, and `#bt-sound-music` is still the level that was saved.
- [ ] Run: `area-077.spec.ts` still passes on `phone` and `ipad` after `skipTowerToClaim` presses Play without Tower. `/board` gains no iPad bar and no landing banner from this step.

## AREA / DEC checklist

- [ ] SCR-002: closed before coding for this slice. Card status on main is `proposed`. Landing `/` shows a designed Blood Tower banner. The words "Blood Tower" alone are not the banner. The painting `hero.webp` is the backdrop.
- [ ] Banner file: deferred. No designed banner path is in the repo. Owner: Illusionist, for the graphic and the delivery note. Anvil wires the recorded path. A typeset heading does not close SCR-002. Sound and the connect buttons do not wait on the file.
- [ ] SCR-003: closed before coding for this slice. Card status on main is `proposed`. `/` has its own Sound control: music, ambient, and voice, a short test clip, then Continue. The first click or key on `/` is the gesture that unlocks browser autoplay. Until that gesture the browser does not start audio. Levels are remembered on that Mac. Tower volume stays out of this dialog.
- [ ] SCR-005: closed before coding for this slice. Card status on main is `proposed`. The primary button reads Connect Tower. Proving Grounds stays `tower: optional`, so the other button reads Play without Tower. Nothing physical is sent until Connect Tower is pressed. A required pack, with no Play without Tower, is outside this step. Owner: Anvil, when a required pack is in the walk.
- [ ] SCR-016: closed before coding for the remainder W1 deferred. Card status on main is `proposed`. The step shows its context and its instruction when the table needs them. A button names the action, as in Connect Tower and Play without Tower. The scroll and pin lines stay in W1. This step does not reopen them.
- [ ] SCR-006: deferred. The tower volume test is not this step. Owner: Anvil, outside W2. The Sound dialog does not gain a tower slider.
- [ ] DEC-233: deferred. The ruling is `decided` (Bob 2026-10-25, theme B). The reference path on main is `docs/ui-mocks/weekend-w1/b-engraved-ipad-move-map.jpg` (#220, `1df35c0`). W2 does not slice corners and does not wire them onto `/`, Sound, or tower-connect. Owner: Wright, on the W1 chrome, not this step. Do not use that JPEG as a `border-image`. Do not point `/` or `[data-sound-dialog]` at it.
- [ ] UI-014: deferred. The Story board prompt band is not this step. Owner: Anvil, with W6. The iPad instruction hook is the SCR-016 line above.
- [ ] AREA-048: closed before coding for this slice. Card status on main is `open`. The landing route is `/`, with the banner and the Sound control. The rest of the screen set stays on its own steps.
- [ ] AREA-049: closed before coding for this slice. Card status on main is `open`. Sound lives on `/`. The optional connect buttons use the locked names. Setup boards and Begin stay W5.
- [ ] AREA-051: closed before coding for this slice. Card status on main is `open`. tower-connect shows one primary button, the step context, and the instruction. Party wording stays W4.
- [ ] AREA-056: closed before coding for this slice. Card status on main is `open`. Connect is a press, and the two button names are the ones above. Calibrate, orient, and the glyphs stay outside this step. Owner: Anvil, later.
