Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 06-toolbar-order — Toolbar order: "?" left, Back and Replay centre, gear right

- Brief: ./plan.md
- Mockup: none
- Risk: Low

## Checks

### EV-01 — Order on every iPad screen
- Requirement: PT-23, design-freeze section H: "?" left, Back then Replay centre, gear right.
- Method: playwright
- How: `w1-chrome.spec.ts` walks /join, Pick story, Game settings and Pick (the existing walk) at the iPad viewport 768x1024; at each screen read the `[data-bottom-bar]` buttons in DOM order and by x position.
- Pass evidence: DOM and x order is exactly `help`, `back`, `replay`, `menu` on every screen; first button text is "?"; last is `data-action="menu"`.
- Fails if: Back or Replay sits at an end, the gear is not last, or Replay comes before Back.

### EV-02 — Back and Replay are centred as a pair
- Requirement: PT-23: the pair sits in the centre of the bar.
- Method: playwright
- How: same screens at 768x1024 and at 1024x768. Take the pair's box from Back's left edge to Replay's right edge and the bar's box.
- Pass evidence: the pair's centre x is within 8 px of the viewport's centre x; the gap between "?" and Back and between Replay and the gear differ by at most 12 px.
- Fails if: the pair is pushed to one side (for example by a wider gear, or `justify-content` left), which order-only checks pass.

### EV-03 — Unusable Back and Replay stay visible and greyed
- Requirement: DEC-227: a control that cannot be used is greyed, never hidden.
- Method: playwright
- How: /join with no code (no Back offer) and a screen with a Back offer.
- Pass evidence: without an offer Back and Replay are visible, `disabled`, and the bar's box does not change when an offer arrives; with an offer Back is enabled and Replay is still disabled and visible.
- Fails if: either button is removed, replaced by a gap, or the bar's layout shifts between the two states.

### EV-04 — Back still sends only its own act
- Requirement: the move of Back must not change what it sends (Tower safety: the UI sends only `command{capabilityId, params}` or acts).
- Method: unit
- How: `chromeBar.test.ts`: render with a `back` offer and click Back; render with the Menu open and click Close.
- Pass evidence: Back calls `onAct` once with its `promptId` and `actionId`; Close, "?" and the gear send no act.
- Fails if: a reorder wires Back to the gear or Help handler, or Help sends a frame.

### EV-05 — The Menu dialog does not gain Back or Replay
- Requirement: PT-23 moves nothing into the gear.
- Method: playwright
- How: open the gear on /join.
- Pass evidence: `[data-menu]` holds no `[data-action="back"]` or `[data-action="replay"]`; the bar stays visible under the scrim with the same order.
- Fails if: Back or Replay is duplicated into the dialog or the bar reorders while the Menu is open.

### EV-06 — The old centred-trio pin is gone
- Requirement: the e2e check no longer pins the Oct 25 order (Back, Replay, Menu centred).
- Method: unit
- How: `w1-chrome.spec.ts` source check: it asserts `help.x < back.x < replay.x < menu.x` and EV-02's centre rule, and has no assertion that the gear is centred.
- Pass evidence: both assertions are present; no assertion places the gear within the centre third.
- Fails if: the spec still passes a build where Menu is between Back and Replay.

### EV-08 — Replay is greyed with no action on every screen
- Requirement: Q6.1 (Bob, 2026-11-14, adopted): Replay stays visible and greyed (DEC-227) with no action in 1.0.
- Method: playwright
- How: the EV-01 walk, plus a screen with a Back offer and the Menu open; at each, read the `replay` button, press it with a forced click and listen on the websocket.
- Pass evidence: on every screen `replay` is visible, `disabled`, `aria-disabled` true; the forced press sends no frame and changes no state; no Replay offer ever arrives in a view.
- Fails if: Replay is enabled on any screen, a press sends an act, or Replay is hidden.

## Survival evals (one per survival invariant in plan.md)

### EV-07 — Continue keeps the order and the greyed state
- Requirement: toolbar on every iPad after Continue, Menu closed, game not paused.
- Method: playwright
- How: reach a game screen, restart the host, Continue on the iPad.
- Pass evidence: the order of EV-01 holds on the first screen after Continue; no `[data-menu]`; Back and Replay visible, the unusable one greyed.
- Fails if: the bar is missing, reordered or the Menu comes back open.

## Assumptions surfaced

- Replay stays visible, greyed, no action in 1.0 → decided, Q6.1 (Bob, 2026-11-14, adopted); pinned by EV-08.
- Main already matches the ruling, so a build that changes nothing but adds EV-02 passes; if EV-02 fails on main, the CSS fix is in scope (`globals.css` bottom-bar rules) → none.
