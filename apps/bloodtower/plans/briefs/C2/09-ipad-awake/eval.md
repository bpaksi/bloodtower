Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C2 / 09-ipad-awake — Joined iPads stay awake

- Brief: ./plan.md
- Mockup: none
- Risk: Med. Error path: a refusal must be logged and shown, never dropped.

## Checks

### EV-01 — A joined iPad asks for the screen wake lock
- Requirement: while an iPad is joined, the device page asks the browser to keep the screen on (DEC-712).
- Method: playwright
- How: new `c2-ipad-awake.spec.ts`, "a joined iPad holds a screen wake lock": stub `navigator.wakeLock.request` with `addInitScript` to record calls. Open `/join?code=…` and join.
- Pass evidence: zero `request('screen')` calls before the join; exactly one after; that sentinel is unreleased at the end.
- Fails if: the request is made before the join (on the code screen), or never.

### EV-02 — It is asked again when the page comes back
- Requirement: the lock lasts while the iPad is joined; browsers drop it when the page is hidden (DEC-712).
- Method: playwright
- How: same spec: fire `visibilitychange` to hidden (the stub releases the sentinel), then to visible.
- Pass evidence: a second `"screen"` request after the page is visible again.
- Fails if: the lock is asked for only once per page load.

### EV-03 — A refused request is logged and shown, with its code
- Requirement: a refused request is logged and shown on that iPad (DEC-712, decision 0003).
- Method: playwright
- How: same spec, with the stub rejecting (`NotAllowedError`). Join.
- Pass evidence: `DeviceErrorBanner` shows on that iPad with `data-error-code="wake-lock-refused"`. The host log gets one error line with that code, and the Story board shows one toast with it. The iPad is still joined and can press. The banner is the mockup notice: text "This iPad may dim and sleep. Keep it awake in Settings to stay in the game.", carrying the code, and dismissible.
- Fails if: the rejection is caught and ignored, the code differs from the banner, or the refusal blocks play.

### EV-04 — A browser with no wake lock API is the same error
- Requirement: no wake lock API means the screen can sleep, which the table needs to know (DEC-712).
- Method: unit
- How: `wakeLock.test.ts`, "no API reports wake-lock-unavailable": call the helper with `navigator.wakeLock` undefined.
- Pass evidence: the helper returns `{ ok: false, code: "wake-lock-unavailable" }` (or reports that code to the logger spy exactly once) and throws nothing.
- Fails if: it silently does nothing, or crashes the page.

### EV-05 — The lock is let go on leave
- Requirement: the lock is held only while joined (DEC-712).
- Method: unit
- How: `wakeLock.test.ts`, "release on leave": acquire, then call the release the device page uses when the iPad leaves or the session is over.
- Pass evidence: the sentinel's `release()` is called once.
- Fails if: the lock outlives the session.

### EV-06 — Reload re-asks
- Requirement: P:24.
- Method: playwright
- How: reload the joined device page.
- Pass evidence: a new `"screen"` request after rejoin.
- Fails if: no new request.

### EV-07 — No API shown on the iPad
- Requirement: DEC-712.
- Method: playwright
- How: `delete navigator.wakeLock` via `addInitScript`; join.
- Pass evidence: banner with `data-error-code="wake-lock-unavailable"`, one host error line and one board toast with that code; the iPad can still press.
- Fails if: no banner or the iPad is blocked.

### EV-08 — Page releases on leave
- Requirement: the lock is let go on leave (DEC-712; plan's leave line).
- Method: playwright
- How: Done for tonight (or leave).
- Pass evidence: the stub sentinel's `release()` count is 1, and no new request after leave.
- Fails if: not released.

### EV-09 — Notice matches mockup (M "Refused notice", "Normal")
- Requirement: DEC-712 per mockup.
- Method: screenshot
- How: (iPad 768×1024) refuse the request on one iPad of two; then grant.
- Pass evidence: one notice with the mockup text sits above the bottom bar (bottom ≤ bar top), covers no body button (`elementFromPoint` at each button centre returns the button), carries the EV-03 code, shows only on the refused iPad; dismissing removes it; granted: no notice in the DOM.
- Fails if: it covers a button, shows on the other iPad, or cannot be dismissed.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — After a host restart the lock is asked again
- Requirement: a joined iPad that reconnects after a host restart asks for the lock again.
- Method: playwright
- How: same spec: join, restart the acceptance host, wait for the device to reconnect.
- Pass evidence: a new `"screen"` request after the reconnect.
- Fails if: the request is tied to the first page load only.

## Assumptions surfaced

- The error codes are `wake-lock-refused` and `wake-lock-unavailable` → Claude's names; Bob: OK?
- iPadOS Safari 16.4 and later has the Screen Wake Lock API. An older iPad gets `wake-lock-unavailable` → DEC-712 (refused is logged and shown).
