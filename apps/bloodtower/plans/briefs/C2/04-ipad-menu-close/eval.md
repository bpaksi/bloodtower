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
- Pass evidence: headings "Look up", "Table", "Leave" in that order; "Quit story" is a `disabled` button; "Reconnect tower" shows and is `disabled`; Close is enabled.
- Fails if: Quit story is replaced by the text "Quit story is not offered." (today's build), or a group is left out.

### EV-05 — Screenshot matches the mockup
- Requirement: the Menu layout (UI-033, DEC-707; mockup).
- Method: screenshot
- How: iPad portrait 768×1024 only (the approved mockup is portrait only; no landscape check); DOM checks per EV-08 to EV-10 replace the side-by-side compare.
- Pass evidence: both pairs attached; the three groups centred, Close last and full width, the bottom bar still visible under the scrim.
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

### EV-08 — Menu open matches mockup (M "Menu open")
- Requirement: the open Menu matches the approved mockup.
- Method: playwright, iPad portrait 768×1024, in play with the tower connected
- How: open the Menu.
- Pass evidence: inside `[data-menu]`, in DOM order: label "Look up" with items "Hero panel", "Roll", "Items"; label "Table" with "Pause/Resume", "Reconnect tower", "Join another iPad", "Change who holds whom"; label "Leave" with "Quit story"; a version line matching `/^v\d+\.\d+\.\d+/`; then the last button "Close". "Reconnect tower" is disabled (tower in play). The gear stays visible (`elementFromPoint` at the gear centre returns the gear or the scrim, not the dialog).
- Fails if: any group/item is missing, an unusable item is absent instead of disabled, or Close is not last.

### EV-09 — Look up empty (M "Look up empty")
- Requirement: with nothing to look up the group still shows.
- Method: playwright
- How: open the Menu on a screen with nothing to look up.
- Pass evidence: the Look up heading renders with the text "Nothing to look up."; Close is last.
- Fails if: the group is hidden.

### EV-10 — Quit story confirm (M "Confirm: Quit story")
- Requirement: Quit story asks first (DEC-230).
- Method: playwright
- How: Menu → Quit story, then Back.
- Pass evidence: a confirm titled "Quit story" with line "Are you sure?" and exactly two buttons "Quit story" (primary) and "Back"; Back returns to the open Menu and sends no act.
- Fails if: a third button, or Back sends an act or closes the Menu.

### EV-11 — Closed after Continue (M "Closed")
- Requirement: the Menu is closed after reload or Continue.
- Method: playwright
- How: Continue a saved game.
- Pass evidence: the gear is the only Menu control visible; `[data-menu]` absent.
- Fails if: the Menu opens on its own.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — The Menu starts closed after Continue
- Requirement: a reload or Continue starts with the Menu closed.
- Method: playwright
- How: `w1-chrome.spec.ts` "a held hero, the Menu and a restart survive Continue", extended: open the Menu, restart the host, Continue.
- Pass evidence: `[data-menu]` is absent after Continue; the held hero is unchanged.
- Fails if: Menu state is stored and reopens.

## Assumptions surfaced

- "Greyed, never left out" (DEC-227) means Quit story shows as a disabled button when it is not offered, instead of today's sentence → DEC-707, DEC-227.
