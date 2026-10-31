Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C2 / 10-tower-glyph-prototype — Tower prototype: glyphs, facing, and the drums after calibrate

- Brief: ./plan.md
- Mockup: none
- Risk: Human. Tower safety: add negative evals for anything that could move the tower without a press.

## Checks

### EV-01 — Every tower action is its own press
- Requirement: nothing physical happens automatically (root CLAUDE.md, tower safety).
- Method: playwright
- How: new `setup-check.spec.ts` in tower-poc with the mock tower: open `/setup-check`, wait 10 s with no input, then step through the page one press at a time, reading the mock's sent-command list after each press.
- Pass evidence: no command before the first press; then exactly one tower command per press (calibrate, one light, one rotate), and none between presses.
- Fails if: the page calibrates on load, lights a side after calibrate, or chains a rotate after an answer.

### EV-02 — Glyph answers are recorded against the library's table
- Requirement: after calibrate the player says which glyph shows on each drum side, and the page compares it with the library's table (DEC-103, Q-033).
- Method: unit
- How: feed answers for all 12 sides (3 drums × 4), some matching, some not, one blank.
- Pass evidence: 12 entries with expected, seen, match; the blank reads `unknown`, never `match`.
- Fails if: a blank answer counts as a match.

### EV-03 — The facing question uses one lit side
- Requirement: light one side; the player taps the kingdom it faces (MEC-017).
- Method: playwright
- How: same spec: after calibrate, press "Light north side", then tap a kingdom.
- Pass evidence: one `lighting.set` (or `lighting.set-led`) command for the north side only; the record stores `north → <kingdom>`.
- Fails if: more than one side is lit, or the kingdom is stored with no light sent.

### EV-04 — Rotate to a saved position goes through the executor
- Requirement: a press can turn a drum to a chosen position (Q-402 option); mechanics need calibration (D9).
- Method: playwright
- How: same spec: before calibrate, try "Turn top drum to east"; then calibrate and try again.
- Pass evidence: before calibrate the button is disabled and nothing is sent. After calibrate, one `mechanics.rotate-drum` with `{drumIndex: 0, position: 1}`, through `command{capabilityId, params}`.
- Fails if: it sends before calibrate, or builds raw bytes.

### EV-05 — Skull-count tries are recorded
- Requirement: the run counts skulls that stay inside after a box-up (Q-032, Q-402).
- Method: unit
- How: `setupCheck.test.ts`, "skull tries": record 10 tries with counts in and out.
- Pass evidence: the summary gives tries, total dropped, total stayed inside and the share; a try with no count is left out of the share and listed. With 9 counted tries, the summary marks the run incomplete (`tries < 10`).
- Fails if: a missing count is read as zero (the "unknown is never zero" rule).

### EV-06 — Errors from the tower are shown
- Requirement: an error tied to a press is shown to the person with its code (root CLAUDE.md, Errors).
- Method: playwright
- How: same spec, with the mock set to fail calibrate.
- Pass evidence: the page shows the error code from the executor next to the calibrate step, and the step stays undone.
- Fails if: the failure is swallowed and the page moves on.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — Answers survive a reload
- Requirement: a run can stop and pick up later.
- Method: playwright
- How: answer two glyph sides, the facing, one rotate result and two skull tries; reload the page.
- Pass evidence: all are still shown; the tower state shows as unknown until the next calibrate press; no command is resent.
- Fails if: answers are lost, or reload recalibrates.

## Assumptions surfaced

- Answers are kept in the page's local storage. This is a prototype, not Bloodtower's event log → Claude; Bob: OK?
- The box-up test is Bob's by hand. The page only records counts → plan.md.
