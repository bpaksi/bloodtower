Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C2 / 08-tower-lost-pause — A tower lost mid-game: Reconnect, Go on without, or Quit

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: High. Tower-safety, seed and restore evals included (EV-04, EV-06, EV-11, EV-12).

## Checks

### EV-01 — The pause offers three buttons
- Requirement: a tower lost mid-game pauses with Reconnect, Go on without the tower, and Quit (DEC-301).
- Method: playwright
- How: new `c2-tower-lost.spec.ts`, "tower drop in play pauses with three buttons": connect track, Begin, walk once, drop the mock tower.
- Pass evidence: the board shows the pause naming the lost tower; the iPad offers exactly "Reconnect", "Go on without the tower" and "Quit story", in that order. No press is accepted on the move map while paused.
- Fails if: only two buttons show, or play goes on.

### EV-02 — A drop during piece setup also pauses
- Requirement: a tower lost once a game has started, piece setup included, pauses that game (DEC-711).
- Method: playwright
- How: same spec: drop the tower on a setup step.
- Pass evidence: the same three-button pause on the setup step; after Reconnect the same setup step shows again.
- Fails if: setup goes on with no tower, or the session screen's "Tower lost" shows instead.

### EV-03 — Go on without asks, then uses the stand-ins
- Requirement: Go on without asks to confirm, then the rest of the game uses the no-tower stand-ins (DEC-301, DEC-305).
- Method: playwright
- How: same spec: press Go on without; No; press again; Yes. Finish the day.
- Pass evidence: No returns to the pause. Yes resumes play at the same node. The day's move-roll cue sends nothing. At the day's end there is no "where did it land" prompt; the board names the building the skull landed on, and the board is otherwise drawn as with the tower.
- Fails if: Go on without has no confirm, a tower command is still queued, or the skull prompt still asks the table.

### EV-04 — The simulated skull drop is seeded
- Requirement: without the tower, the app draws where each skull lands, seeded (DEC-305).
- Method: unit
- How: engine test "simulated skull drop is seeded": the same seed and event log played twice; a different seed once.
- Pass evidence: same seed, same landing building each time; a different seed changes at least one of 20 drops over 20 days. The draw uses `eventRng(seed, seq)`, not `Math.random`.
- Fails if: the draw is not seeded, or depends on wall-clock time.

### EV-05 — Play without Tower games use the same stand-ins and never pause
- Requirement: a game started without the tower never takes this pause, and uses the same stand-ins (DEC-275, DEC-305).
- Method: playwright
- How: same spec: Play without Tower at the Enter; play two days.
- Pass evidence: no tower pause ever; each day's end shows a simulated skull drop; the mock tower got no command.
- Fails if: the old record prompt still shows in this mode.

### EV-06 — Reconnect only on a press, then the tower check
- Requirement: Reconnect starts only on a press, and the tower check (MEC-018) runs before play goes on (DEC-301).
- Method: playwright
- How: same spec: drop the tower, wait 5 s, then press Reconnect.
- Pass evidence: nothing is sent during the wait. After Reconnect: connect, then the tower check as C1 built it, then play at the same node. A failed reconnect shows its error code on the iPad that pressed and returns to the three-button pause.
- Fails if: the tower reconnects on its own, or play resumes before the tower check.

### EV-07 — Reconnect stays in the Menu after Go on without
- Requirement: Reconnect from the Menu stays possible later (DEC-301, DEC-229).
- Method: playwright
- How: same spec: after Go on without, open the Menu.
- Pass evidence: the Table group offers "Reconnect tower". It asks to confirm (DEC-230); Yes connects and runs the tower check; the rest of the game uses the tower again.
- Fails if: the item is missing or greyed after Go on without.

### EV-08 — Quit from the pause
- Requirement: Quit from the pause ends the game as quit and lands on the session screen (DEC-218, DEC-301).
- Method: playwright
- How: same spec: drop the tower, Quit story, confirm.
- Pass evidence: the session screen with Continue first and "Tower lost" as the tower line (feature 06).
- Fails if: the quit drops the autosave, or the tower line says in play.

### EV-09 — Screenshots match the mockup
- Requirement: the pause and the Go-on-without confirm (DEC-301; mockup).
- Method: screenshot
- How: screenshot the board at 1920×1080 and an iPad at 1024×768 on the pause and on the confirm; compare side by side with ./mockup.html sections `#pause` and `#confirm-without`.
- Pass evidence: four images attached, matching wording and button order.
- Fails if: a button is missing or out of order.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Continue keeps "without the tower"
- Requirement: a game that went on without the tower continues without it.
- Method: playwright
- How: Go on without, walk, quit, restart the host, run the Enter with Connect Tower, Continue.
- Pass evidence: the resumed game sends no tower command and simulates the skull drop.
- Fails if: Continue brings the tower back into that game.

### EV-12 — Replay gives the same simulated drops
- Requirement: replaying the log gives the same landing buildings.
- Method: unit
- How: server test: rebuild a run with three simulated drops from its events.
- Pass evidence: the same three buildings, in order.
- Fails if: the replay draws again with a new sequence.

## Assumptions surfaced

- Without the tower, the board names the landing building in text so the table can place the skull ("A skull falls on <building>") → DEC-305 says the board "does not change"; naming the result is the minimum the table needs. Bob: OK?
- EV-11: a game continued without the tower stays without it, even if this session has the tower → Claude's reading of DEC-301 ("the rest of the game"). Bob: OK?
