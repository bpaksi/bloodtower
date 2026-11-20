Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 16-continue-repick — Continue frees the heroes of iPads that are gone; the iPads joined now pick them

- Brief: ./plan.md
- Mockup: none
- Risk: High (restore and who acts for which hero). Negative, survival and restore evals are included.

All fixtures: the test pack, a story with heroes A to D, party size 2 unless named, no tower (Play without Tower) unless named, `graceMs` 100. "Seated" means the hero ids in `play.groups`. iPad 1 and iPad 2 pick the party; iPad 3 and iPad 4 are new iPads (new device ids). Source: DEC-952, DEC-953, DEC-154.

## Checks

### EV-01 — Continue clears the hold of an iPad that is not joined
- Requirement: DEC-952.
- Method: unit
- How: `continueSeats.test.ts` "EV-01". A saved state with A held by `device-1` and B by `device-2`, `devices` {device-1, device-2}; a live state with `devices` {device-3}. Run `seatOnContinue`.
- Pass evidence: `holdings` A and B are `null`; `devices` is {device-3}; `stage` "paused", `screen` "pause", `pause.cause` "disconnect".
- Fails if: a hold names device-1 or device-2, `devices` still holds a saved id, or the game is not paused.

### EV-02 — A joined iPad keeps its hold
- Requirement: DEC-952; keeps C2/04 EV-12.
- Method: unit
- How: `continueSeats.test.ts` "EV-02". Saved: A by device-1, B by device-2. Live `devices` {device-1, device-3}.
- Pass evidence: A by device-1; B `null`; paused (disconnect). With live {device-1, device-2}: A by device-1, B by device-2, not paused, the saved screen ("play").
- Fails if: device-1 loses A (every hold cleared), B stays with device-2, or the full table is paused.

### EV-03 — Nothing but the holds changes
- Requirement: DEC-952.
- Method: unit
- How: `continueSeats.test.ts` "EV-03". A saved mid-game state (chapter 1, day 3, gold, items, hit points, an open quest, positions, skulls). Deep-compare before and after `seatOnContinue` with live {device-3}.
- Pass evidence: every field equal except `holdings`, `devices`, `stage`, `screen`, `pause`, `pauseSerial`.
- Fails if: any other field differs (party, groups, gold, chapter, day, quests, positions, skulls).

### EV-04 — The pause counts the seated heroes, not the roster
- Requirement: DEC-953, DEC-154.
- Method: unit
- How: `continueSeats.test.ts` "EV-04". Party size 2, seated A and B, roster A to D, live {device-3}. Project the device and board views; then device-3 takes A.
- Pass evidence: screen line "0 of 2 picked", then "1 of 2 picked"; the device hero list is A and B only, each `claim` "open", then A "yours" for device-3.
- Fails if: the count reads "of 4", C or D is listed, or a hold on C (an unseated hero) is accepted.

### EV-05 — Play goes on at the last pick; the tower pause still follows
- Requirement: DEC-953, DEC-154, DEC-155, DEC-301.
- Method: unit
- How: `continueSeats.test.ts` "EV-05". (a) No tower: from EV-04, device-3 takes A and device-4 takes B. (b) Tower linked and connected at Continue; the tower is lost while the pause is open; then the same picks.
- Pass evidence: (a) after the second take: `stage` "playing", the saved screen, `pause` null, no extra press. (b) after the second take: `pause.cause` "tower-lost" with Reconnect, Go on without the tower, Quit offered. No tower frame is sent by the seating or the picks in either.
- Fails if: play needs another press, play goes on with a seat empty, (b) plays without the tower, or a tower frame is sent.

### EV-06 — The iPad shows the Pick rows in the disconnect pause
- Requirement: DEC-953; the Pick words are locked.
- Method: unit
- How: `shell.test.ts` or `project.test.ts` "CU/16 EV-06". Disconnect pause, A held by device-1, B unheld; project device-1's and device-3's views. Render `CoreDeviceScreen` for device-3.
- Pass evidence: device-3: B's panel `data-claim-state="open"` "unclaimed", button text "Pick Hero B"; A's "another iPad", its button disabled; `data-pick-status` "1 of 2 picked". device-1: A "this iPad". The title reads "Paused". No string outside the plan's Copy table.
- Fails if: no Pick button in the pause, other words, a roster hero not seated is listed, or the tower-lost pause shows Pick rows.

