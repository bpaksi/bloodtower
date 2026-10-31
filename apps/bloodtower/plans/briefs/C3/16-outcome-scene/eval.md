Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 16-outcome-scene — The outcome scene: win or loss

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Risk: Med.

## Checks

### EV-01 — The loss scene for skulls
- Requirement: DEC-144.
- Method: playwright
- How: `c3-outcome.spec.ts`: a seeded game run to an empty supply (fixture shortens the supply).
- Pass evidence: the skulls loss Painting and `[COPY: ...]` narration; one summary line; iPads Next only.
- Fails if: a Done button, or the generic loss.

### EV-02 — The corruption loss
- Requirement: DEC-676.
- Method: playwright
- How: third corruption in a scene.
- Pass evidence: the corruption loss scene at once.
- Fails if: the day finishes first.

### EV-03 — Each win ending
- Requirement: DEC-664.
- Method: playwright
- How: fixture-driven finale with each flag.
- Pass evidence: two different closing lines.
- Fails if: the same line.

### EV-04 — Screenshots match
- Requirement: SCR-018.
- Method: screenshot
- How: board and iPad at win and loss; compare with ./mockup.html `#win`, `#loss`.
- Pass evidence: four images matching.
- Fails if: a part missing.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Restart on the outcome
- Requirement: DEC-116.
- Method: playwright
- How: restart the host on the outcome scene.
- Pass evidence: the session screen, the game listed won or lost.
- Fails if: the game shows as in progress.

## Assumptions surfaced

- In C3 the win is reached by clearing chapter 1 (Q-C3-01); the two finale lines (EV-03) are reached by fixture until C5.

## OPEN questions

- ANSWERED Q-C3-01 (Bob, 2026-10-31 10:09 AM ET): clearing chapter 1 counts as the C3 win.
- Q-C3-23: which win scene and line play for the C3 win? DEC-663 and DEC-664 write the win for the finale, after the last choice, which C3 never reaches. Use a placeholder `[COPY: chapter 1 win]`, or the finale's win scene without the line?
