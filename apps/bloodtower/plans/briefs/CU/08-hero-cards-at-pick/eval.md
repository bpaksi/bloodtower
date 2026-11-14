Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 08-hero-cards-at-pick — The Story board shows hero cards during Pick

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: Low

## Checks

### EV-01 — One card per pool hero with every field
- Requirement: PT-15, design-freeze section H: hero cards on the board during Pick.
- Method: playwright
- How: `w4-party.spec.ts`, test story with 4 pool heroes; board 1920x1080 on `claim-heroes`.
- Pass evidence: four `[data-hero]` cards; each shows a portrait frame, class, fight number, hit points and a line; the class, fight and hit-point values equal the pack role and the tuning `heroes` row for that hero (for example Hero A: fighter, 3, 12), and the line equals that hero's pack `ability` (see EV-11).
- Fails if: a card lacks a field, shows a name only (today's roster), or values come from a literal in the web code.

### EV-02 — A seated hero's card greys out
- Requirement: DEC-098 grey-out stays; PT-15.
- Method: playwright
- How: one iPad presses "Pick Hero A"; read the board.
- Pass evidence: that hero's card has `data-held="true"`, reduced opacity and the words "Picked"; the others read "Open" and are full strength; "1 of N picked" matches.
- Fails if: the card does not grey, or a different hero greys.

### EV-03 — The iPad words are unchanged
- Requirement: PT-15 and DEC-232: "Pick Hero A", "N of N picked", "Who this iPad speaks for at the table" untouched.
- Method: playwright
- How: iPad 768x1024 on the Pick screen, before and after this change.
- Pass evidence: the button text, the count text and the help text equal the DEC-232 strings exactly; the iPad text content for the screen is byte-identical to main's.
- Fails if: any word on the iPad changed or a new line was added there.

### EV-04 — No card data on the iPad
- Requirement: DEC-201: no portraits or art on an iPad.
- Method: playwright
- How: on the iPad Pick screen, count `img`, `[data-portrait-frame]` and hero card fields; read the iPad view frame.
- Pass evidence: no image, no portrait, no class, fight, hit points or line on the iPad; the device view holds none of the new fields.
- Fails if: the new fields are added to the shared hero view and reach the iPad.

### EV-05 — Unknown fields read unavailable
- Requirement: root CLAUDE.md: unknown is "unavailable", never zero.
- Method: unit
- How: `CoreStoryBoard.test.ts`: a hero with no `fight` or `hitPoints`.
- Pass evidence: those fields read "unavailable"; no "0" appears for them.
- Fails if: a missing value renders as 0.

### EV-06 — The cards fit and never scroll
- Requirement: SCR-013: the board never scrolls or clips.
- Method: playwright
- How: board 1920x1080 with 4 heroes and with 6 (the largest pool in the pack schema).
- Pass evidence: every card is fully inside the viewport, the join QR is not covered, no scrollbar (`scrollHeight <= clientHeight`).
- Fails if: cards clip or push the QR off screen with 6 heroes.

### EV-07 — Screenshot matches the mockup
- Requirement: the Pick board and iPad are as drawn.
- Method: screenshot
- How: board 1920x1080 with two heroes seated and iPad 768x1024 on the Pick screen; compare both side by side with `./mockup.html` (same viewports). Four images attached.
- Pass evidence: board: heading, count, four cards in a row (portrait, class, fight, hit points, line), two greyed, QR in the corner; iPad: the locked words and the toolbar, no card data. Order and parts match.
- Fails if: a part is missing, the greyed cards are not distinct, or the iPad differs.

### EV-08 — Cards are display only
- Requirement: DEC-278 and SCR-016: picks are made on the iPad.
- Method: playwright
- How: click each card on the board.
- Pass evidence: no frame sent, no state change; cards are not buttons (no `button`, no `data-action`).
- Fails if: a card can be clicked to seat a hero.

### EV-09 — Pick still works as before
- Requirement: no regression of the claim flow (C2 feature 05).
- Method: playwright
- How: the existing `w4-party.spec.ts` flows run unchanged: two iPads pick, a second iPad cannot take a seated hero.
- Pass evidence: all existing assertions pass without edits.
- Fails if: an existing party spec needed changing.

### EV-11 — The card's line is the pack's `ability`
- Requirement: Bob, 2026-11-14, adopted: "one virtue line" is the pack's `ability`.
- Method: unit
- How: `CoreStoryBoard.test.ts`: heroes with `ability` "Duel" and "Heal" in a test pack; render the cards; then a pack where an `ability` has a Copy-table line.
- Pass evidence: each card's line text equals that hero's `ability` (or its Copy line when one exists); two heroes with different abilities show different lines; no virtue or building card name appears on a card.
- Fails if: the line is a literal in web code, is the same on every card, or is drawn from the virtue deck.

### EV-12 — "Another iPad is waiting for a hero" is not built
- Requirement: Bob, 2026-11-14, adopted: not in 1.0.
- Method: playwright
- How: one iPad presses "Pick Hero A" until it holds more than half of the heroes; read the board and every iPad.
- Pass evidence: no line containing "waiting for a hero" on the board or any iPad; the iPad text equals EV-03.
- Fails if: the line or any new iPad word appears once an iPad holds more than half.

## Survival evals (one per survival invariant in plan.md)

### EV-10 — Continue keeps held cards greyed
- Requirement: held cards, the iPad words and a closed Menu after Continue.
- Method: playwright
- How: seat two heroes, restart the host, Continue to Pick.
- Pass evidence: the same two cards greyed from the restored game; the iPad words equal EV-03; no `[data-menu]` open; the toolbar on every iPad.
- Fails if: cards reset to open, or the Menu comes back open.

## Assumptions surfaced

- The card's "one virtue line" is the pack's `ability` → decided (Bob, 2026-11-14, adopted); EV-11.
- "Another iPad is waiting for a hero" is not built in 1.0 → decided (Bob, 2026-11-14, adopted); EV-12.
- "Picked" and "Open" stay → decided (Bob, 2026-11-14, adopted); Loremaster may reword in step 45; EV-02.
- Class names come from the pack `role` and are worded by Loremaster (step 45) → none.
