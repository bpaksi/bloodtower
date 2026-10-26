Keep this a checklist; do not write a second design doc.

# Brief: W7 Step 2 — Compass move map

## Meta

- Plan: Weekend, amending W7. Bob locked the compass presentation on 2026-10-26 via Illusionist, Blood Tower room. `W7-step-1.md` stays historical. This file supersedes only the iPad move-map presentation in that file's Done-when. Prompt ids, survival, and the Story board move frame stay as W7-step-1.
- Step: 2 (file `W7-step-2.md`)
- Owner: Gamewright (design). This is the build-lane brief. Warden reviews it for completeness. After that review passes and this file is on main, Wright may hand it to Anvil. Anvil implements only after that handoff.
- Related AREA/docs: AREA-077; UI-023; DEC-233; DEC-234; DEC-235; DEC-236; UI-028; UI-031; DEC-189; DEC-201; DEC-220; MEC-035; DEC-035; DEC-149; `docs/ui-mocks/ui-023-compass/` (interactive UI-023 HTML, the move-pick mock; may land in a separate PR); `apps/bloodtower/src/e2e/tests/area-077.spec.ts`; `apps/bloodtower/src/e2e/tests/w7-move-map.spec.ts`; `packs/base/board/spaces.json`. Playwright projects in `apps/bloodtower/src/e2e/playwright.config.ts`: `phone` (390×844), `ipad` (820×1180), `desktop` (1440×900, the Story board at `/board`).
- In scope: the acting iPad's move map, drawn as the compass cross (UI-023) inside the theme B engraved iPad chrome (DEC-233). Eight fixed neighbour slots. The walk, Enter, Leave, and End turn actions already on screen `play`.
- Out of scope: the Story board compass panel (DEC-238, DEC-241, UI-034). IDEA-032 slot-filling completeness. River tokens, the tower-as-object slot, and the board-map-tool tray. W1 chrome rebuild. W2 through W6 and W8. Encounter play. A new route. Editing `W7-step-1.md`.

## Cutover

Cutover: N

- Walk, Enter, Leave, and End turn stay on screen `play`. Prompt ids stay `walk--<group>--<space>`, `enter--<group>--<space>`, `leave--<group>`, and `end-turn--<group>`. No route, screen id, prompt id, or session record is renamed or removed. Same as W7-step-1.

## Survival invariants

Continue, restore, and restart must keep (same as W7-step-1):

- [ ] The session, as today on main: the autosave, Continue, and a restart that reloads the checkpoint.
- [ ] Where each group stands, which group is acting, and whether that group is inside a place.
- [ ] Moves left, the day, and the move roll already taken.
- [ ] Hero picks (who is held on which iPad) and the story (Proving Grounds).
- [ ] The seed (kept, and not shown) and the board graph, including printed space names.
- [ ] Tower connect state, including a session that never connected. A move, Enter, and Leave do not connect, calibrate, or retry a physical action. A session that never connected stays unpaused.

## Done-when (e2e)

Tower powered off is the path. Walk Proving Grounds the way `area-077.spec.ts` does: `skipTowerToClaim`, hold hero-a through hero-d, `finishSetup`, then take the move roll. The acting iPad is the page that holds the acting hero. Run the iPad checks on `phone` and `ipad`. Run the Story board checks on `desktop` at `/board`. One tap remains one adjacent space and spends 1 move (MEC-035). This step adds no route picker and no control for a space the group cannot step to.

Visual source: `docs/ui-mocks/ui-023-compass/`. Match that HTML when it is on the branch Anvil builds from. The locks in this list hold if that folder is still in a separate PR. Where the mock and this brief disagree, this brief wins.

