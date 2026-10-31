Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 09-finale-and-endings — The last choice and the two endings on screen

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-06; the survival eval is last (EV-06).

## Checks

### EV-01 — Both options on every iPad
- Requirement: DEC-663.
- Method: playwright
- How: 3 heroes.
- Pass evidence: 2 buttons each.
- Fails if: fewer.

### EV-02 — Tie re-vote shown (Gamewright pick, pending Bob)
- Requirement: Q-C5-03.
- Method: playwright
- How: split vote.
- Pass evidence: `[COPY: tie, vote again = "A tie. Vote once more."]` then a second vote.
- Fails if: no re-vote.

### EV-03 — Line for the flag
- Requirement: DEC-664.
- Method: playwright
- How: each flag.
- Pass evidence: the matching `[COPY: finale win, ...]`.
- Fails if: wrong.

### EV-04 — No credits (Gamewright pick, pending Bob)
- Requirement: Q-C5-09.
- Method: playwright
- How: win.
- Pass evidence: outcome right after the line.
- Fails if: extra step.

### EV-05 — Screenshots match
- Requirement: SCR-018.
- Method: screenshot
- How: mockup `#vote`, `#shattered`, `#holds`.
- Pass evidence: matching.
- Fails if: differs.

## Survival evals (one per survival invariant in plan.md)

### EV-06 — Votes survive Continue
- Requirement: DEC-675.
- Method: playwright
- How: 1 vote, quit, Continue.
- Pass evidence: vote kept.
- Fails if: lost.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- OPEN Q-C5-03 **[Bob taste call]**: Who makes the last choice in the Tower (DEC-663)? Options: (a) each present hero votes on their iPad; a tie re-votes once, then the seeded draw (DEC-011) breaks it; (b) the hero who struck the last blow chooses; (c) the vote must be unanimous; it repeats until it is. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C5-07 **[Bob taste call]**: Which lines are voiced in 1.0 (DEC-349)? Options: (a) the Loremaster's lines only (chapter cards, seal breaks, the two win lines, the loss); (b) none; all text on Scrolls. Gamewright pick: (a) (Gamewright pick, pending Bob).
- OPEN Q-C5-09 **[Bob taste call]**: After a finale win line, before the outcome scene: Options: (a) nothing extra: the win line, then the outcome scene; (b) a short credits Scroll `[COPY: credits]`. Gamewright pick: (a) (Gamewright pick, pending Bob).

> Note (Q-C5-09): the pick is (a), no credits Scroll, so `[COPY: credits]` is not folded. If Bob picks (b): "Blood Tower: a Vellmoor story for Return to Dark Tower. Thank you for playing." (Credits line not folded.)
