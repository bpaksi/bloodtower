Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C2 / 04-ipad-menu-close — The iPad Menu has Close

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: Low

## Checks

### EV-01 — Close is always the last item
- Requirement: the Menu dialog always ends with a button named "Close", under the three groups (DEC-707).
- Method: playwright
- How: `w1-chrome.spec.ts`, new test "the Menu ends with Close on every screen it opens from": open the Menu on join, claim-heroes, setup, play and the pause.
- Pass evidence: on each screen the last button inside `[data-menu]` has the accessible name "Close" and comes after the Leave section.
- Fails if: Close shows only on some screens, or sits above the groups.

### EV-02 — Close, a tap outside and the gear each close it
- Requirement: Close, a tap outside the dialog, and a tap on the gear each close the Menu (DEC-707).
- Method: playwright
- How: three cases with a touch context (`hasTouch: true`, no keyboard): tap Close; tap the screen outside the dialog; tap the gear.
- Pass evidence: after each tap `[data-menu]` is gone and the gear's `aria-expanded` is `false`. Tapping outside at the coordinates of an underlying actionable button sends no act (host act log length unchanged) and that button does not activate.
- Fails if: only Escape closes it (the G-C1 bug), or a tap outside goes through to a button under it.

### EV-03 — Closing sends nothing
- Requirement: closing the Menu changes nothing and sends nothing to the host (DEC-707).
- Method: unit
- How: `chromeBar.test.ts`, "closing sends no act": render `ChromeBar` with a spy `onAct`, open the Menu, close it each of the three ways.
- Pass evidence: `onAct` is never called.
- Fails if: Close is wired as an offer, or the outside tap lands on Quit story.

