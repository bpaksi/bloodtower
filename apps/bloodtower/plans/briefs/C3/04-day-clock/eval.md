Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: C3 / 04-day-clock — The day: Regroup, the move roll, the skull drop as the game clock

- Brief: ./plan.md
- Mockup: none
- Risk: High. Restore evals included.

## Checks

### EV-01 — The move roll is seeded 2d3, floor 2, with shifts
- Requirement: DEC-615, DEC-102, DEC-684.
- Method: unit
- How: `day.test.ts` "move roll": a fixed seed; a group with one helping virtue; a group whose most corrupted hero has 2 corruptions and another 1.
- Pass evidence: the virtue group rolls the seed's 2d3 +1; the corrupted group rolls −2 (the most corrupted, not the sum 3); no roll is below 2.
- Fails if: the shift sums all corruptions, or a roll of 1 is possible.

### EV-02 — Drops per night by hero count
- Requirement: 1 a night for 1–2 heroes; 1, and 2 every other night, for 3–4 (DEC-564).
- Method: unit
- How: sim four nights with 2 heroes and with 4.
- Pass evidence: 2 heroes: 1,1,1,1. 4 heroes, nights 1–4 of the game: exactly 1,2,1,2 (night 1 drops 1; even-numbered nights drop 2; Bob approved 2026-10-31, for DEC-564's "every other day" phase, Bob to confirm). Same for 3 heroes.
- Fails if: 4 heroes drop 2 every night, or 2 heroes ever drop 2.

### EV-03 — A won quest skips the whole night's drop
- Requirement: DEC-699.
- Method: unit
- How: day on which group A wins a quest; 4 heroes, on a 2-drop night; a second day where two groups each win one.
- Pass evidence: no drop that night, including the extra; the second day also skips exactly one night; the effects panel data holds "+1 day".
- Fails if: only the base drop is skipped, or two wins skip two nights.

### EV-04 — The clock shows days left
- Requirement: The board shows skulls left as days at the party's drop rate (DEC-686).
- Method: unit
- How: view projection with supply 12 and 2 heroes; and with 4 heroes.
- Pass evidence: days left 12 for 2 heroes; for 4 heroes the count at DEC-564's average rate (see Q-C3-04, answered).
- Fails if: the board shows the raw skull count only.

### EV-05 — An empty supply after a drop loses
- Requirement: The loss is checked at MEC-033 .11 after the drop (DEC-686, DEC-043).
- Method: unit
- How: supply 1, end the day.
- Pass evidence: the drop empties it; the day hands up; the chapter check reports lost with the reason `skulls`.
- Fails if: the loss fires before the drop, or a day later.

### EV-06 — The 4th skull destroys a building
- Requirement: Skulls shrink a menu; the 4th destroys it (DEC-093).
- Method: unit
- How: place skulls 1 to 4 on one building.
- Pass evidence: menus shrink per DEC-093: each skull removes the last offer above Cleanse; Cleanse and Leave always stay, and the quest marker stays first while present. Citadel: 0 skulls Rally, Virtue draw, Cleanse; 1 skull Rally, Cleanse; 2 and 3 skulls Cleanse only (Gamewright proposal, pending Bob); after the 4th the building is fallen and leaves every menu and move target as a place.
- Fails if: the 4th skull leaves the building standing.

### EV-07 — Without the tower the drop is simulated
- Requirement: DEC-305, DEC-306.
- Method: unit
- How: run the close with the tower off.
- Pass evidence: one seeded drop, its kingdom a seeded d4; no skull is held back; no tower command.
- Fails if: a tower command is queued, or skulls are held.

### EV-08 — Regroup only at the start of the day
- Requirement: DEC-640.
- Method: unit
- How: try to split a group mid-turn via a press.
- Pass evidence: refused; the Regroup step is the only node that changes groups.
- Fails if: groups change during a turn.

### EV-09 — Regroup changes groups at day start
- Requirement: DEC-640, MEC-034 .38–.42.
- Method: unit
- How: 2 heroes in one group; at day start the Regroup node runs; press split; next day press join.
- Pass evidence: the Regroup node offers split and join; after split there are 2 groups, each with its own turn that day; after join, 1 group.
- Fails if: Regroup is not offered at day start, or the split/join does not change groups.

### EV-10 — Oldest group goes first
- Requirement: DEC-148.
- Method: unit
- How: create groups A, B, C in that order (C by a later split); run a day.
- Pass evidence: turns run A, B, C in creation order, regardless of hero order or seat.
- Fails if: any other order.

### EV-11 — The adversary's move is skipped
- Requirement: DEC-644.
- Method: unit
- How: run 3 full days with a fixed seed; read the node trace and event log.
- Pass evidence: no `.23` node runs; no adversary event is logged.
- Fails if: a `.23` node runs or an adversary event appears.

### EV-12 — Four fallen buildings lose the game
- Requirement: DEC-043 fallen-buildings loss; count 4 (Bob approved 2026-10-31, Q-C3-05), read from tuning key `loss.fallen_buildings`.
- Method: unit
- How: fixed board; fell buildings one by one with skulls at the close; supply kept above 0.
- Pass evidence: after the 3rd falls the game goes on; when the 4th falls, the chapter check reports lost with reason `buildings` at MEC-033 .11; with the tuning key set to 5 in a test copy, the 4th does not lose.
- Fails if: the loss fires at 3 or 5 fallen, fires before the drop resolves, or ignores the tuning key.

## Survival evals (one per survival invariant in plan.md)

### EV-13 — Continue mid-day replays nothing
- Requirement: DEC-675, DEC-283.
- Method: unit
- How: autosave at a group's turn on day 3; Continue.
- Pass evidence: the day's rolls are not re-rolled; the next drop matches an uninterrupted run with the same seed.
- Fails if: a roll changes after Continue.

### EV-14 — Restart keeps the clock
- Requirement: Days left and skulls on buildings survive a host restart.
- Method: unit
- How: restart after day 2's drop; rebuild from the event log.
- Pass evidence: same supply, same skulls per building.
- Fails if: the supply resets to the tuning supply, or any building's skull count changes.

## Assumptions surfaced

- Days left for 3–4 heroes is supply ÷ the average night (1.5). Bob: ? (Q-C3-04, answered)

## OPEN questions

- ANSWERED Q-C3-04 (Bob approved 2026-10-31): count the actual nights the 1,2,1,2 pattern gives. Was: how is "days left" counted for 3–4 heroes, whose drop alternates 1 and 2 (DEC-564)? Floor of supply ÷ 1.5, or a count of the actual nights the pattern gives?
- ANSWERED Q-C3-05 (Bob approved 2026-10-31): 4 fallen buildings lose the game. Was: the fallen-buildings loss (DEC-043): how many fallen buildings lose the game? DEC-703 has no row for it.
