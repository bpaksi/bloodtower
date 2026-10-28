Keep this a checklist; do not write a second design doc.

# Brief: C1 Step 10 — Host/startup — designed gameplay sequence (AREA-077)

## Meta

- Plan: C1 (engine core), after Step 9 host switch-over. Unblocks G-C1.
- Step: 10
- Owner: Gamewright (design). Wright implements after this brief merges and Warden completes the completeness review.
- Related AREA/docs: AREA-077; `plans/C1-engine-core.md` Steps 6, 8, and 9; Bob lock 2026-10-24 via Wright/Code.
- In scope: designed startup with the tower optional; choose story; claim party; setup board; Begin; move; every building with Leave only; Quit story; Done for tonight.
- Out of scope: events and encounter play.

## Cutover

Cutover: N

- Host and startup wiring on the core path. R1 was already removed in Step 9. This step renames nothing and deletes nothing.

## Survival invariants

Continue, restore, and restart must keep:

- [ ] Session autosave (same Continue behavior as Step 9 on main: checkpoint reload, offers rebuilt, a walk after Continue).
- [ ] Board graph.
- [ ] Hero claims and group positions.
- [ ] Moves left and the day.
- [ ] Seed (kept, and not shown).
- [ ] Tower session state under the DEC-155 slice rule: a drop pauses only after this session had connected a tower. A session that never connected stays unpaused for a missing tower, including after Continue.

## Done-when (e2e)

Tower powered off is the required path. A second path covers an optional connect.

- [ ] Run: cold start, Story board plus one iPad, tower powered off and never connected. From Splash, skip tower connect and calibrate. Expect: the player path is Splash, then Pick Story. Pick Story and Begin are reachable with no tower connection. The main path is the designed splash and setup screens. A debug-only or bare tower-connect lobby is not the only way forward.
- [ ] Run: on Pick Story choose Proving Grounds (`packs/test`, title "Proving Grounds"). Claim the party (hero-a, hero-b, hero-c, hero-d). Finish board setup. Press Begin. Expect: `claim-heroes` greys out a claimed hero on a second iPad (DEC-098). After Begin the four heroes are each alone at their kingdom citadel (N, E, S, W). No split or join control is offered (DEC-223).
- [ ] Run: after Begin, read the Story board and both iPads during a move offer. Expect: the Story board shows the top band (health and purse, chapter, "Day N", acting group, moves left) and a waiting pulse that names who is choosing (UI-028, UI-031). iPads show text and icon controls only: no place still and no story art (DEC-201). Each iPad has a top bar with Back, Replay, and Menu (UI-032).
- [ ] Run: on the acting iPad, take the day's move roll and walk one group. Expect: the move total is an integer from 2 to 8 (2d4, floor 2) and no modifier is applied (DEC-224). Spaces show their printed names. A kingdom named to players reads Arisilon (N), Brynthia (E), Durnin (S), or Zenon (W). Walk only spaces the drafted graph already connects.
- [ ] Run: from the move map, Enter one Village, one Bazaar, one Citadel, and one Sanctuary. Expect: Enter opens that place. The only building action is Leave. Leave returns to the move map. Enter and Leave do not spend a move. From a building space the map still offers a walk to an adjacent space without Enter (DEC-220). No encounter or event screen is required to finish the path.
- [ ] Run: on an iPad open Menu and press Quit story. Expect: the session screen offers New game and Done for tonight only. Done for tonight reaches goodbye and the session ends (DEC-218, DEC-219, SCR-021 slice).
- [ ] Run: two iPads press the same open shared offer together. Expect: the first press wins and the other offer closes. A private line, if the view has one, appears only on the iPad that holds that hero.
- [ ] Run: after a walk, restart the host on the same autosave and press Continue. Expect: group position, moves left, day, hero claims, and seed match the game from before the restart. The group can walk again. The game stays in play, because this session never connected a tower.
- [ ] Run (optional connect): from startup, connect and calibrate, reach the move map, then drop the tower. Expect: play pauses until Reconnect or Quit story (DEC-155 slice). Menu on a never-connected session may still offer connect later, and that session does not take this pause.

## AREA / DEC checklist

- [ ] AREA-077: closed before coding for this slice. Bob 2026-10-24 (card status on main is `open`). Start, move, enter every building, Leave only, exit story, exit game. No events.
- [ ] DEC-220: closed before coding (`decided`). Enter opens the place. Leave is free. Walk-through is allowed.
- [ ] DEC-223: closed before coding (`decided`). One hero per citadel. No split or join in this slice.
- [ ] DEC-224: closed before coding (`decided`). 2d4 moves, floor 2, no modifiers.
- [ ] DEC-221: closed before coding (`decided`). Board graph is the draft on main in `packs/base`. Uncertain adjacencies may remain. Bob's workbench polish does not block this step.
- [ ] DEC-225: closed before coding (`decided`). Player-facing space names are the printed names. Data ids stay kingdom plus slug.
- [ ] DEC-226: closed before coding (`decided`). Player-facing kingdoms are Arisilon (N), Brynthia (E), Durnin (S), Zenon (W).
- [ ] DEC-098: closed before coding (`decided`). Claim heroes from the pool. A claimed hero greys out for the others.
- [ ] DEC-218: closed before coding (`decided`). Quit story ends the game as quit and lands on the session screen. The autosave stays.
- [ ] DEC-219: closed before coding (`decided`). This slice's session screen is New game and Done for tonight. Done for tonight goes to goodbye. Past games and Play again stay later.
- [ ] SCR-021: closed before coding for this slice via DEC-219. Card status on main is `proposed`. This step uses New game and Done for tonight only.
- [ ] DEC-201: closed before coding (`decided`). Place stills and story art play on the Story board only. iPads show text and icons.
- [ ] UI-028: closed before coding for this step. Card status on main is `proposed`. Bob's 2026-10-23 weekend lock shows the board during move, so the top band is required on that path.
- [ ] UI-031: closed before coding for this step. Card status on main is `proposed`. Same weekend lock: the waiting pulse is required while a group is choosing on the move board.
- [ ] UI-032: closed before coding for this step. Card status on main is `proposed`. Required for the exit path. DEC-227 (`decided`, Bob 2026-10-23): Back, Replay, and Menu on every iPad screen, greyed when they cannot be used.
- [ ] UI-033: closed before coding for this step. Card status on main is `proposed`. Required for Quit story. DEC-229 (`decided`): Menu groups are Look up, Table, and Leave. Quit story is the Leave item.
- [ ] DEC-227: closed before coding (`decided`). Slim iPad top bar: Back, Replay, Menu.
- [ ] DEC-228: closed before coding (`decided`). Back is for the acting group's iPads. Replay is for any iPad.
- [ ] DEC-229: closed before coding (`decided`). Quit story is the Leave item in the iPad Menu.
- [ ] DEC-155: closed before coding for this slice. Bob 2026-10-24 supersedes the hard rule on the `decided` card. A lost tower pauses only when this session had connected a tower and it then drops. A session that never connected does not pause for a missing tower. Menu may offer Reconnect or connect later.
- [ ] Packs: closed before coding. Host loads Proving Grounds from `packs/test` (`packsDir` after Step 9 moved `packs-v2/` to `packs/`). `tower: optional`: no cue in this slice requires the tower, and the host path completes with the tower off. Bob 2026-10-24.