### EV-04 — All three groups show; unusable items greyed
- Requirement: the Menu shows Look up, Table and Leave; an item that cannot be used yet is greyed, never left out (DEC-707, DEC-229, DEC-227).
- Method: unit
- How: `chromeBar.test.ts`, "greys what it cannot offer": render with no `quit` and no `connect` offer.
- Pass evidence: headings "Look up", "Table", "Leave" in that order; "Save and quit" is a `disabled` button with the reason "Only in a game."; "Tower" shows and is `disabled` with the reason "The tower is connected."; each disabled row is greyed (`.bt-row--disabled`, `aria-disabled="true"`, opacity .5) and still visible; Close is enabled.
- Fails if: Save and quit is replaced by the text "Quit story is not offered." (today's build), or a group is left out; or a disabled item is hidden, not greyed, or has a reason other than its listed text.

### EV-05 — Screenshot matches the mockup
- Requirement: the Menu layout (UI-033, DEC-707; mockup).
- Method: screenshot
- How: iPad portrait 768×1024 only (the approved mockup is portrait only; no landscape check); DOM checks per EV-08 to EV-10 replace the side-by-side compare.
- Pass evidence: one portrait screenshot attached for review against ./mockup.html (M "Toolbar (closed)", "Gear list: in play", "Gear list: before Begin (join/claim)" (#s=5), "Look up empty", "Confirm: Save and quit"); EV-08–EV-10 are the gate. The three groups centred, Close last and full width, the bottom bar still visible under the scrim.
- Fails if: Close is missing or the dialog covers the bottom bar.

### EV-06 — Quit story still works from the Menu
- Requirement: Quit story stays the Leave item and asks to confirm (DEC-229, DEC-230).
- Method: playwright
- How: the existing quit path in `area-077.spec.ts` on the PR head.
- Pass evidence: passes unchanged.
- Fails if: the new outside-tap handler swallows the Quit story press.

### EV-07 — Escape still closes
- Requirement: the Menu closes without acting (P:20 "two more ways").
- Method: playwright
- How: open Menu, press Escape.
- Pass evidence: `[data-menu]` gone, gear `aria-expanded="false"`; no act sent.
- Fails if: the Menu stays open or an act is sent.

### EV-08 — Gear list matches mockup (M "Gear list: in play")
- Requirement: the open Menu matches the approved mockup.
- Method: playwright
- How: (iPad portrait 768×1024, in play with the tower connected) open the Menu.
- Pass evidence: inside `[data-menu]`, in DOM order (exact names, no number prefix; any "N · " prefix in the mockup is mockup-only): label "Look up" with items "Current party", "Look up"; label "Table" with "Game board setup", "Volume", "Split party", "Use a potion or item", "Change who holds whom", "Join another iPad", "Tower", "Pause/Resume"; label "Leave" with "Save and quit"; a version line matching `/^v\d+\.\d+\.\d+/`; then the last button "Close". "Tower" is disabled with the reason "The tower is connected."; "Split party" and "Use a potion or item" are disabled with the reason "C3+" (C2 build). Item 4 is one button whose label toggles: it reads "Split party" while the party is together (always so in C2) and "Rejoin party" while it is split; there is never a separate "Rejoin party" item. The gear stays visible (`elementFromPoint` at the gear centre returns the gear or the scrim, not the dialog).
- Fails if: any group/item is missing, an unusable item is absent instead of disabled, or Close is not last.

### EV-09 — Before Begin, game items are greyed with a reason (M "Gear list: before Begin (join/claim)", #s=5)
- Requirement: with no game yet, the groups still show and game-only items are greyed with a reason (DEC-227).
- Method: playwright
- How: open the Menu on the join/claim screen (before Begin).
- Pass evidence: the Look up heading renders; "Current party" is disabled with the reason "Only in a game." and its row is greyed (`.bt-row--disabled`, `aria-disabled="true"`, opacity .5) and still visible; "Look up" is enabled; "Pause/Resume" is disabled with the reason "Only in a game."; "Save and quit" is disabled with "Only in a game."; "Tower" is enabled with no reason line; Close is last.
- Fails if: a group or item is hidden, or a disabled item has no reason; or a disabled item is hidden, not greyed, or has a reason other than its listed text.

### EV-10 — Save and quit confirm (M "Confirm: Save and quit")
- Requirement: Save and quit asks first (DEC-230).
- Method: playwright
- How: Menu → Save and quit, then Back.
- Pass evidence: a confirm titled "Save and quit" with line "Are you sure?" and exactly two buttons "Save and quit" (primary) and "Back"; Back returns to the open Menu and sends no act.
- Fails if: a third button, or Back sends an act or closes the Menu.

### EV-11 — The toolbar is on every iPad screen
- Requirement: every iPad screen has the bottom toolbar with "?" at the left end and the gear at the right end (Bob 2026-10-31 10:37 AM ET; Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: (iPad portrait 768×1024) walk the C2 e2e path and stop on every iPad screen and state: join, claim, waiting, Enter steps (05 states 1–6), Pick story 7a/7b/7c, Story settings, base board setup, in play, paused, tower lost, piece check, glyphs-facing, session screen, game stats, session over.
- Pass evidence: on each stop, `footer.bt-bar--bottom` is visible inside the viewport; its first control is "?" and its last is the gear; nothing in the iPad body covers them.
- Fails if: any screen or state lacks the toolbar, "?" or the gear.

### EV-12 — Gear actions open on the Story board and pause the game
- Requirement: an enabled gear item starts on the iPad and its UI shows on the Story board; the game pauses while the panel is open and resumes on Done (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: (board 1920×1080 + iPad 768×1024, in play) for each enabled item in turn (Current party, Game board setup, Volume, Look up, Change who holds whom, Join another iPad), open it from the gear, then press Done.
- Pass evidence: while open, the iPad body shows "See the Story board", the panel's pick buttons when it needs a choice (Volume: "Volume 0", "Volume 1", "Volume 2", "Keep", "Try another"), and Done (Back only where the panel has a step back); the board shows `[data-panel="<item>"]` with 0 `button` elements (DEC-278) and mirrors each iPad pick within 500 ms (`[data-picked]` matches the pressed button); (resolved Q-GEAR-1 (a); Bob approved Q-GEAR-1 (a), 2026-10-31 6:13–6:14 PM ET); the host reports `paused: true`. After Done the panel is gone, the iPad is back on its screen and `paused: false`. Each item also does its job:
  - Current party: the board panel lists every hero with HP, gold, items, corruptions and holder, matching the host state.
  - Game board setup: the board shows the setup steps and the piece check re-runs (the C2 feature 11 flow; the host logs a new piece-check run).
  - Join another iPad: the board shows a QR code and the join URL, and the URL matches the host's join URL.
  - Look up: the board shows the rules/card list; picking one card on the iPad opens that card on the board.
  - Change who holds whom: after a swap on the iPad and Done, the host's holdings show the new holder, and it is still the new holder after a host restart and Continue.
  - Volume: after picking a level and Keep, the host reports the new volume level, and it is still that level after the panel closes and reopens.
- Fails if: the panel shows on the iPad, the game runs while a panel is open, Done does not resume, or any item opens but its outcome above is missing.

### EV-13 — The happy path never needs the Menu
- Requirement: the happy path uses only the iPad body's flow buttons; exceptions go through the gear (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: run the C2 happy path (join → claim → Enter → Pick story → Enable sound → Volume Keep → settings → Begin → base board setup → day one) with Menu opens counted.
- Pass evidence: the run ends in play with Menu open count 0 and help open count 0.
- Fails if: any step can only be reached through the gear or help.

### EV-14 — A disabled item shows its reason
- Requirement: an item is enabled only when it works now; a disabled item shows a one-line reason (DEC-227; Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: (unit (`chromeBar.test.ts`) + playwright) render the Menu in play with the tower connected in a C2 build; then open the Menu on the session screen with no tower connected.
- Pass evidence: every `disabled` item has exactly one `[data-reason]` line: "Split party" and "Use a potion or item" read "C3+"; "Tower" reads "The tower is connected."; on the session screen "Look up" and "Pause/Resume" each read "Only in a game." and "Tower" is enabled with no reason line; each disabled row is greyed (`.bt-row--disabled`, `aria-disabled="true"`, opacity .5) and still visible; enabled items have no reason line and no `.bt-row--disabled`.
- Fails if: a disabled item has no reason, or an enabled item is greyed; or a disabled item is hidden, not greyed, or has a reason other than its listed text.

### EV-15 — First press wins across iPads
- Requirement: two iPads pressing a gear item open one panel (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: (two iPads) both iPads press Volume within 50 ms.
- Pass evidence: one `[data-panel="volume"]` on the board; the host logs one open; the other iPad's Menu shows Volume disabled with the reason "Open on another iPad."
- Fails if: two panels, two opens, or no reason on the second iPad.

### EV-16 — "?" help matches the current screen
- Requirement: "?" opens a help sheet on the iPad for the current screen; Close returns to the same screen; help does not pause and sends nothing (Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: on each stop of EV-11, press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` equals the screen's id and its text is exactly that screen's Loremaster help line (screen-spec Help lines table, 2026-10-31; e.g. on the tower choice: "Tap Connect Tower to play with the tower, or Play without Tower for tonight."); the host sends nothing and `paused` is unchanged; after Close the same screen and state show.
- Fails if: help is missing on any screen, shows another screen's text, pauses the game or changes screen.

## Survival evals (one per survival invariant in plan.md)

### EV-17 — The Menu starts closed after Continue
- Requirement: a reload or Continue starts with the Menu closed.
- Method: playwright
- How: `w1-chrome.spec.ts` "a held hero, the Menu and a restart survive Continue", extended: open the Menu, restart the host, Continue.
- Pass evidence: `[data-menu]` is absent after Continue and the gear is the only Menu control visible (M "Toolbar (closed)"); the held hero is unchanged.
- Fails if: Menu state is stored and reopens.

### EV-18 — A gear panel survives a restart closed, with items recomputed
- Requirement: a panel open at a restart comes back closed, the game not paused, the toolbar on every iPad and every item's enabled state recomputed.
- Method: playwright
- How: open Volume from the gear (panel on the board), restart the host, Continue.
- Pass evidence: no `[data-panel]` on the board; `paused: false`; every iPad shows the toolbar with "?" and the gear; opening the Menu shows the same enabled and disabled items, with the same reasons, as before the restart.
- Fails if: the panel reopens, the game stays paused, the toolbar is missing, or item states are stale.

## Assumptions surfaced

- "Greyed, never left out" (DEC-227) means Quit story shows as a disabled button when it is not offered, instead of today's sentence → DEC-707, DEC-227.
