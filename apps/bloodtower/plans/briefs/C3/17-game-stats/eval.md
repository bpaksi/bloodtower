Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 17-game-stats — Game stats: the game in numbers

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Risk: Low.

## Checks

### EV-01 — Every stat in order
- Requirement: SCR-019, DEC-627.
- Method: playwright
- How: `c3-stats.spec.ts` after fixture `c3-stats-loss` (lost on skulls, active 42 min, 12 days, 1 quest done, 2 corruptions taken, 7 gold left).
- Pass evidence: in this order: outcome "Lost", time played "42 min", days 12, quests done 1, corruptions taken 2, gold left 7, key moments (contents wait on Q-C3-18), active length "42 min" with best and average (values per EV-03), then the rating; there is no "Skulls on the board" row; the iPad buttons are, in DOM order, "Play again" then "Back".
- Fails if: a stat is missing, out of order, or differs from the fixture; the Outcome row or the average is missing; a "Skulls on the board" row shows; or Back comes before Play again.

### EV-02 — The rating never blocks Play again or Back
- Requirement: SCR-019.
- Method: playwright
- How: with no rating, press Back; reach the screen again and press Play again.
- Pass evidence: Back lands on the session screen; Play again starts Pick setup for the same story; neither needs a rating.
- Fails if: Back or Play again is disabled, or a Next button shows.

### EV-03 — Best and average
- Requirement: DEC-116.
- Method: unit
- How: three stored won games of this story with active lengths 40, 50 and 60 min, plus one lost game of 30 min; view the 50-min game.
- Pass evidence: best 40 min (shortest winning game, (Bob approved 2026-10-31)); average 45 min (mean of all four finished games: 40, 50, 60, 30); this game 50 min.
- Fails if: best is 30 (a loss) or 60, the average is wrong, or only this game shows.

### EV-04 — Drill-in shows the same stats
- Requirement: SCR-021, C2 07.
- Method: playwright
- How: from tonight's games, open the game.
- Pass evidence: the same numbers and the rating given.
- Fails if: different numbers.

### EV-05 — Screenshots match
- Requirement: SCR-019.
- Method: screenshot
- How: board and iPad; compare with ./mockup.html `#s=0`.
- Pass evidence: two images matching.
- Fails if: a part out of order.

### EV-06 — No Seals broken stat in C3
- Requirement: Q-C3-01 (no seal breaks in C3); DEC-627.
- Method: unit
- How: project the stats view after a C3 game won on chapter 1, and after one lost.
- Pass evidence: no Seals broken row, label or zero value in either.
- Fails if: Seals broken shows, even as 0.

### EV-07 — Drill-in Play again and Back
- Requirement: C2 07, SCR-021.
- Method: playwright
- How: from tonight's games open a finished game; press Back; open it again; press Play again.
- Pass evidence: Back returns to the session screen; Play again starts Pick setup for the same story with the same heroes.
- Fails if: either button is missing or goes elsewhere.

### EV-08 — The toolbar is on every state
- Requirement: every iPad state of this screen has the bottom toolbar, "?" at the left and the gear at the right (Bob 2026-10-31 10:37 AM ET; Bob 2026-10-31 10:38 AM ET).
- Method: playwright, iPad portrait 768×1024
- How: stop on each state: stats, rating, drill-in.
- Pass evidence: on each stop, `footer.bt-bar--bottom` is visible in the viewport; its first control is "?" and its last is the gear; no body element covers them.
- Fails if: any state lacks the toolbar, "?" or the gear.

### EV-09 — The happy path never needs the gear
- Requirement: this screen's happy path uses only the iPad body's flow buttons (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: play this screen's happy path through stats, rating, drill-in, counting Menu and help opens.
- Pass evidence: Menu open count 0 and help open count 0; the screen reaches its next screen.
- Fails if: any step can only be reached through the gear or help.

### EV-10 — Help matches this screen
- Requirement: "?" opens a help sheet on the iPad for this screen; Close returns to the same state; help does not pause and sends nothing (Bob 2026-10-31 10:38 AM ET).
- Method: playwright
- How: on each state (stats, rating, drill-in) press "?", then Close.
- Pass evidence: the sheet's `data-help-screen` is `game-stats` and its text is exactly "Here's how tonight went. Rate it if you like, then tap Play again." (Loremaster 2026-10-31); the host sends nothing and `paused` is unchanged; after Close the same state shows.
- Fails if: help is missing, shows another screen's text, pauses the game or changes state.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — The rating is kept
- Requirement: SCR-019.
- Method: unit
- How: two iPads rate 4 and 2 (Q-C3-21 per iPad); restart the host; drill in.
- Pass evidence: both ratings are stored per iPad and shown as "4 · 2" (one value per iPad, in seat order).
- Fails if: a rating is lost, averaged into one, or only the last kept.

### EV-12 — The gear Menu survives a restart closed
- Requirement: after a restart and Continue on this screen, the Menu and any gear panel come back closed, the game is not paused, the toolbar is back on every iPad, and every item's enabled state is recomputed (Bob 2026-10-31 10:37 AM ET).
- Method: playwright
- How: on this screen, open a gear panel (Volume), restart the host, Continue.
- Pass evidence: no `[data-menu]` or `[data-panel]`; `paused: false`; every iPad shows the toolbar with "?" and the gear; the Menu's enabled and disabled items and reasons match those before the restart.
- Fails if: the Menu or panel reopens, the game stays paused, the toolbar is missing, or item states are stale.

## Assumptions surfaced

- Each iPad gives its own rating (Q-C3-21, Bob approved 2026-10-31).

## OPEN questions

- ANSWERED Q-C3-18 (Bob approved 2026-10-31): key moments are quest done, item gained, building fallen, corruption taken, chapter won. (key moments)
- ANSWERED Q-C3-21 (Bob approved 2026-10-31): the fun rating is per iPad, shown per seat.