- [ ] Run: read adjacency from the board graph the engine already walks. One list per space. When the loaded space has `neighbours`, walk `neighbours[].to` and read `neighbours[].slot` (null is valid). Otherwise walk `adjacent` in authored order and treat every slot as null. `packs/base/board/spaces.json` is that second shape today. Do not merge the two lists and do not add edges. Do not invent an angle or a bearing. Slot ids, data only, clockwise from the tower-up point: N, NE, E, SE, S, SW, W, NW. A neighbour with `slot` set occupies that slot. When every open adjacent has a null or absent slot, place them in list order into empty slots N then clockwise through NW. When some slots are set, those neighbours keep their slots and null-slot neighbours fill the remaining empty slots in list order, skipping taken slots. An empty slot is not a control. Two neighbours with the same `slot` fail the check; the game does not pick a winner (DEC-236) and does not draw a list for the loser.
- [ ] Run: after the move roll, on the acting iPad. Expect: `data-screen="play"`. `[data-move-map]` is a compass cross. `[data-you]` is the center and shows the printed name of the space the group stands on, marked YOU. `[data-tower-up]` sits above that center (tower-up orientation). The cross has eight fixed positions, `[data-slot]` values N, NE, E, SE, S, SW, W, NW, in that clockwise order from the top. No text inside the ring is only N, NE, E, SE, S, SW, W, or NW. Each open neighbour is one control: `button[data-action-id="walk"]`, or an equivalent control, with `data-prompt-id="walk--<group>--<spaceId>"`, and its visible label is that space's printed name (DEC-225). The count of those controls equals the open-adjacent count for this space. A space that is not adjacent is absent. `[data-move-map]` has no "Also adjacent" region and no ninth walk. Moves left are shown. `button[data-action-id="end-turn"]` reads End turn and its prompt id is `end-turn--<group>`. On a building space the map also offers `Enter <Building>` (`data-action-id="enter"`, prompt id `enter--<group>--<space>`). Enter and End turn are not compass slots. An SVG compass inside `[data-move-map]` is the presentation. `img` and `canvas` inside `[data-move-map]` are absent. The iPad draws no mini and no board picture. The minis move on the physical board. `[data-ipad-corners="theme-b"]` is present, with `[data-ipad-corner]` tl, tr, bl, and br (DEC-233). This step does not replace that asset.
- [ ] Run: a neighbour the loaded data marks blocked or story-blocked. Expect: its slot stays visible and its control is disabled. The Proving Grounds graph has no such mark; the demo path does not invent one. A frontier draws only when the loaded space already names one. This step adds no frontier data.
- [ ] Run: on that map, tap one adjacent walk. Expect: same as W7-step-1. The group's space becomes that space, and moves left drops by 1. End turn stays offered while moves remain. Press End turn with moves left. Expect: that group's move map closes (DEC-149). The leftover moves are absent from the next offer. They are not added to the next group's roll, and they do not come back as rest. The next offer is the next group's move roll, or the skull prompt when this group was the last one this day. Leave that skull press as it is on main.
- [ ] Run: while `[data-move-map]` is up and the group is outside (`data-inside="false"`), read `/board`. Expect: same as W7-step-1. `data-board-mode="play"`. The edge band (UI-028) is the top band: health, purse, Proving Grounds, `Day N`, acting group, moves left. Unknown health and purse read unavailable, never 0. `[data-waiting]` (UI-031) is the choosing line. No map, no map wash, no hero markers (DEC-189), no `[data-still]`, no place `img`. No Story board compass panel (no UI-034, no DEC-238 panel). The text roster may stay.
- [ ] Run: the same board with `prefers-reduced-motion: reduce`. Expect: same as W7-step-1. `[data-waiting]` stays visible and its computed `animation-name` is `none`. With motion allowed, `animation-name` is `bt-waiting-pulse`.
- [ ] Run: while a move choice or a Leave choice is open, `[data-waiting]` is visible. After that choice closes and nobody is choosing, `[data-waiting]` is absent. The edge band stays. Same as W7-step-1. This step does not open a waiting dialog in place of the line.
- [ ] Run: from the move map, Enter one Village, one Bazaar, one Citadel, and one Sanctuary. Expect: same as W7-step-1 (DEC-201, DEC-220). Enter spends no move. `/board` shows that place's still and the caption `placeCaption.ts` already ships. The iPad shows no place `img` and no caption. While `data-inside="true"`, the only open place action is Leave. Walk, End turn, and `[data-move-map]` are absent. Leave spends no move and brings the compass back when moves remain. On a building space with moves left, a walk to an adjacent space is offered without Enter.
- [ ] Run: after a walk and an Enter, restart the host on the same autosave and press Continue. Expect: same as W7-step-1. The story is still Proving Grounds, the same heroes are still held, the group is still inside that place, the space, moves left, and day match, the seed matches, and the tower is still not connected. Leave returns to the compass. The game stays in play.
- [ ] Run: `area-077.spec.ts` still passes on `phone`, `ipad`, and `desktop`. Update its move-map assertions, and the flat Walk-to list plus the `img, canvas, svg` ban in `w7-move-map.spec.ts`, so they expect the compass selectors above. A board picture still fails. Keep the Quit story presses. This step may add the checks above in those files or in a sibling that uses the same host helpers. It adds no image to satisfy a check, and it does not point `/board` at an iPad chrome bar.
- [ ] Run: count open adjacents on each space the demo path stands on. Expect: 8 or fewer, and every one of them is a slot control. `packs/base/board/spaces.json` maxes at 5 (checked 2026-10-26). A space with more than 8 open adjacents and null slots fails this Done-when. Truncation to the first 8 is not a pass, and an overflow region is not a pass. Do not add an overflowing fixture. Owner: Bob assigns slots in the board-map tool before that space is playable. Anvil does not ship the first 8 unless Bob confirms, and this brief does not confirm it.

