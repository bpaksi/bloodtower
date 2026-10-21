# 0003 — Error logging on the Mac host
Date: 2026-10-21 · Status: accepted

## Context
Bloodtower runs on a Mac host with pages on iPads and the TV (the Story board). Today the server and the pages use bare `console.*` calls, and no page catches its own errors. An error on an iPad or the TV is lost unless Safari's dev tools happen to be attached. tower-poc already has a diagnostics timeline (its spec, D16), but that covers the tower, not the game. Bob wanted this settled before coding continues on 2026-10-23.

## Decision
**The rule (Bob, 2026-10-21): never eat, hide or ignore an error.**
- Every error, however small, is logged. That includes failures the code expects and handles: a tower command with no answer, a rejected press, a pack lint warning.
- No empty `catch`, no `.catch(() => {})`, no promise left unhandled. Errors from the browser and third-party code are logged too, not filtered out.
- An error tied to a person's action is shown to that person, on the iPad that pressed, with the error code.
- Every error logged also shows as a toast on the Story board.
  - The board is display-only, so the toast sits in a corner away from the story text and fades after a few seconds.
  - Repeats of the same code collapse into one toast with a count ("×12"). The log keeps every one.
- Why: errors made visible early save hours of hunting later.

Bob's answers, 2026-10-21:
- **One log on the Mac host. Nothing leaves the LAN.**
  - Every page catches its errors: a React error boundary, `window.onerror` and `unhandledrejection`.
  - A page sends its errors to the Mac over the existing socket. If the socket is down, it uses a small HTTP endpoint on the same host instead.
  - The server writes its own entries and the pages' entries to the same log.
  - Each entry carries the time, the level, the source (`server`, `board`, `device`), the device, the session, the screen and a short error code.
- **Storage:** JSON lines, one object per line, in `data/logs/` (the app's gitignored data folder, or `.wt.json` `dataDir` in a worktree).
  - A new file starts each day.
  - Files older than 30 days are deleted when the host starts.
- **Reading it:** a log page on the Mac only, filtered by level, device and session.
  - **Export** bundles the log with that session's game events for a bug report.
  - The files stay readable with `tail` and `grep`.
- **What is logged:**
  - errors and warnings everywhere;
  - a few info lines that explain them: a device joining, leaving or reconnecting; the tower connecting, calibrating or disconnecting; a tower command that fails or gets no answer; a pack load problem.
  - Debug lines are written only when switched on.
  - Game happenings belong in the game's event log (game-design DEC-107), not here.
- **What players see:**
  - When a page hits an error it cannot recover from, it shows a calm in-world card ("The mists close in…").
  - The card has one Reload button and the error code that matches the log line.
  - Game state lives on the Mac, so a reload puts the device back where it was.
  - Nothing reloads, reconnects or retries on its own.

## Consequences
- Bloodtower gets a small logger used by the server and every page, and its `console.*` calls move onto it. A lint rule can then keep new bare calls out.
- The socket protocol gains a client-to-host `log` message. It carries text and codes only, never raw bytes.
- It is built in Bloodtower first. The logger moves to `packages/` only when a second app (tower-poc) uses it, per the repo's shared-code rule.
- An error code appears in two places, the card and the log, so a player can read one out and it can be found.
