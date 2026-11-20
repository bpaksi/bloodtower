Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: D5 / 01-pool-pays — Any gold in the pool pays a priced choice; the heroes present pay first

- Brief: ./plan.md
- Mockup: none
- Risk: Med (gold on every hero's sheet; restore). Negative and restore evals are included.

All fixtures: the test pack, base tuning (rally 5 gold and 1 move, virtue draw 10 gold and 1 move, `events.pay_off` 5, windfall 5, toll 10 gold or 2 hit points each, Cruel loss 2, Feral loss 2), no Bard and no Tempted in any group unless named. "Group A" is the acting group; "group B" is another group elsewhere on the board. Gold is each hero's sheet gold. Seats run hero-a, hero-b, hero-c, hero-d. Source: DEC-911's R06 fixtures and DEC-944.

## Checks

### EV-01 — Remote funding: an empty group buys from the pool
- Requirement: DEC-911 (affordable means the pool; step 3).
- Method: unit
- How: `pay.test.ts` "EV-01", and `pool.test.ts` "EV-01 live" through `openMenu` and `applyPick`. Group A is hero-a with 0 gold at a citadel, 3 moves. Group B is hero-b with 10. Open the menu; pick Rally on hero-a.
- Pass evidence: Rally is listed enabled; the pick succeeds; hero-a 0, hero-b 5; the pool goes 10 → 5.
- Fails if: Rally is greyed or refused `no-gold`, hero-a goes below 0, or hero-b is not the one who pays.

### EV-02 — A short present hero is covered by the present heroes, not the absent ones
- Requirement: DEC-911 steps 1 and 2; DEC-646 (a cost's odd coin from a hero holding the most).
- Method: unit
- How: `pay.test.ts` "EV-02". Group A: hero-a 1, hero-b 9. Group B: hero-c 10. A pays 5.
- Pass evidence: hero-a 0, hero-b 5, hero-c 10. (Shares 2 and 3, the odd coin from hero-b; hero-a is 1 short and hero-b covers it.)
- Fails if: hero-c pays anything, hero-a goes below 0, or the pool changes by anything but 5.

### EV-03 — The absent heroes pay only what the present heroes together lack, the same way
- Requirement: DEC-911 step 3.
- Method: unit
- How: `pay.test.ts` "EV-03". Group A: hero-a 1, hero-b 1. Group B: hero-c 3, hero-d 10. A pays 10.
- Pass evidence: hero-a 0, hero-b 0, hero-c 0, hero-d 5. (A pays 2; the 8 left is split 4 and 4 across B; hero-c is 1 short and hero-d covers it.)
- Fails if: A keeps any gold, B pays more than 8, hero-c goes below 0, or hero-d pays all 8 while hero-c keeps gold.

### EV-04 — A pool 1 short greys the pick; at the price it is open
- Requirement: DEC-911 (a buy is greyed only if the pool cannot cover it).
- Method: unit
- How: `pool.test.ts` "EV-04". Group A: hero-a 4 at a citadel. Group B: hero-b 5. Open the menu; press Virtue draw. Then set hero-b to 6 and repeat.
- Pass evidence: pool 9: Virtue draw greyed with "Not enough gold." and the press refused `no-gold`; no gold moves. Pool 10: enabled; after the draw both heroes hold 0.
- Fails if: the draw is enabled at 9, any gold moves on the refusal, or it is greyed at 10.

### EV-05 — The odd coins come from the heroes holding the most
- Requirement: DEC-911 step 1; DEC-646 (ties by seat).
- Method: unit
- How: `pay.test.ts` "EV-05". Group A: hero-a 7, hero-b 7, hero-c 4. A pays 5.
- Pass evidence: hero-a 5, hero-b 5, hero-c 3.
- Fails if: hero-c pays a leftover coin, or one hero pays both leftover coins.

### EV-06 — Conservation over seeded fixtures
- Requirement: DEC-911 (the pool falls by exactly the price; no hero below 0; absent heroes pay only on a present shortfall).
- Method: unit
- How: `pay.test.ts` "EV-06". 500 seeded cases: 1 to 4 heroes split into 1 to 3 groups, each hero 0 to 30 gold, a price 0 to 40 with price ≤ pool.
- Pass evidence: in every case the pool falls by exactly the price; no hero ends below 0; when the present heroes held at least the price, no absent hero's gold changed; the same seed gives the same result twice.
- Fails if: any case breaks one of these.

### EV-07 — Own-share losses stay with the holder
- Requirement: DEC-911, DEC-944, DEC-896 (Cruel and Feral from the holder's own gold, never covered).
- Method: unit
- How: `pool.test.ts` "EV-07". Group A at a village, 3 moves: hero-a holds Cruel and 1 gold, hero-b 10 gold at 4/12 hit points. Group B: hero-c 10. (a) Pick Rest on hero-b for 1 move. (b) Set hero-a to 0 with Feral and end A's turn on the village space.
- Pass evidence: (a) hero-a 0, hero-b 10, hero-c 10 (the loss of 2 takes only hero-a's 1). (b) every hero's gold unchanged.
- Fails if: hero-b or hero-c pays any of the loss, or anyone goes below 0.

### EV-08 — Pay them off is a priced choice: the pool pays it
- Requirement: DEC-944, DEC-911, DEC-023.
- Method: unit
- How: `event/pool.test.ts` "EV-08". A foes event for group A, hero-a 2. Group B: hero-b 10. Read the options and the event panel; choose Pay them off.
- Pass evidence: Pay them off enabled; the panel's purse reads 12; after the choice hero-a 0, hero-b 7.
- Fails if: Pay them off is disabled, the panel shows 2, or hero-b pays more than 3.

### EV-09 — A gain goes to the heroes present, the leftover to the one holding least
- Requirement: DEC-178, DEC-646, DEC-944.
- Method: unit
- How: `event/pool.test.ts` "EV-09". A windfall for group A: hero-a 3, hero-b 0. Group B: hero-c 0.
- Pass evidence: hero-a 5, hero-b 3, hero-c 0.
- Fails if: hero-a gets the leftover (6 and 2), or hero-c gains.

### EV-10 — The toll stays with the heroes present
- Requirement: DEC-944, Q-C3-22 (Bob approved 2026-10-31), DEC-178.
- Method: unit
- How: `event/pool.test.ts` "EV-10" against the Ambush toll in `quest.ts`. Group B: hero-c 20 in both cases. (a) Group A: hero-a 8, hero-b 4. (b) Group A: hero-a 2 at 2 hit points, hero-b 4 at 9 hit points.
- Pass evidence: (a) hero-a 2, hero-b 0, no hit points lost. (b) hero-a 0, hero-b 0; hit points 1 and 7. In both, hero-c 20.
- Fails if: hero-c pays anything, (a) takes hit points, or (b) leaves gold on a present hero.

### EV-11 — A quest option's gold price uses the pool
- Requirement: DEC-944, DEC-911.
- Method: unit
- How: `quest/pool.test.ts` "EV-11". A test scene option with a gold cost of 10. Group A: hero-a 0. Group B: hero-b 10. Read the option; choose it.
- Pass evidence: the option is enabled; after the choice hero-b 0 and the option's effects run.
- Fails if: the option is disabled, or the cost is taken from no one.

### EV-12 — End to end: a hero with no gold buys from the party
- Requirement: DEC-911, DEC-944.
- Method: playwright
- How: `apps/bloodtower/src/e2e/tests/d5-pool.spec.ts`, iPad 768x1024 portrait. Seed `~test-event:none~test-at:N-radiant-mountains~test-hp:hero-a=4/12` with `~test-gold:` giving the first acting group's heroes 0 and one hero in another group 10 (no `~test-seat-together`). Play to the first group's menu at the citadel; press Rally.
- Pass evidence: the Rally row is enabled and shows no "Not enough gold."; after the press the board shows the rally result; the host state shows the other group's hero at 5 and the acting heroes at 0.
- Fails if: Rally is greyed, the press is refused, or the gold moves from anyone but the other group's hero.

## Survival evals (one per survival invariant in plan.md)

### EV-13 — Continue keeps every hero's gold, paid once
- Requirement: survival invariants 1 and 2; DEC-675.
- Method: unit
- How: `pool.test.ts` "EV-13". After EV-03's payment as a live pick (a 10-gold Virtue draw), (a) save and restore; (b) replay the same pick event from the log. Then open the menu.
- Pass evidence: (a) and (b): gold 0, 0, 0, 5, no second debit; the menu greys Virtue draw for "Not enough gold." (pool 5).
- Fails if: any hero's gold differs, the pick pays twice, or the menu reads a pool other than 5.

## Assumptions surfaced
- A hero with no gold figure on the sheet adds 0 and pays 0; it is never read as a debt (C3/13).
- The pick's moves, hit points and corruption effects are unchanged; only who pays the gold changes.
- No screen shows the whole pool as a new total; the event panel's existing purse field carries it (EV-08).
