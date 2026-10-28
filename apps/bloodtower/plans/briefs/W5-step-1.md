Keep this a checklist; do not write a second design doc.

# Brief: W5 Step 1 — setup boards and the Begin opening

## Meta

- Plan: Weekend, from `research/game-design/weekend-c1-acceptance.md` (Bob, Blood Tower room, 2026-10-25, on main as #218 at `570aa333`). W5 is this build step. W1 through W4 and W6 through W8 stay out of this file.
- Step: 1
- Owner: Gamewright (design). This is the Wright build-lane brief. Warden reviews it for completeness. Wright implements only after it is merged and that review passes.
- Related AREA/docs: AREA-049; AREA-046; weekend acceptance, "Story setup" (the two setup and Begin lines only); SCR-011; SCR-012; UI-002; UI-003; UI-005; DEC-201.
- In scope: Proving Grounds, tower off. After heroes are held, each physical setup step is its own dialog on the Story board and on every iPad. Done is required on every step before Begin is offered. Begin then plays the story opening on the Story board, and the first move waits until that opening has played. Reuse the talking avatar and the panning and motion stills, including the grey-stair stills from the Oct 17 playthrough. A line with no final copy may be a text placeholder.
- Out of scope: W1, the iPad chrome shell. W2, the landing banner and Sound on `/`, and the Connect Tower / Play without Tower copy. W3, the Pick Story carousel and Dracula. W4, Party Pick wording and hunter count. W6, Story board layer polish. W7, the move UI (UI-023) and the move band (UI-028), past the gate that the first move waits for the opening. W8, exit and quit. The starting purse (DEC-114) and the fortune wheel. The full R-WIZ-5 list (components, buildings, decks, tokens, private handouts). `grey-stair.door-choice`. A tower cue on Begin. New art.

## Cutover

Cutover: N

- Setup and Begin stay the screens they are (`setup`, `begin`). Prompt ids `continue-setup-<id>`, `back-setup-<id>`, `continue-begin`, and `back-begin` stay. No route, screen id, or session record is renamed or removed. The opening plays on the Story board after Begin and before the first move.

## Survival invariants

Continue, restore, and restart must keep:

- [ ] The session, as today on main: the autosave written when play starts, Continue, and a restart that reloads that checkpoint. This step does not add a second save.
- [ ] Party picks (who is held on which iPad) and the story (Proving Grounds).
- [ ] Tower connect state, including a session that never connected. Setup Done, Begin, and opening Continue do not connect, calibrate, drop a skull, or retry a physical action.
- [ ] Hero start positions once play is underway: one hero alone at each kingdom citadel (N, E, S, W). The opening does not move a hero or spend a move.
- [ ] Seed (kept, and not shown).
- [ ] A restart before the play autosave does not resume on Begin or on a move. Steps that were not Done are not skipped.
- [ ] The checkpoint Continue reloads includes how far the opening has played. A reload before the last opening moment does not offer a walk. A reload after the opening resumes the unspent move the way `area-077.spec.ts` does today.

## Done-when (e2e)

Playwright projects `phone` (390×844) and `ipad` (820×1180) run every iPad check. `desktop` (1440×900) runs every Story board check. Walk tower-off Proving Grounds the way `skipTowerToClaim` in `area-077.spec.ts` does, then hold hero-a, hero-b, hero-c, and hero-d and press `continue-claim-heroes`. Do not press Quit story.

On main at `1df35c0`, `packs/test/pack.yaml` lists no `setup`, and `loadStories` drops `seals-and-skulls`, so claim Continue can land on Begin with no physical step. That is the gap. The engine already walks `seals-and-skulls`, then the pack steps, in `mergeSetupSteps` (`apps/bloodtower/src/engine/loops/session/pack.ts`). This step shows these three, in that order, and no others:

1. `seals-and-skulls` — "Place the seals on the tower and load the skulls into the chute."
2. `lay-out-board` — "Lay out the board and orient the kingdoms."
3. `place-heroes` — "Stand each hero on their start building."

`seals-and-skulls` stays the engine step. The pack lists the other two. The labels stay those strings.

The step hook is `[data-setup-step="<id>"]` on the iPad and on the Story board. One id at a time. Done stays `button[data-action="continue"]` with accessible name Done and `data-prompt-id="continue-setup-<id>"`. Begin stays `data-prompt-id="continue-begin"` with accessible name Begin. While a setup step is current, `[data-begin-lock]` is visible, its text says the setup steps are not done, and that text is not "Already taken." `button[data-prompt-id="continue-begin"]` is not enabled.

Opening moments, in this order, on the Story board, before any walk. Advance each with Continue (`data-action="continue"`). That press is not `continue-begin` and not `continue-setup-*`.

1. `grey-stair.01` — panning still (UI-003). Hook `[data-camera-still]` and `img[data-camera-track="grey-stair.01"]` when the still and the camera sidecar are in the repo.
2. `grey-stair.02` — panning still, same player, track id `grey-stair.02`.
3. `grey-stair.03` — talking avatar (UI-002). One `[data-keeper-plate]`. Caption `[data-board-caption]` with a non-empty line. The Keeper lines `ts-keeper-001` through `ts-keeper-003` in `apps/bloodtower/public/avatars/keeper/` may be that line. A line with no final copy is a non-empty text placeholder. The portrait is `/avatars/keeper/`.
4. `grey-stair.04` — motion still (UI-005), the still after the Keeper in the Oct 17 playthrough. One layered glow. Reduced motion is a steady glow. `grey-stair.door-choice` is not in this sequence.

`main[data-moment]` is that id while the moment is up. The first `button[data-action-id="walk"]` appears only after Continue leaves `grey-stair.04`.

Searched at `1df35c0`: no `packs/test/camera/` sidecars and no grey-stair still file. `public/avatars/keeper/` is present. `public/landing/window-mask/` is the landing painting. `public/board/dialog-frame/` is the startup frame. Place stills are `place.village`, `place.bazaar`, `place.citadel`, and `place.sanctuary`.

- [ ] Run: `phone` and `ipad`, from claim Continue. Expect: `data-screen="setup"` and `[data-setup-step="seals-and-skulls"]`. The Done label and the seals instruction are visible. `[data-begin-lock]` is visible. Begin is not enabled. The iPad has no `img`. Back returns to `claim-heroes`. Claim Continue returns to the same first step.
- [ ] Run: Done on each step, and Back from the second and third. Expect: the ids above, in that order. The board `[data-setup-progress]` reads "Step 1 of 3", then "Step 2 of 3", then "Step 3 of 3". Back from `lay-out-board` shows `seals-and-skulls` and "Step 1 of 3". Back from `place-heroes` shows `lay-out-board` and "Step 2 of 3". Only one `[data-setup-step]` is in the document. The board stays `data-board-mode="startup"`, shows the same id and the same instruction, and has no `button`. It has no `[data-hero-place]` and no map. The iPad has no `img` on any of the three steps.
- [ ] Run: Done on `place-heroes`. Expect: `data-screen="begin"`. `[data-begin-lock]` is gone. Begin is visible and enabled. The board still says the table is set (`data-startup-panel="begin"`). Back returns to `place-heroes` with Begin locked again. The mock tower's sent list gained no command on any Done.
- [ ] Run: two iPads on Begin, press Begin together the way `releaseTogether` does in `area-077.spec.ts`. Expect: one opening. Both iPads leave the enabled Begin control. The Story board's first moment is `grey-stair.01`. Neither iPad shows a walk, an enter, or a story `img`. The board is no longer only the startup line "The table is set."
- [ ] Run: `desktop` plus `ipad`, Continue through the four moment ids. Expect: the board shows them in order. On `grey-stair.03`, one Keeper plate is visible, the caption text is non-empty, and a board `audio` element may play. Every iPad `audio` element is paused. The iPad shows Continue and no walk until after `grey-stair.04`. No moment id is `grey-stair.door-choice`. The mock tower's sent list is still empty.
- [ ] Run: for `grey-stair.01` and `grey-stair.02`, when the still file and the camera sidecar are in the repo. Expect: `[data-camera-still]` and `img[data-camera-track="<id>"]`. With `prefers-reduced-motion: no-preference`, the still's transform changes during the moment. With `prefers-reduced-motion: reduce`, the transform holds. The image is not `hero.webp`, not `dialog-frame`, and not a `place.*` still.
- [ ] Run: the same two moments when the still file or the sidecar is absent. Expect: `[data-still-state="unavailable"]` on the board, a non-empty caption or placeholder, and no `img` whose `src` is the landing hero, the dialog frame, or a place still. Unavailable is not a pass of UI-003. Owner: Illusionist records the still path and the camera-track sidecar. Wright wires that path when it lands. Setup, the Begin lock, the Keeper, and the wait for the first move do not wait on the file.
- [ ] Run: `grey-stair.04` when its painting and mask are in the repo. Expect: the motion-still player (`data-motion-still` and a glow layer). With reduced motion off, the glow flickers (the UI-005 player, about 1–2 Hz, not a strobe). With reduced motion on, the glow is steady. When the painting or the mask is absent, expect `[data-still-state="unavailable"]` and no flicker. Do not point this moment at `public/landing/window-mask/` or at `/`. Unavailable is not a pass of UI-005. Owner: Illusionist records the painting and the mask. Wright wires those paths when they land.
- [ ] Run: after Continue leaves `grey-stair.04`. Expect: the acting iPad may show `button[data-action-id="walk"]`. Heroes are still one per citadel. Moves are unspent. The move band and the move map stay as main draws them today. This step does not restyle them.
- [ ] Run: Done on `seals-and-skulls`, restart the host before Begin, and come back through the same join. Expect: the session is not sitting on Begin or on a walk. `lay-out-board` is not already skipped if that Done was not kept. Proving Grounds is still the story. The tower is still not connected.
- [ ] Run: finish the opening, restart, and press Continue the way the area-077 restart test does. Expect: the story, the holds, the citadels, the day, and the unspent moves match the game from before the restart. A restart taken on `grey-stair.02` does not show a walk.
- [ ] Run: `area-077.spec.ts` still passes on `phone`, `ipad`, and `desktop`. `finishSetup` presses Done on the three ids, Begin, and Continue through the four opening moments, and does not press a walk. Its later play asserts stay after that opening. Leave its Quit story presses in place.

## AREA / DEC checklist

- [ ] SCR-011: closed before coding for this step. Card status on main is `proposed`. One physical setup step at a time, on the board and on every iPad. Done moves on. Begin stays unavailable until every step is Done.
- [ ] SCR-012: closed before coding for this step. Card status on main is `proposed`. Begin stays off, with the reason shown, until every setup step is Done. Any joined iPad can begin; first press wins. Begin then plays the opening on the Story board before the first move.
- [ ] UI-002: closed before coding for the Keeper at `grey-stair.03`. Card status on main is `proposed`. One speaker, captions on the Story board, the portrait and mouth shapes already under `public/avatars/keeper/`. A line with no final copy may be a text placeholder.
- [ ] UI-003: closed before coding when the grey-stair still and its camera sidecar are in the repo. Card status on main is `proposed`. Until those files land, the moment shows unavailable and this card stays open for the pixels. Owner: Illusionist for the files, Wright to wire the recorded path.
- [ ] UI-005: closed before coding when the `grey-stair.04` painting and mask are in the repo. Card status on main is `proposed`. Reduced motion is a steady glow. A missing mask shows unavailable and does not flicker. The landing window mask stays on the landing painting.
- [ ] DEC-201: closed before coding (`decided`). Pictures, the avatar, and story sound play on the Story board. iPads stay text and icon controls.
- [ ] DEC-110: closed before coding for this slice (`decided`) for seals and skulls, lay out the board, and place the heroes, in the order `mergeSetupSteps` already walks. Deferred: the starting purse (item 6, DEC-114). This step does not reorder the engine list.
- [ ] DEC-222: closed before coding (`decided`). Setup keeps the seals and skulls step so the tower has skulls to drop later. The `loadStories` filter that drops `seals-and-skulls` is the defect this step removes. This step does not drop a skull.
- [ ] DEC-112: closed before coding (`decided`). Placing the heroes is the core step. Proving Grounds stays one hero per kingdom citadel. This step does not change those starts.
- [ ] AREA-049: closed before coding for this slice. Card status on main is `open`. The setup and Begin screens in the start-game flow. Pick Story, Game settings, Connect Tower, and party pick stay the earlier screens.
- [ ] AREA-046: closed before coding for this slice. Card status on main is `open`. The opening reuses the talking avatar, the panning still, and the motion still. It does not add a visual kind.
