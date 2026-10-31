Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 05-art-through-a1 — The Ruined Keep's art and voice through the A1 adapter

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-05; survival evals last (EV-05).

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

### EV-03 — Only Loremaster lines voiced (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C5-07.
- Method: unit
- How: list audio.
- Pass evidence: Loremaster keys only.
- Fails if: others.

### EV-04 — Bob approved every final
- Requirement: Q-C5-06 (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Method: unit
- How: (manual) read ./approval.md's art checklist.
- Pass evidence: every asset id in `index.json` has a ticked line `- [x] <id> — approved by Bob <date>`.
- Fails if: any id unticked or missing.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Old save loads with new art
- Requirement: DEC-202.
- Method: playwright
- How: C4 save; Continue.
- Pass evidence: every painting slot (chapter cards, foes, Tomb, Tower levels, Warden phases, endings) renders the asset id listed in `index.json`; 0 assets tagged `placeholder`.
- Fails if: any slot shows a placeholder id or none.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Resolved Q-C5-06 **[Bob taste call]**: How is the 1.0 art made through A1? Options: (a) A1 AI mode for drafts, then Bob approves each final in the studio; (b) studio mode only, Bob directing each piece. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
- Resolved Q-C5-07 **[Bob taste call]**: Which lines are voiced in 1.0 (DEC-349)? Options: (a) the Loremaster's lines only (chapter cards, seal breaks, the two win lines, the loss); (b) none; all text on Scrolls. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
