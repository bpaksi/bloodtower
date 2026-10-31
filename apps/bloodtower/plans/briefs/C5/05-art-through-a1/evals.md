Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 05-art-through-a1 — The Ruined Keep's art and voice through the A1 adapter

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-04; the survival eval is last (EV-04).

## Checks

### EV-01 — No missing asset
- Requirement: DEC-202.
- Method: unit
- How: pack lint.
- Pass evidence: every asset ID resolves.
- Fails if: a miss.

### EV-02 — No placeholder left
- Requirement: DEC-593.
- Method: unit
- How: scan index.
- Pass evidence: no `placeholder` tag.
- Fails if: one left.

### EV-03 — Only Loremaster lines voiced (Gamewright pick, pending Bob)
- Requirement: Q-C5-07.
- Method: unit
- How: list audio.
- Pass evidence: Loremaster keys only.
- Fails if: others.

## Survival evals (one per survival invariant in plan.md)

### EV-04 — Old save loads with new art
- Requirement: DEC-202.
- Method: playwright
- How: C4 save; Continue.
- Pass evidence: art shows, no error.
- Fails if: error.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C5-06 **[Bob taste call]**: How is the 1.0 art made through A1? Options: (a) A1 AI mode for drafts, then Bob approves each final in the studio; (b) studio mode only, Bob directing each piece. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C5-07 **[Bob taste call]**: Which lines are voiced in 1.0 (DEC-349)? Options: (a) the Loremaster's lines only (chapter cards, seal breaks, the two win lines, the loss); (b) none; all text on Scrolls. Gamewright pick: (a) (Gamewright pick, pending Bob).
