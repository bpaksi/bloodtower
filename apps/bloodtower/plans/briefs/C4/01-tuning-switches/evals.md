Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 01-tuning-switches — The C4 switches: Fight on, all chapters on, the C4 end rule

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-06; survival evals last (EV-05 … EV-06).

## Checks

### EV-01 — Fight is on
- Requirement: tuning.
- Method: unit
- How: load base tuning.
- Pass evidence: `fight_enabled` is true.
- Fails if: false or missing.

### EV-02 — Chapter 1 no longer ends the game
- Requirement: DEC-133.
- Method: sim
- How: fixed seed, win chapter 1.
- Pass evidence: chapter 2's card opens; no outcome.
- Fails if: the game ends won.

### EV-03 — Chapter 3 won ends the C4 game (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C4-01.
- Method: sim
- How: fixture at chapter 3 with both quests done.
- Pass evidence: game ends won; record says `end: chapter_3`.
- Fails if: chapter 4 or no end.

### EV-04 — Schema rejects an unknown switch
- Requirement: DEC-500.
- Method: unit
- How: tuning with `fight_enable: true`.
- Pass evidence: load fails with the field named.
- Fails if: silently ignored.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Tuning fixed at Begin survives Continue
- Requirement: C3 B2.
- Method: playwright
- How: Begin, quit, edit tuning file, Continue.
- Pass evidence: the game keeps the Begin values.
- Fails if: new values read.

### EV-06 — A C3 save is not resumed under C4
- Requirement: the plan's survival rule; C3 B2 (tuning fixed at Begin), Q-C3-07 (drop, not migrate).
- Method: playwright
- How: load a fixture save written under the C3 switches (`c3_end_after_chapter_1: true`, `fight_enabled: false`); start the host; open Continue.
- Pass evidence: the save is not offered for Continue; the host logs `save skipped: pre-C4 format` once; a new game can Begin.
- Fails if: the C3 save resumes, or the host errors.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Resolved Q-C4-01: What ends a C4 game won, before the C5 finale exists? Options: (a) chapter 3 won (The Lock and The Last Stand done) ends the game won, behind tuning switch `c4_end_after_chapter_3` (on in C4, off in C5), with the DEC-144 win scene and `[COPY: chapter 3 win, Loremaster = "The Lock is turned and the last stand held. The Warden's door is open, for now."]`; (b) chapter 3 has no end: the game plays until it is lost, and the win is tested only by fixture until C5. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
