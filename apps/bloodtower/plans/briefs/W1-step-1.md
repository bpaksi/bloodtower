Keep this a checklist; do not write a second design doc.

# Brief: W1 Step 1 — iPad chrome shell

## Meta

- Plan: Weekend, from `research/game-design/weekend-c1-acceptance.md` (Bob, Blood Tower room, 2026-10-25, on main as #218 at `570aa333`). W1 is the first build step. W2 through W8 stay out of this file.
- Step: 1
- Owner: Gamewright (design). This is the Wright build-lane brief. Warden reviews it for completeness. Wright implements only after it is merged and that review passes.
- Related AREA/docs: AREA-078; weekend acceptance, "Production-ready start" (the iPad chrome lines only); `apps/bloodtower/src/e2e/playwright.config.ts` projects `phone` and `ipad`.
- In scope: the shell on `/join` and `/device`. A bottom bar. Back, Replay, and Menu centered. Menu is a gear and opens a centered dialog. The page itself does not scroll. Continue and Cancel stay pinned when content scrolls. Any iPad video stays muted.
- Out of scope: W2, the landing banner and Sound on `/`, and the Connect Tower / Play without Tower copy. W3, the Pick Story carousel and Dracula. W4, Party Pick wording and hunter count. W5, setup boards and the Begin narrative. W6, Story board layer polish. W7, the move UI (UI-023). W8, exit and quit. `/board` is the Story board, not an iPad screen.

## Cutover

Cutover: N

- The Oct 23 top bar is replaced in place by the bottom bar on the same iPad screens. No route, screen id, prompt id, or session record is renamed or removed.

## Survival invariants

Continue, restore, and restart must keep:

- [ ] The session, as today on main: the autosave, Continue, and a restart that reloads the checkpoint.
- [ ] Party picks (who is held on which iPad).
- [ ] Story selection (the pack chosen before this shell).
- [ ] Tower connect state, including a session that never connected. The chrome does not connect, calibrate, or clear that state.
- [ ] Opening and closing the Menu dialog leaves those four as they were. This step is a shell. It does not write a new session.

## Done-when (e2e)

Playwright projects `phone` (390×844) and `ipad` (820×1180) in `apps/bloodtower/src/e2e/playwright.config.ts`. Both run every chrome check. The desktop project does not. Assert no Claim, Hold, or Pick wording (that is W4). The existing hold control may keep its label.

The bar hook is `[data-bottom-bar]`. Move today's `[data-topbar]` hook onto it. One bar only. Buttons keep `[data-action="back"]`, `[data-action="replay"]`, and `[data-action="menu"]`.

- [ ] Run: `phone` and `ipad`, open `/join` with no code. Expect: the Join heading, the join-code field, and Enter the table stay. `[data-bottom-bar]` is visible and its bottom edge is within 8px of the viewport bottom. Back, Replay, and Menu sit inside the bar, left to right. The empty space left of Back and right of Menu match within 12px. On `ipad` each of those sides is at least 24px. The gap between Back and Replay is within 12px of the gap between Replay and Menu. Back and Replay show those words. Menu's accessible name is Menu. Its visible mark is a gear (`svg` or `img`) and it has no text characters. With no back or replay target, Back and Replay are visible and disabled. Menu is visible and enabled. A control that cannot be used stays on the bar.
- [ ] Run: `phone` and `ipad`, open `/join?code=` with a live six-digit code (the host may already have moved the page to `/device`). Expect: the same bar. Then walk tower-off Proving Grounds the way `skipTowerToClaim` in `area-077.spec.ts` does. At each `data-screen` before the press that leaves it (splash, pick-story, game-settings, claim-heroes), expect the same bar. Party is `data-screen="claim-heroes"`. Also expect the bar on tower-connect, setup, begin, and play when the walks already in `area-077.spec.ts` show those screens (optional connect for tower-connect; `finishSetup` for setup and begin). Pause, session, and goodbye use this same shell. Do not press Quit story.
- [ ] Run: on `/join` and on claim-heroes, activate Menu. Expect: one centered dialog (`role="dialog"`) with space on all four sides. Its center is within 24px of the viewport center. Look up, Table, and Leave appear once, inside the dialog. The dialog has no Back control and no Replay control. The bottom bar stays visible. Activate Menu again, or press Escape. Expect: the dialog closes and the screen under it is unchanged. Leave may still offer Quit story at `data-prompt-id="menu-quit"` and `data-action-id="quit-story"`. Leave that press for W8. Table may still offer `menu-connect`. This step does not require a connect.
- [ ] Run: `phone`, on claim-heroes. If the content is shorter than the viewport, insert a tall spacer in the content region only. Scroll that region to its end. Expect: `document.scrollingElement` does not move (`scrollTop` stays 0, or the page scroll height stays within the viewport). The bottom bar stays put. `button[data-action-id="continue"]`, when the screen offers it, stays fully inside the viewport and outside the scrolling region. A control whose accessible name is Cancel, when the screen already has one, stays fully inside the viewport the same way. No new Cancel control is part of this step. Back stays on the bar.
- [ ] Run: on each iPad screen visited above, query `video` and `audio`. Expect: every `video` has `muted === true` and `volume === 0`. No `audio` element is playing. The shell adds neither element. Add no video to satisfy the check.
- [ ] Run: search `docs/deliveries/` and `apps/bloodtower/public/` for an engraved manuscript iPad corner frame. Expect: no such path on main at `570aa333`. `public/board/dialog-frame/` is the Story board dialog frame. This step adds no image and does not point the iPad shell at `dialog-frame`. Corner-frame pixels stay deferred. Owner: Illusionist records the asset path. Wright wires that path when it lands, and the `phone` and `ipad` projects then show it on the four corners of `/join` and `/device`.
- [ ] Run: on claim-heroes, hold hero-a with the existing hold control, open the Menu dialog, close it, restart the host, and press Continue. Expect: the story is still Proving Grounds, hero-a is still held, the tower is still not connected, and Continue resumes the session the way main does today.
- [ ] Run: `area-077.spec.ts` still passes on `phone` and `ipad`. Point its `[data-topbar]` expect at `[data-bottom-bar]`. Leave its Quit story presses in place. `/` and `/board` gain no iPad bar from this step.

## AREA / DEC checklist

- [ ] DEC-227: closed before coding (`decided`, Bob 2026-10-25). A bottom bar on every iPad screen. Back, Replay, and Menu are centered. Menu is a gear and opens a centered dialog. A control that cannot be used is greyed and stays visible. This replaces the Oct 23 top bar on these screens.
- [ ] DEC-229: closed before coding for this slice (`decided`). The Menu is a centered dialog with Look up, Table, and Leave. Back and Replay stay on the bar. Quit story stays the Leave item and keeps today's press. What that press does is W8, owner Wright. The version line and the debug toggle under the groups are deferred, owner Wright, outside this step. The weekend acceptance asks for the gear and the centered dialog.
- [ ] DEC-231: closed before coding for this slice (`decided`). Any video on an iPad stays muted. The chrome adds no iPad audio. The press state and the optional haptic already on main stay as they are.
- [ ] DEC-233: deferred. The ruling is `decided` (Bob 2026-10-25, theme B, engraved manuscript corners). The asset path is not in the repo. Owner: Illusionist, for the mock and the file. Wright wires the recorded path when it lands. Invent no engraving, and do not reuse the Story board dialog frame. Unframed corners do not pass this card; they wait on that path. The bar, dialog, scroll, and mute work in this step do not wait on the file.
- [ ] UI-032: closed before coding for this step. Card status on main is `proposed`. DEC-227 is the lock: a bottom bar, centered Back and Replay, and a gear Menu, on `/join` and every `/device` screen.
- [ ] UI-033: closed before coding for this step. Card status on main is `proposed`. The gear opens a centered dialog. The version line and the debug toggle are the DEC-229 deferral above.
- [ ] SCR-016: closed before coding for this slice. Card status on main is `proposed`. The page does not scroll. When content must scroll, only that region scrolls, and Continue and Cancel stay pinned. Deferred to W2, owner Wright: the step's context and instruction, and the button names Connect Tower and Play without Tower.
