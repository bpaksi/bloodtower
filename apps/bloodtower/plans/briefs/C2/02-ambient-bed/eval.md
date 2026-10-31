Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C2 / 02-ambient-bed — The ambient bed plays on every Story board screen

- Brief: ./plan.md
- Mockup: none
- Risk: Med. Playwright runs Chromium with `--autoplay-policy=user-gesture-required`, so a lost gesture fails the test instead of passing on a lenient default.

## Checks

### EV-01 — The bed keeps playing from `/` onto the board
- Requirement: going from the landing page to the Story board does not stop the bed and needs no second gesture (DEC-704).
- Method: playwright
- How: new test in `sound-unlock.spec.ts`, "the bed carries from / onto /board with one gesture": on `/`, one real click that unlocks audio, then open the Story board the way the landing page does. Make no other click or key press. Read the board's audio state through a test hook (`window.__btAudio`: context state and the ambient layer's playing flag).
- Pass evidence: on the board, the context state is `running` and the ambient layer is playing, 3 s after arrival.
- Fails if: the board is reached by a full page load (the context is new and `suspended`), or the bed is started only on a board click.

### EV-02 — The bed plays on each board screen of the day slice
- Requirement: the bed plays on setup, play, a pause and the session screen (DEC-704).
- Method: playwright
- How: in the same test, drive one iPad through Pick story, claims, setup and Begin, drop the iPad to get the pause, rejoin, then Quit story to the session screen. Read the hook on each screen.
- Pass evidence: on all five screens (pick-story, setup, play, pause, session) the ambient layer is playing and the context is `running`.
- Fails if: a screen change remounts the player and it stops, or the bed plays only while the startup dialogs show.

### EV-03 — The landing page's levels apply on the board
- Requirement: the music, ambient and voice levels set on the landing page apply everywhere (DEC-704, SCR-003).
- Method: playwright
- How: on `/`, open Sound and set ambient to 20% and music to 0. Go to the board. Read the gain values through the hook.
- Pass evidence: the ambient gain matches 20% and the music gain is 0, within 0.01.
- Fails if: the board starts at the default levels.

### EV-04 — iPads play nothing
- Requirement: iPads play no sound (DEC-231).
- Method: unit
- How: the existing `lib/audio/devicesPlayNoAudio.test.ts`, plus one case added for any new provider or hook this feature adds: rendering the device and join pages makes no `AudioContext`.
- Pass evidence: no `AudioContext` constructor call on `/device` or `/join`.
- Fails if: the shared provider also mounts on iPad routes.

### EV-05 — A refused audio start is logged and shown
- Requirement: an audio start the browser refuses is an error: log it, and show it on the board as a toast with its code (CLAUDE.md "Errors").
- Method: unit
- How: a test that makes the mock context's `resume()` reject, then checks the host log entry and the toast.
- Pass evidence: one error log line with a code (for example `audio-start-refused`) and one Story board toast with that code.
- Fails if: the rejection is caught and dropped, or logged with no toast.

### EV-06 — The existing sound specs still pass
- Requirement: no regression in the Sound dialog and unlock rules (SCR-003).
- Method: playwright
- How: `sound-dialog.spec.ts` and `sound-unlock.spec.ts` on the PR head.
- Pass evidence: all pass. In particular, a first input that is not a gesture still starts no audio.
- Fails if: the bed now starts before a gesture.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — The levels survive a host restart
- Requirement: the levels set on the landing page survive a host restart.
- Method: playwright
- How: set ambient to 20% on `/`, go to the board, restart the acceptance host, reload the board, and give one gesture.
- Pass evidence: the ambient gain is still 20%.
- Fails if: the levels are kept only in memory.

## Assumptions surfaced

- The way from `/` to the board becomes a client-side route change, so one `AudioContext` lives across both → DEC-704's "no second gesture". Bob: OK?
- A full page reload of the board (F5) needs a new gesture. Browsers require it, and DEC-704 does not ask for more.
