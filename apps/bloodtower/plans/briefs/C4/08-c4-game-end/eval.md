Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C4 / 08-c4-game-end — The C4 game end: chapter 3 won, or lost on any chapter

- Brief: ./plan.md
- Mockup: none
- Done-when: EV-01 … EV-06; survival evals last (EV-05).
- Amended 2026-11-27 (Bob, via Warden): EV-02 adds chapter 1 and chapter 3 losses; EV-04's two kinds are approved; EV-06 adds the end rule to Best time.

## Checks

### EV-01 — Chapter 3 won ends it (Gamewright pick, approved by Bob 2026-10-31 6:16 PM ET)
- Requirement: Q-C4-01.
- Method: unit
- How: (sim) win chapter 3.
- Pass evidence: won; `[COPY: chapter 3 win, Loremaster = "The Lock is turned and the last stand held. The Warden's door is open, for now."]` key.
- Fails if: no end.

### EV-02 — A loss in chapter 1, 2 or 3 ends it (Amended 2026-11-27, Bob via Warden)
- Requirement: DEC-117.
- Method: unit
- How: (sim) a third corruption in chapter 1, then the same in chapter 2, then the same in chapter 3.
- Pass evidence: each game is lost. Chapter 3 does not play on, and chapter 1 does not open chapter 2.
- Fails if: any of the three continues.

### EV-03 — Battle stats counted
- Requirement: DEC-116.
- Method: unit
- How: fixture game: 2 battles won, 1 retreat, 1 fall, 5 Tomb rooms entered.
- Pass evidence: stats fields `battles_won` 2, `retreats` 1, `falls` 1, `tomb_rooms` 5.
- Fails if: any field missing or a different value.

### EV-04 — New key moments (approved Bob, 2026-11-27, via Warden)
- Requirement: DEC-955.
- Method: unit
- How: win a battle, clear the Tomb.
- Pass evidence: the stats' key moments include `km.battle_won` and `km.tomb_cleared`, once each.
- Fails if: either id missing or listed twice.

### EV-06 — Best time's key includes the end rule (Bob, 2026-11-27, via Warden)
- Requirement: DEC-917.
- Method: unit
- How: two won games of the same story, length, difficulty and party size. One ends under `c4_end_after_chapter_3` at 40 min. The other plays on to the Tower and wins at 90 min. Read each game's best.
- Pass evidence: the chapter-3 win's best is 40 min, not 90; the Tower win's best is 90 min, not 40.
- Fails if: either game uses the other's time as its best.

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
