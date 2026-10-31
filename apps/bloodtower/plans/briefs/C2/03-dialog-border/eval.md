Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C2 / 03-dialog-border — Every Story board dialog keeps a border

- Brief: ./plan.md
- Mockup: ./mockup.html
- Risk: Low

## Checks

### EV-01 — Every board dialog leaves the border
- Requirement: every Story board dialog leaves at least 5% of the board's height above and below, and 5% of its width at each side (DEC-705).
- Method: playwright
- How: new `c2-dialog-border.spec.ts`, "every board dialog keeps the DEC-705 border": walk the startup flow with the tower off (splash, pick story, game settings, tower connect, claim heroes, each setup step, begin), then the waiting dialog in play, the pause, and the session screen. On each, measure every `.bt-dialog-frame` bounding box against `main.bt-board`.
- Pass evidence: on every screen, top ≥ 5% and bottom gap ≥ 5% of the board height, and left and right gaps ≥ 5% of the board width. The test lists each screen it measured (at least 10).
- Fails if: any dialog, the tower-connect one included, comes closer than 5% to an edge.
- Viewports: 1920×1080 and 3840×2160.

### EV-02 — Long content fits inside, with no scroll or clipped text
- Requirement: when the content is long, the dialog cuts it down or sets it smaller; the board never scrolls or clips text (DEC-705, SCR-013).
- Method: playwright
- How: in the same spec, on claim heroes with all six heroes listed (the longest startup dialog) at 1920×1080: check `document.scrollingElement.scrollHeight <= innerHeight`, and for every text element inside the frame `scrollHeight <= clientHeight + 1` and `scrollWidth <= clientWidth + 1`.
- Pass evidence: no page scroll; no text box overflows.
- Fails if: the dialog keeps the border by hiding overflow (`overflow: hidden` that cuts text) or by adding a scrollbar.

### EV-03 — Screenshot matches the mockup
- Requirement: the connect dialog sits inside a visible border of the landing painting (DEC-705; mockup).
- Method: screenshot
- How: screenshot the board on tower-connect at 1920×1080, compare side by side with ./mockup.html at 1920×1080.
- Pass evidence: both images attached. The painting shows on all four sides, and the dialog is centred with its kicker, title, tower still, line and join block inside the frame. The still is set smaller rather than pushing the frame to the edges. The board shows no buttons (it is display only).
- Fails if: the dialog touches the top or bottom edge, as in the G-C1 photo.

### EV-04 — The 4K TV gets the same proportions
- Requirement: the rule holds on the Samsung at 3840×2160 (DEC-705).
- Method: screenshot
- How: screenshot tower-connect and claim heroes at 3840×2160, compare side by side with ./mockup.html scaled to 3840×2160.
- Pass evidence: both images attached; borders on all four sides; type scaled up, not left at 1080p size in a sea of painting.
- Fails if: the dialog grows to the full height at 4K, or stays a small 1080p box.

### EV-05 — The board look specs still pass
- Requirement: no regression in the board look (SCR-013).
- Method: playwright
- How: `board-look.spec.ts` and `keeper-fit.spec.ts` on the PR head.
- Pass evidence: all pass. Any screenshot baseline that changes because of the border is updated in the PR and listed in the body.
- Fails if: a baseline is updated with no note.

## Survival evals (one per survival invariant in plan.md)

None beyond EV-01: the rule is in the frame, so Continue draws the same.

## Assumptions surfaced

- The 5% border is a placeholder Bob tunes at the TV → DEC-705.
- "Every dialog" means every `DialogFrame` on `/board`. The Sound dialog on `/` is out of scope → plan.md.
