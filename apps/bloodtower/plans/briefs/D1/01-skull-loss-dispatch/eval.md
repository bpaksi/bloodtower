Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: D1 / 01-skull-loss-dispatch — A skull that empties the supply or fells the fourth building loses the game at once

- Brief: ./plan.md
- Mockup: none
- Risk: High (game-loss state, restore). Negative and restore evals are included.

All fixtures: the base board (16 buildings, 4 per kingdom), tuning `loss.fallen_buildings` 4, no Cleanse that day, no quest won that day (so the night drops), kingdoms forced through the existing test kingdom queue (`~test-kingdom:` / `takeSeedKingdom`), skulls set with `setBuildingSkulls` or `~test-skulls:`. "Fallen" is 4 skulls on a building. Source of the cases: DEC-905's R03 fixtures (b) to (d) and DEC-931's fixture (e).

## Checks

### EV-01 — Simulated night: the skull after the fatal one is never drawn
- Requirement: DEC-905, DEC-931: a no-tower night stops at the loss; the fatal skull's line shows, no later skull is drawn or shown.
- Method: unit
- How: `skullLoss.test.ts` "EV-01". No tower. Three buildings fallen; in kingdom E the other three buildings fallen too and one E building at 3 skulls; supply 10; a night with 2 due skulls, both forced to E. Run the night. If the harness can force 3 due skulls, also run DEC-931's (e) as written (the second fells the fourth building, the third never drawn).
- Pass evidence: after skull 1 the outcome is `{ lost: true, reason: "buildings" }`; supply fell by exactly 1; the play RNG sequence advanced only for skull 1's draws; the night's skull lines are exactly one, "A skull falls on <that building>."; no effects-panel wait is opened; the day hands up `lost: { reason: "buildings" }`.
- Fails if: the second skull is drawn or placed, a second line shows, the effects panel opens, or the loss waits for MEC-033 .11.

### EV-02 — With the tower: no placement prompt after the fatal skull
- Requirement: DEC-905: the loss is checked the moment a skull lands; no placement prompt follows (MEC-034 .19).
- Method: unit
- How: `skullLoss.test.ts` "EV-02". Tower linked. Three buildings fallen anywhere, a fourth building at 3; supply 10; 2 due skulls. Press `skull-record` for the building at 3. Then send a second `skull-record` press for any standing building.
- Pass evidence: after the first press the outcome is lost, reason `buildings`; no `skull-record--` prompt is offered after it; the second press is refused and changes no skull count or supply; no effects panel; the day hands up lost.
- Fails if: a second placement prompt opens, the second press lands, or the loss is reported only at .11.

### EV-03 — The last skull to leave the supply loses at once (R03 c)
- Requirement: DEC-905, DEC-686 (as trimmed): the loss fires the moment the supply reaches 0.
- Method: unit
- How: `skullLoss.test.ts` "EV-03". Supply 1, 2 due skulls, no building near falling. Run three ways: (a) simulated; (b) tower, the skull placed on a building; (c) tower, the skull recorded as stayed inside (`inside`).
- Pass evidence: in each, the outcome is lost, reason `skulls`, right after the one skull; supply 0; no second draw or prompt; no effects panel.
- Fails if: the night goes on to a second skull, a held skull that empties the supply does not lose, or the loss waits for .11.

### EV-04 — One loss, one reason (R03 d)
- Requirement: DEC-905: the reason is the first of third corruption, empty supply, fourth fallen building; it is one loss.
- Method: unit
- How: `skullLoss.test.ts` "EV-04". (i) Supply 1 and three buildings fallen, the last skull lands on a building at 3. (ii) A hero takes a third corruption (outcome `corruption`), then a skull is recorded that empties the supply.
- Pass evidence: (i) reason `skulls`; (ii) no skull prompt or draw follows the corruption in the day loop, and a direct `recordBuildingDrop` call after it leaves the outcome `corruption`; in both, one loss and one game-end close.
- Fails if: the reason is `buildings` in (i), a skull loss overwrites `corruption` in (ii), or two losses are recorded.

