Keep this a checklist; do not write a second design doc.

# Brief: W7 Step 1 — Move around the board

## Meta

- Plan: Weekend, from `research/game-design/weekend-c1-acceptance.md` §3 "Move around the board" (Bob, Blood Tower room, 2026-10-25, on main as #218 at `570aa333`). W7 is the move step. UI-023 names it the next build after the startup polish. W1 through W6 and W8 stay out of this file.
- Step: 1
- Owner: Gamewright (design). This is the Wright build-lane brief. Warden reviews it for completeness. Wright implements only after it is merged and that review passes.
- Related AREA/docs: AREA-077; UI-023; UI-028; UI-031; DEC-189; DEC-201; DEC-220; MEC-035; `apps/bloodtower/src/e2e/tests/area-077.spec.ts`; `apps/bloodtower/src/engine/loops/session/placeCaption.ts`. Playwright projects in `apps/bloodtower/src/e2e/playwright.config.ts`: `phone` (390×844), `ipad` (820×1180), `desktop` (1440×900, the Story board at `/board`).
- In scope: the acting iPad's move map (UI-023), with the minis on the physical board. During a move, the Story board shows the edge band and the waiting line (UI-028, UI-031), and shows no map, no map wash, and no hero markers (DEC-189). Enter shows that place's still on the Story board only (DEC-201). The only place action is Leave (DEC-220, AREA-077).
- Out of scope: W1, the iPad chrome shell. W2, the landing banner, Sound on `/`, and the Connect Tower / Play without Tower copy. W3, the Pick Story carousel and Dracula. W4, Party Pick wording and hunter count. W5, setup boards and the Begin narrative. W6, Story board layer polish beyond this move frame. W8, Quit story, the session screen, and Done for tonight. Encounter play: events, battles, foe art, caravans, and any pick inside a place. The skull-drop record already on main stays as it is. This step adds no route.

## Cutover

Cutover: N

- Walk, Enter, Leave, and End turn stay on screen `play`. Prompt ids stay `walk--<group>--<space>`, `enter--<group>--<space>`, `leave--<group>`, and `end-turn--<group>`. No route, screen id, prompt id, or session record is renamed or removed.

## Survival invariants

Continue, restore, and restart must keep:

- [ ] The session, as today on main: the autosave, Continue, and a restart that reloads the checkpoint.
- [ ] Where each group stands, which group is acting, and whether that group is inside a place.
- [ ] Moves left, the day, and the move roll already taken.
- [ ] Hero picks (who is held on which iPad) and the story (Proving Grounds).
- [ ] The seed (kept, and not shown) and the board graph, including printed space names.
- [ ] Tower connect state, including a session that never connected. A move, Enter, and Leave do not connect, calibrate, or retry a physical action. A session that never connected stays unpaused.

## Done-when (e2e)

Tower powered off is the path. Walk Proving Grounds the way `area-077.spec.ts` does: `skipTowerToClaim`, hold hero-a through hero-d, `finishSetup`, then take the move roll. The acting iPad is the page that holds the acting hero. Run the iPad checks on `phone` and `ipad`. Run the Story board checks on `desktop` at `/board`. One tap remains one adjacent space and spends 1 move (MEC-035). This step adds no route picker and no control for a space the group cannot step to.

- [ ] Run: after the move roll, on the acting iPad. Expect: `data-screen="play"`. A region `[data-move-map]` holds the move controls. With moves left at least 1, each adjacent space on the drafted graph is one `button[data-action-id="walk"]` whose `data-prompt-id` is `walk--<group>--<spaceId>` and whose label contains that space's printed name (`Walk to <name>`). A space that is not adjacent is absent. `button[data-action-id="end-turn"]` reads End turn. On a building space the map also offers `Enter <Building>` (`data-action-id="enter"`). The map has no `img`. The iPad draws no mini and no board. The minis move on the physical board.
- [ ] Run: on that map, tap one adjacent walk. Expect: the group's space becomes that space, and moves left drops by 1. End turn stays offered while moves remain. Press End turn with moves left. Expect: that group's move map closes (DEC-149). The leftover moves are absent from the next offer. They are not added to the next group's roll, and they do not come back as rest. The next offer is the next group's move roll, or the skull prompt when this group was the last one this day. Leave that skull press as it is on main.
- [ ] Run: while `[data-move-map]` is up and the group is outside (`data-inside="false"`), read `/board`. Expect: `data-board-mode="play"`. `[data-band]` is visible and, with no join warning and no pause line, it is the first element in `main.bt-board`. It sits above `[data-waiting]`. The gap from the band's top to the main's top is smaller than the gap from the band's bottom to the main's bottom. The band shows health, purse, the chapter name (`[data-chapter]` is Proving Grounds), `[data-day]` matching `/^Day \d+$/`, the acting group (`[data-acting]`), and moves left (`[data-moves]`). Health and purse read unavailable, and neither reads 0. `[data-waiting]` is one line, `role="status"`, class `bt-waiting-pulse`, and its text matches `/is choosing/` and names the acting hero. The board has no `img`, no `[data-still]`, no `[data-place]`, and no element whose `src` or `data-still` is a map, a wash, or a hero mark. `packs/test` still has no `board.wash` and no `hero.*.mark`. The text roster (`data-roster`) may stay: names and printed places, with no token and no map under it. `area-077.spec.ts` may keep reading `[data-kingdom]` there after Begin.
- [ ] Run: the same board with `prefers-reduced-motion: reduce`. Expect: `[data-waiting]` stays visible and its computed `animation-name` is `none`. With motion allowed, `animation-name` is `bt-waiting-pulse`.
- [ ] Run: while a move choice or a Leave choice is open, `[data-waiting]` is visible. After that choice closes and nobody is choosing, `[data-waiting]` is absent. The edge band stays. This step does not open a waiting dialog in place of the line.
- [ ] Run: from the move map, Enter one Village, one Bazaar, one Citadel, and one Sanctuary. Expect: Enter spends no move. `/board` shows `[data-still="place.<building>"]` for `place.village`, `place.bazaar`, `place.citadel`, or `place.sanctuary`, with an `img` whose response is HTTP 200, and a `figcaption` equal to the caption `placeCaption.ts` already ships for that building. The iPad shows no `img`, and that caption is absent on the iPad. While `data-inside="true"`, the only open place action is Leave (`button[data-action-id="leave"]`, label Leave). Walk, End turn, and `[data-move-map]` are absent. No Search, Fight, Talk, event, foe, or battle control is offered. Leave spends no move, returns `data-inside` to `false`, and brings the move map back when moves remain. On a building space with moves left, a walk to an adjacent space is offered without Enter.
- [ ] Run: after a walk and an Enter, restart the host on the same autosave and press Continue. Expect: the story is still Proving Grounds, the same heroes are still held, the group is still inside that place, the space, moves left, and day match, the seed matches, and the tower is still not connected. Leave returns to the move map. The game stays in play.
- [ ] Run: `area-077.spec.ts` still passes on `phone`, `ipad`, and `desktop`. Keep its Quit story presses. This step may add the checks above in that file or in a sibling that uses the same host helpers. It adds no image to satisfy a check, and it does not point `/board` at an iPad chrome bar.

## AREA / DEC checklist

- [ ] UI-023: closed before coding for this step. Card status on main is `proposed`. The acting iPad shows the move map: spaces in reach, a tap where the minis now stand, End turn. At a building it offers Enter. The minis move on the physical board. While the map is up, the Story board shows the edge band and the waiting line.
- [ ] DEC-035: closed before coding for this slice (`decided`). The tap records the space the minis now occupy. This step's tap is the adjacent space just walked, and it spends 1 move. An event after the tap is encounter play and stays out of this step.
- [ ] MEC-035: closed before coding for this slice (`decided`). One pass is one space. This step adds no multi-space landing control.
- [ ] DEC-149: closed before coding (`decided`). Moves left at the end of the group's turn are lost. They do not carry to the next day, and they do not become rest.
- [ ] DEC-189: closed before coding (`decided`, Bob 2026-10-23, wash and markers Bob 2026-10-24). The Story board shows no map, no map wash, and no hero markers. The physical board and the minis are the only map.
- [ ] UI-028: closed before coding for this step. Card status on main is `proposed`. During a move the Story board shows the edge band: health, purse, chapter name, "Day N" with no total, acting group, and moves left. The band sits along the top (DEC-198). Unknown health and purse read unavailable.
- [ ] DEC-198: closed before coding (`decided`). The band's edge is the top. This step does not move it.
- [ ] UI-031: closed before coding for this step. Card status on main is `proposed`. During a move the Story board shows one waiting line naming who is choosing, with a slow pulse that honours reduced motion. The line is up while a choice is open.
- [ ] DEC-201: closed before coding (`decided`). The place still and its caption play on the Story board only. The iPad shows text and icon controls.
- [ ] DEC-220: closed before coding (`decided`). Enter opens the place. Leave is free. A walk through a building space is allowed. Enter and Leave spend no move.
- [ ] AREA-077: closed before coding for this slice. Card status on main is `open`. Bob 2026-10-23, weekend pass 2026-10-25. This step is the move and Enter of that slice. The only place action is Leave. No events.
- [ ] DEC-225: closed before coding (`decided`). Walk labels use the printed space names. Data ids stay kingdom plus slug.