### EV-07 — A mid-game drop uses the same rows
- Requirement: DEC-953, DEC-154.
- Method: unit
- How: `shell.test.ts` "CU/16 EV-07". In play, device-2 (holding B) drops; device-3 is joined. device-3 takes B.
- Pass evidence: on the drop, the disconnect pause with B "unclaimed" and "1 of 2 picked"; after the take, play goes on by itself and B is held by device-3. The existing disconnect-pause tests still pass unchanged.
- Fails if: device-3 cannot take B in the pause, or play goes on before B is held.

### EV-08 — e2e: Save and quit, Continue on new iPads, every hero can be picked
- Requirement: DEC-952, DEC-953 (Anvil's finding, Save and quit).
- Method: playwright
- How: `cu16-continue-repick.spec.ts` "EV-08". iPad 1 and iPad 2 start a game and pick A and B, play to day 2 and note the band and gold. iPad 1 opens the Menu, Save and quit. Close iPad 1 and iPad 2 and wait past the grace. iPad 3 and iPad 4 join and press Continue.
- Pass evidence: both new iPads show "0 of 2 picked" and `button` "Pick Hero A" and "Pick Hero B" enabled; iPad 3 picks A ("this iPad" on iPad 3, "another iPad" on iPad 4), iPad 4 picks B; the board shows "2 of 2 picked" and then play; the band, day and gold equal the noted values; iPad 3 can act for A.
- Fails if: any hero reads taken on arrival, a pick is refused, play starts before both picks, or a game value differs.

### EV-09 — e2e: the same after a host restart
- Requirement: DEC-952, DEC-953 (Anvil's finding, host restart).
- Method: playwright
- How: `cu16-continue-repick.spec.ts` "EV-09". As EV-08 to day 2, then close the host (no Save and quit) and start it on the same database. iPad 3 and iPad 4 join and press Continue.
- Pass evidence: as EV-08: every seated hero can be picked by the new iPads, play goes on after the last pick, and the band, day and gold equal the noted values.
- Fails if: as EV-08.

### EV-10 — e2e: an iPad still at the table keeps its hero
- Requirement: DEC-952; C2/04 EV-12.
- Method: playwright
- How: `cu16-continue-repick.spec.ts` "EV-10". As EV-09, but iPad 1 (the same browser context) rejoins after the restart and iPad 2 does not; iPad 3 joins; Continue.
- Pass evidence: iPad 1 shows A "this iPad"; B "unclaimed"; "1 of 2 picked"; iPad 3 picks B and play goes on; iPad 1 still acts for A.
- Fails if: A is free (every hold cleared) or B stays held by iPad 2's old id.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — A restart during the re-pick pause
- Requirement: survival invariant 2 (DEC-952).
- Method: playwright
- How: `cu16-continue-repick.spec.ts` "EV-11". As EV-09 up to the re-pick pause, with no pick made; restart the host again; iPad 3 and iPad 4 join again; Continue.
- Pass evidence: the same pause: "0 of 2 picked", A and B "unclaimed" on both iPads; both picks are taken and play goes on; the game values equal EV-09's.
- Fails if: a hero reads taken by an iPad that is not joined, or a game value differs.

### EV-12 — Seating changes no tower and no store
- Requirement: survival invariant 3.
- Method: unit
- How: `continueSeats.test.ts` "EV-12". Run the Continue press through the session (`server/core/session.ts`) with a fake tower and store; record tower frames and store writes during `seatOnContinue`.
- Pass evidence: zero tower frames from the seating; the only store writes are the normal autosave after the press.
- Fails if: a tower frame is sent or a game record is written by the seating.

## Assumptions surfaced

- DEC-952 changes the suggested "clear every saved hold" to "keep the holds of iPads joined at Continue", to keep C2/04 EV-12. Bob: OK?
- DEC-953 gives a mid-game drop pause the same Pick rows, not only the pause after Continue. Bob: OK?
- No mockup: the iPad pause body is CU/08's Pick rows under the "Paused" title; the board's pause frame shows "N of N picked" in place of "The tower has gone quiet. The game waits." for a drop pause only. Bob: OK, or Illusionist first?
