Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C5 / 04-game-end-finale — The real end: the Tower won ends the game; the C4 end rule goes

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-06; survival evals last (EV-05).
- Amended 2026-11-27 (Bob, via Warden): EV-06 is hook, then flag, then outcome. No new e2e spec is filed for the retired end-switch paths.

## Checks

### EV-01 — Chapter 3 no longer ends it
- Requirement: MEC-032.
- Method: unit
- How: (sim) win chapter 3.
- Pass evidence: finale opens.
- Fails if: ends.

### EV-02 — Two win lines by flag
- Requirement: DEC-664.
- Method: unit
- How: (sim) each flag.
- Pass evidence: its own `[COPY]` key.
- Fails if: wrong line.

### EV-03 — Old switches gone
- Requirement: DEC-500.
- Method: unit
- How: load tuning with `c4_end_after_chapter_3`.
- Pass evidence: load fails naming the field.
- Fails if: accepted.

### EV-04 — The C3 switch is gone too
- Requirement: DEC-500.
- Method: unit
- How: load tuning with `c3_end_after_chapter_1`.
- Pass evidence: load fails naming the field.
- Fails if: accepted.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Chapter-3 save resumes into the finale
- Requirement: DEC-675.
- Method: playwright
- How: fixture save; Continue.
- Pass evidence: finale.
- Fails if: outcome.

### EV-06 — Hook, then flag, then outcome (Bob, 2026-11-27, via Warden)
- Requirement: DEC-689, MEC-076.
- Method: unit
- How: win the Warden's battle.
- Pass evidence: the log order is the Tower end hook, then the finale flag, then the outcome. Each once.
- Fails if: the outcome precedes the hook or the flag, or any of the three is missing.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- None.
