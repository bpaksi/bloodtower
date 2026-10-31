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
- How: fixture with `c3_end_after_chapter_1: false` (in C3 the game ends at chapter 1, Q-C3-01); win chapter 1 with the mock tower; the seed frees 2 skulls.
- Pass evidence: card stamped won, the close Scroll, the lit seal prompt, a Reveal of the glyph and its boon, then exactly 2 freed-skull prompts, each a kingdom then a building.
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

### EV-05 — C3: stamped card and close Scroll before the outcome
- Requirement: Q-C3-01; (Bob approved 2026-10-31).
- Method: playwright
- How: C3 tuning (`c3_end_after_chapter_1: true`); win chapter 1.
- Pass evidence: in order: the card stamped won, the close Scroll reading exactly "The roads are quiet again.", then the outcome scene (feature 16); no seal prompt, no freed-skull prompt.
- Fails if: the outcome shows first, either step is skipped, or a seal or skull prompt shows.

### EV-06 — Chapter cues play
- Requirement: CUE-004 (chapter start), CUE-005 (chapter won).
- Method: playwright
- How: Begin a game; then win chapter 1 (C3 tuning); read the cue log.
- Pass evidence: CUE-004 fires once with the chapter card; CUE-005 fires once with the stamped card.
- Fails if: either cue is missing, repeated or at the wrong step.

### EV-07 — The next chapter's enter lights its kingdom
- Requirement: MEC-033 .3, DEC-662.
- Method: playwright
- How: fixture with `c3_end_after_chapter_1: false`; win chapter 1 without the tower.
- Pass evidence: after the close, Brynthia is lit on the board and chapter 2's quest tokens (The Barrow, The Shrine) are placed, then chapter 2's card shows.
- Fails if: Brynthia stays dark or tokens are missing.

## Survival evals (one per survival invariant in plan.md)

### EV-08 — No replay on Continue
- Requirement: DEC-675.
- Method: playwright
- How: quit on day 2 of chapter 1; Continue.
- Pass evidence: no chapter card.
- Fails if: the card replays.

## Assumptions surfaced

- None beyond the cards cited.

## OPEN questions

- ANSWERED Q-C3-17 (Bob approved 2026-10-31): the base pack supplies the boons and the app picks; The Ruined Keep names none in 1.0. (which boons)
