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
- Pass evidence: scene id `loss-skulls`, its Painting and `[COPY: ...]` narration; exactly one summary line matching `/^\d+ days\. \d+ quests done\. \d+ skulls on the board\.$/` with the fixture's numbers; iPads Next only.
- Fails if: a Done button, another scene id, or the summary does not match.

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

### EV-05 — The C3 win scene
- Requirement: Q-C3-01; Q-C3-23 (Bob approved 2026-10-31).
- Method: playwright
- How: C3 tuning; win chapter 1.
- Pass evidence: in order: the DEC-144 win scene (scene id `win`) plays, then the Loremaster line `[COPY: chapter 1 win, Loremaster]` (DEC-232), then the summary line and Next.
- Fails if: a loss scene, no scene, the Loremaster line is missing or comes before the scene, a finale line (DEC-663/664) shows, or no summary.

### EV-06 — Next goes to Game stats
- Requirement: SCR-018, DEC-627.
- Method: playwright
- How: on any outcome scene, press Next on one iPad.
- Pass evidence: every device moves to Game stats (feature 17) for this game.
- Fails if: it goes to the session screen or stays.

### EV-07 — The defeat light plays on a loss
- Requirement: CUE-003.
- Method: playwright
- How: run to the skulls loss; then run to a C3 win; read the cue log.
- Pass evidence: CUE-003 fires once with the loss scene; it does not fire on the win.
- Fails if: missing on the loss, or fired on the win.

## Survival evals (one per survival invariant in plan.md)

### EV-08 — Restart on the outcome
- Requirement: DEC-116.
- Method: playwright
- How: restart the host on the outcome scene.
- Pass evidence: the session screen, the game listed won or lost.
- Fails if: the game shows as in progress.

## Assumptions surfaced

- In C3 the win is reached by clearing chapter 1 (Q-C3-01); the two finale lines (EV-03) are reached by fixture until C5.

## OPEN questions

- ANSWERED Q-C3-01 (Bob, 2026-10-31 10:09 AM ET): clearing chapter 1 counts as the C3 win.
- ANSWERED Q-C3-23 (Bob approved 2026-10-31): the DEC-144 win scene plays, then the Loremaster line `[COPY: chapter 1 win, Loremaster]`. Was: which win scene and line play for the C3 win? DEC-663 and DEC-664 write the win for the finale, after the last choice, which C3 never reaches. Use a placeholder `[COPY: chapter 1 win]`, or the finale's win scene without the line?
