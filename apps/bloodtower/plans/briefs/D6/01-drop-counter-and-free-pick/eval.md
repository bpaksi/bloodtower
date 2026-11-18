Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: D6 / 01-drop-counter-and-free-pick — One counter of drop nights; Fortunate's free pick with no moves left

- Brief: ./plan.md
- Mockup: none
- Risk: High (the game clock; restore). Negative and restore evals are included.

All fixtures: the test pack, base tuning (supply 24; `drops_a_night` 1 for 1 or 2 heroes, 1 each night and 2 every other night for 3 or 4; `quest_skips` on; Rest +3 hit points a move; rally 5 gold and 1 move; virtue draw 10 gold and 1 move; Cleanse 1 move, 0 gold). "N" is the saved counter of counted nights. A hero holds Fortunate through `giveVirtue` or `~test-virtue-ids:`. No Uncertain, Tempted or Bard unless named. Source: DEC-912's R03 schedule fixture, DEC-913's R02 fixtures, DEC-945 to DEC-947.

## Checks

### EV-01 — The due drop by party size, by N
- Requirement: DEC-912, DEC-822, DEC-824, DEC-564.
- Method: unit
- How: `dropCounter.test.ts` "EV-01". `dropsThisNight` for 1, 2, 3 and 4 heroes, N = 1 to 8.
- Pass evidence: 1 hero: 1,0,1,0,1,0,1,0. 2 heroes: 1,1,1,0,1,1,1,0. 3 heroes and 4 heroes: 1,2,1,2,1,2,1,2.
- Fails if: any value differs (a pair at 1 every night, a solo at 1 every night, or 2 on an odd N).

### EV-02 — A won-quest night drops nothing and does not move N
- Requirement: DEC-912, DEC-699.
- Method: unit
- How: `dropCounter.test.ts` "EV-02". Run the day loop, no tower, nights 1 to 6, with a quest won on day 2 only; once each with 1, 2 and 3 heroes. Record each night's drop and N after it.
- Pass evidence: drops: 1 hero 1,0,0,1,0,1; 2 heroes 1,0,1,1,0,1; 3 heroes 1,0,2,1,2,1. N after each night: 1,1,2,3,4,5 in all three. Night 2's effects hold "+1 day".
- Fails if: night 2 drops, N moves on night 2, or a later night follows the calendar (2 heroes dropping 0 on night 4, or 3 heroes dropping 1 on night 3).

### EV-03 — The tower and the simulated drop take the same count
- Requirement: DEC-912, DEC-305.
- Method: unit
- How: `dropCounter.test.ts` "EV-03". (a) 3 heroes, N = 1 so far, no quest won: run the night once with the tower linked and once without. (b) 2 heroes, N = 3 so far: the same two ways.
- Pass evidence: (a) linked: exactly 2 skull placement prompts, one after the other, then the night ends; unlinked: exactly 2 seeded skulls, each its own kingdom draw. (b) both ways: no skull prompt, no skull drawn, supply unchanged, N = 4.
- Fails if: the counts differ between the two ways, or (b) drops or prompts a skull.

### EV-04 — Days left counts every night, a no-drop night included
- Requirement: DEC-947, DEC-912, Q-C3-04.
- Method: unit
- How: `dropCounter.test.ts` "EV-04". `daysLeft` with (supply, heroes, from N): (12, 1, 1), (12, 2, 1), (12, 3, 1), (12, 4, 1), (23, 2, 2), (1, 1, 2), (0, 2, 1).
- Pass evidence: 23, 15, 8, 8, 30, 2, 0. No call throws.
- Fails if: any value differs (12 for 2 heroes, or skipping the no-drop nights), or a 0-drop night throws.

### EV-05 — The band reads the counted nights, plus tonight after a won quest
- Requirement: DEC-947, DEC-686, UI-028.
- Method: unit
- How: `dropCounter.test.ts` "EV-05" on the session view. 2 heroes, supply 24. (a) Day 1, before the drop. (b) Day 2, after night 1's drop. (c) Day 2 again after a quest is won that day. (d) The same as (c) with `quest_skips` off.
- Pass evidence: (a) 31; (b) 30; (c) 31; (d) 30. The changed `c3-day.spec.ts` shows "31 days left" on day 1 and "30 days left" after day 1's drop.
- Fails if: (a) 24, (b) 23, (c) 30, or (d) 31.

### EV-06 — The free pick with no moves left
- Requirement: DEC-913, DEC-399 (R02: the last move on a rest, then a free pick at 0 moves).
- Method: unit
- How: `freePick.test.ts` "EV-06" through the encounter loop. One group, hero-a holds Fortunate, 4/12 hit points, 10 gold, at a village with 1 skull, 1 move. Rest for 1 move; read the menu; pick Cleanse; read the menu.
- Pass evidence: after the Rest: 0 moves; Rest and Cleanse enabled, each cost line beginning "0 moves". After Cleanse: the village has 0 skulls, supply +1, 0 moves, gold 10; every pick greyed, "No moves left." on Rest; Leave works.
- Fails if: the menu closes or greys at 0 moves before the free pick, the Cleanse takes a move or makes moves negative, or a third pick is offered.

