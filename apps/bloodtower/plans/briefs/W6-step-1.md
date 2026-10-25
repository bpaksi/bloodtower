Keep this a checklist; do not write a second design doc.

# Brief: W6 Step 1 — Story board layer polish

## Meta

- Plan: Weekend, from `research/game-design/weekend-c1-acceptance.md` (Bob, Blood Tower room, 2026-10-25, on main as #218 at `570aa333`). W6 is the Story board layer step. W1 through W5 and W7 through W8 stay out of this file.
- Step: 1
- Owner: Gamewright (design). This is the Wright build-lane brief. Warden reviews it for completeness. Wright implements only after it is merged and that review passes.
- Related AREA/docs: AREA-077; weekend acceptance, "Illusionist Story board mocks"; SCR-013; `/board` via `CoreStoryBoard`.
- In scope: the six weekend Story board frames, in order: splash, pick, party, setup, move band, Enter place. Each frame is a layer on the landing painting. The move frame is the edge band and the waiting line. Enter place is the place still. The board stays display-only.
- Out of scope: W1, the iPad chrome shell. W2, the landing banner and Sound on `/`, and the Connect Tower / Play without Tower copy. W3, the Pick Story carousel, preview art, and Dracula. W4, Party Pick wording and hunter count. W5, setup-step copy and the Begin narrative. W7, the move UI on the acting iPad (UI-023). W8, exit and quit. iPad chrome. Sound, Game settings, Connect Tower, the session screen, and Goodbye are not frames in this stack.

## Cutover

Cutover: N

- Screen ids stay `splash`, `pick-story`, `claim-heroes`, `setup`, and `play`. No route, prompt id, or session field is renamed or removed.
- The play roster leaves `/board`. `[data-roster]` and `[data-hero-place]` on the Story board go away. Group positions stay on the session and on the acting iPad.

## Survival invariants

Continue, restore, and restart must keep:

- [ ] The session, as today on main: the autosave, Continue, and a restart that reloads the checkpoint.
- [ ] Story selection (Proving Grounds, pack `test`).
- [ ] Party picks (who is held on which iPad).
- [ ] The board graph, each group's space, and whether that group is inside a place. The Story board stops drawing those positions. The session still has them.
- [ ] Moves left and the day.
- [ ] Seed (kept, and not shown).
- [ ] Tower connect state, including a session that never connected. This step does not connect, calibrate, or retry a physical action.
- [ ] A place still that was up when the host stopped. Continue shows that same still on `/board`.

## Done-when (e2e)

Tower powered off is the path. Walk Proving Grounds the way `skipTowerToClaim` and `finishSetup` in `area-077.spec.ts` do: splash, pick-story, game settings (pass through), claim-heroes, setup, begin (pass through), play. One Story board at `/board` and one iPad. Set the board page to 1920×1080 (DEC-060). Leave the iPad at the project viewport. Projects `phone` (390×844) and `ipad` (820×1180) run the iPad checks. The board fit checks use the 1920×1080 board page in every project, including `phone`. The board page is never asserted at 390×844.

Hooks already on main: startup `main[data-board-mode="startup"][data-board-layer="startup"][data-screen]`, `[data-startup-panel]`, `[data-illusionist-asset="dialog-frame"]`, `.bt-board-backdrop`, `[data-band]`, `[data-waiting]`, `[data-place]`, `[data-still]`. This step adds `data-board-layer="move"` and `data-board-layer="place"` on play. It does not mount `[data-waiting-dialog]` or `[data-visual-layer]` for these six frames.

On every weekend frame the board has no `button`, `input`, `textarea`, `select`, or `a`. `document.scrollingElement` does not scroll (`scrollTop` stays 0). `scrollWidth` and `scrollHeight` stay within the viewport. No weekend-frame text is clipped: every text box sits fully inside the viewport, and no element inside the frame has `scrollHeight` greater than `clientHeight` by more than 1px.

- [ ] Run: `phone`, `ipad`, and `desktop`, open `/board` at 1920×1080 on splash, pick-story, claim-heroes, and setup. Expect: `data-board-mode="startup"` and `data-board-layer="startup"`. One dialog frame. `.bt-board-backdrop` is present and its background image URL contains `/landing/hero.webp`. The dialog frame is fully inside the viewport. `[data-band]`, `[data-place]`, `[data-still]`, `[data-roster]`, and `[data-hero-place]` are absent. No canvas. No image whose URL is a board map.
- [ ] Run: on splash, before the join level is readable, then again once it is. Expect: `[data-startup-panel="splash"]` and `data-screen="splash"`. The title is visible. Before the code, the panel says the hall is opening. After it, `[data-join-code]` is six digits and the join QR is inside the dialog. The panel does not show a story door, a hero roster, or a setup step.
- [ ] Run: on pick-story with the doors the host already sends. Expect: `[data-startup-panel="pick-story"]` and `[data-story-focus]` for the focused door. With the packs on main, that door is Proving Grounds (`test`). The focus, its title, and its plate sit fully inside the dialog and the viewport. A second door, when the host sends one, peeks with `[data-carousel-side]`. This step does not add a door, a cover file, or a preview image. A letter motif on the plate stays until W3.
- [ ] Run: on claim-heroes after one hero is held, with the join code up. Expect: `[data-startup-panel="claim-heroes"]`. `[data-join-code]` is visible. The party QR box is taller than the splash QR box. Each seated hero is listed once. The list has no space name and no kingdom label. Today's Claim strings may remain. This step does not replace them with Pick (W4).
- [ ] Run: on setup, press Done once so the iPad advances one step. Expect: one `[data-startup-panel="setup"]` and one `[data-setup-progress]`. The instruction on screen is a single step. After Done, the previous instruction is gone and the next step is the only one shown. The panel does not draw a board or mark heroes. Begin (`data-screen="begin"`) is not given a band, a place still, or a new layer name. The opening narrative stays W5.
- [ ] Run: after Begin, while a move offer is open and the group is not inside a place. Expect: `data-screen="play"`, `data-board-mode="play"`, `data-board-layer="move"`. `.bt-board-backdrop` still shows `/landing/hero.webp`. `[data-band]` is visible, its top edge is within 8px of the viewport top, and its height is at most 72px. The band shows, in order: one `[data-health]` per seated hero, one `[data-purse]`, `[data-chapter]` reading Proving Grounds, `[data-day]` matching `Day` plus an integer and no total, `[data-acting]` naming the group that is choosing, and `[data-moves]`. Health and purse read unavailable. A missing move reads unavailable. None of those read 0. The band does not show a modifier.
- [ ] Run: on that same move frame. Expect: one `[data-waiting]` line whose text matches `is choosing`. Its center lies in the central third of the viewport on both axes. It uses the slow pulse. With `prefers-reduced-motion: reduce`, that animation is `none` and the line stays visible. `[data-waiting-dialog]` is absent. `[data-place]` and `[data-still]` are absent. `[data-roster]`, `[data-hero-place]`, `[data-kingdom]`, and `[data-space-name]` are absent on `/board`. The board has no map image, no map wash over the painting, and no hero token. The four kingdom names and the four citadel space names are absent on `/board`. They remain on the iPad roster.
- [ ] Run: press the open move offer (the roll, or the first walk). Expect: `[data-waiting]` is gone after that press. A later offer may show the line again. The band stays on the move layer while the group is still outside a place.
- [ ] Run: from a building space, before Enter. Expect: the board stays `data-board-layer="move"` with no place still. The iPad still offers a walk to an adjacent space. Then Enter one Village, one Bazaar, one Citadel, and one Sanctuary. Expect: the board becomes `data-board-layer="place"`. `[data-band]` and `[data-waiting]` are not visible. One `[data-place]` figure is visible, with `[data-still]` equal to `place.village`, `place.bazaar`, `place.citadel`, or `place.sanctuary`. Its image URL returns 200. The figure is fully inside the viewport, its box covers at least 70% of the viewport width, and the caption is fully visible. The caption is the place line already in `area-077.spec.ts`. The landing painting does not cover the still.
- [ ] Run: `phone` and `ipad`, on that same Enter. Expect: the iPad `main img` count is 0. The iPad has no `[data-place]`, no `[data-still]`, and no dialog frame. The place caption is absent on the iPad. The only place action offered is `button[data-action-id="leave"]`. Enter, walk, and any other place action are absent while inside. Menu may still list Quit story and Connect tower. Do not press them. Read moves left, press Leave, and read it again. Expect: moves left is unchanged, the board returns to `data-board-layer="move"`, the still is gone, and the band is back. Enter did not change moves left either.
- [ ] Run: Enter a place, restart the host on the same autosave, and press Continue. Expect: the story is still Proving Grounds, the same heroes are held, the group is still inside that place, the same still is on `/board`, moves left and the day match, the seed matches, and the tower is still not connected. Leave, then restart again. Expect: the group is outside, the board is the move layer, and the position on the iPad roster matches the position from before the restart.
- [ ] Run: `area-077.spec.ts` still passes on `phone`, `ipad`, and `desktop`. Move its four `/board` `[data-kingdom]` expects onto the iPad roster. Keep its place-still, band, waiting, Leave, and no-image-on-iPad expects. Add no iPad bar and no Pick-copy assert in that file.

## AREA / DEC checklist

- [ ] SCR-004: closed before coding for this slice. Card status on main is `proposed`. Splash is the first Story board frame: one dialog over the landing painting, display only, while packs load and once the hall is open.
- [ ] SCR-007: closed before coding for the pick layer. Card status on main is `proposed`. Pick Story is one dialog. The focused door fits the viewport. The board does not scroll or clip that frame. Deferred to W3, owner Wright: restoring the carousel's preview art (UI-016) and the Dracula door (SCR-009). This step adds neither.
- [ ] SCR-010: closed before coding for the party layer. Card status on main is `decided`. The frame is one dialog, a large join QR, and the seated heroes, with no map. Deferred to W4, owner Wright: the Pick button, "N of N picked", and the help line (DEC-232). A remaining Claim string does not fail this step.
- [ ] SCR-011: closed before coding for the setup layer. Card status on main is `proposed`. One step shows at a time, in one dialog, and Done replaces it. The frame does not draw the board. Deferred to W5, owner Wright: the step copy and the Begin narrative (SCR-012).
- [ ] SCR-013: closed before coding for this slice. Card status on main is `proposed`. These six frames fit the 1920×1080 viewport. The board does not scroll and does not clip their text. Quit, the session screen, Sound, Game settings, and Connect Tower stay out of the stack.
- [ ] UI-028: closed before coding for this step. Card status on main is `proposed`. During a move the Story board shows the edge band: one health mark per seated hero, the purse, the chapter, "Day N" with no total, the acting group, and moves left. DEC-186 (`decided`) is the slim frame. DEC-198 (`decided`) puts it along the top. DEC-190 (`decided`) hides it while the place still fills the screen, and brings it back after Leave. Unknown health, purse, and moves read unavailable, never 0.
- [ ] UI-031: closed before coding for this step. Card status on main is `proposed`. The waiting line is a small pulse in the middle of the board, naming who is choosing. It honours reduced motion. It goes away on the press that takes the offer. DEC-197 (`decided`): the line sits on the painting. The waiting dialog is not this frame.
- [ ] DEC-189: closed before coding (`decided`, Bob 2026-10-23, and the 2026-10-24 line). The Story board shows no map, no map wash, and no hero markers. The physical board and the minis are the map. The acting iPad's move map is W7.
- [ ] DEC-201: closed before coding (`decided`). The place still plays on the Story board only. The iPad shows text and controls.
- [ ] DEC-220: closed before coding (`decided`). Enter opens the place. Leave is the only place action in this slice (AREA-077). Enter and Leave are free. A walk through a building space stays available on the iPad before Enter.
- [ ] DEC-060: closed before coding (`decided`). The Story board fit is judged at 1920×1080.
- [ ] AREA-077: closed before coding for this slice. Card status on main is `open`. This step uses the slice's Leave-only places. It adds no event and no second place action.