## AREA / DEC checklist

- [ ] UI-023: closed before coding for this step. Card status on main is `proposed`. The acting iPad shows the compass cross from `docs/ui-mocks/ui-023-compass/`: YOU at the center, tower-up above the ring, eight neighbour slots, moves left, and End turn. At a building it offers Enter. The minis move on the physical board.
- [ ] DEC-234: closed before coding (`decided`, Bob 2026-10-25). The move map is the compass cross. The group's space sits in the middle. Neighbours sit in the eight fixed slots around it.
- [ ] DEC-235: closed before coding for the eight slots (`decided`, Bob 2026-10-25). The cross always has the eight points. Bob, 2026-10-26, supersedes the short list under the cross for this product UI. This step has no overflow UI. The card's list stays out of the iPad until a later ruling says otherwise.
- [ ] DEC-236: closed before coding (`decided`). The game does not invent an angle and does not settle a contested slot. A set `slot` is the one Bob authored. Null slots use the list order in Done-when. IDEA-032 completeness stays deferred.
- [ ] DEC-233: closed before coding (`decided`, Bob 2026-10-25, theme B). The acting iPad keeps the engraved manuscript corners while the compass is up. This step does not redraw them.
- [ ] DEC-035: closed before coding for this slice (`decided`). The tap records the space the minis now occupy. This step's tap is the adjacent space just walked, and it spends 1 move. An event after the tap stays out of this step.
- [ ] MEC-035: closed before coding for this slice (`decided`). One pass is one space. This step adds no multi-space landing control.
- [ ] DEC-149: closed before coding (`decided`). Moves left at the end of the group's turn are lost. They do not carry to the next day, and they do not become rest.
- [ ] DEC-189: closed before coding (`decided`, Bob 2026-10-23, wash and markers Bob 2026-10-24). The Story board shows no map, no map wash, and no hero markers. The physical board and the minis are the only map.
- [ ] UI-028: closed before coding for this step. Card status on main is `proposed`. During a move the Story board shows the edge band, same as W7-step-1. Unknown health and purse read unavailable.
- [ ] UI-031: closed before coding for this step. Card status on main is `proposed`. During a move the Story board shows one waiting line, same as W7-step-1, including reduced motion.
- [ ] DEC-201: closed before coding (`decided`). The place still and its caption play on the Story board only. The iPad shows the compass, text, and icon controls.
- [ ] DEC-220: closed before coding (`decided`). Enter opens the place. Leave is free. A walk through a building space is allowed. Enter and Leave spend no move.
- [ ] AREA-077: closed before coding for this slice. Card status on main is `open`. Bob 2026-10-23, weekend pass 2026-10-25. This step is the compass presentation of the move and Enter of that slice. The only place action is Leave. No events. `area-077.spec.ts` still passes.
- [ ] DEC-225: closed before coding (`decided`). Slot labels use the printed space names. Data ids stay kingdom plus slug. Slot letters stay off the ring.
- [ ] DEC-238, DEC-241, UI-034: deferred. The Story board compass panel is not this step. Owner: a later brief, after this iPad compass is on main. During a move the board stays the edge band and the waiting line.
- [ ] IDEA-032: deferred. Slot-filling completeness is Bob's work in the board-map tool. Null slots are valid here. Owner: Bob, before any space with more than 8 unslotted neighbours is playable.