### EV-07 — A turn end comes first: Uncertain loses the free pick
- Requirement: DEC-913, DEC-468, DEC-945.
- Method: unit
- How: `freePick.test.ts` "EV-07". As EV-06, but hero-a also holds Uncertain and has 2 moves. Pick Rest for 1 move.
- Pass evidence: the turn has ended (`turnHasEnded`), moves 0, no free pick pending, every pick greyed; the day's free pick is recorded as not taken.
- Fails if: any pick is enabled after the Rest, or the day's free pick is recorded as taken.

### EV-08 — Cleanse once per building per turn, the free pick included
- Requirement: DEC-572, DEC-913, DEC-946.
- Method: unit
- How: `freePick.test.ts` "EV-08". (a) As EV-06 with 2 skulls and 1 move: Cleanse; read the menu; press Cleanse; pick Rest for 1. (b) No Fortunate, 3 moves, 2 skulls: Cleanse; Leave; Enter again the same turn; read the menu. Next day, Enter; read the menu.
- Pass evidence: (a) after the first Cleanse, 1 skull; the Cleanse row greyed with "Cleanse is not possible now."; the press refused with those words and 1 skull still; the free pick still pending, and the Rest takes no move (+3 hit points). (b) the same turn: Cleanse greyed, 1 skull; the next day: Cleanse enabled.
- Fails if: a second Cleanse lands in one turn at one building, the refusal spends the free pick, or Cleanse is still greyed the next day.

### EV-09 — One free pick a day per group, spent only when taken
- Requirement: DEC-945, DEC-399.
- Method: unit
- How: `freePick.test.ts` "EV-09". One group, hero-a and hero-b both hold Fortunate, 6 moves, at building X. Rest 1; Leave (no free pick). Put the group on building Y; Enter; Rest 1; read the menu; Rest 1 (the free pick); read the menu. Put the group on building Z; Enter; Rest 1; read the menu.
- Pass evidence: at X after the Leave, no free pick pending. At Y after the first Rest, cost lines read "0 moves"; the free Rest takes no move; after it, cost lines read "1 move". At Z after the first Rest, cost lines read "1 move". Moves left at the end: 3.
- Fails if: the Leave at X spends the day's free pick, two holders give two free picks, or Z offers a free pick.

### EV-10 — The free pick still pays its gold
- Requirement: DEC-945, DEC-896.
- Method: unit
- How: `freePick.test.ts` "EV-10". One group, hero-a holds Fortunate, 15 gold, 1 move, at a citadel. Rally; read the menu; Virtue draw.
- Pass evidence: after Rally: gold 10, moves 0, Virtue draw enabled with cost line "0 moves · 10 gold". After the draw: gold 0, moves 0, one tile drawn.
- Fails if: the draw costs no gold, takes a move, or is greyed.

### EV-11 — A free Rest waives one move
- Requirement: DEC-946, MEC-075.
- Method: unit
- How: `freePick.test.ts` "EV-11". hero-a holds Fortunate, 2/12 hit points, at a village with 1 skull. (a) 1 move: Cleanse, then Rest; read the moves step. (b) 2 moves, a fresh day: Rest 1, then Rest; read the moves step.
- Pass evidence: (a) the moves step offers exactly "1"; resting 1 gives 5/12 and moves stay 0. (b) the step offers "1" and "2"; resting 2 gives 2 + 3 + 6 = 11/12 and moves end at 0.
- Fails if: (a) offers no choice or makes moves negative; (b) offers only "1", or resting 2 leaves moves other than 0.

### EV-12 — End to end: rest to 0 moves, then the free Cleanse
- Requirement: DEC-913, DEC-946.
- Method: playwright
- How: `apps/bloodtower/src/e2e/tests/d6-fortunate.spec.ts`, iPad 768x1024 portrait. Seed `~test-event:none~test-virtue-ids:hero-a=fortunate~test-skulls:N-egans-end=1~test-hp:hero-a=4/12~test-at:N-egans-end~test-seat-together`. Play to the first group's menu at the village; Rest for all moves left; read the menu; press Cleanse.
- Pass evidence: after the Rest the menu stays open and the Cleanse row reads "0 moves" and is enabled; after the press the board shows "−1 skull · +1 day" and the village has no skull; the menu then shows every pick greyed and Leave enabled.
- Fails if: the menu closes at 0 moves, Cleanse is greyed, or a further pick is enabled.

## Survival evals (one per survival invariant in plan.md)

### EV-13 — Continue keeps the counter and the free pick
- Requirement: survival invariants 1 and 2; DEC-675.
- Method: unit
- How: (a) `dropCounter.test.ts` "EV-13a": 2 heroes, EV-02's run; save after night 2 (the won quest) and after night 4; restore each and run on to night 6; compare with the uninterrupted run. (b) `freePick.test.ts` "EV-13b": save in EV-08 (a) after the first Cleanse (free pick pending, the village Cleansed); restore; read the menu; then replay the first Cleanse's pick event from the log.
- Pass evidence: (a) the same N, drops and band at every night as the uninterrupted run. (b) after the restore: Cleanse greyed, the free pick pending ("0 moves" lines); after the replay: still 1 skull, still one free pick pending, moves unchanged.
- Fails if: N resets or drifts, a restore re-grants a used free pick or Cleanse, or the replay applies the Cleanse twice.

## Assumptions surfaced
- "Day" for the free pick is the play's day number; a group has one turn a day.
- A quest pick is not on the live menu on main; any turn end clears the pending free pick, so DEC-821 will need no D6 change (plan.md, Follow-up).
- The skull counts per drop stay in `packs/base/tuning.yaml`; only which nights drop changes for 1 or 2 heroes.
