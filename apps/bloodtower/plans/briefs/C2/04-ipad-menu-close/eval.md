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
- Pass evidence: after each tap `[data-menu]` is gone and the gear's `aria-expanded` is `false`.
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
- Pass evidence: the three headings show in that order; a "Quit story" button shows and is `disabled`; Close is enabled.
- Fails if: Quit story is replaced by the text "Quit story is not offered." (today's build), or a group is left out.

### EV-05 — Screenshot matches the mockup
- Requirement: the Menu layout (UI-033, DEC-707; mockup).
- Method: screenshot
- How: screenshot the iPad with the Menu open on play at 1024×768 landscape and 768×1024 portrait; compare side by side with ./mockup.html at the same sizes.
- Pass evidence: both pairs attached; the three groups centred, Close last and full width, the bottom bar still visible under the scrim.
- Fails if: Close is missing or the dialog covers the bottom bar.

### EV-06 — Quit story still works from the Menu
- Requirement: Quit story stays the Leave item and asks to confirm (DEC-229, DEC-230).
- Method: playwright
- How: the existing quit path in `area-077.spec.ts` on the PR head.
- Pass evidence: passes unchanged.
- Fails if: the new outside-tap handler swallows the Quit story press.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — The Menu starts closed after Continue
- Requirement: a reload or Continue starts with the Menu closed.
- Method: playwright
- How: `w1-chrome.spec.ts` "a held hero, the Menu and a restart survive Continue", extended: open the Menu, restart the host, Continue.
- Pass evidence: `[data-menu]` is absent after Continue; the held hero is unchanged.
- Fails if: Menu state is stored and reopens.

## Assumptions surfaced

- "Greyed, never left out" (DEC-227) means Quit story shows as a disabled button when it is not offered, instead of today's sentence → DEC-707, DEC-227.
