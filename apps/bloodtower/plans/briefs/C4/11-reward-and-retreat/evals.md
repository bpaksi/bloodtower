Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 11-reward-and-retreat — The battle's end on screen: reward, retreat and fall

- Brief: ./plan.md
- Mockup: ./mockup.html (to be drawn from ./screen-spec.md)
- Done-when: EV-01 … EV-05; the survival eval is last (EV-05).

## Checks

### EV-01 — Reward Reveal
- Requirement: UI-040.
- Method: playwright
- How: win a battle.
- Pass evidence: gold and card on a Reveal.
- Fails if: no Reveal.

### EV-02 — Who takes it is picked on the iPad
- Requirement: UI-040.
- Method: playwright
- How: 2 heroes.
- Pass evidence: iPad lists both; pick gives the card.
- Fails if: auto-given.

### EV-03 — Retreat shows the step-up
- Requirement: UI-039.
- Method: playwright
- How: retreat.
- Pass evidence: foe painting, "level 2 → 3".
- Fails if: missing.

### EV-04 — Screenshots match
- Requirement: UI-039, UI-040.
- Method: screenshot
- How: board and iPad; mockup `#reward`, `#retreat`, `#fall`.
- Pass evidence: matching.
- Fails if: differs.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Untaken card survives Continue
- Requirement: DEC-675.
- Method: playwright
- How: quit before pick; Continue.
- Pass evidence: picker again, same card.
- Fails if: card lost.

## Assumptions surfaced

- Picks marked "(Gamewright pick, pending Bob)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- None.
