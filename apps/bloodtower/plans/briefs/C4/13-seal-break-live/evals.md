Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 13-seal-break-live — The seal break live on the board, chapters 1 and 2

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-05; the survival eval is last (EV-05).

## Checks

### EV-01 — Order: stamp, Scroll, seal, glyph, skulls
- Requirement: UI-044.
- Method: playwright
- How: tower; win chapter 1.
- Pass evidence: in that order.
- Fails if: out of order.

### EV-02 — Chapter's own seal line (Gamewright pick, pending Bob)
- Requirement: Q-C4-10.
- Method: playwright
- How: win chapters 1 and 2.
- Pass evidence: two different `[COPY]` keys.
- Fails if: same key.

### EV-03 — Freed skulls picked on the iPad
- Requirement: DEC-303.
- Method: playwright
- How: 2 freed skulls.
- Pass evidence: two kingdom-then-building picks.
- Fails if: auto.

### EV-04 — Screenshots match
- Requirement: UI-044.
- Method: screenshot
- How: mockup `#seal`, `#skull`.
- Pass evidence: matching.
- Fails if: differs.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Skull placement survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: place 1 of 2, quit, Continue.
- Pass evidence: prompt for skull 2.
- Fails if: restart at 1.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C4-10 **[Bob taste call]**: Who speaks the seal-break line at each chapter win? Options: (a) the Loremaster, one line per chapter: `[COPY: seal break ch1, Loremaster]`, `[COPY: seal break ch2, Loremaster]`; (b) the Narrator, one shared line `[COPY: seal break, Narrator]`. Gamewright pick: (a) (Gamewright pick, pending Bob).