### EV-05 — A freed skull that fells the fourth building loses the game (R03 b)
- Requirement: DEC-905 as amended by DEC-933, and DEC-938: the loss check runs after each freed skull lands; the rest are never asked; the next chapter never starts; the record says lost in the closing chapter.
- Method: unit
- How: `chapter.test.ts` "D1 EV-05", with the C3/09 EV-04 fixture (`c3End: false`, tower, held 2, the seeded break frees 2). Before the win, three buildings fallen and one building at 3. Press the first freed skull onto the building at 3.
- Pass evidence: outcome lost, reason `buildings`; no second freed-skull prompt; `skullsToPlace` is not decremented by a skull that was never asked; the chapter hands up `outcome: "lost"` with reason `buildings`; `store.entered` stays `[1]` (chapter 2's enter and its quest tokens never run); the chapter result and the game record name chapter 1, not chapter 2; the game ends lost once.
- Fails if: the second freed skull is offered, the chapter hands up `won`, chapter 2 enters, or the record names chapter 2.

### EV-06 — No early loss
- Requirement: DEC-905, DEC-915: lost only at supply 0 or 4 fallen.
- Method: unit
- How: `skullLoss.test.ts` "EV-06". (i) Supply 2, one skull leaves it. (ii) Two buildings fallen, a skull fells a third. (iii) Three fallen, a skull lands on a building at 2.
- Pass evidence: in each, the outcome is not lost; the next skull or prompt follows as before; the day reaches MEC-033 .11.
- Fails if: the game is lost at supply 1, at 3 fallen, or on a building's 3rd skull.

### EV-07 — The game end runs once with the reason
- Requirement: DEC-676 (the stop), MEC-032 .43 to .49: one close, the loss scene for the reason (DEC-144).
- Method: unit
- How: `game/loop.test.ts` "D1 EV-07". Run EV-01, EV-03 (a) and EV-05 through the game loop with a counter on the game close.
- Pass evidence: the close runs exactly once in each; the result is `outcome: "lost"`, reason as in that EV, scene `loss-buildings` or `loss-skulls`; no `won` record; no later group turn, day or chapter starts.
- Fails if: the close runs twice, a won record is written, or play goes on.

### EV-08 — The backstop and the corruption stop are unchanged
- Requirement: MEC-033 .11 (backstop), DEC-676.
- Method: unit
- How: the existing day, chapter, corruption and game tests, unchanged except the C3/04 `EV-05` node-order assertion if the stop removes .11 from that run; plus `skullLoss.test.ts` "EV-08": a night with no loss.
- Pass evidence: all existing tests pass; the no-loss night reaches `MEC-033.11` with `lost: null`.
- Fails if: any existing loss or corruption test breaks, or a no-loss night skips .11.

### EV-09 — End to end: the fatal skull on the board, then the game is lost
- Requirement: DEC-905, DEC-931, DEC-915; C3/10 EV-08 (no Continue after a finished game).
- Method: playwright
- How: `apps/bloodtower/src/e2e/tests/d1-skull-loss.spec.ts`, ipad project, board at 1920x1080. Enter without the tower with a seed carrying `~test-skulls:` (three E buildings at 4, the fourth E building at 3) and `~test-kingdom:E`. Play day 1 to the close; press past the skull line.
- Pass evidence: the board's skull lines are exactly one, "A skull falls on <the fourth E building>."; no effects panel; no day 2 roll prompt; after the game's end (and the stats screen, if it opens, is closed) the session screen's tonight's games row reads "Game 1 lost"; Continue is not offered.
- Fails if: a second line shows, the effects panel shows, the game goes on to day 2, or Continue is offered.

## Survival evals (one per survival invariant in plan.md)

### EV-10 — Continue mid-night keeps the fatal skull fatal
- Requirement: survival invariant 1; DEC-675.
- Method: unit
- How: `skullLoss.test.ts` "EV-10". EV-02's fixture; save while the first `skull-record` prompt is open; restore; press the building at 3.
- Pass evidence: same result as EV-02: lost once, reason `buildings`, no second prompt; supply and skulls equal an uninterrupted run.
- Fails if: the restored game loses twice, loses before the press, or offers a second prompt.

### EV-11 — Continue mid freed-skull placement
- Requirement: survival invariant 2; C3/09 EV-12.
- Method: unit
- How: `chapter.test.ts` "D1 EV-11". EV-05's fixture; save after the break with both freed skulls unplaced; restore; press the building at 3.
- Pass evidence: same as EV-05: lost, no second freed prompt, chapter 2 never enters.
- Fails if: the restore re-breaks a seal, re-frees skulls, or enters chapter 2.

### EV-12 — The event-log rebuild after a skull loss
- Requirement: survival invariant 3.
- Method: unit
- How: `skullLoss.test.ts` "EV-12". After EV-01 and EV-03 (b), rebuild supply and skulls from the day event log (`clock.ts` replay).
- Pass evidence: the rebuild equals the live clock; it does not throw "drops a skull after the supply is empty".
- Fails if: a drop is logged after the supply is empty, or the rebuild differs.

## Assumptions surfaced
- The fatal skull's own line shows, then the loss; no effects panel (DEC-931 "then the loss scene plays"; DEC-905 "no later step").
- A skull that stays inside the tower leaves the supply, so it can empty it (DEC-905 "the moment a skull leaves the supply"; DEC-686).
- R03 (a), a Magic or Humanoid skull in a live battle, is not an EV here: no battle loop is on main → the test-only D1 follow-up PR after F1 (Wright, 2026-11-18).
- The record names the closing chapter after a freed-skull loss → DEC-938 (EV-05).
- C3/04 EV-05 and EV-12 still pass as written; only the moment the loss is set moves (DEC-905).
