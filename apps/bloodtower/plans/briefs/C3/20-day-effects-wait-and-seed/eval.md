Keep this a checklist; do not write a second design doc.

# Evals: C3 / 20-day-effects-wait-and-seed — The day loop's effects wait and the test-only seed hook

- Brief: ./plan.md
- Mockup: none (no screen change)
- Risk: Med. The strict checks are the restart-during-wait case and the seed hook's test-only isolation.

## Checks

### EV-01 — The effects wait is an engine step, executed by the server
- Requirement: ruling 1 (C3/11 plan.md). The engine models the wait as data; the host executes it. The engine stays pure: no clock, no I/O (`pnpm check`).
- Method: unit
- How: drive the day loop to the effects panel with a fixed seed and read the step it offers.
- Pass evidence: the offered step names the wait and its maximum (4 s) as data; the day loop advances only on the wait's completion event; no engine module gains a clock or timer import.
- Fails if: the engine advances on its own, or the 4 s maximum lives only in the web layer.

### EV-02 — C3/11's blocked evals go live, unmodified
- Requirement: rulings 1, 4 and 5. The blocked contract is already written and approved; this step makes it pass.
- Method: playwright
- How: each eval keeps its own method (playwright or unit). Unblock C3/11's set in `c3-day.spec.ts`: EV-01 (its seeded virtue and corruption groups), EV-03, EV-04, EV-05, EV-06 (its effects-panel shots), EV-09, EV-11 and EV-13 (their Regroup stops), EV-14, EV-17, EV-18. No eval text changes.
- Pass evidence: each passes with the fake clock and the seed hook; the verifier table lists each by ID.
- Fails if: any stays blocked, is edited to pass, or passes only through a change to C3-11's screens.

### EV-03 — The seed hook sets skulls per building and the next kingdom
- Requirement: ruling 4.
- Method: unit
- How: seed a play state with explicit skulls per building and a named next kingdom; run the night's drop.
- Pass evidence: the drop lands in the seeded kingdom on the seeded building, and each building's skull count matches its seed.
- Fails if: the drop ignores the seed (random or default), or a missing seed field is read as zero instead of unset.

### EV-04 — The seed hook sets hero sheets, and CU/10's corruption seed routes through it
- Requirement: rulings 4 and 5; CU/10's brief names this step as the general hook its narrow seed grows from.
- Method: unit
- How: seed two heroes' sheets (helping virtues, corruptions); run the day roll. Run CU/10's corruption-mark test unchanged against the general hook.
- Pass evidence: the roll's modifiers read from the seeded sheets (C3/11 EV-01's groups); CU/10's test passes with its seed field routed through the general hook.
- Also: the live (mid-game) form of the seed. CU/10's EV-04 (raise hero A to 2 and lower hero B to 1 while the game runs, and the band mark follows) was deferred to this step on 2026-11-15 (judgement delegated by Bob); its `test.fixme` in `c3-corruption-mark.spec.ts` goes live and passes here.
- Fails if: CU/10's EV-04 stays `fixme`, CU/10's narrow seed is bypassed, duplicated, or its test needs changing.

### EV-05 — The seed hook seats two heroes on one space, and Regroup shows
- Requirement: ruling 5. The test story seats each hero in a different kingdom, so Regroup never shows without the seed.
- Method: unit
- How: seed two heroes on one space; run to day start.
- Pass evidence: Regroup shows (split or join offered); the `seatTogether` marker rule holds — real seeds never carry the marker.
- Fails if: Regroup never shows, or the marker leaks into a real seed.

### EV-06 — The seed hook is test-only
- Requirement: the hook never runs in a production game (the `seatTogether` rule generalized).
- Method: unit
- How: (a route audit by unit test) assert no v2 protocol message and no production route reaches the seed fields; the only path is the test-seed one. Start a production game with no seed and read its first night.
- Pass evidence: the seeded fields are unreachable from any act, view, or production route; the unseeded game's drop is not seeded data.
- Fails if: any act, view, or production route can set skulls per building, the next kingdom, or hero sheets.

## Assumptions surfaced

- The 4 s maximum and the audio-end event are Bob's 2026-10-31 10:38 AM ET rulings, already recorded; no new timing ruling is needed → Claude.
- The seed hook wraps the existing test helpers (`initPlayState`, `setHeroSheet`, `seatTogether`) rather than replacing them → Claude.
