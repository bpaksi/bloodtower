Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 08-c4-game-end — The C4 game end: chapter 3 won, or lost on any chapter

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-05; survival evals last (EV-05).

## Checks

### EV-01 — Chapter 3 won ends it (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C4-01.
- Method: sim
- How: win chapter 3.
- Pass evidence: won; `[COPY: chapter 3 win, Loremaster = "The Lock is turned and the last stand held. The Warden's door is open, for now."]` key.
- Fails if: no end.

### EV-02 — A loss in chapter 2 ends it
- Requirement: DEC-117.
- Method: sim
- How: third corruption in chapter 2.
- Pass evidence: lost.
- Fails if: continues.

### EV-03 — Battle stats counted
- Requirement: DEC-116.
- Method: unit
- How: fixture game: 2 battles won, 1 retreat, 1 fall, 5 Tomb rooms entered.
- Pass evidence: stats fields `battles_won` 2, `retreats` 1, `falls` 1, `tomb_rooms` 5.
- Fails if: any field missing or a different value.

### EV-04 — New key moments
- Requirement: Q-C3-18.
- Method: unit
- How: win a battle, clear the Tomb.
- Pass evidence: the stats' key moments include `km.battle_won` and `km.tomb_cleared`, once each.
- Fails if: either id missing or listed twice.

## Survival evals (one per survival invariant in plan.md)

### EV-05 — Record stable after reload
- Requirement: DEC-116.
- Method: playwright
- How: finish, reload.
- Pass evidence: the record store holds exactly 1 record for this game id, unchanged byte for byte.
- Fails if: a count of 0 or 2, or a changed record.

## Assumptions surfaced

- Picks marked "(Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)" are drafts; an eval tied to one changes if Bob picks otherwise.

## OPEN questions

- Resolved Q-C4-01: What ends a C4 game won, before the C5 finale exists? Options: (a) chapter 3 won (The Lock and The Last Stand done) ends the game won, behind tuning switch `c4_end_after_chapter_3` (on in C4, off in C5), with the DEC-144 win scene and `[COPY: chapter 3 win, Loremaster = "The Lock is turned and the last stand held. The Warden's door is open, for now."]`; (b) chapter 3 has no end: the game plays until it is lost, and the win is tested only by fixture until C5. Gamewright pick: (a) (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET).
