# Screen spec: C2/04: The iPad toolbar, the gear Menu and help
Gamewright, 2026-10-31. Design only. Story copy and voiced words: Loremaster fills every [COPY: ...]. Source of truth for the iPad toolbar, the gear Menu and help (C2 and C3).

> Bob, 2026-10-31 10:37 AM ET: "I iPad screen lost the toolbar at the bottom. On the toolbar is a "setting" (gear). This from here we need options to see current party, game board setup, volume, split party. use potions, .... All UI for these are done on the Story board, but it is started from the iPad settings. I want the happy path to be easy for the players. Exceptions will go through menu"

## Purpose
The happy path stays easy: the iPad body shows only the current step and its flow buttons. Every exception starts from the gear on the bottom toolbar, and its UI shows on the Story board (GC1-04; Bob 2026-10-31 10:37 AM ET).

## Rules
- The bottom toolbar is back on every iPad screen, with the gear (Menu) at its right. The toolbar is iPad chrome: it is not a body button and does not count against "one step, one primary button" (SCR-016).
- The HUD-only iPad lock stays: on the happy path the iPad body shows only the HUD (the current step's line) and its flow buttons. Nothing exceptional sits on the happy path; every exception goes through the gear.
- Each gear action starts on the iPad. The Story board shows the panel's full UI and only displays it (DEC-278 kept). Any choice in the panel is made on the iPad as a simple list of buttons, and the board mirrors each press. The iPad shows "See the Story board", plus the pick buttons when the panel needs a choice, plus Done/Back (Bob approved Q-GEAR-1 (a), 2026-10-31 6:13–6:14 PM ET).
- An item is enabled only when it works right now. A disabled item shows its reason in one line under it (Bob approved 2026-10-31 6:14–6:15 PM ET: greyed out with a one-line reason).
- The game pauses while a Story board panel is open and resumes on Done.
- First press wins across iPads: a second iPad's press on the same item or panel while one is open changes nothing.
- Help: a "?" button at the left end of the bottom toolbar, on every iPad screen. It opens a short help sheet on the iPad itself for the current screen: what the screen is and what to do next, from that screen's Loremaster help line (2026-10-31; the Help lines table in C2 feature 04's spec). Close returns to the same screen, unchanged. It is not a gear item, sends nothing to the host, and the game does not pause (Gamewright design, parent-approved 2026-10-31) (Bob approved the help design as drafted, 2026-10-31 6:14–6:15 PM ET).
- Next-only iPad screens are kept to a minimum (Bob 2026-10-31 10:38 AM ET): a screen whose only action is Next is merged into the next screen or auto-advances when its narration or cue ends (4 s when it has no audio). Next stays only where a player must confirm the physical board.
- Auto-advance (4 s): none in C2.

## States
- Toolbar (every iPad screen, UI-032): "?" at the left end, the gear (Menu) at the right end. Default after reload or Continue: Menu closed, help closed.
- Open: centered dialog (UI-033), three groups (DEC-229) holding the gear list (Bob approved 2026-10-31 10:38):
  - Look up: 1 Current party; 6 Look up (rules or a card).
  - Table: 2 Game board setup; 3 Volume; 4 Split party (one item; shows "Rejoin party" when split); 5 Use a potion or item; 7 Change who holds whom; 8 Join another iPad; 9 Tower (reconnect or play without it); Pause/Resume (kept from DEC-707; acts at once, no panel).
  - Leave: 10 Save and quit (the existing quit flow; confirm "Save and quit").
  - Version + debug toggle line, then "Close" last (DEC-707).
- Item names are exact, with no number prefix (the numbers in this list and any "N · " in the mockup are reference only).
- Disabled items: greyed, never hidden (DEC-227), with a one-line reason under each, e.g. "Only in a game.", "The tower is connected.", "C3+" (items that need C3 features in a C2 build: Split party, Use a potion or item).
- Exact reasons: Save and quit (no game to quit) "Only in a game."; Tower (the tower is connected) "The tower is connected."; Current party before Begin "Only in a game."; Look up (on the session screen, between games) "Only in a game."; Pause/Resume (before Begin and on the session screen) "Only in a game." (both greyed there); Tower is enabled on the session screen when no tower is connected; Split party, Use a potion or item in a C2 build "C3+"; a panel open on another iPad "Open on another iPad."
- Panel open: the iPad shows "See the Story board", the panel's pick buttons as a simple list when it needs a choice (e.g. Volume 0/1/2, Keep, Try another; a hero, then an item), and Done (Back where there is a step back); the Story board shows the panel's full UI, display only, and mirrors each iPad pick (Bob approved Q-GEAR-1 (a), 2026-10-31 6:13–6:14 PM ET); the game is paused until Done. Another iPad that opens the Menu sees the panel's item disabled with the reason "Open on another iPad."
- Confirm sub-state for table-wide items (DEC-230), e.g. Save and quit; the confirm stays on the iPad.
- Help open: a sheet on the iPad with the current screen's help line (Help lines below) and Close.

