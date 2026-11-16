Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 15-purse-spin — The game of chance: the Spin and the starting purse (54c)

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: Med
- Split from CU/07 on 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Every EV below keeps its text from CU/07's eval.md (approved blob f6354c58); only the line "Moved from CU/07" and, for EV-12 and EV-13, a "Scope here" line are added. The new eval.md needs Bob's approval row.

## Checks

### EV-08 — The spin runs only on the press
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: UI-045, DEC-114; Tower safety: nothing physical happens automatically.
- Method: playwright
- How: the starting-purse step with a tower double; wait 10 s, then press Spin.
- Pass evidence: before the press the double has received no command; after the press exactly one `command{capabilityId, params}` for the light chase and sound; no message carries raw bytes; with the tower linked the board plays no separate coin sound cue (the tower plays it, DEC-114).
- Fails if: the chase starts on arrival, repeats, or a raw-bytes message is sent.

### EV-09 — The seeded draw repeats and the result shows on the board
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: DEC-114: the draw is seeded; the amount never goes below the floor.
- Method: unit
- How: draw twice with the same seed and once with another; check the floor from `setup.purse_wheel` in the tuning file.
- Pass evidence: same seed gives the same amount; the amount is at least the floor; the board view carries the amount.
- Fails if: the draw is unseeded, below the floor, or hard-coded in the web code.

### EV-10 — Without a tower the spin still gives a result
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: Q7.4 (Bob, 2026-11-14, adopted): with no tower the board shows the result at once and plays the coin sound on the board speakers (DEC-201, DEC-903); no tower words on the board.
- Method: playwright
- How: play without the tower; press Spin; record the time from the press to the result and the board's audio cue calls.
- Pass evidence: no tower command; the board shows the result in the same frame as the press is handled (no chase animation, no wait); exactly one coin sound cue plays on the board; no "tower" words appear.
- Fails if: the step stalls waiting for the tower or says the tower is missing, a board-only chase runs first, the coin sound plays on the iPad or twice, or no sound plays.

### EV-11 — A second spin cannot overwrite the purse
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: the purse is set once (DEC-110, DEC-114).
- Method: playwright
- How: press Spin twice quickly on two iPads.
- Pass evidence: one result; the second press changes nothing; the purse equals the shown result.
- Fails if: two spins run or the purse changes after the result.

### EV-13 — Unknown values read unavailable
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Scope here: the amount missing (the chance result); the item name missing is checked in 54a.
- Requirement: root CLAUDE.md.
- Method: unit
- How: render the panels with an item name or an amount missing.
- Pass evidence: "unavailable" shows; no 0 or empty line.
- Fails if: a missing value shows as 0.

### EV-12 — Screenshot matches the mockup
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Scope here: only the chance result on the board (`#chance`) and the iPad Spin (`#ipad-chance`); 4 images here.
- Requirement: the three board states and two iPad states are as drawn.
- Method: screenshot
- How: board 1920x1080 at the virtue panel, the items panel and the chance result, and iPad 768x1024 at the virtue choice and at Spin; compare each side by side with `./mockup.html` sections `#virtue`, `#items`, `#chance`, `#ipad-virtue`, `#ipad-chance`. Ten images attached.
- Pass evidence: named parts present and in the same order in each pair (panel title, lines, "Game paused." on the items panel, the result line, the choice buttons, Spin, the toolbar).
- Fails if: a part is missing, a panel clips, or the iPad shows art.

## Survival evals (one per survival invariant in plan.md)

### EV-14 — Continue keeps a set purse and closed panels
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: purse not re-spun; Menu and panel closed; game not paused; toolbar present.
- Method: playwright
- How: spin, restart the host, Continue; open the items panel and restart again.
- Pass evidence: same purse, no second Spin offered; `[data-panel]` absent, `paused: false`; enabled states recomputed.
- Fails if: the spin is offered again, the panel reopens, or the game stays paused.

### EV-15 — A restart runs nothing physical
- Moved from CU/07 2026-11-15 (Bob, chat: "Split into 54a, 54b, 54c"). Text unchanged.
- Requirement: no automatic physical action after restore.
- Method: playwright
- How: restart mid-spin with a tower double; Continue.
- Pass evidence: the double gets no command until a new press; no sound plays.
- Fails if: the chase resumes or repeats after Continue.
