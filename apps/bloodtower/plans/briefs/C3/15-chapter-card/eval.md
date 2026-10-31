Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 15-chapter-card — The chapter card and the chapter end with the seal break

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Risk: Med.

## Checks

### EV-01 — Chapter card at the start
- Requirement: UI-020.
- Method: playwright
- How: `c3-chapter.spec.ts`: Begin a game.
- Pass evidence: the card for The Roads: painting, name, goal `[COPY: ...]`, Next on the iPad.
- Fails if: no card.

### EV-02 — Stamped won, then the seal
- Requirement: UI-044, DEC-303.
- Method: playwright
- How: win chapter 1 (fixture) with the mock tower.
- Pass evidence: card stamped won, the close Scroll, the lit seal prompt, a Reveal of the glyph and its boon, then freed-skull prompts if any.
- Fails if: seal before the stamp.

### EV-03 — No seal without the tower
- Requirement: DEC-306.
- Method: playwright
- How: same, without the tower.
- Pass evidence: stamp and close only.
- Fails if: a seal prompt.

### EV-04 — Screenshots match
- Requirement: UI-020, UI-044.
- Method: screenshot
- How: board and iPad at start card, stamped card, seal Reveal; compare with ./mockup.html `#card`, `#stamped`, `#seal`.
- Pass evidence: six images matching.
- Fails if: a part missing.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — No replay on Continue
- Requirement: DEC-675.
- Method: playwright
- How: quit on day 2 of chapter 1; Continue.
- Pass evidence: no chapter card.
- Fails if: the card replays.

## Assumptions surfaced

- None beyond the cards cited.

## OPEN questions

- Q-C3-17 (which boons)