## The gear list (Bob approved 2026-10-31 10:38)
1. Current party: heroes, HP, gold, items, corruptions and who holds whom.
2. Game board setup: shows the physical setup again and re-runs the piece check.
3. Volume: the Volume 0/1/2 step with Keep/Try another.
4. Split party: one item whose label toggles. It reads "Split party" while the party is together and "Rejoin party" while it is split (Gamewright pick).
5. Use a potion or item: pick the hero, then the item.
6. Look up: rules or a card.
7. Change who holds whom.
8. Join another iPad: shows the QR code.
9. Tower: reconnect or play without it.
10. Save and quit: the existing Quit flow (the "Save and quit" confirm, DEC-230).

## Help lines (Loremaster 2026-10-31; shown by "?" for the screen with that id)
| Screen id | Help line |
|---|---|
| join | Scan the code with each iPad to join the table. |
| claim | Tap Pick for the hero this iPad speaks for at the table. |
| waiting | The table is getting ready. This iPad will move on by itself. |
| base-board-setup | Lay out the board and pieces as shown. Tap Board is set up when the table is ready. |
| tower-choice | Tap Connect Tower to play with the tower, or Play without Tower for tonight. |
| connecting | The app is reaching the tower. Keep it switched on and close by. |
| tower-failed | The tower didn't answer. Check it's on, then tap Connect Tower or Play without Tower. |
| enable-sound | Tap Enable sound so this iPad can play the story's voice and sound. |
| volume | Set how loud the tower is. Press a volume to hear it, then tap Keep. |
| pick-story | Tap the story you want to play tonight. |
| story-settings | Choose the game length and options for tonight's story. |
| play | The game is on. Follow the prompts on this iPad and the Story board. |
| paused | The game is paused and nothing moves. Tap Resume to play on. |
| tower-lost | The tower stopped answering and the game waits. Tap Reconnect, or Go on without. |
| piece-check | Set the pieces back where the saved game had them. Tap Done after each step. |
| glyphs-facing | Tell the app which glyphs you can see on the tower. |
| session-screen | Your saved games are here. Tap Continue for the last one, or New game. |
| game-stats | Here's how tonight went. Rate it if you like, then tap Play again. |
| session-over | The game is over and saved. You can close the app for tonight. |
| day-on-the-board (C3) | A new day begins. Move your heroes, then choose where to go. |
| event-scene (C3) | Something happened on the road. Make a choice if one is shown; the scene moves on by itself. |
| building-menu (C3) | Choose what to do in this building, or Leave. |
| quest-scene (C3) | A quest is in front of you. Pick one of its options. |
| chapter-card (C3) | This is your chapter goal. Finish it before the days run out. |
| outcome-scene (C3) | The chapter is over. See how it ended; the game stats come next. |

## Player actions
- Tap gear: open. Tap gear again, tap outside, Close or Escape: close. Closing sends nothing (DEC-707).
- Tap an enabled item: its panel opens on the Story board (table-wide ones confirm first). Picks are iPad buttons; the board mirrors them. Done on the iPad closes the panel and resumes the game.
- Tap "?": help for this screen; Close returns.

## Mechanics
DEC-707, DEC-229, DEC-227, DEC-230, UI-033, UI-032, UI-018 (replaced), SCR-016, DEC-278 (kept: the board only displays).

## What happens next
Close or Escape → the iPad screen under it, unchanged. Done → the screen under it, game resumed. Back on the Save and quit confirm → the open Menu. Save and quit confirmed → session screen (DEC-218, feature 06).

## Open questions
- Resolved: the Menu keeps Look up, Join another iPad and Change who holds whom (Bob 2026-10-31); the gear list above (Bob approved 2026-10-31 10:38). Portrait only.
- Resolved Q-GEAR-1 (option a): picks inside a gear panel (volume, split, potion: hero then item) are made on the iPad with simple buttons; the Story board shows the full panel and mirrors them, display only, so DEC-278 is kept (Bob approved Q-GEAR-1 (a), 2026-10-31 6:13–6:14 PM ET).
- Resolved Q-GEAR-2 (option a): the old Look up items are folded into the gear list: Hero panel → Current party, Items → Use a potion or item, Roll → Look up (rules or a card) (Bob approved Q-GEAR-2 (a), 2026-10-31 6:13–6:14 PM ET).
- Which items are enabled in each C2 state: Pause/Resume, Current party, Use a potion or item and Split party only in a game; Tower only when the tower is lost or the session plays without it; Join another iPad always; Game board setup and Volume always (Gamewright default).
